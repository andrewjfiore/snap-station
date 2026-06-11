// ======= Step 3 — Decorate =======
// Design-system sticker-ux step 3: side rails (undo/redo/clear, zoom), the live
// sheet preview in the middle (real geometry via StickerCanvas), and the
// dc-control-panel with sticker categories / text / filters / background /
// paper tabs. Sticker sets transplanted from the design system's decorate step.

const DC_STICKER_SETS = {
  favorites: ['⚡','🔥','💧','🌿','❄️','🌟','✨','⭐','🌸','🍃','🌙','🌊','🪨','👻','🐉','🐱','🐭','🥚'],
  fun:       ['🎮','🏆','🎯','🎵','💫','🎤','💎','🌀','⚔️','🪐','🎁','🍀'],
  shapes:    ['🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🔷','🔶','🔺','🔻'],
  party:     ['🎉','🎊','🎈','✨','🎁','🥳','🎀','💝','🌈','⭐','💫','🎶'],
  nature:    ['🌿','🍃','🌳','🌸','🌻','🌺','🍀','🌙','☀️','⛰️','🌊','🌋'],
  emoji:     ['😊','😎','🥺','😴','🤩','😻','🥰','🤗','😉','🤔','😇','🌟'],
};
const DC_CATEGORIES = [
  { id: 'favorites', name: 'Favorites' },
  { id: 'fun', name: 'Fun' },
  { id: 'shapes', name: 'Shapes' },
  { id: 'party', name: 'Party' },
  { id: 'nature', name: 'Nature' },
  { id: 'emoji', name: 'Emoji' },
];

const SHEET_FILTERS = [
  { id: 'none', name: 'None' },
  { id: 'vivid', name: 'Vivid' },
  { id: 'sepia', name: 'Sepia' },
  { id: 'noir', name: 'B&W' },
  { id: 'dream', name: 'Dream' },
  { id: 'halftone', name: 'Halftone' },
  { id: 'scan', name: 'Scan' },
  { id: 'crt', name: 'CRT' },
];

const PAPER_COLORS = [
  '#ffffff', '#fffaf0', '#fff0d6', '#ffe1ed', '#d4f0ff', '#dfffd8', '#fff7b2', '#ffdada',
];

