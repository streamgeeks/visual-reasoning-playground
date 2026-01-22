# Part V: Production Automation

# Chapter 15: OBS Integration

OBS Studio is the most widely used open-source streaming and recording software. It runs on Windows, Mac, and Linux. It's free. And it has a powerful WebSocket API that lets you control almost everything programmatically.

Millions of streamers, educators, and content creators use OBS daily. It's the perfect entry point for visual reasoning integration—accessible, well-documented, and powerful. Let's connect visual reasoning to OBS.

**Note:** This chapter covers OBS as our primary production integration platform. The patterns you learn here transfer directly to vMix and other production software. If you're a vMix user, Chapter 17 shows how to adapt these concepts—but start here to understand the fundamentals.

## Pipeline Stages in This Project

OBS integration is primarily about Stage 5 (Control/Outputs) of our pipeline. Here's the full picture:

- **Stage 1: Media Inputs** — OBS captures from cameras, screen shares, etc. (OBS handles this)
- **Stage 2: Perception** — Your visual reasoning system analyzes one of those inputs
- **Stage 3: Reasoning (VLM)** — Moondream detects objects, gestures, or scene state
- **Stage 4: Decision (Guardrails)** — Confidence thresholds, rate limiting, manual override logic
- **Stage 5: Control (Outputs)** — OBS WebSocket commands for scene switching, source visibility, recording control

**What's different from previous projects:** This chapter focuses on Stage 5—the output layer. You'll learn how to send commands to OBS via WebSocket. The visual reasoning stages (1-4) remain the same as previous chapters; we're just adding a new control destination.

## OBS WebSocket

OBS control works through the WebSocket protocol. In recent versions of OBS (28+), the WebSocket server is built in—no separate installation required.

To enable it, open OBS, go to Tools → WebSocket Server Settings, and enable the server. Note the port (default 4455) and set a password if you want security.

OBS uses WebSocket—a persistent connection that allows two-way communication. You can send commands AND receive events (like when someone manually switches scenes). This makes OBS integration powerful because your visual reasoning system can react to what's happening in OBS, not just control it.

## A Simple API Command

Here's what an OBS WebSocket command looks like. To switch to a scene called "Camera 2":

```
SetCurrentProgramScene
  sceneName: "Camera 2"
```

That's the essence of it—a request type and its parameters. The WebSocket library handles the connection details; you just specify what you want to happen.

**Common commands you'll use:**

- `SetCurrentProgramScene` — Switch which scene is live (sceneName parameter)
- `SetSourceVisibility` — Show or hide a source within a scene (sceneName, sourceName, visible parameters)
- `StartRecord` / `StopRecord` — Control recording
- `StartStream` / `StopStream` — Control streaming
- `SetInputSettings` — Update source properties like text content

**Where to find all available commands:**

The complete OBS WebSocket API documentation is at: **https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md**

This reference lists every request type, its parameters, and what it returns. When you ask Cursor to build OBS integration, it will use this documentation to generate the correct commands for whatever you want to accomplish.

## What You Can Control

The operations you'll use most:

**Switch scenes** — Change which scene is live on program output

**Set source visibility** — Show or hide individual sources within a scene

**Start/stop streaming** — Control your live stream

**Start/stop recording** — Control recording

**Change source settings** — Update text sources, image sources, or any configurable property

**Save replay buffer** — Capture the last N seconds as a clip

Everything you can do manually in OBS, you can do programmatically through the API.

## The Integration Pattern

The core pattern: **Detect → Decide → Act**

Your visual reasoning system detects something. Your logic determines the appropriate response. Your integration layer sends the corresponding OBS command.

The difference is that OBS can also send events back to you. When a scene changes, when streaming starts, when recording stops—your system can be notified and react accordingly.

## Browser Sources: AI-Powered Overlays

OBS has a killer feature for visual reasoning: browser sources. You can embed any web page as a source in OBS.

This means you can:
- Create a web page that displays visual reasoning output
- Add it as a browser source in OBS
- Have real-time AI information displayed on your stream

**Example: Live object detection overlay**

Create a web page that captures video, runs visual reasoning, and draws bounding boxes on a transparent background. Add this page as a browser source in OBS, positioned over your camera. Now your stream shows live AI detection boxes.

**Example: Real-time transcription**

Create a web page that captures audio, runs speech recognition, and displays scrolling captions. Add as a browser source at the bottom of your scene. Live AI-powered captions without any external service.

**Example: Scene description ticker**

Create a web page that periodically describes what the camera sees and displays it as scrolling text. Add as a browser source. Your stream now has an AI narrator.

Browser sources turn your visual reasoning tools into stream overlays with minimal integration work.

## Practical Applications

### Automatic Scene Switching

You have three scenes in OBS:
- "Just Chatting" — Your camera, full screen
- "Gaming" — Game capture with camera overlay
- "BRB" — Be right back screen

