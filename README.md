# Visual Reasoning Playground

[![Moondream](https://img.shields.io/badge/Powered%20by-Moondream-blue)](https://moondream.ai)
[![PTZOptics](https://img.shields.io/badge/Compatible-PTZOptics-orange)](https://ptzoptics.com)
[![StreamGeeks](https://img.shields.io/badge/By-StreamGeeks-red)](https://streamgeeks.com)
[![Get the Book](https://img.shields.io/badge/Get%20the%20Book-VisualReasoning.ai-green)](https://visualreasoning.ai/book)

**AI-powered visual reasoning tools for broadcast, live streaming, and ProAV professionals.**

8 ready-to-use tools demonstrating real-world applications of Vision Language Models (VLMs) using [Moondream](https://moondream.ai). From PTZ camera auto-tracking to multimodal audio+video automation.

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

## The 8 Playground Tools

| # | Tool | Description | Folder |
|---|------|-------------|--------|
| 1 | **Scene Describer** | Natural language descriptions of any scene | `01-scene-describer/` |
| 2 | **Detection Boxes** | Draw bounding boxes around specified objects | `02-detection-boxes/` |
| 3 | **PTZ Auto-Tracker** | PTZOptics camera follows any object you describe | `PTZOptics-Moondream-Tracker/` |
| 4 | **Smart Counter** | Count objects entering/exiting with persistence | `04-smart-counter/` |
| 5 | **Scene Analyzer** | Ask questions, get contextual answers | `05-scene-analyzer/` |
| 6 | **Zone Monitor** | Draw zones, trigger webhooks on activity | `06-zone-monitor/` |
| 7 | **Color Assistant** | Match camera style to reference image | `07-color-assistant/` |
| 8 | **Multimodal Fusion** | Combine audio + video for smart automation | `08-multimodal-fusion/` |

---

## Quick Start

### 1. Get Your API Key
Sign up at [console.moondream.ai](https://console.moondream.ai) (free tier available)

### 2. Clone & Serve
```bash
git clone https://github.com/streamgeeks/visual-reasoning-playground.git
cd visual-reasoning-playground
python -m http.server 8000
```

### 3. Open Any Tool
Navigate to `http://localhost:8000/01-scene-describer/` and enter your API key.

---

## Tool Highlights

### PTZ Auto-Tracker (Tool 3)
**The flagship tool** - automatic PTZ camera tracking using Moondream + PTZOptics API.

- Zero-shot tracking: "track the person in the red shirt"
- Works with any PTZOptics camera
- Adjustable speed, deadzone, and detection rate
- Production-ready with operation presets

```
Camera Input → Moondream Detection → PTZ Commands → Smooth Tracking
```

[Full documentation →](PTZOptics-Moondream-Tracker/)

### Multimodal Fusion (Tool 8)
**The most advanced tool** - combines what the camera sees with what the microphone hears.

- Video: Moondream scene understanding
- Audio: Speech recognition + intent extraction
- Fusion: Confidence-weighted decision making

**Example**: "Start meeting" + people visible = 95% confidence → trigger room automation

[Full documentation →](08-multimodal-fusion/)

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
| **OBS Studio** | WebSocket triggers, scene switching |
| **vMix** | HTTP API commands, input control |
| **PTZOptics** | Full API 2.0 support for all PTZ cameras |
| **NDI** | Works with NDI video sources |
| **Webhooks** | Trigger any HTTP endpoint |
| **Home Assistant** | Smart home automation |

---

## Architecture

All tools follow a consistent pattern:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Video Source   │────▶│  Moondream API  │────▶│  Your Action    │
│  (Webcam/NDI)   │     │  (Cloud VLM)    │     │  (PTZ/OBS/etc)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Shared utilities** in `shared/`:
- `moondream-client.js` - Unified API client
- `styles.css` - Consistent UI components

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
