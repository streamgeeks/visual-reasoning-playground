# 03 - Gesture Control for OBS

**Module 3: From Understanding to Action**

Control OBS Studio scene switching using hand gestures detected by Moondream.

## Features

- **Gesture Detection**: Thumbs up and thumbs down detection via Moondream VLM
- **OBS WebSocket Integration**: Direct control of OBS Studio
- **Configurable Guardrails**: Confidence threshold, cooldown, debounce
- **Visual Feedback**: Real-time gesture indicators and status display
- **Camera Selection**: Switch between available cameras

## Requirements

1. **Moondream API Key** - Get one free at [console.moondream.ai](https://console.moondream.ai)
2. **OBS Studio** with WebSocket Server enabled:
   - Open OBS → Tools → WebSocket Server Settings
   - Enable WebSocket Server
   - Note the port (default: 4455)
   - Set a password if desired

## Quick Start

1. Open `index.html` in a browser (via local server for camera access)
2. Enter your Moondream API key when prompted
3. Connect to OBS using the WebSocket URL and password
4. Map gestures to scenes using the dropdowns
5. Click "Start Detection"
6. Show thumbs up or thumbs down to switch scenes!

## Guardrails Explained

| Setting | Purpose | Default |
|---------|---------|---------|
| **Confidence Threshold** | Minimum confidence to act | 80% |
| **Cooldown** | Seconds between actions | 3s |
| **Debounce** | Consecutive detections required | 2 |
| **Detection Interval** | Time between API calls | 1000ms |

## How It Works

1. **Capture**: Grabs frame from webcam
2. **Detect**: Asks Moondream "Is there a thumbs up gesture?"
3. **Decide**: Checks confidence, debounce count, cooldown
4. **Act**: Sends scene switch command to OBS via WebSocket

## Extending

To add more gestures, modify the detection loop in `app.js`:

```javascript
const peaceSign = await detectGesture('peace sign or V sign');
if (peaceSign.detected && canTriggerAction()) {
    await obsClient.switchScene('Slides');
}
```

## Related

- Book Chapter 15: OBS Integration
- OBS WebSocket Protocol: [github.com/obsproject/obs-websocket](https://github.com/obsproject/obs-websocket)

---

## Get the Book

**[Visual Reasoning AI for Broadcast and ProAV](https://visualreasoning.ai/book)** by Paul Richards - Learn to build AI-powered camera systems from the ground up.

**Resources:**
- [VisualReasoning.ai](https://visualreasoning.ai) - Book, online course, and free tools
- [Moondream](https://moondream.ai) - Vision AI powering these tools
- [PTZOptics](https://ptzoptics.com) - PTZ cameras with API control
- [StreamGeeks](https://streamgeeks.com) - Live streaming education

---

*Part of the [Visual Reasoning Playground](../README.md) by [Paul Richards](https://github.com/paulwrichards)*
