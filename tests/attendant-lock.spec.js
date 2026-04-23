// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('snap-attendant-lock', () => {
    test.beforeEach(async ({ page }) => {
        await page.setContent(`
            <!doctype html><html><body>
            <button id="lock">Hold to Unlock</button>
            <script src="file://${path.resolve(__dirname, '..', 'snap-attendant-lock.js')}"></script>
            </body></html>
        `);
    });

    test('fires onUnlock only after full hold duration', async ({ page }) => {
        await page.evaluate(() => {
            // @ts-ignore
            window.__unlocked = false;
            // @ts-ignore
            SnapAttendantLock.attach(document.getElementById('lock'), {
                holdMs: 300,
                // @ts-ignore
                onUnlock: () => { window.__unlocked = true; }
            });
        });
        // Short tap should not unlock.
        await page.locator('#lock').click();
        const short = await page.evaluate(() => window.__unlocked);
        expect(short).toBe(false);

        // Long press should unlock.
        const btn = page.locator('#lock');
        const box = await btn.boundingBox();
        if (!box) throw new Error('no bounding box');
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(500);
        await page.mouse.up();
        const long = await page.evaluate(() => window.__unlocked);
        expect(long).toBe(true);
    });
});
