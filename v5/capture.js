// ======= v5 capture — every input we can reach from a static page =======
// Enumerated video devices (webcams AND USB capture cards — a UVC HDMI
// dongle is just a camera with a weird name), screen/window share,
// clipboard paste, drag-drop, file upload, and an offline demo feed.
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };

  var stream = null, activeId = 'demo', mirror = true, crt = false;
  var video, fallback, msg;
  var demoTimer = null, demoIdx = 0;

  var DEMO_SCENES = [
    ['#5aa9e6', '#2a75bb', 'BEACH'], ['#ffcb05', '#ee1515', 'VOLCANO'],
    ['#6b7280', '#3b4252', 'CAVE'], ['#1d5a94', '#23272f', 'TUNNEL'],
    ['#ffd84d', '#d8a400', 'VALLEY'], ['#143e66', '#2a75bb', 'RIVER'],
  ];
  window.DEMO_SNAPS = []; // sheet renderer fallback pool (filled from real gallery instead)

  document.addEventListener('DOMContentLoaded', function () {
    video = $('#cap-video'); fallback = $('#cap-fallback'); msg = $('#cap-msg');
    wire();
    V5.on('screen', function (s) {
      if (s.name === 'capture') { buildInputs(); use(activeId); }
      else stop();
    });
  });

  // ---------- input list ----------
  function inputDefs(devs) {
    var list = [
      { id: 'demo', ic: '✨', label: 'Demo feed' },
      { id: 'screen', ic: '🖥️', label: 'Window / Screen' },
      { id: 'upload', ic: '📁', label: 'Upload files…' },
      { id: 'paste', ic: '📋', label: 'Paste (Ctrl+V)' },
    ];
    devs.forEach(function (d, i) {
      var label = d.label || ('Camera ' + (i + 1));
      var lower = label.toLowerCase();
      var ic = /capture|hdmi|cam ?link|usb3|grabber|avermedia|elgato|magewell|ezcap/.test(lower) ? '🎮' : '📷';
      list.splice(1 + i, 0, { id: 'dev:' + d.deviceId, ic: ic, label: label });
    });
    return list;
  }

  function buildInputs() {
    var listEl = $('#input-list');
    var render = function (devs) {
      listEl.innerHTML = '';
      inputDefs(devs).forEach(function (def) {
        var b = document.createElement('button');
        b.className = 'input-item' + (def.id === activeId ? ' is-on' : '');
        b.setAttribute('role', 'option');
        b.dataset.input = def.id;
        b.innerHTML = '<span class="ic">' + def.ic + '</span><span>' + def.label.replace(/</g, '&lt;') + '</span>';
        b.addEventListener('click', function () { SoundFX.click(); use(def.id); });
        listEl.appendChild(b);
      });
    };
    render([]);
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then(function (all) {
      render(all.filter(function (d) { return d.kind === 'videoinput'; }));
    }).catch(function () {});
  }

  function markActive() {
    V5.$$('#input-list .input-item').forEach(function (el) {
      el.classList.toggle('is-on', el.dataset.input === activeId);
    });
  }

  // ---------- source control ----------
  function stop() {
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    if (demoTimer) { clearInterval(demoTimer); demoTimer = null; }
  }

  function use(id) {
    if (id === 'upload') { $('#file-in').dataset.dest = 'box'; $('#file-in').click(); return; }
    if (id === 'paste') { setMsg('Copy any image, then press Ctrl+V (⌘V) right here.'); return; }
    stop();
    activeId = id;
    markActive();
    fallback.hidden = true; video.hidden = false;
    var name = $('#cap-source-name');

    if (id === 'demo') {
      video.hidden = true; fallback.hidden = false;
      name.textContent = 'Demo feed';
      mirror = false; syncFx();
      drawDemo();
      demoTimer = setInterval(function () { demoIdx = (demoIdx + 1) % DEMO_SCENES.length; drawDemo(); }, 2600);
      setMsg('No camera needed — synthetic scenes. Snap away!');
      return;
    }
    var get;
    if (id === 'screen') {
      name.textContent = 'Window / Screen';
      mirror = false; syncFx();
      get = navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      setMsg('Pick the game window in the browser prompt.');
    } else {
      var devId = id.slice(4);
      name.textContent = 'Camera';
      mirror = true; syncFx();
      get = navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: devId }, width: { ideal: 1280 }, height: { ideal: 720 } } });
      setMsg('Say cheese!');
    }
    get.then(function (s) {
      stream = s;
      video.srcObject = s;
      var track = s.getVideoTracks()[0];
      if (track && track.label) name.textContent = track.label;
      if (track) track.addEventListener('ended', function () { use('demo'); });
      // labels need permission once — rebuild so capture cards show names
      buildInputs();
    }).catch(function () {
      SoundFX.error();
      setMsg("Couldn't open that input. Permission denied?");
      use('demo');
    });
  }

  function drawDemo() {
    var sc = DEMO_SCENES[demoIdx];
    fallback.width = 800; fallback.height = 600;
    var x = fallback.getContext('2d');
    var g = x.createLinearGradient(0, 0, 800, 600);
    g.addColorStop(0, sc[0]); g.addColorStop(1, sc[1]);
    x.fillStyle = g; x.fillRect(0, 0, 800, 600);
    x.fillStyle = 'rgba(255,255,255,.9)';
    x.font = "700 64px Fredoka, sans-serif";
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(sc[2], 400, 300);
  }

  function setMsg(t) { msg.textContent = t; msg.hidden = false; }

  // ---------- fx ----------
  function syncFx() {
    video.style.transform = mirror ? 'scaleX(-1)' : 'none';
    $('#fx-mirror').setAttribute('aria-pressed', String(mirror));
    $('#fx-crt').setAttribute('aria-pressed', String(crt));
    $('#cap-viewport').classList.toggle('crt-on', crt);
  }

  // ---------- frame grab (WYSIWYG: mirror + CRT baked) ----------
  function grabSource() {
    var src = (activeId === 'demo') ? fallback : video;
    var w = src.videoWidth || src.width || 800, h = src.videoHeight || src.height || 600;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    if (crt) x.filter = 'contrast(1.15) saturate(1.2)';
    if (mirror) { x.translate(w, 0); x.scale(-1, 1); }
    x.drawImage(src, 0, 0, w, h);
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.filter = 'none';
    if (crt) {
      x.fillStyle = 'rgba(0,0,0,.1)';
      for (var y = 0; y < h; y += 4) x.fillRect(0, y, w, 1);
    }
    return c;
  }

  function saveSnap(dataUrl, kind) {
    SnapStore.addToGallery({ dataUrl: dataUrl, kind: kind || 'photo' });
    V5.emit('gallery');
  }

  // ---------- shutter + countdown ----------
  var counting = false;
  function snap() {
    if (counting) return;
    counting = true;
    SoundFX.shutter();
    var n = 3, cEl = $('#cap-count');
    cEl.hidden = false; cEl.textContent = n;
    var t = setInterval(function () {
      n--;
      if (n > 0) { cEl.textContent = n; SoundFX.click(); return; }
      clearInterval(t);
      cEl.hidden = true;
      counting = false;
      SoundFX.shutter();
      var f = $('#cap-flash'); f.hidden = false;
      setTimeout(function () { f.hidden = true; }, 380);
      try {
        saveSnap(grabSource().toDataURL('image/jpeg', 0.82));
        setMsg('Nice framing! Saved to your BOX.');
      } catch (e) {
        SoundFX.error();
        setMsg('That frame slipped away — try again.');
      }
    }, 650);
  }

  // ---------- GIF record ----------
  var recording = false;
  function recordGif() {
    if (recording || counting) return;
    recording = true;
    SoundFX.click();
    var rec = $('#cap-rec'); rec.hidden = false;
    var btn = $('#rec-gif'); btn.disabled = true;
    var FRAMES = 14, DELAY = 150, n = 0;
    var gif = new GIF({ workers: 2, quality: 12, workerScript: 'vendor/gif.worker.js' });
    (function step() {
      var src = grabSource();
      var small = document.createElement('canvas');
      var k = 480 / src.width;
      small.width = 480; small.height = Math.round(src.height * k);
      small.getContext('2d').drawImage(src, 0, 0, small.width, small.height);
      gif.addFrame(small, { delay: DELAY, copy: true });
      if (++n < FRAMES) { setTimeout(step, DELAY); return; }
      gif.on('finished', function (blob) {
        var r = new FileReader();
        r.onload = function () {
          saveSnap(r.result, 'gif');
          recording = false; rec.hidden = true; btn.disabled = false;
          SoundFX.confirm();
          setMsg('Animated! GIF saved to your BOX.');
        };
        r.readAsDataURL(blob);
      });
      gif.render();
    }());
  }

  // ---------- paste / drop / upload (work on any screen) ----------
  function ingestFiles(files) {
    var imgs = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type); });
    if (!imgs.length) return;
    var left = imgs.length;
    imgs.slice(0, 16).forEach(function (f) {
      var r = new FileReader();
      r.onload = function () {
        saveSnap(r.result, f.type === 'image/gif' ? 'gif' : 'photo');
        if (--left === 0) {
          SoundFX.coin();
          V5.say(imgs.length + ' snap' + (imgs.length === 1 ? '' : 's') + ' tucked into your BOX!');
        }
      };
      r.readAsDataURL(f);
    });
  }
  document.addEventListener('paste', function (e) {
    if (!e.clipboardData) return;
    var files = e.clipboardData.files;
    if (files && files.length) { e.preventDefault(); ingestFiles(files); }
  });
  document.addEventListener('dragover', function (e) { e.preventDefault(); });
  document.addEventListener('drop', function (e) {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files.length) ingestFiles(e.dataTransfer.files);
  });

  // ---------- wiring ----------
  function wire() {
    $('#shutter').addEventListener('click', snap);
    $('#rec-gif').addEventListener('click', recordGif);
    $('#fx-mirror').addEventListener('click', function () { SoundFX.click(); mirror = !mirror; syncFx(); });
    $('#fx-crt').addEventListener('click', function () { SoundFX.click(); crt = !crt; syncFx(); });
    $('#file-in').addEventListener('change', function (e) {
      ingestFiles(e.target.files);
      e.target.value = '';
    });
    document.addEventListener('keydown', function (e) {
      if (V5.screen === 'capture' && e.code === 'Space' && e.target.tagName !== 'INPUT') { e.preventDefault(); snap(); }
    });
  }
}());
