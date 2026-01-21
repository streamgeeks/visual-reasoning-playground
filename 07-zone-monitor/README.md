# Tool #7: Zone Monitor

**Draw zones on camera view and trigger alerts on activity.**

Part of the [Visual Reasoning Playground](../README.md) - companion code for the book *Visual Reasoning AI for Broadcast and ProAV* by Paul Richards.

---

## What It Does

Draw virtual zones on your camera feed. When specified objects are detected within those zones, the system triggers alerts.

## Quick Start

```bash
cd 07-zone-monitor
python -m http.server 8000
# Open http://localhost:8000
```

1. Enter your Moondream API key
2. Click "Add Zone" and draw a rectangle on the video
3. Configure what to detect in that zone
4. Click "Start Monitoring"

## Use Cases

| Business Example | Personal Example |
|------------------|------------------|
| **Warehouse**: Safety zone violation alerts | **Driveway**: Car arrival notifications |
| **Retail**: Restricted area monitoring | **Pool**: Safety alerts when kids enter |
| **Security**: Perimeter breach detection | **Garden**: Detect animals in flower beds |

## Features

- Draw zones directly on video
- Multiple zones with different targets
- Color-coded zone status
- Real-time alert log
- Adjustable check rate
- Zone triggered/clear status

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Zone Name | Zone N | Friendly name for the zone |
| Detect | person | What object to detect in zone |
| Zone Color | Red | Visual color of the zone |
| Check Rate | 1/sec | How often to check zones |

## Zone States

| State | Visual | Description |
|-------|--------|-------------|
| Clear | Thin border | No target objects in zone |
| Triggered | Thick border, filled | Target detected in zone |

## How It Works

1. User draws rectangular zones on the video feed
2. Each zone has a target object to detect
3. System periodically checks for objects in each zone
4. When object enters zone, triggers alert
5. Alert logged with timestamp

## Files

```
07-zone-monitor/
├── index.html    # UI with zone drawing
├── app.js        # Zone management and monitoring
└── README.md     # This file
```

## Related

- [Book Chapter 10: Zone Monitor](../../book/chapters/10-zone-monitor.md)
- [Tool #5: Smart Counter](../05-smart-counter/)
- [Tool #2: Detection Boxes](../02-detection-boxes/)

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
