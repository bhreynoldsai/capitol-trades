// Normalizes trade records from heterogeneous sources into the single shape the
// dashboard consumes. Handles our own seed shape (pass-through) and the widely
// used House/Senate "stock watcher" periodic-transaction JSON shape.

const BRACKET_RE = /\$?\s*([\d,]+)\s*(?:-|–|to)\s*\$?\s*([\d,]+)/;

// STOCK Act discloses an amount *range*; parse the label into numeric bounds.
export function parseAmount(raw) {
  if (raw == null) return { label: 'Unknown', min: null, max: null };
  if (typeof raw === 'number') return { label: `$${raw.toLocaleString()}`, min: raw, max: raw };
  const label = String(raw).trim();
  const m = label.match(BRACKET_RE);
  if (m) {
    const min = Number(m[1].replace(/,/g, ''));
    const max = Number(m[2].replace(/,/g, ''));
    return { label, min, max };
  }
  const single = label.match(/\$?\s*([\d,]+)/);
  if (single) {
    const v = Number(single[1].replace(/,/g, ''));
    return { label, min: v, max: v };
  }
  return { label: label || 'Unknown', min: null, max: null };
}

// STOCK Act disclosure brackets, by lower bound. Quiver's `Trade_Size_USD` is a
// single number equal to the bracket's lower bound, so we rebuild the full range
// (and a readable label) from it — giving correct midpoints for volume math.
const STOCK_ACT_BRACKETS = [
  [1001, 15000], [15001, 50000], [50001, 100000], [100001, 250000],
  [250001, 500000], [500001, 1000000], [1000001, 5000000],
  [5000001, 25000000], [25000001, 50000000], [50000001, 50000000],
];

export function amountFromEstimate(v) {
  if (v == null || Number.isNaN(v)) return { label: 'Unknown', min: null, max: null };
  const b = STOCK_ACT_BRACKETS.find(([lo, hi]) => v >= lo && v <= hi)
    || STOCK_ACT_BRACKETS.find(([lo]) => v <= lo);
  if (b) {
    const [min, max] = b;
    const label = min === max ? `$${min.toLocaleString()}+` : `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    return { label, min, max };
  }
  return { label: `$${v.toLocaleString()}`, min: v, max: v };
}

// Accepts "2021-09-27", "09/27/2021", "9/27/21" -> "YYYY-MM-DD" (or null).
export function normalizeDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let [, mo, da, yr] = m;
    if (yr.length === 2) yr = (Number(yr) > 50 ? '19' : '20') + yr;
    return `${yr}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}`;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function cleanName(name = '') {
  return String(name).replace(/^(Hon\.?|Rep\.?|Sen\.?|Senator|Representative)\s+/i, '').trim();
}

function partyCode(raw) {
  if (!raw) return 'U';
  const c = String(raw).trim().charAt(0).toUpperCase();
  return ['D', 'R', 'I'].includes(c) ? c : 'U';
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  const d = (new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000;
  return Number.isFinite(d) ? Math.round(d) : null;
}

let autoId = 0;

export function normalizeRecord(r, chamberHint) {
  if (!r || typeof r !== 'object') return null;

  // Already in our normalized seed shape.
  if (r.member && r.amountLabel && r.transactionDate) {
    return { ...r, id: r.id || `tx_auto_${autoId++}` };
  }

  // Field aliases span every supported vendor shape:
  //   • Quiver Quantitative — Representative, Transaction, Range, Ticker,
  //     TransactionDate, ReportDate, House ('Representatives'|'Senate'), Party
  //   • Finnhub            — name, transactionType, amountFrom, amountTo,
  //     symbol, transactionDate, filingDate, assetName, ownerType
  //   • Financial Modeling Prep — firstName/lastName, office, type, amount,
  //     symbol, transactionDate, disclosureDate, owner, assetDescription
  //   • House/Senate "stock watcher" — representative/senator, ticker, amount,
  //     type, transaction_date, disclosure_date, district
  const fmpName = [r.firstName, r.lastName].filter(Boolean).join(' ');
  const member = cleanName(
    r.member || r.representative || r.senator || r.Representative || r.Senator ||
    r.Name || r.name || fmpName || 'Unknown'
  );
  const houseField = r.House || r.Chamber || r.chamber || chamberHint;
  const chamber =
    houseField === 'Representatives' ? 'House'
      : houseField || (r.senator || r.Senator ? 'Senate' : r.representative || r.Representative ? 'House' : 'Unknown');

  // Amount can arrive as an explicit numeric range (Finnhub) or a bracket
  // string (Quiver Range, FMP amount, stock-watcher amount).
  let amt;
  if (r.amountFrom != null || r.amountTo != null) {
    const min = Number(r.amountFrom) || null;
    const max = Number(r.amountTo) || null;
    amt = { min, max, label: min != null && max != null ? `$${min.toLocaleString()} - $${max.toLocaleString()}` : 'Unknown' };
  } else if (r.Trade_Size_USD != null && r.Trade_Size_USD !== '') {
    // Quiver reports a single lower-bound number; rebuild the STOCK Act bracket.
    amt = amountFromEstimate(Number(r.Trade_Size_USD));
  } else {
    amt = parseAmount(r.amountLabel || r.amount || r.Range || r.Amount);
  }

  const transactionDate = normalizeDate(
    r.transactionDate || r.transaction_date || r.TransactionDate || r.Traded || r.Date
  );
  const disclosureDate = normalizeDate(
    r.disclosureDate || r.disclosure_date || r.filingDate || r.ReportDate || r.Filed
  );
  const district = r.district || '';
  const office = r.office || '';
  const state =
    r.state ||
    (district && /^[A-Z]{2}/.test(district) ? district.slice(0, 2) : '') ||
    (office && /^[A-Z]{2}\d/.test(office) ? office.slice(0, 2) : '');
  const ownerRaw = r.owner || r.ownerType || '';

  return {
    id: r.id || `tx_auto_${autoId++}`,
    chamber,
    member,
    party: partyCode(r.party || r.Party),
    state,
    ticker: (r.ticker || r.symbol || r.Ticker || '').toString().toUpperCase().replace(/^--$/, '') || null,
    asset: r.asset || r.asset_description || r.assetDescription || r.assetName || '',
    sector: r.sector || 'Unknown',
    type: r.type || r.transactionType || r.Transaction || 'Unknown',
    owner: ownerRaw ? ownerRaw[0].toUpperCase() + ownerRaw.slice(1) : 'Self',
    amountLabel: amt.label,
    amountMin: amt.min,
    amountMax: amt.max,
    transactionDate,
    disclosureDate,
    disclosureLagDays: r.disclosureLagDays ?? daysBetween(transactionDate, disclosureDate),
  };
}

export function normalizeMany(list, chamberHint) {
  if (!Array.isArray(list)) return [];
  return list
    .map((r) => normalizeRecord(r, chamberHint))
    .filter((r) => r && r.transactionDate && r.ticker);
}
