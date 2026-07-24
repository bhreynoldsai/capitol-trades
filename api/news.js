// Vercel serverless function: major U.S./world news for a given date, to give
// context for why a member of Congress may have traded that day.
//
// Backed by Wikipedia's "Portal:Current events" — a free, no-key, curated daily
// digest of major events by category (Business & economy, Politics, Disasters,
// Armed conflicts, …). Reliable from serverless (unlike GDELT, which refuses
// connections from cloud IPs). Past-date entries are static, so we cache hard.
//
//   GET /api/news?date=YYYY-MM-DD          -> { date, items: [{title, source, url}] }
//   GET /api/news?date=YYYY-MM-DD&debug=1  -> raw wikitext (for parser tuning)

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Categories most relevant to trading decisions come first.
const PREFERRED = [/business/i, /econom/i, /politic/i, /law and crime/i, /international/i];

function pageTitle(date) {
  const [y, m, d] = date.split('-').map(Number);
  return `Portal:Current events/${y} ${MONTHS[m - 1]} ${d}`; // day, no leading zero
}

async function fetchWikitext(date) {
  const title = pageTitle(date);
  const url =
    'https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json' +
    `&formatversion=2&redirects=1&page=${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'capitol-trades/1.0 (news context)' } });
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) return null;
  return json.parse?.wikitext || '';
}

// Strip MediaWiki markup from a single bullet line, pulling out the first
// external link URL as the item's source link when present.
function stripMarkup(line) {
  let url = '';
  let s = line;

  // External links: [https://url label] -> label (capture url)
  s = s.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, (_, u, label) => {
    if (!url) url = u;
    return label;
  });
  s = s.replace(/\[(https?:\/\/[^\s\]]+)\]/g, (_, u) => {
    if (!url) url = u;
    return '';
  });

  s = s
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, '')
    .replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g, '$1') // [[a|b]] -> b
    .replace(/\[\[([^\]]+)\]\]/g, '$1') // [[a]] -> a
    .replace(/'''?/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[–—-]\s*/, '');

  return { text: s, url };
}

function cleanCategory(s) {
  return s
    .replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .trim();
}

// Current-events day pages group items under bold category headers
// ('''Business and economy'''). Items are nested bullets; the meaningful news
// sentences are the ones carrying a source citation ([https://…]) — the shallow
// bullets are just topic wikilinks, so we keep only cited lines.
function parseEvents(wikitext) {
  const lines = wikitext.split('\n');
  let category = '';
  const events = [];
  for (const raw of lines) {
    const boldCat = raw.match(/^\s*'''([^']+?)'''\s*$/);
    const defCat = raw.match(/^[:*#\s]*;\s*(.+?)\s*$/);
    if (boldCat) { category = cleanCategory(boldCat[1]); continue; }
    if (defCat) { category = cleanCategory(defCat[1]); continue; }

    const bulletM = raw.match(/^[:#\s]*\*+\s*(.+)$/);
    if (!bulletM) continue;
    const content = bulletM[1];
    if (!/\[https?:\/\//.test(content)) continue; // keep only cited news items

    const { text, url } = stripMarkup(content);
    if (text && text.length > 20) events.push({ category, title: text, url });
  }
  return events;
}

export default async function handler(req, res) {
  const date = String(req.query.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date must be YYYY-MM-DD', items: [] });
    return;
  }
  try {
    const wikitext = await fetchWikitext(date);
    if (req.query.debug) {
      res.status(200).json({ date, page: pageTitle(date), wikitext: (wikitext || '').slice(0, 4000) });
      return;
    }
    if (!wikitext) {
      res.setHeader('Cache-Control', 's-maxage=86400');
      res.status(200).json({ date, items: [] });
      return;
    }

    const events = parseEvents(wikitext);
    // Rank preferred (market/politics) categories first, keep original order within.
    const score = (e) => {
      const i = PREFERRED.findIndex((re) => re.test(e.category));
      return i === -1 ? PREFERRED.length : i;
    };
    events.sort((a, b) => score(a) - score(b));

    const items = events.slice(0, 7).map((e) => ({
      title: e.title,
      category: e.category,
      source: 'Wikipedia Current events',
      url: e.url || `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle(date))}`,
    }));

    res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate=2592000');
    res.status(200).json({ date, items });
  } catch (err) {
    const cause = err && err.cause ? `${err.cause.code || ''} ${err.cause.message || err.cause}`.trim() : '';
    res.status(502).json({ error: String(err.message || err), cause, items: [] });
  }
}
