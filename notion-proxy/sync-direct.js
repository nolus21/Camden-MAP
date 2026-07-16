// Direct Notion sync — bypasses the Worker.
// Run as: $env:NOTION_TOKEN="ntn_..."; node sync-direct.js

const fs      = require('fs');
const path    = require('path');

const TOKEN   = process.env.NOTION_TOKEN;
const DB_ID   = '392190f3-47a2-80f4-af05-c980725d7cad'; // confirmed from debug endpoint
const VERSION = '2025-09-03';
const DATA    = path.join('C:', 'Users', 'nowak', 'Downloads', 'camden_portfolio_mapped.json');

if (!TOKEN) {
  console.error('Set NOTION_TOKEN env variable first.');
  process.exit(1);
}

async function notion(method, endpoint, body) {
  const res = await fetch(`https://api.notion.com/v1${endpoint}`, {
    method,
    headers: {
      'Authorization':  `Bearer ${TOKEN}`,
      'Notion-Version': VERSION,
      'Content-Type':   'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

const DIM_TO_NOTION = {
  economic:     'Economic Vitality',
  environment:  'Environment',
  equality:     'Equity and Fairness',
  health:       'Health',
  preparedness: 'Preparedness and resilience',
};

function buildProps(card) {
  const p = {};
  if (card.title)
    p['Name'] = { title: [{ text: { content: card.title } }] };
  if (card.desc)
    p['Card description'] = { rich_text: [{ text: { content: card.desc.slice(0, 2000) } }] };
  if (card.dim && DIM_TO_NOTION[card.dim])
    p['Food System Goals'] = { select: { name: DIM_TO_NOTION[card.dim] } };
  if (card.timeframe)
    p['Timeframe'] = { select: { name: card.timeframe } };
  if (card.boost != null)
    p['Boost'] = { number: card.boost };
  if (card.category)
    p['Multi-select'] = { select: { name: card.category } };
  if (card.tags?.length)
    p['Tags'] = { multi_select: card.tags.map(t => ({ name: t })) };
  if (card.affects?.length)
    p['Affects'] = { multi_select: card.affects.map(a => ({ name: a })) };
  if (card.pathway)
    p['Pathway'] = { select: { name: card.pathway } };
  if (card.pathway_name)
    p['Pathway Name'] = { rich_text: [{ text: { content: card.pathway_name } }] };
  if (card.scale)
    p['Scale'] = { select: { name: card.scale } };
  if (card.wheel_sectors?.length)
    p['Wheel Sectors'] = { multi_select: card.wheel_sectors.map(s => ({ name: s })) };
  if (card.wheel_subcategories?.length)
    p['Wheel Subcategories'] = { multi_select: card.wheel_subcategories.map(s => ({ name: s })) };
  if (card.lang_refs)
    p['Lang Refs'] = { rich_text: [{ text: { content: card.lang_refs } }] };
  if (card.precedent)
    p['Precedent'] = { rich_text: [{ text: { content: card.precedent } }] };
  if (card.cost_of_inaction)
    p['Cost of Inaction'] = { rich_text: [{ text: { content: card.cost_of_inaction } }] };
  if (card.status)
    p['Status'] = { select: { name: card.status } };
  return p;
}

async function main() {
  const cards = JSON.parse(fs.readFileSync(DATA, 'utf8')).cards;
  console.log(`\n── Step 1: Patch database schema (${DB_ID})\n`);

  const schemaRes = await notion('PATCH', `/databases/${DB_ID}`, {
    properties: {
      'Food System Goals':   { select: {} },
      'Timeframe':           { select: {} },
      'Boost':               { number: {} },
      'Tags':                { multi_select: {} },
      'Affects':             { multi_select: {} },
      'Pathway':             { select: {} },
      'Pathway Name':        { rich_text: {} },
      'Scale':               { select: {} },
      'Wheel Sectors':       { multi_select: {} },
      'Wheel Subcategories': { multi_select: {} },
      'Lang Refs':           { rich_text: {} },
      'Precedent':           { rich_text: {} },
      'Cost of Inaction':    { rich_text: {} },
      'Status':              { select: {} },
    },
  });

  if (schemaRes.object === 'error') {
    console.error('Schema patch failed:', schemaRes.message);
    process.exit(1);
  }
  const finalFields = Object.keys(schemaRes.properties || {});
  console.log('Schema OK. Properties:', finalFields.join(', '));

  console.log('\n── Step 2: Load existing pages for title matching\n');

  // Query the database directly (more reliable than /search)
  let existingPages = [];
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const r = await notion('POST', `/databases/${DB_ID}/query`, body);
    if (r.results) existingPages.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);

  const byTitle = {};
  for (const p of existingPages) {
    const t = (p.properties?.Name?.title || []).map(x => x.plain_text).join('').toLowerCase().trim();
    if (t) byTitle[t] = p.id;
  }
  console.log(`Found ${existingPages.length} existing pages.`);

  console.log('\n── Step 3: Upsert cards\n');

  let ok = 0, fail = 0;
  for (const card of cards) {
    const key   = (card.title || '').toLowerCase().trim();
    const props = buildProps(card);

    let r;
    if (byTitle[key]) {
      r = await notion('PATCH', `/pages/${byTitle[key]}`, { properties: props });
      const icon = r.object === 'error' ? '✗' : '✓';
      console.log(`${icon} [update] ${card.title}${r.object === 'error' ? ' — ' + r.message : ''}`);
    } else {
      r = await notion('POST', '/pages', { parent: { database_id: DB_ID }, properties: props });
      const icon = r.object === 'error' ? '✗' : '✓';
      console.log(`${icon} [create] ${card.title}${r.object === 'error' ? ' — ' + r.message : ''}`);
    }

    r.object === 'error' ? fail++ : ok++;
  }

  console.log(`\n── Done: ${ok} succeeded, ${fail} failed\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
