import { useCallback, useEffect, useRef, useState } from 'react';
import seed from '../data/seedTrades.json';
import { normalizeMany } from '../data/normalize.js';

// Live data is fetched in the *user's browser* at runtime. The normalizer
// understands the response shapes of every source in SOURCE_PRESETS below, so a
// feed just has to return an array (or {data|transactions:[...]}) of records.
//
// There is deliberately NO keyless default feed: the formerly free House/Senate
// "stock watcher" S3 buckets now return 403 (retired mid-2025), and every
// maintained feed requires either an API key or a CORS-enabled proxy. So the
// dashboard renders the bundled sample dataset until a feed is configured.
//
// Recommended live sources (see README "Data sources & methods"):
export const SOURCE_PRESETS = {
  // Best single feed — both chambers, includes party, chamber & amount range.
  // Needs `Authorization: Bearer <token>`; wrap in a proxy to add the header + CORS.
  quiver: 'https://api.quiverquant.com/beta/bulk/congresstrading',
  // Finnhub — generous free tier (60 req/min) but symbol-scoped; aggregate
  // server-side, then serve the combined JSON to the browser.
  finnhub: 'https://finnhub.io/api/v1/stock/congressional-trading?symbol={TICKER}&token={KEY}',
  // Financial Modeling Prep — latest House/Senate disclosures (key required).
  fmpHouse: 'https://financialmodelingprep.com/stable/house-latest?apikey={KEY}',
  fmpSenate: 'https://financialmodelingprep.com/stable/senate-latest?apikey={KEY}',
};

// No default network calls — configure a feed via the overrides below.
export const DEFAULT_SOURCES = [];

function overrideSources() {
  try {
    const q = new URLSearchParams(window.location.search).get('dataUrl');
    if (q) return [{ url: q, chamber: undefined }];
    if (window.CONGRESS_DATA_URL) {
      return [].concat(window.CONGRESS_DATA_URL).map((url) => ({ url, chamber: undefined }));
    }
  } catch {
    /* SSR / no window */
  }
  return null;
}

async function fetchSource(src, signal) {
  const res = await fetch(src.url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const list = Array.isArray(json) ? json : json.transactions || json.data || [];
  return normalizeMany(list, src.chamber);
}

const SEED_TRADES = normalizeMany(seed.transactions);

/**
 * Loads congressional trades. The bundled seed dataset renders instantly; a
 * live fetch (when a reachable feed is configured) upgrades it in place.
 */
export function useCongressTrades({ live = true } = {}) {
  const [trades, setTrades] = useState(SEED_TRADES);
  const [source, setSource] = useState('seed'); // 'seed' | 'live' | 'partial'
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const inflight = useRef(null);

  const load = useCallback(async () => {
    const sources = overrideSources() || DEFAULT_SOURCES;
    // No feed configured — show the sample dataset without a spurious error.
    if (!sources.length) {
      setSource('seed');
      setLoading(false);
      return;
    }
    if (inflight.current) inflight.current.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    const timeout = setTimeout(() => ctrl.abort(), 15000);
    setLoading(true);
    try {
      const results = await Promise.allSettled(sources.map((s) => fetchSource(s, ctrl.signal)));
      const ok = results.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value);
      const failed = results.filter((r) => r.status === 'rejected');
      if (ok.length) {
        setTrades(ok);
        setSource(failed.length ? 'partial' : 'live');
        setError(failed.length ? `${failed.length} source(s) unavailable` : null);
        setLastUpdated(new Date());
      } else {
        // Nothing reachable — keep the seed dataset already on screen.
        setSource('seed');
        setError(failed[0]?.reason?.message || 'Live feeds unreachable');
      }
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!live) return;
    load();
    return () => inflight.current?.abort();
  }, [live, load]);

  return { trades, source, loading, error, lastUpdated, refresh: load, meta: seed.meta };
}
