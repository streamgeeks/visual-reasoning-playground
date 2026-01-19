# Visual Reasoning AI for OBS

[![OBS Studio](https://img.shields.io/badge/OBS%20Studio-28%2B-302E31?logo=obs-studio)](https://obsproject.com)
[![Moondream](https://img.shields.io/badge/Powered%20by-Moondream-blue)](https://moondream.ai)
[![Visual Reasoning](https://img.shields.io/badge/Learn%20More-VisualReasoning.ai-green)](https://visualreasoning.ai)

**AI-powered scene control for OBS Studio** - Control your stream with gestures, get live scene descriptions, and auto-switch scenes based on what the camera sees.

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Webcam    │────▶│  Moondream AI   │────▶│   OBS Studio    │
│   Feed      │     │  Visual Reason  │     │   Auto-Control  │
└─────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Features

### 1. Gesture Control
Control OBS with hand gestures - no keyboard needed!
- **Thumbs Up** → Switch to Scene 1 (configurable)
- **Thumbs Down** → Switch to Scene 2 (configurable)
- **Open Palm** → Start/Stop Recording
- Configurable cooldown and debounce

### 2. Live Scene Descriptions
AI describes what your camera sees in real-time.
- Continuous scene narration
- Activity feed showing what's happening
- Great for accessibility and logging

### 3. Auto-Switch (Keyword Triggers)
Automatically switch scenes based on what AI sees.
- "When AI sees **'person at whiteboard'** → Switch to **Wide Shot**"
- "When AI sees **'close-up of document'** → Switch to **Document Cam**"
- Fully customizable keyword → scene mappings

---

## Installation

### Step 1: Get Your API Key
1. Go to [console.moondream.ai](https://console.moondream.ai)
2. Sign up (free tier available)
3. Copy your API key

### Step 2: Add to OBS as Browser Dock

**Option A: Use Hosted Version (Easiest)**
1. Open OBS Studio
2. Go to **View → Docks → Custom Browser Docks**
3. Add a new dock:
   - **Dock Name**: `Visual Reasoning AI`
   - **URL**: `https://streamgeeks.github.io/visual-reasoning-playground/obs-visual-reasoning/`
4. Click **Apply**
5. The dock will appear - drag it to your preferred location

**Option B: Run Locally**
1. Clone this repository
2. Serve locally:
   ```bash
   cd visual-reasoning-playground
   npx serve .
   ```
3. In OBS: **View → Docks → Custom Browser Docks**
4. Add dock with URL: `http://localhost:3000/obs-visual-reasoning/`

### Step 3: Configure
1. In the dock, click **Settings** (gear icon)
2. Enter your Moondream API key
3. OBS connection should auto-detect (localhost:4455)
4. If needed, enter OBS WebSocket password

---

## OBS WebSocket Setup

This plugin requires OBS WebSocket (included in OBS 28+).

1. Open OBS Studio
2. Go to **Tools → WebSocket Server Settings**
3. Check **Enable WebSocket Server**
4. Note the port (default: 4455)
5. Optionally set a password

---

## Usage Guide

### Gesture Control
1. Click the **Gestures** tab
2. Map gestures to OBS actions:
   - Select gesture (Thumbs Up, Thumbs Down, etc.)
   - Choose action (Switch Scene, Start Recording, etc.)
3. Click **Start Detection**
4. Show gestures to your webcam!

### Scene Descriptions
1. Click the **Describe** tab
2. Toggle **Auto-Describe** on
3. AI will continuously describe what it sees
4. Descriptions appear in the activity feed

### Auto-Switch Rules
1. Click the **Auto-Switch** tab
2. Add a rule:
   - **When AI sees**: Enter keywords (e.g., "whiteboard", "standing")
   - **Switch to**: Select target scene
3. Toggle the rule **On**
4. AI monitors scene descriptions and triggers switches

---

## Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| Detection Interval | 2000ms | How often to analyze the scene |
| Confidence Threshold | 70% | Minimum confidence to trigger action |
| Cooldown | 5s | Wait time between actions |
| Debounce | 2 | Consecutive detections required |

---

## Troubleshooting

### "Cannot connect to OBS"
- Ensure OBS is running
- Check WebSocket is enabled (Tools → WebSocket Server Settings)
- Verify port matches (default 4455)
- If using password, enter it in the dock settings

### "Camera not detected"
- Allow browser access to camera when prompted
- Check camera isn't in use by another app
- Try refreshing the dock (right-click → Refresh)

### "AI not responding"
- Verify API key is correct
- Check internet connection
- Moondream API might be rate-limited (free tier)

---

## API Costs

This plugin uses the [Moondream API](https://moondream.ai). Costs depend on usage:

| Feature | API Calls | Estimated Cost |
|---------|-----------|----------------|
| Gesture Detection | 1 per check | ~$0.001 each |
| Scene Description | 1 per description | ~$0.001 each |
| Auto-Switch | 1 per check | ~$0.001 each |

**Tip**: Increase detection interval to reduce costs.

---

## Privacy

- Video is processed frame-by-frame via Moondream's cloud API
- Frames are not stored by Moondream
- API key is stored locally in your browser
- No data is sent to StreamGeeks servers

---

## Learn More

This plugin is part of the **Visual Reasoning Playground** - a collection of AI-powered tools for broadcast professionals.

- **Book**: [Visual Reasoning AI for Broadcast and ProAV](https://visualreasoning.ai/book)
- **Full Playground**: [github.com/StreamGeeks/visual-reasoning-playground](https://github.com/StreamGeeks/visual-reasoning-playground)
- **Moondream Docs**: [docs.moondream.ai](https://docs.moondream.ai)

---

## Contributing

Found a bug? Have an idea? PRs welcome!

---

## License

MIT License - Use freely in personal and commercial projects.

---

<p align="center">
  <strong>Built by <a href="https://github.com/paulwrichards">Paul Richards</a></strong><br>
  Co-CEO at PTZOptics | Chief Streaming Officer at StreamGeeks
</p>
