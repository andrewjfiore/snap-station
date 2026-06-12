// ======= Session overlays — design system v4 markup =======
// AddCreditsOverlay (.addcredits): tabs Pay-by-card / Enter-a-code, credit
// packs with bulk pricing, demo card 4242…, attendant Snap Pass codes.
// PrivacyCard (.privacy-card): parent-facing reassurance list.
// CollectionOverlay: "My stickers" saved-photo grid.

// Pack pricing: bulk multipliers of the attendant's per-sheet price
// (spec at $4/credit: 1→$4, 3→$12, 5→$18 save $2, 10→$32 save $8).
function creditPacks(priceCents) {
  const packs = [
    { credits: 1, mult: 1 },
    { credits: 3, mult: 3 },
    { credits: 5, mult: 4.5 },
    { credits: 10, mult: 8 },
  ];
  return packs.map((p) => {
    const cents = Math.round(priceCents * p.mult);
    const save = priceCents * p.credits - cents;
    return { credits: p.credits, cents, save };
  });
}

function dollars(cents) {
  return '$' + (cents / 100).toFixed(2);
}

function tokenErrorCopy(reason) {
  if (reason === 'short') return 'Codes are 6 to 8 letters and numbers.';
  if (reason === 'used') return 'That code has already been used. Ask the attendant for a fresh one.';
  return "Hmm, that code didn't match. Check the letters and try again.";
}

const DEMO_CARD = '4242424242424242';

