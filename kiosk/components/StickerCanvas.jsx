// ======= Sticker Canvas =======
// Renders the 4×6 landscape sheet with an auto-fit scale,
// draws the sticker grid (exact mm dimensions), supports draggable/
// resizable/rotatable stamps on top, and shows kiss-cut overlay.
// Restyled to the design-system look (light glass frame, white sheet).

// Scattered emoji wallpaper behind the sheet (screen decoration only — it is
// not printed). Deterministic seeded layout so it doesn't reshuffle on render.
function sheetWpSeeded(n) {
  let s = n;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function SheetWallpaper({ wallpaperId = 'none', customEmoji = '', count = 60, seed = 7 }) {
  const wp = SHEET_WALLPAPERS.find((w) => w.id === wallpaperId);
  let emoji = wp ? wp.emoji : [];
  if (wallpaperId === 'custom' && customEmoji) {
    emoji = Array.from(customEmoji).filter((c) => c.trim());
    if (emoji.length === 0) emoji = [customEmoji];
  }
  const emojiKey = emoji.join('');
  const rnd = useMemo(() => {
    if (emoji.length === 0) return [];
    const r = sheetWpSeeded(seed);
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      emoji: emoji[Math.floor(r() * emoji.length)],
      left: r() * 100,
      top: r() * 100,
      size: 14 + r() * 18,
      rot: (r() * 2 - 1) * 30,
    }));
  }, [wallpaperId, customEmoji, emojiKey, count, seed]);

  if (!emoji || emoji.length === 0) return null;
  return (
    <div className="sk-wallpaper" aria-hidden="true">
      {rnd.map((e) => (
        <span key={e.key}
              style={{ left: `${e.left}%`, top: `${e.top}%`, fontSize: `${e.size}px`,
                       transform: `rotate(${e.rot}deg)` }}>
          {e.emoji}
        </span>
      ))}
    </div>
  );
}
window.SheetWallpaper = SheetWallpaper;

