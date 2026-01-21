# Visual Reasoning Playground

[![Moondream](https://img.shields.io/badge/Powered%20by-Moondream-blue)](https://moondream.ai)
[![PTZOptics](https://img.shields.io/badge/Compatible-PTZOptics-orange)](https://ptzoptics.com)
[![StreamGeeks](https://img.shields.io/badge/By-StreamGeeks-red)](https://streamgeeks.com)
[![Get the Book](https://img.shields.io/badge/Get%20the%20Book-VisualReasoning.ai-green)](https://visualreasoning.ai/book)

**AI-powered visual reasoning tools for broadcast, live streaming, and ProAV professionals.**

12 ready-to-use tools demonstrating real-world applications of Vision Language Models (VLMs) using [Moondream](https://moondream.ai). From PTZ camera auto-tracking to multimodal audio+video automation.

> 🚀 **[Try All Tools Online Now](https://streamgeeks.github.io/visual-reasoning-playground/)** - No installation required!

> 🎮 **Playground Mode**: All tools work without a camera! Sample videos included for testing.

> **From the book**: *Visual Reasoning AI for Broadcast and ProAV* by Paul Richards
> 
> **Author**: Paul Richards - Co-CEO at [PTZOptics](https://ptzoptics.com) | Chief Streaming Officer at [StreamGeeks](https://streamgeeks.com)

---

## Why Visual Reasoning?

Traditional computer vision requires training custom models for each task. **Visual Reasoning** uses pre-trained Vision Language Models that understand natural language - just describe what you want to detect.

```
Old way: Train a model on 10,000 images of "person at podium"
New way: Just ask "Is there a person standing at the podium?"
```

**Perfect for:**
- Live streaming & broadcast automation
- PTZ camera control & auto-tracking
- Smart conference rooms
- Security & monitoring
- Content creation workflows
- OBS & vMix integration

---

## The Tools

### 👁️ Tool 1: Scene Describer — [Try it now](https://streamgeeks.github.io/visual-reasoning-playground/01-scene-describer/)
Natural language descriptions of any scene in real-time.

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Camera    │────▶│  Moondream API  │────▶│  "A person at   │
│   Frame     │     │    /caption     │     │   a desk with   │
└─────────────┘     └─────────────────┘     │   a laptop..."  │
                                            └─────────────────┘
```
📁 `01-scene-describer/`

---

### 📦 Tool 2: Detection Boxes — [Try it now](https://streamgeeks.github.io/visual-reasoning-playground/02-detection-boxes/)
Draw bounding boxes around any object you describe.

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Camera    │────▶│  Moondream API  │────▶│   Video Feed    │
│   Frame     │     │    /detect      │     │   + Colored     │
└─────────────┘     │ "person","mug"  │     │   Bounding Boxes│
                    └─────────────────┘     └─────────────────┘
```
📁 `02-detection-boxes/`

---

### ✋ Tool 3: Gesture OBS Control — [Try it now](https://streamgeeks.github.io/visual-reasoning-playground/03-gesture-obs/)
Control OBS scene switching with hand gestures.

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Camera    │────▶│  Moondream API  │────▶│  OBS WebSocket  │
│   Frame     │     │ "thumbs up?" →  │     │  Scene Switch   │
└─────────────┘     │   YES/NO        │     └─────────────────┘
                    └─────────────────┘              │
                                                     ▼
                                            ┌─────────────────┐
                                            │   OBS Studio    │
                                            │   Scene 1 → 2   │
                                            └─────────────────┘
```

> 🔌 **OBS Script Available!** Install directly in OBS Studio: [moondream-gesture-control.py](https://github.com/streamgeeks/visual-reasoning-playground/blob/master/03-gesture-obs/moondream-gesture-control.py)

📁 `03-gesture-obs/`

---

### 🔢 Tool 5: Smart Counter — [Try it now](https://streamgeeks.github.io/visual-reasoning-playground/05-smart-counter/)
Count objects entering or exiting across a virtual line.

```
                    ┌─────────────────┐
                    │  Define Line    │
                    │  ─ ─ ─ ─ ─ ─ ─  │
                    └────────┬────────┘
                             │
┌─────────────┐     ┌────────▼────────┐     ┌─────────────────┐
│   Camera    │────▶│  Track Objects  │────▶│   IN: 12        │
│   Frame     │     │  Across Line    │     │   OUT: 8        │
└─────────────┘     └─────────────────┘     │   TOTAL: +4     │
                                            └─────────────────┘
```
📁 `05-smart-counter/`

---

### 🔍 Tool 6: Scene Analyzer — [Try it now](https://streamgeeks.github.io/visual-reasoning-playground/06-scene-analyzer/)
Ask questions about what the camera sees.

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Camera    │────▶│  Moondream API  │────▶│  "Yes, there    │
│   Frame     │     │     /query      │     │   are 3 people  │
└─────────────┘     └─────────────────┘     │   in the room"  │
                             ▲              └─────────────────┘
                    ┌────────┴────────┐
                    │  "How many      │
                    │   people?"      │
                    └─────────────────┘
```
📁 `06-scene-analyzer/`

---

### 🚧 Tool 7: Zone Monitor — [Try it now](https://streamgeeks.github.io/visual-reasoning-playground/07-zone-monitor/)
Draw custom zones, get alerts when objects enter.

```
┌─────────────────────────────────┐
│         Camera View             │
│   ┌───────────┐                 │
│   │  ZONE A   │    ○ person     │
│   │  (alert!) │   enters        │
│   └───────────┘     │           │
└─────────────────────┼───────────┘
                      ▼
              ┌───────────────┐
              │   Webhook     │────▶  Alert!
              │   Trigger     │
              └───────────────┘
```
📁 `07-zone-monitor/`

---

### 🎨 Tool 10: Color Matcher — [Try it now](https://streamgeeks.github.io/visual-reasoning-playground/10-color-matcher/)
Match your camera's color settings to a reference image.

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Reference  │────▶│   Moondream     │     │  Suggested      │
│   Image     │     │   Analyze Both  │────▶│  Adjustments:   │
└─────────────┘     └─────────────────┘     │  WB: +200K      │
                             ▲              │  Sat: -10       │
┌─────────────┐              │              │  Exp: +0.5      │
│   Camera    │──────────────┘              └─────────────────┘
│   Feed      │
└─────────────┘
```
📁 `10-color-matcher/`

---

### 🔊 Tool 12: Multimodal Fusion — [Try it now](https://streamgeeks.github.io/visual-reasoning-playground/12-multimodal-fusion/)
Combine audio + video for intelligent automation.

```
┌─────────────┐
│   Camera    │────┐
│   (Video)   │    │     ┌─────────────────┐     ┌─────────────┐
└─────────────┘    ├────▶│  Fusion Engine  │────▶│  Trigger    │
                   │     │  Video + Audio  │     │  Automation │
┌─────────────┐    │     │  Confidence: 95%│     └─────────────┘
│ Microphone  │────┘     └─────────────────┘
│  (Speech)   │
└─────────────┘

Example: "Start meeting" + people visible = HIGH confidence → trigger
```
📁 `12-multimodal-fusion/`

---

### 📸 Tool 13: Smart AI Photographer — [Try it now](https://streamgeeks.github.io/visual-reasoning-playground/13-smart-photographer/)
Auto-capture photos when AI detects your target.

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Camera    │────▶│  Moondream API  │────▶│  Target Found?  │
│   Frame     │     │    /detect      │     │   YES → 📸      │
└─────────────┘     │ "person smiling"│     └────────┬────────┘
                    └─────────────────┘              │
                                                     ▼
                                            ┌─────────────────┐
                                            │  Photo Gallery  │
                                            │  + Download     │
                                            └─────────────────┘
```
📁 `13-smart-photographer/`

---

### 🎯 Featured: PTZ Auto-Tracker — [Try it now](https://streamgeeks.github.io/visual-reasoning-playground/PTZOptics-Moondream-Tracker/)
Autonomous PTZ camera tracking using AI vision.

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  PTZOptics  │────▶│  Moondream API  │────▶│  Calculate      │
│   Camera    │     │    /detect      │     │  Pan/Tilt       │
└─────────────┘     │  "red shirt"    │     │  Commands       │
      ▲             └─────────────────┘     └────────┬────────┘
      │                                              │
      │             ┌─────────────────┐              │
      └─────────────│  PTZOptics API  │◀─────────────┘
                    │  Move Camera    │
                    └─────────────────┘
```
📁 `PTZOptics-Moondream-Tracker/`

---

### 🏆 Scoreboard Extractor — [Try it now](https://streamgeeks.github.io/visual-reasoning-playground/04-scoreboard-extractor/)
Extract scores from physical scoreboards using AI vision.

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Scoreboard │────▶│  Moondream API  │────▶│  HOME: 24       │
│   Camera    │     │  "Read score"   │     │  AWAY: 18       │
└─────────────┘     └─────────────────┘     │  QTR: 3         │
                                            └────────┬────────┘
                                                     │
                                            ┌────────▼────────┐
                                            │  Graphics       │
                                            │  Overlay        │
                                            └─────────────────┘
```
📁 `04-scoreboard-extractor/`

---

### 🖼️ Tool 8: Framing Assistant — [Try it now](https://streamgeeks.github.io/visual-reasoning-playground/08-framing-assistant/)
AI-powered framing suggestions for PTZ cameras.

```
┌─────────────────────────────────┐
│         Camera View             │
│                                 │
│      ┌ ─ ─ ─ ─ ─ ┐              │
│      │ Suggested │  ○ subject   │
│      │  Frame    │              │
│      └ ─ ─ ─ ─ ─ ┘              │
└─────────────────────────────────┘
              │
              ▼
    "Move camera UP 5°, 
     zoom IN 10% for
     better composition"
```
📁 `08-framing-assistant/`

---

### 🎬 Tool 11: Multimodal Studio — [Try it now](https://streamgeeks.github.io/visual-reasoning-playground/11-multimodal-studio/)
Full production automation: PTZ + OBS + Audio + AI.

```
┌─────────────┐
│  PTZOptics  │────┐
│   Camera    │    │
└─────────────┘    │     ┌─────────────────┐     ┌─────────────┐
                   ├────▶│    Multimodal   │────▶│  PTZ Move   │
┌─────────────┐    │     │     Studio      │     ├─────────────┤
│ Microphone  │────┤     │   Controller    │────▶│  OBS Scene  │
│  (Voice)    │    │     └─────────────────┘     ├─────────────┤
└─────────────┘    │                             │  Webhook    │
                   │                             └─────────────┘
┌─────────────┐    │
│     OBS     │────┘
│   Studio    │
└─────────────┘

Voice: "Camera 2, close up" → PTZ moves + OBS switches
```
📁 `11-multimodal-studio/`

---

### 🔌 OBS Plugin: Visual Reasoning AI — [Try it now](https://streamgeeks.github.io/visual-reasoning-playground/obs-visual-reasoning/)
Complete AI control panel as an OBS Browser Dock.

```
┌─────────────────────────────────────────────────────┐
│           OBS BROWSER DOCK                          │
├─────────────────────────────────────────────────────┤
│  ┌─────────┬───────────┬────────────┐               │
│  │Gestures │ Describe  │ Auto-Switch│  ← Tabs       │
│  └─────────┴───────────┴────────────┘               │
│                                                     │
│  ┌─────────────────────────────────┐                │
│  │        Camera Preview           │                │
│  │     [Gesture Detection]         │                │
│  └─────────────────────────────────┘                │
│                                                     │
│  👍 Thumbs Up  → Scene: Wide Shot                   │
│  👎 Thumbs Down → Scene: Close Up                   │
│                                                     │
│  Auto-Switch Rules:                                 │
│  "whiteboard" → Whiteboard Cam                      │
│  "standing"   → Full Body Shot                      │
└─────────────────────────────────────────────────────┘
              │
              ▼
    ┌─────────────────┐
    │   OBS Studio    │
    │  Scene Switch   │
    │  Start/Stop Rec │
    └─────────────────┘
```
📁 `obs-visual-reasoning/`

---

## Quick Start

### Option A: Try Online Instantly (Recommended)

1. **Get Your API Key** - Sign up at [console.moondream.ai](https://console.moondream.ai) (free tier available)
2. **Open Any Tool** - Visit the [Visual Reasoning Playground](https://streamgeeks.github.io/visual-reasoning-playground/)
3. **Enter Your API Key** - Paste it once, and you're ready to go!

### Option B: Run Locally

```bash
git clone https://github.com/streamgeeks/visual-reasoning-playground.git
cd visual-reasoning-playground
python server.py
```
Then open `http://localhost:8000` and select any tool. The included `server.py` enables CORS so sample videos work with AI detection.

---

## Use Cases

Every tool includes both **business** and **personal** examples:

| Tool | Business Use | Personal Use |
|------|--------------|--------------|
| Scene Describer | Patient fall detection | Fridge inventory for recipes |
| Detection Boxes | Manufacturing QA | "Where are my keys?" |
| PTZ Auto-Tracker | Speaker tracking at events | Pet cam follows your dog |
| Smart Counter | Retail foot traffic analytics | Count kids going outside |
| Scene Analyzer | Security: "Anyone in restricted area?" | "Is my garage door open?" |
| Zone Monitor | Warehouse safety alerts | Driveway arrival notifications |
| Color Assistant | Multi-cam color matching | Match YouTuber's style |
| Multimodal Fusion | Smart conference room | Voice-controlled smart home |

---

## Integration Ready

These tools are designed to integrate with your existing workflow:

| Platform | Integration |
|----------|-------------|
| **OBS Studio** | WebSocket triggers, scene switching, **native Python script** |
| **vMix** | HTTP API commands, input control |
| **PTZOptics** | Full API 2.0 support for all PTZ cameras |
| **NDI** | Works with NDI video sources |
| **Webhooks** | Trigger any HTTP endpoint |
| **Home Assistant** | Smart home automation |

---

## OBS Studio Plugin

### Moondream Gesture Control Script

Control OBS scenes with hand gestures - runs natively inside OBS Studio!

**Installation:**
1. Download [`moondream-gesture-control.py`](https://github.com/streamgeeks/visual-reasoning-playground/blob/master/03-gesture-obs/moondream-gesture-control.py)
2. In OBS: **Tools → Scripts → + → Select the .py file**
3. Configure your Moondream API key and gesture mappings
4. Enable detection and start gesturing!

**Features:**
- 👍 Thumbs up → Switch to Scene A
- 👎 Thumbs down → Switch to Scene B
- Configurable detection interval and cooldown
- Debug mode for troubleshooting
- No browser required - runs entirely within OBS

**Requirements:**
- OBS Studio 28.0 or later
- Moondream API key ([get one free](https://moondream.ai))
- Webcam

> 💡 **Try before installing:** Use the [web demo](https://streamgeeks.github.io/visual-reasoning-playground/03-gesture-obs/) to test gesture detection before installing the OBS script.

---

## Architecture

All tools follow a consistent pattern: **Video → AI → Action**

**Shared utilities** in `shared/`:
- `moondream-client.js` - Unified API client with detect, caption, query, point methods
- `video-source-adapter.js` - Toggle between live camera and sample videos  
- `api-key-manager.js` - Secure API key storage and validation
- `styles.css` - Consistent dark theme UI components

---

## API Cost Guide

Moondream charges per API call. Control costs with the rate slider in each tool:

| Detection Rate | API Calls/Hour | Best For |
|----------------|----------------|----------|
| 0.5/sec | 1,800 | Static scenes, budget-conscious |
| 1.0/sec | 3,600 | General use (default) |
| 2.0/sec | 7,200 | Active scenes |
| 3.0/sec | 10,800 | Fast action, sports |

---

## Requirements

**All Tools:**
- [Moondream API Key](https://console.moondream.ai) (free tier available)
- Modern browser (Chrome recommended)
- Local web server

**Tool-Specific:**
- **Tool 3 (Auto-Tracker)**: [PTZOptics camera](https://ptzoptics.com) with network access
- **Tool 8 (Multimodal)**: Microphone for speech recognition

---

## Learn More

### Get the Book
**[Visual Reasoning AI for Broadcast and ProAV](https://visualreasoning.ai/book)** by Paul Richards covers:
- Complete theory behind Vision Language Models
- Step-by-step tool building tutorials
- Production deployment strategies
- Industry-specific applications

**Get your copy at [VisualReasoning.ai/book](https://visualreasoning.ai/book)**

### Official Resources
- [VisualReasoning.ai](https://visualreasoning.ai) - Book, online course, and free tools
- [Moondream Documentation](https://docs.moondream.ai) - API reference & guides
- [PTZOptics API 2.0](https://ptzoptics.com/api) - Camera control documentation
- [StreamGeeks Academy](https://streamgeeks.com) - Live streaming education

### Community
- [StreamGeeks Discord](https://discord.gg/streamgeeks) - Get help, share projects
- [PTZOptics Support](https://ptzoptics.com/support) - Camera-specific questions

---

## Contributing

Found a bug? Have an idea? PRs welcome!

1. Fork this repo
2. Create a feature branch
3. Submit a pull request

---

## License

MIT License - Use freely in personal and commercial projects.

---

<p align="center">
  <a href="https://ptzoptics.com"><img src="https://ptzoptics.com/wp-content/uploads/2021/07/PTZOptics-logo.png" height="40" alt="PTZOptics"></a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://moondream.ai"><img src="https://moondream.ai/logo.png" height="40" alt="Moondream"></a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://streamgeeks.com"><img src="https://streamgeeks.com/wp-content/uploads/2020/01/StreamGeeks-Logo.png" height="40" alt="StreamGeeks"></a>
</p>

<p align="center">
  <strong>Built by <a href="https://github.com/paulwrichards">Paul Richards</a></strong><br>
  Co-CEO at PTZOptics | Chief Streaming Officer at StreamGeeks
</p>
