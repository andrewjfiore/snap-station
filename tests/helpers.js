// Test helper utilities for touch/mouse simulation and common actions
const { expect } = require('@playwright/test');

/**
 * Device profile metadata for conditional test logic
 */
function getDeviceType(projectName) {
  return projectName; // 'phone', 'tablet', or 'laptop'
}

function isTouch(projectName) {
  return projectName === 'phone' || projectName === 'tablet';
}

/**
 * Get the Snap Station iframe from the index page
 */
async function getSnapStationFrame(page) {
  const frame = page.frameLocator('#snap-station');
  return frame;
}

/**
 * Get the Sticker Sheet iframe from the index page
 */
async function getStickerSheetFrame(page) {
  const frame = page.frameLocator('#sticker-sheet');
  return frame;
}

/**
 * Navigate directly to snap-station.html (bypasses iframe)
 */
async function goToSnapStation(page) {
  await page.goto('/snap-station.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
}

/**
 * Navigate directly to sticker-sheet.html (bypasses iframe).
 * Stubs external CDN scripts that would otherwise block loading in
 * offline/isolated environments.
 */
async function goToStickerSheet(page) {
  // Intercept external CDN requests and provide stubs
  await page.route('https://cdnjs.cloudflare.com/ajax/libs/cropperjs/**', route => {
    if (route.request().url().endsWith('.css')) {
      route.fulfill({ status: 200, contentType: 'text/css', body: '/* cropper stub */' });
    } else {
      route.fulfill({ status: 200, contentType: 'application/javascript', body: stubCropperJS() });
    }
  });
  await page.route('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/**', route => {
    route.fulfill({ status: 200, contentType: 'application/javascript', body: stubHtml2Canvas() });
  });
  await page.route('https://cdnjs.cloudflare.com/ajax/libs/jspdf/**', route => {
    route.fulfill({ status: 200, contentType: 'application/javascript', body: stubJsPDF() });
  });
  await page.route('https://fonts.googleapis.com/**', route => {
    route.fulfill({ status: 200, contentType: 'text/css', body: '/* fonts stub */' });
  });
  await page.route('https://fonts.gstatic.com/**', route => {
    route.fulfill({ status: 200, contentType: 'font/woff2', body: '' });
  });
  await page.route('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/**', route => {
    route.fulfill({ status: 200, contentType: 'text/css', body: '/* font-awesome stub */' });
  });

  await page.goto('/sticker-sheet.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
}

/**
 * Stub for Cropper.js - provides minimal API surface for testing
 */
function stubCropperJS() {
  return `
    (function(global) {
      function Cropper(element, options) {
        this.element = element;
        this.options = options || {};
        this.isCustomReady = false;
        this._data = { x: 0, y: 0, width: 100, height: 75, rotate: 0, scaleX: 1, scaleY: 1 };
        this._canvasData = { left: 0, top: 0, width: 200, height: 150, naturalWidth: 200, naturalHeight: 150 };
        this._cropBoxData = { left: 0, top: 0, width: 200, height: 150 };
        var self = this;
        setTimeout(function() {
          self.isCustomReady = true;
          if (self.options.ready) {
            self.options.ready.call({ cropper: self });
          }
        }, 50);
      }
      Cropper.prototype.getData = function() { return Object.assign({}, this._data); };
      Cropper.prototype.setData = function(d) { Object.assign(this._data, d); };
      Cropper.prototype.getCanvasData = function() { return Object.assign({}, this._canvasData); };
      Cropper.prototype.setCanvasData = function(d) { Object.assign(this._canvasData, d); };
      Cropper.prototype.getCropBoxData = function() { return Object.assign({}, this._cropBoxData); };
      Cropper.prototype.setCropBoxData = function(d) { Object.assign(this._cropBoxData, d); };
      Cropper.prototype.zoomTo = function(ratio) { this._canvasData.width = this._canvasData.naturalWidth * ratio; };
      Cropper.prototype.reset = function() {
        this._data = { x: 0, y: 0, width: 100, height: 75, rotate: 0, scaleX: 1, scaleY: 1 };
      };
      Cropper.prototype.destroy = function() { this.isCustomReady = false; };
      global.Cropper = Cropper;
    })(window);
  `;
}

/**
 * Stub for html2canvas
 */
function stubHtml2Canvas() {
  return `
    window.html2canvas = function(element, options) {
      var canvas = document.createElement('canvas');
      canvas.width = element.offsetWidth || 400;
      canvas.height = element.offsetHeight || 300;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return Promise.resolve(canvas);
    };
  `;
}

/**
 * Stub for jsPDF
 */
function stubJsPDF() {
  return `
    (function(global) {
      var jspdf = {
        jsPDF: function(opts) {
          return {
            addImage: function() {},
            save: function(name) {},
            output: function() { return ''; }
          };
        }
      };
      global.jspdf = jspdf;
    })(window);
  `;
}

/**
 * Simulate a single tap (touch) on an element
 */
async function tap(page, selector) {
  const el = page.locator(selector);
  await el.tap();
}

/**
 * Simulate a click (mouse) on an element
 */
async function click(page, selector) {
  await page.locator(selector).click();
}

/**
 * Tap or click depending on device.
 * Uses click() for both since Playwright converts clicks to taps
 * on touch-emulated devices. Explicit touch gestures (pinch, drag)
 * use dedicated functions.
 */
async function interact(page, selector, projectName) {
  await page.locator(selector).first().click();
}

/**
 * Simulate a pinch-to-zoom gesture on an element
 */
async function pinchZoom(page, selector, scale = 1.5) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`Element ${selector} not found for pinch`);

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Start with two fingers close together, spread apart
  const startDist = 30;
  const endDist = startDist * scale;

  await page.touchscreen.tap(cx, cy); // wake touch
  await page.evaluate(({ cx, cy, startDist, endDist, selector }) => {
    const el = document.querySelector(selector);
    if (!el) return;

    // Simulate touchstart with 2 touches
    const startTouch1 = new Touch({ identifier: 0, target: el, clientX: cx - startDist, clientY: cy });
    const startTouch2 = new Touch({ identifier: 1, target: el, clientX: cx + startDist, clientY: cy });
    el.dispatchEvent(new TouchEvent('touchstart', {
      touches: [startTouch1, startTouch2],
      targetTouches: [startTouch1, startTouch2],
      changedTouches: [startTouch1, startTouch2],
      bubbles: true, cancelable: true
    }));

    // Simulate touchmove spreading fingers
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      const d = startDist + (endDist - startDist) * (i / steps);
      const moveTouch1 = new Touch({ identifier: 0, target: el, clientX: cx - d, clientY: cy });
      const moveTouch2 = new Touch({ identifier: 1, target: el, clientX: cx + d, clientY: cy });
      el.dispatchEvent(new TouchEvent('touchmove', {
        touches: [moveTouch1, moveTouch2],
        targetTouches: [moveTouch1, moveTouch2],
        changedTouches: [moveTouch1, moveTouch2],
        bubbles: true, cancelable: true
      }));
    }

    // Simulate touchend
    el.dispatchEvent(new TouchEvent('touchend', {
      touches: [],
      targetTouches: [],
      changedTouches: [
        new Touch({ identifier: 0, target: el, clientX: cx - endDist, clientY: cy }),
        new Touch({ identifier: 1, target: el, clientX: cx + endDist, clientY: cy })
      ],
      bubbles: true, cancelable: true
    }));
  }, { cx, cy, startDist, endDist, selector });
}

