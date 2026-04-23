# Phase 3 integration notes

New files added in this phase are additive; wiring them into the existing
HTML is a small, separate edit left for a follow-up commit to keep this
commit scan-ably small.

## Wiring

In `snap-station.html` `<head>`, after the existing `snap-station.css`
link, add:

```html
<link rel="stylesheet" href="snap-crt.css">
```

At the bottom of `snap-station.html`, before `snap-station.js`, add:

```html
<script src="snap-layouts.js" defer></script>
<script src="snap-capture.js" defer></script>
```

The same two scripts should be added to `sticker-sheet.html` if that
page is going to consume the layout descriptors.

## CRT toggle

Default state is CRT off. Add a UI toggle that flips
`document.querySelector('.video-container').classList.toggle('crt-on')`.
The new CSS cancels the previous fractional-pixel scanline, so removing
`crt-on` leaves a clean video with no shimmer.

## Layout consumer

Replace hard-coded sticker-grid geometry with calls to
`SnapLayouts.getLayout('4x4')`. The returned object is:

```js
{
  name, cols, rows, count, dpi,
  sheetPx: { w, h },
  sheetMm: { w, h },
  cells: [{ index, backing: {x,y,w,h}, cut: {x,y,w,h,radius} }, ...]
}
```

`cells` is ordered row-major, so `cells[0]` is top-left.

## Tests

`tests/layouts.spec.js` runs under the existing Playwright config with
no changes.

`tests/compositor-parity.spec.js` expects `snap-station-emu` checked
out as a sibling directory. If absent, the test skips rather than
fails so the suite stays green on forks that do not clone the emu repo.
