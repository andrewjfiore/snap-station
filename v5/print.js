// ======= v5 PRINT — Poké Mart counter on the fault-safe ledger =======
// Credits reserve at pay, commit on a finished sheet, refund on a jam
// (window.__SIMULATE_JAM__ test hook honored). Supplies gate + consume.
// Exports: PNG, browser print, Cricut print-then-cut SVG, cut-only SVG.
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var copies = 1, renderedCanvas = null;

  document.addEventListener('DOMContentLoaded', function () {
    $('#copies-up').addEventListener('click', function () { SoundFX.click(); copies = Math.min(5, copies + 1); paintMart(); });
    $('#copies-dn').addEventListener('click', function () { SoundFX.click(); copies = Math.max(1, copies - 1); paintMart(); });
    $('#pay-credit').addEventListener('click', payCredit);
    $('#pay-token').addEventListener('click', enterCode);
    $('#done-home').addEventListener('click', function () { SoundFX.back(); V5.go('menu'); });
    $('#done-again-btn').addEventListener('click', function () { SoundFX.confirm(); pane('mart'); paintMart(); });
    $('#dl-png').addEventListener('click', dlPng);
    $('#dl-print').addEventListener('click', dlPrint);
    $('#dl-cricut').addEventListener('click', dlCricut);
    $('#dl-cut').addEventListener('click', dlCut);
    V5.on('screen', function (s) { if (s.name === 'print') { pane('mart'); paintMart(); } });
  });

  function pane(which) {
    $('#mart-pane').hidden = which !== 'mart';
    $('#lab-pane').hidden = which !== 'lab';
    $('#done-pane').hidden = which !== 'done';
  }

  function sheetState() { return V5.sheetState(); }
  function layoutOf(st) {
    return SHEET_LAYOUTS.find(function (l) { return l.id === st.layoutId; }) ||
           SHEET_LAYOUTS.find(function (l) { return l.id === 'quad'; });
  }

  function paintMart() {
    V5.refreshMoney();
    var st = sheetState();
    var L = layoutOf(st);
    var a = SnapStore.getAttendant();
    $('#mart-layout').textContent = L.name;
    $('#mart-copies').textContent = copies;
    $('#mart-total').textContent = a.freePlay ? 'FREE' : (copies + ' credit' + (copies === 1 ? '' : 's') + ' ($' + (a.pricePerSheetCents * copies / 100) + ')');
    $('#pay-credit').textContent = a.freePlay ? "LET'S PRINT" : 'USE ' + copies + ' CREDIT' + (copies === 1 ? '' : 'S');
    var sup = SnapStore.suppliesSnapshot();
    $('#mart-note').textContent = sup.low ? ('Supplies low — ' + sup.remaining + ' sheets left in the machine.') : 'A jam never charges you. Promise.';
    // live preview
    var pv = $('#mart-preview');
    pv.innerHTML = '<span style="font-family:Silkscreen;font-size:.6rem;color:var(--ink-soft)">RENDERING…</span>';
    renderSheetToCanvas(st, SnapStore.getGallery()).then(function (canvas) {
      renderedCanvas = canvas;
      pv.innerHTML = '';
      var img = document.createElement('img');
      img.src = canvas.toDataURL('image/jpeg', 0.85);
      img.alt = 'Sheet preview';
      pv.appendChild(img);
    }).catch(function () {
      pv.innerHTML = '<span style="font-size:.85rem;color:var(--ink-soft)">Add a snap to the SHEET first!</span>';
      renderedCanvas = null;
    });
  }

  // ---------- pay ----------
  function payCredit() {
    var a = SnapStore.getAttendant();
    if (!renderedCanvas) { SoundFX.error(); V5.say('The sheet is empty! Pop over to SHEET and add a snap or two.'); return; }
    if (!SnapStore.canPrint(copies)) {
      SoundFX.error();
      V5.say("The machine is out of paper or ribbon. An attendant's been pinged — check back soon!");
      return;
    }
    if (a.freePlay) { lab(false); return; }
    var res = SnapPayment.reserve(copies);
    if (!res.ok) {
      SoundFX.error();
      V5.dlg({
        text: 'You need ' + copies + ' credit' + (copies === 1 ? '' : 's') + ' but have ' + SnapPayment.availableCredits() + '.\nGot a Snap Pass code from the counter?',
        opts: ['ENTER CODE', 'NEVER MIND'],
      }).then(function (i) { if (i === 0) enterCode(); });
      return;
    }
    SoundFX.coin();
    lab(true);
  }

  function enterCode() {
    V5.dlg({ text: 'Type the code from your slip.\n(Demo: SNAP05)', input: true, maxLength: 10, placeholder: 'SNAP05' })
      .then(function (code) {
        if (!code) return;
        var r = SnapPayment.redeemToken(code);
        if (r.ok) {
          SoundFX.coin();
          V5.refreshMoney();
          V5.say('+' + r.credits + ' credit' + (r.credits === 1 ? '' : 's') + '! Cha-ching.');
        } else {
          SoundFX.error();
          V5.say(r.reason === 'used' ? 'That code was already used. Ask the attendant for a fresh one.'
               : r.reason === 'short' ? 'Codes are 6 to 8 letters and numbers.'
               : "Hmm, that code didn't match. Double-check the letters?");
        }
      });
  }

  // ---------- the lab (dye-sub passes) ----------
  var PASSES = [['yellow', '#ffcb05'], ['magenta', '#e0408a'], ['cyan', '#28b7e0'], ['finish', '#ffffff']];
  function lab(reserved) {
    pane('lab');
    SoundFX.printer();
    var passesEl = $('#lab-passes');
    passesEl.innerHTML = '';
    PASSES.forEach(function (p) {
      var d = document.createElement('span');
      d.className = 'lab-pass'; d.dataset.p = p[0];
      d.innerHTML = '<i></i>' + p[0].toUpperCase();
      passesEl.appendChild(d);
    });
    var ms = (typeof window.__DYESUB_PASS_MS__ === 'number') ? window.__DYESUB_PASS_MS__ : 1000;
    var i = 0;
    var stepEls = V5.$$('#lab-passes .lab-pass');
    (function step() {
      if (V5.screen !== 'print') { if (reserved) SnapPayment.refund(copies); return; } // walked away → refund
      stepEls.forEach(function (el, idx) {
        el.classList.toggle('is-done', idx < i);
        el.classList.toggle('is-active', idx === i);
      });
      if (i < PASSES.length) {
        $('#lab-status').textContent = i === 0 ? 'Warming the print head…' : 'Laying down ' + PASSES[Math.min(i, 3)][0] + '…';
        document.getElementById('lab-paper').style.setProperty('--lab-wash',
          'linear-gradient(180deg, transparent, ' + PASSES[Math.min(i, 3)][1] + '44)');
        SoundFX.click();
        i++;
        setTimeout(step, ms);
        return;
      }
      // terminal: jam hook or success
      if (window.__SIMULATE_JAM__) {
        if (reserved) SnapPayment.refund(copies);
        SoundFX.error();
        V5.dlg({
          text: 'Oh no — the sheet jammed before it finished!\nYour credit was NOT spent. Try again?',
          opts: ['TRY AGAIN', 'CANCEL'],
        }).then(function (c) {
          if (c === 0) {
            var ok = SnapStore.getAttendant().freePlay || SnapPayment.reserve(copies).ok;
            if (ok) lab(!SnapStore.getAttendant().freePlay); else { V5.say('Not enough credits for the retry.'); pane('mart'); paintMart(); }
          } else { pane('mart'); paintMart(); }
        });
        return;
      }
      if (reserved) SnapPayment.commit(copies);
      SnapStore.consumeSupplies(copies);
      var a = SnapStore.getAttendant();
      var stats = a.stats || {};
      stats.prints = (stats.prints || 0) + copies;
      SnapStore.setAttendant({ stats: stats });
      V5.refreshMoney();
      SoundFX.confirm();
      done();
    }());
  }

  function done() {
    pane('done');
    var sup = SnapStore.suppliesSnapshot();
    var a = SnapStore.getAttendant();
    var row = $('#results-row');
    if (row) {
      row.innerHTML = '';
      [[copies * 16, 'stickers'], [a.freePlay ? '∞' : SnapPayment.availableCredits(), 'credits left'], [sup.remaining, 'sheets in machine']]
        .forEach(function (st) {
          var d = document.createElement('div');
          d.className = 'results-stat';
          d.innerHTML = '<b>' + st[0] + '</b><span>' + st[1] + '</span>';
          row.appendChild(d);
        });
    }
    var host = $('#done-sheet');
    host.innerHTML = '';
    if (renderedCanvas) {
      var img = document.createElement('img');
      img.src = renderedCanvas.toDataURL('image/jpeg', 0.85);
      img.alt = 'Your printed sheet';
      host.appendChild(img);
    }
  }

  // ---------- exports ----------
  function paper() {
    var st = sheetState();
    return PAPER_SIZES.find(function (p) { return p.id === st.paperId; }) || PAPER_SIZES[0];
  }
  function fresh() {
    return renderedCanvas ? Promise.resolve(renderedCanvas)
      : renderSheetToCanvas(sheetState(), SnapStore.getGallery());
  }
  function dlPng() {
    SoundFX.click();
    fresh().then(function (c) {
      c.toBlob(function (b) { if (b) StickerExport.triggerDownload(b, 'snap-station-sheet.png'); }, 'image/png');
    }).catch(expFail);
  }
  function dlPrint() {
    SoundFX.click();
    var p = paper();
    fresh().then(function (c) {
      return StickerExport.printSheetImage(c.toDataURL('image/png'), p.w, p.h);
    }).then(function () { SoundFX.confirm(); }).catch(expFail);
  }
  function dlCricut() {
    SoundFX.click();
    var st = sheetState();
    fresh().then(function (c) {
      var svg = StickerExport.buildCutSvg({ paperId: st.paperId, layoutId: st.layoutId, imageDataUrl: c.toDataURL('image/png') });
      StickerExport.triggerDownload(new Blob([svg], { type: 'image/svg+xml' }), 'snap-station-print-then-cut.svg');
    }).catch(expFail);
  }
  function dlCut() {
    SoundFX.click();
    var st = sheetState();
    try {
      var svg = StickerExport.buildCutSvg({ paperId: st.paperId, layoutId: st.layoutId, registrationMarks: true });
      StickerExport.triggerDownload(new Blob([svg], { type: 'image/svg+xml' }), 'snap-station-cut-only.svg');
    } catch (e) { expFail(e); }
  }
  function expFail() {
    SoundFX.error();
    V5.say("That export slipped — make sure the sheet has at least one snap, then try again.");
  }
}());
