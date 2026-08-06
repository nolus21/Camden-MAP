// Camden Food Portfolio — Cards
// Builds front/back cards programmatically from the unified final database.
// Colour-coded by pathway · six tables (New + CB per pathway) · Lora + DM Sans.
// No wrapped auto-layout (older Figma seals those props) — grids are positioned manually.

figma.showUI(__html__, { width: 380, height: 520, title: 'Camden Food Portfolio' });

// ── Design system ───────────────────────────────────────────────
var PW = {
  I:   { name: 'Beyond Crisis',  sub: 'Universal Nutrition Infrastructure', accent: '#B07D2B', accent2: '#8C6114', headA: '#F3E8CE', headB: '#E7D4A4', ink: '#5A3F14' },
  II:  { name: 'Beyond Camden',  sub: 'Regional Food Sovereignty',          accent: '#4F8A5B', accent2: '#37653F', headA: '#DFECDA', headB: '#C3DCBC', ink: '#274A2E' },
  III: { name: 'Beyond Health',  sub: 'From Behaviour to Resilience',        accent: '#7C5DA6', accent2: '#5C4080', headA: '#E8DFF3', headB: '#D2C1E7', ink: '#3C2A57' }
};
var ORIGIN = {
  'DML':      { bg: '#26331F', fg: '#E9F0DE', label: 'DML' },
  'New':      { bg: '#26331F', fg: '#E9F0DE', label: 'DML' },
  'CB':       { bg: '#5E4A2A', fg: '#F1E7D5', label: 'CB' },
  'DML + CB': { bg: '#3A4A55', fg: '#E4EEF4', label: 'DML + CB' },
  'New + CB': { bg: '#3A4A55', fg: '#E4EEF4', label: 'DML + CB' }
};
function statusShort(s) {
  s = (s || '').toLowerCase();
  if (s.indexOf('active') >= 0) return ['ONGOING', '#3E7A48'];
  if (s.indexOf('priority') >= 0) return ['PRIORITY', '#B07D2B'];
  if (s.indexOf('backburner') >= 0) return ['BACKBURNER', '#8A8A78'];
  if (s.indexOf('ended') >= 0 || s.indexOf('closed') >= 0) return ['ENDED', '#9A5A5A'];
  return [s ? s.toUpperCase() : '', '#8A8A78'];
}
var SECTOR = { A: 'A · Inputs', B: 'B · Production', C: 'C · Processing & distribution', D: 'D · Consumption' };
var DIMS = [
  ['preparedness', 'Preparedness'], ['environment', 'Environment'], ['health', 'Health'],
  ['equality', 'Equality & Fairness'], ['economic', 'Economic Vitality']
];
var GOAL2DIM = {
  'Economic Vitality': 'economic', 'Environment': 'environment', 'Health': 'health',
  'Equity and Fairness': 'equality', 'Preparedness and resilience': 'preparedness'
};
var INK = '#20241C', MUTE = '#6C7060', LINE = '#E4E2D8', CARD_W = 180, CARD_H = 252, PAIR_GAP = 10, COL_GAP = 20, ROW_GAP = 20;

