// Backdrop decor. Two styles:
//   'shelves' — forced-perspective Blockbuster rental shelves with pointer
//               parallax (restored from the reverted snap-blockbuster-scene)
//   'lobby'   — flat kid-friendly tiled wallpaper

function RentalShelves({ style = 'shelves' }) {
  const ref = React.useRef(null);

  // Subtle parallax tilt (max ±1.2°); disabled under prefers-reduced-motion.
  React.useEffect(() => {
    if (style !== 'shelves') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const MAX_TILT_DEG = 1.2;
    const onMove = (e) => {
      const el = ref.current;
      if (!el) return;
      const cx = (e.clientX / window.innerWidth) - 0.5;
      const cy = (e.clientY / window.innerHeight) - 0.5;
      el.style.setProperty('--bb-tilt-x', (cy * MAX_TILT_DEG).toFixed(2) + 'deg');
      el.style.setProperty('--bb-tilt-y', (-cx * MAX_TILT_DEG).toFixed(2) + 'deg');
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [style]);

  if (style === 'lobby') {
    return (
      <div className="scene-decor" aria-hidden="true">
        <div className="wallpaper"/>
        <div className="floor"/>
        <div className="vignette"/>
      </div>
    );
  }
  return (
    <div ref={ref} className="scene-decor shelves-3d" aria-hidden="true">
      <div className="bb-perspective"/>
      <div className="bb-shelves"/>
      <div className="floor"/>
      <div className="vignette"/>
    </div>
  );
}
window.RentalShelves = RentalShelves;

// === NFC Smart Card (skeuo, original mascot) ===

function MascotBlob({ accent = 'var(--accent)', accent2 = 'var(--accent-2)' }) {
  // Original blobby creature — round, friendly. Pure SVG primitives only.
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      {/* body */}
      <ellipse cx="50" cy="58" rx="34" ry="32" fill={accent}
               stroke="#0a1a4a" strokeWidth="3"/>
      {/* belly */}
      <ellipse cx="50" cy="68" rx="20" ry="16" fill="#fff8e0"/>
      {/* eye L */}
      <circle cx="38" cy="48" r="7" fill="#fff" stroke="#0a1a4a" strokeWidth="2"/>
      <circle cx="40" cy="50" r="3.5" fill="#0a1a4a"/>
      <circle cx="41.5" cy="48.5" r="1.2" fill="#fff"/>
      {/* eye R */}
      <circle cx="62" cy="48" r="7" fill="#fff" stroke="#0a1a4a" strokeWidth="2"/>
      <circle cx="64" cy="50" r="3.5" fill="#0a1a4a"/>
      <circle cx="65.5" cy="48.5" r="1.2" fill="#fff"/>
      {/* cheeks */}
      <circle cx="30" cy="60" r="4" fill={accent2} opacity=".7"/>
      <circle cx="70" cy="60" r="4" fill={accent2} opacity=".7"/>
      {/* mouth */}
      <path d="M 44 60 Q 50 66 56 60" stroke="#0a1a4a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* ears */}
      <circle cx="22" cy="32" r="8" fill={accent} stroke="#0a1a4a" strokeWidth="2.5"/>
      <circle cx="78" cy="32" r="8" fill={accent} stroke="#0a1a4a" strokeWidth="2.5"/>
    </svg>
  );
}

function NFCWaves() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M 6 18 Q 6 12 12 12 Q 18 12 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M 4 20 Q 4 10 12 10 Q 20 10 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".7"/>
      <path d="M 2 22 Q 2 8 12 8 Q 22 8 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".4"/>
    </svg>
  );
}

const MASCOT_PALETTE = [
  { a: '#ffd23f', b: '#ef476f', name: 'Sunny' },
  { a: '#4cd7ff', b: '#ff5d6c', name: 'Splashy' },
  { a: '#06d6a0', b: '#ffd23f', name: 'Sprout' },
  { a: '#ff85c0', b: '#fbd000', name: 'Berry' },
  { a: '#fbd000', b: '#e02e1f', name: 'Spark' },
];

function NFCCard({ index = 0, onTap, tapping }) {
  const m = MASCOT_PALETTE[index % MASCOT_PALETTE.length];
  return (
    <div className={cx('nfc-card', tapping && 'tapping')} onClick={onTap}
         title="Tap to use this credit">
      <div className="holo"/>
      <div className="chip"/>
      <div className="waves"><NFCWaves/></div>
      <div className="nfc-mascot">
        <MascotBlob accent={m.a} accent2={m.b}/>
      </div>
      <div className="label">
        Snap Card · {m.name}
        <span className="num">SC ●●●● {String(1000 + index).padStart(4,'0')}</span>
      </div>
    </div>
  );
}

window.RentalShelves = RentalShelves;
window.MascotBlob = MascotBlob;
window.NFCCard = NFCCard;
window.MASCOT_PALETTE = MASCOT_PALETTE;
