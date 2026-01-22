# Appendix A: Visual Reasoning Playground Reference

This appendix provides a quick reference for each tool in the Visual Reasoning Playground. Use this as a guide when exploring the capabilities and customizing tools for your specific needs.

---

## Playground Overview

The Visual Reasoning Playground is a collection of ready-to-use tools demonstrating visual reasoning capabilities for broadcast and ProAV applications. All tools are available on GitHub and designed for easy customization using Cursor or similar AI coding assistants.

**Repository:** github.com/streamgeeks/visual-reasoning-playground

**Philosophy:**
- Every tool includes both business and personal use case examples
- Progress from simple web-based demos to full production implementations
- All code is documented and meant to be modified for your needs

**The 5-Stage ProAV Pipeline:**

All tools follow the same pipeline architecture introduced in Chapter 7:

1. **Media Inputs** — Video/audio from webcams, RTSP, NDI, files
2. **Perception** — Fast signals: bounding boxes, pose, OCR, embeddings
3. **Reasoning (VLM)** — Scene interpretation, grounded JSON outputs
4. **Decision (Guardrails)** — Confidence thresholds, cooldowns, smoothing
5. **Control (Outputs)** — OBS, vMix, PTZ commands, webhooks, logs

Understanding this pipeline helps you customize tools and build your own.

---

## Tool 1: VLM Scene Describer

**What It Does:** Describes what the camera sees in natural language.

**Platform:** Web-based (no code required for basic use)

**How to Use:**
1. Open the tool in your browser
2. Allow webcam access
3. Click "Describe Scene"
4. View the natural language description

**What It Returns:** A paragraph describing the scene—people present, objects visible, activities occurring, and overall setting.

**Business Applications:**
- Patient fall detection in healthcare settings
- Equipment status monitoring on factory floors
- Security scene assessment for access control

**Personal Applications:**
- Kitchen inventory checking
- Room organization assistance
- Pet monitoring and activity logging

---

## Tool 2: Detection Box Drawer

**What It Does:** Draws bounding boxes around detected objects in real-time.

**Platform:** Web-based (no code required for basic use)

**How to Use:**
1. Open the tool in your browser
2. Allow webcam access
3. Type what you want to detect (e.g., "person," "cup," "phone")
4. View bounding boxes overlaid on the video

**What It Returns:** Visual rectangles highlighting where detected objects appear, along with confidence scores indicating detection certainty.

**Business Applications:**
- Manufacturing part verification
- Inventory counting automation
- Safety equipment verification

**Personal Applications:**
- Finding lost items in cluttered spaces
- Photo organization assistance
- Pet location tracking

---

## Tool 3: Auto-Track Any Object

**What It Does:** PTZ camera automatically follows any object you specify by name.

**Platform:** Requires PTZOptics camera with API 2.0 support

**How It Works:**
1. You specify what to track (e.g., "person in blue shirt")
2. The system detects the object's position in each frame
3. When the object moves off-center, the PTZ camera adjusts
4. A "deadzone" in the center prevents jittery over-correction

**Key Settings:**
- **Detection Rate:** How often to analyze frames (balance responsiveness vs. API costs)
- **PTZ Speed:** Camera movement speed (slower = smoother for broadcast)
- **Deadzone:** Center area where no adjustment occurs (prevents jitter)
- **Smoothing:** How gradually the camera moves (prevents jarring motion)

**Operation Presets:**

| Preset | Best For |
|--------|----------|
| Smooth | Broadcast where smooth movement matters |
| Precise | Presentations with quick movements |
| Balanced | General purpose tracking |
| Fast | Sports and action sequences |
| Minimal | Cost-sensitive deployments |

**Business Applications:**
- Speaker tracking in corporate presentations
- Presenter following in educational settings
- Athlete tracking for sports coverage

**Personal Applications:**
- Pet camera that follows your dog
- Baby monitor tracking
- Workout recording assistance

**Advanced: Search and Find Mode**

