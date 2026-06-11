#!/usr/bin/env bash
# Launch chromium in kiosk mode against the local static files. Displays
# over HDMI to the scale-model screen; no window chrome, no cursor idle.

set -eu

export DISPLAY=${DISPLAY:-:0}

# Hide the mouse cursor after 0.1s of inactivity.
unclutter -idle 0.1 -root &

# Disable screen-saver + DPMS so the kiosk never blanks.
xset s off
xset -dpms
xset s noblank

URL="file:///opt/snap-station/index.html"

exec chromium-browser \
    --kiosk "${URL}" \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-features=TranslateUI \
    --autoplay-policy=no-user-gesture-required \
    --check-for-update-interval=604800 \
    --overscroll-history-navigation=0 \
    --disable-pinch \
    --no-first-run \
    --force-device-scale-factor=1
