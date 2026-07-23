import { useMemo } from 'react';
import {
  fmtDate, fmtUSD, amountMidpoint, tradeSide, SIDE_COLOR,
  PARTY_COLOR, PARTY_LABEL,
} from '../utils/format.js';
import { topTickers } from '../utils/aggregate.js';

export default function MemberDrawer({ member, trades, onClose }) {
  const rows = useMemo(
    () =>
      trades
        .filter((t) => t.member === member)
        .sort((a, b) => (a.transactionDate < b.transactionDate ? 1 : -1)),
    [trades, member]
  );

  const summary = useMemo(() => {
    let volume = 0;
    let buy = 0;
    let sell = 0;
    for (const t of rows) {
      volume += amountMidpoint(t);
      const s = tradeSide(t.type);
      if (s === 'buy') buy++;
      else if (s === 'sell') sell++;
    }
    return { volume, buy, sell, top: topTickers(rows, 5) };
  }, [rows]);

  if (!member) return null;
  const meta = rows[0];

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface border-l border-edge h-full overflow-y-auto animate-fadeIn">
        <div className="sticky top-0 bg-surface/95 backdrop-blur border-b border-edge px-5 py-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="w-9 h-9 rounded-full grid place-items-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: PARTY_COLOR[meta?.party] || '#64748b' }}
            >
              {meta?.party || '?'}
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-heading leading-tight">{member}</h2>
              <p className="text-xs text-body/60">
                {PARTY_LABEL[meta?.party] || 'Unknown'} · {meta?.chamber} · {meta?.state}
              </p>
            </div>
          </div>
          <button className="text-body/60 hover:text-heading text-xl leading-none" onClick={onClose}>×</button>
        </div>

        <div className="px-5 py-4 grid grid-cols-3 gap-3">
          {[
            ['Trades', rows.length, 'text-heading'],
            ['Est. Volume', fmtUSD(summary.volume), 'text-accent'],
            ['Buy / Sell', `${summary.buy}/${summary.sell}`, 'text-[#22c55e]'],
          ].map(([label, val, cls]) => (
            <div key={label} className="bg-bg border border-edge rounded-lg px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-body/60">{label}</div>
              <div className={`font-display text-lg font-bold ${cls}`}>{val}</div>
            </div>
          ))}
        </div>

        {summary.top.length > 0 && (
          <div className="px-5 pb-2">
            <div className="text-[11px] uppercase tracking-wider text-body/60 mb-2">Top holdings traded</div>
            <div className="flex flex-wrap gap-2">
              {summary.top.map((t) => (
                <span key={t.key} className="bg-bg border border-edge rounded-lg px-2 py-1 text-xs text-heading">
                  {t.key} <span className="text-body/50">{fmtUSD(t.volume)}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="px-5 py-3">
          <div className="text-[11px] uppercase tracking-wider text-body/60 mb-2">All transactions</div>
          <ul className="flex flex-col divide-y divide-edge/60">
            {rows.map((t) => {
              const side = tradeSide(t.type);
              return (
                <li key={t.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-heading text-sm">{t.ticker || '—'}</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                        style={{ backgroundColor: `${SIDE_COLOR[side]}22`, color: SIDE_COLOR[side] }}
                      >
                        {t.type}
                      </span>
                    </div>
                    <div className="text-[11px] text-body/50 truncate">{t.asset}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm text-heading">{fmtUSD(amountMidpoint(t))}</div>
                    <div className="text-[11px] text-body/50">{fmtDate(t.transactionDate)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