function StickerCanvas({
  sheet,
  updateSheet,
  sources,          // array of image URLs (one per group)
  stamps,           // array of {id, kind:'emoji'|'text', content, x%, y%, size, rot, font, color}
  setStamps,
  setImageForGroup, // (groupIdx, url) => void
}) {
  const paper = PAPER_SIZES.find(p => p.id === sheet.paperId) || PAPER_SIZES[0];
  const layout = SHEET_LAYOUTS.find(l => l.id === sheet.layoutId) || SHEET_LAYOUTS.find(l => l.id === 'quad');
  const { STK_W, STK_H, GAP, KISS_INNER_W, KISS_INNER_H, KISS_R } = STICKER_DIMS;

  // physical grid in mm, centered on paper
  const gridW = STK_W * 4 + GAP * 3;
  const gridH = STK_H * 4 + GAP * 3;
  const mLeft = (paper.w - gridW) / 2;
  const mTop  = (paper.h - gridH) / 2;

  // Fit to container — we use the container's width/height via CSS
  // and size everything in the sheet via %.

  // Cells pull their source from mapping[i] → sources[group]. The v4 'big'
  // layout is a single full-envelope cell; grid layouts are the 4×4.
  const isBig = layout.id === 'big';
  const cellData = isBig
    ? [{ group: 0, url: sources[0] || null }]
    : Array.from({length: 16}, (_, i) => {
        const g = layout.mapping[i];
        return { group: g, url: sources[g] || null };
      });

  // Drag / resize / rotate state
  const stageRef = useRef(null);
  const [drag, setDrag] = useState(null); // {id, mode, startX, startY, startLeft, startTop, startSize, startRot, cx, cy, scope}

  const onStampDown = (e, stamp, mode) => {
    e.preventDefault();
    e.stopPropagation();
    const t = e.touches ? e.touches[0] : e;
    const rect = stageRef.current.getBoundingClientRect();
    // convert element center to px within stage
    const ex = rect.left + (stamp.x / 100) * rect.width;
    const ey = rect.top + (stamp.y / 100) * rect.height;
    setDrag({
      id: stamp.id, mode,
      startClientX: t.clientX, startClientY: t.clientY,
      startX: stamp.x, startY: stamp.y,
      startSize: stamp.size, startRot: stamp.rot,
      stageRect: rect, ecx: ex, ecy: ey,
    });
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      e.preventDefault?.();
      const t = e.touches ? e.touches[0] : e;
      setStamps(prev => prev.map(s => {
        if (s.id !== drag.id) return s;
        if (drag.mode === 'drag') {
          const dx = t.clientX - drag.startClientX;
          const dy = t.clientY - drag.startClientY;
          const nx = drag.startX + (dx / drag.stageRect.width) * 100;
          const ny = drag.startY + (dy / drag.stageRect.height) * 100;
          return { ...s, x: Math.max(0, Math.min(100, nx)), y: Math.max(0, Math.min(100, ny)) };
        }
        if (drag.mode === 'resize') {
          const d0 = Math.hypot(drag.startClientX - drag.ecx, drag.startClientY - drag.ecy);
          const d1 = Math.hypot(t.clientX - drag.ecx, t.clientY - drag.ecy);
          const scale = Math.max(0.2, d1 / Math.max(1, d0));
          return { ...s, size: Math.max(8, Math.min(120, drag.startSize * scale)) };
        }
        if (drag.mode === 'rotate') {
          const a0 = Math.atan2(drag.startClientY - drag.ecy, drag.startClientX - drag.ecx);
          const a1 = Math.atan2(t.clientY - drag.ecy, t.clientX - drag.ecx);
          return { ...s, rot: drag.startRot + (a1 - a0) * (180 / Math.PI) };
        }
        return s;
      }));
    };
    const up = () => setDrag(null);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [drag, setStamps]);

  const deleteStamp = (id) => {
    SoundFX.back();
    setStamps(prev => prev.filter(s => s.id !== id));
  };

  // Cell click: open upload for that group, OR set from selection next
  const cellClick = (group) => {
    if (!setImageForGroup) return;
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      setImageForGroup(group, url);
    };
    inp.click();
  };

  return (
    <div className="sk-sheet-frame">
      <SheetWallpaper wallpaperId={sheet.wallpaper || 'none'} customEmoji={sheet.customEmoji || ''}/>

      <div
        ref={stageRef}
        className="sk-sheet"
        style={{
          aspectRatio: `${paper.w} / ${paper.h}`,
          background: sheet.paperColor || '#ffffff',
        }}
        onClick={() => setStamps(prev => prev.map(s => ({...s, _selected: false})))}>

        {/* Sticker grid */}
        <div className="sk-grid"
             style={{
               position: 'absolute',
               left: `${(mLeft / paper.w) * 100}%`,
               top:  `${(mTop  / paper.h) * 100}%`,
               width:  `${(gridW / paper.w) * 100}%`,
               height: `${(gridH / paper.h) * 100}%`,
               display: 'grid',
               gridTemplateColumns: isBig ? '1fr' : 'repeat(4, 1fr)',
               gridTemplateRows:    isBig ? '1fr' : 'repeat(4, 1fr)',
               gap: isBig ? 0 : `${(GAP / paper.w) * 100}%`,
             }}>
          {cellData.map((c, i) => (
            <StickerCell key={i} i={i} c={c} sheet={sheet} big={isBig}
                         onClick={() => cellClick(c.group)}/>
          ))}
        </div>

        {/* Kiss-cut overlay */}
        {sheet.kissCut && (
          <KissCutOverlay paper={paper} layoutId={layout.id}/>
        )}

        {/* Stamps layer */}
        <div className="sk-stamp-layer">
          {stamps.map(s => (
            <StampInstance key={s.id} s={s}
                           onDown={onStampDown}
                           onDelete={() => deleteStamp(s.id)}/>
          ))}
        </div>
      </div>
    </div>
  );
}

// Renders a photo with the shared pos model ({zoom, fx, fy}); the CSS
// object-position + transform-origin combination keeps image-fraction fx/fy
// pinned to the same box fraction — the exact invariant the 300-DPI canvas
// renderer uses, so preview and print always agree.
function PosImg({ src, pos, draggable = false }) {
  const p = SheetSource.posOf({ src, pos });
  return (
    <img className="sk-cell-photo" src={src} alt="" draggable={false}
         style={{
           objectPosition: `${p.fx * 100}% ${p.fy * 100}%`,
           transform: p.zoom !== 1 ? `scale(${p.zoom})` : 'none',
           transformOrigin: `${p.fx * 100}% ${p.fy * 100}%`,
         }}/>
  );
}
window.PosImg = PosImg;

