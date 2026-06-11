# Sticker Printing Guide

How to get a composed sheet from the screen onto sticker paper, and how to kiss-cut it.

## The geometry (why prints must not be scaled)

Every export is built on the original Snap Station's measured geometry:

- Sheet: 4 × 6 in (152.4 × 101.6 mm) landscape — or hagaki 148 × 100 mm, or US Letter at 2.2× scale
- Grid: 4 × 4 stickers, total image area **109.4 × 83 mm** (matches the original hardware print)
- Cell (backing): 26.6 × 20 mm, 1 mm gaps
- Kiss-cut: 24.1 × 17.5 mm rounded rect, r = 2.75 mm, inset 1.25 mm sides / 0.833 mm top / 1.667 mm bottom

**Golden rule: never let a print dialog "fit", "shrink", or "fill" the page.** Print at 100% /
actual size, borderless, on the exact paper size selected in the app — otherwise the cut file
will not line up.

## Printing (home / kiosk)

1. In the composer choose paper (4×6 recommended), compose, then **Print**.
2. In the system dialog: select the matching paper size, set margins to none/borderless,
   scale 100%, and set the driver's **media type to match the actual paper** (glossy photo
   paper ≠ plain — a mismatch is the classic cause of slow, dark, or banded prints).
3. Sticker media: full-sheet 4×6 sticker/label photo paper (glossy works best for the
   original look).

### Printer findings from the project log (Canon PIXMA PRO-100)

- Prefer the **USB** printer instance; keep Wi-Fi/LPR as backup — Wi-Fi was implicated in
  very slow spooling.
- Print from a lightweight app path (the app's Print button or a basic image viewer);
  the Windows Photos app added minutes of preprocessing in testing.
- If prints are slow, walk this matrix one variable at a time:
  plain vs glossy media setting → 4×6 vs Letter page size → Standard vs High quality →
  USB vs Wi-Fi. Record times; the slow leg is usually media-type mismatch or the app.
- Canon Selphy CP1500 (kiosk target) prints hagaki natively — use `deploy/print-server/`
  and set the print-server URL in the attendant drawer.

## Cricut Design Space (Print Then Cut)

1. Export **Cricut/Silhouette SVG** — this single file contains the print raster and the
   kiss-cut paths already aligned to one coordinate system.
2. Upload to Design Space (Canvas → Upload → SVG). The design arrives as a print layer with
   attached cut paths; if the layers import separated, select all → **Attach**.
3. Choose **Print Then Cut**. Design Space prints with its own registration box — let it.
4. Print on the sticker sheet at 100% (no scaling), load the printed sheet on the mat,
   and set pressure for **kiss-cut** (cut vinyl/sticker layer only, not the backing):
   start with the "Washi/Sticker Paper" preset and test one corner sticker first.
5. If Design Space rejects the SVG (size limits), re-export — the app embeds the raster as
   JPEG (quality 0.92); reducing paper size or using the cut-only template + manual print
   alignment is the fallback.

## Silhouette Studio

1. Export the same combined SVG (Studio Business Edition opens SVG directly) — or export
   **Cut-only SVG (with registration marks)** and print the sheet separately from the app.
2. Use Studio's Print & Cut registration workflow; the registration-mark variant places
   crosses 5 mm from the corners.
3. Kiss-cut settings: blade 1–2, low force; test a corner first.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Cuts offset uniformly | Print was scaled | Reprint at 100% / actual size |
| Cuts drift across the sheet | Sheet loaded skewed | Square the sheet on the mat / re-run registration |
| Print very slow | Media-type mismatch, heavyweight app, or Wi-Fi spooling | Match media type; print from the app; use USB |
| Colors washed out | Plain-paper profile on glossy media | Set glossy media type in the driver |
| Cut through the backing | Through-cut force | Use kiss-cut preset, reduce force |
