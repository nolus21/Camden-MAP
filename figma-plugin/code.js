// Camden Cards — Notion Sync
// Figma plugin main thread

figma.showUI(__html__, { width: 320, height: 200, title: 'Camden Cards' });

// Template node IDs (from the Figma file)
var FRONT_ID = '201:854';
var BACK_ID  = '201:899';

// Card dimensions in px (63.5 × 88.9 mm at 96dpi ≈ 240 × 336)
// We read actual size from the template so this is just for fallback grid spacing
var CARD_GAP = 24;

// Pathway full names, split across the template's two lines
var PATHWAY_FULL = {
  'I':   ['Beyond Crisis -', '- Universal Nutrition Infrastructure'],
  'II':  ['Beyond Camden -', '- Regional Food Sovereignty'],
  'III': ['Beyond Price -',  '- New Food Economics']
};

// Sector letter → full label (matches the wheel's sector names)
var SECTOR_FULL = {
  'A': 'A. Inputs to food production',
  'B': 'B. Agricultural and food production practices',
  'C': 'C. Processing and distribution chains',
  'D': 'D. Consumption and dietary patterns'
};

// Normalise pathway values — legacy cards use "A - BEYOND CRISIS: ...", new use "I"
function normalizePathway(p) {
  if (!p) return '';
  var s = String(p).toUpperCase();
  if (s === 'I' || s === 'II' || s === 'III') return s;
  if (/CRISIS/.test(s)) return 'I';
  if (/CAMDEN/.test(s)) return 'II';
  if (/PRICE/.test(s))  return 'III';
  if (/^A\b/.test(s))   return 'I';
  if (/^B\b/.test(s))   return 'II';
  if (/^C\b/.test(s))   return 'III';
  return s;
}

function firstPathway(card) {
  var p = Array.isArray(card.pathway) ? card.pathway[0] : card.pathway;
  return normalizePathway(p);
}

// Collect all fonts used in a frame so we can load them before editing text
function collectFonts(node, set) {
  if (node.type === 'TEXT') {
    for (var i = 0; i < node.getRangeFontName(0, node.characters.length === 0 ? 0 : node.characters.length).length; i++) {
      // simplification: load the top-level fontName
    }
    var fn = node.fontName;
    if (fn && fn !== figma.mixed) {
      set.add(JSON.stringify(fn));
    } else if (fn === figma.mixed) {
      // load each segment
      var len = node.characters.length;
      for (var j = 0; j < len; j++) {
        var sf = node.getRangeFontName(j, j + 1);
        if (sf !== figma.mixed) set.add(JSON.stringify(sf));
      }
    }
  }
  if ('children' in node) {
    node.children.forEach(function(ch) { collectFonts(ch, set); });
  }
}

// Find all text nodes in a subtree matching a predicate
function findTexts(node, pred, results) {
  results = results || [];
  if (node.type === 'TEXT' && pred(node.characters)) results.push(node);
  if ('children' in node) node.children.forEach(function(ch) { findTexts(ch, pred, results); });
  return results;
}

// Safe setText — loads fonts, sets characters
async function setText(node, value) {
  if (!value) return;
  var fn = node.fontName;
  if (fn === figma.mixed) {
    var len = node.characters.length || 1;
    var fonts = new Set();
    for (var i = 0; i < len; i++) {
      var sf = node.getRangeFontName(i, i + 1);
      if (sf !== figma.mixed) fonts.add(JSON.stringify(sf));
    }
    for (var fs of fonts) await figma.loadFontAsync(JSON.parse(fs));
  } else if (fn) {
    await figma.loadFontAsync(fn);
  }
  node.characters = value;
}

