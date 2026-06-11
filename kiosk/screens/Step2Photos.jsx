// ======= Step 2 — Add Photos =======
// Slot grid from the design system's sticker-ux step 2 (ap-slots / ap-slot /
// ap-action), plus the live capture view with the capture-states overlay
// guidance (capture tab): happy path, face-not-detected (window.FaceDetector
// only), too dark / too bright (mean luma of the captureFrame canvas ~1 Hz),
// and camera-blocked. The viewfinder stays live — guidance is never a modal.

// Compose mirror into the final JPEG so the saved photo matches the viewfinder.
function composeCaptureCanvas(srcCanvas, mirror) {
  const out = document.createElement('canvas');
  out.width = srcCanvas.width;
  out.height = srcCanvas.height;
  const ctx = out.getContext('2d');
  if (mirror) { ctx.translate(out.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(srcCanvas, 0, 0);
  return out.toDataURL('image/jpeg', 0.8);
}

// Demo scene frame (no camera required) — real JPEG via canvas.
function drawDemoFrame(scene) {
  const c = document.createElement('canvas');
  c.width = 800; c.height = 600;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
  grad.addColorStop(0, scene.from);
  grad.addColorStop(1, scene.to);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.font = "800 64px 'Barlow', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,.4)';
  ctx.shadowOffsetY = 3;
  ctx.fillText(scene.label, c.width / 2, c.height / 2);
  return c;
}

// QC overlay metadata per state (microcopy from the capture tab)
const CAPTURE_OVERLAYS = {
  ok:      { icon: 'check', tone: 'info', title: 'Looking great — hold still!', sub: 'Tap the Pokéball when you’re ready.' },
  face:    { icon: '#i-users', tone: 'info', title: 'Step into the frame', sub: 'Line up with the ghost outline and we’ll find you.' },
  dark:    { icon: '#i-warn', tone: 'warn', title: 'A little more light would help', sub: 'Try stepping under the ring light.' },
  bright:  { icon: '#i-warn', tone: 'warn', title: 'Whoa, too bright', sub: 'Shift a step back from the sunlight.' },
  blocked: { icon: '#i-bang', tone: 'err', title: 'Let’s try that again', sub: 'The camera looks blocked. Allow camera access or use demo scenes.' },
};

function CaptureOverlay({ state, countdown }) {
  const meta = CAPTURE_OVERLAYS[state] || CAPTURE_OVERLAYS.ok;
  const sub = (state === 'ok' && countdown > 0) ? `Shutter in ${countdown}…` : meta.sub;
  return (
    <div className="capture-overlay">
      <div className={`capture-overlay__icon capture-overlay__icon--${meta.tone}`}>
        {meta.icon === 'check'
          ? <svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5 9-11"/></svg>
          : <svg><use href={meta.icon}/></svg>}
      </div>
      <div className="capture-overlay__text">
        <div className="capture-overlay__title">{meta.title}</div>
        <div className="capture-overlay__sub">{sub}</div>
      </div>
    </div>
  );
}

// Live capture view — viewfinder + QC overlay + pokéball shutter.
function CaptureView({ onPhoto, onBack, slotLabel }) {
  const [source, setSource] = useState('camera'); // camera | demo
  const [live, setLive] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [qc, setQc] = useState('ok'); // ok | face | dark | bright
  const [countdown, setCountdown] = useState(0);
  const [flash, setFlash] = useState(false);
  const [score, setScore] = useState(null); // {photo, score, message}
  const videoRef = useRef(null);
  const frameSourceRef = useRef(null);
  const faceDetectorRef = useRef(undefined);
  const [demoIdx, setDemoIdx] = useState(0);

  // Source lifecycle
  useEffect(() => {
    setBlocked(false);
    if (source === 'demo') { setLive(false); return; }
    let cancelled = false;
    setLive(false);
    const src = new SnapCapture.WebcamFrameSource();
    frameSourceRef.current = src;
    src.start(videoRef.current)
      .then(() => { if (cancelled) { src.stop(); return; } setLive(true); })
      .catch(() => { if (!cancelled) { SoundFX.error(); setBlocked(true); } }); // getUserMedia rejected
    return () => {
      cancelled = true;
      src.stop();
      frameSourceRef.current = null;
      setLive(false);
    };
  }, [source]);

  // Demo scene rotation
  useEffect(() => {
    if (source !== 'demo') return;
    const t = setInterval(() => setDemoIdx((i) => (i + 1) % DEMO_SNAPS.length), 2500);
    return () => clearInterval(t);
  }, [source]);

  // QC sampling ~1 Hz: mean luma of the captureFrame canvas + optional FaceDetector
  useEffect(() => {
    if (source !== 'camera' || !live) { setQc('ok'); return; }
    let stop = false;
    const frame = document.createElement('canvas');
    const small = document.createElement('canvas');
    small.width = 32; small.height = 24;

    if (faceDetectorRef.current === undefined) {
      faceDetectorRef.current = (typeof window.FaceDetector === 'function')
        ? (() => { try { return new window.FaceDetector({ fastMode: true, maxDetectedFaces: 2 }); } catch { return null; } })()
        : null;
    }

    const sample = async () => {
      const fsrc = frameSourceRef.current;
      if (stop || !fsrc) return;
      try {
        await fsrc.captureFrame(frame);
        const ctx = small.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(frame, 0, 0, small.width, small.height);
        const data = ctx.getImageData(0, 0, small.width, small.height).data;
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        }
        const luma = sum / (data.length / 4);
        if (stop) return;
        if (luma < 40) { setQc('dark'); return; }
        if (luma > 215) { setQc('bright'); return; }
        // Face detection only when the API exists (otherwise this state is omitted)
        const det = faceDetectorRef.current;
        if (det) {
          try {
            const faces = await det.detect(frame);
            if (!stop) { setQc(faces.length === 0 ? 'face' : 'ok'); return; }
          } catch { /* detector unavailable mid-flight — fall through */ }
        }
        setQc('ok');
      } catch { /* no frame this tick */ }
    };
    sample();
    const t = setInterval(sample, 1000);
    return () => { stop = true; clearInterval(t); };
  }, [source, live]);

  const grabFrame = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 380);
    const finish = (dataUrl) => {
      const msg = NICE_MESSAGES[Math.floor(Math.random() * NICE_MESSAGES.length)];
      const pts = 60 + 5 * Math.floor(Math.random() * 9); // +60…+100, fives
      setScore({ photo: dataUrl, score: pts, message: msg });
      onPhoto(dataUrl);
    };
    const fsrc = frameSourceRef.current;
    if (source === 'camera' && fsrc && live) {
      const raw = document.createElement('canvas');
      fsrc.captureFrame(raw)
        .then(() => finish(composeCaptureCanvas(raw, true)))
        .catch(() => { SoundFX.error(); finish(composeCaptureCanvas(drawDemoFrame(DEMO_SNAPS[demoIdx]), false)); });
    } else {
      finish(composeCaptureCanvas(drawDemoFrame(DEMO_SNAPS[demoIdx]), false));
    }
  }, [source, live, demoIdx, onPhoto]);

  const shutterDisabled = source === 'camera' && !live;

  const snap = useCallback(() => {
    if (countdown > 0 || shutterDisabled) return;
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
  }, [grabFrame, countdown, shutterDisabled]);

  useKeyboard(useCallback((e) => {
    if (e.code === 'Space') { e.preventDefault(); snap(); }
  }, [snap]));

  const demoScene = DEMO_SNAPS[demoIdx];
  const overlayState = blocked ? 'blocked' : (source === 'demo' ? 'ok' : (live ? qc : 'ok'));

  return (
    <div className="capture-live" data-capture-state={overlayState}>
      <div className={cx('capture-state', 'capture-viewfinder', blocked && 'capture-state--blocked')}>
        <span className="capture-state__label">{slotLabel ? `Photo ${slotLabel}` : 'Live'}</span>
        <div className="capture-state__brackets"><span/><span/><span/><span/></div>

        {source === 'demo' && (
          <div className="capture-demo-feed"
               style={{ background: `linear-gradient(135deg, ${demoScene.from}, ${demoScene.to})` }}>
            <span>{demoScene.label}</span>
          </div>
        )}
        <video ref={videoRef} autoPlay playsInline muted
               className="capture-video"
               style={{ display: source === 'camera' && !blocked ? 'block' : 'none' }}/>
        {blocked && (
          <div className="capture-cam-slash">
            <svg viewBox="0 0 24 24"><use href="#i-camera"/></svg>
          </div>
        )}
        {source === 'camera' && !live && !blocked && (
          <div className="capture-waiting">Warming up the camera…</div>
        )}

        {countdown > 0 && <div className="capture-countdown" key={countdown}>{countdown}</div>}
        {flash && <div className="capture-flash"/>}
        <CaptureOverlay state={overlayState} countdown={countdown}/>
      </div>

      <div className="capture-side">
        <div className="segmented" data-group="capture-source">
          <button className={cx('seg-btn', source === 'camera' && 'active')}
                  onClick={() => { SoundFX.click(); setSource('camera'); }}>
            <svg style={{ width: 18, height: 18 }}><use href="#i-camera"/></svg>Camera
          </button>
          <button className={cx('seg-btn', source === 'demo' && 'active')}
                  onClick={() => { SoundFX.click(); setSource('demo'); }}>
            <svg style={{ width: 18, height: 18 }}><use href="#i-sparkle"/></svg>Demo
          </button>
        </div>

        <div className={cx('shutter', countdown > 0 && 'pressed is-pressed', shutterDisabled && 'disabled')}
             role="button" tabIndex={0} aria-label="Shutter"
             aria-disabled={shutterDisabled}
             onClick={snap}
             onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); snap(); } }}>
          <svg><use href={shutterDisabled ? '#shutter-pb-gray' : '#shutter-pb'}/></svg>
          <span className="ray r1"/><span className="ray r2"/><span className="ray r3"/>
          <span className="ray r4"/><span className="ray r5"/>
        </div>

        <button className="btn btn-tertiary ic-back" onClick={() => { SoundFX.back(); onBack(); }}>
          <svg style={{ width: 16, height: 16 }}><use href="#i-back"/></svg>
          <span>Back to photos</span>
        </button>
      </div>

      {score && (
        <ScorePopup photo={score.photo} score={score.score} message={score.message}
                    onDone={() => setScore(null)}/>
      )}
    </div>
  );
}

