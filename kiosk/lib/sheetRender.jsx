// ======= Offscreen sheet renderer =======
// Renders the kiosk sheet state to a 300-DPI canvas for print/PNG/Cricut export.
// Geometry comes from js/sticker-constants.js (window.getSheetGeometry/mmToPx) so
// the printed pixels match the cut files exactly. Honest by design: any image
// that fails to load rejects the whole render — no silently blank stickers.

// Same filter mapping as editor.css .sk-cell-img.f-* rules.
const SHEET_FILTER_CSS = {
  crt:      'contrast(1.15) saturate(1.2)',
  sepia:    'sepia(0.8) contrast(1.05)',
  noir:     'grayscale(1) contrast(1.2)',
  halftone: 'contrast(1.4) saturate(0)',
  dream:    'brightness(1.1) saturate(1.3)', // blur added per-DPI below
  scan:     'contrast(1.1) brightness(1.05) saturate(0.9)',
  vivid:    'saturate(1.6) contrast(1.1)',
};

// The on-screen StickerCanvas stage maxes out at 720 CSS px wide; stamp sizes are
// stored in px relative to that stage, so print scales them by canvasW / 720.
const STAGE_REF_W = 720;

function sheetRoundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function sheetLoadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image failed to load — re-add the photo and try again.'));
    img.src = src;
  });
}

function renderSheetToCanvas(sheet, snaps) {
  sheet = sheet || {};
  // Resolve layout exactly like the editor UI (unknown id falls back to quad).
  const layout = SHEET_LAYOUTS.find(l => l.id === sheet.layoutId) || SHEET_LAYOUTS[1];
  const geo = getSheetGeometry(sheet.paperId || '4x6', layout.id);
  const paper = geo.paper;
  const dpi = STICKER_DIMS.DPI || 300;

  // Source per group: sheet.sourceMap wins; if the sheet was never designed,
  // fall back to the same pool the editor prefills from (real snaps, then demos).
  const sourceMap = sheet.sourceMap || {};
  const pool = (snaps && snaps.length > 0) ? snaps : DEMO_SNAPS;
  const sourceFor = (g) => {
    if (sourceMap[g] != null) return sourceMap[g];
    const pick = pool[g % pool.length];
    if (!pick) return null;
    if (typeof pick.dataUrl === 'string') return pick.dataUrl;
    if (pick.from && pick.to) return { gradient: [pick.from, pick.to], label: pick.label };
    return null;
  };

  const groupsNeeded = [...new Set(geo.cells.map(c => c.group))];
  const sources = {};
  groupsNeeded.forEach(g => { sources[g] = sourceFor(g); });

  // Preload every raster source up front so a failure rejects before we draw.
  const imagePromises = groupsNeeded
    .filter(g => typeof sources[g] === 'string')
    .map(g => sheetLoadImage(sources[g]).then(img => { sources[g] = { img }; }));

  const fontsReady = (document.fonts && document.fonts.ready)
    ? document.fonts.ready.catch(() => {})
    : Promise.resolve();

  return Promise.all([fontsReady, ...imagePromises]).then(() => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(mmToPx(paper.w, dpi));
    canvas.height = Math.round(mmToPx(paper.h, dpi));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable.');
    const px = (mm) => mmToPx(mm, dpi);
    const stageScale = canvas.width / STAGE_REF_W;

    // Paper
    ctx.fillStyle = sheet.paperColor || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cell photos, cover-fit inside the kiss-cut rounded rect.
    let filterCss = SHEET_FILTER_CSS[sheet.filter] || '';
    if (sheet.filter === 'dream') filterCss += ` blur(${(0.5 * stageScale).toFixed(2)}px)`;

    geo.cells.forEach((cell) => {
      const src = sources[cell.group];
      if (!src) return; // empty slot stays paper-colored
      const k = cell.kiss;
      const x = px(k.x), y = px(k.y), w = px(k.w), h = px(k.h), r = px(k.r);
      ctx.save();
      sheetRoundRectPath(ctx, x, y, w, h, r);
      ctx.clip();
      if (src.img) {
        const img = src.img;
        const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
        if (filterCss) ctx.filter = filterCss;
        ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
        ctx.filter = 'none';
      } else if (src.gradient) {
        const grad = ctx.createLinearGradient(x, y, x + w, y + h); // ≈ CSS 135deg
        grad.addColorStop(0, src.gradient[0]);
        grad.addColorStop(1, src.gradient[1]);
        if (filterCss) ctx.filter = filterCss;
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);
        ctx.filter = 'none';
        if (src.label) {
          ctx.fillStyle = 'rgba(255,255,255,.85)';
          ctx.font = `800 ${Math.round(8 * stageScale)}px 'Silkscreen', 'Courier New', monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(src.label).replace(/SCENE |SNAP /gi, ''), x + w / 2, y + h / 2);
        }
      }
      ctx.restore();
    });

    // Stamps — x/y are % of the sheet, size/rot match the on-screen StickerCanvas.
    (sheet.stamps || []).forEach((s) => {
      if (!s || !s.content) return;
      ctx.save();
      ctx.translate((s.x / 100) * canvas.width, (s.y / 100) * canvas.height);
      ctx.rotate(((s.rot || 0) * Math.PI) / 180);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const sizePx = Math.max(1, (s.size || 28) * stageScale);
      if (s.kind === 'text') {
        ctx.font = `700 ${sizePx}px ${s.font || 'sans-serif'}`;
        ctx.shadowColor = 'rgba(0,0,0,.45)';
        ctx.shadowOffsetX = 1.5 * stageScale;
        ctx.shadowOffsetY = 1.5 * stageScale;
        ctx.fillStyle = s.color || '#111';
        ctx.fillText(s.content, 0, 0);
      } else {
        ctx.font = `${sizePx}px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif`;
        ctx.shadowColor = 'rgba(0,0,0,.35)';
        ctx.shadowOffsetY = 2 * stageScale;
        ctx.shadowBlur = 3 * stageScale;
        ctx.fillText(s.content, 0, 0);
      }
      ctx.restore();
    });

    return canvas;
  });
}

window.renderSheetToCanvas = renderSheetToCanvas;
