// Index page (tab switching, iframes, transfer indicator) tests
const { test, expect } = require('@playwright/test');
const { isTouch, interact } = require('./helpers');

test.describe('Index Page & Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
  });

  // ─── Page Load ───

  test('index page loads with both tabs', async ({ page }) => {
    await expect(page.locator('.tab[data-target="snap-station"]')).toBeVisible();
    await expect(page.locator('.tab[data-target="sticker-sheet"]')).toBeVisible();
  });

  test('both iframes are present', async ({ page }) => {
    await expect(page.locator('#snap-station')).toBeAttached();
    await expect(page.locator('#sticker-sheet')).toBeAttached();
  });

  test('snap station tab is active by default', async ({ page }) => {
    await expect(page.locator('.tab[data-target="snap-station"]')).toHaveClass(/active/);
    await expect(page.locator('#snap-station')).toHaveClass(/active/);
  });

  test('layout fills viewport without overflow', async ({ page }) => {
    const noOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );
    expect(noOverflow).toBe(true);
  });

  // ─── Tab Switching ───

  test('clicking sticker sheet tab switches iframe', async ({ page }, testInfo) => {
    // Use evaluate to trigger click directly via JS (bypass Playwright click interception)
    await page.evaluate(() => {
      document.querySelector('.tab[data-target="sticker-sheet"]').click();
    });
    await page.waitForTimeout(500);

    await expect(page.locator('.tab[data-target="sticker-sheet"]')).toHaveClass(/active/, { timeout: 5000 });
    await expect(page.locator('#sticker-sheet')).toHaveClass(/active/);
    await expect(page.locator('.tab[data-target="snap-station"]')).not.toHaveClass(/active/);
    await expect(page.locator('#snap-station')).not.toHaveClass(/active/);
  });

  test('switching back to snap station tab works', async ({ page }, testInfo) => {
    // Switch to sticker sheet
    await page.evaluate(() => document.querySelector('.tab[data-target="sticker-sheet"]').click());
    await page.waitForTimeout(300);
    await expect(page.locator('.tab[data-target="sticker-sheet"]')).toHaveClass(/active/);

    // Switch back
    await page.evaluate(() => document.querySelector('.tab[data-target="snap-station"]').click());
    await page.waitForTimeout(300);

    await expect(page.locator('.tab[data-target="snap-station"]')).toHaveClass(/active/);
    await expect(page.locator('#snap-station')).toHaveClass(/active/);
  });

  test('rapid tab switching does not break state', async ({ page }, testInfo) => {
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => document.querySelector('.tab[data-target="sticker-sheet"]').click());
      await page.waitForTimeout(100);
      await page.evaluate(() => document.querySelector('.tab[data-target="snap-station"]').click());
      await page.waitForTimeout(100);
    }

    // Should be on snap station after even number of switches back
    await expect(page.locator('.tab[data-target="snap-station"]')).toHaveClass(/active/);
  });

  // ─── Transfer Indicator ───

  test('transfer indicator shows when snaps are queued', async ({ page }) => {
    // Seed localStorage
    await page.evaluate(() => {
      localStorage.setItem('snapstation-export', JSON.stringify({
        timestamp: Date.now(),
        images: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==']
      }));
    });

    // Trigger update
    await page.evaluate(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'snapstation-export' }));
    });
    await page.waitForTimeout(300);

    const text = await page.locator('#transferText').textContent();
    expect(text).toContain('1 snap ready to import');
  });

  test('transfer indicator shows no snaps message when empty', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('snapstation-export'));
    await page.evaluate(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'snapstation-export' }));
    });
    await page.waitForTimeout(300);

    const text = await page.locator('#transferText').textContent();
    expect(text).toContain('No snaps queued');
  });

  test('transfer indicator updates count correctly', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('snapstation-export', JSON.stringify({
        timestamp: Date.now(),
        images: [
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='
        ]
      }));
    });
    await page.evaluate(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'snapstation-export' }));
    });
    await page.waitForTimeout(300);

    const text = await page.locator('#transferText').textContent();
    expect(text).toContain('3 snaps ready to import');
  });

  // ─── Tab Touch Targets ───

  test('tabs have appropriate touch-action', async ({ page }) => {
    const ta = await page.evaluate(() => {
      const tab = document.querySelector('.tab');
      return tab ? getComputedStyle(tab).touchAction : null;
    });
    expect(ta).toBe('manipulation');
  });

  test('tabs are large enough for touch on mobile', async ({ page }, testInfo) => {
    if (!isTouch(testInfo.project.name)) {
      test.skip();
      return;
    }

    const tabs = page.locator('.tab');
    const count = await tabs.count();
    for (let i = 0; i < count; i++) {
      const box = await tabs.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(36);
      }
    }
  });

  // ─── Iframe Responsive ───

  test('snap station iframe loads and is visible', async ({ page }) => {
    const frame = page.frameLocator('#snap-station');
    await expect(frame.locator('#mainApp')).toBeVisible({ timeout: 5000 });
  });

  test('sticker sheet iframe becomes active when tab switched', async ({ page }, testInfo) => {
    await page.evaluate(() => {
      document.querySelector('.tab[data-target="sticker-sheet"]').click();
    });
    await page.waitForTimeout(500);

    // The sticker-sheet iframe should be the active frame
    await expect(page.locator('#sticker-sheet')).toHaveClass(/active/, { timeout: 5000 });

    // Verify the iframe src is correct
    const src = await page.locator('#sticker-sheet').getAttribute('src');
    expect(src).toBe('sticker-sheet.html');

    // Snap station iframe should no longer be active
    await expect(page.locator('#snap-station')).not.toHaveClass(/active/);
  });

  // ─── Focus Outline ───

  test('tabs have no outline after click/tap', async ({ page }, testInfo) => {
    await interact(page, '.tab[data-target="sticker-sheet"]', testInfo.project.name);

    const outline = await page.locator('.tab[data-target="sticker-sheet"]').evaluate(el => {
      return getComputedStyle(el).outline;
    });
    expect(outline).toMatch(/none|0px/);
  });
});
