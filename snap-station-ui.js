/**
 * snap-station-ui.js — Main UI controller for the skeuomorphic Snap Station
 * Orchestrates camera, sticker grid, print, Cricut export, and payment
 * ES module — loaded after snap-payment/printing/cricut expose globals.
 */

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  photos: [],        // array of data URLs (max 16)
  selected: [],      // indices of selected sticker slots (max 4)
  stream: null,
  printerConfig: {
    printerType: 'inkjet',
    paperSize: '4x6',
    borderless: false,
    copies: 1,
    quality: 'high',
  },
};

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const webcam        = $('webcam');
const noCamera      = $('noCamera');
const flashOverlay  = $('flashOverlay');
const captureCanvas = $('captureCanvas');
const stickerGrid   = $('stickerGrid');
const creditCount   = $('creditCount');
const creditDots    = $('creditDots');
const payBalDisplay = $('payBalanceDisplay');

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildStickerGrid();
  updateCreditDisplay();

  // Camera
  $('startCameraBtn').addEventListener('click', startCamera);
  $('shareScreenBtn').addEventListener('click', startScreen);
  $('stopSourceBtn').addEventListener('click', stopSource);
  $('takePhotoBtn').addEventListener('click', takePhoto);

  // Print
  $('printBtn').addEventListener('click', handlePrint);

  // Cricut
  $('cricutBtn').addEventListener('click', handleCricut);

  // Settings
  $('settingsBtn').addEventListener('click', openSettings);
  $('settingsClose').addEventListener('click', closeSettings);
  $('settingsOverlay').addEventListener('click', closeSettings);
  $('saveSettings').addEventListener('click', saveSettings);

  // Payment
  $('insertCardBtn').addEventListener('click', openPayment);
  $('paymentCancel').addEventListener('click', closePayment);
  $('validatePin').addEventListener('click', validatePin);
  $('pinBackBtn').addEventListener('click', pinBack);
  $('attendantBtn').addEventListener('click', openAttendant);
  $('attendantClose').addEventListener('click', closeAttendant);
  $('attendantLogin').addEventListener('click', attendantLogin);

  // Numpad
  document.querySelectorAll('.num-key[data-key]').forEach(btn => {
    btn.addEventListener('click', () => appendPin(btn.dataset.key));
  });

  // Attendant override buttons
  document.querySelectorAll('.override-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.dataset.credits);
      PaymentSystem.addCredits(n);
      PaymentSystem.recordDispense(n);
      updateCreditDisplay();
      closeAttendant();
      closePayment();
      showToast(`✓ ${n} credit${n > 1 ? 's' : ''} added by attendant!`);
    });
  });

  // Dev mode: show test PIN loader on localhost
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    addDevToolbar();
  }
});

// ─── Sticker Grid ─────────────────────────────────────────────────────────────
function buildStickerGrid() {
  stickerGrid.innerHTML = '';
  for (let i = 0; i < 16; i++) {
    const slot = document.createElement('div');
    slot.className = 'sticker-slot';
    slot.dataset.index = i;
    slot.innerHTML = `<div class="empty-slot">📷</div>`;
    slot.addEventListener('click', () => toggleSelect(i));
    stickerGrid.appendChild(slot);
  }
}

function toggleSelect(index) {
  if (!state.photos[index]) return; // no photo here

  const sel = state.selected;
  const pos = sel.indexOf(index);
  if (pos >= 0) {
    sel.splice(pos, 1);
  } else {
    if (sel.length >= 4) {
      showToast('Max 4 stickers selected for printing');
      return;
    }
    sel.push(index);
  }
  renderGrid();
  renderStickerSheet();
}

function renderGrid() {
  const slots = stickerGrid.querySelectorAll('.sticker-slot');
  slots.forEach((slot, i) => {
    slot.classList.toggle('selected', state.selected.includes(i));
    if (state.photos[i]) {
      slot.innerHTML = `<img src="${state.photos[i]}" alt="sticker ${i+1}">`;
    } else {
      slot.innerHTML = `<div class="empty-slot">📷</div>`;
    }
    // Re-apply selected class after innerHTML reset
    slot.classList.toggle('selected', state.selected.includes(i));
  });
}

// ─── Sticker Sheet Canvas ─────────────────────────────────────────────────────
function renderStickerSheet() {
  if (state.photos.length === 0) return;

  const sheetSection = $('sheetPreviewSection');
  sheetSection.style.display = 'block';

  const canvas = $('stickerSheetCanvas');
  const COLS = 4, ROWS = 4;
  const CELL = 100; // px per sticker
  const PAD = 4;
  const FOOTER = 20;
  const W = COLS * (CELL + PAD) + PAD;
  const H = ROWS * (CELL + PAD) + PAD + FOOTER;

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 0.5;

  const loads = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      const x = PAD + c * (CELL + PAD);
      const y = PAD + r * (CELL + PAD);

      // Sticker outline
      ctx.strokeRect(x, y, CELL, CELL);

      if (state.photos[idx]) {
        const img = new Image();
        img.src = state.photos[idx];
        loads.push(new Promise(resolve => {
          img.onload = () => {
            ctx.drawImage(img, x, y, CELL, CELL);
            resolve();
          };
        }));
      } else {
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(x, y, CELL, CELL);
      }
    }
  }

  // Branding footer
  Promise.all(loads).then(() => {
    ctx.fillStyle = '#003791';
    ctx.fillRect(0, H - FOOTER, W, FOOTER);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('POKÉMON SNAP STATION', W / 2, H - FOOTER / 2 + 3);
  });
}

