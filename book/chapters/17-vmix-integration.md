# Chapter 17: vMix Integration

We've built visual reasoning systems that can see, hear, and make decisions. We've integrated with OBS for accessible production and mastered PTZ camera control. Now we connect to vMix—the professional choice for Windows-based live production.

**Note:** This chapter is for vMix users who want to adapt the visual reasoning patterns from Chapter 15 (OBS) to their preferred platform. If you're new to production integration, start with Chapter 15—the concepts transfer directly, and OBS is free and cross-platform. If you're already a vMix user, this chapter shows you how to apply everything you've learned.

## Pipeline Stages in This Project

Like OBS integration, vMix is primarily about Stage 5 (Control/Outputs):

- **Stage 1: Media Inputs** — vMix captures from cameras, NDI sources, etc. (vMix handles this)
- **Stage 2: Perception** — Your visual reasoning system analyzes video inputs
- **Stage 3: Reasoning (VLM)** — Moondream detects objects, gestures, scene state
- **Stage 4: Decision (Guardrails)** — Confidence thresholds, rate limiting, safety logic
- **Stage 5: Control (Outputs)** — vMix HTTP API commands for switching, overlays, recording

**What's different from OBS:** The pipeline is identical—only the Stage 5 implementation changes. vMix uses HTTP REST calls instead of WebSocket. Same visual reasoning, different control protocol.

## Why vMix?

vMix is widely used in broadcast, streaming, worship, corporate events, and education. If you're doing professional live production on Windows, there's a good chance you're using vMix or have considered it.

More importantly for us, vMix has a comprehensive API. You can control almost everything through simple web requests—switch inputs, trigger transitions, start recordings, display graphics, and more. This makes it a perfect target for visual reasoning automation.

Combined with the OBS integration from Chapter 15 and PTZ control from Chapter 16, you now have a complete production automation toolkit. The patterns from OBS transfer directly—the concept is the same: detect something visually → trigger a production action. Only the specific commands differ.

## The vMix API Basics

vMix exposes an API on your local network that accepts simple commands. You tell it what function to perform, and it does it.

The key operations you'll use:
- **Cut** — Instant switch to a different input
- **Fade** — Smooth transition between inputs
- **Start/Stop Recording** — Control recording
- **Start/Stop Streaming** — Control your live stream
- **Overlay controls** — Show or hide graphics
- **Set Text** — Update text in title graphics

## A Simple API Command

Here's what a vMix API command looks like. To switch to Input 2 using a cut:

```
http://127.0.0.1:8088/api/?Function=Cut&Input=2
```

That's it—a URL with a Function and its parameters. You can test this directly in your web browser while vMix is running. Type the URL, hit enter, and watch vMix switch inputs.

**Breaking down the structure:**

- `http://127.0.0.1:8088` — vMix's local address (127.0.0.1 means "this computer," 8088 is the default port)
- `/api/` — The API endpoint
- `?Function=Cut` — The action you want (Cut, Fade, StartRecording, etc.)
- `&Input=2` — The parameter (which input to cut to)

**Common commands you'll use:**

- `Function=Cut&Input=2` — Instant switch to Input 2
- `Function=Fade&Input=3&Duration=500` — Fade to Input 3 over 500ms
- `Function=StartRecording` — Start recording
- `Function=StopRecording` — Stop recording
- `Function=OverlayInput1In&Input=5` — Show Input 5 on Overlay 1
- `Function=SetText&Input=4&SelectedName=Title.Text&Value=Hello` — Update text in a title

**Where to find all available commands:**

The complete vMix API documentation is at: **https://www.vmix.com/help27/ShortcutFunctionReference.html**

This reference lists every function, its parameters, and examples. When you ask Cursor to build vMix integration, it will use this documentation to generate the correct commands for whatever automation you want to create.

**Testing before coding:**

Before writing any integration code, test commands manually. Open your browser, type a command URL, and verify vMix responds. This confirms your API is accessible and helps you understand how the parameters work.

## The Integration Pattern

The pattern is straightforward:

Your visual reasoning system (Moondream) detects something. Your logic determines the appropriate response. Your integration layer sends the corresponding vMix command.

It's a three-step flow: **Detect → Decide → Act**

What makes this powerful is that the detection can be anything you can describe. "Person raises hand." "Speaker walks to podium." "Scoreboard shows new number." "Room becomes empty." Any of these can trigger any vMix action.

## Practical Applications

### Gesture-Controlled Switching

Imagine controlling your production with hand gestures:
- Thumbs up → Switch to camera 1
- Thumbs down → Switch to camera 2
- Open hand → Cut to wide shot

