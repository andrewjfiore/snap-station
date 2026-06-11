// Capture screen — live preview + FX + shutter.
// Live sources come from js/capture-sources.js (SnapCapture); captured photos are
// real JPEG dataURLs persisted to SnapStore's gallery via onCapture.

const CAPTURE_FILTER_CSS = {
  none: '',
  sepia: 'sepia(0.8) contrast(1.05)',
  noir: 'grayscale(1) contrast(1.2)',
  crt: 'contrast(1.15) saturate(1.2)',
};

function CaptureScreen({ setScreen, snaps, onCapture }) {
  const [source, setSource] = useState('demo'); // demo | camera | hdmi
  const [live, setLive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [flash, setFlash] = useState(false);
  const [fx, setFx] = useState({ mirror: true, crt: false, filter: 'none' });
  const [recording, setRecording] = useState(false);
  const videoRef = useRef(null);
  const frameSourceRef = useRef(null);
  const [demoIdx, setDemoIdx] = useState(0);

  useEffect(() => {
    if (source === 'demo') return;
    let cancelled = false;
    setLive(false);
    const src = source === 'camera'
      ? new SnapCapture.WebcamFrameSource()
      : new SnapCapture.DisplayFrameSource();
    frameSourceRef.current = src;
    src.start(videoRef.current)
      .then(() => {
        if (cancelled) { src.stop(); return; }
        setLive(true);
      })
      .catch(() => {
        if (!cancelled) { SoundFX.error(); setSource('demo'); } // demo-feed fallback
      });
    return () => {
      cancelled = true;
      src.stop();
      frameSourceRef.current = null;
      setLive(false);
    };
  }, [source]);

  useEffect(() => {
    if (source !== 'demo') return;
    const t = setInterval(() => setDemoIdx(i => (i + 1) % DEMO_SNAPS.length), 2500);
    return () => clearInterval(t);
  }, [source]);

  // Compose mirror + filter into the final JPEG so the saved photo matches the
  // viewfinder. Returns a dataURL.
  const composeCapture = (srcCanvas) => {
    const out = document.createElement('canvas');
    out.width = srcCanvas.width;
    out.height = srcCanvas.height;
    const ctx = out.getContext('2d');
    if (CAPTURE_FILTER_CSS[fx.filter]) ctx.filter = CAPTURE_FILTER_CSS[fx.filter];
    if (fx.mirror) { ctx.translate(out.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(srcCanvas, 0, 0);
    return out.toDataURL('image/jpeg', 0.8);
  };

  const captureDemoFrame = () => {
    const scene = DEMO_SNAPS[demoIdx];
    const c = document.createElement('canvas');
    c.width = 800; c.height = 600;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
    grad.addColorStop(0, scene.from);
    grad.addColorStop(1, scene.to);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.font = "800 64px 'Lilita One', 'Fredoka', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowOffsetY = 3;
    ctx.fillText(scene.label, c.width / 2, c.height / 2);
    return c;
  };

  const grabFrame = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 380);
    const fsrc = frameSourceRef.current;
    if (source !== 'demo' && fsrc && live) {
      const raw = document.createElement('canvas');
      fsrc.captureFrame(raw)
        .then(() => onCapture(composeCapture(raw)))
        .catch(() => {
          SoundFX.error();
          onCapture(composeCapture(captureDemoFrame()));
        });
    } else {
      onCapture(composeCapture(captureDemoFrame()));
    }
  }, [source, live, demoIdx, fx, onCapture]);

  const snap = useCallback(() => {
    if (countdown > 0) return;
    SoundFX.shutter();
    let cd = 3;
    setCountdown(cd);
    const tick = setInterval(() => {
      cd--;
      if (cd > 0) { setCountdown(cd); SoundFX.click(); }
      else {
        clearInterval(tick);
        setCountdown(0);
        SoundFX.shutter();
        grabFrame();
      }
    }, 700);
  }, [grabFrame, countdown]);

  useKeyboard(useCallback((e) => {
    if (e.code === 'Space') { e.preventDefault(); snap(); }
  }, [snap]));

  const demoScene = DEMO_SNAPS[demoIdx];
  const filterCss = CAPTURE_FILTER_CSS[fx.filter] || '';

  return (
    <ScreenShell crumbs={['Capture', 'Live Preview']}
      footer={
        <>
          <div className="btn-hints">
            <span><kbd>Space</kbd> Snap</span>
            <span><kbd>→</kbd> Gallery</span>
          </div>
          <button className="btn primary sm" onClick={() => { SoundFX.click(); setScreen('gallery'); }}>
            View Gallery ({snaps.length}) →
          </button>
        </>
      }>
      <div className="capture">
        <div className="viewfinder">
          <div style={{
            position: 'absolute', inset: 0,
            transform: fx.mirror ? 'scaleX(-1)' : 'none',
            filter: filterCss || 'none'
          }}>
            {source === 'demo' && (
              <div className="snap-poster" style={{
                background: `linear-gradient(135deg, ${demoScene.from}, ${demoScene.to})`,
                transition: 'all 400ms ease',
                width: '100%', height: '100%'
              }}>
                {demoScene.label}
              </div>
            )}
            <video ref={videoRef} autoPlay playsInline muted
                   style={{display: source === 'demo' ? 'none' : 'block', width: '100%', height: '100%', objectFit: 'cover'}}/>
            {source !== 'demo' && !live && <div className="placeholder" style={{position: 'absolute', inset: 0}}><div className="glyph"/>PERMISSION REQUIRED</div>}
          </div>

          <div className="corner tl" /><div className="corner tr" />
          <div className="corner bl" /><div className="corner br" />
          <div className="reticle" />
          {recording && <div className="rec-dot"><span className="d"/>REC</div>}
          {countdown > 0 && <div className="countdown" key={countdown}>{countdown}</div>}
          {flash && <div className="cap-flash" />}
        </div>

        <div className="cap-side">
          <div>
            <h4 style={{fontFamily: 'var(--font-pixel)', fontSize: 9, letterSpacing: '.14em', opacity: .7, marginBottom: 8}}>SOURCE</h4>
            <div className="source-picker">
              <button className={cx(source === 'demo' && 'active')} onClick={() => { SoundFX.click(); setSource('demo'); }}>▶ Demo</button>
              <button className={cx(source === 'camera' && 'active')} onClick={() => { SoundFX.click(); setSource('camera'); }}>◉ Camera</button>
              <button className={cx(source === 'hdmi' && 'active')} onClick={() => { SoundFX.click(); setSource('hdmi'); }}>▦ HDMI</button>
              <button onClick={() => SoundFX.click()}>⚙ Audio</button>
            </div>
          </div>

          <div>
            <h4 style={{fontFamily: 'var(--font-pixel)', fontSize: 9, letterSpacing: '.14em', opacity: .7, marginBottom: 8}}>EFFECTS</h4>
            <div className="fx-grid">
              <button className={cx('fx-chip', fx.mirror && 'on')} onClick={() => { SoundFX.click(); setFx({...fx, mirror: !fx.mirror}); }}>
                <span className="label">Mirror</span>
                <span className="value">{fx.mirror ? 'ON' : 'OFF'}</span>
              </button>
              <button className={cx('fx-chip', fx.crt && 'on')} onClick={() => { SoundFX.click(); setFx({...fx, crt: !fx.crt}); }}>
                <span className="label">CRT</span>
                <span className="value">{fx.crt ? 'ON' : 'OFF'}</span>
              </button>
              {['none','sepia','noir','crt'].map(f => (
                <button key={f} className={cx('fx-chip', fx.filter === f && 'on')} onClick={() => { SoundFX.click(); setFx({...fx, filter: f}); }}>
                  <span className="label">Filter</span>
                  <span className="value">{f.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="capture-actions">
            <button className="cap-shutter" onClick={snap}>SNAP</button>
            <button className="btn icon" title="Record clip" onClick={() => { SoundFX.click(); setRecording(!recording); }}
                    style={{height: 64, width: 64, background: recording ? 'var(--accent-2)' : 'rgba(255,255,255,.06)'}}>
              {recording ? '■' : '●'}
            </button>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
window.CaptureScreen = CaptureScreen;
