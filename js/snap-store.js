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
    theme: 'snap',          // SnapTheme dot themes: snap/ocean/grape/mint/sunset/berry
    soundOn: true,
    crtIntensity: 0,        // CRT off by default — closeout requirement
    scanlines: false,
    bezelRadius: 15,
    rentalShelves: true,
    decorStyle: 'shelves',   // 'shelves' (forced-perspective) | 'lobby' (flat wallpaper)
    cabinetVisible: 'auto',
    chromeStyle: 'brushed',
    printServerUrl: '',
    shareUrl: '',                // post-print QR target; empty → the live station site
  };

  var DEFAULT_ATTENDANT = {
    pinHash: null,           // null → PIN "0000" accepted, attendant UI shows "change me"
    freePlay: false,
    pricePerSheetCents: 400, // design system v4: 1 credit = 1 sheet = $4
    creditsPerCard: 5,
    productionLock: false,   // suppresses demo hints (PIN hint, token code hints)
    stats: { prints: 0, sessions: 0 },
  };

  // Consumables model from the design system: a real unit runs out of sticker
  // paper and dye-sub ribbon; printing is blocked when either is empty.
  // Costs are owner economics, editable in the attendant panel.
  var DEFAULT_SUPPLIES = {
    paper: 50, ribbon: 50,
    paperMax: 50, ribbonMax: 50,
    paperPackCostCents: 1800, ribbonPackCostCents: 2200,
    soldToday: 0,
  };

  // Attendant-issued one-time top-up codes (6–8 alphanumeric chars exchanged
  // for cash at the counter). The demo set ships enabled until production lock.
  var DEFAULT_TOKENS = {
    codes: {
      SNAP01: 1, SNAP03: 3, SNAP05: 5, SNAP10: 10,
      PIKA42: 4, EEVEE2: 2, MEWTWO: 3, CELADON: 5,
    },
    used: [],
  };

  var VALID_THEMES = ['snap', 'ocean', 'grape', 'mint', 'sunset', 'berry'];

  function getSettings() {
    var s = get('settings', {});
    var out = {};
    for (var k in DEFAULT_SETTINGS) out[k] = (k in s) ? s[k] : DEFAULT_SETTINGS[k];
    // Pre-v4 theme names (videoRental, marioLevel, …) map to the default dot theme.
    if (VALID_THEMES.indexOf(out.theme) === -1) out.theme = DEFAULT_SETTINGS.theme;
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

  // --- Supplies (paper + dye-sub ribbon) ---
  function getSupplies() {
    var s = get('supplies', {});
    var out = {};
    for (var k in DEFAULT_SUPPLIES) out[k] = (k in s) ? s[k] : DEFAULT_SUPPLIES[k];
    return out;
  }
  function setSupplies(patch) {
    var s = getSupplies();
    for (var k in patch) s[k] = patch[k];
    set('supplies', s);
    return s;
  }
  function suppliesLevel(s, which) {
    var max = s[which + 'Max'] || 1;
    var pct = Math.max(0, Math.min(100, Math.round(s[which] / max * 100)));
    return pct <= 0 ? 'empty' : pct <= 10 ? 'critical' : pct <= 25 ? 'low' : 'good';
  }
  function suppliesSnapshot() {
    var s = getSupplies();
    var paperLevel = suppliesLevel(s, 'paper');
    var ribbonLevel = suppliesLevel(s, 'ribbon');
    var unitCostCents = s.paperPackCostCents / (s.paperMax || 1) + s.ribbonPackCostCents / (s.ribbonMax || 1);
    return {
      paper: s.paper, ribbon: s.ribbon,
      paperMax: s.paperMax, ribbonMax: s.ribbonMax,
      paperLevel: paperLevel, ribbonLevel: ribbonLevel,
      remaining: Math.min(s.paper, s.ribbon),
      out: s.paper <= 0 || s.ribbon <= 0,
      low: paperLevel !== 'good' || ribbonLevel !== 'good',
      soldToday: s.soldToday,
      unitCostCents: unitCostCents,
      paperPackCostCents: s.paperPackCostCents,
      ribbonPackCostCents: s.ribbonPackCostCents,
    };
  }
  function canPrint(n) {
    n = Math.max(1, Math.floor(n || 1));
    var s = getSupplies();
    return s.paper >= n && s.ribbon >= n;
  }
  function consumeSupplies(n) {
    n = Math.max(0, Math.floor(n || 0));
    var s = getSupplies();
    return setSupplies({
      paper: Math.max(0, s.paper - n),
      ribbon: Math.max(0, s.ribbon - n),
      soldToday: s.soldToday + n,
    });
  }
  function restockSupplies(which) {
    var s = getSupplies();
    var patch = {};
    if (!which || which === 'paper') patch.paper = s.paperMax;
    if (!which || which === 'ribbon') patch.ribbon = s.ribbonMax;
    return setSupplies(patch);
  }

  // --- Top-up token codes ---
  function getTokens() {
    var t = get('tokens', {});
    return {
      codes: (t.codes && typeof t.codes === 'object') ? t.codes : DEFAULT_TOKENS.codes,
      used: Array.isArray(t.used) ? t.used : [],
    };
  }
  function setTokens(patch) {
    var t = getTokens();
    for (var k in patch) t[k] = patch[k];
    set('tokens', t);
    return t;
  }

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
    getSupplies: getSupplies, setSupplies: setSupplies, suppliesSnapshot: suppliesSnapshot,
    canPrint: canPrint, consumeSupplies: consumeSupplies, restockSupplies: restockSupplies,
    getTokens: getTokens, setTokens: setTokens,
    getGallery: getGallery, addToGallery: addToGallery,
    removeFromGallery: removeFromGallery, clearGallery: clearGallery,
    readExportPayload: readExportPayload, clearExportPayload: clearExportPayload,
    writeExportPayload: writeExportPayload,
    migrate: migrate,
    verifyPin: verifyPin, setPin: setPin, hashPin: hashPin,
  };
}));
