import { useMemo, useState } from 'react';
import { useCongressTrades } from './hooks/useCongressTrades.js';
import { tradeSide } from './utils/format.js';
import {
  kpis, topTickers, topTraders, volumeByMonth, partyBreakdown, sideBreakdown, facets,
} from './utils/aggregate.js';

import KpiCards from './components/KpiCards.jsx';
import Filters from './components/Filters.jsx';
import TradesTable from './components/TradesTable.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import MemberDrawer from './components/MemberDrawer.jsx';
import {
  ChartCard, TopTickersChart, VolumeTrendChart, PartyPie, SidePie,
} from './components/Charts.jsx';

const EMPTY_FILTERS = { q: '', party: '', chamber: '', side: '', ticker: '', from: '', to: '' };

const SOURCE_BADGE = {
  live: { text: 'Live feed', cls: 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/40' },
  partial: { text: 'Live (partial)', cls: 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/40' },
  seed: { text: 'Sample data', cls: 'bg-accent/15 text-accent border-accent/40' },
};

export default function App() {
  const { trades, source, loading, error, lastUpdated, refresh, meta } = useCongressTrades();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedMember, setSelectedMember] = useState(null);

  const allFacets = useMemo(() => facets(trades), [trades]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return trades.filter((t) => {
      if (filters.party && t.party !== filters.party) return false;
      if (filters.chamber && t.chamber !== filters.chamber) return false;
      if (filters.ticker && t.ticker !== filters.ticker) return false;
      if (filters.side && tradeSide(t.type) !== filters.side) return false;
      if (filters.from && t.transactionDate < filters.from) return false;
      if (filters.to && t.transactionDate > filters.to) return false;
      if (q) {
        const hay = `${t.member} ${t.ticker} ${t.asset}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [trades, filters]);

  const agg = useMemo(
    () => ({
      k: kpis(filtered),
      tickers: topTickers(filtered, 10),
      traders: topTraders(filtered, 10),
      months: volumeByMonth(filtered),
      party: partyBreakdown(filtered),
      side: sideBreakdown(filtered),
    }),
    [filtered]
  );

  const badge = SOURCE_BADGE[source] || SOURCE_BADGE.seed;

  return (
    <div className="min-h-screen text-body">
      <header className="px-4 sm:px-6 pt-5 pb-4 border-b border-edge bg-bg/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent/15 border border-accent/40 grid place-items-center text-2xl">
              🏛️
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-heading uppercase tracking-wider">
                Capitol <span className="text-accent">Trades</span>
              </h1>
              <p className="text-xs text-body/60">Congressional stock-trade disclosure tracker</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[11px] px-2 py-1 rounded border ${badge.cls}`}>{badge.text}</span>
            <button
              onClick={refresh}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg border border-edge hover:border-accent text-body/80 disabled:opacity-50"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {source === 'seed' && (
        <div className="bg-accent/10 border-b border-accent/30 text-accent/90 text-xs px-4 py-2 text-center">
          Showing bundled sample data (members &amp; tickers are real; transactions are synthetic).
          {error ? ` Live feed unavailable: ${error}. ` : ' '}
          Point at a live feed with <code className="text-accent">?dataUrl=</code> or
          <code className="text-accent"> window.CONGRESS_DATA_URL</code>.
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-5">
        <KpiCards k={agg.k} />

        <Filters
          value={filters}
          onChange={setFilters}
          facets={allFacets}
          resultCount={filtered.length}
          totalCount={trades.length}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard
            title="Trade Volume Over Time"
            subtitle="Estimated $ by month (bracket midpoints), buys vs sells"
            className="lg:col-span-2"
          >
            <VolumeTrendChart data={agg.months} />
          </ChartCard>
          <ChartCard title="Most-Traded Tickers" subtitle="By estimated volume">
            <TopTickersChart data={agg.tickers} />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="By Party" subtitle="Share of disclosed trades">
            <PartyPie data={agg.party} />
          </ChartCard>
          <ChartCard title="Buys vs Sells" subtitle="Transaction direction">
            <SidePie side={agg.side} />
          </ChartCard>
          <Leaderboard traders={agg.traders} onSelectMember={setSelectedMember} />
        </div>

        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-heading mb-2">
            Transactions
          </h2>
          <TradesTable trades={filtered} onSelectMember={setSelectedMember} />
        </div>

        <footer className="text-center text-xs text-body/50 py-4 flex flex-col gap-1">
          <span>
            {meta?.description}
          </span>
          <span>
            {lastUpdated
              ? `Live data updated ${lastUpdated.toLocaleString('en-US')}`
              : 'Data source: bundled seed dataset'}
            {' · '}
            Disclosures are filed under the STOCK Act (periodic transaction reports).
          </span>
        </footer>
      </main>

      <MemberDrawer member={selectedMember} trades={trades} onClose={() => setSelectedMember(null)} />
    </div>
  );
}
