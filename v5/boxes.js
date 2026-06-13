// ======= v5 BOX — the gallery as a Pokémon-HOME box =======
// 30 slots per box (6×5), tabs for paging, multi-select, hover preview,
// SEND TO SHEET deposits picks into the composer, RELEASE deletes.
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var PER = 30;
  var page = 0, sel = [];

  document.addEventListener('DOMContentLoaded', function () {
    $('#box-to-sheet').addEventListener('click', toSheet);
    $('#box-release').addEventListener('click', release);
    V5.on('screen', function (s) { if (s.name === 'box') render(); });
    V5.on('gallery', function () { if (V5.screen === 'box') render(); });
  });

  function snaps() { return SnapStore.getGallery().slice().reverse(); } // newest first

  function render() {
    var all = snaps();
    var pages = Math.max(1, Math.ceil(all.length / PER));
    if (page >= pages) page = pages - 1;
    sel = sel.filter(function (id) { return all.some(function (s) { return s.id === id; }); });

    // tabs
    var tabs = $('#box-tabs');
    tabs.innerHTML = '';
    for (var p = 0; p < pages; p++) {
      (function (p) {
        var b = document.createElement('button');
        b.className = 'box-tab' + (p === page ? ' is-on' : '');
        b.textContent = 'BOX ' + (p + 1);
        b.addEventListener('click', function () { SoundFX.click(); page = p; render(); });
        tabs.appendChild(b);
      }(p));
    }

    // grid — always 30 cells, like a real box
    var grid = $('#box-grid');
    grid.innerHTML = '';
    var slice = all.slice(page * PER, page * PER + PER);
    for (var i = 0; i < PER; i++) {
      var cell = document.createElement('div');
      cell.className = 'box-cell';
      var s = slice[i];
      if (s) {
        cell.classList.toggle('is-sel', sel.indexOf(s.id) !== -1);
        var img = document.createElement('img');
        img.src = s.dataUrl; img.alt = ''; img.loading = 'lazy'; img.draggable = false;
        cell.appendChild(img);
        if (s.kind === 'gif') {
          var tag = document.createElement('span');
          tag.className = 'gif-tag'; tag.textContent = 'GIF';
          cell.appendChild(tag);
        }
        (function (s) {
          cell.addEventListener('click', function () { toggle(s.id); });
          cell.addEventListener('pointerenter', function () { preview(s); });
        }(s));
      }
      grid.appendChild(cell);
    }

    syncRail(all);
    if (!all.length) {
      $('#box-preview').innerHTML = '<span class="box-preview__empty">Empty box — go CAPTURE something!</span>';
      $('#box-meta').textContent = '';
    }
  }

  function toggle(id) {
    var i = sel.indexOf(id);
    if (i === -1) { sel.push(id); SoundFX.select(); } else { sel.splice(i, 1); SoundFX.back(); }
    render();
  }

  function preview(s) {
    $('#box-preview').innerHTML = '';
    var img = document.createElement('img');
    img.src = s.dataUrl; img.alt = '';
    $('#box-preview').appendChild(img);
    var d = new Date(s.ts || Date.now());
    $('#box-meta').textContent = (s.kind === 'gif' ? 'GIF · ' : 'SNAP · ') + d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function syncRail(all) {
    var n = sel.length;
    var chip = $('#box-sel-count');
    chip.hidden = n === 0;
    chip.textContent = n + ' picked';
    $('#box-to-sheet').disabled = n === 0;
    $('#box-release').disabled = n === 0;
  }

  function picked() {
    var all = snaps();
    return sel.map(function (id) { return all.find(function (s) { return s.id === id; }); }).filter(Boolean);
  }

  function toSheet() {
    var ps = picked();
    if (!ps.length) return;
    SoundFX.confirm();
    V5.emit('sheet:deposit', ps.map(function (s) { return s.dataUrl; }));
    sel = [];
    V5.go('sheet');
  }

  function release() {
    var n = sel.length;
    V5.confirm('Release ' + n + ' snap' + (n === 1 ? '' : 's') + '? Bye-bye!').then(function (yes) {
      if (!yes) return;
      sel.forEach(function (id) { SnapStore.removeFromGallery(id); });
      sel = [];
      SoundFX.back();
      render();
      V5.emit('gallery');
    });
  }
}());
