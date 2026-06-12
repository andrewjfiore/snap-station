// ======= Step 5 — Print & Post-Print =======
// Printing stage (cp-stage printer + pokéball progress) then the post-print
// layout from the design system's post-print tab: "All set!", Your Order,
// What's Next, Pro Tips, Start over / Print another. The real export actions
// (Print via system/print-server, PNG, Cricut SVG, cut-only SVG) live in the
// "Take it home" group. Render/print failures raise the Tier-3 full-screen.

// Where the QR on the post-print screen points (attendant-configurable;
// defaults to the live station site). Photos themselves never leave the
// machine — the QR is the take-home link, not an upload.
function shareUrl() {
  return (SnapStore.getSettings().shareUrl || '').trim() || 'https://andrewjfiore.github.io/snap-station/';
}

// QR via the vendored qrcode-generator (zero-CDN); spec-faithful fallback
// copy when the library is unavailable.
function QrPanel() {
  const dataUrl = useMemo(() => {
    try {
      if (typeof qrcode !== 'function') return null;
      const qr = qrcode(0, 'M');
      qr.addData(shareUrl());
      qr.make();
      return qr.createDataURL(5, 8);
    } catch (e) { return null; }
  }, []);
  if (!dataUrl) return <div className="pp-qr-fallback">Scan-to-phone needs the QR library (offline?). Your downloads below still work.</div>;
  return <img src={dataUrl} alt={`QR code for ${shareUrl()}`} width={150} height={150}/>;
}

// Dye-sub passes (design system v4): a real CP-series printer lays one color
// at a time — Yellow, Magenta, Cyan, then the protective overcoat.
const DYESUB_PASSES = [
  { id: 'yellow',  name: 'Yellow' },
  { id: 'magenta', name: 'Magenta' },
  { id: 'cyan',    name: 'Cyan' },
  { id: 'finish',  name: 'Finishing' },
];

