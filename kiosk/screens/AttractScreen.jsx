// Attract / home screen
function AttractScreen({ setScreen }) {
  return (
    <ScreenShell crumbs={['Snap Kiosk', 'Welcome']}
      footer={<div className="btn-hints"><span><kbd>↵</kbd> Start</span></div>}>
      <div className="attract">
        <div style={{fontFamily: 'var(--font-pixel)', fontSize: 11, letterSpacing: '.2em', color: 'var(--accent)'}}>★ INSERT MEMORIES ★</div>
        <div className="snap-wordmark lg" style={{margin: '4px 0 8px'}}>Snap<span className="alt"> Station</span></div>
        <p className="tag">Plug in a camera or console. Capture the good bits. Arrange, filter, and print a glossy sticker sheet — right here, right now.</p>
        <div className="demo-reel">
          {DEMO_SNAPS.slice(0,5).map(s => (
            <div key={s.id} className="frame" style={{background: `linear-gradient(135deg, ${s.from}, ${s.to})`}} />
          ))}
        </div>
        <button className="press-start" onClick={() => { SoundFX.confirm(); setScreen('capture'); }}>PRESS START</button>
        <div style={{display: 'flex', gap: 20, marginTop: 16, fontSize: 11, opacity: .6, fontFamily: 'var(--font-mono)'}}>
          <span>◉ CAMERA READY</span>
          <span>● STATION 042 ONLINE</span>
          <span>v2026.04</span>
        </div>
      </div>
    </ScreenShell>
  );
}
window.AttractScreen = AttractScreen;
