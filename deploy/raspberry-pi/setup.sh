#!/usr/bin/env bash
# Raspberry Pi OS setup for a Pokemon Snap Station kiosk host.
# Tested on Raspberry Pi OS Bookworm (64-bit) on RPi 4 / RPi 5.
#
# What this does:
#   * Installs chromium, nodejs, cups, gutenprint.
#   * Copies the web-app static files to /opt/snap-station/.
#   * Installs the print-server as a systemd service.
#   * Installs the chromium kiosk as a user systemd service under the
#     `kiosk` user (create the user separately if needed).
#
# Usage:  sudo ./deploy/raspberry-pi/setup.sh /path/to/snap-station/checkout

set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
    echo "run as root" >&2
    exit 1
fi

SRC=${1:-/opt/snap-station-src}
if [[ ! -d ${SRC} ]]; then
    echo "snap-station checkout not found at ${SRC}" >&2
    exit 1
fi

apt-get update
apt-get install -y --no-install-recommends \
    chromium-browser \
    nodejs \
    cups cups-client printer-driver-gutenprint \
    xserver-xorg xinit openbox x11-xserver-utils unclutter

install -d -o root -g root -m 0755 /opt/snap-station
cp -r "${SRC}"/*.html "${SRC}"/*.css "${SRC}"/*.js "${SRC}"/lib /opt/snap-station/

install -D -m 0644 "${SRC}/deploy/raspberry-pi/snap-print-server.service" \
    /etc/systemd/system/snap-print-server.service
install -D -m 0644 "${SRC}/deploy/raspberry-pi/snap-kiosk.service" \
    /etc/systemd/system/snap-kiosk.service
install -D -m 0755 "${SRC}/deploy/raspberry-pi/chromium-kiosk.sh" \
    /opt/snap-station/chromium-kiosk.sh
install -D -m 0644 "${SRC}/deploy/print-server/server.js" \
    /opt/snap-station/print-server.js

systemctl daemon-reload
systemctl enable --now snap-print-server.service
systemctl enable snap-kiosk.service

echo "Snap Station kiosk installed. Reboot to start chromium kiosk."
