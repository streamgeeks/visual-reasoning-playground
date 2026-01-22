# Part III: Building the Playground Tools

# Chapter 7: Auto-Track Any Object

This is the chapter I've been waiting to write.

Everything we've covered so far—the concepts, the web tools, the development environment—has been building to this moment. Now we're going to look at real code that does something genuinely useful: a PTZ camera that tracks any object you describe.

This is the PTZOptics Moondream Tracker. It's the first project Matt showed me in the R&D lab, and it's the one that made me realize visual reasoning was going to change our industry.

## Why This Changes Everything

First, let's talk about what we've built and why it matters.

**Auto-tracking for any PTZ camera.** Many newer PTZ cameras have onboard auto-tracking, but it's limited to basic person detection. Older cameras have no tracking at all. With this system, we've added visual reasoning auto-tracking to any PTZ camera—including models that never had this capability. If your camera can receive pan/tilt commands over the network, it can now track anything.

**Any object, animal, or person.** Traditional computer vision auto-tracking detects "a person." That's it. With visual reasoning, you can track anything you can describe: a specific product, your dog, a coffee mug, a drone, a forklift—whatever matters for your application.

**But here's where it gets really interesting: person descriptions.**

Traditional CV sees "person" as a single class. Visual reasoning understands context. Instead of tracking "a person," you can track:

- "The active presenter" — the person currently speaking or gesturing
- "The most engaged person in the audience" — someone leaning forward, nodding, paying attention
- "Someone having a funny reaction" — capture crowd moments in live production
- "The person at the podium" vs "the person at the whiteboard"
- "The guest in the blue jacket" — distinguish between multiple people on set

From a production standpoint, this is transformative. You're not just detecting humans—you're understanding who matters in the scene and why.

**And later in this book, we'll take it further.** When we pair visual reasoning with audio inputs in the capstone projects, you'll be able to talk to your PTZ camera. Give it instructions in natural language, just like you would with a human camera operator: "Follow the speaker." "Get a wide shot of the audience." "Find someone who looks confused." Everything automated, everything conversational.

But let's start with the foundation. Here's how the tracker works.

## The ProAV Visual Reasoning Pipeline

Before we look at code, let's understand the architecture. This 5-stage pipeline will repeat throughout the book and course—every project follows the same structure. Learn it once, apply it everywhere.

**Stage 1: Media Inputs**
- Video and optional audio from any source
- RTSP streams, NDI, video files, webcams
- Timestamps for synchronization
- Audio slices for multimodal projects

**Stage 2: Perception**
- Fast, stable signal extraction
- Bounding boxes, pose detection, object tracks
- OCR text extraction
- Embeddings for similarity matching
- This is where traditional CV tools like MediaPipe live

**Stage 3: Reasoning (VLM)**
- Interpretation—understanding what matters
- Scene state and context
- Grounded JSON outputs (structured data we can use)
- This is where Moondream does its work

