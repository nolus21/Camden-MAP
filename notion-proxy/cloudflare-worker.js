// Camden Food System — Notion Proxy
// Cloudflare Worker — paste this in the Workers editor and hit Deploy

const NOTION_VERSION = '2025-09-03';

// Confirmed from Notion URL: app.notion.com/p/darkmatterlabs/392190f347a280f4af05c980725d7cad
const CARDS_DB_ID = '392190f3-47a2-80f4-af05-c980725d7cad';
// data_source_id (from page parent) — REQUIRED as create parent in API 2025-09-03
const CARDS_DATA_SOURCE_ID = '392190f3-47a2-8058-a98a-000b0fa6007f';

const DIM_MAP = {
  'Economic Vitality':           'economic',
  'Environment':                 'environment',
  'Equity and Fairness':         'equality',
  'Health':                      'health',
  'Preparedness and resilience': 'preparedness',
};

// Wheel sub-section code → exact Domain Elements DB record name
const DOMAIN_ELEMENT_NAME = {
  a0:'Land and soil as living capital',
  a1:'Regional nutrient cycles and reduced dependency on imports',
  a2:'Seeds, breeds and genetic diversity as a common resource',
  a3:'Renewable energy and climate-resilient infrastructure',
  a4:'Knowledge, labour and capital',
  b0:'Regenerative crop rotations and soil-building practices',
  b1:'Agroforestry and perennial systems as structural elements',
  b2:'Animals as nutrient recyclers and landscape managers',
  b3:'Beyond agriculture: fisheries, aquaculture and horticulture',
  b4:'Landscape planning across scales',
  c0:'Regional nodes and diverse infrastructure',
  c1:'Short and transparent value chains',
  c2:'Public procurement as a strategic lever',
  c3:'Efficient logistics and reduced waste',
  c4:'Resilience to crises',
  d0:'Healthy, mainly plant-based diets as the norm',
  d1:'Food environments that make the healthy choice easy',
  d2:'Equity and access as central principles',
  d3:'Food culture, skills and democracy',
};

const DIM_TO_NOTION = {
  economic:     'Economic Vitality',
  environment:  'Environment',
  equality:     'Equity and Fairness',
  health:       'Health',
  preparedness: 'Preparedness and resilience',
};