// ── helpers ─────────────────────────────────────────────────────
function hx(h) { h = h.replace('#', ''); return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255 }; }
function solid(h, a) { return { type: 'SOLID', color: hx(h), opacity: a == null ? 1 : a }; }
function grad(h1, h2) {
  var c1 = hx(h1), c2 = hx(h2);
  return { type: 'GRADIENT_LINEAR', gradientTransform: [[1, 0, 0], [0, 1, 0]],
    gradientStops: [{ position: 0, color: { r: c1.r, g: c1.g, b: c1.b, a: 1 } }, { position: 1, color: { r: c2.r, g: c2.g, b: c2.b, a: 1 } }] };
}
function hexTint(hex, a) {
  var c = hx(hex), r = Math.round((c.r * a + (1 - a)) * 255), g = Math.round((c.g * a + (1 - a)) * 255), b = Math.round((c.b * a + (1 - a)) * 255);
  return '#' + [r, g, b].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
}
function T(chars, fam, sty, size, hex, o) {
  o = o || {};
  var t = figma.createText();
  t.fontName = { family: fam, style: sty };
  t.characters = String(chars == null ? '' : chars);
  t.fontSize = size;
  t.fills = [solid(hex, o.op)];
  if (o.ls != null) t.letterSpacing = { value: o.ls, unit: 'PIXELS' };
  if (o.lh != null) t.lineHeight = { value: o.lh, unit: 'PIXELS' };
  if (o.align) t.textAlignHorizontal = o.align;
  if (o.w != null) { t.textAutoResize = 'HEIGHT'; t.resize(o.w, t.height); }
  else t.textAutoResize = 'WIDTH_AND_HEIGHT';
  return t;
}
function stretch(node) { node.layoutAlign = 'STRETCH'; return node; }
function autoV(spacing) {
  var f = figma.createFrame();
  f.layoutMode = 'VERTICAL'; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO';
  f.itemSpacing = spacing || 0; f.fills = [];
  return f;
}
function autoH(spacing) {
  var f = figma.createFrame();
  f.layoutMode = 'HORIZONTAL'; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO';
  f.counterAxisAlignItems = 'CENTER'; f.itemSpacing = spacing || 0; f.fills = [];
  return f;
}
function fixedWH(f, w, h) { f.primaryAxisSizingMode = 'FIXED'; f.counterAxisSizingMode = 'FIXED'; f.resize(w, h); return f; }
function pill(label, bg, fg, weight) {
  var f = autoH(0);
  f.paddingLeft = 6; f.paddingRight = 6; f.paddingTop = 2; f.paddingBottom = 2;
  f.cornerRadius = 10; f.fills = [solid(bg)];
  f.appendChild(T(label, 'DM Sans', weight || 'Medium', 7, fg, { ls: 0.1 }));
  return f;
}
function divider() { var f = figma.createFrame(); f.resize(CARD_W - 20, 1); f.fills = [solid(LINE)]; f.layoutAlign = 'STRETCH'; return f; }
function dotsRow(n, accent) {
  var f = autoH(3);
  for (var i = 0; i < 5; i++) { var e = figma.createEllipse(); e.resize(5, 5); e.fills = [i < n ? solid(accent) : solid('#D6D6CC')]; f.appendChild(e); }
  return f;
}
function spaceRow() { var r = autoH(0); r.primaryAxisSizingMode = 'FIXED'; r.primaryAxisAlignItems = 'SPACE_BETWEEN'; r.layoutAlign = 'STRETCH'; return r; }

// ── data helpers ────────────────────────────────────────────────
function pwKey(card) { var m = String(card.pathway || '').trim().match(/^(III|II|I)\b/); return m ? m[1] : 'I'; }
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function goalProfile(card) {
  var c = { preparedness: 0, environment: 0, health: 0, equality: 0, economic: 0 };
  (card.affects || []).forEach(function (a) { var d = a.split(':')[0]; if (c[d] != null) c[d]++; });
  (card.covers || []).forEach(function (cc) { var d = GOAL2DIM[cc.goal]; if (c[d] != null) c[d]++; });
  var max = 0; DIMS.forEach(function (d) { if (c[d[0]] > max) max = c[d[0]]; });
  var out = {}; DIMS.forEach(function (d) { out[d[0]] = c[d[0]] === 0 ? 0 : Math.max(1, Math.round(c[d[0]] / max * 5)); });
  return out;
}

