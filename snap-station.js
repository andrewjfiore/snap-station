// --- Core Utilities & Sound ---
window.SoundFX = {
    ctx: null,
    muted: false,
    init: function() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(e => console.warn("AudioContext resume failed", e));
        }
    },
    playTone: function(freq, type, duration, startTime = 0) {
        if (this.muted || !this.ctx) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + startTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration);
        osc.stop(this.ctx.currentTime + startTime + duration);
    },
    playNoise: function(duration) {
        this.init();
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.connect(this.ctx.destination);
        noise.connect(gain);
        noise.start();
        return { node: noise, gain: gain };
    },
    shutter: function() {
        if (this.muted) return;
        this.init();
        const { gain } = this.playNoise(0.1);
        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    },
    flashCharge: function() {
        if (this.muted) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(3000, now + 0.3);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.2);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    },
    beep: function() { if (!this.muted) this.playTone(880, 'square', 0.1); },
    bing: function() { if (!this.muted) this.playTone(1760, 'triangle', 0.5); },

    // --- NEW SOUNDS ---
    printer: function() {
        if(this.muted) return;
        this.init();
        const duration = 1.5;
        const { node, gain } = this.playNoise(duration);
        const now = this.ctx.currentTime;

        // Bandpass filter to create "motor" sound from noise
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 5;

        node.disconnect();
        node.connect(filter);
        filter.connect(gain);

        // Rev up and down
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.linearRampToValueAtTime(800, now + 0.2);
        filter.frequency.linearRampToValueAtTime(800, now + 1.2);
        filter.frequency.linearRampToValueAtTime(200, now + duration);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
        gain.gain.linearRampToValueAtTime(0.3, now + 1.3);
        gain.gain.linearRampToValueAtTime(0, now + duration);
    },

    cartridge: function() {
        if(this.muted) return;
        this.init();
        // Short, low frequency "clunk"
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.value = 150;
        osc.type = 'square';

        // Filter to dull the square wave into a plastic click
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

        osc.start(now);
        osc.stop(now + 0.1);
    }
};

// --- DOM Elements ---
const $ = (id) => document.getElementById(id);
const video = $('webcam');
const videoContainer = $('videoContainer');
const canvas = $('captureCanvas');
const gallery = $('gallery');
const themeSelect = $('themeSelect');
const emojiWallpaper = $('emojiWallpaper');
const recordingIndicator = $('recordingIndicator');
const timerDisplay = $('timerDisplay');
const gamepadIndicator = $('gamepadIndicator');
const EXPORT_CHANNEL = 'snapstation-sync';

// --- Broadcast Channel ---
let exportChannel = null;
if ('BroadcastChannel' in window) {
    exportChannel = new BroadcastChannel(EXPORT_CHANNEL);
}

function notifyExportUpdate() {
    if (exportChannel) {
        exportChannel.postMessage({ type: 'snapstation-export-updated', timestamp: Date.now() });
    }
}

// --- State ---
window.stream = null;
window.isRecording = false;
window.currentRatio = '16:9';
window.cameraActive = false;
window.activeSource = null;
window.sirenEnabled = false;
window.crtEnabled = false;
window.gifWorkerBlobUrl = null;
window.nesUnlocked = false;
window.isMirrored = false;
window.zoomLevel = 1;
window.panX = 0;
window.panY = 0;
let recordingInterval = null, countdownInterval = null;
let undoTimeout = null;
let transformRAF = null;
window.snapCount = 0;

// --- Init ---
async function prepareGifWorker() {
    try {
        const response = await fetch('lib/gif.worker.js');
        if (!response.ok) throw new Error('Fetch failed');
        const workerScript = await response.text();
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        window.gifWorkerBlobUrl = URL.createObjectURL(blob);
    } catch (e) {
        console.warn('GIF worker load failed, using direct path', e);
        window.gifWorkerBlobUrl = 'lib/gif.worker.js';
    }
}
prepareGifWorker();

