// ======= Snap Station storage — namespaced, versioned localStorage schema =======
// Keys:
//   ss.v1.schema     migration sentinel (integer)
//   ss.v1.settings   { theme, soundOn, crtIntensity, scanlines, bezelRadius,
//                      rentalShelves, cabinetVisible, chromeStyle, printServerUrl }
//   ss.v1.gallery    [{ id, dataUrl, kind: 'photo'|'gif', ts }]  (LRU-capped)
//   ss.v1.credits    integer Snap Card credits
//   ss.v1.sheet      sticker sheet state (layoutId, paperId, paperColor, wallpaper,
//                    kissCut, stamps[], sourceMap)
//   ss.v1.attendant  { pinHash, freePlay, pricePerSheetCents, creditsPerCard, stats }
//   snapstation-export   LEGACY interop: classic capture page → composer payloads
//                        ({ timestamp, images: [dataUrl] }). Left untouched.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SnapStore = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PREFIX = 'ss.v1.';
  var GALLERY_CAP = 40;
  var EXPORT_KEY = 'snapstation-export';

  var memoryFallback = {}; // used when localStorage is unavailable (private mode etc.)

  function rawGet(key) {
    // Memory fallback wins: it is only populated when a persist failed, so it
    // always holds newer state than whatever localStorage last accepted.
    if (Object.prototype.hasOwnProperty.call(memoryFallback, key)) return memoryFallback[key];
    try { return localStorage.getItem(key); }
    catch (e) { return null; }
  }
  function rawSet(key, value) {
    try { localStorage.setItem(key, value); return true; }
    catch (e) { memoryFallback[key] = value; return false; }
  }
  function rawRemove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
    delete memoryFallback[key];
  }

  function get(name, fallback) {
    var raw = rawGet(PREFIX + name);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  // Returns true when persisted, false when it only lives in memory (quota/private mode).
  function set(name, value) {
    return rawSet(PREFIX + name, JSON.stringify(value));
  }

  function remove(name) { rawRemove(PREFIX + name); }

  var DEFAULT_SETTINGS = {
    theme: 'videoRental',
    soundOn: true,
    crtIntensity: 0,        // CRT off by default — closeout requirement
    scanlines: false,
    bezelRadius: 15,
    rentalShelves: true,
    decorStyle: 'shelves',   // 'shelves' (forced-perspective) | 'lobby' (flat wallpaper)
    cabinetVisible: 'auto',
    chromeStyle: 'brushed',
    printServerUrl: '',
  };

  var DEFAULT_ATTENDANT = {
    pinHash: null,           // null → PIN "0000" accepted, attendant UI shows "change me"
    freePlay: false,
    pricePerSheetCents: 300, // a measly three bucks for 16 stickers
    creditsPerCard: 5,
    stats: { prints: 0, sessions: 0 },
  };

  function getSettings() {
    var s = get('settings', {});
    var out = {};
    for (var k in DEFAULT_SETTINGS) out[k] = (k in s) ? s[k] : DEFAULT_SETTINGS[k];
    return out;
  }
  function setSettings(patch) {
    var s = getSettings();
    for (var k in patch) s[k] = patch[k];
    set('settings', s);
    return s;
  }

  function getAttendant() {
    var a = get('attendant', {});
    var out = {};
    for (var k in DEFAULT_ATTENDANT) out[k] = (k in a) ? a[k] : DEFAULT_ATTENDANT[k];
    return out;
  }
  function setAttendant(patch) {
    var a = getAttendant();
    for (var k in patch) a[k] = patch[k];
    set('attendant', a);
    return a;
  }

  function getCredits() { var c = get('credits', 0); return typeof c === 'number' && isFinite(c) ? Math.max(0, Math.floor(c)) : 0; }
  function setCredits(n) { set('credits', Math.max(0, Math.floor(n))); }

  // --- Gallery with LRU cap + quota-exceeded eviction ---
  function getGallery() { var g = get('gallery', []); return Array.isArray(g) ? g : []; }

  function addToGallery(entry) {
    var g = getGallery();
    g.push({
      id: entry.id || ('snap-' + Date.now() + '-' + Math.floor(Math.random() * 1e6)),
      dataUrl: entry.dataUrl,
      kind: entry.kind || 'photo',
      ts: entry.ts || Date.now(),
    });
    while (g.length > GALLERY_CAP) g.shift();
    // On quota failure, evict oldest entries until the write fits (or give up).
    while (!set('gallery', g) && g.length > 1) g.shift();
    return g;
  }

  function removeFromGallery(id) {
    var g = getGallery().filter(function (e) { return e.id !== id; });
    set('gallery', g);
    return g;
  }

  function clearGallery() { set('gallery', []); }

  // --- Classic-page interop ---
  function readExportPayload() {
    var raw = rawGet(EXPORT_KEY);
    if (!raw) return null;
    try {
      var data = JSON.parse(raw);
      if (data && Array.isArray(data.images) && data.images.length) return data;
    } catch (e) {}
    return null;
  }
  function clearExportPayload() { rawRemove(EXPORT_KEY); }
  function writeExportPayload(images) {
    rawSet(EXPORT_KEY, JSON.stringify({ timestamp: Date.now(), images: images }));
  }

  // --- Migration from the prototype's sk_* keys ---
  function migrate() {
    if (get('schema', 0) >= 1) return false;
    try {
      var tweaks = rawGet('sk_tweaks');
      if (tweaks) {
        try {
          var t = JSON.parse(tweaks);
          setSettings({
            theme: t.theme === 'cinnabar' || t.theme ? t.theme : DEFAULT_SETTINGS.theme,
            soundOn: t.soundOn !== false,
            crtIntensity: typeof t.crtIntensity === 'number' ? t.crtIntensity : 0,
            scanlines: !!t.scanlines,
            bezelRadius: typeof t.bezelRadius === 'number' ? t.bezelRadius : 15,
            rentalShelves: t.rentalShelves !== false,
            cabinetVisible: t.cabinetVisible || 'auto',
            chromeStyle: t.chromeStyle || 'brushed',
          });
        } catch (e) {}
      }
      var credits = rawGet('sk_credits');
      if (credits !== null) { var n = parseInt(credits, 10); if (isFinite(n)) setCredits(n); }
      var snaps = rawGet('sk_snaps');
      if (snaps) {
        try {
          var arr = JSON.parse(snaps);
          if (Array.isArray(arr)) {
            arr.forEach(function (s) {
              if (s && typeof s.dataUrl === 'string') addToGallery({ dataUrl: s.dataUrl, kind: 'photo', ts: s.ts });
            });
          }
        } catch (e) {}
      }
      ['sk_tweaks', 'sk_screen', 'sk_snaps', 'sk_sel', 'sk_credits', 'sk_sheet'].forEach(rawRemove);
    } finally {
      set('schema', 1);
    }
    return true;
  }

  // --- Attendant PIN (SHA-256 via WebCrypto; sync fallback comparison for "0000") ---
  function hashPin(pin) {
    var data = new TextEncoder().encode('snap-station:' + pin);
    return crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
    });
  }

  function verifyPin(pin) {
    var a = getAttendant();
    if (!a.pinHash) return Promise.resolve(pin === '0000');
    return hashPin(pin).then(function (h) { return h === a.pinHash; });
  }

  function setPin(pin) {
    return hashPin(pin).then(function (h) { setAttendant({ pinHash: h }); });
  }

  return {
    GALLERY_CAP: GALLERY_CAP,
    get: get, set: set, remove: remove,
    getSettings: getSettings, setSettings: setSettings,
    getAttendant: getAttendant, setAttendant: setAttendant,
    getCredits: getCredits, setCredits: setCredits,
    getGallery: getGallery, addToGallery: addToGallery,
    removeFromGallery: removeFromGallery, clearGallery: clearGallery,
    readExportPayload: readExportPayload, clearExportPayload: clearExportPayload,
    writeExportPayload: writeExportPayload,
    migrate: migrate,
    verifyPin: verifyPin, setPin: setPin, hashPin: hashPin,
  };
}));
