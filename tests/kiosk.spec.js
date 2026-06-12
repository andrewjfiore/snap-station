// Kiosk app end-to-end against the design-system UI:
// attract → 5-step wizard (layout → photos → decorate → pay → print),
// payment/credits, attendant mode, error tiers, classic interop, sk_* migration.
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

// Take one photo through the live capture view (fake camera in CI; the demo
// scenes are the no-camera fallback). The shutter runs a 3-beat countdown.
async function snapPhoto(page) {
  await expect(page.locator('.capture-live')).toBeVisible();
  const before = await page.evaluate(() => (JSON.parse(localStorage.getItem('ss.v1.gallery') || '[]')).length);
  await page.locator('.shutter').click();
  await page.waitForFunction(
    (n) => (JSON.parse(localStorage.getItem('ss.v1.gallery') || '[]')).length > n,
    before, { timeout: 15000 }
  );
}

test.describe('Kiosk', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  test('boots to attract with no page errors and zero stored screen state', async ({ page }) => {
    const errors = await bootKiosk(page);
    await expect(page.locator('.attract-start')).toBeVisible();
    await expect(page.locator('.attract-title')).toHaveText('Pokémon');
    expect(errors).toEqual([]);
    // kiosk always boots to attract — current screen is deliberately not persisted
    expect(await page.evaluate(() => localStorage.getItem('sk_screen'))).toBeNull();
  });

  test('full flow: layout → photos → decorate → pay with credits → print with real exports', async ({ page }) => {
    test.slow(); // 5 wizard steps + capture countdown + print cycle outgrow the default budget on mobile profiles
    // Seed 5 credits so the "Use Credit" payment method is offered.
    await page.addInitScript(() => localStorage.setItem('ss.v1.credits', '5'));
    await bootKiosk(page);

    // attract → step 1 (Choose Layout): "4 Photos" is the recommended default
    await page.locator('.attract-start').click();
    await expect(page.locator('[data-screen="step1"]')).toBeVisible();
    await expect(page.locator('.layout-card.is-selected')).toContainText('4 Photos');
    await page.locator('#wiz-next').click();

    // step 2 (Add Photos): tap a slot → live capture → shutter
    await expect(page.locator('[data-screen="step2"]')).toBeVisible();
    await page.locator('.ap-slot').first().click();
    await snapPhoto(page);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ss.v1.gallery')));
    expect(stored[0].dataUrl).toMatch(/^data:image\/jpeg/);

    await page.locator('.capture-live button', { hasText: 'Back to photos' }).click();
    await expect(page.locator('.ap-slot.is-filled')).toHaveCount(1);
    await expect(page.locator('.ap-progress__count')).toHaveText('1 / 4');

    // step 3 (Decorate): empty slots auto-fill; drop a sticker on the sheet
    await page.locator('#wiz-next').click();
    await expect(page.locator('[data-screen="step3"]')).toBeVisible();
    await page.locator('.dc-sticker-btn').first().click();
    await expect(page.locator('.sk-stamp')).toHaveCount(1);

    // step 4 (Review & Pay): credits path — 1 sheet costs 1 credit
    await page.locator('#wiz-next').click();
    await expect(page.locator('[data-screen="step4"]')).toBeVisible();
    await page.locator('.stack-choice', { hasText: 'Use Credit' }).click();
    await page.locator('.step-card button', { hasText: 'Continue' }).click();
    await page.locator('.step-card button', { hasText: 'Continue' }).click();
    await page.locator('.step-card button', { hasText: 'Use 1 Credit' }).click();
    await expect(page.locator('.proc-state')).toBeVisible();
    await expect(page.locator('.celebrate__msg')).toHaveText('Payment approved!', { timeout: 10000 });

    // step 5 (Print): printing cycle → post-print, credits spent 5 → 4
    await expect(page.locator('[data-screen="step5"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.pp-hero__title')).toHaveText('All set!', { timeout: 15000 });
    expect(await page.evaluate(() => window.SnapStore.getCredits())).toBe(4);

    // real export actions in the "Take it home" group
    const cricutDownload = page.waitForEvent('download');
    await page.locator('.pp-takehome__actions button', { hasText: 'Cricut SVG' }).click();
    expect((await cricutDownload).suggestedFilename()).toMatch(/print-then-cut.*\.svg$/);

    const cutDownload = page.waitForEvent('download');
    await page.locator('.pp-takehome__actions button', { hasText: 'Cut template (SVG)' }).click();
    expect((await cutDownload).suggestedFilename()).toMatch(/cut-only.*\.svg$/);

    // stats: session bumped on leaving attract, print bumped per paid sheet
    const att = await page.evaluate(() => JSON.parse(localStorage.getItem('ss.v1.attendant')));
    expect(att.stats.sessions).toBeGreaterThan(0);
    expect(att.stats.prints).toBeGreaterThan(0);
  });

  test('keyboard shortcuts jump wizard steps and Escape returns to attract', async ({ page }) => {
    await bootKiosk(page);
    for (const key of ['1', '2', '3', '4']) {
      await page.keyboard.press(key);
      await expect(page.locator(`[data-screen="step${key}"]`)).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-screen="attract"]')).toBeVisible();
  });

  test('idle timeout returns to attract', async ({ page }) => {
    await bootKiosk(page, { idleMs: 1500 });
    await page.locator('.attract-start').click();
    await expect(page.locator('[data-screen="step1"]')).toBeVisible();
    await expect(page.locator('[data-screen="attract"]')).toBeVisible({ timeout: 8000 });
  });

  test('attendant: hold station label + PIN gates the panel; grants and free play work', async ({ page }) => {
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

    // default PIN 0000 opens the panel
    for (let i = 0; i < 4; i++) await pinPad.locator('button', { hasText: /^0$/ }).click();
    const drawer = page.locator('.attendant-drawer');
    await expect(drawer).toBeVisible();

    await drawer.locator('button', { hasText: '+5 Credits' }).click();
    expect(await page.evaluate(() => window.SnapStore.getCredits())).toBe(5);
    await expect(drawer.locator('.stat-card', { hasText: 'CREDITS' })).toContainText('5');

    // free play: spending never decrements
    await drawer.locator('#att-freeplay').check();
    const spend = await page.evaluate(() => window.SnapPayment.spendCredit());
    expect(spend).toMatchObject({ ok: true, freePlay: true });
    expect(await page.evaluate(() => window.SnapStore.getCredits())).toBe(5);
  });

  test('settings hold in the wizard footer is attendant-gated', async ({ page }) => {
    await bootKiosk(page);
    await page.keyboard.press('1');
    const settings = page.locator('.wiz-settings');
    await expect(settings).toBeVisible();
    // a tap is not enough
    await settings.click();
    await expect(page.locator('.pin-pad')).not.toBeVisible();
    // a 3 s hold is
    const box = await settings.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(3400);
    await page.mouse.up();
    await expect(page.locator('.pin-pad')).toBeVisible();
  });

  test('payment failure shows the Tier-2 banner with Try Again', async ({ page }) => {
    await bootKiosk(page);
    await page.keyboard.press('4');
    await expect(page.locator('[data-screen="step4"]')).toBeVisible();
    await page.locator('.stack-choice', { hasText: 'Card' }).click();
    await page.locator('.step-card button', { hasText: 'Continue' }).click();
    await page.locator('.step-card button', { hasText: 'Continue' }).click();
    // the declining demo card
    const num = page.locator('input[aria-label="Card number"]');
    await num.fill('4000 0000 0000 9995');
    await page.locator('.step-card button', { hasText: 'Pay $' }).click();
    const banner = page.locator('.err-banner-demo');
    await expect(banner).toBeVisible({ timeout: 10000 });
    await expect(banner).toContainText("Let's try that again.");
    await expect(banner.locator('button', { hasText: 'Try Again' })).toBeVisible();
    // fix the card and pay for real (simulated — grants nothing persistent)
    await num.fill('4242 4242 4242 4242');
    await page.locator('.step-card button', { hasText: 'Pay $' }).click();
    await expect(page.locator('.celebrate__msg')).toHaveText('Payment approved!', { timeout: 10000 });
    expect(await page.evaluate(() => window.SnapStore.getCredits())).toBe(0);
  });

  test('render failure raises the Tier-3 full-screen error', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ss.v1.attendant', JSON.stringify({ freePlay: true }));
      localStorage.setItem('ss.v1.sheet', JSON.stringify({
        layoutId: 'single', paperId: '4x6',
        sourceMap: { 0: 'data:image/png;base64,not-an-image' },
        stamps: [], copies: 1,
      }));
    });
    await bootKiosk(page);
    await page.keyboard.press('4');
    // free play hides payment entirely
    await expect(page.locator('.pay-freeplay')).toBeVisible();
    await page.locator('button', { hasText: "Let's print." }).click();
    await expect(page.locator('.pp-hero__title')).toHaveText('All set!', { timeout: 15000 });
    await page.locator('.pp-takehome__actions button', { hasText: 'PNG' }).click();
    const tier3 = page.locator('.tier3-overlay');
    await expect(tier3).toBeVisible({ timeout: 10000 });
    await expect(tier3).toContainText("Let's try that again.");
    await expect(tier3.locator('button', { hasText: 'Call Staff' })).toBeVisible();
    await tier3.locator('button', { hasText: 'Call Staff' }).click();
    await expect(tier3).not.toBeVisible();
  });

  test('reduced motion stills the attract pulse and pill animations', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.clear());
    await page.goto(baseURL + KIOSK);
    await page.waitForSelector('[data-screen="attract"]', { timeout: 20000 });
    const anim = await page.evaluate(() => ({
      pulse: getComputedStyle(document.querySelector('.attract-pb-pulse'), '::before').animationName,
      cta: getComputedStyle(document.querySelector('.attract-start')).animationName,
    }));
    expect(anim.pulse).toBe('none');
    expect(anim.cta).toBe('none');
    await ctx.close();
  });

  test('classic interop: snapstation-export payload imports from Add Photos', async ({ page }) => {
    const px = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    await page.addInitScript((img) => {
      localStorage.clear();
      localStorage.setItem('snapstation-export', JSON.stringify({ timestamp: Date.now(), images: [img, img] }));
    }, px);
    await page.goto(KIOSK);
    await page.waitForSelector('[data-screen="attract"]', { timeout: 20000 });
    await page.keyboard.press('2'); // Add Photos
    const banner = page.locator('.classic-import');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('2 photos');
    await banner.locator('button', { hasText: 'Import from Classic' }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('ss.v1.gallery') || '[]').length === 2);
    expect(await page.evaluate(() => localStorage.getItem('snapstation-export'))).toBeNull();
    // imported photos surface in the gallery picker
    await expect(page.locator('.ap-gallery__thumb')).toHaveCount(2);
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
    expect(state.theme).toBe('snap'); // v4: legacy theme names normalize to the default dot theme
    expect(state.crt).toBe(0.4);
    expect(state.skTweaks).toBeNull();
    expect(state.skScreen).toBeNull();
    expect(state.schema).toBe(1);
  });

  // ===== Design system v4 =====

  test('v4: token code redeems once from the attract Have-a-token entry', async ({ page }) => {
    await bootKiosk(page);
    await page.locator('.attract-entry', { hasText: 'Have a token' }).click();
    const overlay = page.locator('.addcredits.is-open');
    await expect(overlay).toBeVisible();
    await overlay.locator('.ac-input--code').fill('SNAP05');
    await overlay.locator('.ac-cta', { hasText: 'Redeem' }).click();
    await page.waitForFunction(() => window.SnapStore.getCredits() === 5);
    // overlay settles itself closed after a successful redeem with no pending need
    await expect(overlay).not.toBeVisible();
    // one-time use
    await page.locator('.attract-entry', { hasText: 'Have a token' }).click();
    await overlay.locator('.ac-input--code').fill('SNAP05');
    await overlay.locator('.ac-cta', { hasText: 'Redeem' }).click();
    await expect(overlay.locator('.ac-feedback')).toContainText('already been used');
    expect(await page.evaluate(() => window.SnapStore.getCredits())).toBe(5);
  });

  test('v4: a jam never charges — refund on fault, commit on retry success', async ({ page }) => {
    test.slow();
    await page.addInitScript(() => {
      localStorage.setItem('ss.v1.credits', '3');
      window.__DYESUB_PASS_MS__ = 150;
      window.__SIMULATE_JAM__ = true;
    });
    await bootKiosk(page);
    await page.keyboard.press('4');
    await page.locator('.stack-choice', { hasText: 'Use Credit' }).click();
    await page.locator('.step-card button', { hasText: 'Continue' }).click();
    await page.locator('.step-card button', { hasText: 'Continue' }).click();
    await page.locator('.step-card button', { hasText: 'Use 1 Credit' }).click();
    await expect(page.locator('[data-screen="step5"]')).toBeVisible({ timeout: 15000 });

    const fault = page.locator('.dyesub__fault.is-open');
    await expect(fault).toBeVisible({ timeout: 15000 });
    await expect(fault).toContainText('Your credit was not spent');
    expect(await page.evaluate(() => window.SnapStore.getCredits())).toBe(3);
    expect(await page.evaluate(() => window.SnapPayment.reservedCredits())).toBe(0);
    expect(await page.evaluate(() => window.SnapStore.getSupplies().paper)).toBe(50);

    await page.evaluate(() => { window.__SIMULATE_JAM__ = false; });
    await fault.locator('button', { hasText: 'Try again' }).click();
    await expect(page.locator('.pp-hero__title')).toHaveText('All set!', { timeout: 15000 });
    expect(await page.evaluate(() => window.SnapStore.getCredits())).toBe(2);
    expect(await page.evaluate(() => window.SnapStore.getSupplies().paper)).toBe(49);
  });

  test('v4: empty supplies block payment until the attendant reloads', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ss.v1.credits', '5');
      localStorage.setItem('ss.v1.supplies', JSON.stringify({ paper: 0, ribbon: 50 }));
    });
    await bootKiosk(page);
    await page.keyboard.press('4');
    await page.locator('.stack-choice', { hasText: 'Use Credit' }).click();
    await page.locator('.step-card button', { hasText: 'Continue' }).click();
    await page.locator('.step-card button', { hasText: 'Continue' }).click();
    await page.locator('.step-card button', { hasText: 'Use 1 Credit' }).click();
    await expect(page.locator('.err-banner, .pay-banner, [role="alert"]').first()).toContainText('out of supplies', { timeout: 5000 });
    expect(await page.evaluate(() => window.SnapStore.getCredits())).toBe(5);
  });

  test('v4: theme dots restyle the station and persist', async ({ page }) => {
    await bootKiosk(page);
    await page.locator('.attract-theme-dot[aria-label="Ocean blue"]').click();
    expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--snap-red'))).toBe('#1F6FEB');
    // persisted (the beforeEach clear-script re-runs on reload, so assert storage directly)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ss.v1.settings')).theme)).toBe('ocean');
  });

  test('v4: the Game Pak insert ritual starts a session', async ({ page }) => {
    await bootKiosk(page);
    await page.locator('.cart-insert').click();
    await expect(page.locator('.cart-insert')).toHaveClass(/is-inserting|is-inserted/);
    await expect(page.locator('[data-screen="step1"]')).toBeVisible({ timeout: 5000 });
  });

  test('v4: 1 Big Photo layout — one slot, one cell, one kiss-cut in the export', async ({ page }) => {
    test.slow();
    await bootKiosk(page);
    await page.locator('.attract-start').click();
    await page.locator('.layout-card[data-layout="1x1"]').click();
    await page.locator('#wiz-next').click();
    await expect(page.locator('.ap-slot')).toHaveCount(1);
    await page.locator('.ap-slot').first().click();
    await snapPhoto(page);
    await page.locator('.capture-live button', { hasText: 'Back to photos' }).click();
    await page.locator('#wiz-next').click();
    await expect(page.locator('.sk-cell')).toHaveCount(1);
    const cutPaths = await page.evaluate(() => {
      const svg = window.StickerExport.buildCutSvg({ paperId: '4x6', layoutId: 'big' });
      return (svg.match(/Z/g) || []).length;
    });
    expect(cutPaths).toBe(1);
  });

  test('v4: Record GIF saves an animated gif to the gallery', async ({ page }) => {
    test.slow();
    await bootKiosk(page);
    await page.keyboard.press('2');
    await page.locator('.ap-slot').first().click();
    await expect(page.locator('.capture-live')).toBeVisible();
    await page.locator('button', { hasText: 'Record GIF' }).click();
    await page.waitForFunction(() => {
      const g = JSON.parse(localStorage.getItem('ss.v1.gallery') || '[]');
      return g.some((e) => e.kind === 'gif' && e.dataUrl.startsWith('data:image/gif'));
    }, null, { timeout: 30000 });
  });

  test('v4: attendant supplies meters and Snap Pass codes', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ss.v1.supplies', JSON.stringify({ paper: 3, ribbon: 50 }));
    });
    await bootKiosk(page);
    // open attendant via the explicit footer button + PIN 0000
    await page.locator('.attract-attendant').click();
    const pinPad = page.locator('.pin-pad');
    for (let i = 0; i < 4; i++) await pinPad.locator('button', { hasText: /^0$/ }).click();
    const drawer = page.locator('.attendant-drawer');
    await expect(drawer).toBeVisible();

    const suppliesSection = drawer.locator('[data-testid="att-supplies"]');
    await expect(suppliesSection).toContainText('3 / 50');
    await suppliesSection.locator('button', { hasText: 'Reload paper' }).click();
    await expect(suppliesSection).toContainText('50 / 50');

    const tokensSection = drawer.locator('[data-testid="att-tokens"]');
    await expect(tokensSection).toContainText('SNAP05');
    await tokensSection.locator('input[type="text"]').fill('TESTME99');
    await tokensSection.locator('button', { hasText: 'Add code' }).click();
    await expect(tokensSection).toContainText('TESTME99');
    expect(await page.evaluate(() => window.SnapStore.getTokens().codes.TESTME99)).toBe(3);
  });
});