window.addEventListener('beforeunload', () => {
    if (window.gifWorkerBlobUrl && window.gifWorkerBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(window.gifWorkerBlobUrl);
    }
    if (exportChannel) {
        exportChannel.close();
    }
});

// --- Theming ---
const emojiConfigs = { hearts: ['💖', '🫧', '💘', '🧼'], vines: ['🌿', '🌸', '🍃', '🌻'], '1-up': ['🍄', '⭐', '🪙', '🐢', '❓'] };

function generateWallpaper(theme) {
    emojiWallpaper.innerHTML = '';
    if (!emojiConfigs[theme]) { emojiWallpaper.classList.remove('active'); return; }

    const fragment = document.createDocumentFragment();
    const emojis = emojiConfigs[theme];
    for (let i = 0; i < 60; i++) {
        const span = document.createElement('span');
        span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        span.style.left = `${Math.random() * 100}%`;
        span.style.top = `${Math.random() * 100}%`;
        span.style.animationDelay = `${Math.random() * 8}s`;
        span.style.fontSize = `${Math.random() * 20 + 16}px`;
        fragment.appendChild(span);
    }
    emojiWallpaper.appendChild(fragment);
    emojiWallpaper.classList.add('active');
}

themeSelect.addEventListener('change', (e) => {
    document.body.setAttribute('data-theme', e.target.value);
    generateWallpaper(e.target.value);
});

// --- Help Button Fix ---
$('helpBtn').addEventListener('click', () => {
    $('helpTooltip').classList.toggle('visible');
    SoundFX.beep();
});
$('helpBtn').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        $('helpTooltip').classList.toggle('visible');
        SoundFX.beep();
    }
});
// Close tooltip when clicking elsewhere
document.addEventListener('click', (e) => {
    if (!e.target.closest('.tooltip-container')) {
        $('helpTooltip').classList.remove('visible');
    }
});

// --- Siren Click ---
$('sirenContainer').addEventListener('click', () => {
    $('siren').classList.toggle('flashing');
});
$('sirenContainer').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        $('siren').classList.toggle('flashing');
    }
});

// --- Video Control ---
function updateTransform() {
    if (transformRAF) return;
    transformRAF = requestAnimationFrame(() => {
        const displayPanX = window.isMirrored ? -window.panX : window.panX;
        video.style.transform = `scaleX(${window.isMirrored ? -1 : 1}) translate(${displayPanX}px, ${window.panY}px) scale(${window.zoomLevel})`;
        transformRAF = null;
    });
}

$('muteToggle').addEventListener('click', function() { 
    SoundFX.muted = !SoundFX.muted; 
    this.textContent = SoundFX.muted ? '🔇 Muted' : '🔊 Sound On';
    this.classList.toggle('active', SoundFX.muted);
    if(!SoundFX.muted) { SoundFX.init(); SoundFX.beep(); }
});

$('crtToggle').addEventListener('click', function() {
    window.crtEnabled = !window.crtEnabled;
    $('crtOverlay').classList.toggle('active', window.crtEnabled);
    this.classList.toggle('active', window.crtEnabled);
    SoundFX.init();
});

$('mirrorToggle').addEventListener('click', function() {
    window.isMirrored = !window.isMirrored;
    this.classList.toggle('active', window.isMirrored);
    updateTransform();
    SoundFX.init();
});

// --- Input Handling ---
let isDragging = false;
let startDragX = 0, startDragY = 0;

videoContainer.addEventListener('wheel', (e) => {
    if (!window.activeSource) return;
    e.preventDefault();
    window.zoomLevel = Math.min(Math.max(window.zoomLevel + (e.deltaY > 0 ? -0.1 : 0.1), 1), 5);
    if (window.zoomLevel === 1) { window.panX = 0; window.panY = 0; }
    updateTransform();
}, { passive: false });

