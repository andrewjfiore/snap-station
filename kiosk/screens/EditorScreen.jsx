// ======= EditorScreen =======
// Layout: top toolbar (theme, wallpaper, paper size, save/load) → layout pills →
// source image slots → options (kiss-cut, fade, CRT, cutting template, import snaps,
// print, save) → full preview below. Stamp kit panel on the right.

const FILTERS = [
  { id: 'none', name: 'None' },
  { id: 'crt', name: 'CRT' },
  { id: 'sepia', name: 'Sepia' },
  { id: 'noir', name: 'B&W' },
  { id: 'halftone', name: 'Halftone' },
  { id: 'dream', name: 'Dream' },
  { id: 'scan', name: 'Scan' },
  { id: 'vivid', name: 'Vivid' },
];

const PAPER_COLORS = [
  '#ffffff','#fffaf0','#fff0d6','#ffe1ed','#d4f0ff','#dfffd8','#fff7b2','#ffdada',
];

// Project save/load — JSON blob {version, savedAt, project}, downloaded through
// the shared StickerExport plumbing (replaces the prototype's stickerExport.jsx).
function saveProjectToFile(project) {
  const data = {
    version: 1,
    savedAt: new Date().toISOString(),
    project
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  StickerExport.triggerDownload(blob, `snap-station-project-${Date.now()}.json`);
}

function loadProjectFromFile(onLoad) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      onLoad(data.project || data); // lenient
    } catch (err) {
      SoundFX.error();
      alert('Could not load project: ' + err.message);
    }
  };
  input.click();
}

// Cut-only template (registration crosses) via the shared SVG builder.
function downloadCuttingTemplate(paperId) {
  const svg = StickerExport.buildCutSvg({ paperId: paperId || '4x6', registrationMarks: true });
  StickerExport.triggerDownload(new Blob([svg], { type: 'image/svg+xml' }),
    `snap-station-cut-template-${paperId || '4x6'}.svg`);
}

// Snap (gallery entry or demo scene) → sticker source value.
function snapToSource(pick) {
  if (!pick) return null;
  if (typeof pick.dataUrl === 'string') return pick.dataUrl;
  if (pick.from && pick.to) return { gradient: [pick.from, pick.to], label: pick.label };
  return pick.url || null;
}

