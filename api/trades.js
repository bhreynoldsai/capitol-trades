// Vercel serverless function: server-side proxy to a keyed congressional-trade
// API. The secret key never reaches the browser; the dashboard fetches the
// same-origin `/api/trades`, so there is no CORS problem either.
//
// Configure ONE provider by setting its API key as a Vercel Environment
// Variable (Project → Settings → Environment Variables), then redeploy:
//
//   QUIVER_API_KEY   — Quiver Quantitative (best single feed: both chambers,
//                      party + amount range). https://api.quiverquant.com
//   FMP_API_KEY      — Financial Modeling Prep (house-latest + senate-latest).
//   FINNHUB_API_KEY  — Finnhub (symbol-scoped; set FINNHUB_SYMBOLS to a
//                      comma-separated watchlist, else a default list is used).
//
// The response shape of every provider below is understood by the app's
// normalizer (src/data/normalize.js), so the browser can consume it directly.

const DEFAULT_FINNHUB_SYMBOLS = [
  'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO', 'AMD', 'JPM',
  'BAC', 'GS', 'V', 'XOM', 'CVX', 'LMT', 'RTX', 'BA', 'UNH', 'LLY',
  'PFE', 'JNJ', 'DIS', 'NFLX', 'PLTR', 'MU', 'WMT', 'COST', 'KO', 'NEE',
];

async function getJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function fromQuiver(key) {
  // Quiver's auth scheme has appeared as both "Bearer <key>" and "Token <key>"
  // across doc revisions; try Bearer, fall back to Token on an auth error.
  async function quiverGet(url) {
    const attempt = (scheme) =>
      getJson(url, { headers: { Authorization: `${scheme} ${key}`, Accept: 'application/json' } });
    try {
      return await attempt('Bearer');
    } catch (e) {
      if (/HTTP 40[13]/.test(String(e.message))) return attempt('Token');
      throw e;
    }
  }

  const tag = (rows, chamber) =>
    Array.isArray(rows) ? rows.map((r) => ({ chamber, ...r })) : [];

  // Dedup key spanning both feeds' field names (member + ticker + date +
  // action + amount). Quiver's congresstrading feed already includes Senate
  // trades — with Party and a TransactionDate — while senatetrading repeats
  // them with fewer fields (no party, a `Date` field). Keeping the first
  // (congresstrading) occurrence gives the richer record and avoids duplicates.
  const keyOf = (r) =>
    [
      r.BioGuideID || r.Representative || r.Senator || r.Name || '',
      String(r.Ticker || '').toUpperCase(),
      r.TransactionDate || r.Traded || r.Date || '',
      r.Transaction || '',
      r.Amount || r.Range || r.Trade_Size_USD || '',
    ].join('|');

  async function fetchTier(tier) {
    const base = `https://api.quiverquant.com/beta/${tier}`;
    const [congress, senate] = await Promise.all([
      quiverGet(`${base}/congresstrading`).catch(() => []),
      quiverGet(`${base}/senatetrading`).catch(() => []),
    ]);
    // congresstrading first so its richer records win the dedupe.
    const rows = [...tag(congress, 'House'), ...tag(senate, 'Senate')];
    const seen = new Set();
    const out = [];
    for (const r of rows) {
      const k = keyOf(r);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }
    return out;
  }

  // Default to the "live" feed: recent disclosures, a few hundred rows — fast to
  // fetch and small to ship. "bulk" (full history) is opt-in via QUIVER_TIER and
  // is slow enough that the client can time out. Fall back to bulk if live is empty.
  const preferred = (process.env.QUIVER_TIER || 'live').toLowerCase() === 'bulk' ? 'bulk' : 'live';
  let all = await fetchTier(preferred);
  if (!all.length && preferred !== 'bulk') all = await fetchTier('bulk');

  // Bound the payload to the most recent N records.
  const MAX = Number(process.env.QUIVER_MAX || 1500);
  if (all.length > MAX) {
    const when = (r) => String(r.Traded || r.TransactionDate || r.transactionDate || '');
    all.sort((a, b) => when(b).localeCompare(when(a)));
    return all.slice(0, MAX);
  }
  return all;
}

async function fromFmp(key) {
  const [house, senate] = await Promise.all([
    getJson(`https://financialmodelingprep.com/stable/house-latest?apikey=${key}`).catch(() => []),
    getJson(`https://financialmodelingprep.com/stable/senate-latest?apikey=${key}`).catch(() => []),
  ]);
  // Tag chamber so the client doesn't have to infer it.
  const tag = (rows, chamber) => (Array.isArray(rows) ? rows.map((r) => ({ ...r, chamber })) : []);
  return [...tag(house, 'House'), ...tag(senate, 'Senate')];
}

async function fromFinnhub(key) {
  const symbols = (process.env.FINNHUB_SYMBOLS || DEFAULT_FINNHUB_SYMBOLS.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  // Finnhub is symbol-scoped and rate-limited (60/min free); fetch sequentially.
  for (const symbol of symbols) {
    try {
      const json = await getJson(
        `https://finnhub.io/api/v1/stock/congressional-trading?symbol=${symbol}&token=${key}`
      );
      for (const row of json?.data || []) out.push({ ...row, symbol });
    } catch {
      /* skip a failing symbol */
    }
  }
  return out;
}

export default async function handler(req, res) {
  const { QUIVER_API_KEY, FMP_API_KEY, FINNHUB_API_KEY } = process.env;
  try {
    let transactions = [];
    let provider = null;
    if (QUIVER_API_KEY) {
      provider = 'quiver';
      transactions = await fromQuiver(QUIVER_API_KEY);
    } else if (FMP_API_KEY) {
      provider = 'fmp';
      transactions = await fromFmp(FMP_API_KEY);
    } else if (FINNHUB_API_KEY) {
      provider = 'finnhub';
      transactions = await fromFinnhub(FINNHUB_API_KEY);
    } else {
      // No key configured — tell the client so it stays on sample data quietly.
      res.status(501).json({ error: 'no_provider_configured', transactions: [] });
      return;
    }
    // Cache at the edge so we don't hammer the upstream API on every visit.
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ provider, count: transactions.length, transactions });
  } catch (err) {
    res.status(502).json({ error: String(err.message || err), transactions: [] });
  }
}
