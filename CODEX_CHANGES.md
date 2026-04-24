# Codex Contributions

This document summarises changes authored by Codex (branches matching
`codex/*`) that have been merged into `main`. Commits are grouped by the
pull request they landed through.

## PR #7 — Refactor UI assets and improve accessibility
Commit `89f60ac` (2025-12-31)

Codex's first structural pass. Split the two monolithic HTML files into
separate markup / style / script units so the rest of the project could
grow without each page ballooning past 2k lines.

- Extracted `index.html` into `index.html` + `index.css` + `index.js`.
- Extracted `snap-station.html` into `snap-station.html` +
  `snap-station.css` + `snap-station.js` (~882 lines of JS lifted out
  of inline `<script>` blocks).
- Extracted `sticker-sheet.html` into `sticker-sheet.html` +
  `sticker-sheet.css` + `sticker-sheet.js` (~1753 lines of JS lifted
  out of inline `<script>` blocks).
- Accessibility pass across the extracted markup.

## PR #8 — Fix sticker sheet initialization
Commit `5435ace` (2025-12-31)

Follow-up to PR #7 after extracting the sticker-sheet script broke
startup. Re-wired the bootstrap path so the sheet initialised against
the new external script file.

## PR #9 — Add sticker sheet button test harness
Commit `4e8e961` (2025-12-31)

Introduced a harness for exercising sticker-sheet buttons so the
initialisation bugs found in PR #8 would be catchable by tests going
forward.

## PR #11 — Delay sticker sheet initialization until DOM ready
Commit `c023192` (2025-12-31)

Replaced the immediate bootstrap with a `DOMContentLoaded` guard so the
script no longer queried elements that had not yet parsed.

## PR #12 — Fix sticker sheet mode initialization
Commit `1f5eb26` (2025-12-31)

Secondary DOM-ready fix: the "mode" state was being read before the
DOMContentLoaded handler fired in some browsers. Tightened the init
ordering.

## PR #17 — Skeuomorphic revamp + Phases 0–7
Merged `05a3104` (2026-04-23), bundling several multi-phase commits.

This was the largest codex delivery and split the project into a set of
phased modules.

### `680f8df` — Skeuomorphic Snap Station redesign
- Nintendo Blue / Yellow theme, Press Start 2P font, CRT bezel, 4×4
  sticker grid, arcade-style `TAKE PHOTO` / `PRINT NOW` buttons,
  credits bar.
- `snap-printing.js`: Canon SELPHY, inkjet, and laser/letter drivers
  with a print-settings drawer (paper size, borderless, copies).
- `snap-cricut.js`: kiss-cut ZIP export — PNG + registration marks +
  SVG cut paths via JSZip; "Download for Cricut" flow.
- `snap-payment.js`: Luhn-validated 10-digit PINs, `localStorage`
  credit tracking, numeric keypad modal, used-PIN de-duplication.
- `admin.html`: SHA-256-gated admin panel with batch PIN generator,
  attendant override, stats, and a dev test-PIN loader.
- `test-pins.js`: pre-generated Luhn-valid PINs for every credit tier.
- CI: `.github/workflows/test.yml`; Playwright suites
  `tests/payment.spec.js` and migrated `tests/chaos.spec.js`
  (317 tests passing).
- Removed the hardcoded `executablePath` from `playwright.config.js`
  so CI could run headless Chromium.

### `832bc0c` — Sticker-slot preview styling
Swapped the blue slot rectangles for a warmer neutral preview.

### Phase 0–7 (`b8ce067`, `3347ac2`, `e61e4fe`, `49aa500`, `b28ae9d`, `418354c`)
Phased rebuild that introduced the current module layout:

- **Phase 0** — `INVENTORY.md`: keep / extend / replace decisions
  for every existing file.
- **Phase 3** — `snap-layouts.js`, `snap-capture.js` (FrameSource
  abstraction over `getUserMedia` and file inputs), integer-scaled
  CRT renderer (`snap-crt.css`), parity tests.
- **Phase 4** — live-preview drag-to-reframe (`snap-preview.js`) and
  an attract-mode YouTube source.
- **Phase 5** — `snap-nfc-card.{js,css}` for NFC card auth,
  `snap-payment-providers.js` (multi-provider payment shim),
  `snap-attendant-lock.js` staff lockout, `snap-ota.js` OTA skeleton.
- **Phase 6** — `snap-blockbuster-scene.{js,css}` shelf scene,
  redesigned sticker library, `snap-theme-polish.css` theme pass.
- **Phase 7** — `snap-printing-selphy.js` + `snap-printing-instax.js`
  hardware drivers; Raspberry Pi kiosk bring-up
  (`deploy/raspberry-pi/` — `setup.sh`, `chromium-kiosk.sh`,
  `snap-kiosk.service`, `snap-print-server.service`); Mac mini
  launcher (`deploy/mac-mini/install.sh`, `com.snapstation.kiosk.plist`);
  shared `deploy/print-server/server.js`; `docs/SCALE_MODEL_HARDWARE.md`.
- Merge commit `74ac488` folded these together and added
  `PHASE3_INTEGRATION.md` describing how the phases plug into the
  existing app.

## PR #19 — Load demo footage from playlist with cycling support
Commit `b72674d` (2026-04-24)

Most recent codex change. Wires up an attract-mode video playlist
instead of a single hardcoded clip.

- Added `youtube-playlist.json` consumption in `snap-station.js`;
  cycles through entries when one ends.
- `snap-station.html` picks up the playlist loader.
- Styling tweaks in `snap-blockbuster-scene.css`, `snap-nfc-card.css`,
  `snap-station.css`, `sticker-sheet.css`.
- Sticker-sheet and NFC-card JS touch-ups to play nicely with the
  cycling attract loop.
- Added `FILE_CATEGORIZATION.md` (catalogue of every source file and
  what it belongs to) and moved `chaos-tests/results.json` and the
  uploaded `claude_design.zip` into `archive/`.

## Net effect on the repo
Before codex's contributions the project was two large HTML files with
inline scripts. After PR #19 it is a modular kiosk application with:

- Split HTML / CSS / JS per surface (`index`, `snap-station`,
  `sticker-sheet`, `admin`).
- Phase-scoped modules (`snap-capture`, `snap-layouts`, `snap-preview`,
  `snap-stickers`, `snap-payment*`, `snap-printing*`, `snap-nfc-card`,
  `snap-attendant-lock`, `snap-ota`, `snap-blockbuster-scene`).
- A Playwright CI suite and chaos/payment specs.
- Deploy recipes for Raspberry Pi kiosk and Mac mini under `deploy/`.
- Inventory, phase-integration, and file-categorisation docs at the
  repo root.
