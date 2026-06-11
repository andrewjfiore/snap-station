# Deployment

The product is static files — no build step, no bundler, no npm at runtime. Anything that can
serve this directory serves the product.

## Local

```bash
git clone https://github.com/andrewjfiore/snap-station
cd snap-station
python3 -m http.server 8000        # or: npx serve, or any static server
# open http://localhost:8000/          → kiosk app
# open http://localhost:8000/classic.html  → classic two-page suite
```

`file://` note: the classic pages (`snap-station.html`, `sticker-sheet.html`) open directly
from disk. The kiosk app does not (babel-standalone fetches JSX over XHR) — use the one-line
server above.

## GitHub Pages

`.github/workflows/deploy.yml` publishes the repo root on every push to `main`.
`.github/workflows/test.yml` runs the Playwright suite and the no-build smoke job on every
push/PR.

### Branch → live checklist (the "pushed ≠ deployed" lesson)

Work is NOT live until every box is checked:

1. [ ] Branch pushed
2. [ ] PR opened, CI green
3. [ ] PR **merged to main**
4. [ ] Pages workflow run completed (Actions tab → "Deploy to GitHub Pages")
5. [ ] **Live smoke test** on `https://<user>.github.io/snap-station/`:
   - `/` boots to the attract screen, no console errors
   - capture → gallery → editor → checkout → print walk-through once
   - one Cricut SVG export downloads and contains `print-layer` + `cut-layer`
   - `/classic.html`, `/snap-station.html`, `/sticker-sheet.html` all render
   - DevTools Network shows **zero** requests leaving the site's origin

If the live page looks stale after a merge, hard-reload (Pages caches aggressively) before
debugging anything else.

## Kiosk hardware

See `deploy/`:

- **Raspberry Pi 5**: `deploy/raspberry-pi/setup.sh` installs Chromium + CUPS + gutenprint,
  `snap-kiosk.service` launches full-screen Chromium at boot, `snap-print-server.service`
  runs the print bridge.
- **Mac mini**: `deploy/mac-mini/install.sh` + LaunchDaemon plist.
- **Print bridge**: `deploy/print-server/server.js` — zero-dependency Node HTTP server on
  `127.0.0.1:47002` that shells out to `lp` (CUPS). Health check:
  `curl http://127.0.0.1:47002/health` → `{"ok":true,"version":1}`.
  Point the kiosk at it via the attendant drawer → "Print server URL". When unset or
  unreachable, the kiosk falls back to the browser print dialog.

Hardware bill of materials and enclosure dimensions: `docs/SCALE_MODEL_HARDWARE.md`.

## Versions (vendored runtime)

| Library | Version | File |
| --- | --- | --- |
| React / ReactDOM | 18.3.1 (production UMD — last UMD line; do not bump to 19) | `lib/vendor/react*.production.min.js` |
| @babel/standalone | 7.29.0 | `lib/vendor/babel.min.js` |
| Cropper.js | 1.5.13 | `lib/vendor/cropper.min.{js,css}` |
| html2canvas | 1.4.1 | `lib/vendor/html2canvas.min.js` |
| jsPDF | 2.5.1 | `lib/vendor/jspdf.umd.min.js` |
| gif.js | 0.2.0 | `lib/vendor/gif.{js,worker.js}` |
| Fonts | Google Fonts woff2, latin subsets, all OFL | `assets/fonts/` |

Dev-only: `@playwright/test` (see `package.json`). The runtime never touches `node_modules`.
