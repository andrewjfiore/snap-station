// Gallery screen — demo gradient posters plus real captured snaps (dataURLs).
function GalleryScreen({ setScreen, snaps, selection, setSelection, onImportClassic }) {
  // Real snaps merge in after the demo gradients so an empty kiosk still demos.
  const all = [
    ...DEMO_SNAPS.map(d => ({...d, demo: true})),
    ...snaps,
  ];

  // "Import from Classic" — snapstation-export payload written by the classic pages.
  const [importable, setImportable] = useState(() => SnapStore.readExportPayload());

  const doImport = () => {
    const n = onImportClassic();
    if (n > 0) { SoundFX.confirm(); } else { SoundFX.error(); }
    setImportable(SnapStore.readExportPayload());
  };

  const toggle = (id) => {
    SoundFX.click();
    setSelection(selection.includes(id) ? selection.filter(x => x !== id) : [...selection, id]);
  };

  const sendToEditor = () => {
    if (selection.length === 0) {
      SoundFX.error();
      return;
    }
    SoundFX.confirm();
    setScreen('editor');
  };

  return (
    <ScreenShell crumbs={['Capture', 'Gallery']}
      footer={
        <>
          <div className="btn-hints">
            <span>{selection.length} selected</span>
            <span><kbd>A</kbd> Select all</span>
            <span><kbd>Del</kbd> Remove</span>
          </div>
          <div style={{display: 'flex', gap: 6}}>
            <button className="btn sm" onClick={() => { SoundFX.click(); setSelection(all.map(s => s.id)); }}>Select All</button>
            <button className="btn sm" onClick={() => { SoundFX.click(); setSelection([]); }}>Clear</button>
            <button className="btn primary sm" onClick={sendToEditor}>Send to Designer →</button>
          </div>
        </>
      }>
      {importable && (
        <div className="classic-import">
          <span className="t">⬇ {importable.images.length} PHOTO{importable.images.length === 1 ? '' : 'S'} FROM CLASSIC SNAP STATION</span>
          <button className="btn primary sm" onClick={doImport}>Import from Classic</button>
        </div>
      )}
      {all.length === 0 ? (
        <div style={{textAlign: 'center', padding: 40, opacity: .6}}>
          <div style={{fontFamily: 'var(--font-pixel)', fontSize: 14, letterSpacing: '.15em', marginBottom: 8}}>NO SNAPS YET</div>
          <div style={{fontSize: 13}}>Head back to Capture to take your first photo.</div>
        </div>
      ) : (
        <div className="gallery-grid">
          {all.map(s => (
            <div key={s.id} className={cx('snap', selection.includes(s.id) && 'selected')}
                 onClick={() => toggle(s.id)}>
              {s.dataUrl ? (
                <img src={s.dataUrl} alt="Captured snap" loading="lazy"/>
              ) : (
                <div className="snap-poster" style={{background: `linear-gradient(135deg, ${s.from}, ${s.to})`}}>
                  {s.label}
                </div>
              )}
              <span className="tag">{String(s.id).slice(-4)}</span>
              <span className="check">{selection.includes(s.id) ? '✓' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </ScreenShell>
  );
}
window.GalleryScreen = GalleryScreen;
