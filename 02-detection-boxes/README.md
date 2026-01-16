# Tool #2: Detection Box Drawer

**Draw bounding boxes around detected objects.**

Part of the [Visual Reasoning Playground](../README.md) - companion code for the book *Visual Reasoning AI for Broadcast and ProAV* by Paul Richards.

---

## What It Does

Specify any object in natural language, and the AI will locate it in the frame and draw a bounding box around it. Works with any object you can describe.

## Quick Start

```bash
cd 02-detection-boxes
python -m http.server 8000
# Open http://localhost:8000
```

1. Enter your Moondream API key
2. Enter what to detect (e.g., "person", "coffee mug", "red ball")
3. Click "Detect Objects"

## Use Cases

| Business Example | Personal Example |
|------------------|------------------|
| **Manufacturing**: Detect parts on assembly line | **Lost Items**: "Where are my keys?" |
| **QA**: Find defects or missing components | **Organization**: Locate items in cluttered spaces |
| **Inventory**: Count specific items on shelves | **Pet Tracking**: Find your cat in the room |

## Features

- Natural language object detection
- Real-time bounding box visualization
- Continuous detection mode
- Adjustable detection rate
- Customizable box colors
- Detection confidence display

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Target Object | - | What to detect (natural language) |
| Box Color | Light blue | Color of bounding boxes |
| Continuous Mode | Off | Keep detecting automatically |
| Detection Rate | 1/sec | How often to detect in continuous mode |

## Output Format

Each detection includes:
- `x_min`, `y_min`, `x_max`, `y_max`: Bounding box (normalized 0-1)
- `x`, `y`: Center point (normalized 0-1)
- `width`, `height`: Box dimensions (normalized 0-1)
- `confidence`: Detection confidence (0-1)

## Files

```
02-detection-boxes/
├── index.html    # UI with canvas overlay
├── app.js        # Detection and rendering logic
└── README.md     # This file
```

## Related

- [Book Chapter 3: Drawing Detection Boxes](../../book/chapters/03-drawing-detection-boxes.md)
- [Tool #1: Scene Describer](../01-scene-describer/)
- [Tool #3: Auto-Track Any Object](../PTZOptics-Moondream-Tracker/)

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