videoContainer.addEventListener('mousedown', (e) => {
    if (!window.activeSource || window.zoomLevel <= 1) return;
    isDragging = true;
    startDragX = e.clientX - window.panX;
    startDragY = e.clientY - window.panY;
    videoContainer.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    window.panX = e.clientX - startDragX;
    window.panY = e.clientY - startDragY;
    updateTransform();
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    videoContainer.style.cursor = 'grab';
});

videoContainer.addEventListener('dblclick', () => {
    if (!window.activeSource) return;
    window.zoomLevel = 1; window.panX = 0; window.panY = 0; updateTransform();
});

// --- Camera & Stream ---
async function startStream(type) {
    SoundFX.init();
    stopStream(false);

    try {
        if (type === 'camera') {
            window.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, 
                audio: false 
            });
        } else {
            window.stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false });
        }

        video.srcObject = window.stream;
        video.style.display = 'block';
        $('noCamera').style.display = 'none';
        await video.play().catch(e => console.error("Play error", e));

        window.cameraActive = true;
        window.activeSource = type;
        $('screenshotBtn').disabled = false;
        $('gifBtn').disabled = false;
        // Auto-start siren
        $('siren').classList.add('flashing');

        updateUIForStream(true, type);

        const [track] = window.stream.getVideoTracks();
        if (track) {
            track.onended = () => stopStream();
        }
    } catch (err) {
        console.warn('Stream failed:', err);
        showError('Stream failed. Check permissions.');
        stopStream();
    }
}

function stopStream(fullReset = true) {
    if (window.isRecording) {
        window.isRecording = false;
        clearInterval(recordingInterval);
        clearInterval(countdownInterval);
        timerDisplay.classList.remove('active');
        recordingIndicator.classList.remove('active');
    }

    if (window.stream) {
        window.stream.getTracks().forEach(track => track.stop());
        window.stream = null;
    }

    if (fullReset) {
        video.srcObject = null;
        window.cameraActive = false;
        window.activeSource = null;
        video.style.display = 'none';
        $('noCamera').style.display = 'flex';
        $('screenshotBtn').disabled = true;
        $('gifBtn').disabled = true;
        // Auto-stop siren
        $('siren').classList.remove('flashing');

        window.zoomLevel = 1; window.panX = 0; window.panY = 0;
        updateTransform();
        updateUIForStream(false);
    }
}

function updateUIForStream(active, type) {
    const camBtn = $('startCameraBtn');
    const shareBtn = $('shareScreenBtn');

    if (active) {
        if (type === 'camera') {
            camBtn.innerHTML = '<span class="btn-icon">⏹️</span> Stop Camera';
            camBtn.classList.add('active');
            shareBtn.innerHTML = '<span class="btn-icon">🖥️</span> Share Screen';
            shareBtn.classList.remove('active');
        } else {
            camBtn.innerHTML = '<span class="btn-icon">📷</span> Start Camera';
            camBtn.classList.remove('active');
            shareBtn.innerHTML = '<span class="btn-icon">⏹️</span> Stop Sharing';
            shareBtn.classList.add('active');
        }
    } else {
        camBtn.innerHTML = '<span class="btn-icon">📷</span> Start Camera';
        camBtn.classList.remove('active');
        shareBtn.innerHTML = '<span class="btn-icon">🖥️</span> Share Screen';
        shareBtn.classList.remove('active');
    }
}

$('startCameraBtn').addEventListener('click', () => window.activeSource === 'camera' ? stopStream() : startStream('camera'));
$('shareScreenBtn').addEventListener('click', () => window.activeSource === 'screen' ? stopStream() : startStream('screen'));