Beyond tracking, the system can actively search for objects:
1. You describe what to find ("red notebook," "laptop with stickers")
2. Camera systematically scans the room
3. When a potential match is found, camera zooms in to confirm
4. When confirmed, camera centers on the object

Great for security searches, inventory checks, or just finding things in large spaces. Kids love the "hide and seek" version—hide an object and see if the camera can find it.

---

## Tool 4: Smart Counter

**What It Does:** Counts specific objects entering or exiting a defined area.

**Platform:** Python application with web dashboard

**How It Works:**
1. You define a virtual "line" in the frame
2. Specify what to count (people, vehicles, packages, etc.)
3. The system tracks objects crossing the line
4. Direction determines entry vs. exit

**Key Settings:**
- **Target Object:** What to count
- **Entry Line Position:** Where the virtual boundary sits
- **Direction:** Which crossing direction counts as entry
- **Debounce Time:** Prevents double-counting the same crossing

**What It Tracks:**
- Current count (entries minus exits)
- Total entries
- Total exits
- Timestamped event log

**Business Applications:**
- Retail foot traffic analysis
- Event attendance tracking
- Occupancy monitoring for safety compliance

**Personal Applications:**
- Counting kids going in/out of the yard
- Pet door usage tracking
- Package delivery logging

---

## Tool 5: Scene Analyzer (Smart Conference Room)

**What It Does:** Understands complex scenes and triggers automation based on specific conditions. The primary example is a Smart Conference Room that responds intelligently to what's happening.

**Platform:** Python application with interactive interface

**How It Works:**
1. Define specific triggers with YES/NO structured outputs
2. System continuously monitors for trigger conditions
3. When conditions are met with sufficient confidence, actions fire
4. State tracking prevents repeated triggers

**Smart Conference Room Triggers:**
- **Meeting Detection:** "Are there two or more people seated at the conference table?" → Start room systems
- **Recording Control:** "Is someone standing at the presentation area?" → Begin recording
- **Video Input Selection:** "Is there active content on the wall display?" → Switch to screen share input
- **Presenter Focus:** "Is exactly one person standing and appearing to present?" → Zoom to presenter
- **Wide Shot Switch:** "Are multiple people engaged in discussion?" → Switch to wide shot

**Key Concept:** Structured outputs (YES/NO with confidence) enable clean automation logic. The VLM returns actionable decisions, not just descriptions.

**Business Applications:**
- Conference room automation
- Intelligent meeting recording
- Presentation mode switching

**Personal Applications:**
- Home office focus mode ("Is someone at the desk working?")
- Appliance monitoring ("Is the stove on?")
- Room status checks

---

## Tool 6: Zone Monitor

**What It Does:** Triggers actions when activity occurs in defined zones.

**Platform:** Python application with visual zone editor

**How It Works:**
1. Draw rectangular zones on the camera view
2. Assign triggers to each zone (person enters, motion detected, etc.)
3. Define actions for each trigger (send alert, call API, switch camera)
4. System monitors continuously and executes actions automatically

**Trigger Types:**
- **Any Motion:** Any detected movement in the zone
- **Person Enters:** Someone steps into the zone
- **Person Exits:** Someone leaves the zone
- **Object Present:** Specific object detected in zone
- **Object Absent:** Expected object missing from zone

**Action Types:**
- Webhook notifications
- Alert messages
- Email notifications
- vMix switching commands
- OBS scene changes
- Custom API calls

**Business Applications:**
- Safety zone monitoring (restricted areas)
- Trigger-based production switching
- Occupancy-based automation

**Personal Applications:**
- Driveway arrival alerts
- Pool safety monitoring
- Package detection at front door

---

## Tool 7: AI Color Correction Assistant

**What It Does:** Analyzes reference images and recommends camera adjustments to match the look.

**Platform:** Python application with side-by-side comparison view

**How It Works:**
1. Select a Style Preset or provide a reference image
2. System captures current camera output
3. AI analyzes both images
4. Generates specific adjustment recommendations as structured output
5. Can auto-apply settings to supported cameras

