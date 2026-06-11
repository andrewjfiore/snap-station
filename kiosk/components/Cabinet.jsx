// Cabinet + CRT frame wrapper
function Cabinet({ children, tweaks, setTweaks, screen, setScreen, credits, refreshCredits, onClearGallery, drawerOpen }) {
  const [attendant, setAttendantState] = useState(() => SnapStore.getAttendant());
  const patchAttendant = useCallback((patch) => {
    setAttendantState(SnapStore.setAttendant(patch));
  }, []);
  const refreshAttendant = useCallback(() => setAttendantState(SnapStore.getAttendant()), []);

  const [pinOpen, setPinOpen] = useState(false);
  const [attendantOpen, setAttendantOpen] = useState(false);

  const onBadgeUnlock = useCallback(() => {
    SoundFX.select();
    setPinOpen(true);
  }, []);

  return (
    <div className="stage">
      <aside className={cx('rail left', drawerOpen && 'open-drawer')}>
        <SidePanelLeft screen={screen} setScreen={setScreen} tweaks={tweaks} />
        {drawerOpen && (
          <SidePanelRight tweaks={tweaks} setTweaks={setTweaks}
                          credits={credits} refreshCredits={refreshCredits}
                          attendant={attendant}/>
        )}
      </aside>

      <div className="cabinet">
        <div className="nameplate">
          <div className="logo">
            <span className="snap-wordmark sm">Snap<span className="alt"> Station</span></span>
          </div>
          <div className="cluster">
            <span className="power-led" aria-label="power on" />
            <StationBadge onUnlock={onBadgeUnlock}/>
            <span className="led">CR {String(credits).padStart(3,'0')}</span>
          </div>
        </div>

        <div className="crt-shell">
          <div className={cx('crt-frame', !tweaks.scanlines && 'no-scanlines')}
               style={{ '--crt-intensity': tweaks.crtIntensity }}>
            {children}
          </div>
        </div>

        <div className="deck">
          <div className="pad">
            <button className="big-btn num" onClick={() => { SoundFX.click(); setScreen('capture'); }}>① Capture</button>
            <button className="big-btn num" onClick={() => { SoundFX.click(); setScreen('gallery'); }}>② Gallery</button>
            <button className="big-btn num" onClick={() => { SoundFX.click(); setScreen('editor'); }}>③ Design</button>
            <button className="big-btn red" onClick={() => { SoundFX.confirm(); setScreen('checkout'); }}>④ Print</button>
          </div>
          <div className="printer-slot">
            <span>PRINT OUTPUT</span>
            <div className="mouth" />
          </div>
        </div>
      </div>

      <aside className="rail right">
        <SidePanelRight tweaks={tweaks} setTweaks={setTweaks}
                        credits={credits} refreshCredits={refreshCredits}
                        attendant={attendant}/>
      </aside>

      <PinPadModal
        open={pinOpen}
        title="Attendant PIN"
        hint={attendant.pinHash ? '' : 'DEFAULT PIN 0000'}
        onClose={() => setPinOpen(false)}
        onSubmit={(pin) => SnapStore.verifyPin(pin).then((ok) => {
          if (ok) {
            SoundFX.confirm();
            setPinOpen(false);
            refreshAttendant();
            setAttendantOpen(true);
          } else {
            SoundFX.error();
          }
          return ok;
        })}/>

      {attendantOpen && (
        <AttendantDrawer
          attendant={attendant} patchAttendant={patchAttendant}
          tweaks={tweaks} setTweaks={setTweaks}
          credits={credits} refreshCredits={refreshCredits}
          onClearGallery={onClearGallery}
          setScreen={setScreen}
          onClose={() => { SoundFX.back(); setAttendantOpen(false); }}/>
      )}
    </div>
  );
}

// Station badge — hold 3 s (SnapAttendantLock) to reach the attendant PIN pad.
function StationBadge({ onUnlock }) {
  const ref = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!ref.current || !window.SnapAttendantLock) return;
    const handle = SnapAttendantLock.attach(ref.current, {
      holdMs: 3000,
      onProgress: setProgress,
      onUnlock: () => { setProgress(0); onUnlock(); },
    });
    return () => handle.detach();
  }, [onUnlock]);

  const R = 9, C = 2 * Math.PI * R;
  return (
    <span ref={ref} className="badge station-badge"
          role="button" tabIndex={0}
          aria-label="Station 042 — hold for attendant access"
          title="Hold to unlock attendant panel">
      Station 042
      {progress > 0 && progress < 1 && (
        <span className="hold-ring" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle className="track" cx="12" cy="12" r={R}/>
            <circle cx="12" cy="12" r={R}
                    strokeDasharray={`${(progress * C).toFixed(1)} ${C.toFixed(1)}`}/>
          </svg>
        </span>
      )}
    </span>
  );
}