// --- Capture Logic ---
function getCaptureParams() {
    const vidW = video.videoWidth;
    const vidH = video.videoHeight;
    const is169 = window.currentRatio === '16:9';
    const targetRatio = is169 ? 16/9 : 4/3;

    let baseW, baseH, baseX, baseY;
    if (vidW / vidH > targetRatio) {
        baseH = vidH; baseW = vidH * targetRatio;
        baseX = (vidW - baseW) / 2; baseY = 0;
    } else {
        baseW = vidW; baseH = vidW / targetRatio;
        baseX = 0; baseY = (vidH - baseH) / 2;
    }

    const viewW = baseW / window.zoomLevel;
    const viewH = baseH / window.zoomLevel;
    const scaleFactor = (vidW / video.offsetWidth) / window.zoomLevel;
    const panOffsetX = (window.isMirrored ? window.panX : -window.panX) * scaleFactor;
    const panOffsetY = -window.panY * scaleFactor;
    const centerX = baseX + baseW / 2 + panOffsetX;
    const centerY = baseY + baseH / 2 + panOffsetY;

    return {
        sx: centerX - viewW / 2,
        sy: centerY - viewH / 2,
        sw: viewW, sh: viewH,
        dw: baseW, dh: baseH
    };
}

$('screenshotBtn').addEventListener('click', async () => {
    if (!window.cameraActive) return;
    SoundFX.init();
    SoundFX.flashCharge();
    await new Promise(r => setTimeout(r, 300));

    const flash = $('flashOverlay');
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 50);
    SoundFX.shutter();

    const cp = getCaptureParams();
    canvas.width = cp.dw;
    canvas.height = cp.dh;
    const ctx = canvas.getContext('2d');

    if (window.isMirrored) { ctx.translate(cp.dw, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, cp.sx, cp.sy, cp.sw, cp.sh, 0, 0, cp.dw, cp.dh);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    addToGallery(dataUrl, 'jpg');
});

// --- GIF Logic ---
$('gifBtn').addEventListener('click', () => {
    if (!window.cameraActive || window.isRecording) return;
    SoundFX.init();
    window.isRecording = true;
    $('gifBtn').disabled = true;
    $('screenshotBtn').disabled = true;
    recordingIndicator.classList.add('active');
    timerDisplay.classList.add('active');

    let frames = [];
    let frameCount = 0;
    let timeRemaining = 5;
    timerDisplay.textContent = timeRemaining;
    SoundFX.beep();

    countdownInterval = setInterval(() => {
        timeRemaining--;
        timerDisplay.textContent = timeRemaining;
        if(timeRemaining <= 0) { clearInterval(countdownInterval); SoundFX.bing(); }
        else SoundFX.beep();
    }, 1000);

    recordingInterval = setInterval(() => {
        if (!window.cameraActive || frameCount >= 50) { 
            clearInterval(recordingInterval);
            finishGif(frames);
            return;
        }
        const cp = getCaptureParams();
        const scale = 480 / cp.dw;
        const c = document.createElement('canvas');
        c.width = 480; c.height = cp.dh * scale;
        const ctx = c.getContext('2d');
        if (window.isMirrored) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
        ctx.drawImage(video, cp.sx, cp.sy, cp.sw, cp.sh, 0, 0, c.width, c.height);
        frames.push(c);
        frameCount++;
    }, 100);
});

function finishGif(frames) {
    timerDisplay.classList.remove('active');
    recordingIndicator.classList.remove('active');
    updateStatus('Processing GIF...');

    const gif = new GIF({
        workers: 2, quality: 10, width: frames[0].width, height: frames[0].height,
        workerScript: window.gifWorkerBlobUrl
    });
    frames.forEach(f => gif.addFrame(f, { delay: 100 }));
    gif.on('finished', blob => {
        updateStatus('GIF Ready!');
        setTimeout(() => updateStatus(''), 2000);
        const reader = new FileReader();
        reader.onloadend = () => addToGallery(reader.result, 'gif');
        reader.readAsDataURL(blob);
        window.isRecording = false;
        $('gifBtn').disabled = false;
        $('screenshotBtn').disabled = false;

        // Cleanup frames
        frames.length = 0; 
        frames = null; 
    });

    try {
        gif.render();
    } catch(e) {
        console.error(e);
        showError('Failed to render GIF.');
        window.isRecording = false;
        $('gifBtn').disabled = false;
        $('screenshotBtn').disabled = false;
    }
}

