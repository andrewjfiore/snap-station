// Adjust modal — touch-first reframing for a photo slot. Drag pans 1:1 against
// the pannable overflow; the slider zooms 1–3×. Uses the shared pos model
// ({zoom, fx, fy}) so the preview here, the sticker cells, and the 300-DPI
// print render are pixel-equivalent by construction.
function AdjustModal({ src, pos, onChange, onClose }) {
  const [p, setP] = useState(SheetSource.posOf({ src, pos }));
  const frameRef = useRef(null);
  const imgRef = useRef(null);
  const dragRef = useRef(null);

  const { KISS_INNER_W, KISS_INNER_H } = STICKER_DIMS;

  const commit = () => { SoundFX.confirm(); onChange(p); onClose(); };
  const reset = () => { SoundFX.click(); setP({ ...SheetSource.DEFAULT_POS }); };

  // 1:1 drag: a pixel of pointer movement moves the image one pixel, expressed
  // as a fraction of the pannable overflow in each axis.
  const onPointerDown = (e) => {
    const frame = frameRef.current, img = imgRef.current;
    if (!frame || !img || !img.naturalWidth) return;
    e.preventDefault();
    frame.setPointerCapture && frame.setPointerCapture(e.pointerId);
    const rect = frame.getBoundingClientRect();
    const cover = Math.max(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
    const dw = img.naturalWidth * cover * p.zoom;
    const dh = img.naturalHeight * cover * p.zoom;
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startFx: p.fx, startFy: p.fy,
      rangeX: Math.max(0, dw - rect.width),
      rangeY: Math.max(0, dh - rect.height),
    };
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    setP(prev => ({
      ...prev,
      fx: d.rangeX > 0 ? Math.min(1, Math.max(0, d.startFx - dx / d.rangeX)) : prev.fx,
      fy: d.rangeY > 0 ? Math.min(1, Math.max(0, d.startFy - dy / d.rangeY)) : prev.fy,
    }));
  };
  const onPointerUp = () => { dragRef.current = null; };

  return (
    <div className="adjust-overlay" role="dialog" aria-modal="true" aria-label="Adjust photo framing"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="adjust-box">
        <h3>Adjust Photo</h3>
        <div className="adjust-frame" ref={frameRef}
             style={{ aspectRatio: `${KISS_INNER_W} / ${KISS_INNER_H}` }}
             onPointerDown={onPointerDown}
             onPointerMove={onPointerMove}
             onPointerUp={onPointerUp}
             onPointerCancel={onPointerUp}>
          <img ref={imgRef} src={src} alt="Photo being adjusted" draggable={false}
               style={{
                 objectPosition: `${p.fx * 100}% ${p.fy * 100}%`,
                 transform: p.zoom !== 1 ? `scale(${p.zoom})` : 'none',
                 transformOrigin: `${p.fx * 100}% ${p.fy * 100}%`,
               }}/>
          <div className="adjust-hint">drag to reframe</div>
        </div>
        <div className="adjust-zoom">
          <label htmlFor="adjust-zoom-slider">Zoom · {p.zoom.toFixed(2)}×</label>
          <input id="adjust-zoom-slider" type="range" min="1" max="3" step="0.05"
                 value={p.zoom}
                 onChange={(e) => setP(prev => ({ ...prev, zoom: parseFloat(e.target.value) }))}/>
        </div>
        <div className="adjust-actions">
          <button className="btn sm" onClick={reset}>Reset</button>
          <button className="btn sm" onClick={() => { SoundFX.back(); onClose(); }}>Cancel</button>
          <button className="btn primary sm" onClick={commit}>Done</button>
        </div>
      </div>
    </div>
  );
}
window.AdjustModal = AdjustModal;
