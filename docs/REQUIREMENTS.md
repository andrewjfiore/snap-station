# Pokemon Snap Station — Product Requirements

The north star: a recreation of the 1999 Blockbuster Pokemon Snap Station that feels like an
official Nintendo-quality re-release — for homes first, with a path to physical kiosk
deployments. Sources of truth: original hardware photos and the measured hagaki print
(148 × 100 mm sheet, 109.4 × 83 mm image area), the kiss-cut reference diagram, and the
magazine scan documenting the original's $3-per-sheet "Pokémon Credit Card" flow.

## Product pillars

1. **Play** — capture frames from a Pokemon Snap session (emulator window / any window via
   screen capture) or from a webcam (photo-booth mode for users and friends).
2. **Compose** — arrange snaps on a 4×4 sticker sheet (1, 4, or 16 photos), decorate with
   full-color emoji and text stamps, wallpapers, and paper colors.
3. **Print** — print at exact physical scale (4×6 / hagaki / letter) or export a combined
   Print-Then-Cut SVG for Cricut/Silhouette kiss-cutting.

## V1 acceptance matrix

| Requirement | Acceptance | Verified by |
| --- | --- | --- |
| Kiosk flow attract → capture → gallery → editor → checkout → print | Complete flow with keyboard, touch, and gamepad | `tests/kiosk-flow.spec.js` (3 device profiles) |
| Sticker geometry: cell 26.6×20 mm, gap 1 mm, kiss-cut 24.1×17.5 mm r 2.75, offsets 1.25 / 0.833 / 1.667 mm | Identical outer dimensions across all layouts and papers | `tests/geometry.spec.js`, `tests/export.spec.js` |
| Landscape sheet, 4×4 grid, layouts 1×16 / 2×2 / 16-unique | All layouts share one grid | `tests/geometry.spec.js` |
| Combined Cricut SVG: embedded print raster + kiss-cut paths in one file | Imports as a single aligned design | `tests/export.spec.js`; physical import = user validation |
| CRT effect off by default; reduced motion respected | Defaults in `js/snap-store.js` | `tests/store.spec.js` |
| Payment: simulated $3 Snap Card; credits persist; attendant-adjustable | MockProvider only in v1; pluggable registry for real providers | `tests/store.spec.js` (payment), kiosk specs |
| Attendant mode: hold badge 3 s + PIN; credits, free play, price, stats, clear, change PIN | Children cannot reach settings or payment grants | kiosk attendant spec |
| Idle → attract after 120 s | Kiosk recovers to attract unattended | kiosk flow spec |
| Self-hosted runtime: zero CDN/network requests | Works offline from any static server | offline spec + CI no-build smoke |
| No build step | `git clone` + any static file server runs the product | CI no-build smoke job |
| Multi-device | Phone / tablet / laptop Playwright profiles pass | full suite |
| Classic pages keep working (`classic.html`, `snap-station.html`, `sticker-sheet.html`) | Regression suite green | restored 2026 specs |

## Explicitly OUT of scope for v1 (documented, not dropped)

| Item | Why deferred | How to validate later |
| --- | --- | --- |
| Physical print validation (Canon PRO-100, Selphy) | No printer in the dev environment | `docs/STICKER_PRINTING_GUIDE.md` test matrix |
| Cricut Design Space / Silhouette Studio import | Requires the vendor apps + hardware | Upload `snap-station-cricut.svg`, pick Print Then Cut, confirm cut alignment on one sheet |
| Real payment hardware (NFC reader, Stripe Terminal/Square) | Needs accounts + readers; v1 decision is simulated credits | Implement a provider against the registry in `js/payment.js`; the UI does not change |
| OTA updates | Needs an update backend; GitHub Pages redeploy covers v1 | Restore/extend `snap-ota.js` (history: `99f7fe8`) against a chosen backend |
| Native Android/iOS wrappers | Needs JDK17/Android SDK and macOS/Xcode | Re-create the Capacitor scaffold; `docs/NATIVE_BUILDS.md` |
| ROM / emulator integration | Lives in the separate snap-station-emu project | That repo's harness and ROM_SPEC |

## Durability assumptions (kiosk deployments)

- Hardware per `docs/SCALE_MODEL_HARDWARE.md` (RPi 5 / Mac mini / NUC, Selphy CP1500).
- Browser chrome hidden (Chromium kiosk flags in `deploy/`); the attendant drawer is the only
  way to reach settings; everything else is child-safe by construction.
- localStorage is the only persistence; the gallery is LRU-capped and quota-guarded
  (`js/snap-store.js`). IndexedDB migration is a v2 candidate if galleries need to grow.
