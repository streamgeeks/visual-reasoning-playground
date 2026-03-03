# Tool #14: Tracking Comparison

**Compare MediaPipe (local CV) vs Moondream (cloud VLM) for PTZ tracking.**

Part of the [Visual Reasoning Playground](../README.md) - companion code for the book *Visual Reasoning AI for Broadcast and ProAV* by Paul Richards.

---

## What It Does

Run MediaPipe and Moondream side-by-side to compare local computer vision vs. cloud-based vision language models for PTZ camera tracking. See real latency, accuracy, and flexibility differences to choose the right approach for your use case.

## Quick Start

> **Important:** This tool requires the full repository. Clone the complete playground first — individual folders won't work because shared libraries are needed.

```bash
git clone https://github.com/streamgeeks/visual-reasoning-playground.git
cd visual-reasoning-playground
python server.py
# Open http://localhost:8000/14-tracking-comparison/
```

1. Enter your Moondream API key
2. Connect your PTZOptics camera IP
3. Select tracking method (MediaPipe, Moondream, or both)
4. Start tracking and compare results

## Requirements

1. **Moondream API Key** - Get one at [moondream.ai](https://moondream.ai)
2. **PTZOptics Camera** - Any model with HTTP API support
3. **Webcam or Video Source** - For displaying camera feed

## How It Works

```
┌─────────────┐     ┌──────────────┐
│   Camera    │────▶│  MediaPipe   │──── Local: ~10ms ────┐
│   Frame     │     │  (Browser)   │                      │
└─────────────┘     └──────────────┘                      ├──▶ Compare!
      │             ┌──────────────┐                      │
      └────────────▶│  Moondream   │──── Cloud: ~200ms ───┘
                    │  (API)       │
                    └──────────────┘
```

### MediaPipe (Local CV)
- Runs entirely in-browser using TensorFlow.js
- **Pros**: Very fast (~10ms), no API costs, works offline
- **Cons**: Limited to pre-trained tasks (faces, hands, poses), no custom objects

### Moondream (Cloud VLM)
- Sends frames to Moondream API for zero-shot detection
- **Pros**: Track anything by description ("person in red shirt"), understands context
- **Cons**: Network latency (~200ms+), API costs, requires internet

## Key Comparisons

| Aspect | MediaPipe | Moondream |
|--------|-----------|-----------|
| **Latency** | ~10ms | ~200ms+ |
| **Cost** | Free | Per API call |
| **Flexibility** | Fixed tasks only | Any object by description |
| **Offline** | Yes | No |
| **Accuracy** | High for supported tasks | High for any described object |
| **Best For** | Face/hand/pose tracking | Custom object tracking |

## When to Use Which

- **MediaPipe**: You need speed and are tracking faces, hands, or body poses
- **Moondream**: You need flexibility to track arbitrary objects by description
- **Both**: Use MediaPipe for fast initial detection, Moondream for confirmation

## Files

```
14-tracking-comparison/
├── index.html              # Comparison UI
├── app.js                  # Main application logic
├── mediapipe-detector.js   # MediaPipe integration
├── ptz-controller.js       # PTZ camera control
└── README.md               # This file
```

## Related

- [PTZ Auto-Tracker](../PTZOptics-Moondream-Tracker/) - Full Moondream-based tracker
- [Tool #8: Framing Assistant](../08-framing-assistant/) - AI framing suggestions
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
