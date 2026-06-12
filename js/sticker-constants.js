// ======= Sticker sheet constants — single source of truth =======
// Exact physical dimensions, landscape by default.
// Reference: 4×6 photo paper = 152.4 × 101.6 mm (landscape).
// Sticker cell = 26.6 × 20 mm. Gap between cells = 1 mm.
// Sticker inner (kiss-cut rounded rect) = 24.1 × 17.5 mm, r = 2.75 mm.
// Verified against the original Snap Station hagaki print (148 × 100 mm sheet,
// 109.4 × 83 mm image area) and the kiss-cut geometry reference diagram.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var api = factory();
    for (var k in api) root[k] = api[k];
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PAPER_SIZES = [
    { id: '4x6',    name: '4" × 6" Photo (recommended)', w: 152.4, h: 101.6, scale: 1.0 },
    { id: 'hagaki', name: 'Hagaki Postcard',             w: 148,   h: 100,   scale: 1.0 },
    { id: 'letter', name: 'US Letter (2× scale)',        w: 279.4, h: 215.9, scale: 2.2 },
  ];

  var STICKER_DIMS = {
    STK_W: 26.6, STK_H: 20, GAP: 1,
    KISS_INNER_W: 24.1, KISS_INNER_H: 17.5, KISS_R: 2.75,
    // Kiss-cut offset inside the cell. Vertically asymmetric on purpose:
    // 0.833 mm top / 1.667 mm bottom, straight from the original reference diagram.
    KISS_OFF_X: 1.25, KISS_OFF_Y: 0.833,
    COLS: 4, ROWS: 4, DPI: 300,
  };

  // All layouts land on landscape paper with the same outer envelope.
  // 'big' is one full-envelope sticker (design system v4's "1 Big Photo");
  // the grid layouts differ only in cell-group mapping.
  var SHEET_LAYOUTS = [
    { id: 'big',    name: '1 Big Photo', sub: 'Single 4×6', groups: 1, cellCount: 1,
      mapping: [0] },
    { id: 'single', name: '16 of the Same', sub: 'Same photo × 16', groups: 1, cellCount: 16,
      mapping: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0] },
    { id: 'quad',   name: '4 Photos', sub: '4 of each photo', groups: 4, cellCount: 16,
      mapping: [0,0,1,1, 0,0,1,1, 2,2,3,3, 2,2,3,3] },
    { id: 'unique', name: '16 Mini Photos', sub: 'All unique · 4×4', groups: 16, cellCount: 16,
      mapping: [0,1,2,3, 4,5,6,7, 8,9,10,11, 12,13,14,15] },
  ];

  // Stamp library — emoji categories, full colour always (theme effects never recolour these).
  var STAMP_LIB = [
    '⚡','🔥','💧','🌱','❄️','🪨','🐉','🧪','🌀','🌩️','🎮',
    '⭐','🎒','🧢','🔎','🏋️','⚔️','📍','📸','🤳','🎞️','📷','🖼️',
    '🌿','🌋','🏜️','🌊','🌌','🪵','✨','💐','🍎','🔔',
    '💫','😲','💤','📝','➕','🎯','👀','🚙','🛤️','🛰️','📡','🔍','🪈','🎶','🎵',
    '💜','💙','💚','💛','🤍','🤎',
    '🩷','🩵','🩶','🥺','😳','🥰','😻','🤗','😇',
    '🌸','🐾','🎀','🐱','🧸','👻','☠️','💀',
  ];

  var STAMP_FONTS = [
    { id: '8bit',    name: '8-Bit',   family: "'Silkscreen', 'Courier New', monospace", weight: 400 },
    { id: 'kid',     name: 'Rounded', family: "'Fredoka', 'Nunito', sans-serif",        weight: 700 },
    { id: 'display', name: 'Display', family: "'Lilita One', 'Bricolage Grotesque', sans-serif", weight: 400 },
    { id: 'mono',    name: 'Mono',    family: "'JetBrains Mono', ui-monospace, monospace", weight: 700 },
  ];

  // Scattered emoji wallpaper behind the sheet — the original's signature feature.
  var SHEET_WALLPAPERS = [
    { id: 'none',     name: 'None (White)',       emoji: [] },
    { id: 'hearts',   name: 'Hearts 💖',          emoji: ['💖','🫧','💘','🧼'] },
    { id: 'vines',    name: 'Vines & Flowers 🌿', emoji: ['🌿','🌸','🍃','🌻'] },
    { id: 'stars',    name: 'Starlight ✨',       emoji: ['⭐','✨','🌟','💫'] },
    { id: 'cosmic',   name: 'Cosmic 🌌',          emoji: ['🌌','🌠','🪐','☄️','👾'] },
    { id: 'critters', name: 'Critters 🐾',        emoji: ['🐾','🦋','🐝','🐞','🐢'] },
    { id: 'sweets',   name: 'Sweets 🍭',          emoji: ['🍭','🍬','🍩','🧁','🍦'] },
    { id: '1up',      name: '1-UP 🍄',            emoji: ['🍄','⭐','🪙','🐢','❓'] },
    { id: 'custom',   name: 'Custom…',            emoji: [] },
  ];

  // Geometry helper: absolute mm rects for every cell of a layout on a paper.
  // Returns { paper, cells: [{x, y, w, h, kiss: {x, y, w, h, r}, group}] }.
  function getSheetGeometry(paperId, layoutId) {
    var paper = null, layout = null, i;
    for (i = 0; i < PAPER_SIZES.length; i++) if (PAPER_SIZES[i].id === paperId) paper = PAPER_SIZES[i];
    for (i = 0; i < SHEET_LAYOUTS.length; i++) if (SHEET_LAYOUTS[i].id === layoutId) layout = SHEET_LAYOUTS[i];
    if (!paper) paper = PAPER_SIZES[0];
    if (!layout) { for (i = 0; i < SHEET_LAYOUTS.length; i++) if (SHEET_LAYOUTS[i].id === 'quad') layout = SHEET_LAYOUTS[i]; }

    var D = STICKER_DIMS, s = paper.scale;
    var cw = D.STK_W * s, ch = D.STK_H * s, gap = D.GAP * s;
    var gridW = cw * D.COLS + gap * (D.COLS - 1);
    var gridH = ch * D.ROWS + gap * (D.ROWS - 1);
    var marginL = (paper.w - gridW) / 2;
    var marginT = (paper.h - gridH) / 2;
    var kw = D.KISS_INNER_W * s, kh = D.KISS_INNER_H * s, kr = D.KISS_R * s;
    var kox = D.KISS_OFF_X * s, koy = D.KISS_OFF_Y * s;

    var cells = [];
    if (layout.id === 'big') {
      // One sticker spanning the full grid envelope. Kiss-cut uses the same
      // per-edge insets as a grid cell, so the cut rules stay uniform.
      cells.push({
        x: marginL, y: marginT, w: gridW, h: gridH,
        kiss: {
          x: marginL + kox, y: marginT + koy,
          w: gridW - kox * 2,
          h: gridH - koy - (D.STK_H - D.KISS_INNER_H - D.KISS_OFF_Y) * s,
          r: kr,
        },
        group: 0,
      });
    } else {
      for (var r = 0; r < D.ROWS; r++) {
        for (var c = 0; c < D.COLS; c++) {
          var x = marginL + c * (cw + gap);
          var y = marginT + r * (ch + gap);
          cells.push({
            x: x, y: y, w: cw, h: ch,
            kiss: { x: x + kox, y: y + koy, w: kw, h: kh, r: kr },
            group: layout.mapping[r * D.COLS + c],
          });
        }
      }
    }
    return { paper: paper, layout: layout, cells: cells, grid: { w: gridW, h: gridH, marginL: marginL, marginT: marginT } };
  }

  function mmToPx(mm, dpi) { return mm * (dpi || STICKER_DIMS.DPI) / 25.4; }

  return {
    PAPER_SIZES: PAPER_SIZES,
    SHEET_LAYOUTS: SHEET_LAYOUTS,
    STAMP_LIB: STAMP_LIB,
    STAMP_FONTS: STAMP_FONTS,
    SHEET_WALLPAPERS: SHEET_WALLPAPERS,
    STICKER_DIMS: STICKER_DIMS,
    getSheetGeometry: getSheetGeometry,
    mmToPx: mmToPx,
  };
}));
