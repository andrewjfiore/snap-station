# Claude Design Handoff — Snap Station v5 ("fable pass")

You are picking up live design iteration on **Snap Station v5**: a Pokémon-style photo-sticker
kiosk web app. Users capture photos (webcam / USB HDMI capture card / window share / paste /
upload), store them in a Pokémon-HOME-style BOX, arrange a 4×4 sticker sheet with exact
print/kiss-cut geometry, and pay simulated credits to "print" (real PNG / browser-print /
Cricut print-then-cut SVG exports). It must feel like a first-party Nintendo product, not a website.

## Where everything lives
- Repo: `andrewjfiore/snap-station`, branch **`fable/v5`**, all UI in the **`/v5/`** directory (self-contained).
- PR #28 is the open draft. `main` is pinned to a legacy playground; don't touch anything outside `v5/`.
- Run it: `python3 -m http.server` at repo root → open `/v5/`. No build step, ever.
- Previous iterations for context: `kiosk-v4` branch (rejected look: too heavy/slow), and the
  design-system reference `pokemon-snap-station-designsystem.html` (in the owner's ui_designsystem folder).

## File map (≈1,900 lines total — read all of it first, it's small on purpose)
```
v5/index.html   all screens' markup (title / menu / capture / box / sheet / print + dialog/btnbar chrome)
v5/v5.css       the entire skin (~700 lines) — design work happens mostly here
v5/app.js       router, Pokémon dialog system, menu cursor, keyboard/gamepad, idle, attendant
v5/capture.js   input enumeration (cameras+capture cards), screen share, paste/drop/upload, GIF
v5/boxes.js     the BOX (30-slot pages, tabs, multi-select, preview rail)
v5/sheet.js     composer (geometry-driven cells, kiss overlay, stamps drag/wheel/dbl-tap)
v5/print.js     Poké Mart counter → dye-sub pass animation → results screen → exports
v5/lib/*        business modules — DO NOT restyle logic; geometry numbers are sacred
```

## The design direction (calibrated against real screenshots)
**Primary: Pokémon Unite.** Its grammar, confirmed from reference captures:
- **Airy stadium fields** — sky-blue gradients with white light streaks. Dark belongs ONLY to the
  top HUD bar, bottom button bar, and modal scrims. (First attempt went dark-purple everywhere; rejected.)
- **Roster cards** (the VS screen): saturated solid slabs (orange/purple/blue/green) with a 2px white
  inner hairline, dark bottom name plates, italic uppercase labels, small dark corner badges. The main
  menu tiles use this. Selection = yellow frame + glow.
- **Italic Barlow 900** for all display text; section headers get a **yellow underline accent**.
- **CTAs**: cream pill with an orange **▸** chevron lead-in ("Enter" style), or orange gradient for hot actions.
- **Vertical left rails** of stacked pills for settings-like screens (active = orange gradient pill with notch).
- Toggles ON-state = **lime** (high-visibility, from the Snap settings analysis).

**Secondary: New Pokémon Snap** (capture screen DNA): transparent framing brackets, persistent photo
counter top-right, name-tag chips under the reticle, and the evaluation idea (Pose/Size/Direction
scoring, "New Record!") — the post-print results screen riffs on Unite's end-of-match stats instead.

**Metaphors already in place — keep them:** gallery = HOME **BOX** (blue wall, slot grid, tabs,
"RELEASE"); all toasts/confirms = **Pokémon text box** (typewriter, rolling ▼, ▶ option cursor);
print = **Poké Mart counter** + dye-sub Y/M/C/Finish pass ritual; title = ball + PRESS START.

**Palette tokens** (in `:root`): `--org #ff7a1a` (action), `--blu #2f6df6`, `--cyan #2fd6ff`,
`--yel #ffcb05`, `--red #ee1515` (ball/cuts), `--lime #b8f23d` (ON), field sky `#b3e3ff→#5ba9dd`,
bars `#241b47/#170f33`, ink `#1c1438`. Fonts vendored: Barlow 700/900, Mulish (body),
Fredoka, Silkscreen (pixel winks only), JetBrains Mono (numbers/money).

## Hard constraints (these are why v5 exists — breaking them is a regression)
1. **No framework, no build, no runtime transform.** Plain HTML/CSS/JS, editable-and-refresh.
2. **60fps budget**: animate `transform`/`opacity` only; **no `backdrop-filter`/`blur` anywhere**;
   no timers or RAF while idle; `prefers-reduced-motion` must stop everything (a media block exists).
3. **Boot < 1s.** Don't add libraries. Don't add big images; the look is gradients + borders + type.
4. **Overlay layers never eat taps**: any absolutely-positioned decorative layer gets
   `pointer-events:none` (children that need taps re-enable). This bug shipped twice; never again.
5. **Geometry is law**: cell/kiss-cut numbers come from `lib/sticker-constants.js`
   (`getSheetGeometry`) — restyle around them, never approximate them in CSS.
6. **Kiosk-first, PC-sane**: root `font-size: clamp(12px, 1.45vmin + 6px, 17px)` — big touch
   targets on the kiosk, dense game-menu scale in a desktop window. Keep that contract.
7. The fault-safe money flow (reserve→commit/refund), supplies gate, token codes, and attendant
   (title gear → PIN `0000`) are product requirements — reskin freely, never remove.

## Test hooks & demo data (use these while iterating)
`window.__DYESUB_PASS_MS__ = 150` (fast print cycle) · `window.__SIMULATE_JAM__ = true` (fault path)
· `window.__IDLE_MS__ = 3000` (quick idle) · token codes `SNAP05`/`PIKA42` · attendant PIN `0000`
· Demo feed input works with no camera. Space = shutter on capture. Keys 1–4 jump screens, Esc backs out.

## Where to push next (owner said "keep nudging" — these are the open seams)
- **Dialog skin**: it wears the Unite module border now but could go further (Unite uses compact
  bottom-sheet prompts; Snap uses curved organic panels — pick a lane and polish).
- **Capture rail → Unite settings rail**: the INPUT list wants the stacked-pill/active-notch treatment,
  and the viewfinder deserves Snap's name-tag chip ("CAM LINK 4K" as a Bouffalant-style tag).
- **Sheet rail**: the stamp bag is a flat grid; Unite would give it category tabs + a horizontal scroll.
- **Score moment**: after each snap a "+80 Nice framing!" pop exists in spirit only — design the
  Snap-style evaluation card (Pose/Size/Direction bars, "New Record!" flash) on capture or in BOX.
- **Results screen**: has stat modules; Unite would add the animated double-bar and a medal.
- **Box wall**: could take wallpaper variants (the owner loves HOME's box-theme switching).
- Whatever you see — the owner explicitly grants creative latitude ("do yo thang"), with the
  references as the bar.

## Workflow expectations
Iterate in small passes: edit `v5/`, screenshot at 1366×900 AND ~390×800, verify the full loop
(title→capture→snap→box→send→sheet→print→pay→results→exports) still runs with **zero console
errors**, then commit to `fable/v5` with a message explaining the design intent, and push (PR #28
updates automatically). The full flow must never break for a skin change.
