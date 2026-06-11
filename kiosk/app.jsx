// Root app — snap-station kiosk port.
// State rules: settings/credits/gallery/attendant live in SnapStore (ss.v1.*);
// React keeps render mirrors only. Screen state is never persisted — the kiosk
// always boots to attract. Sheet design state persists under ss.v1.sheet.

SnapStore.migrate(); // one-time migration of the prototype's sk_* keys

function App() {
  const [settings, setSettings] = useSettings();
  const [screen, setScreen] = useState('attract');
  const [snaps, setSnaps] = useState(() => SnapStore.getGallery().slice().reverse()); // newest first
  const [selection, setSelection] = useState([]);
  const [credits, refreshCredits] = useCredits();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheet, setSheet] = useLocalStorage('ss.v1.sheet', {
    layoutId: 'quad',
    bg: 'none',
    frame: 'rounded',
    filter: 'none',
    paperColor: '#faf7ef',
    kissCut: false,
    copies: 1,
    stamps: []
  });
  const [editOpen, setEditOpen] = useState(false);

  // Apply theme + bezel tokens
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.style.setProperty('--bezel-radius', settings.bezelRadius + 'px');
    SoundFX.setEnabled(settings.soundOn);
  }, [settings]);

  // Session stat: bumped each time the kiosk leaves attract.
  const prevScreenRef = useRef('attract');
  useEffect(() => {
    if (prevScreenRef.current === 'attract' && screen !== 'attract') {
      const att = SnapStore.getAttendant();
      SnapStore.setAttendant({ stats: { ...att.stats, sessions: ((att.stats && att.stats.sessions) || 0) + 1 } });
    }
    prevScreenRef.current = screen;
  }, [screen]);

  // Idle timeout: 120 s without input on any non-attract screen → attract.
  const idleReset = useIdleTimeout(screen !== 'attract', useCallback(() => {
    SoundFX.back();
    setScreen('attract');
  }, []));

  // Gallery write path: capture → SnapStore + React mirror.
  const handleCapture = useCallback((dataUrl) => {
    const entry = {
      id: 'snap-' + Date.now() + '-' + Math.floor(Math.random() * 1e6),
      dataUrl, kind: 'photo', ts: Date.now(),
    };
    SnapStore.addToGallery(entry);
    setSnaps(prev => [entry, ...prev].slice(0, SnapStore.GALLERY_CAP));
  }, []);

  // Classic-page interop: pull the snapstation-export payload into the gallery.
  const handleImportClassic = useCallback(() => {
    const payload = SnapStore.readExportPayload();
    if (!payload) return 0;
    const entries = payload.images.map((img, i) => {
      const entry = {
        id: 'import-' + Date.now() + '-' + i,
        dataUrl: img, kind: 'photo', ts: Date.now(),
      };
      SnapStore.addToGallery(entry);
      return entry;
    });
    SnapStore.clearExportPayload();
    setSnaps(SnapStore.getGallery().slice().reverse());
    return entries.length;
  }, []);

  const handleClearGallery = useCallback(() => {
    SnapStore.clearGallery();
    setSnaps([]);
    setSelection([]);
  }, []);

  // Edit-mode protocol
  useEffect(() => {
    const fn = (e) => {
      if (e.data?.type === '__activate_edit_mode') setEditOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setEditOpen(false);
    };
    window.addEventListener('message', fn);
    window.parent.postMessage({type: '__edit_mode_available'}, '*');
    return () => window.removeEventListener('message', fn);
  }, []);

  // Persist settings (SnapStore) + echo to host for the edit-mode protocol.
  const setSettingsWithPersist = (next) => {
    setSettings(next);
    window.parent.postMessage({type: '__edit_mode_set_keys', edits: next}, '*');
  };

  // Keyboard routing
  useKeyboard(useCallback((e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    const map = {'1':'capture','2':'gallery','3':'editor','4':'checkout'};
    if (map[e.key]) { e.preventDefault(); SoundFX.click(); setScreen(map[e.key]); }
    if (e.key === 'Escape') { SoundFX.back(); setScreen('attract'); }
    if (e.key === 'Enter' && screen === 'attract') { setScreen('capture'); SoundFX.confirm(); }
    if (e.key === 'ArrowRight') {
      const order = ['attract','capture','gallery','editor','checkout','print'];
      const i = order.indexOf(screen);
      if (i >= 0 && i < order.length - 1) { SoundFX.click(); setScreen(order[i+1]); }
    }
    if (e.key === 'ArrowLeft') {
      const order = ['attract','capture','gallery','editor','checkout','print'];
      const i = order.indexOf(screen);
      if (i > 0) { SoundFX.back(); setScreen(order[i-1]); }
    }
  }, [screen]));

  // Gamepad routing: D-pad L/R + A/B (also counts as idle-timeout activity)
  useGamepad(useCallback(({button}) => {
    idleReset();
    const order = ['attract','capture','gallery','editor','checkout','print'];
    const i = order.indexOf(screen);
    if (button === 14 && i > 0) { SoundFX.back(); setScreen(order[i-1]); } // D-pad left
    if (button === 15 && i < order.length - 1) { SoundFX.click(); setScreen(order[i+1]); } // D-pad right
    if (button === 0) { SoundFX.confirm(); if (screen === 'attract') setScreen('capture'); } // A
    if (button === 1) { SoundFX.back(); setScreen('attract'); } // B
  }, [screen, idleReset]));

  // Init sound
  useEffect(() => {
    const unlock = () => { SoundFX.setEnabled(SnapStore.getSettings().soundOn); SoundFX.powerOn(); document.removeEventListener('click', unlock); };
    document.addEventListener('click', unlock);
    return () => document.removeEventListener('click', unlock);
  }, []);

  const screens = {
    attract: <AttractScreen setScreen={setScreen}/>,
    capture: <CaptureScreen setScreen={setScreen} snaps={snaps} onCapture={handleCapture}/>,
    gallery: <GalleryScreen setScreen={setScreen} snaps={snaps} selection={selection} setSelection={setSelection} onImportClassic={handleImportClassic}/>,
    editor:  <EditorScreen setScreen={setScreen} selection={selection} snaps={snaps} sheet={sheet} setSheet={setSheet}/>,
    checkout:<CheckoutScreen setScreen={setScreen} sheet={sheet} credits={credits} refreshCredits={refreshCredits}/>,
    print:   <PrintScreen setScreen={setScreen} sheet={sheet} snaps={snaps}/>,
  };

  return (
    <div className="app" data-screen={screen} data-screen-label={`snap-kiosk-${screen}`} data-decor={settings.rentalShelves !== false ? 'rentalShelves' : 'none'}>
      {settings.rentalShelves !== false && <RentalShelves/>}
      <button className="drawer-toggle" onClick={() => { SoundFX.click(); setDrawerOpen(!drawerOpen); }} title="Menu">☰</button>
      <Cabinet tweaks={settings} setTweaks={setSettingsWithPersist}
               screen={screen} setScreen={(s) => { setScreen(s); setDrawerOpen(false); }}
               credits={credits} refreshCredits={refreshCredits}
               onClearGallery={handleClearGallery}
               drawerOpen={drawerOpen}>
        {screens[screen]}
      </Cabinet>
      <TweaksPanel tweaks={settings} setTweaks={setSettingsWithPersist}
                   open={editOpen} onClose={() => setEditOpen(false)}/>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
