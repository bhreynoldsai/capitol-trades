import { useEffect, useState } from 'react';
import { fmtDate } from '../utils/format.js';

// Module-level cache so the same date is only fetched once across the app.
const cache = new Map(); // date -> { status: 'loading'|'ok'|'error', items, mode }
const subscribers = new Map(); // date -> Set<fn>

function notify(date) {
  (subscribers.get(date) || []).forEach((fn) => fn());
}

async function loadDate(date) {
  if (cache.has(date)) return;
  cache.set(date, { status: 'loading', items: [] });
  notify(date);
  try {
    const res = await fetch(`/api/news?date=${date}`);
    const json = await res.json();
    cache.set(date, { status: 'ok', items: json.items || [], mode: json.mode });
  } catch {
    cache.set(date, { status: 'error', items: [] });
  }
  notify(date);
}

export default function DayNews({ date }) {
  const [, force] = useState(0);

  useEffect(() => {
    if (!date) return undefined;
    const rerender = () => force((n) => n + 1);
    if (!subscribers.has(date)) subscribers.set(date, new Set());
    subscribers.get(date).add(rerender);
    loadDate(date);
    return () => subscribers.get(date)?.delete(rerender);
  }, [date]);

  const entry = cache.get(date);

  if (!entry || entry.status === 'loading') {
    return <div className="text-[11px] text-body/50 py-1">Loading news for {fmtDate(date)}…</div>;
  }
  if (entry.status === 'error') {
    return <div className="text-[11px] text-body/50 py-1">Couldn’t load news for this date.</div>;
  }
  if (!entry.items.length) {
    return <div className="text-[11px] text-body/50 py-1">No major U.S. headlines found for {fmtDate(date)}.</div>;
  }

  return (
    <div className="py-1">
      <div className="text-[10px] uppercase tracking-wider text-body/50 mb-1">
        {entry.mode === 'market' ? 'Market & economy headlines' : 'Top U.S. headlines'} · {fmtDate(date)}
      </div>
      <ul className="flex flex-col gap-1.5">
        {entry.items.map((n, i) => (
          <li key={i} className="text-[12px] leading-snug">
            <a
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="text-body/85 hover:text-accent"
            >
              {n.title}
            </a>
            {n.source && <span className="text-body/40"> — {n.source}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