function StickerCell({ i, c, sheet, big, onClick }) {
  const { STK_W, STK_H, GAP, KISS_INNER_W, KISS_INNER_H, KISS_R, KISS_OFF_X, KISS_OFF_Y, COLS, ROWS } = STICKER_DIMS;
  // Kiss-cut inset as a fraction of this cell's own box. For 'big' the box is
  // the whole grid envelope, with the same per-edge insets as a grid cell.
  const cellW = big ? STK_W * COLS + GAP * (COLS - 1) : STK_W;
  const cellH = big ? STK_H * ROWS + GAP * (ROWS - 1) : STK_H;
  const kissW = big ? cellW - KISS_OFF_X * 2 : KISS_INNER_W;
  const kissH = big ? cellH - KISS_OFF_Y - (STK_H - KISS_INNER_H - KISS_OFF_Y) : KISS_INNER_H;
  const innerWPct = (kissW / cellW) * 100;
  const innerHPct = (kissH / cellH) * 100;
  const radiusPct = (KISS_R / cellW) * 100;

  // url may be: null, a string (URL), { src, pos } (adjusted photo),
  // or { gradient: [a,b], label } (demo poster)
  const photoSrc = SheetSource.srcOf(c.url);
  const isGrad = !photoSrc && c.url && c.url.gradient;
  let bg = 'rgba(0,0,0,.06)';
  let labelTxt = null;
  if (isGrad) {
    bg = `linear-gradient(135deg, ${c.url.gradient[0]}, ${c.url.gradient[1]})`;
    labelTxt = c.url.label;
  }

  return (
    <div className="sk-cell" onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <div className={cx('sk-cell-img', `f-${sheet.filter || 'none'}`)}
           style={{
             width: `${innerWPct}%`,
             height: `${innerHPct}%`,
             borderRadius: `${radiusPct}%`,
             background: bg,
             overflow: 'hidden',
             position: 'relative',
           }}>
        {photoSrc && <PosImg src={photoSrc} pos={c.url && c.url.pos}/>}
        {!c.url && (
          <div className="sk-cell-empty">
            <span>{String(c.group + 1).padStart(2,'0')}</span>
          </div>
        )}
        {labelTxt && (
          <div className="sk-cell-empty" style={{color: 'rgba(255,255,255,.85)', fontSize: 8, fontWeight: 800}}>
            <span>{labelTxt.replace(/SCENE |SNAP /gi, '')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Geometry-driven: getSheetGeometry handles grid layouts and the v4 'big'
// full-envelope sticker with the same code path as print and cut export.
function KissCutOverlay({ paper, layoutId }) {
  const geo = getSheetGeometry(paper.id, layoutId);
  return (
    <svg className="sk-kiss-cut" viewBox={`0 0 ${paper.w} ${paper.h}`} preserveAspectRatio="none">
      {geo.cells.map((cell, i) => (
        <rect key={i} x={cell.kiss.x} y={cell.kiss.y}
              width={cell.kiss.w} height={cell.kiss.h}
              rx={cell.kiss.r} ry={cell.kiss.r}
              fill="none" stroke="#e11d48" strokeWidth="0.2"
              strokeDasharray="0.8,0.5"/>
      ))}
    </svg>
  );
}

function StampInstance({ s, onDown, onDelete }) {
  const isText = s.kind === 'text';
  const commonStyle = {
    position: 'absolute',
    left: `${s.x}%`,
    top:  `${s.y}%`,
    transform: `translate(-50%, -50%) rotate(${s.rot}deg)`,
    fontSize: `${s.size}px`,
    lineHeight: 1,
    userSelect: 'none',
    cursor: 'move',
    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))',
  };
  if (isText) {
    commonStyle.fontFamily = s.font || 'sans-serif';
    commonStyle.color = s.color || '#111';
    commonStyle.fontWeight = 700;
    commonStyle.whiteSpace = 'nowrap';
    commonStyle.textShadow = '1.5px 1.5px 0 rgba(0,0,0,.45)';
    commonStyle.padding = '2px 4px';
  }

  return (
    <div className="sk-stamp"
         style={commonStyle}
         onMouseDown={(e) => onDown(e, s, 'drag')}
         onTouchStart={(e) => onDown(e, s, 'drag')}>
      <div className="sk-stamp-body">{s.content}</div>
      <div className="sk-stamp-handles">
        <button className="sk-h sk-h-del" title="Delete"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => { e.stopPropagation(); onDelete(); }}>×</button>
        <button className="sk-h sk-h-rot" title="Rotate"
                onMouseDown={(e) => onDown(e, s, 'rotate')}
                onTouchStart={(e) => onDown(e, s, 'rotate')}>↻</button>
        <button className="sk-h sk-h-sz" title="Resize"
                onMouseDown={(e) => onDown(e, s, 'resize')}
                onTouchStart={(e) => onDown(e, s, 'resize')}>↔</button>
      </div>
    </div>
  );
}

window.StickerCanvas = StickerCanvas;
