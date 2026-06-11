# File Inventory

Census of everything in this repository: what it is, where it came from, and whether it is
part of the running product. Git history is the archive — nothing deprecated is kept in the
working tree.

## Running product (served by GitHub Pages from the repo root)

| Path | Role | Origin |
| --- | --- | --- |
| `index.html` | Kiosk app shell (React, attract → 5-step wizard) | structure per `pokemon-snap-station-designsystem.html` (user's design system) |
| `classic.html` | Tab shell for the classic two-page suite | formerly `index.html` (pre-kiosk) |
| `snap-station.html` | Classic capture page (webcam/screen, zoom/pan/mirror, GIF, gallery) | original playground upload + PRs #22–23 |
| `sticker-sheet.html` | Classic sticker composer (Cropper.js, stamps, exports) | original playground upload + PRs #22–23 |
| `kiosk/css/designsystem.css` | The design system's full CSS, transplanted verbatim (+two fixes: shimmer transform, btn overflow clip) | `pokemon-snap-station-designsystem.html` |
| `kiosk/css/app.css` | App glue: wizard chrome, sticky footer, phone-width fixes | new |
| `kiosk/screens/` | Attract + wizard steps 1–5 (markup transplanted from the design-system tabs) | design system + logic from the earlier kiosk port |
| `kiosk/components/` | UI kit (toasts, score popup, error tiers, keypad), icons, attendant panel, adjust modal, sticker canvas | design system + earlier kiosk port |
| `kiosk/lib/` | hooks (storage/keyboard/gamepad/idle), 300-DPI sheet renderer | earlier kiosk port (unchanged geometry) |
| `js/` | Shared framework-agnostic UMD modules (single source of truth) | extracted from classic pages + restored from `99f7fe8` |
| `lib/vendor/` | Self-hosted third-party libraries (exact pinned files) | npm registry (versions in `docs/DEPLOYMENT.md`) |
| `assets/fonts/` | Self-hosted woff2 fonts + `fonts.css` (all OFL-licensed) | Google Fonts (latin subsets) |
| `manifest.json`, icons | PWA-lite install metadata | new |

## Development / operations (not loaded by the product at runtime)

| Path | Role | Origin |
| --- | --- | --- |
| `tests/` | Playwright specs + static test server (`:3737`) | restored from `99f7fe8`, repaired against current pages, extended |
| `playwright.config.js` | 3 device profiles (phone/tablet/laptop), fake camera | restored from `99f7fe8` |
| `package.json` | Dev-only dependency manifest (`@playwright/test`) — **runtime never needs npm** | restored, cleaned |
| `deploy/` | Kiosk hardware: print-server bridge, RPi + Mac mini setup | restored from `99f7fe8` (Phase 7 work) |
| `docs/` | Product, printing, deployment, hardware documentation | new + restored |
| `.github/workflows/deploy.yml` | GitHub Pages deploy (repo root, no build step) | PR #1 |
| `.github/workflows/test.yml` | CI: Playwright + no-build smoke test | restored from `99f7fe8`, extended |

## Notable git-history locations (deliberately NOT in the working tree)

| What | Where | Why not in tree |
| --- | --- | --- |
| Pre-revert revamp (modules, admin.html, chaos tests) | `99f7fe8` (PR #19, reverted by PR #21) | superseded; useful pieces were selectively restored into `js/`, `deploy/`, `tests/` |
| `claude_design.zip` (10 MB design reference) | `e03d409` | binary bloat; canonical copy lives in the user's local `ui_designsystem` folder |
| Old prototype iterations | PRs #3–#18 history | superseded by current pages |

## Local-only assets (user's machine, not in this repo)

- `ui_designsystem/` — snap-kiosk playground source, `pokemon-snap-station-designsystem.html`
  (the UI spec the kiosk follows — its CSS lives in `kiosk/css/designsystem.css`), sticker
  layout reference PNGs, original-hardware measurements. The snap-kiosk playground contributed
  the logic wiring; the design system defines the look and screen structure.
- `snap_station_emu_project/`, `rom_decomp/` — ROM/emulator reverse-engineering work; lives in
  the separate `snap-station-emu` project, out of scope for this repo.
