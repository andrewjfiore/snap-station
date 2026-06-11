// ======= Chiptune SFX — kiosk sound kit (UMD port of the playground's sound.jsx) =======
// Procedurally synthesized via Web Audio; no sample files. The classic pages keep
// their own inline SoundFX (richer camera foley); this kit serves the kiosk app.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SoundFX = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ctx = null;
  var enabled = true;

  function init() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});
    return ctx;
  }

  function tone(freq, type, dur, t0, vol) {
    if (!enabled) return;
    var c = init(); if (!c) return;
    t0 = t0 || 0; vol = vol === undefined ? 0.1 : vol;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(g); g.connect(c.destination);
    var now = c.currentTime + t0;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now); osc.stop(now + dur);
  }

  function sweep(f1, f2, type, dur, vol) {
    if (!enabled) return;
    var c = init(); if (!c) return;
    vol = vol === undefined ? 0.1 : vol;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type;
    osc.connect(g); g.connect(c.destination);
    var now = c.currentTime;
    osc.frequency.setValueAtTime(f1, now);
    osc.frequency.exponentialRampToValueAtTime(f2, now + dur);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now); osc.stop(now + dur);
  }

  function noise(dur, vol, filterFreq) {
    if (!enabled) return;
    var c = init(); if (!c) return;
    vol = vol === undefined ? 0.25 : vol;
    var buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    var src = c.createBufferSource();
    src.buffer = buf;
    var filter = c.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = filterFreq || 1500; filter.Q.value = 2;
    var g = c.createGain();
    g.gain.value = vol;
    src.connect(filter); filter.connect(g); g.connect(c.destination);
    src.start();
  }

  return {
    setEnabled: function (v) { enabled = v; if (v) init(); },
    click:   function () { tone(880, 'square', 0.04, 0, 0.06); },
    hover:   function () { tone(1400, 'sine', 0.03, 0, 0.04); },
    back:    function () { tone(440, 'square', 0.08, 0, 0.08); },
    confirm: function () { tone(660, 'square', 0.06); tone(990, 'square', 0.08, 0.06); },
    shutter: function () { noise(0.08, 0.35, 2200); tone(2400, 'sine', 0.02, 0, 0.1); },
    coin:    function () { tone(988, 'square', 0.06); tone(1318, 'square', 0.12, 0.06); },
    printer: function () {
      if (!init()) return;
      noise(1.3, 0.18, 600);
      for (var i = 0; i < 4; i++) {
        (function (n) { setTimeout(function () { tone(200, 'square', 0.05, 0, 0.06); }, n * 280); })(i);
      }
    },
    sticker: function () { sweep(2000, 800, 'triangle', 0.12, 0.1); },
    error:   function () { tone(200, 'square', 0.1); tone(150, 'square', 0.14, 0.1); },
    powerOn: function () { sweep(80, 800, 'sawtooth', 0.2); setTimeout(function () { tone(1760, 'triangle', 0.1); }, 220); },
    select:  function () { tone(1760, 'triangle', 0.05, 0, 0.08); },
  };
}));
