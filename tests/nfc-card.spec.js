// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('snap-nfc-card', () => {
    test.beforeEach(async ({ page }) => {
        await page.setContent(`
            <!doctype html><html><head>
            <link rel="stylesheet" href="file://${path.resolve(__dirname, '..', 'snap-nfc-card.css')}">
            </head><body>
            <div id="mount"></div>
            <script src="file://${path.resolve(__dirname, '..', 'snap-nfc-card.js')}"></script>
            </body></html>
        `);
    });

    test('mounts hidden by default', async ({ page }) => {
        await page.evaluate(() => {
            // @ts-ignore
            SnapNfcCard.mount(document.getElementById('mount'));
        });
        await expect(page.locator('.nfc-card')).toHaveAttribute('aria-hidden', 'true');
    });

    test('show(n) reveals card with credit count', async ({ page }) => {
        await page.evaluate(() => {
            // @ts-ignore
            const card = SnapNfcCard.mount(document.getElementById('mount'));
            card.show(5);
        });
        await expect(page.locator('.nfc-card')).toHaveClass(/visible/);
        await expect(page.locator('.nfc-card-credits-value')).toHaveText('5');
    });

    test('flash() adds and removes tapping class', async ({ page }) => {
        await page.evaluate(() => {
            // @ts-ignore
            const card = SnapNfcCard.mount(document.getElementById('mount'));
            card.show(3);
            card.flash();
        });
        await expect(page.locator('.nfc-card')).toHaveClass(/tapping/);
        // Should clear after ~600ms.
        await expect(page.locator('.nfc-card')).not.toHaveClass(/tapping/, { timeout: 1500 });
    });
});