// ─── Camera ───────────────────────────────────────────────────────────────────
async function startCamera() {
  try {
    if (state.stream) stopSource();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    state.stream = stream;
    webcam.srcObject = stream;
    noCamera.classList.add('hidden');
    $('takePhotoBtn').disabled = false;
    showToast('Camera active');
  } catch (err) {
    showToast('Camera error: ' + err.message);
    console.error(err);
  }
}

async function startScreen() {
  try {
    if (state.stream) stopSource();
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    state.stream = stream;
    webcam.srcObject = stream;
    noCamera.classList.add('hidden');
    $('takePhotoBtn').disabled = false;
    showToast('Screen share active');
  } catch (err) {
    showToast('Screen share cancelled');
  }
}

function stopSource() {
  if (state.stream) {
    state.stream.getTracks().forEach(t => t.stop());
    state.stream = null;
  }
  webcam.srcObject = null;
  noCamera.classList.remove('hidden');
  $('takePhotoBtn').disabled = true;
}

// ─── Take Photo ───────────────────────────────────────────────────────────────
function takePhoto() {
  if (!webcam.srcObject) return;

  // Flash
  flashOverlay.classList.add('flash');
  setTimeout(() => flashOverlay.classList.remove('flash'), 300);

  // Capture
  captureCanvas.width = webcam.videoWidth || 640;
  captureCanvas.height = webcam.videoHeight || 480;
  const ctx = captureCanvas.getContext('2d');
  ctx.drawImage(webcam, 0, 0);

  const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.92);

  // Fill next empty slot
  const slot = findNextEmptySlot();
  if (slot === -1) {
    showToast('All 16 sticker slots filled! Delete some to take more.');
    return;
  }
  state.photos[slot] = dataUrl;
  renderGrid();
  renderStickerSheet();
  showToast(`Photo saved to slot ${slot + 1}`);
}

function findNextEmptySlot() {
  for (let i = 0; i < 16; i++) {
    if (!state.photos[i]) return i;
  }
  return -1;
}

// ─── Print ────────────────────────────────────────────────────────────────────
async function handlePrint() {
  // Check credits
  const bal = PaymentSystem.getBalance();
  if (bal <= 0) {
    openPayment();
    return;
  }

  // Need at least 1 selected photo
  if (state.selected.length === 0 && state.photos.length === 0) {
    showToast('Take some photos first!');
    return;
  }

  // Render sheet to canvas first
  renderStickerSheet();
  const canvas = $('stickerSheetCanvas');

  // Spend credit
  PaymentSystem.spendCredit();
  PaymentSystem.recordPrint();
  updateCreditDisplay();

  // Print
  const cfg = state.printerConfig;
  await PrintManager.print(canvas, cfg.printerType, {
    borderless: cfg.borderless,
    copies: cfg.copies,
  });

  showToast(`Printing... (${PaymentSystem.getBalance()} credits remaining)`);
}

