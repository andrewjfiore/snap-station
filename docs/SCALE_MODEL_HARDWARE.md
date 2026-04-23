# Scale-model hardware

The reproduction kiosk is an ~11"x8"x6" enclosure that accepts any HDMI
input and pairs with a consumer photo printer. This document is the
standing hardware spec for the web-app kiosk host.

## Enclosure

- Outer dimensions: 11" W x 8" H x 6" D (~280 x 200 x 150 mm).
- Internal volume budget per subsystem:
  * Host SBC: 85 x 56 x 25 mm (RPi 5) plus fan + SSD tray.
  * Display: 5" or 7" HDMI IPS (800x480 or 1024x600); mounts to front
    panel with a bezel that matches the kiosk title-bar yellow.
  * Printer bay: a Selphy CP1500 is 180 x 137 x 62 mm and will NOT fit
    inside an 11x8x6 enclosure; the reproduction mounts the printer
    externally on a back shelf with the output tray facing forward so
    the 4x4 sticker sheet emerges through a slot in the front panel.
  * Speaker: 2" mono driver + Class-D amp board.
  * NFC reader (optional): 25 x 25 mm PN532 module behind the front
    panel for tap-to-pay card emulation.
  * Smart-card slot (optional): ID-1 slot cutout on the right side to
    mirror the original kiosk.

## Host options

| Host | Pros | Cons |
|---|---|---|
| Raspberry Pi 5 | Compact, cheap, CUPS/Gutenprint well supported, HDMI 4K. | Chromium perf tight with heavy CSS; needs active cooling. |
| Mac mini (Apple silicon) | Fast, silent, great display output. | Larger footprint (requires a different enclosure variant). |
| Intel NUC | Great printer and scanner support under Linux. | Fans can be audible in quiet venues. |

The web-app ships identical on all three; only `deploy/` layout differs.

## HDMI output

- Native resolution: 800x480 for 5" displays, 1024x600 for 7" displays.
- Aspect: 16:9 content letterboxed on 15:9; 4:3 gameplay renders at
  native with black side bars. See `snap-preview.js` for the in-app
  toggle.
- CRT overlay: **off** by default. When attendant enables, the scanlines
  render at integer pixel scales only (`snap-crt.css`).

## Printer

- Primary: Canon Selphy CP1500 via CUPS (`deploy/print-server/`). Hagaki
  postcard media matches the 148x100 mm layout in `snap-layouts.js`.
- Secondary (pending): Fujifilm Instax Link series. Requires Instax-
  specific layout descriptors; see `snap-printing-instax.js`.

## Payment

- v1 ships `snap-payment-providers.js` with a mock provider only.
- Production integration choices (Stripe Terminal / Square / vendor MDM)
  are called out as open questions in the main plan file.

## NFC tap-to-pay visual (non-functional in v1)

- `snap-nfc-card.js` renders the skeuomorphic card element that animates
  in after credit purchase. The card is purely visual in v1; no NFC
  hardware handshake. The PN532 module listed above is on the roadmap
  for a later phase when a real NFC credit system is chosen.

## Audio

- Selphy CP1500 prints over USB with its own confirmation chime; we do
  not drive the printer speaker. Kiosk audio (button clicks, print
  chime, attract-mode BGM) goes through HDMI or the internal speaker.
