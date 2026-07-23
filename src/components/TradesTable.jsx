import { useMemo, useState } from 'react';
import {
  fmtDate, fmtUSD, amountMidpoint, tradeSide, SIDE_COLOR, SIDE_LABEL,
  PARTY_COLOR, PARTY_LABEL,
} from '../utils/format.js';

const PAGE = 25;

function PartyBadge({ party }) {
  const c = PARTY_COLOR[party] || '#64748b';
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white"
      style={{ backgroundColor: c }}
      title={PARTY_LABEL[party] || 'Unknown'}
    >
      {party}
    </span>
  );
}

function SideTag({ type }) {
  const side = tradeSide(type);
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold"
      style={{ backgroundColor: `${SIDE_COLOR[side]}22`, color: SIDE_COLOR[side] }}
    >
      {type || SIDE_LABEL[side]}
    </span>
  );
}

const COLUMNS = [
  { key: 'transactionDate', label: 'Traded', sort: (t) => t.transactionDate },
  { key: 'member', label: 'Member', sort: (t) => t.member },
  { key: 'ticker', label: 'Ticker', sort: (t) => t.ticker || '' },
  { key: 'type', label: 'Type', sort: (t) => t.type },
  { key: 'amount', label: 'Amount', sort: (t) => amountMidpoint(t), align: 'right' },
  { key: 'lag', label: 'Lag', sort: (t) => t.disclosureLagDays ?? 1e9, align: 'right' },
];

export default function TradesTable({ trades, onSelectMember }) {
  const [sortKey, setSortKey] = useState('transactionDate');
  const [dir, setDir] = useState('desc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey) || COLUMNS[0];
    const arr = [...trades].sort((a, b) => {
      const av = col.sort(a);
      const bv = col.sort(b);
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [trades, sortKey, dir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE));
  const clampedPage = Math.min(page, pageCount - 1);
  const rows = sorted.slice(clampedPage * PAGE, clampedPage * PAGE + PAGE);

  const toggle = (key) => {
    if (key === sortKey) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setDir('desc');
    }
    setPage(0);
  };

  const arrow = (key) => (key === sortKey ? (dir === 'asc' ? ' ▲' : ' ▼') : '');

  return (
    <div className="bg-surface border border-edge rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-body/60 border-b border-edge">
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={`px-3 py-2 cursor-pointer select-none hover:text-accent whitespace-nowrap ${
                    c.align === 'right' ? 'text-right' : ''
                  }`}
                  onClick={() => toggle(c.key)}
                >
                  {c.label}
                  {arrow(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-edge/50 hover:bg-bg/40">
                <td className="px-3 py-2 whitespace-nowrap text-body/80">{fmtDate(t.transactionDate)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <button
                    className="inline-flex items-center gap-2 hover:text-accent text-heading"
                    onClick={() => onSelectMember?.(t.member)}
                  >
                    <PartyBadge party={t.party} />
                    <span>{t.member}</span>
                    <span className="text-body/50 text-xs">{t.chamber === 'Senate' ? 'Sen.' : 'Rep.'} {t.state}</span>
                  </button>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="font-semibold text-heading">{t.ticker || '—'}</span>
                  <span className="block text-[11px] text-body/50 max-w-[180px] truncate">{t.asset}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap"><SideTag type={t.type} /></td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-heading">
                  {fmtUSD(amountMidpoint(t))}
                  <span className="block text-[11px] text-body/50">{t.amountLabel}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right">
                  <span className={t.disclosureLagDays > 45 ? 'text-[#ef4444]' : 'text-body/70'}>
                    {t.disclosureLagDays != null ? `${t.disclosureLagDays}d` : '—'}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-body/50">
                  No trades match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-3 py-2 text-xs text-body/60 border-t border-edge">
        <span>
          Page {clampedPage + 1} of {pageCount} · {sorted.length} rows
        </span>
        <div className="flex gap-2">
          <button
            className="px-2 py-1 rounded border border-edge disabled:opacity-40 hover:border-accent"
            disabled={clampedPage === 0}
            onClick={() => setPage(clampedPage - 1)}
          >
            Prev
          </button>
          <button
            className="px-2 py-1 rounded border border-edge disabled:opacity-40 hover:border-accent"
            disabled={clampedPage >= pageCount - 1}
            onClick={() => setPage(clampedPage + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