// 4-digit PIN pad — big touch keys, Silkscreen, focus-trapped.
// onSubmit(pin) -> Promise<boolean>; false shakes + clears for retry.
function PinPadModal({ open, title, hint, onClose, onSubmit }) {
  const [digits, setDigits] = useState('');
  const [shake, setShake] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (open) {
      setDigits(''); setMsg(hint || ''); setShake(false); setBusy(false);
      // Focus the first key once mounted
      requestAnimationFrame(() => {
        boxRef.current?.querySelector('button')?.focus();
      });
    }
  }, [open, hint]);

  const submit = useCallback((pin) => {
    setBusy(true);
    Promise.resolve(onSubmit(pin)).then((ok) => {
      setBusy(false);
      if (!ok) {
        setShake(true);
        setMsg('WRONG PIN — TRY AGAIN');
        setDigits('');
        setTimeout(() => setShake(false), 450);
      }
    });
  }, [onSubmit]);

  const push = (d) => {
    if (busy) return;
    SoundFX.click();
    setDigits(prev => {
      const next = (prev + d).slice(0, 4);
      if (next.length === 4) submit(next);
      return next;
    });
  };
  const backspace = () => { SoundFX.back(); setDigits(prev => prev.slice(0, -1)); };
  const clear = () => { SoundFX.back(); setDigits(''); };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); push(e.key); return; }
    if (e.key === 'Backspace') { e.preventDefault(); backspace(); return; }
    if (e.key === 'Tab') {
      // Focus trap: cycle within the dialog
      const els = Array.from(boxRef.current?.querySelectorAll('button') || []);
      if (els.length === 0) return;
      const i = els.indexOf(document.activeElement);
      e.preventDefault();
      const next = e.shiftKey ? (i <= 0 ? els.length - 1 : i - 1) : (i === els.length - 1 ? 0 : i + 1);
      els[next].focus();
    }
    e.stopPropagation();
  };

  if (!open) return null;
  return (
    <div className="kiosk-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={boxRef} className={cx('pin-pad', shake && 'shake')}
           role="dialog" aria-modal="true" aria-label={title || 'Enter PIN'}
           onKeyDown={onKeyDown}>
        <h2>{title || 'Enter PIN'}</h2>
        <div className="pin-dots" aria-label={`${digits.length} of 4 digits entered`}>
          {[0,1,2,3].map(i => <span key={i} className={cx('dot', i < digits.length && 'filled')}/>)}
        </div>
        <div className="pin-keys">
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button key={d} className="pin-key" aria-label={`digit ${d}`} onClick={() => push(d)}>{d}</button>
          ))}
          <button className="pin-key alt" aria-label="clear" onClick={clear}>CLR</button>
          <button className="pin-key" aria-label="digit 0" onClick={() => push('0')}>0</button>
          <button className="pin-key alt" aria-label="backspace" onClick={backspace}>⌫</button>
        </div>
        <div className="pin-msg" aria-live="polite">{busy ? 'CHECKING…' : msg}</div>
        <button className="btn sm pin-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// Attendant drawer — credits, pricing, free play, stats, gallery, PIN, plus the