**Style Presets:**
- Cinematic (warm tones, lifted shadows, soft contrast)
- Corporate Clean (neutral, balanced, professional)
- Warm & Inviting (golden tones, friendly feel)
- Cool & Modern (blue undertones, crisp contrast)
- Broadcast Standard (optimized for TV/streaming)
- Custom (your own reference image)

**What It Analyzes:**
- Overall color tone (warm/cool/neutral)
- Saturation levels
- Contrast characteristics
- Color temperature
- Shadow and highlight balance

**Recommendation Output:**
- Structured JSON with specific adjustment values
- Visual indicators (arrows, color swatches) in the UI
- Specific setting changes for PTZOptics cameras
- Before/after comparison visualization

**Business Applications:**
- Multi-camera color matching
- Maintaining consistent look across productions
- Quick setup matching to reference footage

**Personal Applications:**
- YouTube video color consistency
- Webcam quality improvement
- Matching a professional "look" for streaming

---

## Tool 8: Multimodal Fusion System

**What It Does:** Combines audio and video understanding for intelligent automation.

**Platform:** Python application with real-time dashboard

**How It Works:**
1. Processes video stream through vision model
2. Simultaneously processes audio through speech recognition or audio analysis
3. Fusion engine combines insights from both
4. Triggers actions when combined conditions are met

**Architecture:**
- **Audio Pipeline:** Microphone → Whisper/audio analysis → transcription or instrument detection
- **Visual Pipeline:** Camera → Moondream → scene understanding
- **Fusion Logic:** Combines both signals to trigger appropriate actions

**Example: Concert Camera Automator**

The system listens to live music and watches the stage simultaneously:
- Audio detects which instrument is currently soloing (saxophone, piano, drums)
- Vision locates "the person playing saxophone" on stage
- PTZ camera smoothly tracks to that performer
- When the solo transitions to piano, camera follows

The music itself directs the camera—no operator needed.

**Example: Smart Conference Room**
- "Meeting start" = multiple people seated + "let's begin" spoken
- "Presenter active" = person at podium + voice detected
- "Question time" = raised hand + silence from presenter

**Business Applications:**
- Concert and worship music coverage
- Conference room automation
- Intelligent production switching

**Personal Applications:**
- Band practice recording (auto-follow solos)
- Smart home voice + presence commands
- Context-aware automation

---

## Repository Structure

The Visual Reasoning Playground organizes code into logical categories:

**Vision Models:** Basic scene understanding tools (describe, detect, analyze)

**Object Tracking:** PTZ control and counting systems

**Zone Monitoring:** Location-based trigger systems

**Color Matching:** Visual consistency tools

**Audio Processing:** Speech recognition and audio analysis

**Multimodal Systems:** Combined audio/video intelligence

**Production Automation:** vMix, OBS, and PTZOptics integration

**Visual Reasoning Harness:** Core framework and utilities

---

## Environment Setup

All tools require similar setup:

**Required Credentials:**
- Moondream API key for vision capabilities
- PTZOptics camera IP for camera control tools
- vMix or OBS connection details for production tools

**Environment Variables:**
Store all credentials in a `.env` file that's never committed to version control. Each tool includes a `.env.example` showing required variables.

**Common Dependencies:**
- Python 3.9+ or Node.js 18+
- Modern web browser for web-based tools
- Network access to cameras and production software

---

## Customization Philosophy

These tools are starting points, not finished products. The expectation is that you'll modify them for your specific needs using Cursor or similar AI coding tools.

**Common Customizations:**
- Adjusting detection targets and thresholds
- Adding new trigger conditions
- Integrating with your specific production software
- Modifying the UI to match your workflow
- Combining multiple tools into unified systems

The code is deliberately simple and well-documented to make customization straightforward. When you need changes, describe what you want to your AI coding assistant and let it handle the implementation details.

---

*For the latest updates, bug fixes, and community contributions, visit the GitHub repository.*
