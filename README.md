# Capitol Trades

A single-page dashboard that tracks the stock transactions members of the U.S.
Congress disclose under the **STOCK Act** (periodic transaction reports), with
KPIs, charts, filters, a sortable transactions table, a most-active-traders
leaderboard, and per-member detail. Built with React + Vite + Tailwind +
Recharts.

## Features

- **KPIs** — trade count, estimated volume (sum of disclosure-bracket
  midpoints), unique members & tickers, buy-vs-sell split, and average
  disclosure lag with a late-filing (>45d) rate.
- **Charts** — trade volume over time (buys vs sells), most-traded tickers,
  party split, and buy/sell direction.
- **Filters** — free-text search plus party, chamber, direction, ticker, and
  date range.
- **Transactions table** — sortable, paginated, with party badges, amount
  brackets, and disclosure-lag highlighting.
- **Leaderboard** of most-active traders and a **per-member detail drawer**
  (click any member) with their full trade history and top holdings.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
npm run seed     # regenerate the bundled sample dataset
```

## Deploy

- **Vercel**: import the repo — `vercel.json` is already configured.
- Any static host: upload `dist/` with an SPA fallback to `index.html`.

## Data sources & methods

**How disclosure works.** Under the **STOCK Act (2012)**, members of Congress
must file a **Periodic Transaction Report (PTR)** within **45 days** of a
securities trade. Those filings are the raw material for every tracker.

### Primary (official, free, no key)

| Source | What it gives you | Method | Trade-offs |
|---|---|---|---|
| **U.S. House Clerk** — `disclosures-clerk.house.gov` | Annual `‹YEAR›FD.zip` with an XML index of all filings; PTR PDFs at `/public_disc/ptr-pdfs/‹YEAR›/‹DocID›.pdf` | Download ZIP → parse `‹YEAR›FD.xml` → keep `FilingType = P` → fetch each PTR PDF | Authoritative & free, but transactions are in PDFs (newer are text, older are **scanned images needing OCR**) |
| **U.S. Senate eFD** — `efdsearch.senate.gov` | Senate PTRs; electronic filings are structured HTML | POST to accept the terms agreement (grabs a CSRF cookie), then query `/search/report/data/` | Requires the terms/cookie handshake; paper filings are PDFs |

A runnable implementation of the House-Clerk method ships at
[`src/data/ingest-house-clerk.mjs`](src/data/ingest-house-clerk.mjs) (emits the
PTR index; add a PDF/OCR step for line items). It needs outbound network access
to the Clerk host.

### Structured third-party APIs (recommended for an app)

These parse the primary sources for you and return clean JSON. All require an
API key and most require a small CORS-adding proxy for browser use.

| Provider | Endpoint | Coverage / notes |
|---|---|---|
| **Quiver Quantitative** | `api.quiverquant.com/beta/bulk/congresstrading` (`Authorization: Bearer`) | **Best single feed** — both chambers, includes party, chamber & amount range |
| **Finnhub** | `finnhub.io/api/v1/stock/congressional-trading?symbol=…&token=…` | Generous free tier (60 req/min) but **symbol-scoped** — aggregate server-side |
| **Financial Modeling Prep** | `financialmodelingprep.com/stable/{house,senate}-latest?apikey=…` | Latest House/Senate disclosures |
| **EODHD** (beta) | single congressional-trades JSON endpoint | Adds parsed numeric bounds, days-to-disclosure & a late-filing flag |

> **Note on the old free feeds:** the community **House/Senate Stock Watcher**
> S3 datasets that many tutorials reference are **retired** — the buckets now
> return `403 AccessDenied` (last updated mid-2025). Don't build on them.

The normalizer (`src/data/normalize.js`) already understands the Quiver,
Finnhub, FMP and stock-watcher field shapes, so any of the above works once you
supply a URL.

### Wiring a live feed (no rebuild)

The recommended presets live in `SOURCE_PRESETS`
(`src/hooks/useCongressTrades.js`). Point the app at your own (proxied,
key-injecting) endpoint at runtime via either:

- `?dataUrl=https://your-proxy.example/congress.json` in the address bar, or
- `window.CONGRESS_DATA_URL = 'https://your-proxy.example/congress.json'` before load.

A typical production setup is a tiny serverless function that calls Quiver or
Finnhub with the secret key, normalizes/caches the result, and serves CORS-open
JSON to the dashboard.

### Bundled sample data (default)

Because no keyless, CORS-open feed exists anymore, the dashboard ships with a
**bundled sample dataset** (`src/data/seedTrades.json`) and renders it by
default, flagged *Sample data* in the header. Members and tickers are real; the
individual transactions are synthetic. Regenerate it with `npm run seed`.
