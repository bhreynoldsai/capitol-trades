// Pure aggregation helpers over an array of normalized trade records.
import { amountMidpoint, tradeSide, monthKey } from './format.js';

export function kpis(trades) {
  const members = new Set();
  const tickers = new Set();
  let volume = 0;
  let buy = 0;
  let sell = 0;
  let lagSum = 0;
  let lagCount = 0;
  let late = 0;
  for (const t of trades) {
    members.add(t.member);
    if (t.ticker) tickers.add(t.ticker);
    volume += amountMidpoint(t);
    const side = tradeSide(t.type);
    if (side === 'buy') buy++;
    else if (side === 'sell') sell++;
    if (t.disclosureLagDays != null) {
      lagSum += t.disclosureLagDays;
      lagCount++;
      if (t.disclosureLagDays > 45) late++;
    }
  }
  return {
    trades: trades.length,
    members: members.size,
    tickers: tickers.size,
    volume,
    buy,
    sell,
    avgLag: lagCount ? Math.round(lagSum / lagCount) : null,
    latePct: lagCount ? Math.round((late / lagCount) * 100) : null,
  };
}

function bump(map, key, mid) {
  const e = map.get(key) || { key, count: 0, volume: 0, buy: 0, sell: 0 };
  e.count += 1;
  e.volume += mid;
  return e;
}

export function topTickers(trades, n = 10) {
  const map = new Map();
  for (const t of trades) {
    if (!t.ticker) continue;
    const mid = amountMidpoint(t);
    const e = bump(map, t.ticker, mid);
    const side = tradeSide(t.type);
    if (side === 'buy') e.buy += 1;
    else if (side === 'sell') e.sell += 1;
    e.asset = t.asset;
    e.sector = t.sector;
    map.set(t.ticker, e);
  }
  return [...map.values()].sort((a, b) => b.volume - a.volume).slice(0, n);
}

export function topTraders(trades, n = 10) {
  const map = new Map();
  for (const t of trades) {
    const mid = amountMidpoint(t);
    const e = bump(map, t.member, mid);
    const side = tradeSide(t.type);
    if (side === 'buy') e.buy += 1;
    else if (side === 'sell') e.sell += 1;
    e.party = t.party;
    e.chamber = t.chamber;
    e.state = t.state;
    map.set(t.member, e);
  }
  return [...map.values()].sort((a, b) => b.volume - a.volume).slice(0, n);
}

export function volumeByMonth(trades) {
  const map = new Map();
  for (const t of trades) {
    const key = monthKey(t.transactionDate);
    if (!key) continue;
    const mid = amountMidpoint(t);
    const e = map.get(key) || { month: key, volume: 0, count: 0, buy: 0, sell: 0 };
    e.volume += mid;
    e.count += 1;
    if (tradeSide(t.type) === 'buy') e.buy += mid;
    else if (tradeSide(t.type) === 'sell') e.sell += mid;
    map.set(key, e);
  }
  return [...map.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
}

export function partyBreakdown(trades) {
  const map = new Map();
  for (const t of trades) {
    const key = t.party || 'U';
    const e = map.get(key) || { party: key, count: 0, volume: 0 };
    e.count += 1;
    e.volume += amountMidpoint(t);
    map.set(key, e);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function sideBreakdown(trades) {
  const counts = { buy: 0, sell: 0, other: 0 };
  const volume = { buy: 0, sell: 0, other: 0 };
  for (const t of trades) {
    const s = tradeSide(t.type);
    counts[s] += 1;
    volume[s] += amountMidpoint(t);
  }
  return { counts, volume };
}

export function sectorBreakdown(trades) {
  const map = new Map();
  for (const t of trades) {
    const key = t.sector || 'Unknown';
    const e = map.get(key) || { sector: key, count: 0, volume: 0 };
    e.count += 1;
    e.volume += amountMidpoint(t);
    map.set(key, e);
  }
  return [...map.values()].sort((a, b) => b.volume - a.volume);
}

// Distinct values for building filter dropdowns.
export function facets(trades) {
  const members = new Set();
  const tickers = new Set();
  const types = new Set();
  for (const t of trades) {
    members.add(t.member);
    if (t.ticker) tickers.add(t.ticker);
    if (t.type) types.add(t.type);
  }
  return {
    members: [...members].sort(),
    tickers: [...tickers].sort(),
    types: [...types].sort(),
  };
}