**Stage 4: Decision (Guardrails)**
- Policy and safety rails
- Confidence thresholds (don't act on uncertain data)
- Cooldowns (prevent rapid-fire triggers)
- Smoothing (stabilize jittery signals)

**Stage 5: Control (Outputs)**
- Actions to production systems
- vMix, OBS, TriCaster commands
- PTZ camera control
- Overlay updates, logging, alerts

**In this chapter, we're implementing:**
- **Stage 1:** Webcam input
- **Stage 3:** Moondream for object detection
- **Stage 4:** Deadzone smoothing, confidence thresholds
- **Stage 5:** PTZ camera commands

As we progress through the book, you'll see how different projects emphasize different stages. The Smart Counter adds more Stage 4 logic. The Scene Analyzer focuses on Stage 3 structured outputs. The multimodal projects add audio to Stage 1. But the pipeline stays the same.

## The Interface

When you open the tracker in your browser, you'll see a simple interface with a few key inputs:

- **Moondream API Key** — A text field where you paste your API key from Chapter 5. This authenticates your requests to the Moondream service. Your key is stored locally in your browser and never shared.

- **Track Target** — A text field where you type what you want to track. This is where visual reasoning shines: type "person" or "coffee mug" or "dog" or "presenter in blue shirt"—whatever you want the camera to follow. You can change this anytime without restarting.

- **PTZ Camera IP** — The network address of your PTZOptics camera (if you have one). If you're just testing detection without a PTZ camera, you can leave this blank.

- **Start/Stop Tracking** — Click to begin or end the tracking loop.

The interface also shows a live video feed with detection boxes drawn around tracked objects, plus status information showing confidence levels and camera movement commands.

## The Three Files

Open the `ptzoptics-tracker` folder in Cursor. You'll see several files, but three are the heart of the system:

### moondream.js — The Eyes

This file handles communication with the Moondream API. It's responsible for:

- Capturing a frame from the video feed
- Converting it to a format the API accepts
- Sending it to Moondream with your detection request
- Returning the results

Ask Cursor: *"Explain what moondream.js does and how it captures frames"*

The key function is `detectInVideo()`. It takes a video element and an object description ("person," "coffee mug," whatever you want to track), and returns detection data including coordinates and confidence scores.

### ptz_control.js — The Muscles

This file controls the PTZ camera. It's responsible for:

- Connecting to your PTZOptics camera via its HTTP API
- Sending pan, tilt, and zoom commands
- Managing movement speed and smoothing
- Knowing when to move and when to stop

Ask Cursor: *"Explain how ptz_control.js moves the camera"*

The key function is `trackObject()`. It takes the detection coordinates from Moondream and calculates which direction the camera needs to move to center the object in frame.

### app.js — The Brain

This file ties everything together. It's responsible for:

- Managing the user interface
- Running the detection loop
- Coordinating between Moondream and PTZ control
- Handling settings and configuration

Ask Cursor: *"Explain the main tracking loop in app.js"*

The key function is `detectionLoop()`. It runs continuously while tracking is active, calling Moondream to detect the object and then telling the PTZ controller to adjust the camera position.

## How Tracking Actually Works

Let me walk you through what happens when you click "Start Tracking":

**1. The loop starts**

The system begins running `detectionLoop()` at whatever rate you've configured—say, once per second.

**2. Capture a frame**

The `captureFrame()` function in moondream.js grabs the current video frame from your webcam and converts it to a format the API can accept.

**3. Send to Moondream**

The frame and your object description ("person," "red ball," whatever) are sent to the Moondream API. The API analyzes the image and looks for matches.

**4. Receive detection results**

Moondream returns data about what it found: the coordinates of each detected object (as a bounding box) and a confidence score for each detection.

**5. Calculate camera movement**

The `trackObject()` function in ptz_control.js looks at where the object is in the frame. If it's to the left of center, the camera needs to pan left. If it's below center, the camera needs to tilt down. If it's already centered (within a tolerance zone), the camera stays still.

**6. Send PTZ commands**

The system sends HTTP commands to your PTZOptics camera: pan left, pan right, tilt up, tilt down, or stop. The camera physically moves.

**7. Repeat**

The loop continues, constantly adjusting to keep the object centered.

This all happens automatically, continuously, as long as tracking is active. The camera follows the object wherever it goes.

## The Detection Rate Trade-off

One of the first things you'll notice in the interface is the detection rate slider. This controls how many times per second the system queries Moondream.

**Faster detection (2-5 per second):**
- More responsive tracking
- Camera adjusts quickly to movement
- Higher API costs
- Good for fast-moving objects

**Slower detection (0.3-1 per second):**
- Less responsive, but smoother
- Camera movements are more gradual
- Lower API costs
- Good for slow-moving objects or cost-sensitive deployments

The default is 1 detection per second—a good balance for most situations. But you can adjust this based on your needs.

Ask Cursor: *"How would I change the default detection rate to 2 per second?"*

## Operation Presets

We've built in several presets that configure multiple settings at once for common use cases:

**Smooth Tracking**
- Detection rate: 0.5/second
- Pan/tilt speed: 3 (slow)
- Deadzone: 12% (wide tolerance)
- Best for: Broadcast production where smooth, graceful camera movement matters

**Precise Centering**
- Detection rate: 1.5/second
- Pan/tilt speed: 6 (medium-fast)
- Deadzone: 2% (tight tolerance)
- Best for: Presentations where you want the subject tightly centered

**Balanced**
- Detection rate: 1.0/second
- Pan/tilt speed: 5 (medium)
- Deadzone: 5% (moderate tolerance)
- Best for: General use, a good starting point

**Fast Response**
- Detection rate: 2.0/second
- Pan/tilt speed: 8 (fast)
- Deadzone: 8% (moderate tolerance)
- Best for: Sports or action where subjects move quickly

**Minimal Movement**
- Detection rate: 0.3/second
- Pan/tilt speed: 4 (medium-slow)
- Deadzone: 15% (very wide tolerance)
- Best for: Reducing API usage and camera wear

These presets are starting points. You can switch to "Custom" mode and adjust individual settings to match your specific needs.

## The Deadzone: Why the Camera Doesn't Constantly Move

You might wonder: if the camera is always trying to center the object, wouldn't it constantly be making tiny adjustments?

The answer is the deadzone—a tolerance area around the center of the frame. If the object is within this zone, the camera doesn't move. It's "close enough."

A 5% deadzone means the object can drift 2.5% from center in any direction before the camera responds. This prevents jittery, constant movement while still keeping the object reasonably centered.

Smaller deadzone = tighter centering, more camera movement
Larger deadzone = looser centering, smoother operation

For broadcast, you typically want a larger deadzone. Nobody wants to watch a camera that's constantly making micro-adjustments. For applications where precise centering matters more than smoothness, use a smaller deadzone.

## Business Example: Speaker Tracking

Let's put this into a real-world context.

You're setting up a conference room or lecture hall. The speaker moves around while presenting—walking to the whiteboard, returning to the podium, moving into the audience for Q&A. Traditionally, you'd need a camera operator following them, or an expensive auto-tracking system with specialized hardware.

With the PTZOptics Moondream Tracker:

1. Mount a PTZOptics camera with a view of the presentation area
2. Run the tracker on a computer connected to the same network
3. Set the target object to "person" or "presenter" or "person in blue suit"
4. Choose the "Smooth Tracking" preset for broadcast-quality movement
5. Click Start Tracking

The camera now follows the speaker automatically. No dedicated operator needed. No expensive proprietary tracking system. Just visual reasoning and a standard PTZ camera.

**Refinements for production use:**

- Use a more specific description if there are multiple people: "person standing" or "person at podium"
- Adjust the center offset if you want the speaker framed slightly off-center (rule of thirds)
- Increase the deadzone if the camera movement is too jittery
- Decrease detection rate if you're concerned about API costs over long events

## Personal Example: Pet Camera

Now let's have some fun.

You want to keep an eye on your dog while you're at work. A static camera captures part of the room, but your dog moves around. Wouldn't it be nice if the camera followed them?

1. Set up a PTZOptics camera (or any PTZ camera with HTTP API support) overlooking your living room
2. Run the tracker
3. Set the target object to "dog" or "golden retriever" or whatever describes your pet
4. Choose the "Balanced" preset
5. Start tracking

Now you have a pet camera that actually follows your pet. Check in from your phone and see what they're up to, wherever they are in the room.

This sounds trivial compared to the business example, but remember: the person who builds a pet tracker understands how to build a speaker tracker. The technology is identical. Only the context changes.

## What If the Target Changed Automatically?

Here's a thought that might have occurred to you: we're manually entering what to track. "Person." "Dog." "Coffee mug." But what if the system could decide what to track based on other inputs?

Imagine you're filming a live band. Right now, you'd have to type "saxophone" when the sax solo starts, then "piano" when the piano solo starts, then "drums" for the drum fill. That's a lot of manual work—and you'd need to know when each solo was coming.

But what if the system could listen to the music?

Audio AI can identify which instrument is playing. When it hears a saxophone taking a solo, it knows. When the piano takes over, it knows that too. What if that audio intelligence could feed directly into our tracking system?

"Track whatever instrument is currently soloing."

The camera would automatically find and follow the saxophonist during the sax solo, smoothly transition to the pianist when the piano takes the lead, and catch the drummer during drum breaks. No manual input needed. The audio tells the system what to look for; the vision finds it.

This is exactly what we'll build in Chapter 14 when we explore multimodal fusion—combining audio and visual AI into systems that are smarter than either alone. The Concert Camera Automator is one of my favorite examples of what becomes possible when you combine what the system hears with what it sees.

For now, just know that the tracking architecture you're learning here is the foundation. The "what to track" input can come from anywhere—including from AI that's listening to the world.

## Making It Your Own

Here's where agentic coding shines. You don't need to deeply understand the code to modify it. You can ask Cursor to make changes in natural language.

Try these:

*"I want to add a second detection target so I can track two different objects with different colored boxes"*

*"How can I add a button that saves a snapshot when the tracked object is centered?"*

*"I want to log every detection to a file so I can analyze tracking accuracy later"*

*"Can we add a feature that sends an alert if the tracked object leaves the frame for more than 10 seconds?"*

*"How would I modify this to work with a different brand of PTZ camera?"*

For each request, Cursor will examine the existing code, understand the architecture, and suggest modifications. It might write the code for you, or guide you through making the changes yourself.

This is the power of starting with working code. You're not building from scratch—you're customizing and extending something that already works.

## Understanding the PTZOptics API

The tracker uses the PTZOptics HTTP API to control the camera. This is a simple REST API that accepts commands via HTTP GET requests.

When the tracker wants to pan right, it sends a request to your camera's IP address with a command like "pan right at speed 5." Similar commands exist for left, up, down, and stop.

If you have a different brand of PTZ camera, you'll need to modify the `sendCommand()` function in ptz_control.js to match your camera's API. Ask Cursor:

*"My camera uses VISCA over IP instead of HTTP commands. How would I modify ptz_control.js to work with it?"*

The beauty of this architecture is that the Moondream integration doesn't care how you control the camera. You can swap out the PTZ control layer without touching the visual reasoning code.

## What You've Learned

After working through this chapter, you understand:

- The capture → analyze → act architecture pattern
- How the three main files work together
- The tracking loop and how it maintains continuous tracking
- Detection rate trade-offs
- Operation presets and when to use them
- The deadzone concept and why it matters
- How to customize the tracker using natural language and Cursor

You've also seen how the same tool serves both professional production (speaker tracking) and personal use (pet camera). The pattern is universal.

## What's Next

The auto-tracker is our most complete example—it demonstrates the full loop from visual input to physical action. In the next chapter, we'll build something simpler but equally useful: a smart counter that tracks objects entering and leaving a space.

Same architecture pattern. Different action layer. Another tool in your Visual Reasoning Playground.

---

*Chapter 8: Smart Counter — counting objects with visual reasoning and building analytics over time.*
