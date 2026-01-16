# Tool #1: Scene Describer

**Describe what the camera sees in natural language.**

Part of the [Visual Reasoning Playground](../README.md) - companion code for the book *Visual Reasoning AI for Broadcast and ProAV* by Paul Richards.

---

## What It Does

Point your camera at anything and get a natural language description of the scene. The AI understands context, objects, actions, and relationships.

## Quick Start

```bash
# From code-examples directory
cd 01-scene-describer
python -m http.server 8000
# Open http://localhost:8000
```

1. Enter your Moondream API key
2. Allow camera access
3. Click "Describe Scene"

## Use Cases

| Business Example | Personal Example |
|------------------|------------------|
| **Healthcare**: Detect if a patient has fallen | **Kitchen**: "What's in my fridge? What can I make?" |
| **Security**: Describe scene for incident reports | **Organization**: Describe room contents for inventory |
| **Retail**: Understand store layout and activity | **Accessibility**: Audio description of surroundings |

## Features

- Real-time webcam scene description
- Adjustable response length (50-500 tokens)
- Auto-describe at configurable intervals
- Description history
- API usage statistics

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Response Length | 200 tokens | How detailed the description is |
| Auto-describe | Off | Automatically describe at intervals |
| Interval | 5 seconds | Time between auto-descriptions |

## API Cost

Each "Describe Scene" click = 1 API call

| Usage Pattern | Calls/Hour |
|---------------|------------|
| Manual only | 10-30 |
| Auto every 10s | 360 |
| Auto every 5s | 720 |

## Files

```
01-scene-describer/
├── index.html    # UI
├── app.js        # Application logic
└── README.md     # This file
```

## Related

- [Book Chapter 2: Your First Visual Query](../../book/chapters/02-your-first-visual-query.md)
- [Tool #2: Detection Box Drawer](../02-detection-boxes/)
- [Tool #5: Scene Analyzer](../05-scene-analyzer/)

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