async function syncCards(cards) {
  // Find templates
  var frontTpl = figma.getNodeById(FRONT_ID);
  var backTpl  = figma.getNodeById(BACK_ID);

  if (!frontTpl) { figma.ui.postMessage({ type: 'error', text: 'Front card template not found (ID ' + FRONT_ID + '). Make sure you have the Camden Figma file open.' }); return; }
  if (!backTpl)  { figma.ui.postMessage({ type: 'error', text: 'Back card template not found (ID ' + BACK_ID + ').' }); return; }

  // Pre-load all fonts from templates
  figma.ui.postMessage({ type: 'progress', text: 'Loading fonts…' });
  var fontSet = new Set();
  collectFonts(frontTpl, fontSet);
  collectFonts(backTpl, fontSet);
  for (var fs of fontSet) {
    try { await figma.loadFontAsync(JSON.parse(fs)); } catch(e) {}
  }

  var cardW = frontTpl.width  || 240;
  var cardH = frontTpl.height || 336;
  var cols  = 4; // front/back pairs per row

  // Create a parent frame to hold all cards
  var container = figma.createFrame();
  container.name = 'Camden Cards — Notion Sync';
  container.layoutMode = 'NONE';
  container.fills = [];
  var pairW = cardW * 2 + CARD_GAP;
  container.resize(
    cols * pairW + (cols - 1) * CARD_GAP,
    Math.ceil(cards.length / cols) * (cardH + CARD_GAP)
  );

  // Place on current page near viewport centre
  var vc = figma.viewport.center;
  container.x = vc.x - container.width / 2;
  container.y = vc.y - container.height / 2;
  figma.currentPage.appendChild(container);

  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    figma.ui.postMessage({ type: 'progress', text: 'Building card ' + (i + 1) + ' / ' + cards.length + ': ' + (card.title || '(untitled)') });

    var col = i % cols;
    var row = Math.floor(i / cols);
    var ox  = col * (pairW + CARD_GAP);
    var oy  = row * (cardH + CARD_GAP);

    // ── Front card ──────────────────────────────────────────────
    var front = frontTpl.clone();
    front.name = (card.title || 'Card ' + (i + 1)) + ' — Front';
    container.appendChild(front);
    front.x = ox;
    front.y = oy;

    // Title
    var titleNodes = findTexts(front, function(t) { return t.indexOf('Camden Food Hub') >= 0 || t.indexOf('Food Hub') >= 0; });
    for (var tn of titleNodes) await setText(tn, card.title || '');

    // Pathway — split full name across the two template lines
    var pw = firstPathway(card);
    if (pw && PATHWAY_FULL[pw]) {
      var line1 = PATHWAY_FULL[pw][0];
      var line2 = PATHWAY_FULL[pw][1];
      var pathNodes = findTexts(front, function(t) { return t.indexOf('Beyond') >= 0; });
      for (var pn of pathNodes) await setText(pn, line1);
      var contNodes = findTexts(front, function(t) { return t.indexOf('Universal Nutrition') >= 0 || t.indexOf('- ') === 0; });
      for (var cn of contNodes) await setText(cn, line2);
    }

    // Sector — map wheel_sectors to full labels
    if (card.wheel_sectors && card.wheel_sectors.length) {
      var sectorLabel = card.wheel_sectors.map(function(s) { return SECTOR_FULL[s] || s; }).join('  ·  ');
      var sectorNodes = findTexts(front, function(t) { return /^[A-D]\.\s/.test(t) || t.indexOf('Processing and distribution') >= 0; });
      for (var sn of sectorNodes) await setText(sn, sectorLabel);
    }

    // Scale — map to the scale placeholder ("Borough")
    if (card.scale) {
      var scaleLabel = card.scale.charAt(0).toUpperCase() + card.scale.slice(1);
      var scaleNodes = findTexts(front, function(t) {
        return /^(neighbourhood|borough|regional|national)$/i.test(t.trim());
      });
      for (var scn of scaleNodes) await setText(scn, scaleLabel);
    }

    // ── Back card ───────────────────────────────────────────────
    var back = backTpl.clone();
    back.name = (card.title || 'Card ' + (i + 1)) + ' — Back';
    container.appendChild(back);
    back.x = ox + cardW + CARD_GAP;
    back.y = oy;

    // Title
    var bTitleNodes = findTexts(back, function(t) { return t.indexOf('Camden Food Hub') >= 0 || t.indexOf('Food Hub') >= 0; });
    for (var btn of bTitleNodes) await setText(btn, card.title || '');

    // Description
    if (card.desc) {
      var descNodes = findTexts(back, function(t) { return t.indexOf('Lorem') >= 0 || t.length > 60; });
      // Pick the longest text node as the description field
      descNodes.sort(function(a, b) { return b.characters.length - a.characters.length; });
      if (descNodes.length) await setText(descNodes[0], card.desc);
    }
  }

  // Select and zoom to the new container
  figma.currentPage.selection = [container];
  figma.viewport.scrollAndZoomIntoView([container]);

  figma.ui.postMessage({ type: 'done', text: 'Done! Created ' + cards.length + ' card pairs.' });
}

figma.ui.onmessage = function(msg) {
  if (msg.type === 'sync') {
    syncCards(msg.cards).catch(function(e) {
      figma.ui.postMessage({ type: 'error', text: 'Error: ' + (e && e.message ? e.message : String(e)) });
    });
  }
};