/**
 * Simulate a double-tap gesture
 */
async function doubleTap(page, selector) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`Element ${selector} not found for double tap`);

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.evaluate(({ cx, cy, selector }) => {
    const el = document.querySelector(selector);
    if (!el) return;

    function fireTap(timestamp) {
      const touch = new Touch({ identifier: 0, target: el, clientX: cx, clientY: cy });
      el.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touch], targetTouches: [touch], changedTouches: [touch],
        bubbles: true, cancelable: true
      }));
      el.dispatchEvent(new TouchEvent('touchend', {
        touches: [], targetTouches: [], changedTouches: [touch],
        bubbles: true, cancelable: true
      }));
    }

    fireTap(Date.now());
    // Fire second tap within 300ms threshold
    setTimeout(() => fireTap(Date.now()), 50);
  }, { cx, cy, selector });

  await page.waitForTimeout(150);
}

/**
 * Simulate a mouse wheel scroll on an element
 */
async function scrollWheel(page, selector, deltaY = -100) {
  const box = await page.locator(selector).boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, deltaY);
}

/**
 * Simulate mouse drag on an element
 */
async function mouseDrag(page, selector, dx, dy) {
  const box = await page.locator(selector).boundingBox();
  if (!box) return;
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 5 });
  await page.mouse.up();
}

