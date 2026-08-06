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
          finalFilter:   p.properties['Final Filtering']?.select?.name
                      || richText(p.properties['Final Filtering']) || '',
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

    // ── POST /create-action-plan ──────────────────────────────
    // Create a new "Food Mission Action Plan 2026" database from the
    // borough delivery projects and connect it to Camden Borough Metrics
    // via an Outcome relation (auto-populated by matching outcome text).
    // Body: { projects:[...], parentPageId?, dbTitle? }
    if (path === '/create-action-plan' && request.method === 'POST') {
      const body     = await request.json();
      const projects = body.projects || [];
      if (!projects.length) return respond({ error: 'No projects provided' }, 400);

      const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const limit = body.limit || 40;   // stay under the 50-subrequest cap

      // 1. Discover Camden Borough Metrics data source + outcome→[pageIds] map.
      const pages   = await getAllPages(token);
      const cbPages = pages.filter(p =>
        p.properties?.['Indicator_CB'] || p.properties?.['Long-term outcome']);
      let cbDsId = null;
      const outcomeToIds = {};
      const outcomeLabels = {};
      for (const p of cbPages) {
        if (!cbDsId && p.parent?.data_source_id) cbDsId = p.parent.data_source_id;
        const okey = Object.keys(p.properties).find(k => /outcome/i.test(k));
        const oval = okey ? propValue(p.properties[okey]) : '';
        const n = norm(oval);
        if (!n) continue;
        (outcomeToIds[n] = outcomeToIds[n] || []).push(p.id);
        outcomeLabels[n] = oval;
      }
      if (!cbDsId) return respond({ error: 'Could not resolve Camden Borough Metrics data source' }, 500);

      // 2. IDEMPOTENT: is the Action Plan DB already there? Detect its pages by
      //    a signature unique to it, reuse its data source, and note existing
      //    project titles (as a multiset) so re-runs only add what's missing.
      const apPages = pages.filter(p =>
        p.properties?.['Measurable Shift'] && p.properties?.['Tactic'] &&
        p.properties?.['Intermediate Outcome'] && p.properties?.['Project']);
      let newDsId = null;
      const existingTitles = {};
      for (const p of apPages) {
        if (!newDsId && p.parent?.data_source_id) newDsId = p.parent.data_source_id;
        const t = titleText(p.properties['Project']).trim();
        if (t) existingTitles[t] = (existingTitles[t] || 0) + 1;
      }

      let createDb = null;
      if (!newDsId) {
        // 3. First run — create the database with its full schema (2025-09-03
        //    uses initial_data_source). Outcome is a relation (names contain
        //    commas, which select options forbid — and a relation is the goal).
        let parentPageId = body.parentPageId;
        if (!parentPageId) {
          const cdb = await notionFetch(`/databases/${CARDS_DB_ID}`, token);
          parentPageId = cdb?.parent?.page_id || pages[0]?.id || null;
        }
        if (!parentPageId) return respond({ error: 'No parent page available; pass parentPageId' }, 400);

        const STATUS_OPTS = ['2025-26 Strategic Priority','2026-27 Strategic Priority',
          'Active Project','Backburner','Project Ended','Project Closed'].map(name => ({ name }));
        const GOAL_OPTS = ['Economic Vitality','Health','Environment',
          'Equity and Fairness','Preparedness and resilience'].map(name => ({ name }));
        const VC_OPTS = ['A','B','C','D'].map(name => ({ name }));

        const schema = {
          'Project':                  { title: {} },
          'Outcome (Camden Metrics)': { relation: { data_source_id: cbDsId, type: 'dual_property', dual_property: {} } },
          'Intermediate Outcome':     { rich_text: {} },
          'Measurable Shift':         { rich_text: {} },
          'Tactic':                   { rich_text: {} },
          'Lead':                     { rich_text: {} },
          'Status':                   { select: { options: STATUS_OPTS } },
          'VC Domains':               { multi_select: { options: VC_OPTS } },
          'Food System Goals':        { select: { options: GOAL_OPTS } },
          'Goals & Successes':        { rich_text: {} },
          'Action Apr–Jun':           { rich_text: {} },
          'Action Jul–Sep':           { rich_text: {} },
          'Action Oct–Dec':           { rich_text: {} },
          'Action Jan–Mar':           { rich_text: {} },
        };

        createDb = await notionFetch('/databases', token, 'POST', {
          parent: { type: 'page_id', page_id: parentPageId },
          title:  [{ text: { content: body.dbTitle || 'Food Mission Action Plan 2026' } }],
          initial_data_source: { properties: schema },
        });
        if (createDb.object === 'error')
          return respond({ step: 'create-database', error: createDb.message, parentPageId, cbDsId }, 500);
        newDsId = createDb.data_sources?.[0]?.id || createDb.initial_data_source?.id || null;
        if (!newDsId)
          return respond({ step: 'read-data-source', error: 'No data source id on created db', createDb }, 500);
      }

      // 4. Compute which projects still need creating (multiset shortfall vs
      //    what already exists), then create up to `limit` this call.
      const seen = {};
      const toCreate = [];
      for (const pr of projects) {
        const t = (pr.project || '').trim();
        seen[t] = (seen[t] || 0) + 1;
        if (seen[t] > (existingTitles[t] || 0)) toCreate.push(pr);
      }
      const batch = toCreate.slice(0, limit);

      const rt = t => t ? [{ text: { content: String(t).slice(0, 1900) } }] : [];
      const results = [];
      const unmatched = new Set();
      for (const pr of batch) {
        const okey   = norm(pr.outcome);
        const relIds = outcomeToIds[okey] || [];
        if (!relIds.length && !/acrossalloutcomes/.test(okey)) unmatched.add(pr.outcome);
        const props = {
          'Project':               { title: [{ text: { content: (pr.project || 'Untitled').slice(0, 1900) } }] },
          'Intermediate Outcome':  { rich_text: rt(pr.intermediate) },
          'Measurable Shift':      { rich_text: rt(pr.shift) },
          'Tactic':                { rich_text: rt(pr.tactic) },
          'Lead':                  { rich_text: rt(pr.lead) },
          'Goals & Successes':     { rich_text: rt(pr.goals) },
          'Action Apr–Jun':        { rich_text: rt(pr.q1) },
          'Action Jul–Sep':        { rich_text: rt(pr.q2) },
          'Action Oct–Dec':        { rich_text: rt(pr.q3) },
          'Action Jan–Mar':        { rich_text: rt(pr.q4) },
          'Food System Goals':     { select: { name: pr.dim || 'Health' } },
        };
        if (pr.status)     props['Status']     = { select: { name: pr.status } };
        if (pr.vc?.length) props['VC Domains'] = { multi_select: pr.vc.map(n => ({ name: n })) };
        if (relIds.length) props['Outcome (Camden Metrics)'] = { relation: relIds.map(id => ({ id })) };

        const r = await notionFetch('/pages', token, 'POST', {
          parent: { type: 'data_source_id', data_source_id: newDsId },
          properties: props,
        });
        results.push({ project: pr.project, linked: relIds.length,
                       ok: r.object !== 'error', error: r.message });
      }

      const ok = results.filter(r => r.ok).length;
      return respond({
        dataSourceId: newDsId, cbDsId,
        databaseId: createDb ? createDb.id : '(existing)',
        url: createDb ? createDb.url : null,
        outcomeGroups: Object.keys(outcomeLabels).length,
        alreadyExisted: apPages.length,
        createdThisCall: ok,
        remaining: toCreate.length - batch.length,
        unmatchedOutcomes: [...unmatched],
        failed: results.filter(r => !r.ok).slice(0, 10),
      });
    }

    // ── GET /action-plan ──────────────────────────────────────
    // Read the Camden delivery portfolio (Food Mission Action Plan projects),
    // each with the Camden metrics it covers (resolved from the Outcome relation).
    if (path === '/action-plan' && request.method === 'GET') {
      const pages = await getAllPages(token);

      // Camden metric pages → id→{indicator, outcome, goal, avail}
      const cbPages = pages.filter(p =>
        p.properties?.['Indicator_CB'] || p.properties?.['Long-term outcome']);
      const cbById = {};
      for (const p of cbPages) {
        const okey = Object.keys(p.properties).find(k => /outcome/i.test(k));
        const ikey = Object.keys(p.properties).find(k => /indicator/i.test(k));
        const gkey = Object.keys(p.properties).find(k => /goal/i.test(k));
        const akey = Object.keys(p.properties).find(k => /avail/i.test(k));
        const tkey = Object.keys(p.properties).find(k => /^type$/i.test(k));
        cbById[p.id] = {
          indicator: ikey ? propValue(p.properties[ikey]) : '',
          outcome:   okey ? propValue(p.properties[okey]) : '',
          goal:      gkey ? propValue(p.properties[gkey]) : '',
          avail:     akey ? propValue(p.properties[akey]) : '',
          type:      tkey ? propValue(p.properties[tkey]) : '',
        };
      }

      // Action-plan project pages
      const ap = pages.filter(p =>
        p.properties?.['Measurable Shift'] && p.properties?.['Tactic'] &&
        p.properties?.['Intermediate Outcome'] && p.properties?.['Project']);
      const projects = ap.map(p => {
        const relIds = (p.properties['Outcome (Camden Metrics)']?.relation || []).map(r => r.id);
        return {
          id:           p.id,
          project:      titleText(p.properties['Project']),
          intermediate: richText(p.properties['Intermediate Outcome']),
          shift:        richText(p.properties['Measurable Shift']),
          tactic:       richText(p.properties['Tactic']),
          lead:         richText(p.properties['Lead']),
          status:       p.properties['Status']?.select?.name || '',
          dim:          p.properties['Food System Goals']?.select?.name || '',
          vc:           (p.properties['VC Domains']?.multi_select || []).map(s => s.name),
          covers:       relIds.map(id => cbById[id]).filter(Boolean),
        };
      });
      return respond({ count: projects.length, projects });
    }

    // ── POST /build-final-portfolio ───────────────────────────
    // Consolidate DML_Portfolio (Final Filtering≠No) + Camden Food Mission
    // Action Plan into ONE new "Camden Food Portfolio (Final)" database.
    // Origin = New (DML) / CB (Camden) / New + CB (merged pairs). Idempotent +
    // batched. Relation ids are copied straight across (same target sources).
    if (path === '/build-final-portfolio' && request.method === 'POST') {
      const body  = await request.json();
      const limit = body.limit || 28;
      const norm  = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const pages = await getAllPages(token);

      // resolve the relation target data sources (Camden Borough Metrics, Domain Elements)
      const cbPages = pages.filter(p => p.properties?.['Indicator_CB'] || p.properties?.['Long-term outcome']);
      let cbDsId = null; for (const p of cbPages) { if (p.parent?.data_source_id) { cbDsId = p.parent.data_source_id; break; } }
      const dePages = pages.filter(p => p.properties?.['Domain Element']);
      let deDsId = null; for (const p of dePages) { if (p.parent?.data_source_id) { deDsId = p.parent.data_source_id; break; } }

      // source pages — EXCLUDE the final DB's own pages (they carry 'Origin'),
      // otherwise the build re-ingests its own output in a feedback loop.
      const dmlPages = pages.filter(p => p.properties?.['Card description'] && !p.properties?.['Origin']);
      const camPages = pages.filter(p => p.properties?.['Measurable Shift'] && p.properties?.['Tactic'] &&
        p.properties?.['Intermediate Outcome'] && p.properties?.['Project'] && !p.properties?.['Origin']);

      const JUNK = new Set(['test', 'aleks card', 'ci']);
      const SKIP_DML = new Set(['foodstoragecapacity']);               // merged into "Processing + Cold Storage Capacity"
      const MERGES = [                                                  // DML card ⇐ absorbs a CB delivery project
        { dml: 'cooperationtown',          cb: 'cooperationtownpartnership' },
        { dml: 'mobiliycommunitykitchen',  cb: 'kilburncommunitykitchens' },
      ];
      // find the CB pages to absorb, capture their outcome-relation ids
      const cbSkip = new Set(); const dmlOutcomeIds = {};
      for (const m of MERGES) {
        const cb = camPages.find(p => norm(titleText(p.properties['Project'])).includes(m.cb));
        if (cb) { cbSkip.add(cb.id);
          dmlOutcomeIds[m.dml] = (cb.properties['Outcome (Camden Metrics)']?.relation || []).map(r => r.id); }
      }

      // build the unified card list from raw pages
      const cards = [];
      for (const p of dmlPages) {
        const name = titleText(p.properties.Name); const nn = norm(name);
        if (!name || JUNK.has(name.toLowerCase().trim()) || SKIP_DML.has(nn)) continue;
        if ((p.properties['Final Filtering']?.select?.name || '').toLowerCase() === 'no') continue;
        const mergeKey = MERGES.find(m => nn.includes(m.dml));
        cards.push({
          sourceId: p.id,
          origin: mergeKey ? 'New + CB' : 'New',
          name, desc: richText(p.properties['Card description']),
          goal: p.properties['Food System Goals']?.select?.name || '',
          vc: (p.properties['VC Domains']?.multi_select || []).map(s => s.name),
          pathway: p.properties['Pathway']?.select?.name || '',
          scale: p.properties['Scale']?.select?.name || '',
          status: p.properties['Status']?.select?.name || '',
          timeframe: p.properties['Timeframe']?.select?.name || '',
          category: p.properties['Intervention Category']?.select?.name || '',
          affects: richText(p.properties['Affects']),
          boost: p.properties['Boost']?.number ?? null,
          costOfInaction: richText(p.properties['Cost of Inaction']),
          precedent: richText(p.properties['Precedent']),
          refs: richText(p.properties['Refs']),
          domainEls: (p.properties['Domain Elements Rel']?.relation || []).map(r => r.id),
          outcomeIds: mergeKey ? (dmlOutcomeIds[mergeKey.dml] || []) : [],
        });
      }
      for (const p of camPages) {
        if (cbSkip.has(p.id)) continue;
        const name = titleText(p.properties['Project']); if (!name || JUNK.has(name.toLowerCase().trim())) continue;
        cards.push({
          sourceId: p.id,
          origin: 'CB', name,
          desc: richText(p.properties['Tactic']) || richText(p.properties['Measurable Shift']),
          goal: p.properties['Food System Goals']?.select?.name || '',
          vc: (p.properties['VC Domains']?.multi_select || []).map(s => s.name),
          status: p.properties['Status']?.select?.name || '',
          lead: richText(p.properties['Lead']),
          tactic: richText(p.properties['Tactic']),
          shift: richText(p.properties['Measurable Shift']),
          intermediate: richText(p.properties['Intermediate Outcome']),
          outcomeIds: (p.properties['Outcome (Camden Metrics)']?.relation || []).map(r => r.id),
          affects: '', domainEls: [],
        });
      }

      // idempotent by Source ID (unique per source card — handles same-name distinct cards)
      const finalPages = pages.filter(p => p.properties?.['Origin'] && p.properties?.['Card description']);
      let finalDsId = null; const existing = {};
      for (const p of finalPages) { if (p.parent?.data_source_id) finalDsId = p.parent.data_source_id;
        const sid = richText(p.properties['Source ID']).trim(); if (sid) existing[sid] = 1; }

      let createDb = null;
      if (!finalDsId) {
        let parentPageId = body.parentPageId;
        if (!parentPageId) { const cdb = await notionFetch(`/databases/${CARDS_DB_ID}`, token); parentPageId = cdb?.parent?.page_id || pages[0]?.id; }
        const schema = {
          'Name': { title: {} },
          'Origin': { select: { options: [{ name: 'New' }, { name: 'CB' }, { name: 'New + CB' }] } },
          'Source ID': { rich_text: {} },
          'Card description': { rich_text: {} },
          'Food System Goals': { select: {} },
          'VC Domains': { multi_select: {} },
          'Pathway': { select: {} },
          'Scale': { select: {} },
          'Status': { select: {} },
          'Timeframe': { select: {} },
          'Intervention Category': { select: {} },
          'Affects': { rich_text: {} },
          'Boost': { number: {} },
          'Outcome (Camden Metrics)': cbDsId ? { relation: { data_source_id: cbDsId, type: 'dual_property', dual_property: {} } } : { rich_text: {} },
          'Domain Elements': deDsId ? { relation: { data_source_id: deDsId, type: 'dual_property', dual_property: {} } } : { rich_text: {} },
          'Cost of Inaction': { rich_text: {} },
          'Precedent': { rich_text: {} },
          'Refs': { rich_text: {} },
          'Lead': { rich_text: {} },
          'Tactic': { rich_text: {} },
          'Measurable Shift': { rich_text: {} },
          'Intermediate Outcome': { rich_text: {} },
        };
        createDb = await notionFetch('/databases', token, 'POST', {
          parent: { type: 'page_id', page_id: parentPageId },
          title: [{ text: { content: body.dbTitle || 'Camden Food Portfolio (Final)' } }],
          initial_data_source: { properties: schema },
        });
        if (createDb.object === 'error') return respond({ step: 'create-db', error: createDb.message }, 500);
        finalDsId = createDb.data_sources?.[0]?.id;
        if (!finalDsId) return respond({ step: 'ds-id', error: 'no data source', createDb }, 500);
      }

      // create missing cards (batched)
      const toCreate = cards.filter(c => !existing[c.sourceId]);
      const batch = toCreate.slice(0, limit);
      const rt = t => t ? [{ text: { content: String(t).slice(0, 1900) } }] : [];
      const results = [];
      for (const c of batch) {
        const props = {
          'Name': { title: [{ text: { content: c.name.slice(0, 1900) } }] },
          'Origin': { select: { name: c.origin } },
          'Source ID': { rich_text: [{ text: { content: c.sourceId } }] },
          'Card description': { rich_text: rt(c.desc) },
        };
        if (c.goal)      props['Food System Goals'] = { select: { name: c.goal } };
        if (c.vc?.length) props['VC Domains'] = { multi_select: c.vc.map(n => ({ name: n })) };
        if (c.pathway)   props['Pathway'] = { select: { name: c.pathway } };
        if (c.scale)     props['Scale'] = { select: { name: c.scale } };
        if (c.status)    props['Status'] = { select: { name: c.status } };
        if (c.timeframe) props['Timeframe'] = { select: { name: c.timeframe } };
        if (c.category)  props['Intervention Category'] = { select: { name: c.category } };
        if (c.affects)   props['Affects'] = { rich_text: rt(c.affects) };
        if (c.boost != null) props['Boost'] = { number: c.boost };
        if (c.costOfInaction) props['Cost of Inaction'] = { rich_text: rt(c.costOfInaction) };
        if (c.precedent) props['Precedent'] = { rich_text: rt(c.precedent) };
        if (c.refs)      props['Refs'] = { rich_text: rt(c.refs) };
        if (c.lead)      props['Lead'] = { rich_text: rt(c.lead) };
        if (c.tactic)    props['Tactic'] = { rich_text: rt(c.tactic) };
        if (c.shift)     props['Measurable Shift'] = { rich_text: rt(c.shift) };
        if (c.intermediate) props['Intermediate Outcome'] = { rich_text: rt(c.intermediate) };
        if (cbDsId && c.outcomeIds?.length) props['Outcome (Camden Metrics)'] = { relation: c.outcomeIds.map(id => ({ id })) };
        if (deDsId && c.domainEls?.length)  props['Domain Elements'] = { relation: c.domainEls.map(id => ({ id })) };

        const r = await notionFetch('/pages', token, 'POST', {
          parent: { type: 'data_source_id', data_source_id: finalDsId }, properties: props,
        });
        results.push({ name: c.name, origin: c.origin, ok: r.object !== 'error', error: r.message });
      }
      const ok = results.filter(r => r.ok).length;
      const byOrigin = cards.reduce((a, c) => { a[c.origin] = (a[c.origin] || 0) + 1; return a; }, {});
      return respond({
        dataSourceId: finalDsId, databaseId: createDb ? createDb.id : '(existing)', url: createDb ? createDb.url : null,
        totalUnified: cards.length, byOrigin, alreadyExisted: finalPages.length,
        createdThisCall: ok, remaining: toCreate.length - batch.length,
        failed: results.filter(r => !r.ok).slice(0, 8),
      });
    }

    // ── POST /trash-final-portfolio ───────────────────────────
    // Trash the whole final DB (page-driven → parent databases).
    if (path === '/trash-final-portfolio' && request.method === 'POST') {
      const pages = await getAllPages(token);
      const fin = pages.filter(p => p.properties?.['Origin'] && p.properties?.['Card description']);
      const dsIds = [...new Set(fin.map(p => p.parent?.data_source_id).filter(Boolean))];
      const dbIds = new Set();
      for (const ds of dsIds) { const d = await notionFetch(`/data_sources/${ds}`, token);
        const dbId = d?.parent?.database_id || d?.database_parent?.database_id || d?.database_id; if (dbId) dbIds.add(dbId); }
      const out = [];
      for (const dbId of dbIds) { let a = await notionFetch(`/databases/${dbId}`, token, 'PATCH', { in_trash: true });
        if (a.object === 'error') a = await notionFetch(`/databases/${dbId}`, token, 'PATCH', { archived: true });
        out.push({ dbId, ok: a.object !== 'error' }); }
      return respond({ finalPages: fin.length, databases: [...dbIds], trashed: out.filter(x => x.ok).length });
    }

    // ── POST /dedup-final-portfolio ───────────────────────────
    // Keep one page per Name in the final DB, trash the rest (batched).
    if (path === '/dedup-final-portfolio' && request.method === 'POST') {
      const limit = (await request.json().catch(() => ({}))).limit || 45;
      const norm  = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const pages = await getAllPages(token);
      const fin = pages.filter(p => p.properties?.['Origin'] && p.properties?.['Card description']);
      const seen = {}; const dupes = [];
      // keep earliest-created per SOURCE ID (unique per card; same-name cards stay distinct)
      fin.sort((a, b) => (a.created_time || '').localeCompare(b.created_time || ''));
      for (const p of fin) { const k = richText(p.properties['Source ID']).trim() || 'nosid:' + p.id; if (seen[k]) dupes.push(p.id); else seen[k] = 1; }
      const batch = dupes.slice(0, limit); const out = [];
      for (const id of batch) {
        let a = await notionFetch(`/pages/${id}`, token, 'PATCH', { in_trash: true });
        if (a.object === 'error') a = await notionFetch(`/pages/${id}`, token, 'PATCH', { archived: true });
        out.push(a.object !== 'error');
      }
      return respond({ finalPages: fin.length, uniqueNames: Object.keys(seen).length,
        duplicates: dupes.length, trashedThisCall: out.filter(Boolean).length, remaining: dupes.length - batch.length });
    }

    // ── POST /normalize-final-cats ────────────────────────────
    // Uppercase every Intervention Category option (by id) and drop unused
    // options (removes leftover 'Preparedness'/'Health'/typos from the dropdown).
    if (path === '/normalize-final-cats' && request.method === 'POST') {
      const pages = await getAllPages(token);
      const fin = pages.filter(p => p.properties?.['Origin'] && p.properties?.['Card description']);
      const dsId = fin[0]?.parent?.data_source_id;
      if (!dsId) return respond({ error: 'no final DS' }, 404);
      const inUse = new Set(fin.map(p => p.properties['Intervention Category']?.select?.name).filter(Boolean));
      const ds = await notionFetch(`/data_sources/${dsId}`, token);
      const opts = ds.properties?.['Intervention Category']?.select?.options || [];
      const kept = opts.filter(o => inUse.has(o.name)).map(o => ({ id: o.id, name: o.name.toUpperCase() }));
      const r = await notionFetch(`/data_sources/${dsId}`, token, 'PATCH',
        { properties: { 'Intervention Category': { select: { options: kept } } } });
      return respond({ dsId, before: opts.map(o => o.name), after: kept.map(o => o.name),
        dropped: opts.filter(o => !inUse.has(o.name)).map(o => o.name), ok: r.object !== 'error', error: r.message });
    }

    // ── POST /patch-final ─────────────────────────────────────
    // Fill Food System Goals / Pathway / VC Domains on final-DB pages.
    // Body: { patches: [{ id, goal?, pathway?, vc? }] } — send ≤40 per call.
    if (path === '/patch-final' && request.method === 'POST') {
      const patches = (await request.json()).patches || [];
      const results = [];
      for (const p of patches.slice(0, 45)) {
        const props = {};
        if (p.goal)     props['Food System Goals'] = { select: { name: p.goal } };
        if (p.pathway)  props['Pathway'] = { select: { name: p.pathway } };
        if (p.vc)       props['VC Domains'] = { multi_select: [{ name: p.vc }] };
        if (p.category) props['Intervention Category'] = { select: { name: p.category } };
        if (p.boost != null) props['Boost'] = { number: p.boost };
        if (p.affects != null) props['Affects'] = { rich_text: p.affects ? [{ text: { content: String(p.affects).slice(0, 1900) } }] : [] };
        if (!Object.keys(props).length) continue;
        const r = await notionFetch(`/pages/${p.id}`, token, 'PATCH', { properties: props });
        results.push({ ok: r.object !== 'error', error: r.message });
      }
      return respond({ patched: results.filter(r => r.ok).length, attempted: results.length,
        failed: results.filter(r => !r.ok).slice(0, 8) });
    }

    // ── POST /rename-origin ───────────────────────────────────
    // Relabel Origin options: New → DML, New + CB → DML + CB (clearer provenance).
    if (path === '/rename-origin' && request.method === 'POST') {
      const pages = await getAllPages(token);
      const fin = pages.filter(p => p.properties?.['Origin'] && p.properties?.['Card description']);
      const dsId = fin[0]?.parent?.data_source_id;
      if (!dsId) return respond({ error: 'no final DS' }, 404);
      const ds = await notionFetch(`/data_sources/${dsId}`, token);
      const opts = ds.properties?.['Origin']?.select?.options || [];
      const RENAME = { 'New': 'DML', 'New + CB': 'DML + CB' };
      const next = opts.map(o => ({ id: o.id, name: RENAME[o.name] || o.name }));
      const r = await notionFetch(`/data_sources/${dsId}`, token, 'PATCH', { properties: { 'Origin': { select: { options: next } } } });
      return respond({ before: opts.map(o => o.name), after: next.map(o => o.name), ok: r.object !== 'error', error: r.message });
    }

    // ── POST /enrich-cb-fields ────────────────────────────────
    // Transfer the Camden delivery fields that were missed (Goals & Successes +
    // quarterly Actions) onto CB final cards, verbatim from their source page.
    if (path === '/enrich-cb-fields' && request.method === 'POST') {
      const limit = (await request.json().catch(() => ({}))).limit || 35;
      const pages = await getAllPages(token);
      const byId = {}; pages.forEach(function (p) { byId[p.id] = p; });
      const fin = pages.filter(p => p.properties?.['Origin'] && p.properties?.['Card description']);
      const dsId = fin[0]?.parent?.data_source_id;
      if (!dsId) return respond({ error: 'no final DS' }, 404);

      const FIELDS = ['Goals & Successes', 'Action Apr–Jun', 'Action Jul–Sep', 'Action Oct–Dec', 'Action Jan–Mar'];
      // 1. ensure the columns exist on the final data source
      const schemaProps = {}; FIELDS.forEach(function (k) { schemaProps[k] = { rich_text: {} }; });
      const sch = await notionFetch(`/data_sources/${dsId}`, token, 'PATCH', { properties: schemaProps });
      if (sch.object === 'error') return respond({ step: 'schema', error: sch.message }, 500);

      // 2. CB cards whose SOURCE has content to transfer that isn't in final yet
      const cb = fin.filter(p => {
        const o = p.properties['Origin']?.select?.name; return o === 'CB' || o === 'New + CB';
      });
      const todo = cb.filter(p => {
        const src = byId[richText(p.properties['Source ID']).trim()]; if (!src) return false;
        const srcHasAny = FIELDS.some(k => richText(src.properties[k]).trim());
        if (!srcHasAny) return false;
        const finalHas = richText(p.properties['Goals & Successes']).trim() || richText(p.properties['Action Apr–Jun']).trim();
        return !finalHas;
      });
      const batch = todo.slice(0, limit);
      const rt = t => t ? [{ text: { content: String(t).slice(0, 1900) } }] : [];
      let ok = 0, copied = 0;
      for (const f of batch) {
        const src = byId[richText(f.properties['Source ID']).trim()]; if (!src) continue;
        const props = {}; let any = false;
        FIELDS.forEach(function (k) { const v = richText(src.properties[k]); if (v) { props[k] = { rich_text: rt(v) }; any = true; } });
        if (!any) continue;
        const r = await notionFetch(`/pages/${f.id}`, token, 'PATCH', { properties: props });
        if (r.object !== 'error') { ok++; copied++; }
      }
      return respond({ cbTotal: cb.length, toTransfer: todo.length, enrichedThisCall: ok, remaining: todo.length - batch.length });
    }

    // ── GET /audit-final ──────────────────────────────────────
    // Verify each final card's content against its SOURCE page (by Source ID).
    // Reports verbatim matches + fields present in source but missing in final.
    if (path === '/audit-final' && request.method === 'GET') {
      const pages = await getAllPages(token);
      const byId = {}; pages.forEach(function (p) { byId[p.id] = p; });
      const fin = pages.filter(p => p.properties?.['Origin'] && p.properties?.['Card description']);
      const nm = s => String(s || '').replace(/\s+/g, ' ').trim();
      const R = { cb: 0, cbSrc: 0, dml: 0, dmlSrc: 0, srcMissing: 0,
        tacticMatch: 0, tacticMiss: 0, interMatch: 0, interMiss: 0, leadMatch: 0, leadMiss: 0,
        goalsSuccessInSrc: 0, goalsSuccessInFinal: 0, actionInSrc: 0, actionInFinal: 0,
        descMatch: 0, descMiss: 0, affectsSrc: 0, affectsFinal: 0 };
      const samples = [];
      for (const f of fin) {
        const sid = richText(f.properties['Source ID']).trim();
        const src = byId[sid];
        const origin = f.properties['Origin']?.select?.name || '';
        if (!src) { R.srcMissing++; continue; }
        const cmp = (fk, sk) => nm(richText(f.properties[fk])) === nm(richText(src.properties[sk]));
        if (origin === 'CB' || origin === 'New + CB') {
          R.cb++; R.cbSrc++;
          (cmp('Tactic', 'Tactic') ? R.tacticMatch++ : R.tacticMiss++);
          (cmp('Intermediate Outcome', 'Intermediate Outcome') ? R.interMatch++ : R.interMiss++);
          (cmp('Lead', 'Lead') ? R.leadMatch++ : R.leadMiss++);
          if (nm(richText(src.properties['Goals & Successes']))) R.goalsSuccessInSrc++;
          if (f.properties['Goals & Successes'] && nm(richText(f.properties['Goals & Successes']))) R.goalsSuccessInFinal++;
          if (nm(richText(src.properties['Action Apr–Jun']))) R.actionInSrc++;
          if (f.properties['Action Apr–Jun'] && nm(richText(f.properties['Action Apr–Jun']))) R.actionInFinal++;
          if (!cmp('Tactic', 'Tactic') && samples.length < 8)
            samples.push({ name: titleText(f.properties.Name), field: 'Tactic',
              final: richText(f.properties['Tactic']).slice(0, 60), src: richText(src.properties['Tactic']).slice(0, 60) });
        } else {
          R.dml++; R.dmlSrc++;
          (cmp('Card description', 'Card description') ? R.descMatch++ : R.descMiss++);
          if (nm(richText(src.properties['Affects']))) R.affectsSrc++;
          if (nm(richText(f.properties['Affects']))) R.affectsFinal++;
          if (!cmp('Card description', 'Card description') && samples.length < 8)
            samples.push({ name: titleText(f.properties.Name), field: 'desc',
              final: richText(f.properties['Card description']).slice(0, 60), src: richText(src.properties['Card description']).slice(0, 60) });
        }
      }
      return respond({ finalTotal: fin.length, summary: R, mismatchSamples: samples });
    }

    // ── GET /final-info ───────────────────────────────────────
    // Locate the final DB: id, url, count (non-destructive).
    if (path === '/final-info' && request.method === 'GET') {
      const pages = await getAllPages(token);
      const fin = pages.filter(p => p.properties?.['Origin'] && p.properties?.['Card description']);
      const dsIds = [...new Set(fin.map(p => p.parent?.data_source_id).filter(Boolean))];
      const out = [];
      for (const ds of dsIds) {
        const d = await notionFetch(`/data_sources/${ds}`, token);
        const dbId = d?.parent?.database_id || d?.database_parent?.database_id || d?.database_id;
        let url = null, title = null;
        if (dbId) { const db = await notionFetch(`/databases/${dbId}`, token); url = db?.url;
          title = (db?.title || []).map(t => t.plain_text).join(''); }
        out.push({ dataSourceId: ds, databaseId: dbId, title, url });
      }
      return respond({ pageCount: fin.length, databases: out });
    }

    // ── GET /portfolio-final ──────────────────────────────────
    // The unified portfolio that feeds the interface: New (DML) + CB (Camden)
    // + New+CB, each with affects/boost (boost cards) and covers (coverage).
    if (path === '/portfolio-final' && request.method === 'GET') {
      const pages = await getAllPages(token);
      const cbById = {};
      for (const p of pages.filter(x => x.properties?.['Indicator_CB'] || x.properties?.['Long-term outcome'])) {
        const okey = Object.keys(p.properties).find(k => /outcome/i.test(k));
        const ikey = Object.keys(p.properties).find(k => /indicator/i.test(k));
        const gkey = Object.keys(p.properties).find(k => /goal/i.test(k));
        const akey = Object.keys(p.properties).find(k => /avail/i.test(k));
        cbById[p.id] = { indicator: ikey ? propValue(p.properties[ikey]) : '', outcome: okey ? propValue(p.properties[okey]) : '',
                         goal: gkey ? propValue(p.properties[gkey]) : '', avail: akey ? propValue(p.properties[akey]) : '' };
      }
      const deById = {};
      for (const p of pages) if (p.properties?.['Domain Element']) { const nm = richText(p.properties['Domain Element']).trim(); if (nm) deById[p.id] = nm; }

      const fin = pages.filter(p => p.properties?.['Origin'] && p.properties?.['Card description']);
      const cards = fin.map(p => ({
        id:            p.id,
        origin:        p.properties['Origin']?.select?.name || '',
        title:         titleText(p.properties.Name),
        desc:          richText(p.properties['Card description']),
        dim:           DIM_MAP[p.properties['Food System Goals']?.select?.name] || 'preparedness',
        goal:          p.properties['Food System Goals']?.select?.name || '',
        wheel_sectors: (p.properties['VC Domains']?.multi_select || []).map(t => t.name),
        pathway:       p.properties['Pathway']?.select?.name || '',
        scale:         p.properties['Scale']?.select?.name || '',
        status:        p.properties['Status']?.select?.name || '',
        timeframe:     p.properties['Timeframe']?.select?.name || '',
        category:      p.properties['Intervention Category']?.select?.name || '',
        boost:         p.properties['Boost']?.number || 0.15,
        affects:       richText(p.properties['Affects']).split('\n').map(s => s.trim()).filter(Boolean),
        covers:        (p.properties['Outcome (Camden Metrics)']?.relation || []).map(r => cbById[r.id]).filter(Boolean),
        domainElements:(p.properties['Domain Elements']?.relation || []).map(r => deById[r.id]).filter(Boolean),
        costOfInaction: richText(p.properties['Cost of Inaction']),
        precedent:     richText(p.properties['Precedent']),
        lead:          richText(p.properties['Lead']),
        tactic:        richText(p.properties['Tactic']),
        shift:         richText(p.properties['Measurable Shift']),
        intermediate:  richText(p.properties['Intermediate Outcome']),
        goalsSuccess:  richText(p.properties['Goals & Successes']),
        actionQ1:      richText(p.properties['Action Apr–Jun']),
        revised:       (function () {
          const k = Object.keys(p.properties).find(kk => /revised/i.test(kk));
          if (!k) return '';
          const pr = p.properties[k];
          if (pr.select) return pr.select.name || '';
          if (typeof pr.checkbox === 'boolean') return pr.checkbox ? 'Yes' : 'No';
          return richText(pr) || '';
        })(),
      })).filter(c => c.title);
      return respond(cards);
    }

    // ── POST /reset-action-plan ───────────────────────────────
    // Trash every database titled "Food Mission Action Plan…" (clears the
    // duplicates in one shot — trashing a database removes all its rows).
    if (path === '/reset-action-plan' && request.method === 'POST') {
      // Page-driven: find action-plan pages, resolve their parent data sources
      // → parent databases, and trash those databases (removes all their rows).
      const pages = await getAllPages(token);
      const ap = pages.filter(p =>
        p.properties?.['Measurable Shift'] && p.properties?.['Tactic'] &&
        p.properties?.['Intermediate Outcome'] && p.properties?.['Project']);
      const dsIds = [...new Set(ap.map(p => p.parent?.data_source_id).filter(Boolean))];
      const dbIds = new Set();
      for (const ds of dsIds) {
        const d = await notionFetch(`/data_sources/${ds}`, token);
        const dbId = d?.parent?.database_id || d?.database_parent?.database_id || d?.database_id;
        if (dbId) dbIds.add(dbId);
      }
      const out = [];
      for (const dbId of dbIds) {
        let a = await notionFetch(`/databases/${dbId}`, token, 'PATCH', { in_trash: true });
        if (a.object === 'error')
          a = await notionFetch(`/databases/${dbId}`, token, 'PATCH', { archived: true });
        out.push({ dbId, ok: a.object !== 'error', error: a.message });
      }
      return respond({ apPages: ap.length, dataSources: dsIds, databases: [...dbIds],
                       trashed: out.filter(x => x.ok).length, results: out });
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
