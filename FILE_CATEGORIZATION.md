# File Categorization (2026-04-23)

This catalog classifies every tracked path in this repository as either **In Use**
or **Vestigial/Archived** for the Nintendo/Blockbuster refresh kickoff.

## In Use

### Core app runtime
- `index.html`
- `index.css`
- `index.js`
- `snap-station.html`
- `snap-station.css`
- `snap-station.js`
- `sticker-sheet.html`
- `sticker-sheet.css`
- `sticker-sheet.js`
- `admin.html`

### Feature modules used by runtime and/or admin surfaces
- `snap-layouts.js`
- `snap-preview.js`
- `snap-capture.js`
- `snap-payment.js`
- `snap-payment-providers.js`
- `snap-nfc-card.js`
- `snap-nfc-card.css`
- `snap-attendant-lock.js`
- `snap-ota.js`
- `snap-printing.js`
- `snap-printing-selphy.js`
- `snap-printing-instax.js`
- `snap-cricut.js`
- `snap-stickers.js`
- `snap-crt.css`
- `snap-theme-polish.css`
- `snap-blockbuster-scene.js`
- `snap-blockbuster-scene.css`

### Tests and test support
- `playwright.config.js`
- `tests/helpers.js`
- `tests/server.js`
- `tests/payment.spec.js`
- `tests/chaos.spec.js`
- `tests/chaos_test.spec.js`
- `tests/layouts.spec.js`
- `tests/stickers.spec.js`
- `tests/compositor-parity.spec.js`
- `tests/sticker-sheet.spec.js`
- `tests/index-tabs.spec.js`
- `tests/snap-station.spec.js`
- `tests/attendant-lock.spec.js`
- `tests/nfc-card.spec.js`
- `tests/preview.spec.js`
- `chaos-tests/fuzz_snap.py`
- `chaos-tests/playwright_chaos.js`

### Deployment and service assets
- `deploy/README.md`
- `deploy/print-server/server.js`
- `deploy/raspberry-pi/chromium-kiosk.sh`
- `deploy/raspberry-pi/setup.sh`
- `deploy/raspberry-pi/snap-kiosk.service`
- `deploy/raspberry-pi/snap-print-server.service`
- `deploy/mac-mini/install.sh`
- `deploy/mac-mini/com.snapstation.kiosk.plist`

### Libraries and docs
- `lib/gif.js`
- `lib/gif.worker.js`
- `README.md`
- `INVENTORY.md`
- `PHASE3_INTEGRATION.md`
- `docs/SCALE_MODEL_HARDWARE.md`
- `youtube-playlist.json`
- `test-pins.js`
- `package.json`
- `package-lock.json`

## Vestigial / Archived

These were identified as legacy or generated artifacts and moved out of active
paths to avoid confusion while preserving history.

- `archive/2026-04-23-pre-nintendo-refresh/claude_design.zip`
  - Previously at repo root as `claude_design.zip` (large binary artifact).
- `archive/2026-04-23-pre-nintendo-refresh/chaos-tests/results.json`
  - Previously at `chaos-tests/results.json` (generated fuzz output snapshot).

## Notes
- This pass focuses on structure hygiene only (classification + archival move).
- Functional Nintendo/Blockbuster visual refactor and capture/payment hardening
  are planned next.