/**
 * Simulate touch drag on an element
 */
async function touchDrag(page, selector, dx, dy) {
  const box = await page.locator(selector).boundingBox();
  if (!box) return;

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.evaluate(({ startX, startY, dx, dy, selector }) => {
    const el = document.querySelector(selector);
    if (!el) return;

    const startTouch = new Touch({ identifier: 0, target: el, clientX: startX, clientY: startY });
    el.dispatchEvent(new TouchEvent('touchstart', {
      touches: [startTouch], targetTouches: [startTouch], changedTouches: [startTouch],
      bubbles: true, cancelable: true
    }));

    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      const x = startX + dx * (i / steps);
      const y = startY + dy * (i / steps);
      const moveTouch = new Touch({ identifier: 0, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent('touchmove', {
        touches: [moveTouch], targetTouches: [moveTouch], changedTouches: [moveTouch],
        bubbles: true, cancelable: true
      }));
    }

    const endTouch = new Touch({ identifier: 0, target: el, clientX: startX + dx, clientY: startY + dy });
    el.dispatchEvent(new TouchEvent('touchend', {
      touches: [], targetTouches: [], changedTouches: [endTouch],
      bubbles: true, cancelable: true
    }));
  }, { startX, startY, dx, dy, selector });
}

/**
 * Check that an element has no unwanted outlines (focus ring check)
 */
async function assertNoFocusOutline(page, selector) {
  const outline = await page.locator(selector).evaluate(el => {
    const style = window.getComputedStyle(el);
    return style.outline;
  });
  // After a click/tap, outline should be "none" or "0px none ..."
  expect(outline).toMatch(/none|0px/);
}

/**
 * Create a test image data URL for upload testing
 */
function createTestImageDataURL(width = 100, height = 75, color = 'red') {
  // Returns a minimal valid PNG-like base64 (we'll use a canvas in-browser instead)
  return `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<rect width="${width}" height="${height}" fill="${color}"/>` +
    `</svg>`
  ).toString('base64')}`;
}

/**
 * Upload a test image to a file input via page evaluation
 */
async function uploadTestImage(page, inputSelector, filename = 'test.png') {
  // Create a synthetic file and set it on the input
  await page.evaluate(async ({ selector, filename }) => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(0, 0, 200, 150);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText('TEST', 70, 80);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], filename, { type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(file);

    const input = document.querySelector(selector);
    if (input) {
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { selector: inputSelector, filename });
}

/**
 * Wait for sticker sheet grid to have images loaded
 */
async function waitForGridImages(page, minCount = 1, timeout = 5000) {
  await page.waitForFunction(
    (min) => document.querySelectorAll('.cell.has-image').length >= min,
    minCount,
    { timeout }
  );
}

module.exports = {
  getDeviceType,
  isTouch,
  getSnapStationFrame,
  getStickerSheetFrame,
  goToSnapStation,
  goToStickerSheet,
  tap,
  click,
  interact,
  pinchZoom,
  doubleTap,
  scrollWheel,
  mouseDrag,
  touchDrag,
  assertNoFocusOutline,
  createTestImageDataURL,
  uploadTestImage,
  waitForGridImages,
};
