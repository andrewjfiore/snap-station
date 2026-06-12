// Root app — Pokémon Snap Station kiosk.
// Design system: light retail-flagship look (cream backdrop, glass panels,
// Barlow/Mulish, pokéball motifs). Two surfaces: the attract screen and the
// 5-step wizard (Choose Layout → Add Photos → Decorate → Review & Pay → Print).
// State rules: settings/credits/gallery/attendant live in SnapStore (ss.v1.*);
// React keeps render mirrors only. Screen state is never persisted — the kiosk
// always boots to attract. Sheet design state persists under ss.v1.sheet.

SnapStore.migrate(); // one-time migration of the prototype's sk_* keys

const WIZ_STEPS = [
  { n: 1, label: 'Choose Layout' },
  { n: 2, label: 'Add Photos' },
  { n: 3, label: 'Decorate' },
  { n: 4, label: 'Review & Pay' },
  { n: 5, label: 'Print' },
];

// SnapTheme (design system v4): user theme dots override the three core
// custom properties. Distinct from the design tab's showcase theme cards.
const SNAP_THEMES = {
  snap:   { red: '#EE1515', red2: '#C41313', night: '#0C1446' },
  ocean:  { red: '#1F6FEB', red2: '#1453B0', night: '#06122e' },
  grape:  { red: '#7A5CFF', red2: '#5a3fd6', night: '#1a0f3a' },
  mint:   { red: '#13A36B', red2: '#0e7d52', night: '#06251a' },
  sunset: { red: '#FF7043', red2: '#e8512a', night: '#2a1206' },
  berry:  { red: '#C0272D', red2: '#7A1115', night: '#3a0d12' },
};
function applyTheme(theme) {
  const t = SNAP_THEMES[theme] || SNAP_THEMES.snap;
  const s = document.documentElement.style;
  s.setProperty('--snap-red', t.red);
  s.setProperty('--snap-red-2', t.red2);
  s.setProperty('--night', t.night);
  document.documentElement.setAttribute('data-theme', theme || 'snap');
}

