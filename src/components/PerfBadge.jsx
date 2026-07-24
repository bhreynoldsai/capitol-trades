import { fmtSignedPct } from '../utils/format.js';

// Shows how the stock performed since the trade: the stock's % move, and its
// excess return vs the S&P 500 (SPY). Renders nothing when data is absent
// (e.g. the bundled sample dataset, which has no performance fields).
export default function PerfBadge({ trade, compact = false }) {
  const { priceChange, spyChange, excessReturn } = trade;
  if (priceChange == null && excessReturn == null) return null;

  const price = fmtSignedPct(priceChange);
  const spy = fmtSignedPct(spyChange);
  const excess = fmtSignedPct(excessReturn);
  const color = (n) => (n == null ? '#94afd4' : n >= 0 ? '#22c55e' : '#ef4444');

  if (compact) {
    return (
      <span
        className="text-[11px] font-semibold"
        style={{ color: color(priceChange) }}
        title={`Since trade: stock ${price ?? '—'} · SPY ${spy ?? '—'} · excess ${excess ?? '—'}`}
      >
        {price ?? '—'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-baseline gap-1.5 text-[11px]">
      <span className="font-semibold" style={{ color: color(priceChange) }}>
        {price ?? '—'}
      </span>
      <span className="text-body/40">vs SPY</span>
      <span style={{ color: color(spyChange) }}>{spy ?? '—'}</span>
      {excess != null && (
        <span className="text-body/40">
          (<span style={{ color: color(excessReturn) }}>{excess}</span> excess)
        </span>
      )}
    </span>
  );
}
