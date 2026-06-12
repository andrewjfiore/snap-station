// ======= Kiosk payment: provider registry + Snap Card credit facade =======
// Provider registry restored from the reverted snap-payment-providers.js
// (commit 99f7fe8). v1 ships the mock provider only — real providers
// (Stripe Terminal, Square, Adyen, vendor-specific) slot in here without
// touching the UI layer.
//
// Provider contract:
//   provider.name: string
//   provider.available(): Promise<boolean>
//   provider.charge({ amountCents, currency, description, credits }): Promise<{
//     success: boolean, transactionId?: string, credits?: number, error?: string
//   }>
//   provider.refund(transactionId): Promise<{ success: boolean }>  // optional
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./snap-store.js'));
  } else {
    root.SnapPayment = factory(root.SnapStore);
  }
}(typeof self !== 'undefined' ? self : this, function (SnapStore) {
  'use strict';

  var providers = {};
  var active = null;

  function register(provider) {
    if (!provider || !provider.name) throw new Error('provider must have a name');
    providers[provider.name] = provider;
  }

  function list() { return Object.keys(providers); }

  function select(name) {
    if (!providers[name]) throw new Error('unknown provider: ' + name);
    active = providers[name];
    return active;
  }

  function current() { return active; }

  // --- Built-in mock provider ---
  // Always available, issues credits instantly. Used in dev, in CI, and as
  // the simulated "$3 Snap Card" purchase at the kiosk (user decision: v1
  // payment is simulated only).
  var MockProvider = {
    name: 'mock',
    available: function () { return Promise.resolve(true); },
    charge: function (req) {
      return Promise.resolve({
        success: true,
        transactionId: 'mock-' + Date.now(),
        credits: Math.max(1, Math.floor(req && req.credits ? req.credits : 1)),
      });
    },
    refund: function () { return Promise.resolve({ success: true }); },
  };
  register(MockProvider);
  select('mock');

  // --- Stripe Terminal placeholder ---
  // Reports unavailable until a real SDK key + reader are configured via the
  // attendant panel, so the UI falls back to mock.
  register({
    name: 'stripe-terminal',
    available: function () { return Promise.resolve(false); },
    charge: function () { return Promise.resolve({ success: false, error: 'not configured' }); },
  });

  // --- Snap Card facade (what the kiosk screens actually call) ---

  // "It'll cost you a measly three bucks for 16 stickers."
  function buyCard() {
    var att = SnapStore.getAttendant();
    return active.charge({
      amountCents: att.pricePerSheetCents,
      currency: 'usd',
      description: 'Snap Card',
      credits: att.creditsPerCard,
    }).then(function (res) {
      if (res.success) {
        SnapStore.setCredits(SnapStore.getCredits() + (res.credits || att.creditsPerCard));
      }
      return res;
    });
  }

  // Spends one credit for a print. Free-play mode never decrements.
  // Returns { ok, freePlay, credits }.
  function spendCredit() {
    var att = SnapStore.getAttendant();
    if (att.freePlay) return { ok: true, freePlay: true, credits: SnapStore.getCredits() };
    var c = SnapStore.getCredits();
    if (c <= 0) return { ok: false, freePlay: false, credits: 0 };
    SnapStore.setCredits(c - 1);
    return { ok: true, freePlay: false, credits: c - 1 };
  }

  function grantCredits(n) {
    SnapStore.setCredits(SnapStore.getCredits() + Math.max(0, Math.floor(n)));
    return SnapStore.getCredits();
  }

  // --- Fault-safe print accounting (design system v4, real-station model) ---
  // The original kiosk burned the one-shot card at the button press, so a
  // paper jam ate your credit. We reserve on print-start, commit only after a
  // confirmed sheet, and refund the reservation on any printer fault.
  // Reservations are deliberately in-memory: if the kiosk reboots mid-print,
  // nothing was committed and the customer keeps their credit.
  var reserved = 0;

  function availableCredits() { return Math.max(0, SnapStore.getCredits() - reserved); }
  function reservedCredits() { return reserved; }

  function reserve(n) {
    n = Math.max(0, Math.floor(n || 0));
    var att = SnapStore.getAttendant();
    if (att.freePlay) return { ok: true, freePlay: true, reserved: reserved };
    if (availableCredits() < n) return { ok: false, freePlay: false, reserved: reserved };
    reserved += n;
    return { ok: true, freePlay: false, reserved: reserved };
  }
  function commit(n) {
    n = Math.max(0, Math.floor(n || 0));
    var att = SnapStore.getAttendant();
    if (att.freePlay) return { ok: true, freePlay: true, credits: SnapStore.getCredits() };
    var take = Math.min(n, reserved);
    reserved -= take;
    SnapStore.setCredits(Math.max(0, SnapStore.getCredits() - take));
    return { ok: true, freePlay: false, credits: SnapStore.getCredits() };
  }
  function refund(n) {
    n = Math.max(0, Math.floor(n || 0));
    reserved = Math.max(0, reserved - n);
    return { ok: true, reserved: reserved };
  }

  // --- Attendant token codes (cash sold at the counter, one-time use) ---
  // Returns { ok, credits } or { ok: false, reason: 'short'|'used'|'invalid' }.
  function redeemToken(raw) {
    var code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 6) return { ok: false, reason: 'short' };
    var t = SnapStore.getTokens();
    if (t.used.indexOf(code) !== -1) return { ok: false, reason: 'used' };
    var credits = t.codes[code];
    if (!credits) return { ok: false, reason: 'invalid' };
    SnapStore.setTokens({ used: t.used.concat([code]) });
    grantCredits(credits);
    return { ok: true, credits: credits };
  }

  return {
    register: register,
    select: select,
    current: current,
    list: list,
    MockProvider: MockProvider,
    buyCard: buyCard,
    spendCredit: spendCredit,
    grantCredits: grantCredits,
    availableCredits: availableCredits,
    reservedCredits: reservedCredits,
    reserve: reserve,
    commit: commit,
    refund: refund,
    redeemToken: redeemToken,
  };
}));