// kiosk tweaks (the standalone TweaksPanel stays for the dev edit-mode protocol).
function AttendantDrawer({ attendant, patchAttendant, tweaks, setTweaks, credits, refreshCredits,
                           onClearGallery, setScreen, onClose }) {
  const [changePinOpen, setChangePinOpen] = useState(false);

  const grant = (n) => {
    SoundFX.coin();
    SnapPayment.grantCredits(n);
    refreshCredits();
  };

  return (
    <>
      <div className="attendant-drawer" role="dialog" aria-modal="false" aria-label="Attendant panel">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2>Attendant</h2>
          <button className="btn sm" onClick={onClose} aria-label="Close attendant panel">✕</button>
        </div>

        <div className="att-section">
          <h3>Credits · {credits}</h3>
          <div className="att-actions">
            <button className="btn sm primary" onClick={() => grant(1)}>+1 Credit</button>
            <button className="btn sm primary" onClick={() => grant(5)}>+5 Credits</button>
          </div>
          <div className="att-row">
            <label htmlFor="att-freeplay">Free play</label>
            <input id="att-freeplay" type="checkbox" checked={!!attendant.freePlay}
                   onChange={e => { SoundFX.select(); patchAttendant({freePlay: e.target.checked}); }}/>
          </div>
        </div>

        <div className="att-section">
          <h3>Pricing</h3>
          <div className="att-row">
            <label htmlFor="att-price">Price / sheet (¢)</label>
            <input id="att-price" type="number" min="0" step="25" value={attendant.pricePerSheetCents}
                   onChange={e => patchAttendant({pricePerSheetCents: Math.max(0, parseInt(e.target.value, 10) || 0)})}/>
          </div>
          <div className="att-row">
            <label htmlFor="att-cpc">Credits / card</label>
            <input id="att-cpc" type="number" min="1" value={attendant.creditsPerCard}
                   onChange={e => patchAttendant({creditsPerCard: Math.max(1, parseInt(e.target.value, 10) || 1)})}/>
          </div>
        </div>

        <div className="att-section">
          <h3>Printing</h3>
          <div className="att-row">
            <label htmlFor="att-printsrv">Print server URL</label>
            <input id="att-printsrv" type="url" placeholder="http://localhost:631"
                   value={tweaks.printServerUrl || ''}
                   onChange={e => setTweaks({...tweaks, printServerUrl: e.target.value})}/>
          </div>
        </div>

        <div className="att-section">
          <h3>Stats</h3>
          <div className="att-stats">
            <div className="att-stat">
              <div className="v">{(attendant.stats && attendant.stats.prints) || 0}</div>
              <div className="k">Prints</div>
            </div>
            <div className="att-stat">
              <div className="v">{(attendant.stats && attendant.stats.sessions) || 0}</div>
              <div className="k">Sessions</div>
            </div>
          </div>
        </div>

        <div className="att-section">
          <h3>Kiosk Look &amp; Feel</h3>
          <div className="att-row">
            <label htmlFor="att-theme">Theme</label>
            <select id="att-theme" value={tweaks.theme} onChange={e => { SoundFX.select(); setTweaks({...tweaks, theme: e.target.value}); }}>
              {THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="att-row">
            <label htmlFor="att-crt">CRT intensity</label>
            <input id="att-crt" type="range" min="0" max="1" step="0.05" value={tweaks.crtIntensity}
                   onChange={e => setTweaks({...tweaks, crtIntensity: parseFloat(e.target.value)})}/>
          </div>
          <div className="att-row">
            <label htmlFor="att-bezel">Bezel radius</label>
            <input id="att-bezel" type="range" min="6" max="40" step="1" value={tweaks.bezelRadius}
                   onChange={e => setTweaks({...tweaks, bezelRadius: parseInt(e.target.value, 10)})}/>
          </div>
          <div className="att-row">
            <label htmlFor="att-sound">Sound</label>
            <input id="att-sound" type="checkbox" checked={!!tweaks.soundOn}
                   onChange={e => { SoundFX.setEnabled(e.target.checked); setTweaks({...tweaks, soundOn: e.target.checked}); }}/>
          </div>
          <div className="att-row">
            <label htmlFor="att-scan">Scanlines</label>
            <input id="att-scan" type="checkbox" checked={!!tweaks.scanlines}
                   onChange={e => setTweaks({...tweaks, scanlines: e.target.checked})}/>
          </div>
          <div className="att-row">
            <label htmlFor="att-shelves">Wallpaper</label>
            <input id="att-shelves" type="checkbox" checked={tweaks.rentalShelves !== false}
                   onChange={e => setTweaks({...tweaks, rentalShelves: e.target.checked})}/>
          </div>
          <div className="att-row">
            <label htmlFor="att-chrome">Chrome style</label>
            <select id="att-chrome" value={tweaks.chromeStyle || 'brushed'}
                    onChange={e => setTweaks({...tweaks, chromeStyle: e.target.value})}>
              <option value="brushed">Brushed</option>
              <option value="matte">Matte</option>
              <option value="chrome">Chrome</option>
            </select>
          </div>
        </div>

        <div className="att-section">
          <h3>Maintenance</h3>
          <div className="att-actions">
            <button className="btn sm danger" onClick={() => { SoundFX.back(); onClearGallery(); }}>Clear Gallery</button>
            <button className="btn sm" onClick={() => { SoundFX.click(); setChangePinOpen(true); }}>Change PIN</button>
            <button className="btn sm" onClick={() => { SoundFX.back(); setScreen('attract'); onClose(); }}>Exit to Attract</button>
          </div>
        </div>
      </div>

      <PinPadModal
        open={changePinOpen}
        title="New PIN"
        hint="ENTER NEW 4-DIGIT PIN"
        onClose={() => setChangePinOpen(false)}
        onSubmit={(pin) => SnapStore.setPin(pin).then(() => {
          SoundFX.confirm();
          patchAttendant({}); // refresh pinHash into local mirror
          setChangePinOpen(false);
          return true;
        })}/>
    </>
  );
}

function SidePanelLeft({ screen, setScreen, tweaks }) {
  const items = [
    { id: 'attract', label: 'Home', ico: '⌂' },
    { id: 'capture', label: 'Capture', ico: '◉' },
    { id: 'gallery', label: 'Gallery', ico: '▤' },
    { id: 'editor', label: 'Design Sheet', ico: '▦' },
    { id: 'checkout', label: 'Checkout', ico: '⌘' },
    { id: 'print', label: 'Printing', ico: '⎙' },
  ];
  return (
    <>
      <div className="panel">
        <h3>Flow</h3>
        {items.map(it => (
          <button key={it.id}
                  onClick={() => { SoundFX.click(); setScreen(it.id); }}
                  className="btn"
                  style={{
                    width: '100%', justifyContent: 'flex-start', marginBottom: 4,
                    background: screen === it.id ? 'var(--accent)' : 'rgba(255,255,255,.04)',
                    color: screen === it.id ? '#111' : 'var(--ink)',
                    borderColor: screen === it.id ? 'var(--accent)' : 'rgba(255,255,255,.08)',
                    fontFamily: 'var(--font-pixel)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase'
                  }}>
            <span style={{ width: 18, textAlign: 'center' }}>{it.ico}</span>
            <span>{it.label}</span>
          </button>
        ))}
      </div>
      <div className="panel">
        <h3>Quick Tips</h3>
        <div style={{fontSize: 12, lineHeight: 1.5, opacity: .85}}>
          <p>Use <kbd style={{background:'rgba(0,0,0,.3)',padding:'1px 5px',borderRadius:3,fontFamily:'var(--font-mono)',fontSize:10}}>1–4</kbd> or the chunky buttons below to jump around.</p>
          <p style={{marginTop: 8}}>Press <kbd style={{background:'rgba(0,0,0,.3)',padding:'1px 5px',borderRadius:3,fontFamily:'var(--font-mono)',fontSize:10}}>Space</kbd> to grab a snap.</p>
        </div>
      </div>
    </>
  );
}

function formatCents(cents) {
  return (cents % 100 === 0) ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

function SidePanelRight({ tweaks, setTweaks, credits, refreshCredits, attendant }) {
  const [tappingIdx, setTappingIdx] = useState(null);
  const [lastBought, setLastBought] = useState(null);
  const [buying, setBuying] = useState(false);

  const buy = () => {
    if (buying) return;
    setBuying(true);
    SnapPayment.buyCard().then((res) => {
      setBuying(false);
      if (res.success) {
        SoundFX.coin();
        refreshCredits();
        setLastBought(Math.min(SnapStore.getCredits(), 5) - 1); // index of newly visible card
        setTimeout(() => setLastBought(null), 700);
      } else {
        SoundFX.error();
      }
    });
  };

  const tap = (i) => {
    if (credits <= 0 && !attendant.freePlay) return;
    SoundFX.confirm();
    setTappingIdx(i);
    setTimeout(() => {
      setTappingIdx(null);
      SnapPayment.spendCredit();
      refreshCredits();
    }, 800);
  };

  const shownCards = Math.min(credits, 5);

  return (
    <>
      <div className="panel">
        <h3>Theme</h3>
        <div className="theme-swatches">
          {THEMES.map(t => (
            <div key={t.id}
                 className={cx('theme-swatch', tweaks.theme === t.id && 'active')}
                 onClick={() => { SoundFX.select(); setTweaks({...tweaks, theme: t.id}); }}
                 title={t.name}
                 style={{ background: `linear-gradient(135deg, ${t.colors[0]} 0%, ${t.colors[1]} 50%, ${t.colors[2]} 100%)` }}
            />
          ))}
        </div>
        <div style={{fontSize: 11, opacity: .7, marginTop: 10, fontFamily: 'var(--font-mono)'}}>
          {THEMES.find(t => t.id === tweaks.theme)?.name}
        </div>
      </div>

      <div className="panel">
        <h3>Credits · {credits}</h3>
        {credits === 0 ? (
          <div style={{fontSize: 11, opacity: .7, marginBottom: 10, padding: '12px 8px', textAlign: 'center', fontFamily: 'var(--font-pixel)', letterSpacing: '.1em'}}>
            INSERT CARD<br/>OR BUY ONE
          </div>
        ) : (
          <div className="nfc-shelf" style={{marginBottom: 10}}>
            {[...Array(shownCards)].map((_, i) => (
              <div key={i} className={cx(lastBought === i && 'just-added')}
                   style={{
                     animation: lastBought === i ? 'cardDrop .5s var(--ease-bounce)' : 'none'
                   }}>
                <NFCCard index={i} tapping={tappingIdx === i} onTap={() => tap(i)}/>
              </div>
            ))}
          </div>
        )}
        {credits > 0 && (
          <div className="tap-pad" onClick={() => tap(shownCards - 1)}>
            <span className="ico">⊙</span>
            Tap card to use
          </div>
        )}
        <button className="btn primary" style={{width: '100%', marginTop: 10}}
                onClick={buy} disabled={buying}>
          + Buy Snap Card · {formatCents(attendant.pricePerSheetCents)}
        </button>
      </div>
    </>
  );
}

window.Cabinet = Cabinet;
window.PinPadModal = PinPadModal;
