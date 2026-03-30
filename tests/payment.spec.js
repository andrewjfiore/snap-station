/**
 * payment.spec.js — Playwright tests for the Snap Station payment/PIN system
 * Tests Luhn PIN validation, credit management, admin panel auth, and override
 */
const { test, expect } = require('@playwright/test');

// Use the HTTP server (baseURL from playwright.config.js = http://localhost:3737)
const SNAP_URL = '/snap-station.html';
const ADMIN_URL = '/admin.html';

// Valid test PINs (1-print tier, Luhn valid)
const VALID_PIN_1 = '01104-33216';
// Invalid PIN (bad checksum)
const INVALID_PIN = '12345-67890';

/** Wait for snap-station-ui.js to finish setting up event listeners */
async function waitForSnapReady(page) {
  await page.waitForFunction(() => typeof window.PaymentSystem !== 'undefined', { timeout: 10000 });
  await page.waitForTimeout(300); // allow DOMContentLoaded handlers to fire
}

test.describe('Payment System', () => {

  test.beforeEach(async ({ page }) => {
    // Stub external resources
    await page.route('https://fonts.googleapis.com/**', r =>
      r.fulfill({ status: 200, contentType: 'text/css', body: '' })
    );
    await page.route('https://cdnjs.cloudflare.com/**', r =>
      r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.JSZip=function(){this._files={}};JSZip.prototype.file=function(){return this};JSZip.prototype.generateAsync=async function(){return new Blob([])};' })
    );
    // Clear localStorage before each test
    await page.goto(SNAP_URL);
    await page.evaluate(() => localStorage.clear());
    await waitForSnapReady(page);
  });

  test('valid test PIN adds 1 credit', async ({ page }) => {
    await page.goto(SNAP_URL);

    // Open payment screen via "INSERT CARD" button
    await page.click('#insertCardBtn');
    await expect(page.locator('#paymentOverlay')).toBeVisible();

    // Enter PIN digits
    const digits = VALID_PIN_1.replace(/-/g, '');
    for (const d of digits) {
      await page.click(`.num-key[data-key="${d}"]`);
    }

    // Validate
    await page.click('#validatePin');

    // Payment overlay should close
    await expect(page.locator('#paymentOverlay')).toBeHidden({ timeout: 3000 });

    // Credit count should be 1
    const creditText = await page.textContent('#creditCount');
    expect(parseInt(creditText)).toBe(1);
  });

  test('invalid PIN (bad checksum) shows error', async ({ page }) => {
    await page.goto(SNAP_URL);

    await page.click('#insertCardBtn');
    await expect(page.locator('#paymentOverlay')).toBeVisible();

    // Enter invalid PIN
    const digits = INVALID_PIN.replace(/-/g, '');
    for (const d of digits) {
      await page.click(`.num-key[data-key="${d}"]`);
    }

    await page.click('#validatePin');

    // Error should be shown
    const errorText = await page.textContent('#pinError');
    expect(errorText).toMatch(/invalid|checksum/i);

    // Overlay stays open
    await expect(page.locator('#paymentOverlay')).toBeVisible();

    // Credits unchanged (0)
    const creditText = await page.textContent('#creditCount');
    expect(parseInt(creditText)).toBe(0);
  });

  test('used PIN is rejected on second use', async ({ page }) => {
    await page.goto(SNAP_URL);

    // Use the PIN once successfully
    await page.click('#insertCardBtn');
    const digits = VALID_PIN_1.replace(/-/g, '');
    for (const d of digits) {
      await page.click(`.num-key[data-key="${d}"]`);
    }
    await page.click('#validatePin');
    await expect(page.locator('#paymentOverlay')).toBeHidden({ timeout: 3000 });
    expect(parseInt(await page.textContent('#creditCount'))).toBe(1);

    // Try to use the same PIN again
    await page.click('#insertCardBtn');
    for (const d of digits) {
      await page.click(`.num-key[data-key="${d}"]`);
    }
    await page.click('#validatePin');

    // Should show "already used" error
    const errorText = await page.textContent('#pinError');
    expect(errorText).toMatch(/already used/i);

    // Credits should still be 1 (not 2)
    expect(parseInt(await page.textContent('#creditCount'))).toBe(1);
  });

  test('backspace clears last digit', async ({ page }) => {
    await page.goto(SNAP_URL);
    await page.click('#insertCardBtn');

    // Enter 3 digits
    await page.click(`.num-key[data-key="1"]`);
    await page.click(`.num-key[data-key="2"]`);
    await page.click(`.num-key[data-key="3"]`);

    // Backspace once
    await page.click('#pinBackBtn');

    // Display should show 12_______
    const displayText = await page.textContent('#pinDisplay');
    expect(displayText).toMatch(/^12/);
  });

  test('cancel payment closes overlay', async ({ page }) => {
    await page.goto(SNAP_URL);
    await page.click('#insertCardBtn');
    await expect(page.locator('#paymentOverlay')).toBeVisible();

    await page.click('#paymentCancel');
    await expect(page.locator('#paymentOverlay')).toBeHidden();
  });

});

