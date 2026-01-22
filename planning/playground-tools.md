# Visual Reasoning Playground - Tool Specifications

> These are the tools we're building. Each tool needs working code examples in the repository.

---

## Overview

The Visual Reasoning Playground is a collection of ready-to-use tools that demonstrate visual reasoning capabilities for broadcast and ProAV applications. Users can fork the repository and immediately start experimenting.

**Philosophy:**
- Every tool has a **Business Example** and a **Personal Life Hack** example
- Start simple (web-based, no code) → progress to full implementations
- All code is documented and modifiable via Cursor or similar tools

---

## Tool 1: VLM Scene Describer

**What it does:** Describes what the camera sees in natural language

**Platform:** VisualReasoning.ai (web-based, no code required)

**Capabilities:**
- Connect any webcam or smartphone camera
- Get natural language descriptions of the scene
- Real-time or snapshot analysis

**Business Example:**
> **Healthcare Patient Monitoring** - Detect if a patient has fallen out of bed. The VLM can describe: "An elderly person is lying on the floor next to a hospital bed. The bed sheets are disturbed suggesting recent movement."

**Personal Example:**
> **Kitchen Inventory** - Point at your fridge or spice cabinet. Ask "What ingredients do I have?" Then take that list to ChatGPT/Gemini: "What can I make with these? Create a shopping list for anything I'm missing."

**Code Location:** `code-examples/vision-models/scene-describer/`

---

## Tool 2: Detection Box Drawer

**What it does:** Draws bounding boxes around detected objects

**Platform:** VisualReasoning.ai (web-based, no code required)

**Capabilities:**
- Specify what objects to detect via prompt
- Returns coordinates and confidence scores
- Visual overlay showing detection boxes

**Business Example:**
> **Manufacturing QA** - Detect parts on an assembly line. "Find all red widgets and blue connectors" → boxes drawn around each with labels.

**Personal Example:**
> **Lost Item Finder** - "Where are the keys in this image?" → bounding box highlights the keys on the counter you walked past three times.

**Code Location:** `code-examples/vision-models/detection-boxes/`

---

## Tool 3: Auto-Track Any Object

**What it does:** PTZ camera automatically follows any specified object

**Platform:** Python + Moondream API + PTZOptics API 2.0

**Capabilities:**
- Specify any object via natural language ("the person in the red shirt")
- Continuous tracking loop
- Smooth camera movement with debouncing
- Works with any PTZOptics camera

**How it works:**
1. Moondream detects object location in frame
2. Calculate offset from center
3. PTZOptics API sends pan/tilt commands
4. Loop continuously for smooth tracking

**Business Example:**
> **Speaker Tracking** - "Track the presenter" → camera follows speaker around the stage without a dedicated operator.

**Personal Example:**
> **Pet Cam** - "Track the golden retriever" → camera follows your dog around the room while you're at work.

**Code Location:** `code-examples/object-tracking/ptzoptics-auto-tracker/`

**Status:** Paul has working code to share

---

## Tool 4: Smart Counter

**What it does:** Counts specific objects entering/exiting a space

**Platform:** Python + Moondream API

**Capabilities:**
- Define what to count via natural language prompt
- Entry/exit detection
- Running count with timestamps
- Export data for analytics

**How it works:**
1. Define the counting criteria ("count people entering")
2. Track objects frame-to-frame
3. Detect when objects cross entry threshold
4. Increment/decrement count
5. Log with timestamps

**Business Example:**
> **Retail Analytics** - Count customers entering store. "A person has entered" triggers increment. End-of-day report shows traffic by hour.

**Personal Example:**
> **Kid Tracker** - "Count how many times the children go outside." Review at end of day: "Kids went outside 7 times today."

**Code Location:** `code-examples/object-tracking/smart-counter/`

---

## Tool 5: Scene Analyzer

**What it does:** Understands complex scenes and answers questions about them

**Platform:** Python + Moondream API

**Capabilities:**
- Initial scene analysis and description
- Follow-up questions about the scene
- Change detection between frames
- Natural language Q&A interface

**How it works:**
1. Capture frame and get baseline description
2. Accept user questions about the scene
3. Provide contextual answers
4. Optionally compare to previous frames for change detection

**Business Example:**
> **Security Operations** - Operator asks: "Is anyone in the restricted area?" "How many vehicles are in the parking lot?" "Has anything changed since last check?"

**Personal Example:**
> **Home Check** - Point a camera at garage. Ask from anywhere: "Is my garage door open?" "Is there a package on the porch?" "Did the mail come?"

**Code Location:** `code-examples/vision-models/scene-analyzer/`

---

## Tool 6: Zone Monitor

**What it does:** Draw zones on camera view, trigger actions when activity detected

**Platform:** Python + Moondream API + Webhook/API integration

**Capabilities:**
- Visual zone definition (draw rectangles on frame)
- Motion detection within zone
- Presence detection within zone
- Specific object detection within zone
- Trigger configurable actions (webhook, API call, alert)

**How it works:**
1. User draws zone(s) on camera view
2. System monitors for activity in zone
3. When threshold met, trigger configured action
4. Configurable sensitivity and debouncing

**Business Example:**
> **Warehouse Safety** - Draw zone around dangerous machinery. "Alert when person enters this zone" → immediate safety notification.

**Personal Example:**
> **Driveway Alert** - Draw zone on driveway. "Notify when car enters" → phone notification when someone pulls in.

**Code Location:** `code-examples/zone-monitoring/zone-monitor/`

---

## Tool 7: AI Color Correction Assistant

**What it does:** Analyzes reference images and provides camera adjustment recommendations

**Platform:** Python + Moondream API + Camera Control APIs

