// Run with: node sync-portfolio.js
// Sends all 20 portfolio cards to the Worker's /portfolio-sync endpoint.
// The Worker patches the Notion schema and upserts each card.

const fs   = require('fs');
const path = require('path');

const WORKER = 'https://camden-notion-proxy.aleks-208.workers.dev/portfolio-sync';
const DATA   = path.join('C:', 'Users', 'nowak', 'Downloads', 'camden_portfolio_mapped.json');

// Cost / avoided-cost figures (£) by lowercased title — illustrative placeholders
// (to be replaced with research; matches the front-end simulator defaults).
const COST = {
  'camden food hub':[3500000,6200000],
  'school food procurement redesign':[400000,4800000],
  'cooperation town at scale':[750000,2100000],
  'camden food defence council':[250000,1400000],
  'rebuild rural-to-urban food trade':[900000,3600000],
  'supply chain mapping + risk register':[120000,900000],
  'green belt food growing coordination':[600000,1200000],
  'processing + cold storage capacity':[1800000,3100000],
  'municipal healthcare bond':[500000,12000000],
  'ubni / food credit rail':[2000000,5400000],
  's106 / cil redirection':[0,2000000],
  'nhs preventive food investment':[1200000,8000000],
  'food bank → food pantry transition':[300000,1100000],
  'mass catering + emergency distribution plan':[650000,2400000],
  'de-risking farm transitions':[1500000,2800000],
  'cross-borough procurement':[350000,3200000],
  'food as welfare integration':[1000000,4000000],
  'cost of inaction accounting':[80000,600000],
  'camden local food resilience committee':[200000,1300000],
  'connect with other councils':[60000,500000]
};

async function main() {
  const raw   = fs.readFileSync(DATA, 'utf8');
  const json  = JSON.parse(raw);
  const cards = json.cards.map(c => {
    const d = COST[(c.title || '').toLowerCase().trim()];
    return d ? { ...c, cost: d[0], avoided: d[1] } : c;
  });

  console.log(`Syncing ${cards.length} portfolio cards to Notion…\n`);

  const res  = await fetch(WORKER, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ cards }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Worker error:', data);
    process.exit(1);
  }

  console.log(`✓ ${data.ok} / ${data.total} cards synced successfully\n`);

  if (data.failed?.length) {
    console.warn('Failed:');
    data.failed.forEach(f => console.warn('  •', f.title, '—', f.error));
  }

  if (data.results) {
    data.results.forEach(r => {
      const icon = r.ok ? '✓' : '✗';
      console.log(`  ${icon} [${r.action}] ${r.title}`);
    });
  }
}

main().catch(e => { console.error(e); process.exit(1); });