function AddCreditsOverlay({ need, initialView, onDone, onClose }) {
  const [view, setView] = useState(initialView || 'card');
  const att = SnapStore.getAttendant();
  const packs = creditPacks(att.pricePerSheetCents);
  const [pack, setPack] = useState(packs[1]); // 3-credit pack preselected per spec
  const [cardNum, setCardNum] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [feedback, setFeedback] = useState({ kind: '', msg: '' });
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [codeMsg, setCodeMsg] = useState('Enter the 6 to 8 character code from your slip.');
  const balance = SnapPayment.availableCredits();
  const locked = att.productionLock;

  const settle = () => {
    if (!need || SnapPayment.availableCredits() >= need) onDone();
  };

  const payCard = () => {
    if (busy) return;
    const digits = cardNum.replace(/\D/g, '');
    if (digits.length < 16 || !cardExp.trim() || cardCvc.replace(/\D/g, '').length < 3) {
      SoundFX.error();
      setFeedback({ kind: 'err', msg: "Let's try that again — check the card number, expiry, and CVC." });
      return;
    }
    setBusy(true);
    setFeedback({ kind: '', msg: 'Processing your payment…' });
    setTimeout(() => {
      if (digits !== DEMO_CARD) {
        setBusy(false);
        SoundFX.error();
        setFeedback({ kind: 'err', msg: 'Card declined. Try another card or ask the attendant for a code.' });
        return;
      }
      SnapPayment.current().charge({
        amountCents: pack.cents, currency: 'usd',
        description: 'Snap credits ×' + pack.credits, credits: pack.credits,
      }).then((res) => {
        setBusy(false);
        if (res.success) {
          SnapPayment.grantCredits(res.credits || pack.credits);
          SoundFX.coin();
          snapToast('success', 'Payment approved! Thank you!');
          settle();
        } else {
          SoundFX.error();
          setFeedback({ kind: 'err', msg: 'Something went wrong. Please try again.' });
        }
      });
    }, 1100);
  };

  const redeem = () => {
    const res = SnapPayment.redeemToken(code);
    if (res.ok) {
      SoundFX.coin();
      snapToast('success', `+${res.credits} credit${res.credits === 1 ? '' : 's'} added!`);
      setCode('');
      setCodeMsg('Done! Credits added to the station.');
      settle();
    } else {
      SoundFX.error();
      setCodeMsg(tokenErrorCopy(res.reason));
    }
  };

  return (
    <div className="addcredits is-open" role="dialog" aria-modal="true" aria-label="Add print credits"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="addcredits__panel">
        <div className="addcredits__head">
          <h2 className="addcredits__title">Add print credits</h2>
          <p className="addcredits__sub">
            {need ? `You need ${need} credit${need === 1 ? '' : 's'} for this print.` : 'Each credit prints one sticker sheet.'}
          </p>
          <div className="addcredits__balance">You have <strong>{balance}</strong> credit{balance === 1 ? '' : 's'}</div>
        </div>

        <div className="addcredits__tabs" role="tablist">
          <button className={cx('addcredits__tab', view === 'card' && 'is-active')} role="tab"
                  aria-selected={view === 'card'}
                  onClick={() => { SoundFX.click(); setView('card'); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 9h18" strokeWidth="2"/></svg>
            Pay by card
          </button>
          <button className={cx('addcredits__tab', view === 'code' && 'is-active')} role="tab"
                  aria-selected={view === 'code'}
                  onClick={() => { SoundFX.click(); setView('code'); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M15 7a4 4 0 1 0-4 4h10v3m-4-3v3"/></svg>
            Enter a code
          </button>
        </div>

        {view === 'card' ? (
          <div className="addcredits__view is-active" data-acview="card">
            <div className="ac-packs">
              {packs.map((p) => (
                <button key={p.credits} className={cx('ac-pack', pack.credits === p.credits && 'is-active')}
                        onClick={() => { SoundFX.click(); setPack(p); }}>
                  <div className="ac-pack__credits">{p.credits}</div>
                  <div className="ac-pack__price">{dollars(p.cents)}</div>
                  {p.save > 0 && <span className="ac-pack__deal">SAVE {dollars(p.save).replace('.00', '')}</span>}
                </button>
              ))}
            </div>
            <div className="ac-card-fields">
              <input className="ac-input" inputMode="numeric" autoComplete="cc-number"
                     placeholder={locked ? 'Card number' : 'Card number  (4242 4242 4242 4242)'}
                     value={cardNum} onChange={(e) => { setCardNum(e.target.value); setFeedback({ kind: '', msg: '' }); }}/>
              <div className="ac-row2">
                <input className="ac-input" inputMode="numeric" autoComplete="cc-exp" placeholder="MM / YY"
                       value={cardExp} onChange={(e) => setCardExp(e.target.value)}/>
                <input className="ac-input" inputMode="numeric" autoComplete="cc-csc" placeholder="CVC"
                       value={cardCvc} onChange={(e) => setCardCvc(e.target.value)}/>
              </div>
            </div>
            <div className={cx('ac-feedback', feedback.kind === 'err' && 'is-error')} aria-live="polite" data-code-feedback>
              {feedback.msg}
            </div>
            <button className="ac-cta" onClick={payCard} disabled={busy}>
              {busy ? 'Processing…' : `Pay ${dollars(pack.cents)} · ${pack.credits} credit${pack.credits === 1 ? '' : 's'}`}
            </button>
            {!locked && <p className="ac-help">Demo mode: card 4242 4242 4242 4242 succeeds. No real charge is made.</p>}
          </div>
        ) : (
          <div className="addcredits__view is-active" data-acview="code">
            <input className="ac-input ac-input--code" maxLength={10} autoComplete="off" spellCheck={false}
                   placeholder={locked ? 'Enter your code' : 'e.g. SNAP05'} value={code} autoFocus
                   onChange={(e) => setCode(e.target.value.toUpperCase())}
                   onKeyDown={(e) => { if (e.key === 'Enter' && code.trim()) redeem(); }}/>
            <div className="ac-feedback" aria-live="polite" data-code-feedback>{codeMsg}</div>
            <button className="ac-cta" onClick={redeem} disabled={!code.trim()}>Redeem code</button>
            <div className="ac-attendant-note">Pay the attendant with cash to receive a Snap Pass code worth print credits.</div>
          </div>
        )}

        <div className="addcredits__foot">
          <button className="btn btn-secondary" onClick={() => { SoundFX.back(); onClose(); }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// Parent-facing privacy reassurance, transplanted from the spec.
function PrivacyCard({ onClose }) {
  const points = [
    'Photos are taken and printed on this machine. They are not uploaded to the internet.',
    'Nothing is kept after your session ends, unless you choose to save or share a sheet.',
    'Card payment is handled by the secure reader. Card numbers never touch this kiosk.',
    'A jam or error never charges you. You only pay for a finished sheet.',
  ];
  return (
    <div className="privacy-card is-open" role="dialog" aria-modal="true" aria-labelledby="privacy-card-title"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="privacy-card__panel">
        <h2 className="privacy-card__title" id="privacy-card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z"/><path d="M9 12l2 2 4-4"/></svg>
          Your photos, your privacy
        </h2>
        <ul className="privacy-card__list">
          {points.map((p, i) => (
            <li key={i}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12l5 5 9-11"/></svg>
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <button className="privacy-card__btn" onClick={() => { SoundFX.confirm(); onClose(); }}>Got it</button>
      </div>
    </div>
  );
}

// "My stickers" — the saved-photo collection from this station.
function CollectionOverlay({ snaps, onStart, onClose }) {
  return (
    <div className="overlay-scrim" role="dialog" aria-modal="true" aria-label="My stickers"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="overlay-card overlay-card--wide">
        <h3 className="overlay-title">My stickers</h3>
        {snaps.length === 0 ? (
          <p className="overlay-sub">Nothing saved yet — tap START and take some photos!</p>
        ) : (
          <>
            <p className="overlay-sub">{snaps.length} photo{snaps.length === 1 ? '' : 's'} saved on this station.</p>
            <div className="collection-grid">
              {snaps.slice(0, 24).map((s) => (
                <div key={s.id} className="collection-cell">
                  <img src={s.dataUrl} alt="" loading="lazy"/>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="overlay-actions">
          <button className="btn btn-secondary" onClick={() => { SoundFX.back(); onClose(); }}>Close</button>
          {snaps.length > 0 && (
            <button className="btn btn-primary" onClick={() => { SoundFX.confirm(); onStart(); }}>
              Make stickers with these →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

window.AddCreditsOverlay = AddCreditsOverlay;
window.PrivacyCard = PrivacyCard;
window.CollectionOverlay = CollectionOverlay;
