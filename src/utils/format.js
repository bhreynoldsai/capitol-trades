// Small formatting helpers shared across the Congress dashboard.

export const PARTY_LABEL = { D: 'Democrat', R: 'Republican', I: 'Independent' };
export const PARTY_COLOR = { D: '#3b82f6', R: '#ef4444', I: '#a855f7' };

// Buy-ish vs sell-ish grouping used for the flow charts.
export function tradeSide(type = '') {
  const t = type.toLowerCase();
  if (t.includes('purchase') || t.includes('buy')) return 'buy';
  if (t.includes('sale') || t.includes('sell')) return 'sell';
  return 'other';
}
export const SIDE_COLOR = { buy: '#22c55e', sell: '#ef4444', other: '#f59e0b' };
export const SIDE_LABEL = { buy: 'Buy', sell: 'Sell', other: 'Exchange/Other' };

// Midpoint of a disclosure bracket — the standard proxy for trade size when
// only a range is reported.
export function amountMidpoint(t) {
  if (t.amountMin != null && t.amountMax != null) return (t.amountMin + t.amountMax) / 2;
  if (t.amountMin != null) return t.amountMin;
  return 0;
}

export function fmtUSD(n, { compact = true } = {}) {
  if (n == null || Number.isNaN(n)) return '--';
  if (compact) {
    const abs = Math.abs(n);
    if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
    return `$${Math.round(n)}`;
  }
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function fmtNum(n) {
  if (n == null || Number.isNaN(n)) return '--';
  return n.toLocaleString('en-US');
}

export function fmtDate(iso) {
  if (!iso) return '--';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : ''));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function monthKey(iso) {
  return iso ? iso.slice(0, 7) : '';
}

export function monthLabel(key) {
  if (!key) return '';
  const [y, m] = key.split('-');
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}
