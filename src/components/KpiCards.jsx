import { fmtUSD, fmtNum } from '../utils/format.js';

function Card({ label, value, sub, tone = 'accent' }) {
  const toneMap = {
    accent: 'text-accent',
    buy: 'text-[#22c55e]',
    sell: 'text-[#ef4444]',
    neutral: 'text-heading',
  };
  return (
    <div className="bg-surface border border-edge rounded-xl px-4 py-3 flex flex-col gap-1">
      <div className="text-[11px] uppercase tracking-wider text-body/60">{label}</div>
      <div className={`font-display text-2xl font-bold ${toneMap[tone]}`}>{value}</div>
      {sub && <div className="text-xs text-body/60">{sub}</div>}
    </div>
  );
}

export default function KpiCards({ k }) {
  if (!k) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card label="Trades" value={fmtNum(k.trades)} sub="disclosed transactions" tone="neutral" />
      <Card label="Est. Volume" value={fmtUSD(k.volume)} sub="sum of bracket midpoints" />
      <Card label="Members" value={fmtNum(k.members)} sub="filing activity" tone="neutral" />
      <Card label="Tickers" value={fmtNum(k.tickers)} sub="unique symbols" tone="neutral" />
      <Card label="Buys / Sells" value={`${fmtNum(k.buy)} / ${fmtNum(k.sell)}`} sub="purchase vs sale" tone="buy" />
      <Card
        label="Avg. Disclosure Lag"
        value={k.avgLag != null ? `${k.avgLag}d` : '--'}
        sub={k.latePct != null ? `${k.latePct}% filed late (>45d)` : ''}
        tone="sell"
      />
    </div>
  );
}