function Step2Photos({ sheet, updateSheet, snaps, onCapture, onImportClassic }) {
  const layout = SHEET_LAYOUTS.find((l) => l.id === sheet.layoutId) || SHEET_LAYOUTS[1];
  const groups = layout.groups;
  const sourceMap = sheet.sourceMap || {};
  const [captureFor, setCaptureFor] = useState(null);   // slot index or 'next'
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [adjusting, setAdjusting] = useState(null);
  const [importable, setImportable] = useState(() => SnapStore.readExportPayload());

  const filled = Object.keys(sourceMap).filter((k) => Number(k) < groups && sourceMap[k] != null).length;

  const nextEmpty = (preferred) => {
    if (preferred != null && preferred !== 'next' && !sourceMap[preferred]) return preferred;
    for (let g = 0; g < groups; g++) if (!sourceMap[g]) return g;
    return null;
  };

  const assign = (g, value) => {
    if (g == null) return;
    updateSheet({ sourceMap: { ...sourceMap, [g]: value } });
  };

  const removeSlot = (g) => {
    SoundFX.back();
    const next = { ...sourceMap };
    delete next[g];
    updateSheet({ sourceMap: next });
  };

  // Capture → gallery + slot
  const handlePhoto = (dataUrl) => {
    onCapture(dataUrl);
    const target = nextEmpty(captureFor);
    if (target != null) {
      const nextMap = { ...sourceMap, [target]: dataUrl };
      updateSheet({ sourceMap: nextMap });
      snapToast('success', 'Photo saved to your sheet!');
      setCaptureFor('next');
      // leave the camera open while empty slots remain
      const stillEmpty = Array.from({ length: groups }, (_, g) => g).some((g) => !nextMap[g]);
      if (!stillEmpty) setTimeout(() => setCaptureFor(null), 2000);
    } else {
      snapToast('success', 'Photo saved to your gallery!');
    }
  };

  // Gallery pick → slot
  const pickFromGallery = (snapEntry) => {
    const target = nextEmpty('next');
    if (target == null) { SoundFX.error(); snapToast('info', 'All slots are full — remove one first.'); return; }
    SoundFX.confirm();
    assign(target, snapEntry.dataUrl);
    snapToast('success', 'Photo saved to your sheet!');
  };

  // Upload files → gallery + empty slots
  const upload = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.multiple = true;
    inp.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      let pending = files.length;
      const next = { ...sourceMap };
      let g = 0;
      const findEmpty = () => { while (g < groups && next[g]) g++; return g < groups ? g : null; };
      files.forEach((f) => {
        const reader = new FileReader();
        reader.onload = () => {
          onCapture(reader.result);
          const slot = findEmpty();
          if (slot != null) next[slot] = reader.result;
          if (--pending === 0) {
            updateSheet({ sourceMap: next });
            snapToast('success', 'All set! Photos added.');
          }
        };
        reader.onerror = () => { if (--pending === 0) updateSheet({ sourceMap: next }); };
        reader.readAsDataURL(f);
      });
    };
    inp.click();
  };

  const doImport = () => {
    const n = onImportClassic();
    if (n > 0) {
      SoundFX.confirm();
      snapToast('success', `All set! ${n} photo${n === 1 ? '' : 's'} imported.`);
      setGalleryOpen(true);
    } else {
      SoundFX.error();
    }
    setImportable(SnapStore.readExportPayload());
  };

  if (captureFor != null) {
    const target = nextEmpty(captureFor);
    return (
      <div className="wiz-step-view is-active" data-view="2">
        <CaptureView slotLabel={target != null ? target + 1 : null}
                     onPhoto={handlePhoto}
                     onBack={() => setCaptureFor(null)}/>
      </div>
    );
  }

  return (
    <div className="wiz-step-view is-active" data-view="2">
      <div className="ap-container">
        <div className="wiz-hero">
          <div className="wiz-hero__icon" dangerouslySetInnerHTML={{ __html: WIZ_ART.photos }}/>
          <h2 className="wiz-hero__title">Add your photos</h2>
          <p className="wiz-hero__sub">Add up to <span id="ap-target-count">{groups}</span> photos. Tap a slot to take a photo using the camera.</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="ap-progress">
            <span className="ap-progress__star">
              <svg viewBox="0 0 24 24"><path d="M12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9z"/></svg>
            </span>
            <span className="ap-progress__count" id="ap-count">{filled} / {groups}</span>
            <span>photos added</span>
          </div>
        </div>

        {importable && (
          <div className="classic-import wiz-tip">
            <div className="wiz-tip__icon"><svg viewBox="0 0 24 24"><path d="M12 4v11 M7 11l5 5 5-5 M5 20h14"/></svg></div>
            <div className="wiz-tip__text">
              <strong>{importable.images.length} photo{importable.images.length === 1 ? '' : 's'}</strong> from your Classic Snap Station session are ready to import.
            </div>
            <button className="btn btn-primary" onClick={doImport}>Import from Classic</button>
          </div>
        )}

        <div className="ap-panel">
          <div className="ap-slots" data-layout={layout.id}
               style={{ gridTemplateColumns: `repeat(${groups === 1 ? 1 : groups === 4 ? 2 : 4}, 1fr)` }}>
            {Array.from({ length: groups }, (_, g) => {
              const val = sourceMap[g];
              const src = val ? SheetSource.srcOf(val) : null;
              if (!val) {
                return (
                  <div key={g} className="ap-slot" role="button" tabIndex={0}
                       aria-label={`Add photo ${g + 1}`}
                       onClick={() => { SoundFX.click(); setCaptureFor(g); }}
                       onKeyDown={(e) => { if (e.key === 'Enter') { SoundFX.click(); setCaptureFor(g); } }}>
                    <div className="ap-slot__badge">{g + 1}</div>
                    <div className="ap-slot__circle">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><use href="#i-camera"/></svg>
                    </div>
                    <div className="ap-slot__label">Tap to add photo</div>
                    <div className="ap-slot__hint">or pick from your gallery</div>
                  </div>
                );
              }
              return (
                <div key={g} className="ap-slot is-filled">
                  <div className="ap-slot__badge">{g + 1}</div>
                  <div className="check-bubble" aria-hidden="true">
                    <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5 9-11"/></svg>
                  </div>
                  <div className="ap-slot__photo">
                    <PosImg src={src} pos={val && val.pos}/>
                  </div>
                  <div className="ap-slot__tools">
                    <button className="ap-tool" title="Adjust framing" aria-label={`Adjust photo ${g + 1}`}
                            onClick={() => { SoundFX.click(); setAdjusting(g); }}>
                      <svg><use href="#i-edit"/></svg>
                    </button>
                    <button className="ap-tool" title="Remove" aria-label={`Remove photo ${g + 1}`}
                            onClick={() => removeSlot(g)}>
                      <svg><use href="#i-trash"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="ap-actions-row">
            <button className="ap-action" type="button" onClick={() => { SoundFX.click(); setCaptureFor('next'); }}>
              <div className="ap-action__avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><use href="#i-camera"/></svg>
              </div>
              <div className="ap-action__col">
                <span>Take a Photo</span>
                <span className="ap-action__sub">Open camera</span>
              </div>
            </button>
            <button className="ap-action" type="button" onClick={() => { SoundFX.click(); setGalleryOpen(!galleryOpen); }}>
              <div className="ap-action__avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><use href="#i-sheet"/></svg>
              </div>
              <div className="ap-action__col">
                <span>Your Gallery</span>
                <span className="ap-action__sub">{snaps.length} saved</span>
              </div>
            </button>
            <button className="ap-action" type="button" onClick={() => { SoundFX.click(); upload(); }}>
              <div className="ap-action__avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><use href="#i-download"/></svg>
              </div>
              <div className="ap-action__col">
                <span>Upload</span>
                <span className="ap-action__sub">From a file</span>
              </div>
            </button>
          </div>

          {galleryOpen && (
            <div className="ap-gallery" data-testid="gallery-picker">
              {snaps.length === 0 ? (
                <div className="ap-gallery__empty">No photos yet — take your first one!</div>
              ) : (
                <div className="ap-gallery__grid">
                  {snaps.map((s) => (
                    <button key={s.id} className="ap-gallery__thumb" onClick={() => pickFromGallery(s)}
                            aria-label="Add this photo to your sheet">
                      <img src={s.dataUrl} alt="" loading="lazy"/>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {adjusting != null && SheetSource.srcOf(sourceMap[adjusting]) && (
        <AdjustModal
          src={SheetSource.srcOf(sourceMap[adjusting])}
          pos={sourceMap[adjusting] && sourceMap[adjusting].pos}
          onChange={(pos) => {
            const src = SheetSource.srcOf(sourceMap[adjusting]);
            assign(adjusting, { src, pos });
          }}
          onClose={() => setAdjusting(null)}/>
      )}
    </div>
  );
}
window.Step2Photos = Step2Photos;
