import { PARTY_LABEL } from '../utils/format.js';

const baseInput =
  'bg-bg border border-edge rounded-lg px-3 py-2 text-sm text-heading placeholder-body/40 focus:outline-none focus:border-accent';

export default function Filters({ value, onChange, facets, resultCount, totalCount }) {
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="bg-surface border border-edge rounded-xl p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          className={`${baseInput} flex-1 min-w-[180px]`}
          placeholder="Search member, ticker, or asset…"
          value={value.q}
          onChange={(e) => set({ q: e.target.value })}
        />

        <select className={baseInput} value={value.party} onChange={(e) => set({ party: e.target.value })}>
          <option value="">All parties</option>
          {['D', 'R', 'I'].map((p) => (
            <option key={p} value={p}>{PARTY_LABEL[p]}</option>
          ))}
        </select>

        <select className={baseInput} value={value.chamber} onChange={(e) => set({ chamber: e.target.value })}>
          <option value="">Both chambers</option>
          <option value="House">House</option>
          <option value="Senate">Senate</option>
        </select>

        <select className={baseInput} value={value.side} onChange={(e) => set({ side: e.target.value })}>
          <option value="">Buys & sells</option>
          <option value="buy">Buys only</option>
          <option value="sell">Sells only</option>
        </select>

        <select className={baseInput} value={value.ticker} onChange={(e) => set({ ticker: e.target.value })}>
          <option value="">All tickers</option>
          {facets.tickers.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-body/70">
        <label className="flex items-center gap-2">
          From
          <input type="date" className={baseInput} value={value.from} onChange={(e) => set({ from: e.target.value })} />
        </label>
        <label className="flex items-center gap-2">
          To
          <input type="date" className={baseInput} value={value.to} onChange={(e) => set({ to: e.target.value })} />
        </label>
        <button
          className="ml-auto text-accent hover:underline"
          onClick={() =>
            onChange({ q: '', party: '', chamber: '', side: '', ticker: '', from: '', to: '' })
          }
        >
          Reset filters
        </button>
        <span className="text-body/60">
          Showing <span className="text-heading font-semibold">{resultCount}</span> of {totalCount}
        </span>
      </div>
    </div>
  );
}
