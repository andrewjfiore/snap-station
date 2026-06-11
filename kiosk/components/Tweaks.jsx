// Tweaks panel (toolbar toggle)
function TweaksPanel({ tweaks, setTweaks, open, onClose }) {
  return (
    <div className={cx('tweaks-panel', open && 'open')}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
        <h3>TWEAKS</h3>
        <button className="btn sm" onClick={onClose}>✕</button>
      </div>

      <div className="row">
        <label>Theme</label>
        <select value={tweaks.theme} onChange={e => setTweaks({...tweaks, theme: e.target.value})}>
          {THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="row">
        <label>Cabinet</label>
        <select value={tweaks.cabinetVisible} onChange={e => setTweaks({...tweaks, cabinetVisible: e.target.value})}>
          <option value="auto">Auto</option>
          <option value="always">Always</option>
          <option value="minimal">Minimal</option>
        </select>
      </div>

      <div className="row">
        <label>CRT Intensity</label>
        <input type="range" min="0" max="1" step="0.05" value={tweaks.crtIntensity}
               onChange={e => setTweaks({...tweaks, crtIntensity: parseFloat(e.target.value)})}/>
      </div>

      <div className="row">
        <label>Scanlines</label>
        <input type="checkbox" checked={tweaks.scanlines}
               onChange={e => setTweaks({...tweaks, scanlines: e.target.checked})}/>
      </div>

      <div className="row">
        <label>Bezel Radius</label>
        <input type="range" min="6" max="40" step="1" value={tweaks.bezelRadius}
               onChange={e => setTweaks({...tweaks, bezelRadius: parseInt(e.target.value)})}/>
      </div>

      <div className="row">
        <label>Sound</label>
        <input type="checkbox" checked={tweaks.soundOn}
               onChange={e => { SoundFX.setEnabled(e.target.checked); setTweaks({...tweaks, soundOn: e.target.checked}); }}/>
      </div>

      <div className="row">
        <label>Backdrop</label>
        <select value={tweaks.rentalShelves === false ? 'none' : (tweaks.decorStyle || 'shelves')}
                onChange={e => {
                  const v = e.target.value;
                  setTweaks(v === 'none'
                    ? {...tweaks, rentalShelves: false}
                    : {...tweaks, rentalShelves: true, decorStyle: v});
                }}>
          <option value="shelves">Rental shelves (3D)</option>
          <option value="lobby">Lobby wallpaper</option>
          <option value="none">None</option>
        </select>
      </div>

      <div style={{borderTop: '1px solid rgba(255,255,255,.1)', marginTop: 14, paddingTop: 10}}>
        <div style={{fontSize: 10, opacity: .5, fontFamily: 'var(--font-mono)'}}>
          v2026.04 — Snap Kiosk (professionalized)
        </div>
      </div>
    </div>
  );
}
window.TweaksPanel = TweaksPanel;
