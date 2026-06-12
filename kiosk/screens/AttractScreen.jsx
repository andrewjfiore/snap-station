// ======= AttractScreen — design system v4 attract tab =======
// Cream screen with corner color blobs, wordmark, pulsing pokéball, the big
// START button, the Game Pak insert ritual, three entry paths (My stickers /
// Just looking / Have a token), user theme dots, and the footer controls
// (station label, Privacy / Accessibility / Sound / Attendant).

const ATTRACT_THEME_DOTS = [
  { id: 'snap',   d: '#EE1515', label: 'Classic red' },
  { id: 'ocean',  d: '#1F6FEB', label: 'Ocean blue' },
  { id: 'grape',  d: '#7A5CFF', label: 'Grape' },
  { id: 'mint',   d: '#13A36B', label: 'Mint' },
  { id: 'sunset', d: '#FF7043', label: 'Sunset' },
  { id: 'berry',  d: '#C0272D', label: 'Berry' },
];

// Game Pak insert ritual — tapping the slot slides a cartridge in, clicks
// home with a flash, then starts the flow (the iconic Blockbuster moment).
function CartInsert({ onStart }) {
  const [phase, setPhase] = useState('idle'); // idle | inserting | inserted
  const busyRef = useRef(false);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const insert = (e) => {
    e.stopPropagation();
    if (busyRef.current) return;
    busyRef.current = true;
    setPhase('inserting');
    SoundFX.click();
    timers.current.push(setTimeout(() => { setPhase('inserted'); SoundFX.confirm(); }, 520));
    timers.current.push(setTimeout(() => { busyRef.current = false; setPhase('idle'); onStart(); }, 1050));
  };

  const cap = phase === 'idle' ? '…or insert your Game Pak'
            : phase === 'inserting' ? 'Loading your game…'
            : 'Game loaded! Starting…';

  return (
    <div className={cx('cart-insert', phase === 'inserting' && 'is-inserting', phase === 'inserted' && 'is-inserted')}
         role="button" tabIndex={0} aria-label="Insert your Game Pak to start"
         onClick={insert}
         onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); insert(e); } }}>
      <div className={cx('cart-slot', phase === 'inserted' && 'is-flash')}>
        <div className="cart-cart"><div className="cart-cart__label"/></div>
        <div className="cart-slot__mouth"/>
      </div>
      <span className="cart-insert__cap">{cap}</span>
    </div>
  );
}

function AttractScreen({ onStart, onCollection, onToken, a11y, setA11y, soundOn, toggleSound,
                         onAttendantUnlock, theme, setTheme }) {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [badgeRef, badgeProgress] = useHoldUnlock(onAttendantUnlock);

  const stop = (fn) => (e) => { e.stopPropagation(); fn(e); };

  return (
    <div className="canvas page is-active" id="page-attract" data-testid="attract">
      <div className="attract-scene" role="button" tabIndex={0}
           aria-label="Tap to start: take photos and make stickers"
           onClick={() => { SoundFX.click(); onStart(); }}
           onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { SoundFX.confirm(); onStart(); } }}>
        <h1 className="attract-title">Pokémon</h1>
        <div className="attract-sub">SNAP STATION</div>
        <div className="attract-pb-pulse"><svg><use href="#pb"/></svg></div>

        <button className="attract-start" type="button" aria-label="Start"
                onClick={stop(() => { SoundFX.confirm(); onStart(); })}>
          <span className="attract-start__big">START</span>
          <span className="attract-start__small">Tap to take your photos!</span>
        </button>

        <CartInsert onStart={onStart}/>

        <div className="attract-entries" onClick={(e) => e.stopPropagation()}>
          <button className="attract-entry attract-entry--primary" type="button"
                  onClick={() => { SoundFX.select(); onCollection(); }}>
            <svg viewBox="0 0 24 24"><use href="#i-sparkle"/></svg>My stickers
          </button>
          <button className="attract-entry" type="button"
                  onClick={() => { SoundFX.click(); onStart(); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>Just looking
          </button>
          <button className="attract-entry" type="button"
                  onClick={() => { SoundFX.select(); onToken(); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round"><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6z"/></svg>Have a token
          </button>
        </div>
      </div>

      <div className="attract-foot">
        <span ref={badgeRef} className="station-badge" role="button" tabIndex={0}
              aria-label="Snap Station Celadon Mall — hold for attendant access"
              title="Hold to unlock attendant panel">
          Snap Station · Celadon Mall
          <HoldRing progress={badgeProgress}/>
        </span>
        <div className="attract-themes" onClick={(e) => e.stopPropagation()}>
          <span className="attract-themes__label">Theme</span>
          {ATTRACT_THEME_DOTS.map((t) => (
            <button key={t.id}
                    className={cx('attract-theme-dot', theme === t.id && 'is-active')}
                    style={{ '--d': t.d }} aria-label={t.label}
                    onClick={() => { SoundFX.select(); setTheme(t.id); }}/>
          ))}
        </div>
        <div className="attract-ctls">
          <button onClick={stop(() => { SoundFX.click(); setPrivacyOpen(true); })}>
            <svg><use href="#i-lock"/></svg>Privacy
          </button>
          <button aria-pressed={a11y}
                  onClick={stop(() => { SoundFX.select(); setA11y(!a11y); })}>
            Accessibility
          </button>
          <button aria-pressed={soundOn} onClick={stop(() => toggleSound())}>
            Sound {soundOn ? 'On' : 'Off'}
          </button>
          <button className="attract-attendant"
                  onClick={stop(() => { SoundFX.click(); onAttendantUnlock(); })}>
            <svg><use href="#i-lock"/></svg>Attendant
          </button>
        </div>
      </div>

      {privacyOpen && <PrivacyCard onClose={() => setPrivacyOpen(false)}/>}
    </div>
  );
}
window.AttractScreen = AttractScreen;