// ── card builders ───────────────────────────────────────────────
function buildFront(card) {
  var pw = PW[pwKey(card)], primDim = GOAL2DIM[card.goal], prof = goalProfile(card);
  var root = autoV(0); root.name = (card.title || 'Card') + ' — Front';
  fixedWH(root, CARD_W, CARD_H); root.cornerRadius = 0; root.clipsContent = true;
  root.fills = [solid('#FFFFFF')]; root.strokes = [solid(pw.accent, 0.35)]; root.strokeWeight = 1;

  var head = autoV(2);
  head.paddingLeft = 10; head.paddingRight = 10; head.paddingTop = 8; head.paddingBottom = 8;
  head.fills = [grad(pw.headA, pw.headB)]; head.layoutAlign = 'STRETCH';
  var eb = spaceRow();
  eb.appendChild(T('PATHWAY ' + pwKey(card), 'DM Sans', 'Bold', 7, pw.ink, { ls: 0.8, op: 0.65 }));
  var og = ORIGIN[card.origin] || ORIGIN['New'];
  eb.appendChild(pill(og.label, og.bg, og.fg, 'Bold'));
  head.appendChild(eb);
  head.appendChild(T(pw.name, 'DM Sans', 'Bold', 10, pw.accent2));
  head.appendChild(stretch(T(pw.sub, 'DM Sans', 'Regular', 6.5, pw.ink, { op: 0.72, lh: 8.5, w: CARD_W - 20 })));
  root.appendChild(head);

  var body = autoV(5);
  body.paddingLeft = 10; body.paddingRight = 10; body.paddingTop = 8; body.paddingBottom = 8; body.layoutAlign = 'STRETCH';
  body.appendChild(stretch(T(card.title || '(untitled)', 'Lora', 'Bold', 12.5, INK, { lh: 15.5, w: CARD_W - 20 })));

  var pillBox = autoV(4); pillBox.layoutAlign = 'STRETCH';
  var r1 = autoH(4); (card.wheel_sectors || []).forEach(function (s) { r1.appendChild(pill(SECTOR[s] || s, hexTint(pw.accent, 0.12), pw.accent2, 'Medium')); });
  if (r1.children.length) pillBox.appendChild(r1);
  var r2 = autoH(4);
  if (card.scale) r2.appendChild(pill(cap(card.scale), '#EDECE4', '#4A4E42', 'Medium'));
  if (card.category) r2.appendChild(pill(card.category, '#EDECE4', '#4A4E42', 'Medium'));
  if (r2.children.length) pillBox.appendChild(r2);
  var ss = statusShort(card.status);
  if (ss[0]) { var r3 = autoH(4); r3.appendChild(pill(ss[0], ss[1], '#FFFFFF', 'Bold')); pillBox.appendChild(r3); }
  if (pillBox.children.length) body.appendChild(pillBox);

  body.appendChild(divider());
  body.appendChild(T('GOALS', 'DM Sans', 'Bold', 6.5, MUTE, { ls: 1.2 }));
  var goals = autoV(3); goals.layoutAlign = 'STRETCH';
  DIMS.forEach(function (d) {
    var row = spaceRow(); var isPrim = d[0] === primDim;
    row.appendChild(T(d[1], 'DM Sans', isPrim ? 'Bold' : 'Regular', 7.5, isPrim ? pw.accent2 : INK, { op: isPrim ? 1 : 0.82 }));
    row.appendChild(dotsRow(prof[d[0]], pw.accent));
    goals.appendChild(row);
  });
  body.appendChild(goals);

  var conn = card.origin === 'CB'
    ? (card.covers && card.covers.length ? card.covers.length + ' Camden metrics' : 'cross-cutting')
    : ((card.affects && card.affects.length ? card.affects.length : 0) + ' indicators');
  body.appendChild(T('◇ ' + conn, 'DM Sans', 'Medium', 6.5, pw.accent2, { op: 0.85 }));

  root.appendChild(body);
  return root;
}

function fieldBlock(label, text, max) {
  var t = (text || '').trim(); if (!t) return null;
  if (t.length > max) t = t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
  var f = autoV(1); f.layoutAlign = 'STRETCH';
  f.appendChild(T(label, 'DM Sans', 'Bold', 6, MUTE, { ls: 0.8 }));
  f.appendChild(stretch(T(t, 'DM Sans', 'Regular', 7, '#43473C', { lh: 9.5, w: CARD_W - 22 })));
  return f;
}
function buildBack(card) {
  var pw = PW[pwKey(card)], isCB = card.origin === 'CB';
  var root = autoV(0); root.name = (card.title || 'Card') + ' — Back';
  fixedWH(root, CARD_W, CARD_H); root.cornerRadius = 0; root.clipsContent = true;
  root.fills = [solid('#FBFAF6')]; root.strokes = [solid(pw.accent, 0.3)]; root.strokeWeight = 1; root.dashPattern = [4, 4];

  var bar = figma.createFrame(); bar.resize(CARD_W, 4); bar.fills = [solid(pw.accent)]; bar.layoutAlign = 'STRETCH';
  root.appendChild(bar);
  var body = autoV(5);
  body.paddingLeft = 11; body.paddingRight = 11; body.paddingTop = 10; body.paddingBottom = 10; body.layoutAlign = 'STRETCH';
  body.appendChild(stretch(T(card.title || '(untitled)', 'Lora', 'Bold', 10.5, INK, { lh: 13.5, w: CARD_W - 22 })));
  body.appendChild(divider());

  if (isCB) {
    // Camden delivery back: the actual action-plan fields (verbatim)
    var blocks = [
      ['GOALS & SUCCESS', card.goalsSuccess, 130],
      ['TACTIC', card.tactic, 105],
      ['ACTION · APR–JUN', card.actionQ1, 95],
      ['INTERMEDIATE OUTCOME', card.intermediate, 95]
    ];
    var shown = 0;
    for (var i = 0; i < blocks.length; i++) { var n = fieldBlock(blocks[i][0], blocks[i][1], blocks[i][2]); if (n) { body.appendChild(n); shown++; } }
    if (!shown) body.appendChild(stretch(T((card.desc || 'No delivery detail.'), 'DM Sans', 'Regular', 7, '#43473C', { lh: 10.5, w: CARD_W - 22 })));
    if (card.lead) body.appendChild(T('Responsible · ' + card.lead, 'DM Sans', 'Medium', 6.5, MUTE));
  } else {
    // DML strategic back: the description
    var desc = (card.desc || '').trim();
    if (desc.length > 560) desc = desc.slice(0, 557).replace(/\s+\S*$/, '') + '…';
    body.appendChild(stretch(T(desc || 'No description.', 'DM Sans', 'Regular', 7, '#43473C', { lh: 10.5, w: CARD_W - 22, op: desc ? 1 : 0.5 })));
    if (card.lead) body.appendChild(T('Lead · ' + card.lead, 'DM Sans', 'Medium', 6.5, MUTE));
  }
  root.appendChild(body);
  return root;
}

