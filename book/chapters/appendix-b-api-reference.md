# Appendix B: API Quick Reference

This appendix provides a conceptual overview of the APIs used throughout this book. Rather than detailed code samples (which your AI coding assistant will generate for you), this reference helps you understand what each API does and when to use it.

---

## Moondream API

**What It Is:** The vision-language model API that powers most visual reasoning capabilities in this book.

**Base URL:** `https://api.moondream.ai/v1`

**Authentication:** API key in request header

### Available Endpoints

**Describe Endpoint**
- **Purpose:** Generates natural language description of an image
- **Input:** Image (base64 or URL)
- **Output:** Text description of what's in the scene
- **Use When:** You need a general understanding of what the camera sees

**Detect Endpoint**
- **Purpose:** Finds and locates specific objects
- **Input:** Image plus object description (e.g., "person," "red car")
- **Output:** Bounding boxes with coordinates and confidence scores
- **Use When:** You need to know where something is in the frame

**Ask Endpoint**
- **Purpose:** Answers questions about an image
- **Input:** Image plus natural language question
- **Output:** Text answer with confidence score
- **Use When:** You need specific information about what's visible

**Point Endpoint**
- **Purpose:** Returns coordinates of a described location
- **Input:** Image plus description (e.g., "the red button")
- **Output:** X/Y coordinates pointing to that location
- **Use When:** You need precise location without a full bounding box

### Understanding Coordinates

All Moondream coordinates are **normalized** (values from 0 to 1):
- `x: 0` means left edge, `x: 1` means right edge
- `y: 0` means top edge, `y: 1` means bottom edge
- `x: 0.5, y: 0.5` means center of frame

This normalization means coordinates work regardless of resolution—the same coordinates work for 720p, 1080p, or 4K frames.

### Rate Limits

Moondream has usage tiers:

| Tier | Approximate Requests/Minute |
|------|----------------------------|
| Free | 20 |
| Starter | 60 |
| Pro | 200 |
| Enterprise | Custom |

Design your systems to stay within limits. If you hit rate limits, reduce detection frequency or implement request queuing.

---

## PTZOptics API 2.0

**What It Is:** HTTP-based control interface for PTZOptics cameras.

**Base URL:** `http://{camera_ip}/cgi-bin/`

**Authentication:** Basic auth if configured on camera

### Key Capabilities

**Position Control**
- Get current pan/tilt/zoom position
- Move to absolute position with specified speed
- Relative movement (pan left, tilt up, zoom in, etc.)
- Stop all movement

**Preset Operations**
- Save current position as a numbered preset
- Recall any saved preset instantly
- Cameras typically support 100+ presets

**Image Settings**
- Adjust brightness, contrast, saturation
- Control sharpness and hue
- Useful for the Color Correction Assistant tool

### Movement Parameters

| Parameter | What It Controls |
|-----------|------------------|
| Pan | Horizontal position (0-360 degrees) |
| Tilt | Vertical position (typically -30 to +30 degrees) |
| Zoom | Focal length (wider to telephoto) |
| Speed | How fast the camera moves (1-24) |

### Practical Considerations

- **Network:** Camera must be on same network as your computer
- **Latency:** HTTP commands have some inherent delay
- **Continuous Movement:** Start movement, then stop it (not instantaneous jump)
- **Preset Speed:** Preset recalls are typically faster than manual movement

---

## vMix API

**What It Is:** HTTP-based control for vMix production software.

**Base URL:** `http://{vmix_host}:8088/api/`

**Authentication:** None required for local connections

### Key Capabilities

**Switching**
- Cut or fade to any input
- Use configured transition effects
- Control which input is on program vs. preview

**Overlays**
- Turn overlay channels on/off
- Control which inputs appear in overlay slots

**Text and Graphics**
- Update text values in title templates
- Change graphics dynamically based on detected conditions

**Recording and Streaming**
- Start/stop recording
- Start/stop streaming
- Check current status

### Input Identification

vMix inputs can be referenced by:
- **Number:** Input 1, Input 2, etc.
- **Name:** The name shown in vMix interface

Using names is more readable but requires URL encoding for spaces and special characters.

### Common Visual Reasoning Integrations

| Detection | vMix Action |
|-----------|-------------|
| Person enters frame | Cut to that camera |
| Speaker at podium | Fade to podium shot |
| Audience applause | Switch to wide shot |
| Scoreboard change | Update graphics overlay |

---

## OBS WebSocket

**What It Is:** Real-time bidirectional control for OBS Studio.

**Protocol:** WebSocket (persistent connection)

**Default Port:** 4455 (OBS WebSocket 5.x)

**Authentication:** Optional password-based authentication

