# Xentauri Pi Screen Client

Real Raspberry Pi screen client for Xentauri Cloud Core. This is a standalone JavaScript application that connects to the Xentauri backend via WebSocket and renders dynamic Scene Graphs on a Raspberry Pi display.

## Features

- **Pure JavaScript** - No build tools or frameworks required
- **WebSocket Connection** - Real-time communication with Xentauri Cloud
- **Automatic Reconnection** - Exponential backoff with jitter
- **Scene Graph Rendering** - Dynamic layouts with 17 component types
- **State Persistence** - Restores content after refresh/reboot
- **Kiosk Mode Ready** - Designed for Chromium fullscreen operation

## Quick Start

### 1. Configure Agent ID

Edit `js/config.js` and set your device's agent ID:

```javascript
AGENT_ID: 'your-device-agent-id-here',
```

To get your agent ID:
1. Create a device in the Xentauri backend
2. Pair the device using the iOS app or API
3. The agent_id will be assigned during pairing

### 2. Test Locally

Open `index.html` in a browser to test the connection.

### 3. Deploy to Raspberry Pi

Copy the entire `xentauri_pi_screen/` folder to your Raspberry Pi.

## Raspberry Pi Setup

### Hardware Requirements

- Raspberry Pi 3B+ or newer (4 recommended)
- HDMI display (1920x1080 recommended)
- SD card (16GB+)
- Power supply
- Network connection (WiFi or Ethernet)

### Software Setup

#### 1. Install Raspberry Pi OS Lite

Download and flash Raspberry Pi OS Lite (64-bit) using Raspberry Pi Imager.

#### 2. Enable SSH and Configure WiFi

During imaging, configure:
- Username/password
- WiFi credentials
- SSH enabled

#### 3. Install Required Packages

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install X11 and Chromium
sudo apt install -y xorg chromium-browser unclutter

# Optional: Install for auto-login
sudo apt install -y lightdm
```

#### 4. Copy Screen Client

```bash
# From your local machine
scp -r xentauri_pi_screen/ pi@raspberrypi.local:/home/pi/
```

#### 5. Create Startup Script

Create `/home/pi/start_xentauri.sh`:

```bash
#!/bin/bash

# Wait for network
sleep 5

# Disable screen blanking
xset s off
xset -dpms
xset s noblank

# Hide cursor
unclutter -idle 0 &

# Start Chromium in kiosk mode
chromium-browser \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    --no-first-run \
    --start-fullscreen \
    --disable-translate \
    --disable-features=TranslateUI \
    --autoplay-policy=no-user-gesture-required \
    /home/pi/xentauri_pi_screen/index.html
```

Make executable:
```bash
chmod +x /home/pi/start_xentauri.sh
```

#### 6. Configure Auto-Start

Create `/home/pi/.xinitrc`:

```bash
#!/bin/bash
exec /home/pi/start_xentauri.sh
```

Create `~/.bash_profile`:

```bash
if [[ -z $DISPLAY ]] && [[ $(tty) = /dev/tty1 ]]; then
    startx
fi
```

#### 7. Enable Auto-Login

```bash
sudo raspi-config
# System Options > Boot / Auto Login > Console Autologin
```

#### 8. Reboot

```bash
sudo reboot
```

## File Structure

```
xentauri_pi_screen/
├── index.html              # Main entry point
├── css/
│   ├── main.css            # Base styles
│   ├── components.css      # Component-specific styles
│   └── themes.css          # Theme configuration
├── js/
│   ├── config.js           # Configuration (AGENT_ID, URLs)
│   ├── app.js              # Main application controller
│   ├── websocket/
│   │   └── client.js       # WebSocket connection manager
│   ├── renderer/
│   │   ├── scene.js        # Scene Graph renderer
│   │   └── components.js   # Component renderers (17 types)
│   └── utils/
│       └── helpers.js      # Utility functions
└── README.md
```

## Configuration Options

Edit `js/config.js`:

| Option | Description | Default |
|--------|-------------|---------|
| `AGENT_ID` | Device agent ID (required) | - |
| `BACKEND_URL` | Backend server URL | `https://xentauri-cloud-core.fly.dev` |
| `HEARTBEAT_INTERVAL` | Heartbeat frequency (ms) | `30000` |
| `CLOCK_FORMAT` | Clock display format | `'12h'` |
| `WEATHER_UNITS` | Temperature units | `'fahrenheit'` |
| `DEBUG` | Enable debug logging | `true` |
| `PERSIST_CONTENT` | Save state for restore | `true` |

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

## Keyboard Shortcuts (Development)

| Key | Action |
|-----|--------|
| `ESC` | Clear content, show idle screen |
| `F` | Toggle fullscreen |
| `R` | Force WebSocket reconnect |
| `D` | Log debug info to console |

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

## Troubleshooting

### Connection Issues

1. Verify `AGENT_ID` is correct in `config.js`
2. Check network connectivity: `ping xentauri-cloud-core.fly.dev`
3. Open browser console to see connection logs
4. Verify device is paired in the backend

### Display Issues

1. Check Chromium is installed: `chromium-browser --version`
2. Verify X11 is running: `echo $DISPLAY`
3. Check file permissions on scripts

### Screen Blanking

If the screen goes blank:
```bash
# Add to startup script
xset s off
xset -dpms
xset s noblank
```

### Cursor Visible

Install and run unclutter:
```bash
sudo apt install unclutter
unclutter -idle 0 &
```

## Development

To test locally without a Pi:

1. Open `index.html` in Chrome
2. Open DevTools (F12) to see logs
3. The connection overlay will show status
4. Use keyboard shortcuts for testing

## License

This is part of the Xentauri project.

---

*Last updated: December 2025*
