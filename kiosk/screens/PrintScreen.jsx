// Print screen — printer animation, then real export actions:
// system print, PNG download, Cricut print-then-cut SVG, cut-only SVG.
function PrintScreen({ setScreen, sheet, snaps }) {
  const [stage, setStage] = useState('printing'); // printing | done
  const [busy, setBusy] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const previewRef = useRef(null);

  const paperId = sheet.paperId || '4x6';
  const paper = PAPER_SIZES.find(p => p.id === paperId) || PAPER_SIZES[0];

  useEffect(() => {
    SoundFX.printer();
    const t = setTimeout(() => setStage('done'), 3000);
    return () => clearTimeout(t);
  }, []);

  const fail = (err) => {
    setBusy('');
    SoundFX.error();
    setErrMsg((err && err.message) || 'Could not render the sheet.');
  };

  const renderSheet = () => {
    setErrMsg('');
    return renderSheetToCanvas(sheet, snaps);
  };

  const bumpPrintStats = () => {
    const att = SnapStore.getAttendant();
    SnapStore.setAttendant({ stats: { ...att.stats, prints: ((att.stats && att.stats.prints) || 0) + 1 } });
  };

  // Kiosk deployments set a print-server URL in the attendant drawer
  // (deploy/print-server). Try it first; fall back to the browser dialog.
  const doSystemPrint = () => {
    if (busy) return;
    SoundFX.click();
    setBusy('print');
    renderSheet()
      .then(canvas => {
        const serverUrl = (SnapStore.getSettings().printServerUrl || '').trim();
        if (!serverUrl) return StickerExport.printSheetImage(canvas.toDataURL('image/png'), paper.w, paper.h);
        return new Promise((resolve, reject) => {
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG encode failed.')), 'image/png');
        })
          .then(blob => StickerExport.printViaServer(serverUrl, blob, { media: paperId }))
          .catch(err => {
            console.warn('Print server unreachable, falling back to browser dialog:', err);
            return StickerExport.printSheetImage(canvas.toDataURL('image/png'), paper.w, paper.h);
          });
      })
      .then(() => { setBusy(''); bumpPrintStats(); SoundFX.confirm(); })
      .catch(fail);
  };

  const doDownload = () => {
    if (busy) return;
    SoundFX.click();
    setBusy('png');
    renderSheet()
      .then(canvas => new Promise((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG encode failed.')), 'image/png');
      }))
      .then(blob => {
        StickerExport.triggerDownload(blob, `snap-station-sheet-${paperId}.png`);
        setBusy('');
        SoundFX.confirm();
      })
      .catch(fail);
  };

  const doCricut = () => {
    if (busy) return;
    SoundFX.click();
    setBusy('cricut');
    renderSheet()
      .then(canvas => {
        const svg = StickerExport.buildCutSvg({ paperId, imageDataUrl: canvas.toDataURL('image/png') });
        StickerExport.triggerDownload(new Blob([svg], { type: 'image/svg+xml' }),
          `snap-station-print-then-cut-${paperId}.svg`);
        setBusy('');
        SoundFX.confirm();
      })
      .catch(fail);
  };

  const doCutOnly = () => {
    SoundFX.click();
    try {
      const svg = StickerExport.buildCutSvg({ paperId, registrationMarks: true });
      StickerExport.triggerDownload(new Blob([svg], { type: 'image/svg+xml' }),
        `snap-station-cut-only-${paperId}.svg`);
      SoundFX.confirm();
    } catch (err) { fail(err); }
  };

  return (
    <ScreenShell crumbs={['Print', stage === 'printing' ? 'Processing' : 'Complete']}
      footer={<button className="btn primary sm" onClick={() => { SoundFX.click(); setScreen('attract'); }}>Done — New Session</button>}>
      <div className="print-anim">
        {stage === 'printing' ? (
          <>
            <div className="print-preview" ref={previewRef}>
              <div style={{position: 'absolute', inset: '5%', display: 'grid',
                           gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, 1fr)', gap: 4}}>
                {[...Array(16)].map((_,i) => (
                  <div key={i} style={{
                    background: `linear-gradient(135deg, hsl(${i * 22}, 70%, 55%), hsl(${i * 22 + 40}, 70%, 45%))`,
                    borderRadius: 3
                  }}/>
                ))}
              </div>
            </div>
            <div className="print-msg">
              PRINTING IN PROGRESS
              <div className="small">Your sticker sheet is being printed now</div>
            </div>
            <div style={{display: 'flex', gap: 8, opacity: .6}}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--accent)',
                  animation: `blink 1.2s ${i * 0.2}s infinite`
                }}/>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{fontFamily: 'var(--font-pixel)', fontSize: 14, letterSpacing: '.2em', color: 'var(--accent-3)'}}>✓ DONE</div>
            <h2 className="display" style={{fontSize: 'var(--step-3)'}}>Your sheet is ready!</h2>
            <p style={{opacity: .7, textAlign: 'center', maxWidth: 420}}>
              Collect your printed sheet from the output slot below. Save a copy or grab
              the Cricut cut files for kiss-cutting at home.
            </p>
            <div className="share-row">
              <button className="share-btn" onClick={doSystemPrint} disabled={!!busy}>
                <span>🖨</span>{busy === 'print' ? 'Rendering…' : 'Print'}
              </button>
              <button className="share-btn" onClick={doDownload} disabled={!!busy}>
                <span>⬇</span>{busy === 'png' ? 'Rendering…' : 'Download PNG'}
              </button>
              <button className="share-btn" onClick={doCricut} disabled={!!busy}>
                <span>✂</span>{busy === 'cricut' ? 'Rendering…' : 'Cricut SVG'}
              </button>
              <button className="share-btn" onClick={doCutOnly} disabled={!!busy}>
                <span>▦</span>Cut-only SVG
              </button>
            </div>
            {errMsg && <div className="print-error" role="alert">⚠ {errMsg}</div>}
            <div style={{fontFamily: 'var(--font-mono)', fontSize: 10, opacity: .5, marginTop: 20}}>
              SESSION #{Math.floor(Math.random() * 99999)} · {new Date().toLocaleString()}
            </div>
          </>
        )}
      </div>
    </ScreenShell>
  );
}
window.PrintScreen = PrintScreen;
