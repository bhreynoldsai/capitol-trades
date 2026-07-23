// Deterministic generator for a realistic congressional-trade seed dataset.
// Output shape matches the normalized record the dashboard consumes.
import { writeFileSync } from 'node:fs';

// ---- seeded PRNG (mulberry32) so the dataset is reproducible ----
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(0x5EED1776);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const wpick = (pairs) => {
  // pairs: [ [value, weight], ... ]
  const total = pairs.reduce((s, p) => s + p[1], 0);
  let r = rnd() * total;
  for (const [v, w] of pairs) { if ((r -= w) <= 0) return v; }
  return pairs[pairs.length - 1][0];
};
const randint = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

// ---- reference data (real public figures, chambers & parties) ----
const MEMBERS = [
  { name: 'Nancy Pelosi',            party: 'D', chamber: 'House',  state: 'CA', activity: 5 },
  { name: 'Dan Crenshaw',            party: 'R', chamber: 'House',  state: 'TX', activity: 3 },
  { name: 'Marjorie Taylor Greene',  party: 'R', chamber: 'House',  state: 'GA', activity: 4 },
  { name: 'Ro Khanna',               party: 'D', chamber: 'House',  state: 'CA', activity: 5 },
  { name: 'Josh Gottheimer',         party: 'D', chamber: 'House',  state: 'NJ', activity: 4 },
  { name: 'Michael McCaul',          party: 'R', chamber: 'House',  state: 'TX', activity: 5 },
  { name: 'Virginia Foxx',           party: 'R', chamber: 'House',  state: 'NC', activity: 2 },
  { name: 'Kathy Manning',           party: 'D', chamber: 'House',  state: 'NC', activity: 2 },
  { name: 'Earl Blumenauer',         party: 'D', chamber: 'House',  state: 'OR', activity: 2 },
  { name: 'John Curtis',             party: 'R', chamber: 'House',  state: 'UT', activity: 3 },
  { name: 'Garret Graves',           party: 'R', chamber: 'House',  state: 'LA', activity: 2 },
  { name: 'Susie Lee',               party: 'D', chamber: 'House',  state: 'NV', activity: 2 },
  { name: 'Mark Green',              party: 'R', chamber: 'House',  state: 'TN', activity: 3 },
  { name: 'Debbie Wasserman Schultz',party: 'D', chamber: 'House',  state: 'FL', activity: 2 },
  { name: 'Tommy Tuberville',        party: 'R', chamber: 'Senate', state: 'AL', activity: 5 },
  { name: 'Sheldon Whitehouse',      party: 'D', chamber: 'Senate', state: 'RI', activity: 3 },
  { name: 'Ron Wyden',               party: 'D', chamber: 'Senate', state: 'OR', activity: 2 },
  { name: 'Rick Scott',              party: 'R', chamber: 'Senate', state: 'FL', activity: 3 },
  { name: 'Thomas Carper',           party: 'D', chamber: 'Senate', state: 'DE', activity: 2 },
  { name: 'Shelley Moore Capito',    party: 'R', chamber: 'Senate', state: 'WV', activity: 2 },
  { name: 'Markwayne Mullin',        party: 'R', chamber: 'Senate', state: 'OK', activity: 3 },
  { name: 'Gary Peters',             party: 'D', chamber: 'Senate', state: 'MI', activity: 2 },
  { name: 'John Hickenlooper',       party: 'D', chamber: 'Senate', state: 'CO', activity: 2 },
  { name: 'Bill Hagerty',            party: 'R', chamber: 'Senate', state: 'TN', activity: 3 },
  { name: 'Jerry Moran',             party: 'R', chamber: 'Senate', state: 'KS', activity: 2 },
  { name: 'Angus King',              party: 'I', chamber: 'Senate', state: 'ME', activity: 2 },
  { name: 'Katie Britt',             party: 'R', chamber: 'Senate', state: 'AL', activity: 2 },
  { name: 'Pat Toomey',              party: 'R', chamber: 'Senate', state: 'PA', activity: 2 },
];

