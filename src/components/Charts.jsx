import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  fmtUSD, monthLabel, PARTY_COLOR, PARTY_LABEL, SIDE_COLOR, SIDE_LABEL,
} from '../utils/format.js';

const AXIS = { fill: '#94afd4', fontSize: 11 };
const GRID = '#1e3a5f';

export function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-surface border border-edge rounded-xl p-4 flex flex-col ${className}`}>
      <div className="mb-3">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-heading">{title}</h3>
        {subtitle && <p className="text-[11px] text-body/60">{subtitle}</p>}
      </div>
      <div className="flex-1 min-h-[220px]">{children}</div>
    </div>
  );
}

function TipBox({ children }) {
  return (
    <div className="bg-bg border border-edge rounded-lg px-3 py-2 text-xs text-heading shadow-lg">
      {children}
    </div>
  );
}

export function TopTickersChart({ data }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={AXIS} tickFormatter={(v) => fmtUSD(v)} stroke={GRID} />
        <YAxis type="category" dataKey="key" tick={AXIS} width={52} stroke={GRID} interval={0} />
        <Tooltip
          cursor={{ fill: '#ffffff08' }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TipBox>
                <div className="font-semibold">{payload[0].payload.key}</div>
                <div className="text-body/70">{payload[0].payload.asset}</div>
                <div>Est. volume: {fmtUSD(payload[0].value)}</div>
                <div className="text-body/70">
                  {payload[0].payload.count} trades · {payload[0].payload.buy} buys / {payload[0].payload.sell} sells
                </div>
              </TipBox>
            ) : null
          }
        />
        <Bar dataKey="volume" radius={[0, 4, 4, 0]} fill="#0ed2d2" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VolumeTrendChart({ data }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="gBuy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="gSell" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tickFormatter={monthLabel} tick={AXIS} stroke={GRID} minTickGap={16} />
        <YAxis tick={AXIS} tickFormatter={(v) => fmtUSD(v)} stroke={GRID} width={48} />
        <Tooltip
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TipBox>
                <div className="font-semibold">{monthLabel(label)}</div>
                {payload.map((p) => (
                  <div key={p.dataKey} style={{ color: p.color }}>
                    {p.dataKey === 'buy' ? 'Buys' : 'Sells'}: {fmtUSD(p.value)}
                  </div>
                ))}
              </TipBox>
            ) : null
          }
        />
        <Area type="monotone" dataKey="buy" stroke="#22c55e" fill="url(#gBuy)" strokeWidth={2} />
        <Area type="monotone" dataKey="sell" stroke="#ef4444" fill="url(#gSell)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PartyPie({ data }) {
  const rows = data.filter((d) => d.count > 0);
  if (!rows.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={rows} dataKey="count" nameKey="party" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
          {rows.map((d) => (
            <Cell key={d.party} fill={PARTY_COLOR[d.party] || '#64748b'} stroke="#0a1628" />
          ))}
        </Pie>
        <Legend
          formatter={(v) => <span style={{ color: '#94afd4', fontSize: 11 }}>{PARTY_LABEL[v] || v}</span>}
        />
        <Tooltip
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TipBox>
                <div className="font-semibold">{PARTY_LABEL[payload[0].payload.party]}</div>
                <div>{payload[0].value} trades</div>
                <div className="text-body/70">{fmtUSD(payload[0].payload.volume)} est. volume</div>
              </TipBox>
            ) : null
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SidePie({ side }) {
  const rows = ['buy', 'sell', 'other']
    .map((k) => ({ key: k, count: side.counts[k], volume: side.volume[k] }))
    .filter((d) => d.count > 0);
  if (!rows.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={rows} dataKey="count" nameKey="key" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
          {rows.map((d) => (
            <Cell key={d.key} fill={SIDE_COLOR[d.key]} stroke="#0a1628" />
          ))}
        </Pie>
        <Legend
          formatter={(v) => <span style={{ color: '#94afd4', fontSize: 11 }}>{SIDE_LABEL[v] || v}</span>}
        />
        <Tooltip
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TipBox>
                <div className="font-semibold">{SIDE_LABEL[payload[0].payload.key]}</div>
                <div>{payload[0].value} trades</div>
                <div className="text-body/70">{fmtUSD(payload[0].payload.volume)} est. volume</div>
              </TipBox>
            ) : null
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return <div className="h-full grid place-items-center text-body/40 text-sm">No data</div>;
}