// --- Gallery Management ---
function updateGalleryCounter() {
    window.snapCount = document.querySelectorAll('.snap-wrapper').length;
    $('galleryCounter').textContent = `${window.snapCount} / 256`;
    $('emptyGallery').style.display = window.snapCount === 0 ? 'block' : 'none';
}

window.addToGallery = function(dataUrl, type, index = 0) {
    if (window.snapCount >= 256) { showError('Gallery full!'); return; }

    const wrapper = document.createElement('div');
    wrapper.className = 'snap-wrapper';
    wrapper.tabIndex = 0; 
    wrapper.dataset.type = type; // Store type

    const img = document.createElement('img');
    img.src = dataUrl;
    img.className = 'snap-preview';

    const badge = document.createElement('div');
    badge.className = 'snap-badge';
    badge.textContent = type === 'gif' ? '🎬' : '📷';

    // Toggle selection logic
    wrapper.addEventListener('click', () => {
        wrapper.classList.toggle('selected');
        SoundFX.beep();
    });

    wrapper.append(img, badge);

    if (index === 0 && gallery.firstChild) gallery.insertBefore(wrapper, gallery.firstChild);
    else gallery.appendChild(wrapper);

    updateGalleryCounter();
}

// --- Bulk Actions ---
function showToast(msg) {
    const toast = $('undoToast');
    $('toastMessage').textContent = msg;
    toast.classList.add('visible');
    if (undoTimeout) clearTimeout(undoTimeout);
    undoTimeout = setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
}

function showError(msg) {
    updateStatus(msg);
    showToast(msg);
    setTimeout(() => updateStatus(''), 3000);
}

$('selectAllBtn').addEventListener('click', () => {
    const all = document.querySelectorAll('.snap-wrapper');
    const allSelected = Array.from(all).every(el => el.classList.contains('selected'));
    all.forEach(el => {
        if (allSelected) el.classList.remove('selected');
        else el.classList.add('selected');
    });
    SoundFX.beep();
});

$('deleteBtn').addEventListener('click', () => {
    const selected = document.querySelectorAll('.snap-wrapper.selected');
    if(selected.length === 0) return showToast('No snaps selected');

    if(confirm(`Delete ${selected.length} selected snaps?`)) {
        selected.forEach(el => el.remove());
        SoundFX.cartridge();

        updateGalleryCounter();
        showToast('Deleted selected snaps');
    }
});

const delay = ms => new Promise(res => setTimeout(res, ms));

$('downloadBtn').addEventListener('click', async () => {
    const selected = document.querySelectorAll('.snap-wrapper.selected');
    if(selected.length === 0) return showToast('No snaps selected');

    SoundFX.beep();
    showToast(`Downloading ${selected.length} snaps...`);

    for (let i = 0; i < selected.length; i++) {
        const el = selected[i];
        const img = el.querySelector('img');
        const link = document.createElement('a');
        const type = el.dataset.type || 'jpg';
        link.download = `snap-${Date.now()}-${i}.${type}`;
        link.href = img.src;
        link.click();
        await delay(200);
    }
});

// --- Send to Sticker Sheet ---
$('sendToStickerBtn').addEventListener('click', () => {
    const selected = document.querySelectorAll('.snap-wrapper.selected');
    if(selected.length === 0) return showToast('Select snaps to send');

    const images = [];
    selected.forEach(wrapper => {
        images.push(wrapper.querySelector('img').src);
    });

    // Store in localStorage for the wrapper/sticker sheet to access
    localStorage.setItem('snapstation-export', JSON.stringify({
        timestamp: Date.now(),
        images: images
    }));

    notifyExportUpdate();
    SoundFX.printer();
    showToast(`${images.length} snap${images.length !== 1 ? 's' : ''} queued. Switch to Sticker Sheet tab.`);

    // Deselect after sending
    selected.forEach(el => el.classList.remove('selected'));
});