function EditorScreen({ setScreen, selection, snaps, sheet, setSheet }) {
  // --- Source images: one per group. quad=4 groups, single=1, unique=16.
  const [sourceMap, setSourceMap] = useState(sheet.sourceMap || {});
  const [adjusting, setAdjusting] = useState(null); // group index being reframed
  // --- Stamps
  const [stamps, setStamps] = useState(sheet.stamps || []);
  // --- Text input
  const [textInput, setTextInput] = useState('');
  const [textFont, setTextFont] = useState('8bit');
  const [textColor, setTextColor] = useState('#1a1a2e');
  const [customEmojiInput, setCustomEmojiInput] = useState('');

  const layout = SHEET_LAYOUTS.find(l => l.id === sheet.layoutId) || SHEET_LAYOUTS[1];

  // Selected snaps (real gallery entries and demo scenes both count).
  const selectedPool = () => [...snaps, ...DEMO_SNAPS].filter(s => selection.includes(s.id));

  // Pre-fill sourceMap from kiosk gallery snaps when empty.
  useEffect(() => {
    if (Object.keys(sourceMap).length === 0) {
      const imported = selectedPool();
      const pool = imported.length > 0 ? imported : DEMO_SNAPS.slice(0, 4);
      if (pool.length > 0) {
        const m = {};
        const groups = layout.groups;
        for (let g = 0; g < groups; g++) {
          m[g] = snapToSource(pool[g % pool.length]);
        }
        setSourceMap(m);
      }
    }
  }, []); // eslint-disable-line

  // Persist sourceMap + stamps back to sheet whenever they change.
  useEffect(() => {
    setSheet(prev => ({ ...prev, sourceMap, stamps }));
  }, [sourceMap, stamps]);

  const updateSheet = (patch) => setSheet(prev => ({ ...prev, ...patch }));

  const sourceArr = useMemo(() => {
    const out = [];
    for (let g = 0; g < layout.groups; g++) out[g] = sourceMap[g] || null;
    return out;
  }, [sourceMap, layout.groups]);

  const setImageForGroup = (g, url) => {
    setSourceMap(prev => ({ ...prev, [g]: url }));
  };
  const clearGroup = (g) => {
    setSourceMap(prev => {
      const n = { ...prev };
      delete n[g];
      return n;
    });
  };

  const addEmojiStamp = (emoji) => {
    SoundFX.sticker();
    setStamps(prev => [...prev, {
      id: Date.now() + Math.random(),
      kind: 'emoji',
      content: emoji,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      rot: (Math.random() - 0.5) * 20,
      size: 32,
    }]);
  };
  const addTextStamp = () => {
    if (!textInput.trim()) return;
    SoundFX.sticker();
    const font = STAMP_FONTS.find(f => f.id === textFont) || STAMP_FONTS[0];
    setStamps(prev => [...prev, {
      id: Date.now() + Math.random(),
      kind: 'text',
      content: textInput,
      font: font.family,
      color: textColor,
      x: 50, y: 50, rot: 0, size: 28,
    }]);
    setTextInput('');
  };
  const addCustomEmoji = () => {
    if (!customEmojiInput.trim()) return;
    addEmojiStamp(customEmojiInput.trim());
    setCustomEmojiInput('');
  };

  // --- Import Snaps (pull from kiosk gallery)
  const importFromKiosk = () => {
    const selected = selectedPool();
    const pool = selected.length > 0
      ? selected
      : (snaps.length > 0 ? snaps : DEMO_SNAPS);
    if (pool.length === 0) {
      alert('No snaps yet. Head to Capture first!');
      return;
    }
    const m = {};
    for (let g = 0; g < layout.groups; g++) {
      m[g] = snapToSource(pool[g % pool.length]);
    }
    setSourceMap(m);
    SoundFX.confirm();
  };

  // --- Bulk upload
  const bulkUpload = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.multiple = true;
    inp.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      const m = { ...sourceMap };
      files.slice(0, layout.groups).forEach((f, i) => {
        m[i] = URL.createObjectURL(f);
      });
      setSourceMap(m);
      SoundFX.confirm();
    };
    inp.click();
  };

  // --- Save / load project
  const doSave = () => {
    SoundFX.confirm();
    saveProjectToFile({ sheet: { ...sheet, sourceMap, stamps } });
  };
  const doLoad = () => {
    loadProjectFromFile((data) => {
      if (data.sheet) {
        setSheet(data.sheet);
        setSourceMap(data.sheet.sourceMap || {});
        setStamps(data.sheet.stamps || []);
        SoundFX.confirm();
      }
    });
  };

  const goPrint = () => {
    SoundFX.confirm();
    setSheet(prev => ({ ...prev, sourceMap, stamps }));
    setScreen('checkout');
  };

  const paper = PAPER_SIZES.find(p => p.id === sheet.paperId) || PAPER_SIZES[0];

  return (
    <ScreenShell crumbs={['Design', `Sticker Sheet · ${paper.w}×${paper.h}mm landscape`]}
      footer={
        <>
          <div className="btn-hints">
            <span>{Object.keys(sourceMap).length} / {layout.groups} sources · {stamps.length} stamps · 16 stickers</span>
          </div>
          <div style={{display: 'flex', gap: 6}}>
            <button className="btn sm" onClick={() => { SoundFX.click(); setScreen('gallery'); }}>← Gallery</button>
            <button className="btn primary sm" onClick={goPrint}>Continue to Print →</button>
          </div>
        </>
      }>
      <div className="sk-editor">

        {/* Top toolbar */}
        <div className="sk-toolbar">
          <div className="sk-tb-group">
            <label>Theme</label>
            <select value={sheet.wallpaper || 'none'}
                    onChange={e => { SoundFX.click(); updateSheet({wallpaper: e.target.value}); }}>
              {SHEET_WALLPAPERS.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          {sheet.wallpaper === 'custom' && (
            <div className="sk-tb-group">
              <label>Emoji</label>
              <input type="text" placeholder="Paste emoji…" maxLength={20}
                     value={sheet.customEmoji || ''}
                     onChange={e => updateSheet({customEmoji: e.target.value})}/>
            </div>
          )}

          <div className="sk-tb-group">
            <label>Paper</label>
            <select value={sheet.paperId || '4x6'}
                    onChange={e => { SoundFX.click(); updateSheet({paperId: e.target.value}); }}>
              {PAPER_SIZES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="sk-tb-group">
            <label>Paper color</label>
            <div className="sk-color-row">
              {PAPER_COLORS.map(c => (
                <button key={c} onClick={() => { SoundFX.click(); updateSheet({paperColor: c}); }}
                        className={cx('sk-color-swatch', sheet.paperColor === c && 'active')}
                        style={{background: c}} title={c}/>
              ))}
            </div>
          </div>

          <div className="sk-tb-group sk-tb-spacer"/>

          <button className="btn sm" onClick={doSave}>💾 Save Project</button>
          <button className="btn sm" onClick={doLoad}>📂 Load Project</button>
        </div>

        {/* Layout mode pills */}
        <div className="sk-layout-pills">
          {SHEET_LAYOUTS.map(l => (
            <button key={l.id}
              className={cx('sk-pill', sheet.layoutId === l.id && 'active')}
              onClick={() => {
                SoundFX.click();
                // Clear sourceMap slots above new group count when shrinking
                if (l.groups < layout.groups) {
                  setSourceMap(prev => {
                    const n = {};
                    for (let g = 0; g < l.groups; g++) if (prev[g]) n[g] = prev[g];
                    return n;
                  });
                }
                updateSheet({layoutId: l.id});
              }}>
              {l.name}
            </button>
          ))}
        </div>

        {/* Source slots */}
        <div className="sk-sources">
          {sourceArr.map((url, g) => {
            const isGrad = url && typeof url === 'object' && url.gradient;
            const photoSrc = SheetSource.srcOf(url);
            const slotStyle = photoSrc ? {background: `url(${photoSrc}) center/cover`}
                            : isGrad ? {background: `linear-gradient(135deg, ${url.gradient[0]}, ${url.gradient[1]})`}
                            : {};
            return (
              <div key={g} className="sk-source-slot">
                <div className="sk-source-thumb"
                     onClick={() => {
                       const inp = document.createElement('input');
                       inp.type = 'file'; inp.accept = 'image/*';
                       inp.onchange = (e) => {
                         const f = e.target.files?.[0];
                         if (f) setImageForGroup(g, URL.createObjectURL(f));
                       };
                       inp.click();
                     }}
                     style={slotStyle}>
                  {!url && <>
                    <div className="sk-source-icon">↻</div>
                    <div className="sk-source-lbl">Upload Group {g+1}</div>
                    <div className="sk-source-hint">JPG, PNG, GIF</div>
                  </>}
                  {isGrad && (
                    <div className="sk-source-lbl" style={{color:'#fff', textShadow:'0 1px 2px rgba(0,0,0,.6)'}}>
                      {url.label}
                    </div>
                  )}
                </div>
                {photoSrc && (
                  <button className="sk-source-adj"
                          onClick={() => { SoundFX.click(); setAdjusting(g); }}
                          title="Adjust framing">✎</button>
                )}
                {url && (
                  <button className="sk-source-del"
                          onClick={() => clearGroup(g)} title="Clear">×</button>
                )}
              </div>
            );
          })}
        </div>

        {adjusting != null && SheetSource.srcOf(sourceMap[adjusting]) && (
          <AdjustModal
            src={SheetSource.srcOf(sourceMap[adjusting])}
            pos={sourceMap[adjusting] && sourceMap[adjusting].pos}
            onChange={(pos) => {
              const src = SheetSource.srcOf(sourceMap[adjusting]);
              setSourceMap(prev => ({ ...prev, [adjusting]: { src, pos } }));
            }}
            onClose={() => setAdjusting(null)}/>
        )}

        {/* Options row */}
        <div className="sk-options">
          <label className="sk-chk">
            <input type="checkbox" checked={!!sheet.kissCut}
                   onChange={e => updateSheet({kissCut: e.target.checked})}/>
            Show Kiss-Cut
          </label>
          <label className="sk-chk">
            <input type="checkbox" checked={!!sheet.fade}
                   onChange={e => updateSheet({fade: e.target.checked})}/>
            Fade
          </label>
          <label className="sk-chk">
            <input type="checkbox" checked={!!sheet.crtFilter}
                   onChange={e => updateSheet({crtFilter: e.target.checked})}/>
            CRT Effect
          </label>

          <div className="sk-tb-spacer"/>

          <button className="btn sm" onClick={importFromKiosk}>📷 Import Snaps</button>
          <button className="btn sm" onClick={bulkUpload}>⬆ Upload</button>
          <button className="btn sm" onClick={() => downloadCuttingTemplate(sheet.paperId || '4x6')}>
            ✂ Cutting Template (SVG)
          </button>
          <button className="btn sm" onClick={goPrint}>🖨 Print</button>
        </div>

        {/* Preview + stamp kit */}
        <div className="sk-preview-wrap">
          <div className="sk-preview-col">
            <div className="sk-preview-meta">
              <span>{paper.w} × {paper.h} mm · landscape · 16 stickers ({STICKER_DIMS.STK_W}×{STICKER_DIMS.STK_H} mm each)</span>
            </div>
            <StickerCanvas sheet={sheet} updateSheet={updateSheet}
              sources={sourceArr} stamps={stamps} setStamps={setStamps}
              setImageForGroup={setImageForGroup}/>
          </div>

          <div className="sk-stamp-kit">
            <div className="sk-stamp-kit-h">Add Stamp</div>
            <div className="sk-stamp-grid">
              {STAMP_LIB.map((e, i) => (
                <button key={i} className="sk-stamp-btn" onClick={() => addEmojiStamp(e)}>{e}</button>
              ))}
            </div>

            <div className="sk-stamp-custom">
              <input type="text" placeholder="Type or paste emoji" maxLength={8}
                     value={customEmojiInput}
                     onChange={e => setCustomEmojiInput(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && addCustomEmoji()}/>
              <button className="btn sm primary" onClick={addCustomEmoji}>+</button>
            </div>

            <div className="sk-stamp-text">
              <input type="text" placeholder="Type text…" maxLength={32}
                     value={textInput}
                     onChange={e => setTextInput(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && addTextStamp()}/>
              <div className="sk-stamp-text-row">
                <select value={textFont} onChange={e => setTextFont(e.target.value)}>
                  {STAMP_FONTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}/>
                <button className="btn sm primary" onClick={addTextStamp}>Add</button>
              </div>
            </div>

            <div className="sk-filters-block">
              <div className="sk-stamp-kit-h">Filter</div>
              <div className="sk-filter-row">
                {FILTERS.map(f => (
                  <button key={f.id}
                    className={cx('sk-filter-chip', sheet.filter === f.id && 'active')}
                    onClick={() => updateSheet({filter: f.id})}>{f.name}</button>
                ))}
              </div>
            </div>

            <button className="btn sm" style={{width: '100%', marginTop: 8}}
                    onClick={() => setStamps([])}>Clear Stamps</button>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}

window.EditorScreen = EditorScreen;
