// ======= AttractScreen — transplanted from the design system's attract tab =======
// Cream screen with corner color blobs (the #page-attract background), centered
// Pokémon SNAP STATION wordmark, pulsing pokéball, "Tap anywhere to start" pill,
// and the footer row: station label (hold 3 s for attendant) + Privacy /
// Accessibility / Sound buttons.

function AttractScreen({ onStart, a11y, setA11y, soundOn, toggleSound, onAttendantUnlock }) {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [badgeRef, badgeProgress] = useHoldUnlock(onAttendantUnlock);

  return (
    <div className="canvas page is-active" id="page-attract" data-testid="attract">
      <div className="attract-scene" role="button" tabIndex={0}
           aria-label="Tap to start a session"
           onClick={() => { SoundFX.confirm(); onStart(); }}
           onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { SoundFX.confirm(); onStart(); } }}>
        <h1 className="attract-title">Pokémon</h1>
        <div className="attract-sub">SNAP STATION</div>
        <div className="attract-pb-pulse"><svg><use href="#pb"/></svg></div>
        <div className="attract-cta">
          <svg viewBox="0 0 24 24"><path d="M12 3v9 M8 7l4-4 4 4 M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Tap anywhere to start
        </div>
      </div>
      <div className="attract-foot">
        <span ref={badgeRef} className="station-badge" role="button" tabIndex={0}
              aria-label="Snap Station Celadon Mall — hold for attendant access"
              title="Hold to unlock attendant panel">
          Snap Station · Celadon Mall
          <HoldRing progress={badgeProgress}/>
        </span>
        <div className="attract-ctls">
          <button onClick={(e) => { e.stopPropagation(); SoundFX.click(); setPrivacyOpen(true); }}>
            <svg><use href="#i-lock"/></svg>Privacy
          </button>
          <button aria-pressed={a11y}
                  onClick={(e) => { e.stopPropagation(); SoundFX.select(); setA11y(!a11y); }}>
            Accessibility
          </button>
          <button aria-pressed={soundOn}
                  onClick={(e) => { e.stopPropagation(); toggleSound(); }}>
            Sound {soundOn ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {privacyOpen && (
        <AlertDialog
          title="Here's how this works."
          body="Photos stay on this station — nothing is uploaded. Your shots live in the kiosk gallery and print right here. An attendant can clear the gallery any time."
          confirmLabel="All set!"
          onCancel={() => setPrivacyOpen(false)}
          onConfirm={() => { SoundFX.confirm(); setPrivacyOpen(false); }}/>
      )}
    </div>
  );
}
window.AttractScreen = AttractScreen;
