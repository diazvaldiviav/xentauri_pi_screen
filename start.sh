#!/bin/bash
# =============================================================================
# XENTAURI PI SCREEN - Start Script
# =============================================================================
# Usage: ./start.sh [port]
# Default port: 8080
#
# This script serves the Xentauri Pi Screen web client via HTTP.
# WebSocket connections require HTTP/HTTPS (not file://)
# =============================================================================

PORT=${1:-8080}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=============================================="
echo "  XENTAURI PI SCREEN"
echo "=============================================="
echo ""
echo "Starting web server..."
echo "  Directory: $SCRIPT_DIR"
echo "  Port: $PORT"
echo ""
echo "Open in browser: http://localhost:$PORT"
echo "Or from another device: http://$(hostname -I | awk '{print $1}'):$PORT"
echo ""
echo "Press Ctrl+C to stop"
echo "=============================================="
echo ""

cd "$SCRIPT_DIR"
python3 -m http.server $PORT