// ── layout ──────────────────────────────────────────────────────
async function loadFonts() {
  var fonts = [['Lora', 'Bold'], ['Lora', 'Regular'], ['DM Sans', 'Regular'], ['DM Sans', 'Medium'], ['DM Sans', 'Bold']];
  for (var i = 0; i < fonts.length; i++) {
    try { await figma.loadFontAsync({ family: fonts[i][0], style: fonts[i][1] }); }
    catch (e) { figma.ui.postMessage({ type: 'error', text: 'Missing font ' + fonts[i][0] + ' ' + fonts[i][1] + ' — enable it in this file and retry.' }); return false; }
  }
  return true;
}

async function build(cards) {
  figma.ui.postMessage({ type: 'progress', text: 'Loading fonts…' });
  if (!(await loadFonts())) return;

  var page = figma.root.children.filter(function (p) { return p.name === 'Portfolio Cards'; })[0];
  if (!page) { page = figma.createPage(); page.name = 'Portfolio Cards'; }
  figma.currentPage = page;

  var root = autoV(60);
  root.name = 'Camden Food Portfolio — Cards';
  root.paddingLeft = root.paddingRight = root.paddingTop = root.paddingBottom = 60;
  root.fills = [solid('#F7F6F1')];
  page.appendChild(root);

  var order = ['I', 'II', 'III'], made = 0, PAIR_W = CARD_W * 2 + PAIR_GAP, colW = PAIR_W + COL_GAP;
  for (var o = 0; o < order.length; o++) {
    var pk = order[o];
    var inPw = cards.filter(function (c) { return pwKey(c) === pk; });
    if (!inPw.length) continue;
    var pw = PW[pk];

    var section = autoV(26); section.name = 'Pathway ' + pk; root.appendChild(section);
    var bar = autoV(2);
    bar.paddingLeft = 30; bar.paddingRight = 30; bar.paddingTop = 22; bar.paddingBottom = 22; bar.cornerRadius = 14;
    bar.fills = [grad(pw.accent2, pw.accent)]; bar.layoutAlign = 'STRETCH';
    bar.appendChild(T('PATHWAY ' + pk, 'DM Sans', 'Bold', 12, '#FFFFFF', { ls: 2.4, op: 0.9 }));
    bar.appendChild(T(pw.name, 'Lora', 'Bold', 30, '#FFFFFF'));
    bar.appendChild(T(pw.sub, 'DM Sans', 'Regular', 13, '#FFFFFF', { op: 0.92 }));
    section.appendChild(bar);

    var groups = [
      { label: 'DML — Strategic interventions', test: function (c) { return c.origin.indexOf('DML') >= 0 || c.origin.indexOf('New') >= 0; } },
      { label: 'Camden delivery', test: function (c) { return c.origin === 'CB'; } }
    ];
    for (var g = 0; g < groups.length; g++) {
      var items = inPw.filter(groups[g].test);
      if (!items.length) continue;
      var table = autoV(16); section.appendChild(table);
      table.appendChild(T(groups[g].label + '  ·  ' + items.length, 'DM Sans', 'Bold', 15, pw.ink));

      // manual grid (no wrapped auto-layout)
      var grid = figma.createFrame(); grid.name = 'grid'; grid.fills = []; grid.clipsContent = false; table.appendChild(grid);
      var x = 0, y = 0, rowH = 0, maxRight = 0, cols = 2;
      for (var k = 0; k < items.length; k++) {
        made++;
        figma.ui.postMessage({ type: 'progress', text: 'Building ' + made + ' / ' + cards.length + ': ' + (items[k].title || '').slice(0, 38) });
        var pair = autoH(PAIR_GAP); pair.name = (items[k].title || 'Card');
        pair.setPluginData('camdenCard', '1');
        pair.setPluginData('cardId', String(items[k].id || items[k].title || ''));
        try {
          pair.appendChild(buildFront(items[k]));
          pair.appendChild(buildBack(items[k]));
        } catch (ce) {
          figma.ui.postMessage({ type: 'error', text: 'Card "' + (items[k].title || '') + '": ' + (ce && ce.message) + '\n' + (ce && ce.stack ? String(ce.stack).split('\n').slice(0, 3).join(' | ') : '') });
          return;
        }
        grid.appendChild(pair);
        var col = k % cols;
        if (col === 0 && k > 0) { y += rowH + ROW_GAP; rowH = 0; }
        pair.x = col * colW; pair.y = y;
        if (pair.height > rowH) rowH = pair.height;
        if (col * colW + pair.width > maxRight) maxRight = col * colW + pair.width;
      }
      grid.resize(Math.max(maxRight, 10), y + rowH);
    }
  }

  var ts = Date.now();
  figma.root.setPluginData('camdenLastUpdated', String(ts));
  figma.currentPage.selection = [root];
  figma.viewport.scrollAndZoomIntoView([root]);
  figma.ui.postMessage({ type: 'done', text: 'Done — ' + made + ' cards on the “Portfolio Cards” page.', ts: ts });
}

