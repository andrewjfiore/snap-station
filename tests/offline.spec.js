// Self-hosting enforcement: every entry page must work with the outside
// internet hard-blocked. Any attempt to reach a non-localhost origin fails
// this suite — that's the point (kiosks must run offline; CDNs are banned).
const { test, expect } = require('@playwright/test');

const PAGES = ['index.html', 'classic.html', 'snap-station.html', 'sticker-sheet.html'];

test.describe('Offline / zero-CDN guarantee', () => {
  for (const page of PAGES) {
    test(`${page} loads fully with external network blocked`, async ({ browser, baseURL }) => {
      const context = await browser.newContext();
      const externalRequests = [];
      await context.route('**/*', (route) => {
        const url = route.request().url();
        if (url.startsWith(baseURL) || url.startsWith('data:') || url.startsWith('blob:')) {
          return route.continue();
        }
        externalRequests.push(url);
        return route.abort();
      });

      const p = await context.newPage();
      const pageErrors = [];
      p.on('pageerror', (e) => pageErrors.push(String(e)));

      const resp = await p.goto(`${baseURL}/${page}`, { waitUntil: 'networkidle' });
      expect(resp.ok()).toBe(true);
      // Give late scripts (babel transform on the kiosk) time to settle.
      await p.waitForTimeout(page === 'index.html' ? 4000 : 1000);

      expect(externalRequests, `external requests from ${page}`).toEqual([]);
      expect(pageErrors, `page errors on ${page}`).toEqual([]);
      // the page actually rendered something
      const bodyChildren = await p.evaluate(() => document.body.children.length);
      expect(bodyChildren).toBeGreaterThan(0);
      await context.close();
    });
  }
});
