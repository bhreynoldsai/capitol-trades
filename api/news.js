// Vercel serverless function: major U.S. news for a given date, to provide
// context for why a member of Congress may have traded that day.
//
// Backed by GDELT's DOC 2.0 API — free, no key, historical coverage. We ask for
// market/economy-relevant U.S. English coverage that day and fall back to major
// wire/business outlets if the themed query is empty. Past-date news is static,
// so responses are cached hard at the edge.
//
//   GET /api/news?date=YYYY-MM-DD  ->  { date, items: [{title, source, url, time}] }

const GDELT = 'https://api.gdeltproject.org/api/v2/doc/doc';

// Market-moving themes first — these are what plausibly drive trading decisions.
const THEMED =
  '(theme:ECON_STOCKMARKET OR theme:ECON_INTEREST_RATE OR theme:ECON_INFLATION OR ' +
  'theme:ECON_EARNINGSREPORT OR theme:ECON_CENTRALBANK OR theme:ECON_BANKRUPTCY OR ' +
  'theme:USPEC_POLICY1) sourcecountry:US sourcelang:english';

// Fallback: top general coverage from major U.S. wire/business outlets that day.
const MAJORS =
  '(domainis:reuters.com OR domainis:apnews.com OR domainis:cnbc.com OR ' +
  'domainis:bloomberg.com OR domainis:wsj.com OR domainis:nytimes.com OR ' +
  'domainis:washingtonpost.com OR domainis:politico.com) sourcecountry:US';

function toDateLabel(seendate) {
  // GDELT seendate looks like "20260720T133000Z".
  if (!seendate) return null;
  const m = String(seendate).match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

async function gdelt(query, start, end) {
  const url =
    `${GDELT}?query=${encodeURIComponent(query)}` +
    `&mode=artlist&format=json&maxrecords=25&sort=hybridrel` +
    `&startdatetime=${start}&enddatetime=${end}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'capitol-trades/1.0' } });
  if (!res.ok) throw new Error(`GDELT HTTP ${res.status}`);
  // GDELT sometimes returns non-JSON (HTML error) for malformed queries.
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }
  return Array.isArray(json.articles) ? json.articles : [];
}

function clean(articles, cap = 6) {
  const seen = new Set();
  const out = [];
  for (const a of articles) {
    const title = (a.title || '').trim();
    if (!title || seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    out.push({
      title,
      source: a.domain || '',
      url: a.url || '',
      time: toDateLabel(a.seendate),
    });
    if (out.length >= cap) break;
  }
  return out;
}

export default async function handler(req, res) {
  const date = String(req.query.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date must be YYYY-MM-DD', items: [] });
    return;
  }
  const ymd = date.replace(/-/g, '');
  const start = `${ymd}000000`;
  const end = `${ymd}235959`;

  try {
    let articles = await gdelt(THEMED, start, end);
    let mode = 'market';
    if (articles.length < 3) {
      const more = await gdelt(MAJORS, start, end);
      if (more.length > articles.length) {
        articles = more;
        mode = 'general';
      }
    }
    // Past-date news never changes; cache for a week, allow stale for a month.
    res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate=2592000');
    res.status(200).json({ date, mode, items: clean(articles) });
  } catch (err) {
    const cause = err && err.cause ? `${err.cause.code || ''} ${err.cause.message || err.cause}`.trim() : '';
    res.status(502).json({ error: String(err.message || err), cause, items: [] });
  }
}
