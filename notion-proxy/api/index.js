const NOTION_VERSION = '2025-09-03';

const DIM_MAP = {
  'Economic Vitality':          'economic',
  'Environment':                'environment',
  'Equity and Fairness':        'equality',
  'Health':                     'health',
  'Preparedness and resilience':'preparedness',
};

const SECTOR_MAP = {
  'A. Inputs to food production':              'a',
  'B. Agricultural and food production practices': 'b',
  'C. Processing and distribution chains':     'c',
  'D. Consumption and dietary patterns':       'd',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function notionFetch(path, method = 'GET', body = null) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function getAllPages() {
  const pages = [];
  let cursor = undefined;
  do {
    const body = { page_size: 100, filter: { property: 'object', value: 'page' } };
    if (cursor) body.start_cursor = cursor;
    const r = await notionFetch('/search', 'POST', body);
    pages.push(...(r.results || []));
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return pages;
}

function richText(prop) {
  return (prop?.rich_text || []).map(t => t.plain_text).join('');
}

function title(prop) {
  return (prop?.title || []).map(t => t.plain_text).join('');
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, '');

  // GET /indicators — all 100 KPI dots
  if (path === '/indicators' && req.method === 'GET') {
    const pages = await getAllPages();
    const indicators = pages
      .filter(p => p.properties?.Indicator)
      .map(p => ({
        id:      p.id,
        kpi:     richText(p.properties.Indicator),
        dim:     DIM_MAP[p.properties['Food System Goals']?.select?.name] || 'preparedness',
        comp:    SECTOR_MAP[p.properties['VC Domain']?.select?.name] || 'a',
        element: richText(p.properties['Text 2']),
        desc:    richText(p.properties['Description Indicator']),
      }))
      .filter(i => i.kpi);
    return json(indicators);
  }

  // GET /cards — intervention cards
  if (path === '/cards' && req.method === 'GET') {
    const pages = await getAllPages();
    const cards = pages
      .filter(p => p.properties?.['Card description'])
      .map(p => {
        const cardTitle = title(p.properties.Name) || richText(p.properties.Name);
        const desc = richText(p.properties['Card description']);
        const cat = p.properties['Multi-select']?.select?.name || '';
        const dim = DIM_MAP[p.properties['Food System Goals']?.select?.name] || 'preparedness';
        return {
          id:        p.id,
          title:     cardTitle,
          desc:      desc,
          dim:       dim,
          timeframe: p.properties.Timeframe?.select?.name || 'mid-term',
          boost:     p.properties.Boost?.number || 0.15,
          tags:      (p.properties.Tags?.multi_select || []).map(t => t.name),
          category:  cat,
          affects:   (p.properties.Affects?.multi_select || []).map(t => t.name),
          location: {
            name: richText(p.properties['Location Name']),
            lat:  p.properties.Latitude?.number || null,
            lng:  p.properties.Longitude?.number || null,
          },
        };
      })
      .filter(c => c.title);
    return json(cards);
  }

  // POST /cards — create a new card in Notion
  if (path === '/cards' && req.method === 'POST') {
    const body = await req.json();
    const CARDS_DB = process.env.NOTION_CARDS_DB;
    if (!CARDS_DB) return json({ error: 'NOTION_CARDS_DB not set' }, 500);

    const page = await notionFetch('/pages', 'POST', {
      parent: { database_id: CARDS_DB },
      properties: {
        Name: { title: [{ text: { content: body.title || '' } }] },
        'Card description': { rich_text: [{ text: { content: body.desc || '' } }] },
        'Multi-select': body.category ? { select: { name: body.category } } : undefined,
        Boost: body.boost ? { number: body.boost } : undefined,
        Timeframe: body.timeframe ? { select: { name: body.timeframe } } : undefined,
      },
    });
    return json({ id: page.id, ok: true });
  }

  return json({ error: 'Not found' }, 404);
}

export const config = { runtime: 'edge' };
