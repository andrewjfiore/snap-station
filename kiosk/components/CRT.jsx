// CRT screen wrapper with header/body/footer
function ScreenShell({ crumbs, footer, children }) {
  // NOTE: deliberately NOT using `key` or the .screen-enter mount animation here.
  // The screen wrapper stays mounted across re-renders; the CRT-flicker animation
  // would otherwise restart on every render and freeze content at the 0% keyframe.
  return (
    <div className="screen">
      <div className="screen-hdr">
        <div className="crumbs">
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              <span className={i === crumbs.length - 1 ? 'now' : ''}>{c}</span>
              {i < crumbs.length - 1 && <span className="sep">›</span>}
            </React.Fragment>
          ))}
        </div>
        <div className="gamepad-hint">
          <span className="gp-btn">A</span> Select
          <span className="gp-btn b">B</span> Back
        </div>
      </div>
      <div className="screen-body">{children}</div>
      {footer && <div className="screen-footer">{footer}</div>}
    </div>
  );
}
window.ScreenShell = ScreenShell;
