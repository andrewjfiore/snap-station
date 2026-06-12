// ======= UI.jsx — shared design-system components =======
// Toasts, alert dialog, the 3-tier error components, score popup, pokéball
// progress, and the hold-to-unlock hook. Markup transplanted from the
// design-system file (toast / alert-dialog / err-* / score-card / step-progress).

// ---- Toast bus -------------------------------------------------------------
// window.snapToast(kind, msg) from anywhere; <ToastHost/> renders the stack.
const __toastListeners = new Set();
let __toastId = 0;
function snapToast(kind, msg, ms) {
  const t = { id: ++__toastId, kind: kind || 'info', msg, ms: ms || 3200 };
  __toastListeners.forEach((fn) => fn(t));
}
window.snapToast = snapToast;

function ToastLeading({ kind }) {
  if (kind === 'success') {
    return (
      <span className="leading">
        <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5 9-11"/></svg>
      </span>
    );
  }
  if (kind === 'error') {
    return <span className="leading"><svg style={{ width: 14, height: 14 }}><use href="#i-bang"/></svg></span>;
  }
  return (
    <span className="leading">
      <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24"><path fill="currentColor" d="M11 7h2v2h-2zM11 11h2v7h-2z"/></svg>
    </span>
  );
}

function ToastHost() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const onToast = (t) => {
      setToasts((prev) => [...prev, t].slice(-4));
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), t.ms);
    };
    __toastListeners.add(onToast);
    return () => __toastListeners.delete(onToast);
  }, []);
  if (toasts.length === 0) return null;
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cx('toast', `toast-${t.kind}`)}>
          <ToastLeading kind={t.kind} />
          <span>{t.msg}</span>
          <button className="close" aria-label="Dismiss"
                  onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}>
            <svg><use href="#i-x"/></svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ---- Alert dialog (design tab "Alert Dialog") -------------------------------
function AlertDialog({ title, body, cancelLabel, confirmLabel, onCancel, onConfirm, danger }) {
  return (
    <div className="kiosk-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget && onCancel) onCancel(); }}>
      <div className="alert-dialog" role="alertdialog" aria-modal="true" aria-label={title}>
        <div className="icon-circle" aria-hidden="true">
          <svg style={{ width: 20, height: 20, color: '#fff' }}><use href={danger ? '#i-bang' : '#i-info'}/></svg>
        </div>
        <div className="title">{title}</div>
        <div className="body">{body}</div>
        <div className="alert-actions">
          {onCancel && (
            <button className="btn btn-secondary" style={{ minWidth: 0, padding: '11px 14px', fontSize: 14, justifyContent: 'center' }}
                    onClick={onCancel}>{cancelLabel || 'Cancel'}</button>
          )}
          <button className="btn btn-primary" style={{ minWidth: 0, padding: '11px 14px', fontSize: 14, justifyContent: 'center' }}
                  onClick={onConfirm}>{confirmLabel || 'OK'}</button>
        </div>
      </div>
    </div>
  );
}

// ---- Error tiers (errors tab) -----------------------------------------------
// Tier 1 — inline field hint. "Small issue · don't break flow."
function ErrInline({ children }) {
  return (
    <div className="err-inline">
      <svg><use href="#i-warn"/></svg>
      {children}
    </div>
  );
}

// Tier 2 — dismissible banner. "Recoverable · action needed."
function ErrBanner({ title, sub, onDismiss, onRetry, retryLabel }) {
  return (
    <div className="err-banner-demo" role="alert">
      <div className="err-banner-demo__icon"><svg><use href="#i-warn"/></svg></div>
      <div className="err-banner-demo__text">
        <div className="err-banner-demo__title">{title}</div>
        <div className="err-banner-demo__sub">{sub}</div>
      </div>
      <div className="err-banner-demo__actions">
        {onDismiss && <button className="btn btn-secondary" onClick={onDismiss}>Dismiss</button>}
        {onRetry && <button className="btn btn-primary" onClick={onRetry}>{retryLabel || 'Try Again'}</button>}
      </div>
    </div>
  );
}

// Tier 3 — full-screen blocking. "Blocking · can't proceed."
function ErrFullscreen({ title, sub, onRetry, onCallStaff }) {
  return (
    <div className="err-fullscreen-demo tier3-overlay" role="alertdialog" aria-modal="true" aria-label={title || "Let's try that again."}>
      <div className="err-fullscreen-demo__icon"><svg><use href="#i-bang"/></svg></div>
      <h3 className="err-fullscreen-demo__title">{title || "Let's try that again."}</h3>
      <p className="err-fullscreen-demo__sub">{sub}</p>
      <div className="err-fullscreen-demo__actions">
        <button className="btn btn-secondary"
                style={{ background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}
                onClick={onCallStaff}>Call Staff</button>
        <button className="btn btn-primary" onClick={onRetry}>Try Again</button>
      </div>
    </div>
  );
}

// ---- Score popup (design tab "Score Popup") ----------------------------------
// Cosmetic: shows after each snap with a small random nice-message.
const NICE_MESSAGES = ['Nice framing!', 'Looking great!', 'What a shot!', 'All set!'];

function ScorePopup({ photo, score, message, onDone }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    // count up like the showcase's data-target animation
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 600);
      setN(Math.round(score * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const close = setTimeout(() => onDone && onDone(), 1900);
    return () => { cancelAnimationFrame(raf); clearTimeout(close); };
  }, [score]);
  return (
    <div className="score-popup-host" aria-hidden="true">
      <div className="score-card">
        <svg className="sparkle s1"><use href="#i-spark"/></svg>
        <svg className="sparkle s2"><use href="#i-spark"/></svg>
        <svg className="sparkle s3"><use href="#i-spark"/></svg>
        <svg className="sparkle s4"><use href="#i-spark"/></svg>
        <svg className="sparkle s5"><use href="#i-spark"/></svg>
        <div className="score-photo">
          {photo ? <img src={photo} alt=""/> : '[ photo ]'}
        </div>
        <div className="score-text">
          <div className="score-label">SNAP SCORE</div>
          <div className="score-number">+{n}</div>
          <div className="score-sub">{message}</div>
        </div>
      </div>
    </div>
  );
}

