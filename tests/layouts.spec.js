// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

// Loads snap-layouts.js in a headless page and asserts geometry invariants.
async function loadLayouts(page) {
    await page.setContent(`
        <!doctype html><html><body>
        <script src="file://${path.resolve(__dirname, '..', 'snap-layouts.js')}"></script>
        </body></html>
    `);
    return page.evaluate(() => {
        // @ts-ignore SnapLayouts is loaded globally.
        return {
            fourByFour: SnapLayouts.getLayout('4x4'),
            oneBy16: SnapLayouts.getLayout('1x16'),
            sixteenBy1: SnapLayouts.getLayout('16x1')
        };
    });
}

test.describe('snap-layouts', () => {
    test('all three layouts share outer hagaki dimensions', async ({ page }) => {
        const { fourByFour, oneBy16, sixteenBy1 } = await loadLayouts(page);
        expect(fourByFour.sheetMm).toEqual({ w: 148, h: 100 });
        expect(oneBy16.sheetMm).toEqual({ w: 148, h: 100 });
        expect(sixteenBy1.sheetMm).toEqual({ w: 148, h: 100 });
    });

    test('each layout has 16 cells', async ({ page }) => {
        const { fourByFour, oneBy16, sixteenBy1 } = await loadLayouts(page);
        expect(fourByFour.count).toBe(16);
        expect(oneBy16.count).toBe(16);
        expect(sixteenBy1.count).toBe(16);
        expect(fourByFour.cells).toHaveLength(16);
        expect(oneBy16.cells).toHaveLength(16);
        expect(sixteenBy1.cells).toHaveLength(16);
    });

    test('4x4 sheet is 1748x1181 at 300 DPI (matches C compositor)', async ({ page }) => {
        const { fourByFour } = await loadLayouts(page);
        expect(fourByFour.sheetPx.w).toBeGreaterThanOrEqual(1747);
        expect(fourByFour.sheetPx.w).toBeLessThanOrEqual(1749);
        expect(fourByFour.sheetPx.h).toBeGreaterThanOrEqual(1180);
        expect(fourByFour.sheetPx.h).toBeLessThanOrEqual(1182);
    });

    test('cells fit inside the sheet', async ({ page }) => {
        const { fourByFour, oneBy16, sixteenBy1 } = await loadLayouts(page);
        for (const layout of [fourByFour, oneBy16, sixteenBy1]) {
            for (const cell of layout.cells) {
                expect(cell.backing.x).toBeGreaterThanOrEqual(0);
                expect(cell.backing.y).toBeGreaterThanOrEqual(0);
                expect(cell.backing.x + cell.backing.w).toBeLessThanOrEqual(layout.sheetPx.w);
                expect(cell.backing.y + cell.backing.h).toBeLessThanOrEqual(layout.sheetPx.h);
            }
        }
    });
});
