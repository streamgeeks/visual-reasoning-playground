# Tool #8: PTZ Framing Assistant

**Auto-frame subjects using AI detection + PTZ camera control**

Part of the [Visual Reasoning Playground](https://github.com/StreamGeeks/visual-reasoning-playground)

## Overview

The PTZ Framing Assistant automatically tracks and frames subjects using:
- **Moondream AI** for real-time object detection
- **PTZOptics cameras** for pan, tilt, and zoom control

Simply specify what you want to track (person, face, speaker, etc.) and the camera will automatically keep it centered in frame.

## Features

- **Auto-Framing**: Continuously detects target object and adjusts camera position
- **Zoom Presets**: Wide, Medium, and Tight framing options
- **Manual PTZ Control**: Direct pan/tilt/zoom buttons for fine adjustment
- **Detection Overlay**: Visual feedback showing detected objects
- **Center Crosshair**: Reference point for framing
- **Deadzone**: Prevents jitter by ignoring small offsets

## Requirements

1. **Moondream API Key** - Get one at [console.moondream.ai](https://console.moondream.ai)
2. **PTZOptics Camera** - Any model with HTTP API support
3. **Webcam or Video Source** - For displaying camera feed (can be NDI or capture card)

## Setup

### 1. Configure Video Source

Select your camera or video input from the dropdown. This can be:
- USB webcam viewing the PTZ output
- NDI source via NDI Virtual Input
- Capture card showing PTZ camera feed

### 2. Connect PTZ Camera

Enter your PTZOptics camera's IP address and click "Test" to verify connection.

The camera must be on the same network and have HTTP control enabled.

#### HTTP Authentication

If your PTZOptics camera has HTTP authentication enabled, you must check the "Enable HTTP Authentication" checkbox and enter your credentials:

| Setting | Description |
|---------|-------------|
| Enable HTTP Authentication | Check this if your camera requires login |
| Username | Your camera's HTTP username (default: `admin`) |
| Password | Your camera's HTTP password (default: `admin`) |

**How to check if authentication is required:**
1. Open a browser and go to `http://<camera-ip>/cgi-bin/ptzctrl.cgi?ptzcmd&ptzstop`
2. If you see a login prompt, authentication is enabled
3. If the page loads without a prompt, authentication is disabled

**Note:** Credentials are stored locally in your browser for convenience. For production use, consider your security requirements.

### 3. Set Target Object

Enter what you want to track:
- `person` - Track any person in frame
- `face` - Track a face (tighter framing)
- `speaker` - Track the person speaking
- `hand` - Track hand gestures
- Custom descriptions work too!

### 4. Choose Zoom Preset

- **Wide**: Full room view
- **Medium**: Standard framing
- **Tight**: Close-up shot

### 5. Start Auto-Framing

Click "Auto-Frame" to begin. The camera will:
1. Detect the target object using Moondream
2. Calculate offset from frame center
3. Send PTZ commands to center the object
4. Repeat continuously until stopped

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│                    Detection Loop                        │
├──────────────────────────────────────────────────────────┤
│  1. Capture frame from video                            │
│  2. Send to Moondream /detect API                       │
│  3. Get bounding box coordinates (normalized 0-1)       │
│  4. Calculate center point of detection                 │
│  5. Compare to frame center (0.5, 0.5)                  │
│  6. If offset > deadzone:                               │
│     - Pan left/right to correct X offset                │
│     - Tilt up/down to correct Y offset                  │
│  7. Repeat every 500ms                                  │
└──────────────────────────────────────────────────────────┘
```

## PTZOptics API Reference

The app uses the PTZOptics HTTP API:

| Command | URL Pattern |
|---------|-------------|
| Pan Right | `/cgi-bin/ptzctrl.cgi?ptzcmd&right&{speed}&{speed}` |
| Pan Left | `/cgi-bin/ptzctrl.cgi?ptzcmd&left&{speed}&{speed}` |
| Tilt Up | `/cgi-bin/ptzctrl.cgi?ptzcmd&up&{speed}&{speed}` |
| Tilt Down | `/cgi-bin/ptzctrl.cgi?ptzcmd&down&{speed}&{speed}` |
| Stop | `/cgi-bin/ptzctrl.cgi?ptzcmd&ptzstop` |
| Zoom In | `/cgi-bin/ptzctrl.cgi?ptzcmd&zoomin&{speed}` |
| Zoom Out | `/cgi-bin/ptzctrl.cgi?ptzcmd&zoomout&{speed}` |
| Absolute Zoom | `/cgi-bin/ptzctrl.cgi?ptzctrl&abszoom&{position}` |

## Tuning Parameters

In `app.js`, you can adjust:

```javascript
// Zoom preset values (0-16384 for PTZOptics)
const ZOOM_PRESETS = {
    wide: 0,
    medium: 4000,
    tight: 10000
};

// Deadzone - how close to center before moving (0.08 = 8%)
const deadzone = 0.08;

// Detection interval (milliseconds)
const loopDelay = 500;

// PTZ movement duration (milliseconds)
const moveDuration = 150;
```

## Tips

1. **Start Wide**: Begin with the Wide preset to easily find your subject
2. **Good Lighting**: Detection works better with adequate lighting
3. **Stable Network**: Use wired ethernet for reliable PTZ control
4. **Adjust Speed**: Modify PTZ speed in `ptz-controller.js` for smoother tracking
5. **Multiple Subjects**: If multiple objects detected, it tracks the first one

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Camera not connecting | Check IP address, ensure camera is on same network |
| PTZ commands not working | Enable HTTP Authentication and enter credentials |
| Manual controls unresponsive | Camera likely requires auth - check "Enable HTTP Authentication" |
| "Connection failed" error | Verify IP, check if camera requires authentication |
| Jerky movement | Increase deadzone value, reduce PTZ speed |
| Object not detected | Try different target description, improve lighting |
| Slow response | Reduce video resolution, check API rate limits |

## Related

- [Module 5 Slides](../../course/slide-decks/module-05-framing-color.md)
- [PTZOptics API Documentation](https://ptzoptics.com/api)
- [Moondream API Reference](https://docs.moondream.ai)

---

*From "Visual Reasoning AI for Broadcast and ProAV" by Paul Richards*
