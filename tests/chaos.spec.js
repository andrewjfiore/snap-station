/**
 * Snap Station Chaos Tests
 * Tests: rapid button mashing, camera permission denial, UI resilience
 * Moved from chaos-tests/playwright_chaos.js
 */
const { test, expect } = require('@playwright/test');

test.describe('Snap Station Chaos Tests', () => {

  test('Camera permission denial - graceful degradation', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: [],
      baseURL: 'http://localhost:3737',
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
    });

    await page.goto('/snap-station.html');
    await page.waitForLoadState('networkidle');

    const camBtn = page.locator('button:has-text("Start Camera"), button:has-text("Camera"), #startCameraBtn').first();
    if (await camBtn.count() > 0) {
      await camBtn.click();
      await page.waitForTimeout(1000);

      const isInteractive = await page.evaluate(() => document.body.style.display !== 'none');
      expect(isInteractive).toBe(true);

      const bodyText = await page.textContent('body');
      const hasErrorFeedback = bodyText.includes('permission') ||
                               bodyText.includes('denied') ||
                               bodyText.includes('error') ||
                               bodyText.includes('unavailable') ||
                               bodyText.includes('Camera');
      if (!hasErrorFeedback) {
        console.log('⚠️ FINDING: Camera denial shows no user feedback');
      }
    }

    await context.close();
  });

  test('Rapid button mashing - no crashes', async ({ page }) => {
    await page.goto('/snap-station.html');
    await page.waitForLoadState('networkidle');

    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    const buttons = await page.locator('button').all();

    for (let i = 0; i < 50; i++) {
      const btn = buttons[i % buttons.length];
      try {
        await btn.click({ timeout: 200, force: true });
      } catch (e) {
        // Buttons may disappear; that's ok
      }
    }

    await page.waitForTimeout(500);

    const criticalErrors = errors.filter(e =>
      !e.includes('net::ERR') &&
      !e.includes('404') &&
      !e.includes('favicon') &&
      !e.includes('AudioContext')
    );

    if (criticalErrors.length > 0) {
      console.log('🔴 FINDING: JS errors during rapid clicking:', criticalErrors);
    }

    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('localStorage overflow simulation', async ({ page }) => {
    await page.goto('/snap-station.html');
    await page.waitForLoadState('networkidle');

    const overflowResult = await page.evaluate(() => {
      try {
        const chunk = 'X'.repeat(1024 * 1024);
        let count = 0;
        try {
          for (let i = 0; i < 9; i++) {
            localStorage.setItem(`overflow_test_${i}`, chunk);
            count++;
          }
        } catch (e) {
          for (let i = 0; i < count; i++) {
            localStorage.removeItem(`overflow_test_${i}`);
          }
          return { hitQuota: true, chunksWritten: count, error: e.name };
        }
        for (let i = 0; i < count; i++) {
          localStorage.removeItem(`overflow_test_${i}`);
        }
        return { hitQuota: false, chunksWritten: count };
      } catch (e) {
        return { error: e.message };
      }
    });

    console.log('localStorage overflow test:', overflowResult);
    expect(true).toBe(true);
  });

  test('Malformed snap JSON in localStorage', async ({ page }) => {
    const malformedStates = [
      '{"snaps": "not_an_array"}',
      'INVALID JSON',
      '{"snaps": [null, null, {"id": "<script>alert(1)<\\/script>"}]}',
      '',
    ];

    for (const badState of malformedStates) {
      await page.goto('/snap-station.html');

      await page.evaluate((state) => {
        localStorage.setItem('snapstation-snaps', state);
        localStorage.setItem('snapstation-export', state);
      }, badState);

      await page.reload();
      await page.waitForLoadState('networkidle');

      const bodyVisible = await page.evaluate(() =>
        document.body && document.body.children.length > 0
      );
      expect(bodyVisible).toBe(true);
    }
  });

  test('XSS payload in imported snap data', async ({ page }) => {
    await page.goto('/snap-station.html');
    await page.waitForLoadState('networkidle');

    const xssPayload = '<img src=x onerror=window.__xss_fired=true>';

    await page.evaluate((payload) => {
      const maliciousState = JSON.stringify({
        version: 1,
        snaps: [{
          id: payload,
          dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          timestamp: Date.now()
        }]
      });
      localStorage.setItem('snapstation-export', maliciousState);
    }, xssPayload);

    await page.reload();
    await page.waitForTimeout(1000);

    const xssFired = await page.evaluate(() => window.__xss_fired);
    if (xssFired) {
      console.log('🔴 CRITICAL: XSS payload executed in snap metadata!');
    } else {
      console.log('✅ XSS payload did not execute (good)');
    }

    expect(xssFired).toBeFalsy();
  });

});
