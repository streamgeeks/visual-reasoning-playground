# Tool #5: Smart Counter

**Count objects entering or exiting a space.**

Part of the [Visual Reasoning Playground](../README.md) - companion code for the book *Visual Reasoning AI for Broadcast and ProAV* by Paul Richards.

---

## What It Does

Define a virtual line in the camera view. The system counts objects (people, cars, whatever you specify) as they cross the line, tracking entries and exits.

## Quick Start

```bash
cd 05-smart-counter
python -m http.server 8000
# Open http://localhost:8000
```

1. Enter your Moondream API key
2. Specify what to count (default: "person")
3. Adjust the entry line position
4. Click "Start Counting"

## Use Cases

| Business Example | Personal Example |
|------------------|------------------|
| **Retail**: Customer foot traffic analytics | **Kids**: How many times did they go outside? |
| **Events**: Venue occupancy tracking | **Pets**: Count pet door usage |
| **Warehouse**: Loading dock activity | **Home**: Track visitors |

## Features

- Real-time object counting
- Entry/exit tracking with virtual line
- Adjustable line position
- Direction configuration
- Manual count adjustment
- Event log with timestamps
- Object persistence tracking

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Target Object | person | What to count |
| Line Position | 50% | Where the entry line is drawn |
| Direction | Left to Right = Entry | Which direction counts as entry |
| Detection Rate | 1/sec | How often to detect |

## How It Works

1. Detects specified objects in each frame
2. Tracks objects across frames using position matching
3. Monitors when objects cross the virtual line
4. Increments/decrements count based on crossing direction
5. Logs events with timestamps

## Files

```
05-smart-counter/
├── index.html    # UI with entry line overlay
├── app.js        # Counting and tracking logic
└── README.md     # This file
```

## Related

- [Book Chapter 8: Smart Counter](../../book/chapters/08-smart-counter.md)
- [Tool #2: Detection Boxes](../02-detection-boxes/)
- [Tool #7: Zone Monitor](../07-zone-monitor/)

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