const SECTOR_MAP = {
  'A. Inputs to food production':                  'a',
  'B. Agricultural and food production practices': 'b',
  'C. Processing and distribution chains':         'c',
  'D. Consumption and dietary patterns':           'd',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function respond(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function richText(prop) {
  return (prop?.rich_text || []).map(t => t.plain_text).join('');
}

function titleText(prop) {
  return (prop?.title || []).map(t => t.plain_text).join('');
}

function propValue(prop) {
  if (!prop) return '';
  switch (prop.type) {
    case 'title':        return titleText(prop);
    case 'rich_text':    return richText(prop);
    case 'select':       return prop.select?.name || '';
    case 'multi_select': return (prop.multi_select || []).map(s => s.name).join(', ');
    case 'number':       return prop.number ?? '';
    case 'checkbox':     return prop.checkbox;
    case 'url':          return prop.url || '';
    case 'date':         return prop.date?.start || '';
    case 'people':       return (prop.people || []).map(p => p.name).join(', ');
    case 'relation':     return `${(prop.relation || []).length} linked`;
    default:             return '';
  }
}

async function notionFetch(path, token, method = 'GET', body = null) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      'Authorization':  `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type':   'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function getAllPages(token) {
  const pages = [];
  let cursor;
  do {
    const body = { page_size: 100, filter: { property: 'object', value: 'page' } };
    if (cursor) body.start_cursor = cursor;
    const r = await notionFetch('/search', token, 'POST', body);
    if (r.results) pages.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return pages;
}

// Find the cards database ID by searching for databases with 'Card description' property
async function getCardsDbId(token, envHint) {
  if (envHint) return envHint;
  let cursor;
  do {
    const body = { page_size: 100, filter: { property: 'object', value: 'database' } };
    if (cursor) body.start_cursor = cursor;
    const r = await notionFetch('/search', token, 'POST', body);
    for (const db of (r.results || [])) {
      if (db.properties?.['Card description']) return db.id;
    }
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return null;
}

// Convert the Affects column to rich_text on the DATA SOURCE.
// In API 2025-09-03 column types live on the data source, not the database.
async function ensurePortfolioSchema(token, dataSourceId) {
  return notionFetch(`/data_sources/${dataSourceId}`, token, 'PATCH', {
    properties: {
      'Affects': { rich_text: {} },
    },
  });
}

// Build Notion properties object for a portfolio card
function buildCardProperties(card) {
  const props = {};

  if (card.title)
    props['Name'] = { title: [{ text: { content: card.title } }] };

  if (card.desc)
    props['Card description'] = { rich_text: [{ text: { content: card.desc.slice(0, 2000) } }] };

  if (card.dim && DIM_TO_NOTION[card.dim])
    props['Food System Goals'] = { select: { name: DIM_TO_NOTION[card.dim] } };

  if (card.timeframe)
    props['Timeframe'] = { select: { name: card.timeframe } };

  if (card.boost != null)
    props['Boost'] = { number: card.boost };

  if (card.category)
    props['Intervention Category'] = { select: { name: card.category } };

  if (card.tags?.length)
    props['Tags'] = { multi_select: card.tags.map(t => ({ name: t })) };

  // Affects stored as newline-separated text — KPI keys contain commas,
  // which Notion multi_select options forbid. Keys must stay exact.
  if (card.affects?.length)
    props['Affects'] = { rich_text: [{ text: { content: card.affects.join('\n') } }] };

  if (card.pathway)
    props['Pathway'] = { select: { name: card.pathway } };

  if (card.pathway_name)
    props['Pathway Name'] = { select: { name: card.pathway_name } };

  if (card.scale)
    props['Scale'] = { select: { name: card.scale } };

  if (card.wheel_sectors?.length)
    props['VC Domains'] = { multi_select: card.wheel_sectors.map(s => ({ name: s })) };

  // Domain Elements is now a relation, maintained by /link-domain-elements — not written here.

  if (card.lang_refs)
    props['Refs'] = { rich_text: [{ text: { content: card.lang_refs } }] };

  if (card.precedent)
    props['Precedent'] = { rich_text: [{ text: { content: card.precedent } }] };

  if (card.cost_of_inaction)
    props['Cost of Inaction'] = { rich_text: [{ text: { content: card.cost_of_inaction } }] };

  if (card.status)
    props['Status'] = { select: { name: card.status } };

  if (typeof card.cost === 'number')
    props['Cost'] = { number: card.cost };

  if (typeof card.avoided === 'number')
    props['Avoided Cost'] = { number: card.avoided };

  return props;
}

function detectSchema(pages) {
  const groups = {};
  for (const p of pages) {
    const props = Object.keys(p.properties || {}).sort();
    const sig   = props.join('|');
    if (!groups[sig]) groups[sig] = { signature: sig, fields: props, pages: [] };
    groups[sig].pages.push(p);
  }
  return Object.values(groups)
    .filter(g => g.pages.length > 1)
    .sort((a, b) => b.pages.length - a.pages.length);
}

// ── HANDLER ──────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url   = new URL(request.url);
    const path  = url.pathname;
    const token = env.NOTION_TOKEN;

    if (!token) return respond({ error: 'NOTION_TOKEN not configured' }, 500);

    // ── GET /cards ────────────────────────────────────────────
    if (path === '/cards' && request.method === 'GET') {
      const pages = await getAllPages(token);
      // Resolve Domain Element relation ids → names (records are in the same page set)
      const deIdToName = {};
      for (const p of pages) {
        if (p.properties?.['Domain Element']) {
          const nm = richText(p.properties['Domain Element']).trim();
          if (nm) deIdToName[p.id] = nm;
        }
      }
      const readDomainElements = (p) => {
        const prop = p.properties['Domain Elements Rel'] || p.properties['Domain Elements'];
        if (!prop) return [];
        if (prop.relation) return prop.relation.map(r => deIdToName[r.id] || r.id);
        return (prop.multi_select || []).map(t => t.name);
      };
      const cards = pages
        .filter(p => p.properties?.['Card description'])
        .map(p => ({
          id:            p.id,
          title:         titleText(p.properties.Name),
          desc:          richText(p.properties['Card description']),
          dim:           DIM_MAP[p.properties['Food System Goals']?.select?.name] || 'preparedness',
          timeframe:     p.properties.Timeframe?.select?.name || 'mid-term',
          boost:         p.properties.Boost?.number || 0.15,
          tags:          (p.properties.Tags?.multi_select        || []).map(t => t.name),
          affects:       richText(p.properties.Affects).split('\n').map(s => s.trim()).filter(Boolean),
          category:      p.properties['Intervention Category']?.select?.name
                      || p.properties['Category']?.select?.name
                      || p.properties['Multi-select']?.select?.name || '',
          pathway:       p.properties['Pathway']?.select?.name || '',
          pathway_name:  p.properties['Pathway Name']?.select?.name || '',
          scale:         p.properties['Scale']?.select?.name || '',
          wheel_sectors: (p.properties['VC Domains']?.multi_select      || []).map(t => t.name),
          wheel_subcats: readDomainElements(p),
          lang_refs:     richText(p.properties['Refs']),
          precedent:     richText(p.properties['Precedent']),
          cost_of_inaction: richText(p.properties['Cost of Inaction']),
          cost:          p.properties['Cost']?.number ?? null,
          avoided:       p.properties['Avoided Cost']?.number ?? null,
          status:        p.properties['Status']?.select?.name || '',
          location: {
            name: richText(p.properties['Location Name']),
            lat:  p.properties.Latitude?.number  || null,
            lng:  p.properties.Longitude?.number || null,
          },
        }))
        .filter(c => c.title);
      return respond(cards);
    }

    // ── POST /portfolio-sync ──────────────────────────────────
    // Accepts { cards: [...] } — upserts by title match.
    // Also patches the database schema to ensure all fields exist.
    if (path === '/portfolio-sync' && request.method === 'POST') {
      const body = await request.json();
      const incoming = body.cards || [];
      if (!incoming.length) return respond({ error: 'No cards provided' }, 400);

      // 1. Get all existing pages and find the cards database ID from page parents
      const existing  = await getAllPages(token);
      const cardPages = existing.filter(p => p.properties?.['Card description']);

      const dbId = env.NOTION_CARDS_DB || CARDS_DB_ID;

      // 2. Convert Affects column to rich_text on the data source
      const schemaRes = await ensurePortfolioSchema(token, CARDS_DATA_SOURCE_ID);

      // 3. Build title → page-id map from existing cards
      const byTitle = {};
      for (const p of cardPages) {
        const t = titleText(p.properties.Name).toLowerCase().trim();
        if (t) byTitle[t] = p.id;
      }

      // 4. Upsert each card
      const results = [];
      for (const card of incoming) {
        const key   = (card.title || '').toLowerCase().trim();
        const props = buildCardProperties(card);

        if (byTitle[key]) {
          const r = await notionFetch(`/pages/${byTitle[key]}`, token, 'PATCH', { properties: props });
          results.push({ title: card.title, action: 'updated', ok: r.object !== 'error', error: r.message });
        } else {
          const r = await notionFetch('/pages', token, 'POST', {
            parent: { type: 'data_source_id', data_source_id: CARDS_DATA_SOURCE_ID },
            properties: props,
          });
          results.push({ title: card.title, action: 'created', ok: r.object !== 'error', error: r.message });
        }
      }

      const ok     = results.filter(r => r.ok).length;
      const failed = results.filter(r => !r.ok);
      const schemaErr = schemaRes.object === 'error' ? schemaRes.message : null;
      return respond({ ok, total: incoming.length, dbId, schemaErr, failed, results });
    }

    // ── POST /fix-pathways ────────────────────────────────────
    // One-shot cleanup: remap stray I/II/III → full A/B/C pathway names,
    // and delete the redundant "Pathway Name" property.
    if (path === '/fix-pathways' && request.method === 'POST') {
      const MAP = {
        'I':   'A - BEYOND CRISIS: UNIVERSAL NUTRITION INFRASTRUCTURE',
        'II':  'B - BEYOND CAMDEN: REGIONAL FOOD SOVEREIGNTY',
        'III': 'C - BEYOND PRICE: NEW FOOD ECONOMICS',
      };
      const pages     = await getAllPages(token);
      const cardPages = pages.filter(p => p.properties?.['Card description']);
      const results   = [];
      for (const p of cardPages) {
        const cur = p.properties['Pathway']?.select?.name;
        if (cur && MAP[cur]) {
          const r = await notionFetch(`/pages/${p.id}`, token, 'PATCH', {
            properties: { Pathway: { select: { name: MAP[cur] } } },
          });
          results.push({ title: titleText(p.properties.Name), from: cur, to: MAP[cur].slice(0, 22) + '…',
                         ok: r.object !== 'error', error: r.message });
        }
      }
      // Delete the redundant "Pathway Name" property (schema lives on the data source)
      const del = await notionFetch(`/data_sources/${CARDS_DATA_SOURCE_ID}`, token, 'PATCH', {
        properties: { 'Pathway Name': null },
      });
      const ok = results.filter(r => r.ok).length;
      return respond({
        remapped: ok, attempted: results.length,
        pathwayNameDeleted: del.object !== 'error',
        delError: del.object === 'error' ? del.message : null,
        failed: results.filter(r => !r.ok), results,
      });
    }

    // ── POST /fix-domain-elements ─────────────────────────────
    // Rewrite each card's Domain Elements codes (c4, d2…) → exact DB names
    if (path === '/fix-domain-elements' && request.method === 'POST') {
      const pages     = await getAllPages(token);
      const cardPages = pages.filter(p => p.properties?.['Card description']);
      const results   = [];
      for (const p of cardPages) {
        const codes = (p.properties['Domain Elements']?.multi_select || []).map(t => t.name);
        if (!codes.length) continue;
        const names = codes.map(c => DOMAIN_ELEMENT_NAME[String(c).toLowerCase().trim()] || c);
        if (JSON.stringify(codes) === JSON.stringify(names)) continue; // already names
        const r = await notionFetch(`/pages/${p.id}`, token, 'PATCH', {
          properties: { 'Domain Elements': { multi_select: names.map(n => ({ name: n })) } },
        });
        results.push({ title: titleText(p.properties.Name), from: codes, to: names,
                       ok: r.object !== 'error', error: r.message });
      }
      return respond({ updated: results.filter(r => r.ok).length, attempted: results.length,
                       failed: results.filter(r => !r.ok), results });
    }

    // ── POST /link-domain-elements ────────────────────────────
    // Create a relation "Domain Elements Rel" → Domain Elements DB and populate it
    // from each card's current codes/names. (User then deletes old field + renames.)
    if (path === '/link-domain-elements' && request.method === 'POST') {
      const pages = await getAllPages(token);
      // Domain Elements records: pages that have a 'Domain Element' property
      const dePages = pages.filter(p => p.properties?.['Domain Element']);
      const nameToId = {};
      let deDataSourceId = null;
      for (const p of dePages) {
        const nm = richText(p.properties['Domain Element']).trim();
        if (nm) nameToId[nm] = p.id;
        if (!deDataSourceId && p.parent?.data_source_id) deDataSourceId = p.parent.data_source_id;
      }
      if (!deDataSourceId) return respond({ error: 'Could not resolve Domain Elements data source id' }, 500);

      // 1. create the relation property
      const createRel = await notionFetch(`/data_sources/${CARDS_DATA_SOURCE_ID}`, token, 'PATCH', {
        properties: {
          'Domain Elements Rel': {
            relation: { data_source_id: deDataSourceId, type: 'single_property', single_property: {} },
          },
        },
      });
      if (createRel.object === 'error')
        return respond({ step: 'create-relation', error: createRel.message, deDataSourceId }, 500);

      // 2. populate per card (map codes → names → record ids)
      const cardPages = pages.filter(p => p.properties?.['Card description']);
      const results = [];
      for (const p of cardPages) {
        const vals = (p.properties['Domain Elements']?.multi_select || []).map(t => t.name);
        if (!vals.length) continue;
        const names = vals.map(v => DOMAIN_ELEMENT_NAME[String(v).toLowerCase().trim()] || v);
        const ids = names.map(n => nameToId[n]).filter(Boolean);
        const missing = names.filter(n => !nameToId[n]);
        const r = await notionFetch(`/pages/${p.id}`, token, 'PATCH', {
          properties: { 'Domain Elements Rel': { relation: ids.map(id => ({ id })) } },
        });
        results.push({ title: titleText(p.properties.Name), linked: ids.length, missing,
                       ok: r.object !== 'error', error: r.message });
      }
      return respond({
        deDataSourceId, relationCreated: true,
        populated: results.filter(r => r.ok).length, attempted: results.length,
        anyMissing: results.filter(r => r.missing.length).map(r => ({ title: r.title, missing: r.missing })),
        failed: results.filter(r => !r.ok), sample: results.slice(0, 5),
      });
    }

    // ── GET /debug ────────────────────────────────────────────
    // Returns: database ID, schema patch result, existing properties
    if (path === '/debug' && request.method === 'GET') {
      const existing  = await getAllPages(token);
      const cardPages = existing.filter(p => p.properties?.['Card description']);

      const dbId = env.NOTION_CARDS_DB || CARDS_DB_ID;

      const samplePage     = cardPages[0] || null;
      const existingFields = samplePage ? Object.keys(samplePage.properties) : [];
      const parentInfo     = samplePage?.parent || null;

      let patchResult = null;
      if (dbId) {
        patchResult = await ensurePortfolioSchema(token, dbId);
      }

      // Re-read database to confirm fields after patch
      let dbAfterPatch = null;
      if (dbId) {
        dbAfterPatch = await notionFetch(`/databases/${dbId}`, token);
      }

      return respond({
        cardPageCount:   cardPages.length,
        derivedDbId:     dbId,
        sampleParent:    parentInfo,
        existingFields,
        patchResult:     patchResult ? { object: patchResult.object, message: patchResult.message } : null,
        dbPropertiesAfterPatch: dbAfterPatch ? Object.keys(dbAfterPatch.properties || {}) : null,
        dbError:         dbAfterPatch?.message || null,
      });
    }

    // ── GET /indicators ───────────────────────────────────────
    if (path === '/indicators' && request.method === 'GET') {
      const pages      = await getAllPages(token);
      const indicators = pages
        .filter(p => p.properties?.Indicator)
        .map(p => ({
          id:      p.id,
          kpi:     richText(p.properties.Indicator),
          dim:     DIM_MAP[p.properties['Food System Goals']?.select?.name]  || 'preparedness',
          comp:    SECTOR_MAP[p.properties['VC Domain']?.select?.name]        || 'a',
          element: richText(p.properties['Text 2']),
          desc:    richText(p.properties['Description Indicator']),
        }))
        .filter(i => i.kpi);
      return respond(indicators);
    }

    // ── GET /domain-elements ──────────────────────────────────
    if (path === '/domain-elements' && request.method === 'GET') {
      const pages    = await getAllPages(token);
      const elements = pages
        .filter(p => p.properties?.['Domain Element'])
        .map(p => ({
          id:      p.id,
          element: richText(p.properties['Domain Element']),
          desc:    richText(p.properties.Description),
          vc:      p.properties['VC Domain']?.select?.name || '',
          sector:  SECTOR_MAP[p.properties['VC Domain']?.select?.name] || '',
        }))
        .filter(e => e.element);
      return respond(elements);
    }

    // ── GET /databases ────────────────────────────────────────
    if (path === '/databases' && request.method === 'GET') {
      const pages  = await getAllPages(token);
      const groups = detectSchema(pages);

      const databases = groups.map(g => {
        const sample     = g.pages[0];
        const fields     = g.fields.map(name => ({ name, type: sample.properties[name]?.type || 'unknown' }));
        const titleField = fields.find(f => f.type === 'title');
        const name = (() => {
          if (g.fields.includes('Indicator'))        return 'KPI Indicators';
          if (g.fields.includes('Domain Element'))   return 'Domain Elements';
          if (g.fields.includes('Card description')) return 'Intervention Cards';
          if (g.fields.includes('VC Domain'))        return 'VC Domain Records';
          return titleField ? `Database (${g.pages.length} records)` : 'Unnamed Database';
        })();
        const rows = g.pages.slice(0, 50).map(p => {
          const row = { _id: p.id };
          for (const field of fields) row[field.name] = propValue(p.properties[field.name]);
          return row;
        });
        return { name, fields, count: g.pages.length, rows };
      });

      return respond(databases);
    }

    // ── POST /cards (single card create) ─────────────────────
    if (path === '/cards' && request.method === 'POST') {
      const body = await request.json();
      const page = await notionFetch('/pages', token, 'POST', {
        parent: { type: 'data_source_id', data_source_id: CARDS_DATA_SOURCE_ID },
        properties: buildCardProperties(body),
      });

      if (page.object === 'error') return respond({ error: page.message }, 400);
      return respond({ id: page.id, ok: true });
    }

    return respond({ error: 'Not found' }, 404);
  },
};
