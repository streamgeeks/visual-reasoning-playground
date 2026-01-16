# Tool #5: Scene Analyzer

**Understand scenes and answer questions about them.**

Part of the [Visual Reasoning Playground](../README.md) - companion code for the book *Visual Reasoning AI for Broadcast and ProAV* by Paul Richards.

---

## What It Does

Take a snapshot and have a conversation about it. Ask questions about what's in the scene, count objects, check for conditions, and more.

## Quick Start

```bash
cd 05-scene-analyzer
python -m http.server 8000
# Open http://localhost:8000
```

1. Enter your Moondream API key
2. Click "Take Snapshot"
3. Ask questions about the scene

## Use Cases

| Business Example | Personal Example |
|------------------|------------------|
| **Security**: "Is anyone in the restricted area?" | **Home**: "Is my garage door open?" |
| **Monitoring**: "How many vehicles in parking lot?" | **Mail**: "Did the package arrive?" |
| **Compliance**: "Is safety equipment being worn?" | **Pets**: "Where is the cat?" |

## Features

- Snapshot-based scene analysis
- Multi-turn Q&A conversation
- Quick question buttons
- Chat history
- Response time tracking
- Conversation context maintained

## Example Questions

- "Describe this scene"
- "How many people are there?"
- "What objects do you see?"
- "Is there anything unusual?"
- "What color is the car?"
- "Is anyone standing?"
- "What's on the table?"

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| API Key | - | Your Moondream API key |

## How It Works

1. Captures a snapshot from the video feed
2. Sends snapshot + question to Moondream API
3. Displays response in chat format
4. Maintains context for follow-up questions

## Files

```
05-scene-analyzer/
├── index.html    # Chat-style UI
├── app.js        # Q&A logic
└── README.md     # This file
```

## Related

- [Book Chapter 9: Scene Analyzer](../../book/chapters/09-scene-analyzer.md)
- [Tool #1: Scene Describer](../01-scene-describer/)
- [Tool #6: Zone Monitor](../06-zone-monitor/)

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
