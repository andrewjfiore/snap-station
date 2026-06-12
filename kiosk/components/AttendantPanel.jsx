// ======= AttendantPanel.jsx — PIN gate + attendant panel =======
// Entry: hold the Settings button (wizard footer) or the station label
// (attract footer) for 3 s (SnapAttendantLock) → 4-digit PIN pad → panel.
// Visual language from the design system's admin tab (admin-pill, stat cards,
// theme cards) on a glass canvas.

// Themes from the design tab's CHOOSE YOUR THEME strip. The html.theme-* class
// drives the CSS custom-property overrides in designsystem.css.
const DS_THEMES = [
  { id: 'pokemon-center', name: 'Pokémon Center', tag: 'Default', ink: '#fff',
    polys: [['0,0 120,0 0,80', '#EE1515'], ['120,0 200,0 200,100 140,60', '#FFCB05'], ['0,80 140,60 200,100 0,100', '#1F3EAF'], ['120,0 140,60 0,80', '#F6F2E7']] },
  { id: 'blockbuster', name: 'Blockbuster', tag: 'Great Ball · Late-fee', ink: '#FFB81C',
    polys: [['0,0 120,0 0,80', '#1F3F97'], ['120,0 200,0 200,100 140,60', '#FFB81C'], ['0,80 140,60 200,100 0,100', '#C0272D'], ['120,0 140,60 0,80', '#F2E6C8']] },
  { id: 'n64', name: 'N64 JP Box', tag: 'Ultra Ball · Chroma', ink: '#EFCC3B',
    polys: [['0,0 120,0 0,80', '#2C2677'], ['120,0 200,0 200,100 140,60', '#EFCC3B'], ['0,80 140,60 200,100 0,100', '#E7354A'], ['120,0 140,60 0,80', '#24A346']] },
  { id: 'switch', name: 'Nintendo Switch', tag: 'Quick Ball · Joy-Con', ink: '#fff',
    polys: [['0,0 120,0 0,80', '#00C3E3'], ['120,0 200,0 200,100 140,60', '#FF4554'], ['0,80 140,60 200,100 0,100', '#414548'], ['120,0 140,60 0,80', '#989898']] },
  { id: 'arcade-pss', name: 'Arcade PSS', tag: 'Master Ball · 1999', ink: '#FFCE1F',
    polys: [['0,0 120,0 0,80', '#144CA3'], ['120,0 200,0 200,100 140,60', '#FFCE1F'], ['0,80 140,60 200,100 0,100', '#D93432'], ['120,0 140,60 0,80', '#A7C74A']] },
];
window.DS_THEMES = DS_THEMES;

