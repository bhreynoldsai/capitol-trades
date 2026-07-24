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

  // QUIVER_TIER selects the plan-appropriate path: "bulk" (full history, higher
  // tiers) or "live" (recent updates). Fetch House + Senate and tag the chamber.
  const tier = (process.env.QUIVER_TIER || 'bulk').toLowerCase() === 'live' ? 'live' : 'bulk';
  const base = `https://api.quiverquant.com/beta/${tier}`;
  const [house, senate] = await Promise.all([
    quiverGet(`${base}/congresstrading`).catch(() => []),
    quiverGet(`${base}/senatetrading`).catch(() => []),
  ]);
  const tag = (rows, chamber) =>
    Array.isArray(rows) ? rows.map((r) => ({ chamber, ...r })) : [];
  // `chamber` is spread first so an explicit House/Senate field in the record wins.
  const all = [...tag(house, 'House'), ...tag(senate, 'Senate')];

  // Bulk can be very large; keep the most recent slice to bound the payload.
  const MAX = Number(process.env.QUIVER_MAX || 5000);
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
