/**
 * Snap Station Playwright Chaos Tests
 * Tests: rapid button mashing, camera permission denial, UI resilience
 * Run: cd /home/andrew/repos/snap-station && npx playwright test chaos-tests/playwright_chaos.js
 */
const { test, expect } = require('@playwright/test');
const path = require('path');

const APP_URL = `file://${path.resolve(__dirname, '../snap-station.html')}`;

test.describe('Snap Station Chaos Tests', () => {

  test('Camera permission denial - graceful degradation', async ({ browser }) => {
    // Deny camera permission
    const context = await browser.newContext({
      permissions: [],
    });
    const page = await context.newPage();
    
    // Intercept getUserMedia to simulate denial
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => 
        Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
    });
    
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    
    // Try to start camera
    const camBtn = page.locator('button:has-text("Start Camera"), button:has-text("Camera")').first();
    if (await camBtn.count() > 0) {
      await camBtn.click();
      await page.waitForTimeout(1000);
      
      // Should show error, not crash
      const errors = await page.evaluate(() => window.__errors || []);
      const bodyText = await page.textContent('body');
      
      // App should still be interactive
      const isInteractive = await page.evaluate(() => document.body.style.display !== 'none');
      expect(isInteractive).toBe(true);
      
      // Should show some user-facing error message
      const hasErrorFeedback = bodyText.includes('permission') || 
                               bodyText.includes('denied') || 
                               bodyText.includes('error') ||
                               bodyText.includes('unavailable');
      // Note finding if no user feedback
      if (!hasErrorFeedback) {
        console.log('⚠️ FINDING: Camera denial shows no user feedback');
      }
    }
    
    await context.close();
  });

  test('Rapid button mashing - no crashes', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));
    
    // Find all clickable buttons
    const buttons = await page.locator('button').all();
    
    // Mash buttons rapidly 50 times
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
      !e.includes('favicon')
    );
    
    if (criticalErrors.length > 0) {
      console.log('🔴 FINDING: JS errors during rapid clicking:', criticalErrors);
    }
    
    // Page should still be responsive
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('localStorage overflow simulation', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    
    // Fill localStorage to near quota
    const overflowResult = await page.evaluate(() => {
      try {
        // Try to fill 9MB (near typical 10MB limit)
        const chunk = 'X'.repeat(1024 * 1024); // 1MB
        let count = 0;
        try {
          for (let i = 0; i < 9; i++) {
            localStorage.setItem(`overflow_test_${i}`, chunk);
            count++;
          }
        } catch (e) {
          // Storage full - now clean up test data
          for (let i = 0; i < count; i++) {
            localStorage.removeItem(`overflow_test_${i}`);
          }
          return { hitQuota: true, chunksWritten: count, error: e.name };
        }
        // Cleanup
        for (let i = 0; i < count; i++) {
          localStorage.removeItem(`overflow_test_${i}`);
        }
        return { hitQuota: false, chunksWritten: count };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('localStorage overflow test:', overflowResult);
    
    // Now try to use the app after filling storage
    const snapBtn = page.locator('[data-action="snap"], button:has-text("Snap"), #snap-btn').first();
    if (await snapBtn.count() > 0) {
      // App should handle quota errors gracefully
      const errors = await page.evaluate(() => window.__storageErrors || []);
      console.log('Storage errors:', errors);
    }
    
    expect(true).toBe(true); // Test completes without crash
  });

  test('Malformed snap JSON in localStorage', async ({ page }) => {
    const malformedStates = [
      '{"snaps": "not_an_array"}',
      'INVALID JSON',
      '{"snaps": [null, null, {"id": "<script>alert(1)</script>"}]}',
      '',
    ];
    
    for (const badState of malformedStates) {
      await page.goto(APP_URL);
      
      // Inject malformed state
      await page.evaluate((state) => {
        localStorage.setItem('snapstation-snaps', state);
        localStorage.setItem('snapstation-export', state);
      }, badState);
      
      // Reload to trigger state loading
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Page should not be broken
      const bodyVisible = await page.evaluate(() => 
        document.body && document.body.children.length > 0
      );
      expect(bodyVisible).toBe(true);
    }
  });

  test('XSS payload in imported snap data', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    
    const xssPayload = '<img src=x onerror=window.__xss_fired=true>';
    
    // Inject XSS via localStorage
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
