// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('snap-stickers', () => {
    test.beforeEach(async ({ page }) => {
        await page.setContent(`
            <!doctype html><html><body>
            <script src="file://${path.resolve(__dirname, '..', 'snap-stickers.js')}"></script>
            </body></html>
        `);
    });

    test('library is non-empty', async ({ page }) => {
        const count = await page.evaluate(() => SnapStickers.count);
        expect(count).toBeGreaterThanOrEqual(6);
    });

    test('every sticker parses as valid SVG', async ({ page }) => {
        const results = await page.evaluate(() => {
            const parser = new DOMParser();
            return SnapStickers.list().map(s => {
                const doc = parser.parseFromString(s.svg, 'image/svg+xml');
                return {
                    id: s.id,
                    ok: doc.querySelector('parsererror') === null
                };
            });
        });
        for (const r of results) {
            expect(r.ok, `sticker ${r.id} failed to parse`).toBe(true);
        }
    });

    test('every sticker has a palette', async ({ page }) => {
        const palettes = await page.evaluate(() =>
            SnapStickers.list().map(s => ({ id: s.id, size: s.palette.length })));
        for (const p of palettes) {
            expect(p.size).toBeGreaterThan(0);
        }
    });

    test('toDataUrl produces a usable image URL', async ({ page }) => {
        const url = await page.evaluate(() => SnapStickers.toDataUrl(SnapStickers.list()[0]));
        expect(url.startsWith('data:image/svg+xml;utf8,')).toBe(true);
    });
});