**Capabilities:**
- Upload or capture reference image (the style you want)
- Analyze your current camera output
- Generate specific recommendations (adjust saturation +10, etc.)
- Optionally auto-apply to supported cameras

**How it works:**
1. User provides reference image (desired look)
2. System captures current camera output
3. VLM analyzes both images for style characteristics
4. Generates human-readable adjustment recommendations
5. Optionally sends commands to camera API

**Business Example:**
> **Multi-Camera Matching** - Upload hero camera shot as reference. Point at each other camera. Get specific recommendations to match color/style across all cameras.

**Personal Example:**
> **YouTube Look** - Find a screenshot from your favorite YouTuber. "Make my webcam look like this." Get specific adjustments for your camera settings.

**Code Location:** `code-examples/color-matching/color-assistant/`

---

## Tool 8: Multimodal Fusion System

**What it does:** Combines audio + video understanding for intelligent automation

**Platform:** Python + Moondream API + Whisper + Action APIs

**Capabilities:**
- Video analysis (presence, objects, activity)
- Audio analysis (speech-to-text, intent extraction)
- Combined confidence scoring
- Multi-trigger action system

**How it works:**
1. Demux incoming stream into audio + video
2. Process video through Moondream
3. Process audio through Whisper → intent extraction
4. Combine signals with confidence weighting
5. Trigger appropriate actions

**Business Example:**
> **Conference Room Automation**
> - Vision detects: people entering room
> - Audio detects: "I want to host a meeting"
> - Actions triggered: TV powers on, switches to correct input, lights adjust
> - Vision + Audio together = higher confidence than either alone

**Personal Example:**
> **Smart Home Hub**
> - Vision: sees you walk into living room
> - Audio: "Turn on movie mode"
> - Actions: TV on, lights dim, blinds close
> - Even works: "I'm leaving" while walking toward door

**Code Location:** `code-examples/multimodal-systems/fusion-system/`

---

## Code Repository Structure

```
code-examples/
├── vision-models/
│   ├── scene-describer/          # Tool 1
│   ├── detection-boxes/          # Tool 2
│   ├── scene-analyzer/           # Tool 5
│   └── prompt-patterns/          # Reusable prompt templates
├── object-tracking/
│   ├── ptzoptics-auto-tracker/   # Tool 3
│   └── smart-counter/            # Tool 4
├── zone-monitoring/
│   └── zone-monitor/             # Tool 6
├── color-matching/
│   └── color-assistant/          # Tool 7
├── audio-processing/
│   ├── whisper-setup/
│   ├── demuxing/
│   └── intent-extraction/
├── multimodal-systems/
│   └── fusion-system/            # Tool 8
├── production-automation/
│   ├── vmix-integration/
│   ├── obs-integration/
│   └── ptzoptics-control/
└── visual-reasoning-harness/
    ├── core/
    ├── logging/
    └── model-abstraction/
```

---

## Development Status

| Priority | Tool | Status | Notes |
|----------|------|--------|-------|
| 1 | Auto-Track Any Object | ✅ **COMPLETE** | `PTZOptics-Moondream-Tracker/` |
| 2 | Scene Describer | Web-based | VisualReasoning.ai |
| 3 | Detection Boxes | Web-based | VisualReasoning.ai |
| 4 | Smart Counter | Planned | Reuse tracker patterns |
| 5 | Scene Analyzer | Planned | Reuse tracker patterns |
| 6 | Zone Monitor | Planned | Reuse tracker patterns |
| 7 | AI Color Correction | Planned | Unique implementation |
| 8 | Multimodal Fusion | Planned | Most complex |

---

## Tool 3 Implementation Details (Reference)

**Location:** `code-examples/PTZOptics-Moondream-Tracker/`

### Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   WebRTC Video  │────▶│  Moondream API  │────▶│  PTZ Control    │
│   (Browser)     │     │  /v1/detect     │     │  HTTP Commands  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Key Files
| File | Purpose | Lines |
|------|---------|-------|
| `moondream.js` | VLM API wrapper | 100 |
| `ptz_control.js` | Camera control | 200 |
| `app.js` | Main logic + UI | 606 |

### Reusable Patterns
1. **Frame Capture** → `captureFrame()` in moondream.js
2. **Detection Loop** → `detectionLoop()` in app.js
3. **Settings Persistence** → localStorage pattern in app.js
4. **Visual Overlay** → `renderDetection()` canvas drawing
5. **Configurable Rate** → Slider + interval adjustment

### Operation Presets
| Preset | Rate | Speed | Deadzone | Use Case |
|--------|------|-------|----------|----------|
| Smooth | 0.5/sec | 3 | 12% | Broadcast |
| Precise | 1.5/sec | 6 | 2% | Presentations |
| Balanced | 1.0/sec | 5 | 5% | General |
| Fast | 2.0/sec | 8 | 8% | Sports/Action |
| Minimal | 0.3/sec | 4 | 15% | Cost-sensitive |

---

## Example Pairs Summary

Every tool needs both examples prepared:

| Tool | Business Example | Personal Example |
|------|------------------|------------------|
| Scene Describer | Patient fall detection | Fridge inventory → recipes |
| Detection Boxes | Manufacturing QA | Lost item finder |
| Auto-Tracker | Speaker tracking | Pet cam |
| Smart Counter | Retail foot traffic | Kid activity count |
| Scene Analyzer | Security Q&A | "Is garage door open?" |
| Zone Monitor | Warehouse safety zones | Driveway alerts |
| Color Assistant | Multi-cam color matching | YouTuber look matching |
| Fusion System | Conference room automation | Smart home commands |

---

*This document defines what we're building. The book teaches readers how to build and customize each tool.*
