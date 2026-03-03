// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Three device sizes: phone, tablet, laptop
const DEVICE_PROFILES = {
  phone: {
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  },
  tablet: {
    viewport: { width: 768, height: 1024 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15A5341f Safari/604.1',
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  },
  laptop: {
    viewport: { width: 1366, height: 768 },
    hasTouch: false,
    isMobile: false,
    deviceScaleFactor: 1,
  },
};

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3737',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: '/home/andrew/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome',
    },
    // Grant permissions that the app needs
    permissions: ['camera'],
    // Fake media for camera tests
    launchOptions: {
      executablePath: '/home/andrew/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome',
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-web-security',
        '--allow-file-access-from-files',
      ],
    },
  },

  projects: [
    {
      name: 'phone',
      use: { ...DEVICE_PROFILES.phone },
    },
    {
      name: 'tablet',
      use: { ...DEVICE_PROFILES.tablet },
    },
    {
      name: 'laptop',
      use: { ...DEVICE_PROFILES.laptop },
    },
  ],

  webServer: {
    command: 'node tests/server.js',
    port: 3737,
    reuseExistingServer: true,
    timeout: 10000,
  },
});
