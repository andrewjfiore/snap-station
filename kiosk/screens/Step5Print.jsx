// ======= Step 5 — Print & Post-Print =======
// Printing stage (cp-stage printer + pokéball progress) then the post-print
// layout from the design system's post-print tab: "All set!", Your Order,
// What's Next, Pro Tips, Start over / Print another. The real export actions
// (Print via system/print-server, PNG, Cricut SVG, cut-only SVG) live in the
// "Take it home" group. Render/print failures raise the Tier-3 full-screen.

function Step5Print({ sheet, snaps, order, onStartOver, onPrintAnother }) {
  const [stage, setStage] = useState('printing'); // printing | done
  const [ballsDone, setBallsDone] = useState(0);
  const [busy, setBusy] = useState('');
  const [errFull, setErrFull] = useState(null); // { sub, retry }
  const copies = (order && order.copies) || sheet.copies || 1;

  const paperId = sheet.paperId || '4x6';
  const paper = PAPER_SIZES.find((p) => p.id === paperId) || PAPER_SIZES[0];
  const layout = SHEET_LAYOUTS.find((l) => l.id === sheet.layoutId) || SHEET_LAYOUTS[1];

  // Simulated kiosk print cycle: progress pokéballs, then "All set!".
  // Stats: prints bump once per authorized sheet.
  useEffect(() => {
    SoundFX.printer();
    const att = SnapStore.getAttendant();
    SnapStore.setAttendant({ stats: { ...att.stats, prints: ((att.stats && att.stats.prints) || 0) + copies } });
    const t0 = Date.now();
    const tick = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 2600);
      setBallsDone(Math.round(p * 6));
      if (p >= 1) {
        clearInterval(tick);
        setStage('done');
        SoundFX.confirm();
      }
    }, 200);
    return () => clearInterval(tick);
  }, []);

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
        const svg = StickerExport.buildCutSvg({ paperId, imageDataUrl: canvas.toDataURL('image/png') });
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
      const svg = StickerExport.buildCutSvg({ paperId, registrationMarks: true });
      StickerExport.triggerDownload(new Blob([svg], { type: 'image/svg+xml' }),
        `snap-station-cut-only-${paperId}.svg`);
      SoundFX.confirm();
    } catch (err) { fail(err, doCutOnly); }
  };

  const layoutLabel = layout.id === 'single' ? '1 Big Photo' : layout.id === 'quad' ? '4 Photos · 2×2' : '16 Mini · 4×4';

  const sourceArr = (() => {
    const map = sheet.sourceMap || {};
    const out = [];
    for (let g = 0; g < layout.groups; g++) out[g] = map[g] || null;
    return out;
  })();

  if (stage === 'printing') {
    return (
      <div className="wiz-step-view is-active" data-view="5">
        <div className="cp-stage cp-stage--printing">
          <div className="cp-printer" aria-hidden="true" dangerouslySetInnerHTML={{ __html: CP_PRINTER_ART }}/>
          <div className="cp-controls">
            <div className="cp-card">
              <h4>Printing your sheet{copies > 1 ? `s (${copies})` : ''}…</h4>
              <PokeballLoading text="Preparing your print…"/>
              <div className="pb-row" aria-hidden="true">
                {Array.from({ length: 6 }, (_, i) => (
                  <svg key={i} className={cx('pb', i >= ballsDone && 'todo')}><use href="#pb"/></svg>
                ))}
              </div>
              <div className="cp-summary-row"><span>Layout</span><strong>{layoutLabel}</strong></div>
              <div className="cp-summary-row"><span>Sheet</span><strong>4 × 6 landscape</strong></div>
              <div className="cp-summary-row"><span>Estimated time</span><strong>~{24 * copies} sec</strong></div>
            </div>
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
                <span>{busy === 'print' ? 'Rendering…' : 'Print'}</span>
              </button>
              <button className="btn btn-secondary" onClick={doDownload} disabled={!!busy}>
                <svg style={{ width: 18, height: 18 }}><use href="#i-download"/></svg>
                <span>{busy === 'png' ? 'Rendering…' : 'Download PNG'}</span>
              </button>
              <button className="btn btn-secondary" onClick={doCricut} disabled={!!busy}>
                <svg style={{ width: 18, height: 18 }}><use href="#i-edit"/></svg>
                <span>{busy === 'cricut' ? 'Rendering…' : 'Cricut SVG'}</span>
              </button>
              <button className="btn btn-secondary" onClick={doCutOnly} disabled={!!busy}>
                <svg style={{ width: 18, height: 18 }}><use href="#i-sheet"/></svg>
                <span>Cut-only SVG</span>
              </button>
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
