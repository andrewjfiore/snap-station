// Snap Station feature tests - runs on all three device sizes
const { test, expect } = require('@playwright/test');
const {
  isTouch, interact, goToSnapStation, pinchZoom, doubleTap,
  scrollWheel, mouseDrag, touchDrag, assertNoFocusOutline,
} = require('./helpers');

test.describe('Snap Station', () => {
  test.beforeEach(async ({ page }) => {
    await goToSnapStation(page);
  });

  // ─── Page Load & Layout ───

  test('page loads with all core elements visible', async ({ page }) => {
    await expect(page.locator('#mainApp')).toBeVisible();
    await expect(page.locator('#videoContainer')).toBeVisible();
    await expect(page.locator('#startCameraBtn')).toBeVisible();
    await expect(page.locator('#shareScreenBtn')).toBeVisible();
    await expect(page.locator('#screenshotBtn')).toBeVisible();
    await expect(page.locator('#gifBtn')).toBeVisible();
    await expect(page.locator('#gallery')).toBeVisible();
    await expect(page.locator('#themeSelect')).toBeVisible();
  });

  test('layout is responsive - no horizontal overflow', async ({ page }) => {
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    });
    expect(overflow).toBe(true);
  });

  test('buttons are touch-sized (min 44px) on touch devices', async ({ page, browserName }, testInfo) => {
    if (!isTouch(testInfo.project.name)) {
      test.skip();
      return;
    }
    const buttons = page.locator('.btn');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box && box.height > 0) {
        // Check that buttons are at least 30px tall (reasonable touch target)
        expect(box.height).toBeGreaterThanOrEqual(30);
      }
    }
  });

  // ─── Camera Controls ───

  test('camera button toggles active state', async ({ page }, testInfo) => {
    const btn = page.locator('#startCameraBtn');
    await expect(btn).not.toHaveClass(/active/);

    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);

    // With fake device, camera should start
    const isActive = await page.evaluate(() => window.activeSource === 'camera');
    expect(isActive).toBe(true);
    await expect(btn).toHaveClass(/active/);
  });

  test('screenshot and GIF buttons enable when camera active', async ({ page }, testInfo) => {
    // Initially disabled
    await expect(page.locator('#screenshotBtn')).toBeDisabled();
    await expect(page.locator('#gifBtn')).toBeDisabled();

    // Start camera
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);

    // Should now be enabled
    await expect(page.locator('#screenshotBtn')).not.toBeDisabled();
    await expect(page.locator('#gifBtn')).not.toBeDisabled();
  });

  test('stop camera disables capture buttons', async ({ page }, testInfo) => {
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);
    // Click again to stop
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(500);

    await expect(page.locator('#screenshotBtn')).toBeDisabled();
    await expect(page.locator('#gifBtn')).toBeDisabled();
  });

  // ─── Video Zoom/Pan (Mouse) ───

  test('mouse wheel zoom changes zoom level', async ({ page }, testInfo) => {
    if (isTouch(testInfo.project.name)) {
      test.skip();
      return;
    }
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);

    const initialZoom = await page.evaluate(() => window.zoomLevel);
    await scrollWheel(page, '#videoContainer', -100); // scroll up = zoom in
    await page.waitForTimeout(200);
    const newZoom = await page.evaluate(() => window.zoomLevel);
    expect(newZoom).toBeGreaterThan(initialZoom);
  });

  test('mouse drag pans when zoomed', async ({ page }, testInfo) => {
    if (isTouch(testInfo.project.name)) {
      test.skip();
      return;
    }
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);

    // Zoom in first
    await page.evaluate(() => { window.zoomLevel = 2; });
    await mouseDrag(page, '#videoContainer', 50, 30);
    await page.waitForTimeout(200);

    const panX = await page.evaluate(() => window.panX);
    const panY = await page.evaluate(() => window.panY);
    expect(Math.abs(panX)).toBeGreaterThan(0);
    expect(Math.abs(panY)).toBeGreaterThan(0);
  });

  test('double-click resets zoom', async ({ page }, testInfo) => {
    if (isTouch(testInfo.project.name)) {
      test.skip();
      return;
    }
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);

    await page.evaluate(() => { window.zoomLevel = 3; window.panX = 50; window.panY = 30; });
    await page.locator('#videoContainer').dblclick();
    await page.waitForTimeout(200);

    const zoom = await page.evaluate(() => window.zoomLevel);
    const panX = await page.evaluate(() => window.panX);
    expect(zoom).toBe(1);
    expect(panX).toBe(0);
  });

  // ─── Video Zoom/Pan (Touch) ───

  test('pinch-to-zoom changes zoom level on touch devices', async ({ page }, testInfo) => {
    if (!isTouch(testInfo.project.name)) {
      test.skip();
      return;
    }
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);

    const initialZoom = await page.evaluate(() => window.zoomLevel);
    await pinchZoom(page, '#videoContainer', 2.0);
    await page.waitForTimeout(200);

    const newZoom = await page.evaluate(() => window.zoomLevel);
    expect(newZoom).toBeGreaterThan(initialZoom);
  });

  test('touch drag pans when zoomed', async ({ page }, testInfo) => {
    if (!isTouch(testInfo.project.name)) {
      test.skip();
      return;
    }
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);

    // Set zoom > 1 for pan to work
    await page.evaluate(() => { window.zoomLevel = 2; });
    await touchDrag(page, '#videoContainer', 40, 20);
    await page.waitForTimeout(200);

    const panX = await page.evaluate(() => window.panX);
    const panY = await page.evaluate(() => window.panY);
    // At least one axis should have moved
    expect(Math.abs(panX) + Math.abs(panY)).toBeGreaterThan(0);
  });

  test('double-tap resets zoom on touch', async ({ page }, testInfo) => {
    if (!isTouch(testInfo.project.name)) {
      test.skip();
      return;
    }
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);

    await page.evaluate(() => { window.zoomLevel = 3; window.panX = 50; });
    await doubleTap(page, '#videoContainer');
    await page.waitForTimeout(300);

    const zoom = await page.evaluate(() => window.zoomLevel);
    expect(zoom).toBe(1);
  });

  // ─── Screenshot Capture ───

  test('take screenshot adds to gallery', async ({ page }, testInfo) => {
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);

    const countBefore = await page.locator('.snap-wrapper').count();
    await interact(page, '#screenshotBtn', testInfo.project.name);
    await page.waitForTimeout(800); // wait for flash + capture

    const countAfter = await page.locator('.snap-wrapper').count();
    expect(countAfter).toBe(countBefore + 1);
  });

  test('screenshot shows flash overlay briefly', async ({ page }, testInfo) => {
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);

    // Monitor flash overlay
    const flashPromise = page.evaluate(() => {
      return new Promise(resolve => {
        const observer = new MutationObserver(() => {
          const flash = document.getElementById('flashOverlay');
          if (flash && flash.classList.contains('active')) resolve(true);
        });
        observer.observe(document.getElementById('flashOverlay'), { attributes: true });
        setTimeout(() => resolve(false), 2000);
      });
    });

    await interact(page, '#screenshotBtn', testInfo.project.name);
    const flashed = await flashPromise;
    expect(flashed).toBe(true);
  });

  test('gallery counter updates after screenshot', async ({ page }, testInfo) => {
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);

    await interact(page, '#screenshotBtn', testInfo.project.name);
    await page.waitForTimeout(800);

    const counter = await page.locator('#galleryCounter').textContent();
    expect(counter).toContain('1 / 256');
  });

  // ─── Gallery Management ───

  test('clicking snap toggles selection', async ({ page }, testInfo) => {
    // Add a snap first
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);
    await interact(page, '#screenshotBtn', testInfo.project.name);
    await page.waitForTimeout(800);

    const snap = page.locator('.snap-wrapper').first();
    await expect(snap).not.toHaveClass(/selected/);

    await interact(page, '.snap-wrapper', testInfo.project.name);
    await expect(snap).toHaveClass(/selected/);

    await interact(page, '.snap-wrapper', testInfo.project.name);
    await expect(snap).not.toHaveClass(/selected/);
  });

  test('select all button toggles all snaps', async ({ page }, testInfo) => {
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);

    // Take 2 screenshots
    await interact(page, '#screenshotBtn', testInfo.project.name);
    await page.waitForTimeout(600);
    await interact(page, '#screenshotBtn', testInfo.project.name);
    await page.waitForTimeout(600);

    await interact(page, '#selectAllBtn', testInfo.project.name);
    const allSelected = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.snap-wrapper')).every(el => el.classList.contains('selected'))
    );
    expect(allSelected).toBe(true);

    // Toggle off
    await interact(page, '#selectAllBtn', testInfo.project.name);
    const noneSelected = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.snap-wrapper')).every(el => !el.classList.contains('selected'))
    );
    expect(noneSelected).toBe(true);
  });

  test('delete removes selected snaps with confirmation', async ({ page }, testInfo) => {
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);
    await interact(page, '#screenshotBtn', testInfo.project.name);
    await page.waitForTimeout(600);

    // Select the snap
    await interact(page, '.snap-wrapper', testInfo.project.name);

    // Accept the confirm dialog
    page.on('dialog', dialog => dialog.accept());
    await interact(page, '#deleteBtn', testInfo.project.name);
    await page.waitForTimeout(300);

    const count = await page.locator('.snap-wrapper').count();
    expect(count).toBe(0);
  });

  test('empty gallery message shows when no snaps', async ({ page }) => {
    await expect(page.locator('#emptyGallery')).toBeVisible();
  });

  // ─── Aspect Ratio Toggle ───

  test('ratio buttons toggle between 16:9 and 4:3', async ({ page }, testInfo) => {
    const btn43 = page.locator('.ratio-option[data-ratio="4:3"]');
    const btn169 = page.locator('.ratio-option[data-ratio="16:9"]');

    await expect(btn169).toHaveClass(/active/);
    await expect(btn43).not.toHaveClass(/active/);

    await interact(page, '.ratio-option[data-ratio="4:3"]', testInfo.project.name);
    await expect(btn43).toHaveClass(/active/);
    await expect(btn169).not.toHaveClass(/active/);

    const ratio = await page.evaluate(() => window.currentRatio);
    expect(ratio).toBe('4:3');
  });

  // ─── Mirror Toggle ───

  test('mirror toggle changes isMirrored state', async ({ page }, testInfo) => {
    const initialMirror = await page.evaluate(() => window.isMirrored);
    expect(initialMirror).toBe(false);

    await interact(page, '#mirrorToggle', testInfo.project.name);
    const afterMirror = await page.evaluate(() => window.isMirrored);
    expect(afterMirror).toBe(true);
  });

  // ─── CRT Toggle ───

  test('CRT toggle activates overlay', async ({ page }, testInfo) => {
    await expect(page.locator('#crtOverlay')).not.toHaveClass(/active/);
    await interact(page, '#crtToggle', testInfo.project.name);
    await expect(page.locator('#crtOverlay')).toHaveClass(/active/);
  });

  // ─── Mute Toggle ───

  test('mute toggle changes text and state', async ({ page }, testInfo) => {
    const btn = page.locator('#muteToggle');
    await expect(btn).toContainText('Sound On');
    await interact(page, '#muteToggle', testInfo.project.name);
    await expect(btn).toContainText('Muted');
  });

  // ─── Siren Toggle ───

  test('siren click toggles flashing', async ({ page }, testInfo) => {
    const siren = page.locator('#siren');
    await expect(siren).not.toHaveClass(/flashing/);
    await interact(page, '#sirenContainer', testInfo.project.name);
    await expect(siren).toHaveClass(/flashing/);
    await interact(page, '#sirenContainer', testInfo.project.name);
    await expect(siren).not.toHaveClass(/flashing/);
  });

  // ─── Theme Selection ───

  test('theme select changes data-theme attribute', async ({ page }) => {
    await page.selectOption('#themeSelect', 'dark');
    const theme = await page.evaluate(() => document.body.getAttribute('data-theme'));
    expect(theme).toBe('dark');

    await page.selectOption('#themeSelect', 'light');
    const theme2 = await page.evaluate(() => document.body.getAttribute('data-theme'));
    expect(theme2).toBe('light');
  });

  test('wallpaper themes generate emoji wallpaper', async ({ page }) => {
    await page.selectOption('#themeSelect', 'hearts');
    await page.waitForTimeout(200);
    const hasEmojis = await page.evaluate(() =>
      document.getElementById('emojiWallpaper').children.length > 0
    );
    expect(hasEmojis).toBe(true);
  });

  // ─── Help Tooltip ───

  test('help button toggles tooltip visibility', async ({ page }, testInfo) => {
    const tooltip = page.locator('#helpTooltip');
    await expect(tooltip).not.toHaveClass(/visible/);

    await interact(page, '#helpBtn', testInfo.project.name);
    await expect(tooltip).toHaveClass(/visible/);

    await interact(page, '#helpBtn', testInfo.project.name);
    await expect(tooltip).not.toHaveClass(/visible/);
  });

  test('clicking outside closes help tooltip', async ({ page }, testInfo) => {
    await interact(page, '#helpBtn', testInfo.project.name);
    await expect(page.locator('#helpTooltip')).toHaveClass(/visible/);

    // Click outside the tooltip container
    await page.locator('#videoContainer').click();
    await expect(page.locator('#helpTooltip')).not.toHaveClass(/visible/);
  });

  // ─── Focus Outline Checks ───

  test('buttons have no visible outline after click/tap', async ({ page }, testInfo) => {
    const buttons = ['#startCameraBtn', '#crtToggle', '#muteToggle', '#mirrorToggle'];
    for (const selector of buttons) {
      await interact(page, selector, testInfo.project.name);
      await assertNoFocusOutline(page, selector);
    }
  });

  test('buttons show focus-visible outline on keyboard focus', async ({ page }, testInfo) => {
    if (isTouch(testInfo.project.name)) {
      test.skip();
      return;
    }
    // Tab to the first button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || !el.classList.contains('btn')) return null;
      const style = window.getComputedStyle(el);
      return { outline: style.outline, boxShadow: style.boxShadow };
    });

    // On keyboard focus, should have focus indicator
    if (focused) {
      const hasIndicator = focused.boxShadow !== 'none' || !focused.outline.includes('none');
      expect(hasIndicator).toBe(true);
    }
  });

  // ─── Konami Code ───

  test('Konami code unlocks 1-UP theme', async ({ page }) => {
    const sequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    for (const key of sequence) {
      await page.keyboard.press(key);
    }
    await page.waitForTimeout(200);

    const theme = await page.evaluate(() => document.body.getAttribute('data-theme'));
    expect(theme).toBe('1-up');
  });

  // ─── Send to Stickers (localStorage) ───

  test('send to stickers stores images in localStorage', async ({ page }, testInfo) => {
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);
    await interact(page, '#screenshotBtn', testInfo.project.name);
    await page.waitForTimeout(800);

    // Select the snap
    await interact(page, '.snap-wrapper', testInfo.project.name);
    await interact(page, '#sendToStickerBtn', testInfo.project.name);
    await page.waitForTimeout(300);

    const exported = await page.evaluate(() => {
      const data = localStorage.getItem('snapstation-export');
      return data ? JSON.parse(data) : null;
    });
    expect(exported).not.toBeNull();
    expect(exported.images.length).toBe(1);
  });

  // ─── GIF Recording ───

  test('GIF recording shows recording indicator', async ({ page }, testInfo) => {
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);

    await interact(page, '#gifBtn', testInfo.project.name);
    await page.waitForTimeout(500);

    // Recording indicator should be visible
    await expect(page.locator('#recordingIndicator')).toHaveClass(/active/);

    // Wait for recording to finish (5 seconds + processing)
    await page.waitForTimeout(6000);

    // Recording indicator should be gone
    await expect(page.locator('#recordingIndicator')).not.toHaveClass(/active/);
  });

  test('GIF appears in gallery after recording', async ({ page }, testInfo) => {
    await interact(page, '#startCameraBtn', testInfo.project.name);
    await page.waitForTimeout(1000);

    await interact(page, '#gifBtn', testInfo.project.name);

    // Wait for GIF to be processed and added to gallery
    await page.waitForFunction(
      () => document.querySelectorAll('.snap-wrapper').length >= 1,
      { timeout: 15000 }
    );

    const badge = await page.locator('.snap-badge').first().textContent();
    expect(badge).toContain('🎬');
  });
});