test.describe('Admin Panel', () => {

  test.beforeEach(async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', r =>
      r.fulfill({ status: 200, contentType: 'text/css', body: '' })
    );
    await page.goto(ADMIN_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
  });

  test('admin panel shows login form by default', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await expect(page.locator('#loginMain')).toBeVisible();
    await expect(page.locator('#adminMain')).toBeHidden();
  });

  test('wrong password shows error', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.fill('#loginPassword', 'wrongpassword');
    await page.click('button:has-text("LOGIN")');
    // Wait for error
    await page.waitForTimeout(300);
    const err = await page.textContent('#loginError');
    expect(err).toMatch(/incorrect/i);
    await expect(page.locator('#adminMain')).toBeHidden();
  });

  test('correct default password grants access', async ({ page }) => {
    await page.goto(ADMIN_URL);
    // Default password is "snapAdmin" (set on first run)
    await page.fill('#loginPassword', 'snapAdmin');
    await page.click('button:has-text("LOGIN")');
    await page.waitForTimeout(300);
    await expect(page.locator('#adminMain')).toBeVisible({ timeout: 3000 });
  });

  test('admin can add credits via override', async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', r =>
      r.fulfill({ status: 200, contentType: 'text/css', body: '' })
    );
    await page.goto(SNAP_URL);
    await page.evaluate(() => localStorage.clear());
    await waitForSnapReady(page);

    // Open payment screen
    await page.click('#insertCardBtn');
    await expect(page.locator('#paymentOverlay')).toBeVisible();

    // Click attendant button (may need scroll/force)
    await page.locator('#attendantBtn').scrollIntoViewIfNeeded();
    await page.locator('#attendantBtn').click({ force: true });

    await expect(page.locator('#attendantOverlay')).toBeVisible({ timeout: 5000 });

    await page.fill('#attendantPassword', 'snapAdmin');
    await page.click('#attendantLogin');
    await page.waitForTimeout(500);

    // Should show credit buttons
    await expect(page.locator('#attendantButtons')).toBeVisible({ timeout: 3000 });

    // Add 5 credits
    await page.click('.override-btn[data-credits="5"]');
    await page.waitForTimeout(500);

    // Payment overlay should close, credits = 5
    await expect(page.locator('#paymentOverlay')).toBeHidden({ timeout: 3000 });
    const creditText = await page.textContent('#creditCount');
    expect(parseInt(creditText)).toBe(5);
  });

});

test.describe('Luhn Algorithm (unit via page.evaluate)', () => {

  test.beforeEach(async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', r =>
      r.fulfill({ status: 200, contentType: 'text/css', body: '' })
    );
    await page.route('https://cdnjs.cloudflare.com/**', r =>
      r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.JSZip=function(){};JSZip.prototype.file=function(){return this};JSZip.prototype.generateAsync=async function(){return new Blob([])};' })
    );
    await page.goto(SNAP_URL);
    await waitForSnapReady(page);
  });

  test('Luhn algorithm correctly validates known good PINs', async ({ page }) => {
    const results = await page.evaluate(() => {
      // Access PaymentSystem from global scope
      const ps = window.PaymentSystem;
      if (!ps) return null;
      const testPins = window.TEST_PINS;
      const allValid = Object.values(testPins).flat().every(pin => {
        const digits = pin.replace(/\D/g, '');
        return ps.luhnValid(digits);
      });
      return allValid;
    });
    expect(results).toBe(true);
  });

  test('Luhn algorithm rejects invalid checksum', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ps = window.PaymentSystem;
      if (!ps) return null;
      return ps.luhnValid('1234567890'); // checksum fails
    });
    // 1234567890 — last digit 0, sum should fail
    expect(result).toBe(false);
  });

});