function DcRailBtn({ icon, label, onClick, disabled }) {
  return (
    <button className={cx('dc-rail-btn', disabled && 'is-disabled')} aria-label={label}
            aria-disabled={disabled || undefined}
            onClick={() => { if (!disabled) { SoundFX.click(); onClick(); } }}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Step3Decorate({ sheet, setSheet, updateSheet }) {
  const layout = SHEET_LAYOUTS.find((l) => l.id === sheet.layoutId) || SHEET_LAYOUTS[1];
  const stamps = sheet.stamps || [];
  const [tab, setTab] = useState('stickers');
  const [category, setCategory] = useState('favorites');
  const [zoom, setZoom] = useState(1);
  const [textInput, setTextInput] = useState('');
  const [textFont, setTextFont] = useState('kid');
  const [textColor, setTextColor] = useState('#1a1a2e');
  const [customEmojiInput, setCustomEmojiInput] = useState('');

  // Undo / redo — snapshots of the stamps array on discrete edits.
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const [, forceHistory] = useState(0);

  const setStamps = (updater) => {
    setSheet((prev) => ({
      ...prev,
      stamps: typeof updater === 'function' ? updater(prev.stamps || []) : updater,
    }));
  };

  const recordThen = (fn) => {
    pastRef.current = [...pastRef.current, stamps].slice(-40);
    futureRef.current = [];
    fn();
    forceHistory((n) => n + 1);
  };

  const undo = () => {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, stamps];
    setStamps(prev);
    forceHistory((n) => n + 1);
  };
  const redo = () => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, stamps];
    setStamps(next);
    forceHistory((n) => n + 1);
  };

  const addEmojiStamp = (emoji) => {
    SoundFX.sticker();
    recordThen(() => setStamps((prev) => [...prev, {
      id: Date.now() + Math.random(),
      kind: 'emoji',
      content: emoji,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      rot: (Math.random() - 0.5) * 20,
      size: 32,
    }]));
  };

  const addTextStamp = () => {
    if (!textInput.trim()) return;
    SoundFX.sticker();
    const font = STAMP_FONTS.find((f) => f.id === textFont) || STAMP_FONTS[0];
    recordThen(() => setStamps((prev) => [...prev, {
      id: Date.now() + Math.random(),
      kind: 'text',
      content: textInput,
      font: font.family,
      color: textColor,
      x: 50, y: 50, rot: 0, size: 28,
    }]));
    setTextInput('');
  };

  const addCustomEmoji = () => {
    if (!customEmojiInput.trim()) return;
    addEmojiStamp(customEmojiInput.trim());
    setCustomEmojiInput('');
  };

  const clearAll = () => {
    if (stamps.length === 0) return;
    SoundFX.back();
    recordThen(() => setStamps([]));
  };

  // Wrap StickerCanvas's setStamps so stamp deletions become undoable
  // (drag/resize/rotate streams stay un-recorded by design).
  const canvasSetStamps = (updater) => {
    if (typeof updater === 'function') setStamps(updater);
    else recordThen(() => setStamps(updater));
  };

  const sourceArr = useMemo(() => {
    const map = sheet.sourceMap || {};
    const out = [];
    for (let g = 0; g < layout.groups; g++) out[g] = map[g] || null;
    return out;
  }, [sheet.sourceMap, layout.groups]);

  const setImageForGroup = (g, url) => {
    updateSheet({ sourceMap: { ...(sheet.sourceMap || {}), [g]: url } });
  };

  const paper = PAPER_SIZES.find((p) => p.id === sheet.paperId) || PAPER_SIZES[0];

  return (
    <div className="wiz-step-view is-active" data-view="3">
      <div className="dc-container">
        <div className="wiz-hero">
          <div className="wiz-hero__icon" dangerouslySetInnerHTML={{ __html: WIZ_ART.decorate }}/>
          <h2 className="wiz-hero__title">Decorate your photos</h2>
          <p className="wiz-hero__sub">Add stickers, text, and filters to make it your own!</p>
        </div>

        <div className="dc-editor-section">
          <div className="dc-rail-left">
            <DcRailBtn label="Undo" onClick={undo} disabled={pastRef.current.length === 0}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>}/>
            <DcRailBtn label="Redo" onClick={redo} disabled={futureRef.current.length === 0}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>}/>
            <DcRailBtn label="Clear All" onClick={clearAll} disabled={stamps.length === 0}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/></svg>}/>
          </div>

          <div className="dc-stage">
            <div className="dc-stage-zoom" style={{ transform: `scale(${zoom})` }}>
              <StickerCanvas sheet={sheet} updateSheet={updateSheet}
                             sources={sourceArr} stamps={stamps} setStamps={canvasSetStamps}
                             setImageForGroup={setImageForGroup}/>
            </div>
            <div className="dc-stage-meta">
              {paper.w} × {paper.h} mm · landscape · 16 stickers ({STICKER_DIMS.STK_W} × {STICKER_DIMS.STK_H} mm each)
            </div>
          </div>

          <div className="dc-rail-right">
            <DcRailBtn label="Zoom In" onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>}/>
            <DcRailBtn label="Zoom Out" onClick={() => setZoom((z) => Math.max(0.55, z - 0.15))}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/></svg>}/>
            <DcRailBtn label="Fit Frame" onClick={() => setZoom(1)}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3"/></svg>}/>
          </div>
        </div>

        <div className="dc-control-panel">
          <div className="dc-sticker-panel">
            <div className="dc-tab-bar">
              {[['stickers', 'Stickers'], ['text', 'Text'], ['filters', 'Filters'], ['background', 'Background'], ['paper', 'Paper']].map(([id, name]) => (
                <button key={id} className={cx('dc-tab', tab === id && 'is-active')} data-tab={id}
                        onClick={() => { SoundFX.click(); setTab(id); }}>{name}</button>
              ))}
            </div>

            {tab === 'stickers' && (
              <div className="dc-tab-content">
                <div className="dc-category-sidebar">
                  {DC_CATEGORIES.map((c) => (
                    <button key={c.id} className={cx('dc-category-btn', category === c.id && 'is-active')}
                            data-category={c.id}
                            onClick={() => { SoundFX.click(); setCategory(c.id); }}>{c.name}</button>
                  ))}
                </div>
                <div className="dc-sticker-scroll">
                  <div className="dc-sticker-grid">
                    {(DC_STICKER_SETS[category] || []).map((e, i) => (
                      <button key={i} className="dc-sticker-btn" type="button" onClick={() => addEmojiStamp(e)}>{e}</button>
                    ))}
                  </div>
                  <div className="dc-custom-row">
                    <input className="text-field" type="text" placeholder="Type or paste any emoji" maxLength={8}
                           value={customEmojiInput}
                           onChange={(e) => setCustomEmojiInput(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && addCustomEmoji()}/>
                    <button className="btn btn-primary dc-add-btn" onClick={addCustomEmoji}>Add</button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'text' && (
              <div className="dc-tab-content dc-tab-content--form">
                <div className="dc-text-form">
                  <div>
                    <div className="field-label">Your text</div>
                    <input className="text-field" type="text" placeholder="Type something fun…" maxLength={32}
                           value={textInput}
                           onChange={(e) => setTextInput(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && addTextStamp()}/>
                  </div>
                  <div className="dc-text-row">
                    <div>
                      <div className="field-label">Style</div>
                      <select className="text-field" value={textFont} onChange={(e) => setTextFont(e.target.value)}>
                        {STAMP_FONTS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="field-label">Color</div>
                      <input className="dc-color" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}/>
                    </div>
                    <button className="btn btn-primary dc-add-btn" onClick={addTextStamp}>Add Text</button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'filters' && (
              <div className="dc-tab-content dc-tab-content--form">
                <div className="dc-chips">
                  {SHEET_FILTERS.map((f) => (
                    <button key={f.id} className={cx('dc-chip', (sheet.filter || 'none') === f.id && 'is-active')}
                            onClick={() => { SoundFX.click(); updateSheet({ filter: f.id }); }}>{f.name}</button>
                  ))}
                </div>
              </div>
            )}

            {tab === 'background' && (
              <div className="dc-tab-content dc-tab-content--form">
                <div className="dc-chips">
                  {SHEET_WALLPAPERS.map((w) => (
                    <button key={w.id} className={cx('dc-chip', (sheet.wallpaper || 'none') === w.id && 'is-active')}
                            onClick={() => { SoundFX.click(); updateSheet({ wallpaper: w.id }); }}>{w.name}</button>
                  ))}
                </div>
                {sheet.wallpaper === 'custom' && (
                  <div className="dc-custom-row">
                    <input className="text-field" type="text" placeholder="Paste emoji for the background…" maxLength={20}
                           value={sheet.customEmoji || ''}
                           onChange={(e) => updateSheet({ customEmoji: e.target.value })}/>
                  </div>
                )}
              </div>
            )}

            {tab === 'paper' && (
              <div className="dc-tab-content dc-tab-content--form">
                <div className="dc-paper-form">
                  <div>
                    <div className="field-label">Paper color</div>
                    <div className="dc-swatch-row">
                      {PAPER_COLORS.map((c) => (
                        <button key={c}
                                className={cx('dc-swatch', (sheet.paperColor || '#ffffff') === c && 'is-active')}
                                style={{ background: c }} title={c} aria-label={`Paper color ${c}`}
                                onClick={() => { SoundFX.click(); updateSheet({ paperColor: c }); }}/>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="field-label">Paper size</div>
                    <select className="text-field" value={sheet.paperId || '4x6'}
                            onChange={(e) => { SoundFX.click(); updateSheet({ paperId: e.target.value }); }}>
                      {PAPER_SIZES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <label className="dc-kiss-row">
                    <input type="checkbox" className="att-toggle" checked={!!sheet.kissCut}
                           onChange={(e) => { SoundFX.click(); updateSheet({ kissCut: e.target.checked }); }}/>
                    <span className={cx('check-sq', sheet.kissCut && 'on')} aria-hidden="true">
                      {sheet.kissCut && (
                        <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5 9-11"/></svg>
                      )}
                    </span>
                    <span className="field-label" style={{ margin: 0 }}>Show kiss-cut lines</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="dc-hint-card">
            <div className="dc-hint-illo">❤️<span style={{ fontSize: 24 }}>👆</span></div>
            <p className="dc-hint-text"><strong>Tap a sticker</strong><br/>then drag it onto your photos!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
window.Step3Decorate = Step3Decorate;
