# snap-station Inventory (Phase 0)

Snapshot of the web-app kiosk runtime at the start of the Pokémon Snap
Station reproduction work. This document records what exists on `main`,
what we are keeping, what will be extended, and what will be replaced
or removed. It does not move any files: moves happen in the phase that
ships the replacement so the Playwright suite never goes red mid-flight.

See `/root/.claude/plans/ultraplan-v2-pokemon-binary-turtle.md` for the
full multi-repo plan.

## Architecture note

This is a vanilla HTML/CSS/JS project (not React/TSX). `index.html` is a
tabbed iframe host for two sibling apps:

- `snap-station.html` + `snap-station.css` + `snap-station.js` - capture kiosk.
- `sticker-sheet.html` + `sticker-sheet.css` + `sticker-sheet.js` - layout composer.

Cross-frame transfer happens via `localStorage['snapstation-export']` and a
`BroadcastChannel` named `snapstation-sync`. Preserve this contract.

## Keep (authoritative; do not rewrite)

| Path | Purpose |
|---|---|
| `index.html`, `index.css`, `index.js` | Tab host + BroadcastChannel wiring. |
| `snap-station.html`, `snap-station.css`, `snap-station.js` | Capture kiosk UI. |
| `sticker-sheet.html`, `sticker-sheet.css`, `sticker-sheet.js` | Layout composer. |
| `snap-payment.js` | PIN keypad + credits flow. |
| `snap-printing.js` | Print-path abstraction. |
| `snap-cricut.js` | Cricut cutter integration. |
| `admin.html` | Attendant/admin panel. |
| `lib/gif.js`, `lib/gif.worker.js` | Vendored GIF encoder. |
| `tests/*.spec.js`, `tests/helpers.js`, `tests/server.js`, `playwright.config.js` | Playwright suite across phone/tablet/laptop projects. |
| `chaos-tests/fuzz_snap.py`, `chaos-tests/playwright_chaos.js` | Chaos/fuzz harness. |
| Existing themes in `snap-station.css`: `snap-station`, `video-rental` (Blockbuster), `1-up` (Mario Level 1), `hearts`, `vines`, `retro`, `dark`, `light`. | All preserved. No vaporwave palette found on `main`. |

## Extend (keep architecture, add capability in a later phase)

| Path | Phase | Planned extension |
|---|---|---|
| `snap-station.js` | Phase 3 | Add layout-agnostic descriptors (4x4 default, plus 1x16 and 16x1 compositor variants on the same hagaki outer). Integer-scale the existing `.video-container::after` CRT overlay and make it off by default. |
| `sticker-sheet.js` | Phase 3 | Consume the new layout descriptors. Reuse the 300 DPI 1748x1181 geometry already measured in `snap-station-emu/src/sticker_sheet.c`. |
| `snap-station.js` FrameSource | Phase 3/4 | New `snap-capture.js` module abstracting live webcam, window capture (Chrome tabs, emulator windows), and YouTube embeds. Piped through the same interface so compositor is source-agnostic. |
| `snap-station.html` LivePreview | Phase 4 | 16:9 / 4:3 toggle (already in CSS), drag-and-drop reframing, CRT toggle, YouTube playthrough source for attract mode. |
| `snap-station.html` HomeScreen | Phase 5 | Add skeuomorphic NFC tap-to-pay card element that appears once credit is purchased. |
| `snap-payment.js` | Phase 5 | Pluggable provider interface (v1 ships the existing PIN keypad as the mock provider; real provider deferred). |
| `admin.html` | Phase 5 | `AttendantLock` hold-to-unlock gate. |
| `snap-printing.js` | Phase 7 | Selphy and Instax driver adapters selected at install time. |
| `snap-station.css` (themes) | Phase 6 | Tighten the `video-rental` theme and add a `BlockbusterShelves` scene with vanishing-point rental aisles. Redesign stickers for more colorful / child-appealing full-color palette. |
| `tests/` | Phase 3 | Add `tests/compositor-parity.spec.js` that drives the `snap-station-emu` harness and compares web-app compositor output to golden frames within a perceptual-hash tolerance. |

## Flag (binary bloat; remove in a follow-up with explicit approval)

| Path | Size | Note |
|---|---|---|
| `archive/2026-04-23-pre-nintendo-refresh/claude_design.zip` | 10.2 MB | Archived binary design artifact moved out of active root during initial cleanup pass. |

## Branch hygiene

Other branches present on `main`:

- `improve/agent-enhancements`
- `codex/list-functions-of-sticker-station`
- `claude/fix-touch-responsive-ui-D5u0g`

These are not superseded by this work and are left alone. All phases
develop on `claude/pokemon-snap-reverse-engineering-jUB6z`.

## Open questions surfaced during inventory

- Payment provider for v1 (Stripe Terminal / Square / mock-only). Answer
  needed before Phase 5 lands.
- OTA update host (self-hosted / GitHub Releases / vendor MDM). Answer
  needed before Phase 5 or Phase 7 lands.
- Printer mix for v1 install images: both Selphy and Instax, or one?
  Answer needed before Phase 7 lands.
