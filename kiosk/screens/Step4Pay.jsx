// ======= Step 4 — Review & Pay =======
// Print details + live preview (sticker-ux step 4 "Preview") and the payment
// flow from the payment tab: select method (Card / Cash — both DEMO; Use Credit
// when SnapStore credits > 0; FREE PLAY hides payment) → choose amount (quick
// sheet chips drive copies) → review & pay (mock card entry / numeric keypad)
// → processing (pokéball) → complete. Simulated card/cash payments grant
// nothing persistent — they only authorize the print; credits spend 1/sheet.

function centsToUsd(cents) {
  return (cents % 100 === 0) ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

function PayMethodChoice({ icon, label, sub, active, onClick }) {
  return (
    <button className={cx('stack-choice', active && 'is-active')} onClick={onClick} role="radio" aria-checked={active}>
      {icon}
      <span className="stack-choice__label">{label}{sub && <small>{sub}</small>}</span>
      <span className="stack-choice__check">
        <svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5 9-11"/></svg>
      </span>
    </button>
  );
}

function OrderSummary({ layoutName, copies, totalCents, method, onChangeMethod }) {
  return (
    <div className="order-summary">
      <div className="order-summary__top">
        <div className="order-summary__thumb">
          {Array.from({ length: 12 }, (_, i) => <span key={i}/>)}
        </div>
        <div className="order-summary__name">Snap Station Sticker Sheet<small>16 stickers per sheet</small></div>
      </div>
      <div className="order-summary__line"><span>Layout</span><span>{layoutName}</span></div>
      <div className="order-summary__line"><span>Quantity</span><span>{copies} sheet{copies === 1 ? '' : 's'}</span></div>
      <div className="order-summary__line"><span>Subtotal</span><span>{centsToUsd(totalCents)}</span></div>
      <div className="order-summary__line"><span>Tax</span><span>Included</span></div>
      <div className="order-summary__total"><span>Total</span><span>{method === 'credit' ? `${copies} credit${copies === 1 ? '' : 's'}` : centsToUsd(totalCents)}</span></div>
      <div className="order-summary__pay-card">
        <svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="9" width="20" height="2.5" fill="currentColor"/></svg>
        <span>{method === 'card' ? 'Card' : method === 'cash' ? 'Cash' : 'Snap credits'}</span>
        <span className="badge badge-outline-red">DEMO</span>
        <span className="order-summary__change" role="button" tabIndex={0} onClick={onChangeMethod}>Change</span>
      </div>
    </div>
  );
}

function Step4Pay({ sheet, updateSheet, credits, refreshCredits, onPaid, onTopUp }) {
  const attendant = SnapStore.getAttendant();
  const freePlay = !!attendant.freePlay;
  const price = attendant.pricePerSheetCents;
  const layout = SHEET_LAYOUTS.find((l) => l.id === sheet.layoutId) || SHEET_LAYOUTS.find((l) => l.id === 'quad');
  const paper = PAPER_SIZES.find((p) => p.id === sheet.paperId) || PAPER_SIZES[0];

  const [stage, setStage] = useState('method'); // method | amount | confirm | processing | done
  const [method, setMethod] = useState('card'); // card | cash | credit
  const [copies, setCopies] = useState(sheet.copies || 1);
  const [failed, setFailed] = useState(null);   // Tier-2 banner message or null
  const [card, setCard] = useState({ num: '4242 4242 4242 4242', exp: '12 / 28', cvc: '123', name: 'Ash Ketchum' });
  const [cashEntered, setCashEntered] = useState('');
  const [cashHint, setCashHint] = useState('');
  const [pvZoom, setPvZoom] = useState(100);

  const totalCents = price * copies;
  const stageIndex = { method: 1, amount: 2, confirm: 3, processing: 3, done: 3 }[stage];

  const setCopiesClamped = (n) => {
    const v = Math.max(1, Math.min(5, n));
    setCopies(v);
    updateSheet({ copies: v });
  };

  const sourceArr = useMemo(() => {
    const map = sheet.sourceMap || {};
    const out = [];
    for (let g = 0; g < layout.groups; g++) out[g] = map[g] || null;
    return out;
  }, [sheet.sourceMap, layout.groups]);

  const finishPayment = () => {
    setStage('done');
    SoundFX.confirm();
    snapToast('success', 'Payment approved! Thank you!');
    setTimeout(() => onPaid({ copies, method }), 1500);
  };

  const pay = () => {
    setFailed(null);
    // Consumables gate (v4): an empty paper tray or ribbon blocks printing
    // BEFORE any money or credits move.
    if (!freePlay && !SnapStore.canPrint(copies)) {
      const out = SnapStore.suppliesSnapshot();
      setFailed(out.remaining === 0
        ? 'This station is out of supplies. An attendant has been notified — please check back soon!'
        : `Only ${out.remaining} sheet${out.remaining === 1 ? '' : 's'} of supplies left — lower the quantity or ask the attendant for a refill.`);
      SoundFX.error();
      return;
    }
    if (method === 'cash') {
      const entered = parseFloat(cashEntered || '0') * 100;
      if (!(entered >= totalCents)) {
        setCashHint(`Let's try that again — that's ${centsToUsd(totalCents - Math.max(0, entered))} short.`);
        SoundFX.error();
        return;
      }
      setCashHint('');
    }
    SoundFX.coin();
    setStage('processing');
    setTimeout(() => {
      if (method === 'credit') {
        // Fault-safe model: RESERVE now; the print step commits on a finished
        // sheet and refunds on a jam. Short on credits → the Add Credits
        // overlay opens (card pack or attendant code), then payment resumes.
        const res = SnapPayment.reserve(copies);
        if (!res.ok) {
          setStage('confirm');
          refreshCredits();
          if (onTopUp) {
            onTopUp(copies, () => { refreshCredits(); pay(); });
          } else {
            setFailed('Not enough credits on your Snap Card. Ask a helper, or pick a different method.');
            SoundFX.error();
          }
          return;
        }
        refreshCredits();
        finishPayment();
        return;
      }
      // DEMO card/cash: nothing persistent is granted — the simulated charge
      // simply authorizes printing `copies` sheets.
      if (method === 'card' && card.num.replace(/\s/g, '').includes('9995')) {
        setStage('confirm');
        setFailed("The card reader didn't respond. Reinsert the card or pick a different method.");
        SoundFX.error();
        return;
      }
      finishPayment();
    }, 1400);
  };

  const cashKey = (k) => {
    SoundFX.click();
    setCashHint('');
    setCashEntered((prev) => {
      if (k === 'back') return prev.slice(0, -1);
      if (k === '.' && prev.includes('.')) return prev;
      const next = (prev + k).replace(/^0+(?=\d)/, '');
      return next.length > 6 ? prev : next;
    });
  };

  return (
    <div className="wiz-step-view is-active" data-view="4">
      <div className="wiz-hero">
        <div className="wiz-hero__icon" dangerouslySetInnerHTML={{ __html: WIZ_ART.preview }}/>
        <h2 className="wiz-hero__title">Review &amp; pay</h2>
        <p className="wiz-hero__sub">Looks great! Check your sheet, then pay your way and get printing.</p>
      </div>

      <div className="pv-container">
        <div>
          <div className="pv-preview-box pv-preview" data-layout={layout.id}>
            <div style={{ transform: `scale(${pvZoom / 100})`, transformOrigin: 'center', transition: 'transform .18s ease' }}>
              <StickerCanvas sheet={sheet} updateSheet={() => {}}
                             sources={sourceArr} stamps={sheet.stamps || []}
                             setStamps={() => {}} setImageForGroup={null}/>
            </div>
          </div>
          <div className="pv-zoom-section">
            <div className="pv-zoom-controls">
              <button className="pv-zoom-btn" type="button" aria-label="Decrease zoom"
                      onClick={() => { SoundFX.click(); setPvZoom((z) => Math.max(50, z - 10)); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              </button>
              <input type="range" className="pv-zoom-slider" min="50" max="150" value={pvZoom}
                     onChange={(e) => setPvZoom(parseInt(e.target.value, 10))} aria-label="Preview zoom"/>
              <button className="pv-zoom-btn" type="button" aria-label="Increase zoom"
                      onClick={() => { SoundFX.click(); setPvZoom((z) => Math.min(150, z + 10)); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              </button>
              <div className="pv-zoom-label">{pvZoom}%</div>
            </div>
          </div>
        </div>

        <div className="pv-rail">
          <div className="pv-card pv-details">
            <div className="pv-card__head">
              <div className="pv-card__avatar"><svg viewBox="0 0 24 24"><use href="#i-print"/></svg></div>
              <h3 className="pv-card__title">Print Details</h3>
            </div>
            <div className="pv-row">
              <div className="pv-row__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg></div>
              <div className="pv-row__label">Layout</div>
              <div className="pv-row__value">{layout.name}</div>
            </div>
            <div className="pv-row">
              <div className="pv-row__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 11h6M9 15h6"/></svg></div>
              <div className="pv-row__label">Paper Size</div>
              <div className="pv-row__value">{paper.id === '4x6' ? '4" × 6"' : paper.name}</div>
            </div>
            <div className="pv-row">
              <div className="pv-row__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/></svg></div>
              <div className="pv-row__label">Orientation</div>
              <div className="pv-row__value">Landscape</div>
            </div>
            <div className="pv-row">
              <div className="pv-row__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" fill={sheet.paperColor || '#fff'}/></svg></div>
              <div className="pv-row__label">Background</div>
              <div className="pv-row__value">{(sheet.paperColor || '#ffffff') === '#ffffff' ? 'White' : sheet.paperColor}</div>
            </div>
            <div className="pv-row pv-row--price">
              <div className="pv-row__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
              <div className="pv-row__label">Price</div>
              <div className="pv-row__value">{freePlay ? 'FREE PLAY' : `${centsToUsd(totalCents)}`}</div>
            </div>
          </div>

          <div className="pv-card pv-whats-next">
            <div className="pv-card__head">
              <div className="pv-card__avatar"><svg viewBox="0 0 24 24" fill="currentColor"><use href="#i-spark"/></svg></div>
              <h3 className="pv-card__title">What's Next?</h3>
            </div>
            <p className="pv-whats-next__text">Once you pay, your sheet prints in just a few seconds!</p>
          </div>
        </div>
      </div>

      {/* ---- Payment flow ---- */}
      <div className="pay-panel" data-pay-stage={stage}>
        {freePlay ? (
          <div className="step-card pay-freeplay">
            <div className="step-card__head">
              <span className="badge badge-yellow">
                <svg style={{ width: 14, height: 14, color: '#5c4000' }}><use href="#i-crown"/></svg>FREE PLAY
              </span>
              <div>
                <div className="step-card__title">No payment needed</div>
                <div className="step-card__sub">This station is set to free play. How many sheets?</div>
              </div>
            </div>
            <div className="step-card__body">
              <div className="cp-qty">
                <div className="cp-qty__label">
                  <span className="cp-qty__title">Sheets</span>
                  <span className="cp-qty__hint">max 5</span>
                </div>
                <div className="cp-qty__stepper">
                  <button className={cx('cp-qty__btn', copies <= 1 && 'is-disabled')} type="button" aria-label="Decrease sheets"
                          onClick={() => setCopiesClamped(copies - 1)}>−</button>
                  <span className="cp-qty__value">{copies}</span>
                  <button className={cx('cp-qty__btn', copies >= 5 && 'is-disabled')} type="button" aria-label="Increase sheets"
                          onClick={() => setCopiesClamped(copies + 1)}>+</button>
                </div>
              </div>
            </div>
            <div className="step-card__actions">
              <button className="btn btn-primary" onClick={() => { SoundFX.confirm(); onPaid({ copies, method: 'freeplay' }); }}>
                Let's print.
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="pay-panel__progress">
              <StepProgress total={3} current={stage === 'done' ? 4 : stageIndex}/>
            </div>

            {failed && stage === 'confirm' && (
              <ErrBanner title="Let's try that again." sub={failed}
                         onDismiss={() => setFailed(null)}
                         onRetry={() => { setFailed(null); pay(); }}/>
            )}

            {stage === 'method' && (
              <div className="step-card">
                <div className="step-card__head">
                  <span className="step-num">1</span>
                  <div>
                    <div className="step-card__title">Select Payment Method</div>
                    <div className="step-card__sub">How would you like to pay?</div>
                  </div>
                </div>
                <div className="step-card__body">
                  <div className="stack-choices" role="radiogroup" aria-label="Payment method">
                    <PayMethodChoice active={method === 'card'} label="Card"
                      onClick={() => { SoundFX.click(); setMethod('card'); }}
                      icon={<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7"/><rect x="3" y="9" width="18" height="2.5" fill="currentColor"/></svg>}/>
                    <PayMethodChoice active={method === 'cash'} label="Cash"
                      onClick={() => { SoundFX.click(); setMethod('cash'); }}
                      icon={<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2" fill="#5EA66D" stroke="#111" strokeWidth="1.4"/><circle cx="12" cy="12" r="2.4" fill="none" stroke="#111" strokeWidth="1.4"/></svg>}/>
                    {credits > 0 && (
                      <PayMethodChoice active={method === 'credit'} label="Use Credit" sub={`${credits} available`}
                        onClick={() => { SoundFX.click(); setMethod('credit'); }}
                        icon={<svg><use href="#pb"/></svg>}/>
                    )}
                  </div>
                </div>
                <div className="step-card__actions">
                  <button className="btn btn-primary" onClick={() => { SoundFX.confirm(); setStage('amount'); }}>Continue</button>
                </div>
              </div>
            )}

            {stage === 'amount' && (
              <div className="step-card">
                <div className="step-card__head">
                  <span className="step-num">2</span>
                  <div>
                    <div className="step-card__title">Choose Amount</div>
                    <div className="step-card__sub">How many sheets would you like?</div>
                  </div>
                </div>
                <div className="step-card__body">
                  <div className="amt-grid-3" role="radiogroup" aria-label="Quick amounts">
                    {[1, 2, 3].map((n) => (
                      <button key={n} className={cx('amt-chip', copies === n && 'is-active')}
                              onClick={() => { SoundFX.click(); setCopiesClamped(n); }}>
                        <span className="amt-chip__price">{method === 'credit' ? `${n} cr` : centsToUsd(price * n)}</span>
                        <span className="amt-chip__sub">{n} Sheet{n === 1 ? '' : 's'}</span>
                      </button>
                    ))}
                  </div>
                  <div className="cp-qty">
                    <div className="cp-qty__label">
                      <span className="cp-qty__title">Copies</span>
                      <span className="cp-qty__hint">{centsToUsd(price)} per sheet · max 5</span>
                    </div>
                    <div className="cp-qty__stepper">
                      <button className={cx('cp-qty__btn', copies <= 1 && 'is-disabled')} type="button" aria-label="Decrease copies"
                              onClick={() => setCopiesClamped(copies - 1)}>−</button>
                      <span className="cp-qty__value">{copies}</span>
                      <button className={cx('cp-qty__btn', copies >= 5 && 'is-disabled')} type="button" aria-label="Increase copies"
                              onClick={() => setCopiesClamped(copies + 1)}>+</button>
                    </div>
                  </div>
                </div>
                <div className="step-card__actions">
                  <button className="btn btn-secondary" onClick={() => { SoundFX.back(); setStage('method'); }}>Back</button>
                  <button className="btn btn-primary" onClick={() => { SoundFX.confirm(); setStage('confirm'); }}>Continue</button>
                </div>
              </div>
            )}

            {stage === 'confirm' && (
              <div className="step-card pay-confirm">
                <div className="step-card__head">
                  <span className="step-num">3</span>
                  <div>
                    <div className="step-card__title">Review &amp; Pay</div>
                    <div className="step-card__sub">Please review your order.</div>
                  </div>
                </div>
                <div className="step-card__body pay-confirm__body">
                  <OrderSummary layoutName={layout.name} copies={copies} totalCents={totalCents}
                                method={method} onChangeMethod={() => { SoundFX.back(); setStage('method'); }}/>

                  {method === 'card' && (
                    <div className="input-panel pay-card-entry">
                      <h3 className="label">Card Entry <span className="badge badge-outline-red">DEMO</span></h3>
                      <div className="stripe-key-banner">
                        <strong>Demo mode.</strong> No real card is charged — real providers plug into js/payment.js.
                      </div>
                      <div className="card-brands">
                        <span className="card-brand card-brand--visa">VISA</span>
                        <span className="card-brand card-brand--mc">MC</span>
                        <span className="card-brand card-brand--amex">AMEX</span>
                        <span className="card-brand card-brand--disco">DISCO</span>
                      </div>
                      <div>
                        <div className="field-label">Card Number</div>
                        <input className="text-field" value={card.num} inputMode="numeric" aria-label="Card number"
                               onChange={(e) => setCard({ ...card, num: e.target.value })}/>
                        {card.num.replace(/\s/g, '').includes('9995') && (
                          <ErrInline>This demo card always declines — try 4242.</ErrInline>
                        )}
                      </div>
                      <div className="two-col-fields">
                        <div>
                          <div className="field-label">Expiration</div>
                          <input className="text-field" value={card.exp} placeholder="MM / YY" aria-label="Expiration"
                                 onChange={(e) => setCard({ ...card, exp: e.target.value })}/>
                        </div>
                        <div>
                          <div className="field-label">CVC</div>
                          <input className="text-field" value={card.cvc} aria-label="CVC"
                                 onChange={(e) => setCard({ ...card, cvc: e.target.value })}/>
                          {card.cvc.length > 0 && card.cvc.length < 3 && (
                            <ErrInline>Let's try that again — CVC is 3 digits.</ErrInline>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="field-label">Name on Card</div>
                        <input className="text-field" value={card.name} aria-label="Name on card"
                               onChange={(e) => setCard({ ...card, name: e.target.value })}/>
                      </div>
                    </div>
                  )}

                  {method === 'cash' && (
                    <div className="input-panel pay-cash-entry">
                      <h3 className="label">Numeric Keypad <span className="badge badge-outline-red">DEMO</span></h3>
                      <div className="field-label">Insert cash — enter amount</div>
                      <div className="keypad-display"><span>$</span><strong>{cashEntered || '0'}</strong></div>
                      <div className="keypad">
                        {['1','2','3','4','5','6','7','8','9','.','0'].map((k) => (
                          <button key={k} className="keypad__key" onClick={() => cashKey(k)}>{k}</button>
                        ))}
                        <button className="keypad__key" aria-label="Backspace" onClick={() => cashKey('back')}>
                          <svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" d="M8 5h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8l-5-7z M11 10l5 5 M16 10l-5 5"/></svg>
                        </button>
                      </div>
                      {cashHint && <ErrInline>{cashHint}</ErrInline>}
                    </div>
                  )}

                  {method === 'credit' && (
                    <div className="input-panel pay-credit-entry">
                      <h3 className="label">Snap Card Credits</h3>
                      <div className="balance-pill">
                        <span>On your card</span>
                        <span><span className="balance-pill__amt">{credits}</span> &nbsp;credit{credits === 1 ? '' : 's'}</span>
                      </div>
                      {credits < copies && (
                        <ErrInline>You need {copies} credit{copies === 1 ? '' : 's'} for this order.</ErrInline>
                      )}
                    </div>
                  )}
                </div>
                <div className="step-card__actions">
                  <button className="btn btn-secondary" onClick={() => { SoundFX.back(); setStage('amount'); }}>Back</button>
                  <button className="btn btn-primary"
                          disabled={method === 'credit' && credits < copies}
                          onClick={pay}>
                    {method === 'credit' ? `Use ${copies} Credit${copies === 1 ? '' : 's'}` : `Pay ${centsToUsd(totalCents)}`}
                  </button>
                </div>
              </div>
            )}

            {stage === 'processing' && (
              <div className="step-card">
                <div className="step-card__body">
                  <div className="proc-state">
                    <div className="proc-state__msg">Processing your payment…</div>
                    <svg className="proc-state__ball"><use href="#pb"/></svg>
                    <div className="proc-state__sub">Please wait a moment.</div>
                  </div>
                </div>
              </div>
            )}

            {stage === 'done' && (
              <div className="step-card">
                <div className="step-card__body">
                  <div className="celebrate">
                    <div className="celebrate__disc">
                      <svg style={{ width: 64, height: 64 }}><use href="#pb"/></svg>
                      <span className="celebrate__sparkle sp1">✦</span>
                      <span className="celebrate__sparkle sp2">✦</span>
                      <span className="celebrate__sparkle sp3">✦</span>
                      <span className="celebrate__sparkle sp4">✦</span>
                      <span className="celebrate__check">
                        <svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5 9-11"/></svg>
                      </span>
                    </div>
                    <div className="celebrate__msg">Payment approved!</div>
                    <div className="celebrate__sub">Your sheet is printing.</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
window.Step4Pay = Step4Pay;
