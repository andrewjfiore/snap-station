// Kiosk app end-to-end: attract → capture → gallery → editor → checkout → print,
// payment/credits, attendant mode, classic interop, and sk_* migration.
const { test, expect } = require('@playwright/test');

const KIOSK = '/index.html';

async function bootKiosk(page, { idleMs } = {}) {
  if (idleMs) await page.addInitScript((ms) => { window.__IDLE_MS__ = ms; }, idleMs);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(KIOSK);
  await page.waitForSelector('[data-screen="attract"]', { timeout: 20000 });
  return errors;
}

// SNAP runs a 3-second on-screen countdown before the shutter fires.
async function snapDemoPhoto(page) {
  await page.locator('.source-picker button', { hasText: 'Demo' }).click();
  await page.locator('.cap-shutter').click();
  await page.waitForFunction(
    () => (JSON.parse(localStorage.getItem('ss.v1.gallery') || '[]')).length > 0,
    null, { timeout: 15000 }
  );
}

test.describe('Kiosk', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  test('boots to attract with no page errors and zero stored screen state', async ({ page }) => {
    const errors = await bootKiosk(page);
    await expect(page.locator('.press-start')).toBeVisible();
    expect(errors).toEqual([]);
    // kiosk always boots to attract — current screen is deliberately not persisted
    expect(await page.evaluate(() => localStorage.getItem('sk_screen'))).toBeNull();
  });

  test('full flow: capture → gallery → designer → checkout → print with real exports', async ({ page }) => {
    await bootKiosk(page);
    await page.locator('.press-start').click();
    await expect(page.locator('[data-screen="capture"]')).toBeVisible();

    await snapDemoPhoto(page);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ss.v1.gallery')));
    expect(stored[0].dataUrl).toMatch(/^data:image\/jpeg/);

    // gallery: snap appears and flows to the designer
    await page.keyboard.press('2');
    await expect(page.locator('[data-screen="gallery"]')).toBeVisible();
    const snapTiles = page.locator('.gallery-grid .snap');
    expect(await snapTiles.count()).toBeGreaterThan(0);
    await snapTiles.last().click(); // the real (non-demo) snap renders after demos
    await page.locator('button', { hasText: 'Send to Designer' }).click();
    await expect(page.locator('[data-screen="editor"]')).toBeVisible();

    // checkout: no credits yet → buy a Snap Card (mock $3) → 5 credits → spend 1
    await page.keyboard.press('4');
    await expect(page.locator('[data-screen="checkout"]')).toBeVisible();
    await page.locator('[data-screen="checkout"] button', { hasText: 'Buy Snap Card' }).first().click();
    await expect(page.locator('.led', { hasText: 'CR 005' })).toBeVisible({ timeout: 10000 });
    await page.locator('button', { hasText: 'Use Credit' }).click();
    await expect(page.locator('[data-screen="print"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.led', { hasText: 'CR 004' })).toBeVisible();

    // print screen: wait out the print cycle, then real download actions
    await expect(page.getByText('Your sheet is ready!')).toBeVisible({ timeout: 20000 });
    const cricutDownload = page.waitForEvent('download');
    await page.locator('.share-btn', { hasText: 'Cricut SVG' }).click();
    const dl = await cricutDownload;
    expect(dl.suggestedFilename()).toMatch(/\.svg$/);

    const cutDownload = page.waitForEvent('download');
    await page.locator('.share-btn', { hasText: 'Cut-only SVG' }).click();
    expect((await cutDownload).suggestedFilename()).toMatch(/\.svg$/);

    // session stat incremented when the kiosk left attract (prints only
    // increment on a real Print action, not on SVG/PNG downloads)
    const att = await page.evaluate(() => JSON.parse(localStorage.getItem('ss.v1.attendant')));
    expect(att.stats.sessions).toBeGreaterThan(0);
  });

  test('keyboard shortcuts navigate screens', async ({ page }) => {
    await bootKiosk(page);
    for (const [key, screen] of [['1', 'capture'], ['2', 'gallery'], ['3', 'editor'], ['4', 'checkout']]) {
      await page.keyboard.press(key);
      await expect(page.locator(`[data-screen="${screen}"]`)).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-screen="attract"]')).toBeVisible();
  });

  test('idle timeout returns to attract', async ({ page }) => {
    await bootKiosk(page, { idleMs: 1500 });
    await page.locator('.press-start').click();
    await expect(page.locator('[data-screen="capture"]')).toBeVisible();
    await expect(page.locator('[data-screen="attract"]')).toBeVisible({ timeout: 8000 });
  });

  test('attendant: hold badge + PIN gates the drawer; grants and free play work', async ({ page }) => {
    await bootKiosk(page);
    const badge = page.locator('.station-badge');
    await badge.scrollIntoViewIfNeeded();
    const box = await badge.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(3400); // holdMs = 3000
    await page.mouse.up();

    const pinPad = page.locator('.pin-pad');
    await expect(pinPad).toBeVisible();

    // wrong PIN rejected
    for (const d of ['1', '2', '3', '4']) await pinPad.locator('button', { hasText: new RegExp(`^${d}$`) }).click();
    await expect(page.locator('.attendant-drawer')).not.toBeVisible();

    // default PIN 0000 opens the drawer
    for (let i = 0; i < 4; i++) await pinPad.locator('button', { hasText: /^0$/ }).click();
    const drawer = page.locator('.attendant-drawer');
    await expect(drawer).toBeVisible();

    await drawer.locator('button', { hasText: '+5 Credits' }).click();
    await expect(page.locator('.led', { hasText: 'CR 005' })).toBeVisible();

    // free play: spending never decrements
    await drawer.locator('#att-freeplay').check();
    const spend = await page.evaluate(() => window.SnapPayment.spendCredit());
    expect(spend).toMatchObject({ ok: true, freePlay: true });
    expect(await page.evaluate(() => window.SnapStore.getCredits())).toBe(5);
  });

  test('reduced motion disables the shelves parallax', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.clear());
    await page.goto(baseURL + KIOSK);
    await page.waitForSelector('[data-screen="attract"]', { timeout: 20000 });
    await expect(page.locator('.scene-decor.shelves-3d')).toBeVisible();
    await page.mouse.move(100, 100);
    await page.mouse.move(600, 400);
    await page.waitForTimeout(300);
    const tilt = await page.locator('.scene-decor.shelves-3d').evaluate(el => el.style.getPropertyValue('--bb-tilt-x'));
    expect(tilt).toBe(''); // parallax handler never attached under reduced motion
    await ctx.close();
  });

  test('classic interop: snapstation-export payload imports into the gallery', async ({ page }) => {
    const px = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    await page.addInitScript((img) => {
      localStorage.clear();
      localStorage.setItem('snapstation-export', JSON.stringify({ timestamp: Date.now(), images: [img, img] }));
    }, px);
    await page.goto(KIOSK);
    await page.waitForSelector('[data-screen="attract"]', { timeout: 20000 });
    await page.keyboard.press('2'); // gallery
    const banner = page.locator('.classic-import');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('2 PHOTOS FROM CLASSIC');
    await banner.locator('button', { hasText: 'Import from Classic' }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('ss.v1.gallery') || '[]').length === 2);
    expect(await page.evaluate(() => localStorage.getItem('snapstation-export'))).toBeNull();
  });

  test('sk_* keys migrate to ss.v1.* once', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('sk_credits', '7');
      localStorage.setItem('sk_tweaks', JSON.stringify({ theme: 'cinnabar', crtIntensity: 0.4 }));
      localStorage.setItem('sk_screen', '"editor"');
    });
    await page.goto(KIOSK);
    await page.waitForSelector('[data-screen="attract"]');
    const state = await page.evaluate(() => ({
      credits: window.SnapStore.getCredits(),
      theme: window.SnapStore.getSettings().theme,
      crt: window.SnapStore.getSettings().crtIntensity,
      skTweaks: localStorage.getItem('sk_tweaks'),
      skScreen: localStorage.getItem('sk_screen'),
      schema: JSON.parse(localStorage.getItem('ss.v1.schema')),
    }));
    expect(state.credits).toBe(7);
    expect(state.theme).toBe('cinnabar');
    expect(state.crt).toBe(0.4);
    expect(state.skTweaks).toBeNull();
    expect(state.skScreen).toBeNull();
    expect(state.schema).toBe(1);
  });
});