function Step5Print({ sheet, snaps, order, onStartOver, onPrintAnother }) {
  const [stage, setStage] = useState('printing'); // printing | fault | done
  const [passIdx, setPassIdx] = useState(0);
  const [busy, setBusy] = useState('');
  const [errFull, setErrFull] = useState(null); // { sub, retry }
  const [attempt, setAttempt] = useState(0);    // bump to retry after a fault
  const copies = (order && order.copies) || sheet.copies || 1;
  const paidWithCredits = order && order.method === 'credit';

  const paperId = sheet.paperId || '4x6';
  const paper = PAPER_SIZES.find((p) => p.id === paperId) || PAPER_SIZES[0];
  const layout = SHEET_LAYOUTS.find((l) => l.id === sheet.layoutId) || SHEET_LAYOUTS.find((l) => l.id === 'quad');

  // Print cycle with fault-safe accounting: credits were RESERVED at pay
  // time; they commit only when the sheet completes, and a jam refunds the
  // reservation untouched ("a jam never charges you" — the privacy card's
  // promise, kept). Supplies are consumed only on success.
  // The real print-server job (when configured) runs during the ritual; its
  // failure — or the test hook window.__SIMULATE_JAM__ — raises the fault.
  useEffect(() => {
    let cancelled = false;
    SoundFX.printer();
    window.dispatchEvent(new CustomEvent('snap:leds', { detail: { printing: true, error: false } }));
    setPassIdx(0);

    const PASS_MS = (typeof window.__DYESUB_PASS_MS__ === 'number') ? window.__DYESUB_PASS_MS__ : 1100;
    const finishOk = () => {
      if (cancelled) return;
      if (paidWithCredits) SnapPayment.commit(copies);
      SnapStore.consumeSupplies(copies);
      const att = SnapStore.getAttendant();
      SnapStore.setAttendant({ stats: { ...att.stats, prints: ((att.stats && att.stats.prints) || 0) + copies } });
      window.dispatchEvent(new CustomEvent('snap:leds', { detail: { printing: false, error: false } }));
      setStage('done');
      SoundFX.confirm();
    };
    const finishFault = () => {
      if (cancelled) return;
      if (paidWithCredits) SnapPayment.refund(copies);
      window.dispatchEvent(new CustomEvent('snap:leds', { detail: { printing: false, error: true } }));
      setStage('fault');
      SoundFX.error();
    };

    // Kick the real job if a print bridge is configured; remember its outcome.
    const serverUrl = (SnapStore.getSettings().printServerUrl || '').trim();
    let serverFailed = false;
    const serverJob = serverUrl
      ? renderSheetToCanvas(sheet, snaps)
          .then((canvas) => new Promise((res, rej) => canvas.toBlob((b) => b ? res(b) : rej(new Error('encode')), 'image/png')))
          .then((blob) => StickerExport.printViaServer(serverUrl, blob, { media: paperId, copies }))
          .catch(() => { serverFailed = true; })
      : Promise.resolve();

    let i = 0;
    const tick = setInterval(() => {
      i++;
      if (i < DYESUB_PASSES.length) { setPassIdx(i); SoundFX.click(); return; }
      clearInterval(tick);
      serverJob.then(() => {
        if (window.__SIMULATE_JAM__ || serverFailed) finishFault();
        else finishOk();
      });
    }, PASS_MS);
    return () => {
      cancelled = true;
      clearInterval(tick);
      window.dispatchEvent(new CustomEvent('snap:leds', { detail: { printing: false } }));
    };
  }, [attempt]);

  const fail = (err, retry) => {
    setBusy('');
    SoundFX.error();
    setErrFull({
      sub: ((err && err.message) || 'The sheet could not be rendered.') + ' A staff member can help if this keeps happening.',
      retry,
    });
  };

  const renderSheet = () => renderSheetToCanvas(sheet, snaps);

  // Kiosk deployments set a print-server URL in the attendant panel
  // (deploy/print-server). Try it first; fall back to the browser dialog.
  const doSystemPrint = () => {
    if (busy) return;
    SoundFX.click();
    setBusy('print');
    renderSheet()
      .then((canvas) => {
        const serverUrl = (SnapStore.getSettings().printServerUrl || '').trim();
        if (!serverUrl) return StickerExport.printSheetImage(canvas.toDataURL('image/png'), paper.w, paper.h);
        return new Promise((resolve, reject) => {
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error('PNG encode failed.')), 'image/png');
        })
          .then((blob) => StickerExport.printViaServer(serverUrl, blob, { media: paperId }))
          .catch((err) => {
            console.warn('Print server unreachable, falling back to browser dialog:', err);
            return StickerExport.printSheetImage(canvas.toDataURL('image/png'), paper.w, paper.h);
          });
      })
      .then(() => { setBusy(''); SoundFX.confirm(); snapToast('success', 'All set! Sheet sent to the printer.'); })
      .catch((err) => fail(err, doSystemPrint));
  };

  const doDownload = () => {
    if (busy) return;
    SoundFX.click();
    setBusy('png');
    renderSheet()
      .then((canvas) => new Promise((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('PNG encode failed.')), 'image/png');
      }))
      .then((blob) => {
        StickerExport.triggerDownload(blob, `snap-station-sheet-${paperId}.png`);
        setBusy('');
        SoundFX.confirm();
      })
      .catch((err) => fail(err, doDownload));
  };

  const doCricut = () => {
    if (busy) return;
    SoundFX.click();
    setBusy('cricut');
    renderSheet()
      .then((canvas) => {
        const svg = StickerExport.buildCutSvg({ paperId, layoutId: sheet.layoutId, imageDataUrl: canvas.toDataURL("image/png") });
        StickerExport.triggerDownload(new Blob([svg], { type: 'image/svg+xml' }),
          `snap-station-print-then-cut-${paperId}.svg`);
        setBusy('');
        SoundFX.confirm();
      })
      .catch((err) => fail(err, doCricut));
  };

  const doCutOnly = () => {
    SoundFX.click();
    try {
      const svg = StickerExport.buildCutSvg({ paperId, layoutId: sheet.layoutId, registrationMarks: true });
      StickerExport.triggerDownload(new Blob([svg], { type: 'image/svg+xml' }),
        `snap-station-cut-only-${paperId}.svg`);
      SoundFX.confirm();
    } catch (err) { fail(err, doCutOnly); }
  };

  const doPdf = () => {
    if (busy) return;
    SoundFX.click();
    setBusy('pdf');
    renderSheet()
      .then((canvas) => {
        StickerExport.savePdfFromCanvas(canvas, paper.w, paper.h, window.jspdf, `snap-station-sheet-${paperId}.pdf`);
        setBusy('');
        SoundFX.confirm();
      })
      .catch((err) => fail(err, doPdf));
  };

  // "Show on big screen": the rendered sheet, fullscreen — the kiosk's way of
  // sharing without any upload (photos never leave the machine).
  const showOnBigScreen = () => {
    if (busy) return;
    SoundFX.click();
    setBusy('big');
    renderSheet()
      .then((canvas) => {
        setBusy('');
        const wrap = document.createElement('div');
        wrap.className = 'bigscreen-overlay';
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-label', 'Your sheet on the big screen — tap to close');
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.alt = 'Your sticker sheet';
        wrap.appendChild(img);
        wrap.addEventListener('click', () => { SoundFX.back(); wrap.remove(); });
        document.body.appendChild(wrap);
        if (wrap.requestFullscreen) wrap.requestFullscreen().catch(() => {});
        SoundFX.confirm();
      })
      .catch((err) => fail(err, showOnBigScreen));
  };

  const layoutLabel = `${layout.name} · ${layout.sub}`;

  const sourceArr = (() => {
    const map = sheet.sourceMap || {};
    const out = [];
    for (let g = 0; g < layout.groups; g++) out[g] = map[g] || null;
    return out;
  })();

  if (stage === 'printing' || stage === 'fault') {
    return (
      <div className="wiz-step-view is-active" data-view="5">
        <div className="dyesub is-open" role="dialog" aria-modal="true" aria-labelledby="dyesub-title">
          <div className="dyesub__card">
            <h2 className="dyesub__title" id="dyesub-title">Printing your sheet{copies > 1 ? `s (${copies})` : ''}</h2>
            <p className="dyesub__sub">Dye-sublimation lays down one color at a time. Hang tight, this is the good part.</p>
            <div className="dyesub__machine">
              <div className="dyesub__paper"><div className="dyesub__wash" data-pass={DYESUB_PASSES[Math.min(passIdx, 3)].id}/></div>
              <div className="dyesub__head"/>
            </div>
            <div className="dyesub__passes">
              {DYESUB_PASSES.map((p, i) => (
                <div key={p.id}
                     className={cx('dyesub__pass', i < passIdx && 'is-done', i === passIdx && stage === 'printing' && 'is-active')}
                     data-pass={p.id}>
                  <span className="dyesub__chip"/>
                  <span className="dyesub__pname">{p.name}</span>
                  <span className="dyesub__stars" data-stars/>
                </div>
              ))}
            </div>
            {stage === 'printing' ? (
              <p className="dyesub__status">
                {passIdx === 0 ? 'Warming the print head…' : `Laying down ${DYESUB_PASSES[Math.min(passIdx, 3)].name.toLowerCase()}…`}
              </p>
            ) : (
              <div className="dyesub__fault is-open">
                <p className="dyesub__fault-title">Print didn't finish</p>
                <p className="dyesub__fault-sub">
                  The sheet jammed before it was done. {paidWithCredits ? 'Your credit was not spent. ' : ''}Want to try again?
                </p>
                <button className="dyesub__btn" type="button"
                        onClick={() => {
                          // the fault refunded the hold — take a fresh reservation for the retry
                          if (paidWithCredits) {
                            const r = SnapPayment.reserve(copies);
                            if (!r.ok) { SoundFX.error(); snapToast('error', 'Not enough credits for the retry — ask the attendant.'); return; }
                          }
                          SoundFX.confirm();
                          setStage('printing');
                          setAttempt((a) => a + 1);
                        }}>
                  Try again
                </button>
                <button className="dyesub__btn dyesub__btn--ghost" type="button"
                        onClick={() => { SoundFX.back(); onStartOver(); }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wiz-step-view is-active" data-view="5">
      <div className="pp-container">
        <div className="pp-hero">
          <div className="pp-hero__header">
            <h2 className="pp-hero__title">All set!</h2>
            <p className="pp-hero__sub">Your sheet is coming out of the printer now. Take it gently — the adhesive is fresh.</p>
          </div>
          <div className="pp-illo-frame">
            <div className="pp-sheet-preview">
              <StickerCanvas sheet={sheet} updateSheet={() => {}}
                             sources={sourceArr} stamps={sheet.stamps || []}
                             setStamps={() => {}} setImageForGroup={null}/>
            </div>
          </div>
        </div>

        <div className="pp-details">
          <div className="pp-card">
            <div className="pp-card__head">
              <div className="pp-card__avatar pp-card__avatar--print">
                <svg viewBox="0 0 24 24"><use href="#i-print"/></svg>
              </div>
              <div className="pp-card__heading">
                <h3 className="pp-card__title">Your Order</h3>
                <p className="pp-card__subtitle">Sheet Details</p>
              </div>
            </div>
            <div className="pp-card__body">
              <div className="pp-card__row"><span className="pp-card__label">Sheet</span><span className="pp-card__value">Snap Station Sticker Sheet</span></div>
              <div className="pp-card__row"><span className="pp-card__label">Layout</span><span className="pp-card__value">{layoutLabel}</span></div>
              <div className="pp-card__row"><span className="pp-card__label">Paper</span><span className="pp-card__value">4" × 6" landscape</span></div>
              <div className="pp-card__row"><span className="pp-card__label">Sheets</span><span className="pp-card__value">× {copies}</span></div>
              <div className="pp-card__row"><span className="pp-card__label">Elapsed</span><span className="pp-card__value">~{24 * copies} seconds</span></div>
            </div>
          </div>

          <div className="pp-card">
            <div className="pp-card__head">
              <div className="pp-card__avatar pp-card__avatar--sparkle">
                <svg viewBox="0 0 24 24"><use href="#i-sparkle"/></svg>
              </div>
              <div className="pp-card__heading">
                <h3 className="pp-card__title">What's Next?</h3>
                <p className="pp-card__subtitle">After printing</p>
              </div>
            </div>
            <div className="pp-card__body">
              <p className="pp-card__text">Take your sheet from the slot below. The adhesive needs about 30 seconds to fully set before you peel. Want another? Tap Print another.</p>
            </div>
          </div>

          <div className="pp-card">
            <div className="pp-card__head">
              <div className="pp-card__avatar pp-card__avatar--info">
                <svg viewBox="0 0 24 24" fill="currentColor"><use href="#i-info"/></svg>
              </div>
              <div className="pp-card__heading">
                <h3 className="pp-card__title">Pro Tips</h3>
                <p className="pp-card__subtitle">Care instructions</p>
              </div>
            </div>
            <div className="pp-card__body">
              <ul className="pp-card__list">
                <li>Press firmly along the edges and corners to seat the adhesive.</li>
                <li>Store your sheet in a flat folder — heat can curl the edges.</li>
              </ul>
            </div>
          </div>

          <div className="pp-card pp-takehome">
            <div className="pp-card__head">
              <div className="pp-card__avatar pp-card__avatar--print">
                <svg viewBox="0 0 24 24"><use href="#i-download"/></svg>
              </div>
              <div className="pp-card__heading">
                <h3 className="pp-card__title">Take it home</h3>
                <p className="pp-card__subtitle">Digital copies &amp; cut files</p>
              </div>
            </div>
            <div className="pp-card__body pp-takehome__actions">
              <button className="btn btn-secondary" onClick={doSystemPrint} disabled={!!busy}>
                <svg style={{ width: 18, height: 18 }}><use href="#i-print"/></svg>
                <span>{busy === 'print' ? 'Rendering…' : 'Print again'}</span>
              </button>
              <button className="btn btn-secondary" onClick={doDownload} disabled={!!busy}>
                <svg style={{ width: 18, height: 18 }}><use href="#i-download"/></svg>
                <span>{busy === 'png' ? 'Rendering…' : 'PNG'}</span>
              </button>
              <button className="btn btn-secondary" onClick={doPdf} disabled={!!busy}>
                <svg style={{ width: 18, height: 18 }}><use href="#i-download"/></svg>
                <span>{busy === 'pdf' ? 'Rendering…' : 'PDF'}</span>
              </button>
              <button className="btn btn-secondary" onClick={doCricut} disabled={!!busy}>
                <svg style={{ width: 18, height: 18 }}><use href="#i-edit"/></svg>
                <span>{busy === 'cricut' ? 'Rendering…' : 'Cricut SVG'}</span>
              </button>
              <button className="btn btn-secondary" onClick={doCutOnly} disabled={!!busy}>
                <svg style={{ width: 18, height: 18 }}><use href="#i-sheet"/></svg>
                <span>Cut template (SVG)</span>
              </button>
            </div>
          </div>

          <div className="pp-card pp-share">
            <div className="pp-card__head">
              <div className="pp-card__avatar pp-card__avatar--sparkle">
                <svg viewBox="0 0 24 24"><use href="#i-sparkle"/></svg>
              </div>
              <div className="pp-card__heading">
                <h3 className="pp-card__title">Digital copy</h3>
                <p className="pp-card__subtitle">Take it with you</p>
              </div>
            </div>
            <div className="pp-card__body">
              <div className="pp-share__qr">
                <div className="pp-qr"><QrPanel/></div>
                <div className="pp-share__qr-cap">
                  Scan to get the digital copy<br/>
                  <span className="pp-share__url">{shareUrl()}</span>
                </div>
              </div>
              <div className="pp-share__actions">
                <button className="btn btn-secondary" onClick={showOnBigScreen} disabled={!!busy}>
                  Show on big screen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pp-actions">
        <button className="btn btn-secondary" onClick={() => { SoundFX.back(); onStartOver(); }}>Start over</button>
        <button className="btn btn-primary" onClick={() => { SoundFX.confirm(); onPrintAnother(); }}>Print another</button>
      </div>

      {errFull && (
        <ErrFullscreen
          title="Let's try that again."
          sub={errFull.sub}
          onCallStaff={() => {
            snapToast('info', 'A staff member has been notified and is on the way.');
            setErrFull(null);
          }}
          onRetry={() => {
            const retry = errFull.retry;
            setErrFull(null);
            if (retry) setTimeout(retry, 50);
          }}/>
      )}
    </div>
  );
}
window.Step5Print = Step5Print;