The visual reasoning identifies the gesture; the integration translates that to vMix commands. No hardware controllers needed—just a camera watching for specific movements.

### Auto-Switch to Active Speaker

You have multiple cameras on different people. When someone starts speaking, switch to their camera.

You can approach this through vision (detecting who's gesturing or has their mouth moving) or through audio (identifying which microphone is active). Better yet, combine both: vision identifies who's present and their positions, audio identifies who's speaking, and your logic maps speaker to camera.

### Lower Third Automation

When a specific person enters frame, display their name graphic.

Use visual detection to identify when your CEO, pastor, or guest speaker appears on camera. When detected with high confidence, trigger the appropriate lower third overlay. When they leave frame, remove it.

### Automatic BRB Screen

When the presenter leaves frame, switch to a "Be Right Back" graphic.

Monitor for person detection. When no person is detected for more than a few seconds, trigger the BRB. When someone returns, switch back to the main view.

### Score Bug Updates

For sports broadcasts, detect the scoreboard and update vMix graphics automatically.

Use visual reasoning to read the score from a physical scoreboard or another video feed. When the score changes, update your vMix title graphics to match. No manual data entry during the game.

## Handling Transitions

vMix supports various transition types. Choose appropriately:

**Cut** — Instant switch. Good for fast-paced content or when you want immediate response to visual triggers.

**Fade** — Smooth crossfade. Better for most automated switches—less jarring if the AI makes a mistake.

**Transitions with duration** — Give viewers time to adjust. A half-second fade is often better than an instant cut for automated systems.

For visual reasoning triggers, I recommend using fades rather than cuts. If the detection was wrong, a fade looks like an intentional transition. A cut looks like a mistake.

## Safety Mechanisms

Automated production control needs safeguards:

### Confidence Thresholds

Don't trigger production changes on low-confidence detections. Set a high bar—maybe 85% confidence—before allowing a switch. This prevents jittery, uncertain detections from causing chaos in your production.

### Rate Limiting

Don't switch too frequently. Even if the AI is confident, rapid switching looks chaotic and can indicate a problem. Set a minimum time between switches—maybe two or three seconds.

### Manual Override

Always provide a way for humans to take control. A single button or hotkey should disable all automation instantly. The operator should be able to resume automation just as easily.

### Logging

Log every automated action for review. Record what was detected, what action was taken, and with what confidence. After a production, you can review what happened and tune your thresholds accordingly.

## Business Example: Automated Worship Service

Worship services often have predictable structures: worship music, announcements, sermon, closing. Visual reasoning can assist the production team.

**During worship:**
- Detect the worship leader and keep them framed
- Switch to wide shots during instrumental sections
- Show lyrics when the confidence of "singing" is high

**During sermon:**
- Track the pastor with PTZ
- Switch to scripture graphics when the pastor gestures toward the screen
- Cut to audience shots when appropriate (applause detection)

**During announcements:**
- Show lower third for each speaker
- Switch between speakers as they present

This doesn't replace a production team—it assists them. The operator can focus on creative decisions while automation handles routine switching.

## Personal Example: Stream Automation

You're a solo streamer. You can't be operating production software while also being on camera.

**Auto-BRB:** When you leave frame, switch to BRB screen.

**Auto-return:** When you come back, switch back to main camera.

**Gesture controls:** Thumbs up to trigger a celebration graphic. Point to trigger a "look at this" animation.

**Game detection:** When a game window is visible, switch to game capture. When it's not, switch back to camera.

This level of automation turns a one-person stream into something that feels professionally produced.

## Making It Your Own

When you're ready to build vMix integration, here are the kinds of requests you might make to Cursor:

- "Build a basic vMix controller that switches between three inputs based on visual detection"
- "Add a lower third when a specific person is detected"
- "Fade to a BRB screen when no person is detected for 10 seconds"
- "Add a dashboard that shows what the automation is doing"
- "Log all automated switches with timestamps and confidence scores"

The vMix API is well-documented, and Cursor can generate the integration code for whatever scenario you need.

## What You've Learned

vMix integration connects visual reasoning to real production workflows:

- How the vMix API works and what it can control
- The Detect → Decide → Act pattern
- Gesture-controlled switching
- Automatic graphics triggers
- Safety mechanisms: thresholds, rate limiting, override
- Practical applications in worship and streaming

The same patterns apply to any production software with an API. The visual reasoning is the same; only the commands change.

This completes Part V: Production Automation. Your visual reasoning systems can now control OBS, PTZ cameras, and vMix—the core tools of modern production.

---

*Chapter 18: What is a Harness? — understanding the architecture that makes visual reasoning systems maintainable and scalable.*
