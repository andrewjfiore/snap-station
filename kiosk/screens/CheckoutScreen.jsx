// Checkout — credits via SnapPayment; the card/tap/coin UI is a labeled DEMO
// (v1 payment is simulated; real providers slot into js/payment.js).
function CheckoutScreen({ setScreen, sheet, credits, refreshCredits }) {
  const [method, setMethod] = useState('card');
  const [card, setCard] = useState({ num: '', exp: '', cvc: '', zip: '' });
  const [processing, setProcessing] = useState(false);
  const attendant = SnapStore.getAttendant();
  const freePlay = !!attendant.freePlay;

  const basePrice = attendant.pricePerSheetCents / 100;
  const layout = SHEET_LAYOUTS.find(l => l.id === sheet.layoutId) || SHEET_LAYOUTS[0];
  const qty = sheet.copies || 1;
  const total = (basePrice * qty).toFixed(2);

  const goPrint = () => {
    SoundFX.confirm();
    refreshCredits();
    setScreen('print');
  };

  // Spend one Snap Card credit (free play never decrements).
  const useCredit = () => {
    const res = SnapPayment.spendCredit();
    if (!res.ok) { SoundFX.error(); refreshCredits(); return; }
    goPrint();
  };

  // DEMO pay: buys a Snap Card (mock provider), then spends one credit to print.
  const pay = () => {
    SoundFX.coin();
    setProcessing(true);
    setTimeout(() => {
      SnapPayment.buyCard().then((res) => {
        setProcessing(false);
        if (!res.success) { SoundFX.error(); refreshCredits(); return; }
        const spend = SnapPayment.spendCredit();
        if (!spend.ok) { SoundFX.error(); refreshCredits(); return; }
        goPrint();
      });
    }, 1400);
  };

  const buyCardOnly = () => {
    setProcessing(true);
    SnapPayment.buyCard().then((res) => {
      setProcessing(false);
      if (res.success) { SoundFX.coin(); refreshCredits(); }
      else SoundFX.error();
    });
  };

  return (
    <ScreenShell crumbs={['Design', 'Checkout']}
      footer={<button className="btn sm" onClick={() => { SoundFX.back(); setScreen('editor'); }}>← Back to Designer</button>}>
      <div className="checkout">
        <h2 className="display" style={{fontSize: 'var(--step-3)', marginBottom: 16}}>
          Review & Pay
          {freePlay && <span className="freeplay-badge" style={{marginLeft: 12, verticalAlign: 'middle'}}>★ Free Play</span>}
        </h2>

        <div style={{background: 'rgba(0,0,0,.2)', borderRadius: 12, padding: 16, marginBottom: 16}}>
          <div className="cart-line">
            <span>Sticker Sheet — {layout.name}</span>
            <span>${basePrice.toFixed(2)}</span>
          </div>
          <div className="cart-line">
            <span>Copies</span>
            <span style={{display: 'flex', gap: 8, alignItems: 'center'}}>
              <button className="btn sm" style={{width: 28, padding: 0}} disabled>−</button>
              <strong>{qty}</strong>
              <button className="btn sm" style={{width: 28, padding: 0}} disabled>+</button>
            </span>
          </div>
          <div className="cart-line">
            <span>Tax (auto)</span>
            <span style={{opacity: .6}}>calculated</span>
          </div>
          <div className="cart-line">
            <span>Total</span>
            <span style={{color: 'var(--accent)'}}>{freePlay ? 'FREE' : `$${total}`}</span>
          </div>
        </div>

        {freePlay ? (
          <div style={{textAlign: 'center', padding: 30, background: 'color-mix(in oklab, var(--accent-3) 16%, transparent)', borderRadius: 12}}>
            <div className="freeplay-badge" style={{fontSize: 12, padding: '8px 16px'}}>★ FREE PLAY ★</div>
            <div style={{fontSize: 13, opacity: .8, marginTop: 12}}>This station is set to free play — no payment needed.</div>
            <button className="btn primary" style={{width: '100%', marginTop: 16, padding: '14px', fontSize: 15}}
                    onClick={useCredit}>
              Print Sheet →
            </button>
          </div>
        ) : (
          <>
            {credits > 0 ? (
              <div style={{background: 'color-mix(in oklab, var(--accent) 18%, transparent)', borderRadius: 12, padding: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <div style={{fontFamily: 'var(--font-pixel)', fontSize: 10, letterSpacing: '.12em', opacity: .8}}>PREPAID CREDIT AVAILABLE</div>
                  <div style={{fontSize: 13, marginTop: 2}}>Use 1 of your {credits} credits instead?</div>
                </div>
                <button className="btn primary sm" onClick={useCredit}>Use Credit</button>
              </div>
            ) : (
              <div style={{background: 'rgba(0,0,0,.2)', borderRadius: 12, padding: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <div style={{fontFamily: 'var(--font-pixel)', fontSize: 10, letterSpacing: '.12em', opacity: .8}}>NO CREDITS ON CARD</div>
                  <div style={{fontSize: 13, marginTop: 2}}>A Snap Card adds {attendant.creditsPerCard} credits.</div>
                </div>
                <button className="btn primary sm" onClick={buyCardOnly} disabled={processing}>
                  + Buy Snap Card · ${basePrice.toFixed(2)}
                </button>
              </div>
            )}

            <h3 style={{fontFamily: 'var(--font-pixel)', fontSize: 10, letterSpacing: '.14em', marginBottom: 8, opacity: .8}}>
              PAYMENT METHOD<span className="demo-chip">DEMO</span>
            </h3>
            <div className="pay-methods">
              {[
                { id: 'card', ico: '💳', nm: 'Card', sub: 'Visa · MC · Amex' },
                { id: 'tap', ico: '📱', nm: 'Tap to Pay', sub: 'Apple / Google' },
                { id: 'coin', ico: '🪙', nm: 'Coin', sub: 'Quarters only' },
              ].map(m => (
                <div key={m.id} className={cx('pay-method', method === m.id && 'active')}
                     onClick={() => { SoundFX.click(); setMethod(m.id); }}>
                  <div className="ico">{m.ico}</div>
                  <div>
                    <div className="nm">{m.nm}</div>
                    <div className="sub">{m.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {method === 'card' && (
              <div className="card-form">
                <input placeholder="Card number" value={card.num}
                       onChange={e => setCard({...card, num: e.target.value})}/>
                <div className="card-row">
                  <input placeholder="MM/YY" value={card.exp}
                         onChange={e => setCard({...card, exp: e.target.value})}/>
                  <input placeholder="CVC" value={card.cvc}
                         onChange={e => setCard({...card, cvc: e.target.value})}/>
                  <input placeholder="ZIP" value={card.zip}
                         onChange={e => setCard({...card, zip: e.target.value})}/>
                </div>
                <div style={{fontSize: 10, opacity: .6, fontFamily: 'var(--font-mono)'}}>
                  🔒 DEMO — no real card is charged. Real providers plug into js/payment.js.
                </div>
              </div>
            )}
            {method === 'tap' && (
              <div style={{textAlign: 'center', padding: 30, background: 'rgba(0,0,0,.2)', borderRadius: 12}}>
                <div style={{fontSize: 48, opacity: .4, marginBottom: 10}}>📱</div>
                <div style={{fontFamily: 'var(--font-pixel)', fontSize: 12, letterSpacing: '.14em', color: 'var(--accent)'}}>TAP TO PAY<span className="demo-chip">DEMO</span></div>
                <div style={{fontSize: 12, opacity: .7, marginTop: 6}}>Hold device near the reader below</div>
              </div>
            )}
            {method === 'coin' && (
              <div style={{textAlign: 'center', padding: 30, background: 'rgba(0,0,0,.2)', borderRadius: 12}}>
                <div style={{fontSize: 48, opacity: .4, marginBottom: 10}}>🪙</div>
                <div style={{fontFamily: 'var(--font-pixel)', fontSize: 12, letterSpacing: '.14em', color: 'var(--accent)'}}>INSERT ${total}<span className="demo-chip">DEMO</span></div>
                <div style={{fontSize: 12, opacity: .7, marginTop: 6}}>Coin slot accepts quarters</div>
              </div>
            )}

            <button className="btn primary" style={{width: '100%', marginTop: 16, padding: '14px', fontSize: 15}}
                    onClick={pay} disabled={processing}>
              {processing ? 'Processing…' : `Pay $${total} & Print`}
            </button>
          </>
        )}
      </div>
    </ScreenShell>
  );
}
window.CheckoutScreen = CheckoutScreen;
