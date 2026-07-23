import { fmtUSD, PARTY_COLOR, PARTY_LABEL, initials } from '../utils/format.js';

export default function Leaderboard({ traders, onSelectMember }) {
  const max = traders[0]?.volume || 1;
  return (
    <div className="bg-surface border border-edge rounded-xl p-4">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-heading mb-3">
        Most Active Traders
      </h3>
      <ol className="flex flex-col gap-2">
        {traders.map((t, i) => (
          <li key={t.key}>
            <button
              className="w-full text-left group"
              onClick={() => onSelectMember?.(t.key)}
            >
              <div className="flex items-center gap-3">
                <span className="text-body/40 text-xs w-4 text-right">{i + 1}</span>
                <span
                  className="w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold text-white shrink-0"
                  style={{ backgroundColor: PARTY_COLOR[t.party] || '#64748b' }}
                  title={PARTY_LABEL[t.party] || 'Unknown'}
                >
                  {initials(t.key)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-heading truncate group-hover:text-accent">{t.key}</span>
                    <span className="text-sm text-heading font-semibold shrink-0">{fmtUSD(t.volume)}</span>
                  </div>
                  <div className="h-1.5 mt-1 rounded bg-bg overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{ width: `${(t.volume / max) * 100}%`, backgroundColor: PARTY_COLOR[t.party] || '#64748b' }}
                    />
                  </div>
                  <div className="text-[11px] text-body/50 mt-0.5">
                    {t.chamber} · {t.count} trades · {t.buy} buys / {t.sell} sells
                  </div>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
