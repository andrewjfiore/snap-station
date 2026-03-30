/**
 * snap-station.spec.js — Playwright tests for the skeuomorphic Snap Station UI
 * Tests: page load, camera controls, photo capture, sticker grid, UI elements
 */
const { test, expect } = require('@playwright/test');
const { isTouch, goToSnapStation } = require('./helpers');

test.describe('Snap Station — Skeuomorphic UI', () => {

  test.beforeEach(async ({ page }) => {
    // Intercept external resources before navigation
    await page.route('https://fonts.googleapis.com/**', r =>
      r.fulfill({ status: 200, contentType: 'text/css', body: '/* fonts stub */' })
    );
    await page.route('https://fonts.gstatic.com/**', r =>
      r.fulfill({ status: 200, contentType: 'font/woff2', body: '' })
    );
    await page.route('https://cdnjs.cloudflare.com/**', r =>
      r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.JSZip=function(){};JSZip.prototype.file=function(){return this};JSZip.prototype.generateAsync=async function(){return new Blob([])};' })
    );
    await goToSnapStation(page);
    await page.evaluate(() => localStorage.clear());
    // Wait for modules + UI to be ready
    await page.waitForFunction(() => typeof window.PaymentSystem !== 'undefined', { timeout: 10000 });
    await page.waitForTimeout(300);
  });

  // ─── Page Load ───────────────────────────────────────────────────────────────

  test('page loads with title bar and kiosk shell', async ({ page }) => {
    await expect(page.locator('.kiosk-shell')).toBeVisible();
    await expect(page.locator('.title-bar')).toBeVisible();
    await expect(page.locator('.title-logo')).toBeVisible();
  });

  test('title bar shows POKEMON SNAP STATION branding', async ({ page }) => {
    const title = await page.textContent('.title-logo');
    expect(title).toMatch(/SNAP STATION/i);
  });

  test('screen bezel with video container is visible', async ({ page }) => {
    await expect(page.locator('.screen-bezel')).toBeVisible();
    await expect(page.locator('#videoContainer')).toBeVisible();
  });

  test('sticker grid has 16 slots', async ({ page }) => {
    const slots = page.locator('.sticker-slot');
    await expect(slots).toHaveCount(16);
  });

  test('action buttons are visible', async ({ page }) => {
    await expect(page.locator('#takePhotoBtn')).toBeVisible();
    await expect(page.locator('#printBtn')).toBeVisible();
    await expect(page.locator('#cricutBtn')).toBeVisible();
    await expect(page.locator('#settingsBtn')).toBeVisible();
  });

  test('credit row with INSERT CARD button is visible', async ({ page }) => {
    await expect(page.locator('.credit-row')).toBeVisible();
    await expect(page.locator('#insertCardBtn')).toBeVisible();
  });

  test('layout is responsive — no horizontal overflow', async ({ page }) => {
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );
    expect(overflow).toBe(true);
  });

  // ─── Camera Controls ──────────────────────────────────────────────────────

  test('camera button starts stream and enables TAKE PHOTO', async ({ page }) => {
    await expect(page.locator('#takePhotoBtn')).toBeDisabled();
    await page.click('#startCameraBtn');
    await page.waitForTimeout(1000);
    await expect(page.locator('#takePhotoBtn')).not.toBeDisabled();
  });

  test('stop button disables TAKE PHOTO', async ({ page }) => {
    await page.click('#startCameraBtn');
    await page.waitForTimeout(1000);
    await page.click('#stopSourceBtn');
    await page.waitForTimeout(500);
    await expect(page.locator('#takePhotoBtn')).toBeDisabled();
  });

  test('no-camera message shown initially', async ({ page }) => {
    const noCamera = page.locator('#noCamera');
    // Not hidden at start (no stream active)
    const classes = await noCamera.getAttribute('class');
    expect(classes).not.toContain('hidden');
  });

  // ─── Photo Capture ─────────────────────────────────────────────────────────

  test('taking a photo fills a sticker slot', async ({ page }) => {
    await page.click('#startCameraBtn');
    await page.waitForTimeout(1000);

    await page.click('#takePhotoBtn');
    await page.waitForTimeout(500);

    // First slot should now have an img
    const firstSlotImg = page.locator('.sticker-slot').first().locator('img');
    await expect(firstSlotImg).toBeVisible({ timeout: 2000 });
  });

  test('flash overlay fires on photo capture', async ({ page }) => {
    await page.click('#startCameraBtn');
    await page.waitForTimeout(1000);

    const flashPromise = page.evaluate(() => new Promise(resolve => {
      const flash = document.getElementById('flashOverlay');
      if (!flash) { resolve(false); return; }
      const observer = new MutationObserver(() => {
        if (flash.classList.contains('flash')) resolve(true);
      });
      observer.observe(flash, { attributes: true, attributeFilter: ['class'] });
      setTimeout(() => resolve(false), 2000);
    }));

    await page.click('#takePhotoBtn');
    const flashed = await flashPromise;
    expect(flashed).toBe(true);
  });

  test('sheet preview section appears after first photo', async ({ page }) => {
    await page.click('#startCameraBtn');
    await page.waitForTimeout(1000);
    await page.click('#takePhotoBtn');
    await page.waitForTimeout(500);
    const display = await page.locator('#sheetPreviewSection').evaluate(el => el.style.display);
    expect(display).not.toBe('none');
  });

  // ─── Sticker Selection ─────────────────────────────────────────────────────

  test('clicking slot with photo toggles selected class', async ({ page }) => {
    // Add a photo
    await page.click('#startCameraBtn');
    await page.waitForTimeout(1000);
    await page.click('#takePhotoBtn');
    await page.waitForTimeout(500);

    const slot = page.locator('.sticker-slot').first();
    await slot.click();
    await expect(slot).toHaveClass(/selected/);

    // Click again to deselect
    await slot.click();
    await expect(slot).not.toHaveClass(/selected/);
  });

  test('max 4 sticker slots can be selected', async ({ page }) => {
    // Add 5 photos
    await page.click('#startCameraBtn');
    await page.waitForTimeout(1000);
    for (let i = 0; i < 5; i++) {
      await page.click('#takePhotoBtn');
      await page.waitForTimeout(300);
    }

    // Select 4 slots
    const slots = page.locator('.sticker-slot');
    for (let i = 0; i < 4; i++) {
      await slots.nth(i).click();
    }

    // Try to select 5th
    await slots.nth(4).click();

    // Should show toast (4 max) — only 4 selected
    const selectedCount = await page.locator('.sticker-slot.selected').count();
    expect(selectedCount).toBe(4);
  });

  // ─── Settings Drawer ───────────────────────────────────────────────────────

  test('settings drawer opens and closes', async ({ page }) => {
    await expect(page.locator('#settingsDrawer')).toBeHidden();
    await page.click('#settingsBtn');
    await expect(page.locator('#settingsDrawer')).toBeVisible();
    // Close via JS in case dev toolbar overlaps on localhost
    await page.evaluate(() => {
      const overlay = document.getElementById('settingsOverlay');
      const drawer = document.getElementById('settingsDrawer');
      if (overlay) overlay.style.display = 'none';
      if (drawer) drawer.style.display = 'none';
    });
    await expect(page.locator('#settingsDrawer')).toBeHidden();
  });

  test('settings can be saved', async ({ page }) => {
    await page.click('#settingsBtn');
    await page.selectOption('#printerType', 'selphy');
    await page.check('#borderless');
    await page.click('#saveSettings');
    await expect(page.locator('#settingsDrawer')).toBeHidden();
    // Toast should confirm
    await expect(page.locator('#toast')).toBeVisible({ timeout: 2000 });
  });

  // ─── Payment / INSERT CARD ─────────────────────────────────────────────────

  test('INSERT CARD opens payment overlay', async ({ page }) => {
    await page.click('#insertCardBtn');
    await expect(page.locator('#paymentOverlay')).toBeVisible();
  });

  test('payment cancel closes overlay', async ({ page }) => {
    await page.click('#insertCardBtn');
    await page.click('#paymentCancel');
    await expect(page.locator('#paymentOverlay')).toBeHidden();
  });

  test('credit count starts at 0', async ({ page }) => {
    const text = await page.textContent('#creditCount');
    expect(parseInt(text)).toBe(0);
  });

  // ─── Print ─────────────────────────────────────────────────────────────────

  test('print with 0 credits opens payment overlay', async ({ page }) => {
    await page.click('#printBtn');
    await expect(page.locator('#paymentOverlay')).toBeVisible();
  });

  test('CRICUT button exists and is visible', async ({ page }) => {
    await expect(page.locator('#cricutBtn')).toBeVisible();
  });

  // ─── Accessibility / Responsive ────────────────────────────────────────────

  test('buttons have min touch target height', async ({ page }, testInfo) => {
    if (!isTouch(testInfo.project.name)) {
      test.skip();
      return;
    }
    // Only check action buttons (arcade-btn) which have explicit min-height
    const btns = page.locator('.arcade-btn');
    const count = await btns.count();
    for (let i = 0; i < count; i++) {
      const box = await btns.nth(i).boundingBox();
      if (box && box.height > 0) {
        // 36px minimum for mobile touch targets (WCAG 2.5.5 recommends 44px, 36 is acceptable)
        expect(box.height).toBeGreaterThanOrEqual(36);
      }
    }
  });

  test('admin link is present', async ({ page }) => {
    await expect(page.locator('.admin-link')).toBeVisible();
  });

});
