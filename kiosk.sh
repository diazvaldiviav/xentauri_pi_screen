#!/bin/bash
# =============================================================================
# XENTAURI PI SCREEN - Kiosk Mode Script
# =============================================================================
# Starts the web server and opens Chromium in kiosk mode.
# Perfect for running on Raspberry Pi boot.
#
# Usage: ./kiosk.sh [port]
# =============================================================================

PORT=${1:-8080}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URL="http://localhost:$PORT"

echo "Starting Xentauri Pi Screen in kiosk mode..."

# Start web server in background
cd "$SCRIPT_DIR"
python3 -m http.server $PORT &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Hide mouse cursor (if unclutter is installed)
if command -v unclutter &> /dev/null; then
    unclutter -idle 0.1 -root &
fi

# Disable screen blanking
xset s off
xset -dpms
xset s noblank

# Start Chromium in kiosk mode
chromium-browser \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    --disable-translate \
    --no-first-run \
    --fast \
    --fast-start \
    --disable-features=TranslateUI \
    "$URL"

# When Chromium closes, stop the server
kill $SERVER_PID 2>/dev/null
