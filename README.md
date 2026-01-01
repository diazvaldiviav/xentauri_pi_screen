# Xentauri Pi Screen Client

Real Raspberry Pi screen client for Xentauri Cloud Core. This is a standalone JavaScript application that connects to the Xentauri backend via WebSocket and renders dynamic Scene Graphs on a Raspberry Pi display.

## Features

- **Pure JavaScript** - No build tools or frameworks required
- **WebSocket Connection** - Real-time communication with Xentauri Cloud
- **Pairing Flow** - Easy 6-character code pairing from iOS app
- **Automatic Reconnection** - Exponential backoff with jitter
- **Scene Graph Rendering** - Dynamic layouts with 17 component types
- **State Persistence** - Restores content after refresh/reboot
- **Kiosk Mode Ready** - Designed for Chromium fullscreen operation

## Quick Start

### Development (Mac/PC)

> **IMPORTANT:** Do NOT open `index.html` directly (`file://`). WebSocket connections are blocked by browsers from `file://` URLs.

```bash
# Start local server
./start.sh

# Open in browser
open http://localhost:8080
```

### Raspberry Pi Deployment

```bash
# 1. Clone the repo on your Pi
git clone https://github.com/YOUR_USER/YOUR_REPO.git
cd YOUR_REPO/xentauri_pi_screen

# 2. Run setup (one-time)
./setup-pi.sh

# 3. Start in kiosk mode
./kiosk.sh
```

---

## Pairing Flow

1. **Create a device** in the Xentauri iOS app (or via API)
2. **Get the 6-character pairing code** displayed in the app
3. **Enter the code** on the Pi screen's pairing page
4. **Done!** The device connects automatically

The agent ID is generated automatically and stored in `localStorage`.

---

## Scripts

| Script | Description |
|--------|-------------|
| `start.sh` | Start web server for development |
| `setup-pi.sh` | One-time Raspberry Pi setup (creates systemd service) |
| `kiosk.sh` | Start in fullscreen kiosk mode |

### start.sh
```bash
./start.sh [port]  # Default: 8080
```

### setup-pi.sh
Installs dependencies and creates:
- Systemd service for auto-start
- Chromium kiosk autostart
- Unclutter for hiding cursor

### kiosk.sh
```bash
./kiosk.sh [port]  # Start server + Chromium fullscreen
```

---

## Raspberry Pi Setup (Detailed)

### Hardware Requirements

- Raspberry Pi 3B+ or newer (4 recommended)
- HDMI display (1920x1080 recommended)
- SD card (16GB+)
- Power supply
- Network connection (WiFi or Ethernet)

### Software Setup

#### 1. Install Raspberry Pi OS

Download and flash **Raspberry Pi OS with Desktop** (64-bit) using Raspberry Pi Imager.

Configure during imaging:
- Username/password
- WiFi credentials
- SSH enabled

#### 2. Clone Repository

```bash
ssh pi@raspberrypi.local

# Clone your repo
git clone https://github.com/YOUR_USER/YOUR_REPO.git
cd YOUR_REPO/xentauri_pi_screen
```

#### 3. Run Setup

```bash
chmod +x *.sh
./setup-pi.sh
```

#### 4. Start Service

```bash
sudo systemctl start xentauri-screen
```

#### 5. Open Browser

Navigate to `http://localhost:8080` and enter the pairing code.

#### 6. Enable Kiosk Mode (Auto-boot)

```bash
sudo reboot
```

After reboot, Chromium opens in fullscreen automatically.

---

## File Structure

```
xentauri_pi_screen/
├── index.html              # Main entry point
├── start.sh                # Development server script
├── setup-pi.sh             # Raspberry Pi setup script
├── kiosk.sh                # Kiosk mode launcher
├── css/
│   ├── main.css            # Base styles
│   ├── components.css      # Component-specific styles
│   └── themes.css          # Theme configuration
├── js/
│   ├── config.js           # Configuration (URLs, settings)
│   ├── app.js              # Main application controller
│   ├── pairing/
│   │   └── service.js      # Pairing API client
│   ├── websocket/
│   │   └── client.js       # WebSocket connection manager
│   ├── renderer/
│   │   ├── scene.js        # Scene Graph renderer
│   │   └── components.js   # Component renderers (17 types)
│   └── utils/
│       └── helpers.js      # Utility functions
└── README.md
```

---

## Configuration

Edit `js/config.js`:

| Option | Description | Default |
|--------|-------------|---------|
| `BACKEND_URL` | Backend server URL | `https://xentauri-cloud-core.fly.dev` |
| `HEARTBEAT_INTERVAL` | Heartbeat frequency (ms) | `30000` |
| `CLOCK_FORMAT` | Clock display format | `'12h'` |
| `WEATHER_UNITS` | Temperature units | `'fahrenheit'` |
| `DEBUG` | Enable debug logging | `true` |
| `PERSIST_CONTENT` | Save state for restore | `true` |

---

## Supported Components

### Calendar (6)
- `calendar_day` - Daily agenda view
- `calendar_week` - Weekly view
- `calendar_month` - Monthly overview
- `calendar_widget` - Compact sidebar widget
- `calendar_agenda` - List of upcoming events
- `meeting_detail` - Single meeting details

### Utility (7)
- `clock_digital` - Digital clock with date
- `clock_analog` - Analog clock face
- `weather_current` - Current weather display
- `countdown_timer` - Live countdown
- `event_countdown` - Event-specific countdown
- `text_block` - Text content display
- `spacer` - Layout spacing

### Content (4)
- `image_display` - Image rendering
- `web_embed` - Iframe embed
- `doc_summary` - Document summary with AI content
- `doc_preview` - Document preview

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `ESC` | Clear content, show idle screen |
| `F` | Toggle fullscreen |
| `R` | Force WebSocket reconnect |
| `D` | Log debug info to console |
| `Shift+U` | Unpair device |

---

## WebSocket Protocol

### Messages from Server

```javascript
// Connection confirmed
{ "type": "connected", "device_id": "...", "message": "..." }

// Command to execute
{
    "type": "command",
    "command_id": "uuid",
    "command_type": "display_scene|show_content|clear_content|power_off",
    "parameters": { ... }
}

// Heartbeat acknowledgment
{ "type": "heartbeat_ack", "timestamp": "..." }
```

### Messages to Server

```javascript
// Command acknowledgment
{ "type": "ack", "command_id": "uuid", "status": "completed" }

// Heartbeat
{ "type": "heartbeat" }
```

---

## Troubleshooting

### WebSocket Connection Fails

**Error:** `WebSocket opening handshake timed out`

**Cause:** Opening `index.html` directly as `file://`

**Solution:** Use the web server:
```bash
./start.sh
# Then open http://localhost:8080
```

### Pairing Code Invalid

1. Make sure the code is exactly 6 characters
2. Codes expire after 15 minutes - generate a new one
3. Check network connectivity to backend

### Screen Goes Blank

```bash
# Add to kiosk.sh or startup
xset s off
xset -dpms
xset s noblank
```

### Cursor Visible

```bash
sudo apt install unclutter
unclutter -idle 0.1 -root &
```

### Check Service Status

```bash
sudo systemctl status xentauri-screen
journalctl -u xentauri-screen -f
```

---

## Service Management

```bash
# Start service
sudo systemctl start xentauri-screen

# Stop service
sudo systemctl stop xentauri-screen

# Restart service
sudo systemctl restart xentauri-screen

# Check status
sudo systemctl status xentauri-screen

# View logs
journalctl -u xentauri-screen -f
```

---

## License

This is part of the Xentauri project.

---

*Last updated: January 2026*
