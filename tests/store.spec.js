// Node-side tests for the storage module (localStorage shimmed).
const { test, expect } = require('@playwright/test');

function freshStore() {
  const data = {};
  global.localStorage = {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
  delete require.cache[require.resolve('../js/snap-store.js')];
  return { store: require('../js/snap-store.js'), data };
}

test.describe('SnapStore', () => {
  test('defaults: CRT off, videoRental theme, $3 / 5 credits per card, no free play', () => {
    const { store } = freshStore();
    const s = store.getSettings();
    expect(s.crtIntensity).toBe(0);
    expect(s.scanlines).toBe(false);
    expect(s.theme).toBe('videoRental');
    expect(s.rentalShelves).toBe(true);
    const a = store.getAttendant();
    expect(a.pricePerSheetCents).toBe(300);
    expect(a.creditsPerCard).toBe(5);
    expect(a.freePlay).toBe(false);
    expect(store.getCredits()).toBe(0);
  });

  test('settings patch round-trips and merges with defaults', () => {
    const { store } = freshStore();
    store.setSettings({ theme: 'marioLevel', crtIntensity: 0.5 });
    const s = store.getSettings();
    expect(s.theme).toBe('marioLevel');
    expect(s.crtIntensity).toBe(0.5);
    expect(s.soundOn).toBe(true); // untouched default
  });

  test('credits clamp to non-negative integers', () => {
    const { store } = freshStore();
    store.setCredits(3.9);
    expect(store.getCredits()).toBe(3);
    store.setCredits(-5);
    expect(store.getCredits()).toBe(0);
  });

  test('corrupted JSON falls back to defaults', () => {
    const { store, data } = freshStore();
    data['ss.v1.settings'] = '{not json';
    data['ss.v1.gallery'] = '"not an array"';
    data['ss.v1.credits'] = '"NaN"';
    expect(store.getSettings().theme).toBe('videoRental');
    expect(store.getGallery()).toEqual([]);
    expect(store.getCredits()).toBe(0);
  });

  test('gallery LRU cap evicts oldest', () => {
    const { store } = freshStore();
    for (let i = 0; i < store.GALLERY_CAP + 5; i++) {
      store.addToGallery({ dataUrl: 'data:image/png;base64,' + i });
    }
    const g = store.getGallery();
    expect(g).toHaveLength(store.GALLERY_CAP);
    expect(g[0].dataUrl.endsWith(',5')).toBe(true); // 0..4 evicted
  });

  test('quota-exceeded eviction keeps newest entries', () => {
    const { store } = freshStore();
    let failWrites = false;
    const realSet = global.localStorage.setItem;
    global.localStorage.setItem = (k, v) => {
      if (failWrites && k === 'ss.v1.gallery' && v.length > 80) throw new Error('QuotaExceededError');
      realSet(k, v);
    };
    store.addToGallery({ dataUrl: 'data:1' });
    store.addToGallery({ dataUrl: 'data:2' });
    failWrites = true;
    store.addToGallery({ dataUrl: 'data:3' }); // forces eviction until it fits
    const g = store.getGallery();
    expect(g[g.length - 1].dataUrl).toBe('data:3');
    expect(g.length).toBeLessThan(3);
  });

  test('export payload interop matches the classic snapstation-export contract', () => {
    const { store, data } = freshStore();
    expect(store.readExportPayload()).toBeNull();
    data['snapstation-export'] = JSON.stringify({ timestamp: 123, images: ['data:image/png;base64,x'] });
    const payload = store.readExportPayload();
    expect(payload.images).toHaveLength(1);
    store.clearExportPayload();
    expect(store.readExportPayload()).toBeNull();
    store.writeExportPayload(['a', 'b']);
    expect(JSON.parse(data['snapstation-export']).images).toEqual(['a', 'b']);
  });

  test('migration moves sk_* keys and runs once', () => {
    const { store, data } = freshStore();
    data['sk_tweaks'] = JSON.stringify({ theme: 'cinnabar', crtIntensity: 0.3, rentalShelves: false });
    data['sk_credits'] = '7';
    data['sk_snaps'] = JSON.stringify([{ dataUrl: 'data:image/png;base64,abc', ts: 1 }]);
    data['sk_screen'] = '"editor"';

    expect(store.migrate()).toBe(true);
    expect(store.getSettings().theme).toBe('cinnabar');
    expect(store.getSettings().crtIntensity).toBe(0.3);
    expect(store.getSettings().rentalShelves).toBe(false);
    expect(store.getCredits()).toBe(7);
    expect(store.getGallery()).toHaveLength(1);
    expect(data['sk_tweaks']).toBeUndefined();
    expect(data['sk_screen']).toBeUndefined();
    expect(store.migrate()).toBe(false); // sentinel set
  });
});

test.describe('SnapPayment', () => {
  function freshPayment() {
    const { store, data } = freshStore();
    delete require.cache[require.resolve('../js/payment.js')];
    return { payment: require('../js/payment.js'), store, data };
  }

  test('buyCard grants creditsPerCard via mock provider', async () => {
    const { payment, store } = freshPayment();
    const res = await payment.buyCard();
    expect(res.success).toBe(true);
    expect(store.getCredits()).toBe(5);
  });

  test('spendCredit decrements; refuses at zero', () => {
    const { payment, store } = freshPayment();
    store.setCredits(1);
    expect(payment.spendCredit()).toMatchObject({ ok: true, credits: 0 });
    expect(payment.spendCredit()).toMatchObject({ ok: false, credits: 0 });
  });

  test('free play never decrements', () => {
    const { payment, store } = freshPayment();
    store.setAttendant({ freePlay: true });
    store.setCredits(2);
    expect(payment.spendCredit()).toMatchObject({ ok: true, freePlay: true });
    expect(store.getCredits()).toBe(2);
  });

  test('attendant settings drive price and credits', async () => {
    const { payment, store } = freshPayment();
    store.setAttendant({ creditsPerCard: 8 });
    await payment.buyCard();
    expect(store.getCredits()).toBe(8);
  });

  test('provider registry: unknown select throws, stripe stub unavailable', async () => {
    const { payment } = freshPayment();
    expect(() => payment.select('nope')).toThrow();
    expect(payment.list()).toContain('stripe-terminal');
    payment.select('stripe-terminal');
    const res = await payment.current().charge({});
    expect(res.success).toBe(false);
    payment.select('mock');
  });
});