Visual reasoning can switch between them automatically:
- No person detected for 10+ seconds → switch to BRB
- Person present and game visible → switch to Gaming
- Person present and no game → switch to Just Chatting

You never have to touch scene controls. The system handles it.

### Educational Presenter Tracking

A teacher is giving a lesson. The camera needs to follow them, but OBS also needs to switch between:
- Full camera view (teacher explaining)
- Screen share (showing slides or demos)
- Picture-in-picture (teacher over slides)

Visual reasoning detects:
- Is the teacher at the podium or moving around?
- Is the teacher pointing at the screen?
- Is there meaningful content on the shared screen?

Based on these detections, OBS switches to the appropriate scene composition.

### Stream Alerts Based on Real-World Events

Typical stream alerts trigger on digital events: new followers, donations, subscriptions. What about real-world triggers?

Visual reasoning enables:
- Pet walks into frame → "Cat alert!" animation
- Mail carrier detected at door → "Mail's here!" notification
- Coffee mug empty → "Need more coffee" status

These are fun for entertainment streams, but the pattern applies to serious uses too.

### Automated Highlight Detection

You're streaming a gaming session and want to clip highlights automatically.

Visual reasoning detects:
- Celebration gestures (hands up, fist pump)
- Sudden movement suggesting excitement
- Visual elements indicating victory/achievement

When detected, trigger the replay buffer save. You end up with a collection of clips without ever pressing a button.

## Multi-Source Reasoning

OBS can capture from multiple sources. Visual reasoning can analyze any of them.

You might have three camera angles plus a game capture. You can analyze:
- Camera 1: Main angle, check for presenter
- Camera 2: Wide shot, count audience
- Camera 3: Detail camera, detect specific objects
- Game capture: Detect game state

Combine all inputs into intelligent scene selection. This is the OBS equivalent of a multi-camera production with AI direction.

## OBS + PTZ Integration

Combine PTZ tracking with OBS control.

Your PTZOptics camera is controlled by visual reasoning to keep the subject centered. That same camera feed goes into OBS. Visual reasoning also detects scene context (is the person presenting? demonstrating? taking questions?) and OBS switches scenes based on that context.

The PTZ tracking and OBS switching work together but independently. Each responds to visual reasoning in its own way.

## OBS Virtual Camera: Testing Without Hardware

OBS has a powerful feature for development and testing: Virtual Camera. It lets OBS output appear as a webcam that any application can capture.

**Why this matters for visual reasoning:**

You can play a video file in OBS, enable Virtual Camera, and your visual reasoning application sees it as a live webcam feed. This is invaluable for:

- **Reproducible testing** — Use the same video file every time to verify your detection logic
- **Development without hardware** — Build and test systems before deploying to real cameras
- **Demo environments** — Show clients what's possible without needing the actual venue
- **Sports scoreboard extraction** — Play a recording of a scoreboard and extract scores as if it were live

**The workflow:**

1. Add a Media Source in OBS pointing to your video file
2. Click "Start Virtual Camera" in OBS
3. Your application captures the "OBS Virtual Camera" as its video input
4. Visual reasoning processes the video as if it were a live feed

This technique is essential for Module 4 of the course, where we extract scores from a scoreboard video. Instead of needing access to a live game, you use a provided video file through Virtual Camera to build and test your extraction pipeline.

**Setting it up:**

In OBS, the Virtual Camera button is in the Controls panel (bottom right). Click it once to start, again to stop. Your operating system will show "OBS Virtual Camera" as an available webcam in any application that captures video.

For longer testing sessions, set your Media Source to loop. The video will play continuously, giving you a steady stream of test data.

## Safety and Override

Essential safety principles:

**Confidence thresholds** — Don't switch on uncertain detections

**Rate limiting** — Set a minimum time between scene changes

**Manual override** — A hotkey to disable all automation instantly

**Status indicator** — Add a source in OBS that shows automation status. Green when active, red when disabled. So you always know what's controlling the show.

## Making It Your Own

When you're ready to build OBS integration, here are the kinds of requests you might make to Cursor:

- "Set up a basic OBS WebSocket connection and switch between two scenes"
- "Create a browser source that shows live bounding boxes from visual detection"
- "Update an OBS text source with information from visual reasoning"
- "Automatically switch to BRB when I leave frame"
- "Save replay buffer clips when visual reasoning detects something exciting"

OBS's open nature means excellent documentation and community examples to draw from.

## What You've Learned

OBS integration extends visual reasoning to the most popular streaming software:

- OBS WebSocket connection and capabilities
- Scene switching based on visual detection
- Browser sources for AI-powered overlays
- Dynamic text and graphics updates
- Event-driven automation
- Multi-source visual reasoning
- Integration with PTZ camera control

Whether you use OBS professionally or personally, visual reasoning automation makes it smarter.

---

*Chapter 16: PTZOptics Advanced Control — beyond tracking to full camera automation.*