### Key Capabilities

**Scene Control**
- Switch to any scene (program)
- Set preview scene (studio mode)
- Get list of available scenes

**Source Control**
- Show/hide individual sources within scenes
- Control source properties
- Manage source visibility

**Recording and Streaming**
- Start/stop recording
- Start/stop streaming
- Check current states

**Events**
- Subscribe to scene changes
- Get notified of stream/record state changes
- Monitor source visibility changes

### WebSocket vs. HTTP

Unlike vMix's HTTP API, OBS uses WebSocket:
- **Persistent connection:** Opens once, stays connected
- **Bidirectional:** OBS can push events to you
- **Real-time:** Lower latency for frequent commands

### Common Visual Reasoning Integrations

| Detection | OBS Action |
|-----------|------------|
| Person detected | Switch to "Person Present" scene |
| Multiple people | Switch to wide shot scene |
| Specific gesture | Trigger scene transition |
| Keyword spoken | Show/hide specific source |

---

## Whisper API

**What It Is:** Speech-to-text model from OpenAI.

**Purpose:** Convert spoken audio to text for multimodal systems.

### Cloud vs. Local

**OpenAI Cloud API:**
- No local hardware requirements
- Per-minute pricing
- Always latest model version

**Local Whisper (faster-whisper):**
- Runs on your hardware
- No per-use cost after setup
- Requires capable GPU for real-time processing

### Model Size Tradeoffs

| Size | Speed | Accuracy | Use Case |
|------|-------|----------|----------|
| Tiny | Fastest | Lower | Real-time, accuracy less critical |
| Base | Fast | Good | Balanced performance |
| Small | Medium | Better | Most production uses |
| Medium | Slow | High | Accuracy-critical applications |
| Large | Slowest | Highest | When accuracy is paramount |

### Common Visual Reasoning Integrations

Whisper provides the "audio understanding" in multimodal systems:
- Detect spoken commands ("Switch to camera two")
- Identify meeting phases ("Let's move to questions")
- Recognize keywords that should trigger actions
- Provide transcript for logging and review

---

## NDI (Network Device Interface)

**What It Is:** Protocol for video over IP networks.

**Purpose:** Send and receive video between devices without dedicated cables.

### Key Characteristics

- **Discovery:** NDI sources announce themselves on the network
- **Quality:** Full-quality video (unlike compressed streams)
- **Latency:** Low latency, suitable for live production
- **Flexibility:** Any NDI device can send to any other

### Common NDI Sources

- NDI-capable cameras
- vMix outputs
- OBS outputs (with NDI plugin)
- Screen capture tools
- Video playback software

### Visual Reasoning Integration

NDI provides a clean way to capture video for analysis:
- Capture any NDI source without direct camera connection
- Analyze vMix program output
- Process video from remote locations on the same network

---

## HTTP Concepts

Understanding basic HTTP helps when working with these APIs.

### Request Methods

| Method | Purpose |
|--------|---------|
| GET | Retrieve information or trigger action (most common for these APIs) |
| POST | Send data to create or update something |

### Status Codes

| Code | Meaning | What To Do |
|------|---------|------------|
| 200 | Success | Process the response |
| 400 | Bad request | Check your parameters |
| 401 | Unauthorized | Check your API key |
| 429 | Rate limited | Wait and retry |
| 500 | Server error | Retry after a delay |

### Common Headers

Most APIs need:
- **Content-Type:** Usually `application/json`
- **Authorization:** API key or token
- **Accept:** What format you want back

---

## Choosing the Right Endpoint

When building visual reasoning systems, match the task to the right API call:

| Task | Use This |
|------|----------|
| "What's happening in this scene?" | Moondream Describe |
| "Where is the person?" | Moondream Detect |
| "Is the door open?" | Moondream Ask |
| "Point to the red button" | Moondream Point |
| "Move camera to follow subject" | PTZOptics movement |
| "Switch to camera 2" | vMix or OBS |
| "What did they say?" | Whisper |
| "Is someone speaking AND visible?" | Combine Whisper + Moondream |

---

## Rate Limiting Strategies

When using cloud APIs, staying within rate limits matters:

**Reduce Frequency**
- Don't analyze every frame—once per second is often enough
- Use motion detection to trigger analysis only when something changes

**Cache Results**
- If the scene hasn't changed, reuse the previous analysis
- Set reasonable cache expiration based on your use case

**Queue Requests**
- Buffer requests during bursts
- Process them at a sustainable rate

**Use Local Models**
- For high-frequency needs, local models have no rate limits
- Trade-off: requires capable hardware

---

*For current API documentation, always check the official sources. APIs evolve, and the latest documentation will have the most accurate details.*