// ── update cards already on canvas, in place ────────────────────
async function updateOnCanvas(cards) {
  figma.ui.postMessage({ type: 'progress', text: 'Loading fonts…' });
  if (!(await loadFonts())) return;
  var page = figma.root.children.filter(function (p) { return p.name === 'Portfolio Cards'; })[0];
  if (!page) { figma.ui.postMessage({ type: 'error', text: 'No “Portfolio Cards” page yet — generate the portfolio first.' }); return; }
  figma.currentPage = page;

  var byId = {}, byTitle = {};
  cards.forEach(function (c) { if (c.id) byId[c.id] = c; if (c.title) byTitle[c.title] = c; });

  // tagged pairs, plus a fallback for older cards that predate tagging (matched by a "— Front" child)
  var pairs = page.findAll(function (n) {
    if (n.type !== 'FRAME') return false;
    if (n.getPluginData('camdenCard') === '1') return true;
    return !!(n.children && n.children[0] && /— Front$/.test(n.children[0].name || ''));
  });

  var updated = 0, missed = 0;
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i];
    var id = pair.getPluginData('cardId');
    var frontName = pair.children[0] ? (pair.children[0].name || '').replace(/ — Front$/, '') : '';
    var card = (id && byId[id]) || byTitle[pair.name] || byTitle[frontName];
    if (!card) { missed++; continue; }
    figma.ui.postMessage({ type: 'progress', text: 'Updating ' + (updated + 1) + ': ' + (card.title || '').slice(0, 36) });
    try {
      var front = buildFront(card), back = buildBack(card);
      while (pair.children.length) pair.children[0].remove();
      pair.appendChild(front); pair.appendChild(back);
      pair.name = card.title || pair.name;
      pair.setPluginData('camdenCard', '1');
      pair.setPluginData('cardId', String(card.id || card.title || ''));
      updated++;
    } catch (ce) {
      figma.ui.postMessage({ type: 'error', text: 'Update "' + (card.title || '') + '": ' + (ce && ce.message) }); return;
    }
  }
  var ts2 = Date.now();
  figma.root.setPluginData('camdenLastUpdated', String(ts2));
  figma.ui.postMessage({ type: 'updated', text: 'Refreshed ' + updated + ' card' + (updated === 1 ? '' : 's') + (missed ? ' · ' + missed + ' not matched (regenerate to tag them)' : '') + '.', ts: ts2, count: updated });
}

figma.ui.onmessage = function (msg) {
  if (msg.type === 'sync') {
    build(msg.cards).catch(function (e) {
      figma.ui.postMessage({ type: 'error', text: 'Error: ' + (e && e.message ? e.message : String(e)) + (e && e.stack ? '\n' + String(e.stack).split('\n').slice(0, 3).join(' | ') : '') });
    });
  } else if (msg.type === 'update') {
    updateOnCanvas(msg.cards).catch(function (e) {
      figma.ui.postMessage({ type: 'error', text: 'Update error: ' + (e && e.message ? e.message : String(e)) });
    });
  } else if (msg.type === 'ready') {
    var lu = figma.root.getPluginData('camdenLastUpdated');
    figma.ui.postMessage({ type: 'meta', ts: lu ? +lu : 0 });
  }
};
