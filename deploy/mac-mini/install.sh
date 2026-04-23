#!/usr/bin/env bash
# Mac mini installer. Targets a dedicated kiosk user account and
# configures Chrome in kiosk mode via LaunchAgent. Also disables idle
# sleep so the HDMI output stays live.
#
# Usage (run from the repo root):
#   sudo ./deploy/mac-mini/install.sh

set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
    echo "run as root" >&2
    exit 1
fi

SRC=$(pwd)
install -d -o root -g wheel -m 0755 /opt/snap-station
cp -r "${SRC}"/*.html "${SRC}"/*.css "${SRC}"/*.js "${SRC}"/lib /opt/snap-station/
cp "${SRC}/deploy/print-server/server.js" /opt/snap-station/print-server.js

cat > /opt/snap-station/launch-kiosk.sh <<'SH'
#!/usr/bin/env bash
set -eu
node /opt/snap-station/print-server.js &
sleep 1
open -n -a "Google Chrome" --args \
    --kiosk \
    --app=file:///opt/snap-station/index.html \
    --autoplay-policy=no-user-gesture-required \
    --disable-pinch
SH
chmod +x /opt/snap-station/launch-kiosk.sh

install -D -m 0644 "${SRC}/deploy/mac-mini/com.snapstation.kiosk.plist" \
    /Library/LaunchDaemons/com.snapstation.kiosk.plist

# Keep the mini awake and keep the HDMI output alive.
pmset -c sleep 0 displaysleep 0 disksleep 0

launchctl load -w /Library/LaunchDaemons/com.snapstation.kiosk.plist

echo "Snap Station kiosk installed on Mac mini."
