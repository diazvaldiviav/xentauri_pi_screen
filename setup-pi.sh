#!/bin/bash
# =============================================================================
# XENTAURI PI SCREEN - Raspberry Pi Setup Script
# =============================================================================
# Run this script once on your Raspberry Pi to set up everything.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main/xentauri_pi_screen/setup-pi.sh | bash
#   OR
#   ./setup-pi.sh
# =============================================================================

set -e

echo "=============================================="
echo "  XENTAURI PI SCREEN - SETUP"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="$HOME/xentauri_pi_screen"
SERVICE_NAME="xentauri-screen"
PORT=8080

# -----------------------------------------------------------------------------
# Step 1: Update system
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[1/5] Updating system packages...${NC}"
sudo apt-get update -qq

# -----------------------------------------------------------------------------
# Step 2: Install dependencies
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[2/5] Installing dependencies...${NC}"
sudo apt-get install -y -qq python3 chromium-browser unclutter

# -----------------------------------------------------------------------------
# Step 3: Create systemd service for web server
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[3/5] Creating systemd service...${NC}"

sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null << EOF
[Unit]
Description=Xentauri Pi Screen Web Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/python3 -m http.server $PORT
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# -----------------------------------------------------------------------------
# Step 4: Create kiosk autostart script
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[4/5] Creating kiosk autostart...${NC}"

mkdir -p ~/.config/autostart

# Autostart for web server
tee ~/.config/autostart/xentauri-screen.desktop > /dev/null << EOF
[Desktop Entry]
Type=Application
Name=Xentauri Screen Server
Exec=/usr/bin/python3 -m http.server $PORT
Path=$INSTALL_DIR
Terminal=false
EOF

# Autostart for Chromium kiosk
tee ~/.config/autostart/xentauri-kiosk.desktop > /dev/null << EOF
[Desktop Entry]
Type=Application
Name=Xentauri Kiosk
Exec=/bin/bash -c 'sleep 5 && chromium-browser --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --disable-restore-session-state http://localhost:$PORT'
Terminal=false
EOF

# Autostart for unclutter (hide mouse cursor)
tee ~/.config/autostart/unclutter.desktop > /dev/null << EOF
[Desktop Entry]
Type=Application
Name=Unclutter
Exec=unclutter -idle 0.1 -root
Terminal=false
EOF

# -----------------------------------------------------------------------------
# Step 5: Enable and start service
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[5/5] Enabling service...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}.service

# -----------------------------------------------------------------------------
# Done!
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}=============================================="
echo "  SETUP COMPLETE!"
echo "==============================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "  1. Clone/copy your code to: $INSTALL_DIR"
echo ""
echo "  2. Start the service:"
echo "     sudo systemctl start ${SERVICE_NAME}"
echo ""
echo "  3. Open browser:"
echo "     http://localhost:$PORT"
echo ""
echo "  4. For kiosk mode, reboot:"
echo "     sudo reboot"
echo ""
echo "Useful commands:"
echo "  - Check status:  sudo systemctl status ${SERVICE_NAME}"
echo "  - View logs:     journalctl -u ${SERVICE_NAME} -f"
echo "  - Stop service:  sudo systemctl stop ${SERVICE_NAME}"
echo "  - Restart:       sudo systemctl restart ${SERVICE_NAME}"
echo ""