// 4-digit PIN pad — numeric keypad from the payment tab, focus-trapped.
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
        setMsg("Let's try that again — wrong PIN.");
        setDigits('');
        setTimeout(() => setShake(false), 450);
      }
    });
  }, [onSubmit]);

  const push = (d) => {
    if (busy) return;
    SoundFX.click();
    setDigits((prev) => {
      const next = (prev + d).slice(0, 4);
      if (next.length === 4) submit(next);
      return next;
    });
  };
  const backspace = () => { SoundFX.back(); setDigits((prev) => prev.slice(0, -1)); };
  const clear = () => { SoundFX.back(); setDigits(''); };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (/^[0-9]$/.test(e.key)) { e.preventDefault(); push(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); backspace(); }
    else if (e.key === 'Tab') {
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
        <span className="admin-pill">ATTENDANT</span>
        <h2 className="pin-title">{title || 'Enter PIN'}</h2>
        <div className="pin-dots" aria-label={`${digits.length} of 4 digits entered`}>
          {[0, 1, 2, 3].map((i) => <span key={i} className={cx('dot', i < digits.length && 'filled')}/>)}
        </div>
        <div className="keypad pin-keys">
          {['1','2','3','4','5','6','7','8','9'].map((d) => (
            <button key={d} className="keypad__key pin-key" aria-label={`digit ${d}`} onClick={() => push(d)}>{d}</button>
          ))}
          <button className="keypad__key pin-key alt" aria-label="clear" onClick={clear}>CLR</button>
          <button className="keypad__key pin-key" aria-label="digit 0" onClick={() => push('0')}>0</button>
          <button className="keypad__key pin-key alt" aria-label="backspace" onClick={backspace}>
            <svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" d="M8 5h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8l-5-7z M11 10l5 5 M16 10l-5 5"/></svg>
          </button>
        </div>
        <div className="pin-msg" aria-live="polite">{busy ? 'Checking…' : msg}</div>
        <button className="btn btn-tertiary pin-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// The attendant panel — one well-organized panel with the existing controls.
// Supply meter row: level band coloring + restock.
function SupplyRow({ label, value, max, level, onRestock }) {
  return (
    <div className="att-supply">
      <div className="att-supply__head">
        <span className="field-label">{label}</span>
        <span className={cx('att-supply__count', `is-${level}`)}>{value} / {max}</span>
      </div>
      <div className="att-supply__bar">
        <div className={cx('att-supply__fill', `is-${level}`)} style={{ width: `${Math.round(value / max * 100)}%` }}/>
      </div>
      <button className="btn btn-secondary att-supply__btn" onClick={onRestock}>Reload {label.toLowerCase()}</button>
    </div>
  );
}

function AttendantPanel({ attendant, patchAttendant, settings, setSettings,
                          credits, refreshCredits, onClearGallery, onExit, onClose }) {
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [supplies, setSupplies] = useState(() => SnapStore.suppliesSnapshot());
  const [tokens, setTokens] = useState(() => SnapStore.getTokens());
  const [newCode, setNewCode] = useState('');
  const [newCodeCredits, setNewCodeCredits] = useState(3);

  const restock = (which) => {
    SoundFX.confirm();
    SnapStore.restockSupplies(which);
    setSupplies(SnapStore.suppliesSnapshot());
    snapToast('success', `All set! ${which === 'paper' ? 'Paper' : 'Ribbon'} reloaded.`);
  };

  const addCode = () => {
    const code = newCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 6 || code.length > 8) { SoundFX.error(); snapToast('error', 'Codes are 6 to 8 letters/numbers.'); return; }
    const t = SnapStore.getTokens();
    SnapStore.setTokens({ codes: { ...t.codes, [code]: Math.max(1, newCodeCredits) } });
    setTokens(SnapStore.getTokens());
    setNewCode('');
    SoundFX.confirm();
    snapToast('success', `Code ${code} is live — worth ${Math.max(1, newCodeCredits)} credit${newCodeCredits === 1 ? '' : 's'}.`);
  };

  const grant = (n) => {
    SoundFX.coin();
    SnapPayment.grantCredits(n);
    refreshCredits();
  };

  // Simulated Snap Card sale through the payment provider registry —
  // buyCard() charges pricePerSheetCents (mock) and grants creditsPerCard.
  const sellCard = () => {
    SnapPayment.buyCard().then((res) => {
      if (res.success) {
        SoundFX.coin();
        refreshCredits();
        snapToast('success', `Snap Card sold — ${attendant.creditsPerCard} credits added.`);
      } else {
        SoundFX.error();
        snapToast('error', "Let's try that again. The sale didn't go through.");
      }
    });
  };

  return (
    <div className="kiosk-scrim attendant-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="attendant-drawer canvas" role="dialog" aria-modal="true" aria-label="Attendant panel">
        <div className="att-head">
          <div>
            <span className="admin-pill">ADMIN PANEL</span>
            <h2 className="att-title">Attendant</h2>
          </div>
          <button className="icon-btn ic-gear att-close" onClick={onClose} aria-label="Close attendant panel">
            <svg style={{ width: 18, height: 18, color: '#1a1a1a' }}><use href="#i-x"/></svg>
          </button>
        </div>

        <div className="stat-cards att-stats">
          <div className="stat-card">
            <div className="stat-icon stat-icon--blue"><svg><use href="#i-print"/></svg></div>
            <div className="stat-body">
              <div className="stat-label">PRINTS</div>
              <div className="stat-value">{(attendant.stats && attendant.stats.prints) || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon--green"><svg><use href="#i-users"/></svg></div>
            <div className="stat-body">
              <div className="stat-label">SESSIONS</div>
              <div className="stat-value">{(attendant.stats && attendant.stats.sessions) || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon--yellow"><svg><use href="#pb"/></svg></div>
            <div className="stat-body">
              <div className="stat-label">CREDITS</div>
              <div className="stat-value">{credits}</div>
            </div>
          </div>
        </div>

        <div className="att-grid">
          <section className="att-section">
            <h3 className="label">Credits</h3>
            <div className="att-actions">
              <button className="btn btn-secondary" onClick={() => grant(1)}>+1 Credit</button>
              <button className="btn btn-secondary" onClick={() => grant(5)}>+5 Credits</button>
              <button className="btn btn-secondary" onClick={sellCard}>
                Sell Snap Card · +{attendant.creditsPerCard}
              </button>
            </div>
            <label className="att-row" htmlFor="att-freeplay">
              <span className="field-label">Free play</span>
              <input id="att-freeplay" type="checkbox" className="att-toggle" checked={!!attendant.freePlay}
                     onChange={(e) => { SoundFX.select(); patchAttendant({ freePlay: e.target.checked }); }}/>
              <span className={cx('toggle-dot', attendant.freePlay && 'on')} aria-hidden="true">
                {attendant.freePlay && (
                  <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5 9-11"/></svg>
                )}
              </span>
            </label>
          </section>

          <section className="att-section">
            <h3 className="label">Pricing</h3>
            <div className="att-row">
              <label className="field-label" htmlFor="att-price">Price / sheet (¢)</label>
              <input id="att-price" className="text-field" type="number" min="0" step="25"
                     value={attendant.pricePerSheetCents}
                     onChange={(e) => patchAttendant({ pricePerSheetCents: Math.max(0, parseInt(e.target.value, 10) || 0) })}/>
            </div>
            <div className="att-row">
              <label className="field-label" htmlFor="att-cpc">Credits / card</label>
              <input id="att-cpc" className="text-field" type="number" min="1"
                     value={attendant.creditsPerCard}
                     onChange={(e) => patchAttendant({ creditsPerCard: Math.max(1, parseInt(e.target.value, 10) || 1) })}/>
            </div>
          </section>

          <section className="att-section">
            <h3 className="label">Printing</h3>
            <div className="att-row">
              <label className="field-label" htmlFor="att-printsrv">Print server URL</label>
              <input id="att-printsrv" className="text-field" type="url" placeholder="http://localhost:8631"
                     value={settings.printServerUrl || ''}
                     onChange={(e) => setSettings({ printServerUrl: e.target.value })}/>
            </div>
            <div className="att-row">
              <label className="field-label" htmlFor="att-shareurl">QR share URL</label>
              <input id="att-shareurl" className="text-field" type="url" placeholder="(station site)"
                     value={settings.shareUrl || ''}
                     onChange={(e) => setSettings({ shareUrl: e.target.value })}/>
            </div>
            <label className="att-row" htmlFor="att-sound">
              <span className="field-label">Sound</span>
              <input id="att-sound" type="checkbox" className="att-toggle" checked={!!settings.soundOn}
                     onChange={(e) => { SoundFX.setEnabled(e.target.checked); setSettings({ soundOn: e.target.checked }); }}/>
              <span className={cx('toggle-dot', settings.soundOn && 'on')} aria-hidden="true">
                {settings.soundOn && (
                  <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5 9-11"/></svg>
                )}
              </span>
            </label>
          </section>

          <section className="att-section" data-testid="att-supplies">
            <h3 className="label">Supplies</h3>
            <SupplyRow label="Paper" value={supplies.paper} max={supplies.paperMax}
                       level={supplies.paperLevel} onRestock={() => restock('paper')}/>
            <SupplyRow label="Ribbon" value={supplies.ribbon} max={supplies.ribbonMax}
                       level={supplies.ribbonLevel} onRestock={() => restock('ribbon')}/>
            <div className="att-row">
              <span className="field-label">Sheets printable</span>
              <strong>{supplies.remaining}</strong>
            </div>
            <div className="att-row">
              <span className="field-label">Sold this session</span>
              <strong>{supplies.soldToday}</strong>
            </div>
            <div className="att-row">
              <span className="field-label">Margin / sheet</span>
              <strong>{centsToUsd(Math.max(0, attendant.pricePerSheetCents - supplies.unitCostCents))}</strong>
            </div>
          </section>

          <section className="att-section" data-testid="att-tokens">
            <h3 className="label">Snap Pass codes</h3>
            <p className="att-note">Sell codes for cash — one-time use, each worth its credit value.</p>
            <div className="att-token-list">
              {Object.entries(tokens.codes).map(([code, n]) => (
                <span key={code} className={cx('att-token', tokens.used.includes(code) && 'is-used')}
                      title={tokens.used.includes(code) ? 'Already redeemed' : `Worth ${n} credit${n === 1 ? '' : 's'}`}>
                  {code} · {n}{tokens.used.includes(code) ? ' ✓' : ''}
                </span>
              ))}
            </div>
            <div className="att-row">
              <input className="text-field" type="text" maxLength={8} placeholder="NEWCODE1"
                     value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())}/>
              <input className="text-field att-token-credits" type="number" min="1" max="20"
                     value={newCodeCredits}
                     onChange={(e) => setNewCodeCredits(Math.max(1, parseInt(e.target.value, 10) || 1))}/>
              <button className="btn btn-secondary" onClick={addCode}>Add code</button>
            </div>
          </section>

          <section className="att-section">
            <h3 className="label">Maintenance</h3>
            <label className="att-row" htmlFor="att-lock">
              <span className="field-label">Production lock</span>
              <input id="att-lock" type="checkbox" className="att-toggle" checked={!!attendant.productionLock}
                     onChange={(e) => {
                       patchAttendant({ productionLock: e.target.checked });
                       snapToast('info', e.target.checked
                         ? 'Locked: demo hints (PIN, sample codes, demo card) are hidden.'
                         : 'Unlocked: demo hints visible again.');
                     }}/>
              <span className={cx('toggle-dot', attendant.productionLock && 'on')} aria-hidden="true">
                {attendant.productionLock && (
                  <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5 9-11"/></svg>
                )}
              </span>
            </label>
            <div className="att-actions">
              <button className="btn btn-danger-ghost" onClick={() => setConfirmClear(true)}>Clear Gallery</button>
              <button className="btn btn-secondary" onClick={() => { SoundFX.click(); setChangePinOpen(true); }}>Change PIN</button>
              <button className="btn btn-secondary" onClick={() => { SoundFX.back(); onExit(); }}>Exit to Attract</button>
            </div>
          </section>
        </div>

        <section className="att-section att-themes-dots" aria-label="Theme selector">
          <h3 className="label">Station theme</h3>
          <div className="attract-themes att-theme-row">
            {[['snap','#EE1515','Classic red'],['ocean','#1F6FEB','Ocean blue'],['grape','#7A5CFF','Grape'],
              ['mint','#13A36B','Mint'],['sunset','#FF7043','Sunset'],['berry','#C0272D','Berry']].map(([id, d, label]) => (
              <button key={id}
                      className={cx('attract-theme-dot', settings.theme === id && 'is-active')}
                      style={{ '--d': d }} aria-label={label} title={label}
                      onClick={() => { SoundFX.select(); setSettings({ theme: id }); }}/>
            ))}
          </div>
        </section>
      </div>

      <PinPadModal
        open={changePinOpen}
        title="New PIN"
        hint="Enter a new 4-digit PIN"
        onClose={() => setChangePinOpen(false)}
        onSubmit={(pin) => SnapStore.setPin(pin).then(() => {
          SoundFX.confirm();
          patchAttendant({}); // refresh pinHash into the local mirror
          setChangePinOpen(false);
          snapToast('success', 'All set! PIN updated.');
          return true;
        })}/>

      {confirmClear && (
        <AlertDialog danger
          title="Clear every photo in the gallery?"
          body="This can't be undone."
          cancelLabel="Cancel" confirmLabel="Clear"
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            setConfirmClear(false);
            SoundFX.back();
            onClearGallery();
            snapToast('info', 'Gallery cleared.');
          }}/>
      )}
    </div>
  );
}

window.PinPadModal = PinPadModal;
window.AttendantPanel = AttendantPanel;
