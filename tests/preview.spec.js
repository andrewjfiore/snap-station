// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('snap-preview', () => {
    test.beforeEach(async ({ page }) => {
        await page.setContent(`
            <!doctype html><html><head><style>
                .video-container { width: 400px; height: 225px; position: relative; overflow: hidden; }
                .video-container.ratio-4-3 { aspect-ratio: 4/3; }
                .video-container.crt-on::after { content: ''; position: absolute; inset: 0; }
                video { width: 100%; height: 100%; }
            </style></head><body>
            <div class="video-container">
                <video id="webcam" autoplay muted playsinline></video>
            </div>
            <script src="file://${path.resolve(__dirname, '..', 'snap-preview.js')}"></script>
            </body></html>
        `);
    });

    test('aspect toggle flips ratio-4-3 class', async ({ page }) => {
        await page.evaluate(() => {
            // @ts-ignore
            const preview = SnapPreview.mount(document.querySelector('.video-container'));
            preview.setAspect('4:3');
        });
        await expect(page.locator('.video-container')).toHaveClass(/ratio-4-3/);
    });

    test('CRT toggle flips crt-on class and is off by default', async ({ page }) => {
        const initial = await page.locator('.video-container').getAttribute('class');
        expect(initial || '').not.toContain('crt-on');
        await page.evaluate(() => {
            // @ts-ignore
            const preview = SnapPreview.mount(document.querySelector('.video-container'));
            preview.setCrt(true);
        });
        await expect(page.locator('.video-container')).toHaveClass(/crt-on/);
    });

    test('wheel zoom clamps between 1.0 and 3.0', async ({ page }) => {
        const final = await page.evaluate(() => {
            // @ts-ignore
            const preview = SnapPreview.mount(document.querySelector('.video-container'));
            for (let i = 0; i < 50; i++) {
                document.querySelector('.video-container').dispatchEvent(
                    new WheelEvent('wheel', { deltaY: -10, cancelable: true, bubbles: true })
                );
            }
            return preview.state.zoom;
        });
        expect(final).toBeLessThanOrEqual(3.0);
        expect(final).toBeGreaterThanOrEqual(1.0);
    });

    test('reset zeros pan and zoom', async ({ page }) => {
        const { zoom, panX, panY } = await page.evaluate(() => {
            // @ts-ignore
            const preview = SnapPreview.mount(document.querySelector('.video-container'));
            preview.state.zoom = 2.5;
            preview.state.panX = 50;
            preview.state.panY = -30;
            preview.reset();
            return { zoom: preview.state.zoom, panX: preview.state.panX, panY: preview.state.panY };
        });
        expect(zoom).toBe(1.0);
        expect(panX).toBe(0);
        expect(panY).toBe(0);
    });
});
