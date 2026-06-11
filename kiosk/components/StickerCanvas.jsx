// ======= Sticker Canvas =======
// Renders the 4×6 landscape sheet with an auto-fit scale,
// draws the sticker grid (exact mm dimensions), supports draggable/
// resizable/rotatable stamps on top, and shows kiss-cut overlay + CRT + fade.

function StickerCanvas({
  sheet,
  updateSheet,
  sources,          // array of image URLs (one per group)
  stamps,           // array of {id, kind:'emoji'|'text', content, x%, y%, size, rot, font, color}
  setStamps,
  setImageForGroup, // (groupIdx, url) => void
}) {
  const paper = PAPER_SIZES.find(p => p.id === sheet.paperId) || PAPER_SIZES[0];
  const layout = SHEET_LAYOUTS.find(l => l.id === sheet.layoutId) || SHEET_LAYOUTS[1];
  const { STK_W, STK_H, GAP, KISS_INNER_W, KISS_INNER_H, KISS_R } = STICKER_DIMS;

  // physical grid in mm, centered on paper
  const gridW = STK_W * 4 + GAP * 3;
  const gridH = STK_H * 4 + GAP * 3;
  const mLeft = (paper.w - gridW) / 2;
  const mTop  = (paper.h - gridH) / 2;

  // Fit to container — we use the container's width/height via CSS
  // and size everything in the sheet via %.

  // Each of the 16 cells pulls its source from mapping[i] -> sources[that group]
  const cellData = Array.from({length: 16}, (_, i) => {
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
      <EmojiWallpaper wallpaperId={sheet.wallpaper || 'none'} customEmoji={sheet.customEmoji || ''}/>

      <div
        ref={stageRef}
        className={cx('sk-sheet', sheet.crtFilter && 'crt-on', sheet.fade && 'fade-on')}
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
               gridTemplateColumns: 'repeat(4, 1fr)',
               gridTemplateRows:    'repeat(4, 1fr)',
               gap: `${(GAP / paper.w) * 100}%`,
             }}>
          {cellData.map((c, i) => (
            <StickerCell key={i} i={i} c={c} sheet={sheet}
                         onClick={() => cellClick(c.group)}/>
          ))}
        </div>

        {/* Kiss-cut overlay */}
        {sheet.kissCut && (
          <KissCutOverlay paper={paper}/>
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

function StickerCell({ i, c, sheet, onClick }) {
  const { KISS_INNER_W, KISS_INNER_H, KISS_R } = STICKER_DIMS;
  const innerWPct = (KISS_INNER_W / 26.6) * 100;
  const innerHPct = (KISS_INNER_H / 20)   * 100;
  const radiusPct = (KISS_R / 26.6) * 100;

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

function KissCutOverlay({ paper }) {
  const { STK_W, STK_H, GAP, KISS_INNER_W, KISS_INNER_H, KISS_R } = STICKER_DIMS;
  const gridW = STK_W * 4 + GAP * 3;
  const gridH = STK_H * 4 + GAP * 3;
  const mLeft = (paper.w - gridW) / 2;
  const mTop  = (paper.h - gridH) / 2;

  const innerX = (STK_W - KISS_INNER_W) / 2;
  const innerY = (STK_H - KISS_INNER_H) / 2;

  const rects = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const x = mLeft + c * (STK_W + GAP) + innerX;
      const y = mTop  + r * (STK_H + GAP) + innerY;
      rects.push(
        <rect key={`${r}-${c}`} x={x} y={y}
              width={KISS_INNER_W} height={KISS_INNER_H}
              rx={KISS_R} ry={KISS_R}
              fill="none" stroke="#e11d48" strokeWidth="0.2"
              strokeDasharray="0.8,0.5"/>
      );
    }
  }

  return (
    <svg className="sk-kiss-cut" viewBox={`0 0 ${paper.w} ${paper.h}`} preserveAspectRatio="none">
      {rects}
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