// ─── Cricut ───────────────────────────────────────────────────────────────────
async function handleCricut() {
  if (state.photos.length === 0) {
    showToast('Take some photos first!');
    return;
  }

  renderStickerSheet();
  const canvas = $('stickerSheetCanvas');

  try {
    showToast('Generating Cricut package...');
    const blob = await CricutExporter.generateKissCutPackage(canvas);
    CricutExporter.downloadBlob(blob, 'snap_station_cricut.zip');
    showToast('✓ Cricut ZIP downloaded!');
  } catch (err) {
    showToast('Error: ' + err.message);
    console.error(err);
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function openSettings() {
  $('settingsOverlay').style.display = 'block';
  $('settingsDrawer').style.display = 'flex';

  // Populate current values
  $('printerType').value = state.printerConfig.printerType;
  $('paperSize').value = state.printerConfig.paperSize;
  $('borderless').checked = state.printerConfig.borderless;
  $('copies').value = state.printerConfig.copies;
  $('printQuality').value = state.printerConfig.quality;
}

function closeSettings() {
  $('settingsOverlay').style.display = 'none';
  $('settingsDrawer').style.display = 'none';
}

function saveSettings() {
  state.printerConfig = {
    printerType: $('printerType').value,
    paperSize: $('paperSize').value,
    borderless: $('borderless').checked,
    copies: parseInt($('copies').value) || 1,
    quality: $('printQuality').value,
  };
  closeSettings();
  showToast('Settings saved!');
}

// ─── Payment / PIN ────────────────────────────────────────────────────────────
let pinBuffer = '';

function openPayment() {
  pinBuffer = '';
  updatePinDisplay();
  $('pinError').textContent = '';
  $('payBalanceDisplay').textContent = PaymentSystem.getBalance();
  $('paymentOverlay').style.display = 'flex';
}

function closePayment() {
  $('paymentOverlay').style.display = 'none';
  pinBuffer = '';
}

function appendPin(digit) {
  if (pinBuffer.replace(/-/g, '').length >= 10) return;
  pinBuffer += digit;
  // Auto-insert dash after 5 digits
  const raw = pinBuffer.replace(/-/g, '');
  if (raw.length <= 5) {
    pinBuffer = raw;
  } else {
    pinBuffer = raw.slice(0, 5) + '-' + raw.slice(5);
  }
  updatePinDisplay();
}

function pinBack() {
  pinBuffer = pinBuffer.replace(/-/g, '');
  pinBuffer = pinBuffer.slice(0, -1);
  if (pinBuffer.length > 5) {
    pinBuffer = pinBuffer.slice(0, 5) + '-' + pinBuffer.slice(5);
  }
  updatePinDisplay();
}

function updatePinDisplay() {
  const raw = pinBuffer.replace(/-/g, '');
  const display = raw.padEnd(10, '_');
  $('pinDisplay').textContent = display.slice(0, 5) + '-' + display.slice(5);
}

function validatePin() {
  const result = PaymentSystem.decodePin(pinBuffer);
  if (result.valid) {
    PaymentSystem.usePin(pinBuffer);
    PaymentSystem.addCredits(result.credits);
    PaymentSystem.recordDispense(result.credits);
    updateCreditDisplay();
    closePayment();
    showToast(`✓ ${result.credits} credit${result.credits > 1 ? 's' : ''} added!`);
  } else {
    $('pinError').textContent = result.error;
    $('pinDisplay').classList.add('shake');
    setTimeout(() => $('pinDisplay').classList.remove('shake'), 500);
    pinBuffer = '';
    updatePinDisplay();
  }
}

// ─── Attendant Override ───────────────────────────────────────────────────────
function openAttendant() {
  $('attendantPassword').value = '';
  $('attendantError').textContent = '';
  $('attendantButtons').style.display = 'none';
  $('attendantOverlay').style.display = 'flex';
}

function closeAttendant() {
  $('attendantOverlay').style.display = 'none';
}

function attendantLogin() {
  const pw = $('attendantPassword').value;
  if (PaymentSystem.checkAdminPassword(pw)) {
    $('attendantError').textContent = '';
    $('attendantButtons').style.display = 'flex';
    showToast('Admin authenticated');
  } else {
    $('attendantError').textContent = 'Incorrect password';
    $('attendantPassword').value = '';
  }
}

// ─── Credit Display ───────────────────────────────────────────────────────────
function updateCreditDisplay() {
  const bal = PaymentSystem.getBalance();
  creditCount.textContent = bal;

  // Render credit dots (show up to 10)
  creditDots.innerHTML = '';
  const dots = Math.min(bal, 10);
  const total = Math.max(dots, 3);
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('div');
    dot.className = 'credit-dot' + (i < dots ? ' active' : '');
    creditDots.appendChild(dot);
  }

  // Update payment balance display if visible
  if (payBalDisplay) payBalDisplay.textContent = bal;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimeout;
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { t.style.display = 'none'; }, 3000);
}

// ─── Dev Toolbar (localhost only) ─────────────────────────────────────────────
function addDevToolbar() {
  const bar = document.createElement('div');
  bar.style.cssText = `
    position: fixed; top: 0; right: 0; z-index: 9999;
    background: #222; color: #FFD700; font-size: 10px;
    padding: 4px 8px; display: flex; gap: 8px; align-items: center;
    border-bottom-left-radius: 6px; font-family: monospace;
  `;
  bar.innerHTML = `
    <span>🛠 DEV</span>
    <button id="loadTestPins" style="font-size:9px;padding:3px 8px;cursor:pointer;">Load Test PINs</button>
    <button id="clearCredits" style="font-size:9px;padding:3px 8px;cursor:pointer;">Clear Credits</button>
  `;
  document.body.appendChild(bar);

  document.getElementById('loadTestPins').addEventListener('click', () => {
    // Load all test PINs as pre-validated credits (for testing)
    const allPins = Object.values(window.TEST_PINS || {}).flat();
    let total = 0;
    for (const pin of allPins) {
      const result = PaymentSystem.decodePin(pin);
      if (result.valid) {
        PaymentSystem.usePin(pin);
        PaymentSystem.addCredits(result.credits);
        total += result.credits;
      }
    }
    updateCreditDisplay();
    showToast(`Test PINs loaded: +${total} credits`);
  });

  document.getElementById('clearCredits').addEventListener('click', () => {
    localStorage.setItem('snapCredits', '0');
    PaymentSystem.clearUsedPins();
    updateCreditDisplay();
    showToast('Credits and PIN history cleared');
  });
}