function App() {
  const [settings, setSettings] = useSettings();
  const [screen, setScreen] = useState('attract'); // 'attract' | 'flow'
  const [step, setStep] = useState(1);
  const [snaps, setSnaps] = useState(() => SnapStore.getGallery().slice().reverse()); // newest first
  const [credits, refreshCredits] = useCredits();
  const [a11y, setA11y] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [order, setOrder] = useState(null); // {copies, method} set by step 4
  const [sheet, setSheet] = useLocalStorage('ss.v1.sheet', {
    layoutId: 'quad',
    paperId: '4x6',
    paperColor: '#ffffff',
    wallpaper: 'none',
    filter: 'none',
    kissCut: false,
    copies: 1,
    stamps: [],
    sourceMap: {},
  });

  // Attendant
  const [attendant, setAttendantState] = useState(() => SnapStore.getAttendant());
  const patchAttendant = useCallback((patch) => setAttendantState(SnapStore.setAttendant(patch)), []);
  const [pinOpen, setPinOpen] = useState(false);
  const [attendantOpen, setAttendantOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [addCreditsOpen, setAddCreditsOpen] = useState(null); // null | {need, view, onDone}

  // Theme + body flags
  useEffect(() => { applyTheme(settings.theme); SoundFX.setEnabled(settings.soundOn); }, [settings]);
  useEffect(() => { document.body.classList.toggle('a11y', a11y); }, [a11y]);
  useEffect(() => { document.body.classList.toggle('sound-off', !settings.soundOn); }, [settings.soundOn]);

  // Patch-style sheet update; layout shrink prunes slot photos above the new
  // group count so quad→single doesn't keep orphan sources.
  const updateSheet = useCallback((patch) => {
    setSheet((prev) => {
      let next = { ...prev, ...patch };
      if (patch.layoutId && patch.layoutId !== prev.layoutId) {
        const layout = SHEET_LAYOUTS.find((l) => l.id === patch.layoutId);
        if (layout) {
          const pruned = {};
          Object.keys(prev.sourceMap || {}).forEach((k) => {
            if (Number(k) < layout.groups) pruned[k] = prev.sourceMap[k];
          });
          next.sourceMap = pruned;
        }
      }
      return next;
    });
  }, [setSheet]);

  // Session stat: bumped each time the kiosk leaves attract.
  const prevScreenRef = useRef('attract');
  useEffect(() => {
    if (prevScreenRef.current === 'attract' && screen !== 'attract') {
      const att = SnapStore.getAttendant();
      SnapStore.setAttendant({ stats: { ...att.stats, sessions: ((att.stats && att.stats.sessions) || 0) + 1 } });
      setAttendantState(SnapStore.getAttendant());
    }
    prevScreenRef.current = screen;
  }, [screen]);

  // Idle timeout: 120 s without input on any non-attract screen → attract.
  const idleReset = useIdleTimeout(screen !== 'attract', useCallback(() => {
    SoundFX.back();
    setScreen('attract');
    setStep(1);
  }, []));

  // Gallery write path: capture → SnapStore + React mirror.
  const handleCapture = useCallback((dataUrl) => {
    const entry = {
      id: 'snap-' + Date.now() + '-' + Math.floor(Math.random() * 1e6),
      dataUrl, kind: 'photo', ts: Date.now(),
    };
    SnapStore.addToGallery(entry);
    setSnaps((prev) => [entry, ...prev].slice(0, SnapStore.GALLERY_CAP));
  }, []);

  // Classic-page interop: pull the snapstation-export payload into the gallery.
  const handleImportClassic = useCallback(() => {
    const payload = SnapStore.readExportPayload();
    if (!payload) return 0;
    payload.images.forEach((img, i) => {
      SnapStore.addToGallery({
        id: 'import-' + Date.now() + '-' + i,
        dataUrl: img, kind: 'photo', ts: Date.now(),
      });
    });
    SnapStore.clearExportPayload();
    setSnaps(SnapStore.getGallery().slice().reverse());
    return payload.images.length;
  }, []);

  const handleClearGallery = useCallback(() => {
    SnapStore.clearGallery();
    setSnaps([]);
  }, []);

  // Edit-mode protocol (host dev tool): activating it opens the attendant panel.
  useEffect(() => {
    const fn = (e) => {
      if (e.data?.type === '__activate_edit_mode') setAttendantOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setAttendantOpen(false);
    };
    window.addEventListener('message', fn);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', fn);
  }, []);

  // Persist settings (SnapStore) + echo to host for the edit-mode protocol.
  const setSettingsWithPersist = useCallback((patch) => {
    setSettings(patch);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: patch }, '*');
  }, [setSettings]);

  const startSession = useCallback(() => { setScreen('flow'); setStep(1); }, []);

  // Step-2 exit guard: at least one photo, and empty slots are filled
  // round-robin from the chosen ones so the preview matches the print exactly.
  const tryLeaveStep2 = useCallback(() => {
    const layout = SHEET_LAYOUTS.find((l) => l.id === sheet.layoutId) || SHEET_LAYOUTS[1];
    const map = sheet.sourceMap || {};
    const filledKeys = [];
    for (let g = 0; g < layout.groups; g++) if (map[g]) filledKeys.push(g);
    if (filledKeys.length === 0) {
      SoundFX.error();
      snapToast('info', 'Add at least one photo first — tap a slot to use the camera.');
      return false;
    }
    if (filledKeys.length < layout.groups) {
      const next = { ...map };
      let i = 0;
      for (let g = 0; g < layout.groups; g++) {
        if (!next[g]) { next[g] = map[filledKeys[i % filledKeys.length]]; i++; }
      }
      updateSheet({ sourceMap: next });
      snapToast('info', 'We filled the empty spots with your photos — tap one to change it.');
    }
    return true;
  }, [sheet, updateSheet]);

  const goNext = useCallback(() => {
    if (step === 2 && !tryLeaveStep2()) return;
    SoundFX.confirm();
    setStep((s) => Math.min(5, s + 1));
  }, [step, tryLeaveStep2]);

  const goBack = useCallback(() => {
    SoundFX.back();
    setStep((s) => Math.max(1, s - 1));
  }, []);

  const gotoStep = useCallback((n) => {
    SoundFX.click();
    setScreen('flow');
    setStep(Math.max(1, Math.min(5, n)));
  }, []);

  // Keyboard routing: 1–5 → wizard steps, Escape → attract, Enter starts.
  useKeyboard(useCallback((e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (/^[1-5]$/.test(e.key)) { e.preventDefault(); gotoStep(Number(e.key)); return; }
    if (e.key === 'Escape') { SoundFX.back(); setScreen('attract'); setStep(1); return; }
    if (e.key === 'Enter' && screen === 'attract') { SoundFX.confirm(); startSession(); return; }
    if (screen === 'flow' && e.key === 'ArrowRight' && step < 5) { goNext(); }
    if (screen === 'flow' && e.key === 'ArrowLeft' && step > 1) { goBack(); }
  }, [screen, step, gotoStep, goNext, goBack, startSession]));

  // Gamepad routing: D-pad L/R + A/B (also counts as idle-timeout activity)
  useGamepad(useCallback(({ button }) => {
    idleReset();
    if (button === 0) { SoundFX.confirm(); if (screen === 'attract') startSession(); } // A
    if (button === 1) { SoundFX.back(); setScreen('attract'); setStep(1); }            // B
    if (screen !== 'flow') return;
    if (button === 14 && step > 1) goBack();          // D-pad left
    if (button === 15 && step < 5) goNext();          // D-pad right
  }, [screen, step, idleReset, goNext, goBack, startSession]));

  // Init sound on first interaction
  useEffect(() => {
    const unlock = () => {
      SoundFX.setEnabled(SnapStore.getSettings().soundOn);
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('click', unlock);
    return () => document.removeEventListener('click', unlock);
  }, []);

  const openAttendantGate = useCallback(() => { SoundFX.select(); setPinOpen(true); }, []);

  // Footer Settings (step 1) is attendant-gated: hold 3 s.
  const [settingsRef, settingsProgress] = useHoldUnlock(openAttendantGate);

  const handlePaid = useCallback((o) => {
    setOrder(o);
    setStep(5);
  }, []);

  const startOver = useCallback(() => {
    setOrder(null);
    setScreen('attract');
    setStep(1);
  }, []);

  const stepBody = {
    1: <Step1Layout sheet={sheet} updateSheet={updateSheet}/>,
    2: <Step2Photos sheet={sheet} updateSheet={updateSheet} snaps={snaps}
                    onCapture={handleCapture} onImportClassic={handleImportClassic}/>,
    3: <Step3Decorate sheet={sheet} setSheet={setSheet} updateSheet={updateSheet}/>,
    4: <Step4Pay sheet={sheet} updateSheet={updateSheet} credits={credits}
                 refreshCredits={refreshCredits} onPaid={handlePaid}/>,
    5: <Step5Print sheet={sheet} snaps={snaps} order={order}
                   onStartOver={startOver} onPrintAnother={() => { setOrder(null); setStep(4); }}/>,
  }[step];

  return (
    <div className="app" data-screen={screen === 'attract' ? 'attract' : `step${step}`}
         data-screen-label={`snap-kiosk-${screen === 'attract' ? 'attract' : 'step' + step}`}>
      <SvgDefs/>

      {screen === 'attract' ? (
        <AttractScreen
          onStart={startSession}
          onCollection={() => setCollectionOpen(true)}
          onToken={() => setAddCreditsOpen({ view: 'code' })}
          theme={settings.theme} setTheme={(t) => setSettingsWithPersist({ theme: t })}
          a11y={a11y} setA11y={setA11y}
          soundOn={!!settings.soundOn}
          toggleSound={() => {
            const on = !settings.soundOn;
            SoundFX.setEnabled(on);
            setSettingsWithPersist({ soundOn: on });
            if (on) SoundFX.confirm();
          }}
          onAttendantUnlock={openAttendantGate}/>
      ) : (
        <div className="canvas page is-active" id="page-sticker-ux" data-step={step}>
          {/* Top stepper bar */}
          <div className="wiz-topbar">
            <button className="wiz-icon-btn" id="wiz-home" aria-label="Home"
                    onClick={() => { SoundFX.back(); setScreen('attract'); setStep(1); }}>
              <svg viewBox="0 0 24 24"><use href="#i-home"/></svg>
              Home
            </button>
            <div className="wiz-stepper" role="progressbar" aria-valuemin={1} aria-valuemax={5} aria-valuenow={step}>
              <div className="wiz-stepper__progress" style={{ width: `calc((100% - 56px) * ${(step - 1) / 4})` }}/>
              {WIZ_STEPS.map((s) => (
                <div key={s.n}
                     className={cx('wiz-step', s.n === step && 'is-active', s.n < step && 'is-done')}
                     data-step={s.n}
                     role="button" tabIndex={s.n <= step ? 0 : -1}
                     onClick={() => { if (s.n <= step) { SoundFX.click(); setStep(s.n); } }}>
                  <div className="wiz-step__bubble"><span>{s.n}</span></div>
                  <div className="wiz-step__label">{s.label}</div>
                </div>
              ))}
            </div>
            <button className="wiz-icon-btn" id="wiz-help" aria-label="Help"
                    onClick={() => { SoundFX.click(); setHelpOpen(true); }}>
              <svg viewBox="0 0 24 24"><use href="#i-question"/></svg>
              Help
            </button>
          </div>

          {/* Step body */}
          <div className="wiz-body">
            {stepBody}

            {/* Footer action bar */}
            <div className="wiz-footer">
              {step === 1 ? (
                <button ref={settingsRef} className="btn btn-secondary wiz-settings" id="wiz-back"
                        title="Hold for attendant settings"
                        onClick={() => snapToast('info', 'Hold for 3 seconds to open attendant settings.')}>
                  Settings
                  <HoldRing progress={settingsProgress}/>
                </button>
              ) : step < 5 ? (
                <button className="btn btn-secondary" id="wiz-back" onClick={goBack}>← Back</button>
              ) : <span/>}
              {step <= 3 && (
                <button className="btn btn-primary" id="wiz-next" onClick={goNext}>
                  <span id="wiz-next-label">Next</span>
                  <span className="wiz-footer__chev">›</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ToastHost/>

      {helpOpen && (
        <AlertDialog
          title="Here's how this works."
          body="Pick a layout, add your photos with the camera, decorate with stickers and text, pay your way, and your sticker sheet prints right here. Tap Home any time to start fresh."
          confirmLabel="All set!"
          onCancel={() => setHelpOpen(false)}
          onConfirm={() => { SoundFX.confirm(); setHelpOpen(false); }}/>
      )}

      <PinPadModal
        open={pinOpen}
        title="Attendant PIN"
        hint={attendant.pinHash ? '' : 'Default PIN 0000'}
        onClose={() => setPinOpen(false)}
        onSubmit={(pin) => SnapStore.verifyPin(pin).then((ok) => {
          if (ok) {
            SoundFX.confirm();
            setPinOpen(false);
            setAttendantState(SnapStore.getAttendant());
            setAttendantOpen(true);
          } else {
            SoundFX.error();
          }
          return ok;
        })}/>

      {attendantOpen && (
        <AttendantPanel
          attendant={attendant} patchAttendant={patchAttendant}
          settings={settings} setSettings={setSettingsWithPersist}
          credits={credits} refreshCredits={refreshCredits}
          onClearGallery={handleClearGallery}
          onExit={() => { setAttendantOpen(false); setScreen('attract'); setStep(1); }}
          onClose={() => { SoundFX.back(); setAttendantOpen(false); }}/>
      )}

      {collectionOpen && (
        <CollectionOverlay snaps={snaps}
          onStart={() => { setCollectionOpen(false); startSession(); }}
          onClose={() => setCollectionOpen(false)}/>
      )}

      {addCreditsOpen && (
        <AddCreditsOverlay
          need={addCreditsOpen.need || 0}
          initialView={addCreditsOpen.view || 'card'}
          onDone={() => {
            const cb = addCreditsOpen.onDone;
            setAddCreditsOpen(null);
            refreshCredits();
            if (cb) cb();
          }}
          onClose={() => { setAddCreditsOpen(null); refreshCredits(); }}/>
      )}

      {/* Persistent print-credit balance (hidden on attract: the entries cover it) */}
      {screen !== 'attract' && <CreditPill credits={credits}/>}
      <SnapLeds/>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
