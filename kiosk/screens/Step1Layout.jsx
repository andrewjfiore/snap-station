// ======= Step 1 — Choose Layout =======
// Transplanted from the design system's sticker-ux tab, step 1. The three cards
// map onto SHEET_LAYOUTS: 1x1 → single, 2x2 → quad, 4x4 → unique.

const LAYOUT_CARDS = [
  { ds: '1x1', layoutId: 'single', title: '1 Big Photo', sub: 'Single 4×6',
    previewStyle: { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' },
    cells: ['big'] },
  { ds: '2x2', layoutId: 'quad', title: '4 Photos', sub: '2 × 2 grid', recommended: true,
    previewStyle: { gridTemplateColumns: 'repeat(2,1fr)', gridTemplateRows: 'repeat(2,1fr)' },
    cells: ['a', 'b', 'c', 'd'] },
  { ds: '4x4', layoutId: 'unique', title: '16 Mini Photos', sub: '4 × 4 grid',
    previewStyle: { gridTemplateColumns: 'repeat(4,1fr)', gridTemplateRows: 'repeat(4,1fr)', gap: 3 },
    cells: ['d','c','f','b','a','e','a','c','b','f','e','d','c','a','b','e'] },
];

function Step1Layout({ sheet, updateSheet }) {
  return (
    <div className="wiz-step-view is-active" data-view="1">
      <div className="wiz-hero">
        <div className="wiz-hero__icon" dangerouslySetInnerHTML={{ __html: WIZ_ART.layout }}/>
        <h2 className="wiz-hero__title">Choose your layout</h2>
        <p className="wiz-hero__sub">Pick how you want your photos to appear on your print.</p>
      </div>

      <div className="layout-grid" role="radiogroup" aria-label="Sheet layout">
        {LAYOUT_CARDS.map((c) => (
          <button key={c.ds}
                  className={cx('layout-card', sheet.layoutId === c.layoutId && 'is-selected')}
                  data-layout={c.ds} role="radio"
                  aria-checked={sheet.layoutId === c.layoutId}
                  onClick={() => { SoundFX.confirm(); updateSheet({ layoutId: c.layoutId }); }}>
            {c.recommended && (
              <span className="layout-card__badge">
                <svg viewBox="0 0 24 24"><path d="M12 2l2.6 6.5 7 .6-5.3 4.7 1.6 6.8L12 17l-5.9 3.6 1.6-6.8L2.4 9.1l7-.6z"/></svg>
                RECOMMENDED
              </span>
            )}
            <div className="layout-card__preview" style={c.previewStyle}>
              {c.cells.map((cell, i) => (
                <div key={i} className={`layout-card__cell layout-card__cell--${cell}`}/>
              ))}
            </div>
            <h3 className="layout-card__title">{c.title}</h3>
            <p className="layout-card__sub">{c.sub}</p>
          </button>
        ))}
      </div>

      <div className="wiz-tip">
        <div className="wiz-tip__icon">
          <svg viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V17h5.4v-1.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3z M9.5 19h5 M10.5 21h3"/></svg>
        </div>
        <div className="wiz-tip__text">You can add, remove, and rearrange your photos in the next step.</div>
        <div className="wiz-tip__diagram">
          <div className="wiz-tip__box">+</div>
          <span className="wiz-tip__arrow">→</span>
          <div className="wiz-tip__box wiz-tip__box--filled"/>
        </div>
      </div>
    </div>
  );
}
window.Step1Layout = Step1Layout;