// --- Profile Save/Load ---
$('saveProfileBtn').addEventListener('click', () => {
    try {
        SoundFX.printer(); // New Motor Sound
        const snaps = [];
        gallery.querySelectorAll('.snap-wrapper').forEach(w => {
            const img = w.querySelector('img');
            const badge = w.querySelector('.snap-badge');
            if(img && badge) snaps.push({ type: badge.textContent === '🎬'?'gif':'jpg', data: img.src });
        });
        const blob = new Blob([JSON.stringify({
            settings: { theme: themeSelect.value, crt: window.crtEnabled },
            gallery: snaps
        })], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `profile-${Date.now()}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        showToast('Profile saved successfully!');
    } catch(err) {
        console.error('Profile save error:', err);
        showError('Profile save failed - file may be too large');
    }
});

$('loadProfileBtn').addEventListener('click', () => $('profileInput').click());
$('profileInput').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if(!f) return;
    SoundFX.cartridge(); // New Click Sound
    const r = new FileReader();
    r.onload = (ev) => {
        try {
            const d = JSON.parse(ev.target.result);
            // Validate profile structure
            if (!d || typeof d !== 'object') {
                throw new Error('Invalid profile format');
            }
            if(d.settings?.theme) {
                themeSelect.value = d.settings.theme;
                themeSelect.dispatchEvent(new Event('change'));
            }
            if(Array.isArray(d.gallery)) {
                d.gallery.reverse().forEach(i => {
                    // Validate each gallery item
                    if(i.data && typeof i.data === 'string' && i.data.startsWith('data:')) {
                        addToGallery(i.data, i.type || 'jpg');
                    }
                });
            }
            showToast('Profile loaded successfully!');
        } catch(err) {
            console.error('Profile load error:', err);
            showError('Failed to load profile - invalid file');
        }
    };
    r.readAsText(f);
    e.target.value = '';
});

// --- Optimized Gamepad Manager ---
const Gamepad = {
    index: null,
    videoMode: false,
    lastBtns: {},
    lastAxes: {x:0, y:0},
    navThrottle: false,

    init() {
        window.addEventListener("gamepadconnected", e => {
            this.index = e.gamepad.index;
            this.loop();
            updateStatus("Gamepad Ready! L1+L2+R1+R2 to Toggle Mode");
            gamepadIndicator.classList.add('visible');
        });
        window.addEventListener("gamepaddisconnected", () => {
            this.index = null;
            gamepadIndicator.classList.remove('visible');
        });
    },

    loop() {
        if(this.index === null) return;
        const gp = navigator.getGamepads ? navigator.getGamepads()[this.index] : null;
        if(gp) this.check(gp);
        requestAnimationFrame(() => this.loop());
    },

    check(gp) {
        const press = (i) => gp.buttons[i]?.pressed;
        const click = (i) => press(i) && !this.lastBtns[i];

        // Mode Toggle (L1+R1+L2+R2)
        const L1=press(4), R1=press(5), L2=press(6), R2=press(7);
        if(L1 && R1 && L2 && R2) {
            if(!this.toggleLock) {
                this.videoMode = !this.videoMode;
                this.toggleLock = true;
                $('gamepadModeIcon').textContent = this.videoMode ? '📹' : '🎮';
                $('gamepadModeText').textContent = this.videoMode ? 'Video Mode' : 'Menu Mode';
                videoContainer.classList.toggle('gamepad-focus-visible', this.videoMode);
                SoundFX.beep();
            }
        } else this.toggleLock = false;

        if(this.videoMode) {
            // Video Controls
            if(click(0)) { window.zoomLevel = Math.min(window.zoomLevel+0.2, 5); updateTransform(); } // A
            if(click(1)) { window.zoomLevel = Math.max(window.zoomLevel-0.2, 1); updateTransform(); } // B
            if(click(2)) { window.zoomLevel = 1; window.panX=0; window.panY=0; updateTransform(); } // X

            // Pan (Axis/Dpad)
            const dx = gp.axes[0], dy = gp.axes[1];
            if(Math.abs(dx)>0.2) { window.panX -= dx * 10; updateTransform(); }
            if(Math.abs(dy)>0.2) { window.panY -= dy * 10; updateTransform(); }
        } else {
            // Menu Navigation - Throttled
            const dx = Math.abs(gp.axes[0]) > 0.5 ? Math.sign(gp.axes[0]) : (press(15)?1:(press(14)?-1:0));
            const dy = Math.abs(gp.axes[1]) > 0.5 ? Math.sign(gp.axes[1]) : (press(13)?1:(press(12)?-1:0));

            if(dx || dy) {
                if(!this.navThrottle) {
                    this.moveFocus(dx, dy);
                    this.navThrottle = true;
                    setTimeout(() => this.navThrottle = false, 200);
                }
            } else this.navThrottle = false;

            // Actions
            if(click(0)) document.activeElement?.click(); // A
            if(click(2)) $('screenshotBtn').click(); // X
            if(click(9)) $('startCameraBtn').click(); // Start
        }

        // Store State
        gp.buttons.forEach((b, i) => this.lastBtns[i] = b.pressed);
    },

    moveFocus(dx, dy) {
        const el = document.activeElement;
        if(!el || el === document.body) {
            $('startCameraBtn').focus(); return; 
        }
        const all = Array.from(document.querySelectorAll('button:not(:disabled), select, .snap-wrapper, .help-btn'));
        const r1 = el.getBoundingClientRect();
        const x1 = r1.x + r1.width/2, y1 = r1.y + r1.height/2;

        let next = null, minDist = Infinity;

        all.forEach(cand => {
            if(cand === el) return;
            const r2 = cand.getBoundingClientRect();
            const x2 = r2.x + r2.width/2, y2 = r2.y + r2.height/2;

            // Direction Check
            const valid = (dx===1 && x2>x1) || (dx===-1 && x2<x1) || (dy===1 && y2>y1) || (dy===-1 && y2<y1);
            if(valid) {
                const dist = Math.hypot(x2-x1, y2-y1);
                if(dist < minDist) { minDist = dist; next = cand; }
            }
        });
        if(next) { next.focus(); SoundFX.beep(); }
    }
};
Gamepad.init();

// --- UI Utils ---
function updateStatus(msg) { $('statusBar').textContent = msg; }
document.querySelectorAll('.ratio-option').forEach(b => b.addEventListener('click', function() {
    document.querySelectorAll('.ratio-option').forEach(o => o.classList.remove('active'));
    this.classList.add('active');
    window.currentRatio = this.dataset.ratio;
    videoContainer.classList.toggle('ratio-4-3', window.currentRatio === '4:3');
    SoundFX.init();
}));

$('fullscreenBtn').addEventListener('click', () => {
    if(!document.fullscreenElement) {
        videoContainer.requestFullscreen().catch(e => {
            console.log('Fullscreen error:', e);
            showError('Fullscreen not supported');
        });
    } else {
        document.exitFullscreen();
    }
});

// Konami
let kCode = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let kIdx = 0;
window.addEventListener('keydown', e => {
    if(e.key === kCode[kIdx] || e.key.toLowerCase() === kCode[kIdx]) {
        kIdx++;
        if(kIdx === kCode.length) {
            if(!window.nesUnlocked) {
                const opt = document.createElement('option');
                opt.value = '1-up'; opt.textContent = '🍄 1-UP';
                $('colorThemesGroup').appendChild(opt);
                window.nesUnlocked = true;
            }
            themeSelect.value = '1-up';
            themeSelect.dispatchEvent(new Event('change'));
            kIdx = 0;
        }
    } else kIdx = 0;
});

generateWallpaper('video-rental');
