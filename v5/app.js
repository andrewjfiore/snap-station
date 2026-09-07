// ======= Snap Station v5 — app core =======
// Router + Pokémon dialog system + menu cursor + idle + attendant-lite.
// No framework. No loops while idle. Everything event-driven.
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var V5 = window.V5 = { $: $, $$: $$, screen: 'title', listeners: {} };
  V5.on = function (ev, fn) { (V5.listeners[ev] = V5.listeners[ev] || []).push(fn); };
  V5.emit = function (ev, data) { (V5.listeners[ev] || []).forEach(function (f) { f(data); }); };

  // ---------- boot ----------
  document.addEventListener('DOMContentLoaded', function () {
    SnapStore.migrate();
    SoundFX.setEnabled(SnapStore.getSettings().soundOn !== false);
    refreshMoney();
    wireTitle();
    wireMenu();
    V5.emit('boot');
    // unlock audio on first interaction
    var unlock = function () { SoundFX.setEnabled(SnapStore.getSettings().soundOn !== false); document.removeEventListener('pointerdown', unlock); };
    document.addEventListener('pointerdown', unlock);
  });

  // ---------- router ----------
  var ORDER = ['capture', 'box', 'sheet', 'print'];
  V5.go = function (name) {
    if (V5.screen === name) return;
    var prev = V5.screen;
    V5.screen = name;
    $$('.screen').forEach(function (el) {
      var on = el.dataset.screen === name;
      el.classList.toggle('is-active', on);
      if (on) { el.classList.remove('screen-pop'); void el.offsetWidth; el.classList.add('screen-pop'); }
    });
    $('#btnbar').hidden = (name === 'title');
    if (prev === 'title' && name !== 'title') bumpStat('sessions');
    V5.emit('screen', { name: name, prev: prev });
    idleKick();
  };

  function bumpStat(key) {
    var a = SnapStore.getAttendant();
    var stats = a.stats || {};
    stats[key] = (stats[key] || 0) + 1;
    SnapStore.setAttendant({ stats: stats });
  }
  V5.bumpStat = bumpStat;

  V5.money = function () {
    var a = SnapStore.getAttendant();
    return a.freePlay ? 'FREE PLAY' : (SnapPayment.availableCredits() + ' ©');
  };
  function refreshMoney() {
    var m = V5.money();
    ['#menu-money', '#print-money'].forEach(function (s) { var el = $(s); if (el) el.textContent = m; });
    var t = $('#title-credits'); if (t) t.textContent = m === '0 ©' ? '' : m;
  }
  V5.refreshMoney = refreshMoney;

  // ---------- dialog system (Pokémon text box) ----------
  // V5.dlg({ text, opts:[..]|null, input:bool, danger }) -> Promise<choiceIndex|inputString|null>
  // Tap/A advances; with opts, arrows move the ▶ cursor.
  var dlgState = null;
  V5.dlg = function (cfg) {
    return new Promise(function (resolve) {
      var host = $('#dlg-host'), text = $('#dlg-text'), arrow = $('#dlg-arrow'), optsEl = $('#dlg-opts');
      host.hidden = false;
      optsEl.hidden = true; optsEl.innerHTML = '';
      arrow.hidden = true;
      var old = $('.dlg-input', $('#dlg')); if (old) old.remove();
      text.textContent = '';
      dlgState = { resolve: resolve, cfg: cfg, cursor: 0, done: false };

      // typewriter — fast (12ms/char), skippable, no RAF when finished
      var full = cfg.text, i = 0, timer = setInterval(function () {
        i += 3;
        text.textContent = full.slice(0, i);
        if (i >= full.length) { clearInterval(timer); typed(); }
      }, 12);
      dlgState.skip = function () { clearInterval(timer); text.textContent = full; typed(); };

      function typed() {
        if (dlgState.done) return;
        dlgState.done = true;
        dlgState.skip = null;
        if (cfg.input) {
          var inp = document.createElement('input');
          inp.className = 'dlg-input';
          inp.maxLength = cfg.maxLength || 10;
          inp.placeholder = cfg.placeholder || '';
          inp.autocomplete = 'off'; inp.spellcheck = false;
          $('#dlg').appendChild(inp);
          inp.focus();
          inp.addEventListener('keydown', function (e) {
            e.stopPropagation();
            if (e.key === 'Enter' && inp.value.trim()) close(inp.value.trim().toUpperCase());
            if (e.key === 'Escape') close(null);
          });
          renderOpts(['OK', 'CANCEL'], function (idx) {
            close(idx === 0 ? (inp.value.trim().toUpperCase() || null) : null);
          });
        } else if (cfg.opts) {
          renderOpts(cfg.opts, close);
        } else {
          arrow.hidden = false;
        }
      }

      function renderOpts(labels, pick) {
        optsEl.hidden = false;
        optsEl.innerHTML = '';
        labels.forEach(function (lb, idx) {
          var b = document.createElement('button');
          b.className = 'dlg-opt' + (idx === 0 ? ' is-cursor' : '');
          b.textContent = lb;
          b.addEventListener('click', function (e) { e.stopPropagation(); SoundFX.click(); pick(idx); });
          optsEl.appendChild(b);
        });
        dlgState.pick = pick;
      }

      function close(val) {
        host.hidden = true;
        dlgState = null;
        resolve(val);
      }
      dlgState.close = close;
    });
  };
  V5.say = function (t) { SoundFX.click(); return V5.dlg({ text: t }); };
  V5.confirm = function (t, yes, no) {
    return V5.dlg({ text: t, opts: [yes || 'YES', no || 'NO'] }).then(function (i) { return i === 0; });
  };

  function dlgCursorMove(d) {
    var opts = $$('.dlg-opt');
    if (!opts.length) return;
    var cur = opts.findIndex(function (o) { return o.classList.contains('is-cursor'); });
    var next = Math.max(0, Math.min(opts.length - 1, cur + d));
    opts.forEach(function (o, i) { o.classList.toggle('is-cursor', i === next); });
    if (next !== cur) SoundFX.hover();
  }
  function dlgConfirm() {
    if (!dlgState) return;
    if (dlgState.skip) { dlgState.skip(); return; }
    var opts = $$('.dlg-opt');
    if (opts.length) {
      var cur = opts.findIndex(function (o) { return o.classList.contains('is-cursor'); });
      SoundFX.click();
      if (dlgState.pick) dlgState.pick(Math.max(0, cur));
    } else if (dlgState.done) {
      SoundFX.click();
      dlgState.close(null);
    }
  }
  $('#dlg-host').addEventListener('click', dlgConfirm);

  // ---------- title ----------
  function wireTitle() {
    var start = function () { SoundFX.confirm(); V5.go('menu'); };
    $('#press-start').addEventListener('click', function (e) { e.stopPropagation(); start(); });
    $('#scr-title').addEventListener('click', function (e) {
      if (e.target.closest('.title-attendant')) return;
      start();
    });
    var att = $('#title-attendant');
    var openAtt = function (e) { e.stopPropagation(); attendant(); };
    att.addEventListener('click', openAtt);
    att.addEventListener('keydown', function (e) { if (e.key === 'Enter') openAtt(e); });
  }

  // ---------- menu + cursor ----------
  var cursor = 0;
  function tiles() { return $$('#menu-grid .menu-tile'); }
  function setCursor(i) {
    var ts = tiles();
    cursor = (i + ts.length) % ts.length;
    ts.forEach(function (t, idx) { t.classList.toggle('is-cursor', idx === cursor); });
  }
  function wireMenu() {
    tiles().forEach(function (t, idx) {
      t.addEventListener('click', function () { SoundFX.confirm(); V5.go(t.dataset.go); });
      t.addEventListener('pointerenter', function () { if (idx !== cursor) { setCursor(idx); SoundFX.hover(); } });
    });
    setCursor(0);
  }
  V5.on('screen', function (s) {
    if (s.name === 'menu') {
      refreshMoney();
      var g = SnapStore.getGallery();
      $('#menu-box-count').textContent = g.length ? (g.length + ' snap' + (g.length === 1 ? '' : 's') + ' stored') : 'Your snaps live here';
      var a = SnapStore.getAttendant();
      $('#menu-print-sub').textContent = a.freePlay ? 'FREE PLAY · 16 stickers' : ('$' + (a.pricePerSheetCents / 100) + ' · 16 stickers');
    }
  });

  // ---------- keyboard + gamepad ----------
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    idleKick();
    if (dlgState) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); dlgCursorMove(1); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); dlgCursorMove(-1); }
      else if (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'a') { e.preventDefault(); dlgConfirm(); }
      else if (e.key === 'Escape' || e.key.toLowerCase() === 'b') { e.preventDefault(); if (dlgState.done) dlgState.close(null); }
      return;
    }
    if (V5.screen === 'title') {
      if (e.key === 'Enter' || e.key === ' ') { SoundFX.confirm(); V5.go('menu'); }
      return;
    }
    if (V5.screen === 'menu') {
      if (e.key === 'ArrowRight') { setCursor(cursor + 1); SoundFX.hover(); }
      else if (e.key === 'ArrowLeft') { setCursor(cursor - 1); SoundFX.hover(); }
      else if (e.key === 'ArrowDown') { setCursor(cursor + 2); SoundFX.hover(); }
      else if (e.key === 'ArrowUp') { setCursor(cursor - 2); SoundFX.hover(); }
      else if (e.key === 'Enter' || e.key === ' ') { var t = tiles()[cursor]; if (t) { SoundFX.confirm(); V5.go(t.dataset.go); } }
      else if (e.key === 'Escape') { SoundFX.back(); V5.go('title'); }
      return;
    }
    if (e.key === 'Escape') { SoundFX.back(); V5.go('menu'); return; }
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4) { SoundFX.click(); V5.go(ORDER[n - 1]); }
  });

  // Gamepad: poll ONLY while a pad is connected (event-gated, idle otherwise).
  var padTimer = null, padPrev = {};
  function padPoll() {
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (var p = 0; p < pads.length; p++) {
      var pad = pads[p]; if (!pad) continue;
      var b = function (i) { return pad.buttons[i] && pad.buttons[i].pressed; };
      var fire = function (key, fn) { var was = padPrev[p + ':' + key]; var now = b(key); padPrev[p + ':' + key] = now; if (now && !was) fn(); };
      fire(14, function () { dispatchKey('ArrowLeft'); });
      fire(15, function () { dispatchKey('ArrowRight'); });
      fire(12, function () { dispatchKey('ArrowUp'); });
      fire(13, function () { dispatchKey('ArrowDown'); });
      fire(0, function () { dispatchKey('Enter'); });
      fire(1, function () { dispatchKey('Escape'); });
    }
  }
  function dispatchKey(key) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true }));
  }
  window.addEventListener('gamepadconnected', function () {
    if (!padTimer) padTimer = setInterval(padPoll, 80);
  });
  window.addEventListener('gamepaddisconnected', function () {
    var pads = (navigator.getGamepads ? navigator.getGamepads() : []) || [];
    if (!Array.prototype.some.call(pads, Boolean) && padTimer) { clearInterval(padTimer); padTimer = null; }
  });

  // ---------- idle → title ----------
  var idleTimer = null;
  function idleKick() {
    if (idleTimer) clearTimeout(idleTimer);
    if (V5.screen === 'title') return;
    var ms = (typeof window.__IDLE_MS__ === 'number') ? window.__IDLE_MS__ : 120000;
    idleTimer = setTimeout(function () { V5.emit('idle'); V5.go('title'); }, ms);
  }
  ['pointerdown', 'pointermove', 'wheel'].forEach(function (ev) {
    document.addEventListener(ev, idleKick, { passive: true });
  });

  // ---------- attendant (PIN via dialog, then a dialog menu) ----------
  function attendant() {
    SoundFX.select();
    V5.dlg({ text: 'Attendant check. PIN, please.', input: true, maxLength: 4, placeholder: '0000' })
      .then(function (pin) {
        if (pin == null) return;
        return SnapStore.verifyPin(pin).then(function (ok) {
          if (!ok) { SoundFX.error(); return V5.say("Hmm, that's not it. Ask the owner for the PIN."); }
          return attMenu();
        });
      });
  }
  function attMenu() {
    var a = SnapStore.getAttendant();
    var sup = SnapStore.suppliesSnapshot();
    var lines = 'Welcome back!\nCredits ' + SnapStore.getCredits() +
      ' · Paper ' + sup.paper + '/' + sup.paperMax + ' · Ribbon ' + sup.ribbon + '/' + sup.ribbonMax +
      '\nPrints ' + ((a.stats && a.stats.prints) || 0) + ' · Sessions ' + ((a.stats && a.stats.sessions) || 0);
    return V5.dlg({
      text: lines,
      opts: ['+5 CREDITS', a.freePlay ? 'FREE PLAY: ON' : 'FREE PLAY: OFF', 'RELOAD SUPPLIES', 'SOUND: ' + (SnapStore.getSettings().soundOn !== false ? 'ON' : 'OFF'), 'CLEAR BOX', 'DONE'],
    }).then(function (i) {
      if (i === 0) { SnapPayment.grantCredits(5); SoundFX.coin(); refreshMoney(); return attMenu(); }
      if (i === 1) { SnapStore.setAttendant({ freePlay: !a.freePlay }); refreshMoney(); return attMenu(); }
      if (i === 2) { SnapStore.restockSupplies(); SoundFX.confirm(); return attMenu(); }
      if (i === 3) {
        var on = SnapStore.getSettings().soundOn !== false;
        SnapStore.setSettings({ soundOn: !on }); SoundFX.setEnabled(!on);
        return attMenu();
      }
      if (i === 4) {
        return V5.confirm('Clear every snap in the BOX? They will be gone for good.').then(function (yes) {
          if (yes) { SnapStore.clearGallery(); V5.emit('gallery'); }
          return attMenu();
        });
      }
    });
  }
  V5.attendant = attendant;
}());
