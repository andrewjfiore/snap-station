# deploy/

Install artifacts for each supported kiosk host.

- `raspberry-pi/` - systemd units, chromium-kiosk launcher, `setup.sh`.
- `mac-mini/` - LaunchDaemon plist, `install.sh`.
- `print-server/` - shared Node HTTP bridge from the web-app to CUPS.

The web-app itself (HTML/CSS/JS files at the repo root) is identical
across hosts; only the launcher and service definitions differ.

## Sanity test after install

1. From the kiosk host: `curl http://127.0.0.1:47002/health` returns
   `{"ok":true,"version":1}`.
2. From the kiosk host: `lpstat -a` lists the Selphy as idle/accepting.
3. In Chromium, the kiosk home screen should render within 2 seconds
   of boot, with no browser chrome visible.

## Known gotchas

- The print-server runs as user `snap` on RPi and needs membership in
  the `lp` group to submit print jobs via `lp`. `setup.sh` creates the
  group binding.
- Chromium's autoplay policy defaults blocks the attract-mode YouTube
  embed's audio; `--autoplay-policy=no-user-gesture-required` is
  required on the kiosk launcher.
- On Mac mini, `pmset sleep 0 displaysleep 0` is set by `install.sh` so
  the HDMI output to the scale-model display never powers down.
