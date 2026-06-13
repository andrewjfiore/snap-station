// ======= v5 SHEET — the composer as a special box you arrange =======
// Geometry comes from lib/sticker-constants.js (the shared source of truth):
// cells positioned in mm-percent, kiss-cut overlay from the same numbers the
// cut files use. Stamps: drag (pointer events), wheel = size, dbl-tap = remove.
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var COLORS = ['#ffffff', '#fdf6e3', '#ffe9f0', '#e8f6ff', '#eaffe9', '#fff8d6'];
  var BAG = ['⚡','🔥','💧','🌱','⭐','✨','🌸','🐾','🎮','📸','💫','🌈','🎀','🍄','👻','💥','🫧','🌙','☀️','🦋','🐢','🐱','🧢','🎒','⚔️','🔔','🍎','🎵','💜','🤍'];

  var sheet = null; // { layoutId, paperId, paperColor, kissCut, stamps[], sourceMap{} }

  document.addEventListener('DOMContentLoaded', function () {
    sheet = SnapStore.get('sheet', null) || {
      layoutId: 'quad', paperId: '4x6', paperColor: '#ffffff',
      kissCut: false, copies: 1, stamps: [], sourceMap: {},
    };
    buildSeg(); buildSwatches(); buildBag();
    $('#kiss-toggle').checked = !!sheet.kissCut;
    $('#kiss-toggle').addEventListener('change', function (e) { sheet.kissCut = e.target.checked; save(); paintKiss(); });
    $('#stamp-text-add').addEventListener('click', addText);
    $('#stamp-text').addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') addText(); });
    $('#sheet-print').addEventListener('click', function () { SoundFX.confirm(); V5.go('print'); });
    V5.on('screen', function (s) { if (s.name === 'sheet') render(); });
    V5.on('sheet:deposit', deposit);
    V5.sheetState = function () { sheet.stamps = stamps(); return sheet; };
  });

  function save() { sheet.stamps = stamps(); SnapStore.set('sheet', sheet); V5.emit('sheet:changed'); }

  function layout() {
    return SHEET_LAYOUTS.find(function (l) { return l.id === sheet.layoutId; }) ||
           SHEET_LAYOUTS.find(function (l) { return l.id === 'quad'; });
  }

  // ---------- deposit from BOX ----------
  function deposit(urls) {
    var L = layout();
    var m = {};
    for (var g = 0; g < L.groups; g++) m[g] = urls[g % urls.length];
    sheet.sourceMap = m;
    save();
  }

  // ---------- chrome ----------
  function buildSeg() {
    var seg = $('#layout-seg');
    seg.innerHTML = '';
    SHEET_LAYOUTS.forEach(function (l) {
      var b = document.createElement('button');
      b.className = 'seg-btn' + (l.id === sheet.layoutId ? ' is-on' : '');
      b.setAttribute('role', 'radio');
      b.dataset.layout = l.id;
      b.textContent = l.name.toUpperCase();
      b.addEventListener('click', function () {
        SoundFX.click();
        sheet.layoutId = l.id;
        // prune slots beyond the new group count
        var m = {};
        for (var g = 0; g < l.groups; g++) if (sheet.sourceMap[g]) m[g] = sheet.sourceMap[g];
        sheet.sourceMap = m;
        save(); buildSeg(); render();
      });
      seg.appendChild(b);
    });
  }

  function buildSwatches() {
    var sw = $('#paper-swatches');
    sw.innerHTML = '';
    COLORS.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'swatch' + (c === sheet.paperColor ? ' is-on' : '');
      b.style.background = c;
      b.setAttribute('aria-label', 'Paper ' + c);
      b.addEventListener('click', function () { SoundFX.click(); sheet.paperColor = c; save(); buildSwatches(); paintPaper(); });
      sw.appendChild(b);
    });
  }

  function buildBag() {
    var bag = $('#stamp-bag');
    bag.innerHTML = '';
    BAG.forEach(function (e) {
      var b = document.createElement('button');
      b.textContent = e;
      b.addEventListener('click', function () { addStamp({ kind: 'emoji', content: e }); });
      bag.appendChild(b);
    });
  }

  // ---------- render ----------
  function render() {
    paintPaper();
    paintCells();
    paintKiss();
    paintStamps();
    var p = PAPER_SIZES.find(function (x) { return x.id === sheet.paperId; }) || PAPER_SIZES[0];
    $('#sheet-dims').textContent = p.w + '×' + p.h + 'mm';
  }

  function paintPaper() { $('#paper').style.background = sheet.paperColor; }

  function paintCells() {
    var geo = getSheetGeometry(sheet.paperId, layout().id);
    var p = geo.paper;
    var grid = $('#paper-grid');
    grid.innerHTML = '';
    grid.style.position = 'absolute';
    grid.style.inset = '0';
    grid.style.display = 'block';
    geo.cells.forEach(function (cell) {
      var el = document.createElement('div');
      el.className = 'paper-cell';
      el.style.position = 'absolute';
      el.style.left = (cell.kiss.x / p.w * 100) + '%';
      el.style.top = (cell.kiss.y / p.h * 100) + '%';
      el.style.width = (cell.kiss.w / p.w * 100) + '%';
      el.style.height = (cell.kiss.h / p.h * 100) + '%';
      el.style.borderRadius = (cell.kiss.r / cell.kiss.w * 100) + '% / ' + (cell.kiss.r / cell.kiss.h * 100) + '%';
      var src = sheet.sourceMap[cell.group];
      if (src) {
        var img = document.createElement('img');
        img.src = src; img.alt = ''; img.draggable = false;
        el.appendChild(img);
      } else {
        var ph = document.createElement('span');
        ph.className = 'ph';
        ph.textContent = String(cell.group + 1).padStart(2, '0');
        el.appendChild(ph);
      }
      (function (group) {
        el.addEventListener('click', function () {
          SoundFX.click();
          pickForGroup(group);
        });
      }(cell.group));
      grid.appendChild(el);
    });
  }

  function pickForGroup(group) {
    var all = SnapStore.getGallery().slice().reverse();
    if (!all.length) {
      V5.say('Your BOX is empty. CAPTURE a snap first, or drop an image anywhere!');
      return;
    }
    // cycle: tap a cell to rotate through box snaps for that group
    var cur = sheet.sourceMap[group];
    var idx = all.findIndex(function (s) { return s.dataUrl === cur; });
    sheet.sourceMap[group] = all[(idx + 1) % all.length].dataUrl;
    save(); paintCells();
  }

  function paintKiss() {
    var svg = $('#paper-kiss');
    svg.innerHTML = '';
    if (!sheet.kissCut) return;
    var geo = getSheetGeometry(sheet.paperId, layout().id);
    var p = geo.paper;
    svg.setAttribute('viewBox', '0 0 ' + p.w + ' ' + p.h);
    geo.cells.forEach(function (cell) {
      var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', cell.kiss.x); r.setAttribute('y', cell.kiss.y);
      r.setAttribute('width', cell.kiss.w); r.setAttribute('height', cell.kiss.h);
      r.setAttribute('rx', cell.kiss.r);
      r.setAttribute('fill', 'none'); r.setAttribute('stroke', '#e0408a');
      r.setAttribute('stroke-width', '0.4'); r.setAttribute('stroke-dasharray', '1.2,0.8');
      svg.appendChild(r);
    });
  }

  // ---------- stamps ----------
  function stamps() {
    return V5.$$('#paper-stamps .stamp').map(function (el) {
      return {
        kind: el.dataset.kind, content: el.dataset.content,
        x: parseFloat(el.style.left), y: parseFloat(el.style.top),
        size: parseFloat(el.dataset.size), rot: parseFloat(el.dataset.rot || 0),
      };
    });
  }

  function addStamp(s) {
    SoundFX.sticker();
    mountStamp({
      kind: s.kind, content: s.content,
      x: 30 + Math.random() * 40, y: 30 + Math.random() * 40,
      size: s.kind === 'text' ? 22 : 30,
      rot: (Math.random() - 0.5) * 16,
    });
    save();
  }

  function addText() {
    var t = $('#stamp-text').value.trim();
    if (!t) return;
    addStamp({ kind: 'text', content: t });
    $('#stamp-text').value = '';
  }

  function mountStamp(s) {
    var host = $('#paper-stamps');
    var el = document.createElement('div');
    el.className = 'stamp' + (s.kind === 'text' ? ' is-text' : '');
    el.dataset.kind = s.kind; el.dataset.content = s.content;
    el.dataset.size = s.size; el.dataset.rot = s.rot || 0;
    el.textContent = s.content;
    el.style.left = s.x + '%';
    el.style.top = s.y + '%';
    applyStampStyle(el);

    var drag = null, lastTap = 0;
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var now = Date.now();
      if (now - lastTap < 320) { SoundFX.back(); el.remove(); save(); return; }
      lastTap = now;
      el.setPointerCapture(e.pointerId);
      var r = host.getBoundingClientRect();
      drag = { r: r };
    });
    el.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var x = (e.clientX - drag.r.left) / drag.r.width * 100;
      var y = (e.clientY - drag.r.top) / drag.r.height * 100;
      el.style.left = Math.max(0, Math.min(100, x)) + '%';
      el.style.top = Math.max(0, Math.min(100, y)) + '%';
    });
    el.addEventListener('pointerup', function () { if (drag) { drag = null; save(); } });
    el.addEventListener('pointercancel', function () { drag = null; });
    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      var size = Math.max(10, Math.min(90, parseFloat(el.dataset.size) + (e.deltaY < 0 ? 2 : -2)));
      el.dataset.size = size;
      applyStampStyle(el);
      save();
    }, { passive: false });

    host.appendChild(el);
  }

  function applyStampStyle(el) {
    var size = parseFloat(el.dataset.size);
    var rot = parseFloat(el.dataset.rot || 0);
    el.style.fontSize = size / 30 * 2 + 'rem';
    el.style.transform = 'translate(-50%,-50%) rotate(' + rot + 'deg)';
  }

  function paintStamps() {
    $('#paper-stamps').innerHTML = '';
    (sheet.stamps || []).forEach(mountStamp);
  }
}());