const TICKERS = [
  { ticker: 'NVDA', name: 'NVIDIA Corp',            sector: 'Technology' },
  { ticker: 'AAPL', name: 'Apple Inc',              sector: 'Technology' },
  { ticker: 'MSFT', name: 'Microsoft Corp',         sector: 'Technology' },
  { ticker: 'AMZN', name: 'Amazon.com Inc',         sector: 'Consumer Discretionary' },
  { ticker: 'GOOGL',name: 'Alphabet Inc',           sector: 'Technology' },
  { ticker: 'META', name: 'Meta Platforms Inc',     sector: 'Technology' },
  { ticker: 'TSLA', name: 'Tesla Inc',              sector: 'Consumer Discretionary' },
  { ticker: 'AVGO', name: 'Broadcom Inc',           sector: 'Technology' },
  { ticker: 'AMD',  name: 'Advanced Micro Devices', sector: 'Technology' },
  { ticker: 'CRM',  name: 'Salesforce Inc',         sector: 'Technology' },
  { ticker: 'PANW', name: 'Palo Alto Networks',     sector: 'Technology' },
  { ticker: 'JPM',  name: 'JPMorgan Chase & Co',    sector: 'Financials' },
  { ticker: 'BAC',  name: 'Bank of America Corp',   sector: 'Financials' },
  { ticker: 'GS',   name: 'Goldman Sachs Group',    sector: 'Financials' },
  { ticker: 'V',    name: 'Visa Inc',               sector: 'Financials' },
  { ticker: 'BRK.B',name: 'Berkshire Hathaway',     sector: 'Financials' },
  { ticker: 'XOM',  name: 'Exxon Mobil Corp',       sector: 'Energy' },
  { ticker: 'CVX',  name: 'Chevron Corp',           sector: 'Energy' },
  { ticker: 'NEE',  name: 'NextEra Energy Inc',     sector: 'Utilities' },
  { ticker: 'LMT',  name: 'Lockheed Martin Corp',   sector: 'Industrials' },
  { ticker: 'RTX',  name: 'RTX Corp',               sector: 'Industrials' },
  { ticker: 'BA',   name: 'Boeing Co',              sector: 'Industrials' },
  { ticker: 'CAT',  name: 'Caterpillar Inc',        sector: 'Industrials' },
  { ticker: 'GE',   name: 'GE Aerospace',           sector: 'Industrials' },
  { ticker: 'UNH',  name: 'UnitedHealth Group',     sector: 'Health Care' },
  { ticker: 'LLY',  name: 'Eli Lilly & Co',         sector: 'Health Care' },
  { ticker: 'PFE',  name: 'Pfizer Inc',             sector: 'Health Care' },
  { ticker: 'JNJ',  name: 'Johnson & Johnson',      sector: 'Health Care' },
  { ticker: 'ABBV', name: 'AbbVie Inc',             sector: 'Health Care' },
  { ticker: 'PG',   name: 'Procter & Gamble Co',    sector: 'Consumer Staples' },
  { ticker: 'KO',   name: 'Coca-Cola Co',           sector: 'Consumer Staples' },
  { ticker: 'WMT',  name: 'Walmart Inc',            sector: 'Consumer Staples' },
  { ticker: 'COST', name: 'Costco Wholesale',       sector: 'Consumer Staples' },
  { ticker: 'DIS',  name: 'Walt Disney Co',         sector: 'Communication Services' },
  { ticker: 'NFLX', name: 'Netflix Inc',            sector: 'Communication Services' },
  { ticker: 'T',    name: 'AT&T Inc',               sector: 'Communication Services' },
  { ticker: 'PLTR', name: 'Palantir Technologies',  sector: 'Technology' },
  { ticker: 'MU',   name: 'Micron Technology',      sector: 'Technology' },
  { ticker: 'F',    name: 'Ford Motor Co',          sector: 'Consumer Discretionary' },
  { ticker: 'NKE',  name: 'Nike Inc',               sector: 'Consumer Discretionary' },
];

// STOCK Act disclosure amount brackets.
const BRACKETS = [
  { label: '$1,001 - $15,000',            min: 1001,     max: 15000 },
  { label: '$15,001 - $50,000',           min: 15001,    max: 50000 },
  { label: '$50,001 - $100,000',          min: 50001,    max: 100000 },
  { label: '$100,001 - $250,000',         min: 100001,   max: 250000 },
  { label: '$250,001 - $500,000',         min: 250001,   max: 500000 },
  { label: '$500,001 - $1,000,000',       min: 500001,   max: 1000000 },
  { label: '$1,000,001 - $5,000,000',     min: 1000001,  max: 5000000 },
  { label: '$5,000,001 - $25,000,000',    min: 5000001,  max: 25000000 },
];
// Larger trades are rarer.
const BRACKET_WEIGHTS = [40, 26, 14, 9, 5, 3, 2, 1];

const OWNERS = [['Self', 55], ['Spouse', 30], ['Joint', 12], ['Child', 3]];
const TYPES = [['Purchase', 46], ['Sale', 38], ['Sale (Partial)', 12], ['Exchange', 4]];

// Date window: trailing ~24 months ending "today" (fixed for reproducibility).
const TODAY = new Date('2026-07-23T00:00:00Z');
const WINDOW_DAYS = 24 * 30;
const MS_DAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);

function makeId(n) {
  return 'tx_' + (100000 + n).toString(36);
}

const records = [];
let n = 0;
for (const m of MEMBERS) {
  const count = randint(4, 4 + m.activity * 5); // more active members -> more trades
  for (let i = 0; i < count; i++) {
    const asset = pick(TICKERS);
    const type = wpick(TYPES);
    const bracketIdx = wpick(BRACKETS.map((b, ix) => [ix, BRACKET_WEIGHTS[ix]]));
    const bracket = BRACKETS[bracketIdx];
    const owner = wpick(OWNERS);

    const daysAgo = randint(1, WINDOW_DAYS);
    const txDate = new Date(TODAY.getTime() - daysAgo * MS_DAY);
    // Disclosure lag: mostly compliant (<=45d), a meaningful minority late.
    const lag = wpick([[randint(3, 20), 55], [randint(21, 45), 30], [randint(46, 120), 15]]);
    const discDate = new Date(txDate.getTime() + lag * MS_DAY);
    if (discDate > TODAY) continue; // not yet disclosed

    records.push({
      id: makeId(n++),
      chamber: m.chamber,
      member: m.name,
      party: m.party,
      state: m.state,
      ticker: asset.ticker,
      asset: asset.name,
      sector: asset.sector,
      type,
      owner,
      amountLabel: bracket.label,
      amountMin: bracket.min,
      amountMax: bracket.max,
      transactionDate: iso(txDate),
      disclosureDate: iso(discDate),
      disclosureLagDays: lag,
    });
  }
}

// Sort newest transaction first.
records.sort((a, b) => (a.transactionDate < b.transactionDate ? 1 : -1));

const out = {
  meta: {
    source: 'seed',
    description:
      'Illustrative sample of congressional stock transactions modeled on STOCK Act periodic transaction reports. Members and tickers are real; individual transactions are synthetic sample data for demonstration.',
    generatedFor: iso(TODAY),
    recordCount: records.length,
    memberCount: MEMBERS.length,
  },
  transactions: records,
};

writeFileSync(
  new URL('./seedTrades.json', import.meta.url),
  JSON.stringify(out, null, 2) + '\n'
);
console.log('records:', records.length, 'members:', MEMBERS.length);