// ---- Step progress dots (design tab "Progress Indicators") -------------------
function StepProgress({ total, current }) {
  const items = [];
  for (let i = 1; i <= total; i++) {
    items.push(
      <div key={`s${i}`} className={cx('step', i < current ? 'done' : i === current ? 'done current' : 'todo')}>{i}</div>
    );
    if (i < total) items.push(<div key={`l${i}`} className={cx('step-line', i >= current && 'todo')}/>);
  }
  return <div className="step-progress">{items}</div>;
}

// Pokéball loading row
function PokeballLoading({ text }) {
  return (
    <div className="loading-row">
      <svg className="spin"><use href="#pb"/></svg>
      <span className="text">{text}</span>
    </div>
  );
}

// ---- Hold-to-unlock (SnapAttendantLock wrapper) ------------------------------
// Returns [ref, progress 0..1]. Attach ref to any element; holding 3 s unlocks.
// Callback ref so the lock re-attaches when the element mounts late (e.g. the
// wizard footer Settings button only exists on step 1).
function useHoldUnlock(onUnlock, holdMs) {
  const [progress, setProgress] = useState(0);
  const handleRef = useRef(null);
  const onUnlockRef = useRef(onUnlock);
  useEffect(() => { onUnlockRef.current = onUnlock; }, [onUnlock]);
  useEffect(() => () => { if (handleRef.current) handleRef.current.detach(); }, []);
  const refCb = useCallback((node) => {
    if (handleRef.current) { handleRef.current.detach(); handleRef.current = null; }
    if (node && window.SnapAttendantLock) {
      handleRef.current = SnapAttendantLock.attach(node, {
        holdMs: holdMs || 3000,
        onProgress: setProgress,
        onUnlock: () => { setProgress(0); onUnlockRef.current && onUnlockRef.current(); },
      });
    }
  }, [holdMs]);
  return [refCb, progress];
}

// Circular hold progress ring (shown while holding)
function HoldRing({ progress }) {
  const R = 9, C = 2 * Math.PI * R;
  if (progress <= 0 || progress >= 1) return null;
  return (
    <span className="hold-ring" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <circle className="track" cx="12" cy="12" r={R}/>
        <circle cx="12" cy="12" r={R}
                strokeDasharray={`${(progress * C).toFixed(1)} ${C.toFixed(1)}`}/>
      </svg>
    </span>
  );
}

window.ToastHost = ToastHost;
window.AlertDialog = AlertDialog;
window.ErrInline = ErrInline;
window.ErrBanner = ErrBanner;
window.ErrFullscreen = ErrFullscreen;
window.ScorePopup = ScorePopup;
window.NICE_MESSAGES = NICE_MESSAGES;
window.StepProgress = StepProgress;
window.PokeballLoading = PokeballLoading;
window.useHoldUnlock = useHoldUnlock;
window.HoldRing = HoldRing;

// ======= Persistent credit pill (design system v4) =======
function CreditPill({ credits }) {
  const [bump, setBump] = useState(false);
  const prev = useRef(credits);
  useEffect(() => {
    if (credits !== prev.current) {
      prev.current = credits;
      setBump(true);
      const t = setTimeout(() => setBump(false), 450);
      return () => clearTimeout(t);
    }
  }, [credits]);
  const freePlay = SnapStore.getAttendant().freePlay;
  return (
    <div className={cx('credit-pill', !freePlay && credits === 1 && 'is-low', !freePlay && credits === 0 && 'is-empty', bump && 'bump')}
         role="status" aria-live="polite">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" strokeDasharray="2 2"/></svg>
      <span>{freePlay ? 'FREE PLAY' : <><span className="credit-pill__n">{credits}</span> credit{credits === 1 ? '' : 's'}</>}</span>
    </div>
  );
}
window.CreditPill = CreditPill;

// ======= Physical status lamps: credit ready / printing / problem =======
// Driven by window events: dispatch new CustomEvent('snap:leds', {detail:{printing, error}}).
function SnapLeds() {
  const [state, setState] = useState({ printing: false, error: false });
  const [ready, setReady] = useState(() => SnapStore.getAttendant().freePlay || SnapStore.getCredits() > 0);
  useEffect(() => {
    const onLeds = (e) => setState((s) => ({ ...s, ...(e.detail || {}) }));
    const refresh = () => setReady(SnapStore.getAttendant().freePlay || SnapStore.getCredits() > 0);
    const iv = setInterval(refresh, 1500);
    window.addEventListener('snap:leds', onLeds);
    return () => { window.removeEventListener('snap:leds', onLeds); clearInterval(iv); };
  }, []);
  return (
    <div className="snap-leds" aria-hidden="true">
      <div className={cx('snap-led', ready && !state.error && 'is-on')} data-led="ready"><span className="snap-led__dot"/><span className="snap-led__label">Credit</span></div>
      <div className={cx('snap-led', state.printing && 'is-on')} data-led="printing"><span className="snap-led__dot"/><span className="snap-led__label">Printing</span></div>
      <div className={cx('snap-led', state.error && 'is-on')} data-led="error"><span className="snap-led__dot"/><span className="snap-led__label">Problem</span></div>
    </div>
  );
}
window.SnapLeds = SnapLeds;
