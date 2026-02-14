# Tool #13: Smart AI Photographer

**Auto-capture photos when AI detects your target.**

Part of the [Visual Reasoning Playground](../README.md) - companion code for the book *Visual Reasoning AI for Broadcast and ProAV* by Paul Richards.

---

## What It Does

Define what you want to photograph ("person smiling", "dog", "thumbs up"), and the AI automatically captures photos when it detects your target. Perfect for hands-free photography.

## Quick Start

> **Important:** This tool requires the full repository. Clone the complete playground first — individual folders won't work because shared libraries are needed.

```bash
git clone https://github.com/streamgeeks/visual-reasoning-playground.git
cd visual-reasoning-playground
python server.py
# Open http://localhost:8000/13-smart-photographer/
```

1. Enter your Moondream API key
2. Define your trigger (e.g., "person smiling")
3. Click "Start Watching"
4. Photos are captured automatically when trigger is detected

## Use Cases

| Business Example | Personal Example |
|------------------|------------------|
| **Events**: Capture speaker at key moments | **Wildlife**: Auto-capture bird at feeder |
| **Retail**: Photo when customer engages | **Pets**: Catch funny pet moments |
| **Security**: Evidence capture on detection | **Kids**: Candid photos during play |

## Features

- AI-powered trigger detection
- Automatic photo capture
- Photo gallery with thumbnails
- Individual photo download
- Bulk download all photos
- Timestamp on each capture
- Adjustable detection sensitivity
- Cooldown between captures

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Trigger | person smiling | What to detect for capture |
| Detection Rate | 1/sec | How often to check |
| Cooldown | 3 sec | Minimum time between captures |
| Confidence | 0.7 | Detection confidence threshold |

## How It Works

1. AI continuously analyzes camera feed
2. When trigger condition is detected, photo is captured
3. Photo is added to gallery with timestamp
4. Cooldown prevents rapid-fire captures
5. All photos available for download

## Gallery Features

- Grid view of all captured photos
- Click to view full size
- Download individual photos
- Download all as batch
- Clear gallery option

## Files

```
13-smart-photographer/
├── index.html    # UI with gallery
├── app.js        # Detection and capture logic
└── README.md     # This file
```

## Related

- [Tool #2: Detection Boxes](../02-detection-boxes/)
- [Tool #7: Zone Monitor](../07-zone-monitor/)
- [Book: Visual Reasoning AI](https://visualreasoning.ai/book)

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
