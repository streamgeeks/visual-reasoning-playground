# Module 2: Visual Understanding & Object Tracking

---

## SLIDE 1: Title

**Module 2**
# Visual Understanding & Object Tracking

Visual Reasoning AI for Broadcast & ProAV

*From understanding to action—your cameras start moving.*

---

## SLIDE 2: Learning Objectives

**By the end of this module, you will be able to:**

1. Apply the 5-Stage ProAV Pipeline to any visual reasoning project
2. Draw bounding boxes around detected objects
3. Interpret confidence scores and use them for decision-making
4. Choose between VLMs and traditional CV for different tasks
5. Build an object tracker that follows anything you describe

---

## SLIDE 3: The 5-Stage Pipeline

**Every project follows this structure:**

```
Media → Perception → Reasoning → Decision → Control
```

| Stage | What Happens | Example |
|-------|--------------|---------|
| **Media** | Video/audio inputs | Webcam, RTSP, NDI |
| **Perception** | Fast signals | Bounding boxes, pose data |
| **Reasoning** | VLM interprets | "Person at podium" |
| **Decision** | Guardrails | Confidence > 80%? |
| **Control** | Actions | Move PTZ camera |

*Learn it once. Use it everywhere.*

---

## SLIDE 4: Pipeline in Action

**Tracking a Speaker Example:**

1. **Media**: Camera feed from back of room
2. **Perception**: Detect "person in blue shirt"
3. **Reasoning**: VLM confirms speaker, returns coordinates
4. **Decision**: Confidence 92% > threshold, no recent movement
5. **Control**: Send pan/tilt command to PTZ camera

**Same pattern for every automation.**

---

## SLIDE 5: Bounding Boxes

**What is a bounding box?**

A rectangle that surrounds a detected object, defined by coordinates:

```
┌─────────────────┐
│  (x_min, y_min) │ ← Top-left corner
│                 │
│    [OBJECT]     │
│                 │
│  (x_max, y_max) │ ← Bottom-right corner
└─────────────────┘
```

**Coordinates are normalized (0.0 to 1.0)**
- `x: 0.5` = center horizontally
- `y: 0.3` = 30% from top

---

## SLIDE 6: Confidence Scores

**How sure is the AI?**

Every detection includes a confidence score (0.0 to 1.0):

| Score | Meaning | Action |
|-------|---------|--------|
| 0.95+ | Very confident | Act immediately |
| 0.80-0.94 | Confident | Act with normal guardrails |
| 0.50-0.79 | Uncertain | Require confirmation |
| < 0.50 | Low confidence | Ignore or flag for review |

**Production tip:** Start with high thresholds (0.85+), lower only if needed.

---

## SLIDE 7: The Right Tool for the Job

**Not all AI is created equal.**

| Task | Best Tool | Why |
|------|-----------|-----|
| Track "red coffee mug" | **VLM (Moondream)** | Flexible, any object |
| Track human body | **Traditional CV (MediaPipe)** | Fast, specialized |
| Track specific person | **VLM** | Natural language description |
| Track hand gestures | **Traditional CV** | Low latency critical |

**VLMs = Flexibility | Traditional CV = Speed**

---

## SLIDE 8: VLM Tradeoffs

**Vision Language Models (Moondream)**

✅ **Strengths:**
- Track ANY object you can describe
- No training required
- Natural language prompts
- Understands context

⚠️ **Limitations:**
- Higher latency (500ms-2s per frame)
- Requires API calls or local GPU
- Less precise for fast motion

**Best for:** Flexible detection, scene understanding, varied objects

---

## SLIDE 9: Traditional CV Tradeoffs

**Specialized Models (MediaPipe)**

✅ **Strengths:**
- Very fast (30+ fps)
- Runs in browser, no API needed
- Precise landmarks (33 body points)
- Battle-tested for humans

⚠️ **Limitations:**
- Only detects what it's trained for
- Can't track "the red mug"
- No natural language

**Best for:** Human tracking, hand gestures, face detection

---

## SLIDE 10: When to Use Each

**Decision Framework:**

```
Is the target a person, hand, or face?
    YES → Consider MediaPipe (fast)
    NO  → Use VLM (flexible)

Is sub-100ms latency critical?
    YES → MediaPipe or traditional CV
    NO  → VLM is fine

Do you need natural language descriptions?
    YES → VLM only
    NO  → Either works
```

---

## SLIDE 11: Prompt Engineering for Detection

**The prompt changes the behavior.**

| Prompt | Result |
|--------|--------|
| "person" | Any person in frame |
| "person in red shirt" | Specific person |
| "the speaker at the podium" | Context-aware detection |
| "person closest to camera" | Spatial reasoning |

**Better prompts = Better results**

---

## SLIDE 12: Hands-On Demo

# Code Deep Dive

*Building object trackers with Moondream and MediaPipe*

---

## SLIDE 13: Demo - Project Overview

**What We'll Build:**

1. **Detection Boxes Tool** - Draw boxes around any described object
2. **Auto-Tracker** - Keep an object centered in frame

**The Pattern:**
```
Capture Frame → Send to API → Get Coordinates → Draw/Act
```

*Let's start with detection boxes.*

---

## SLIDE 14: Demo - Detection Boxes

**02-detection-boxes project**

1. Open the project in Cursor
2. Enter what to detect: "coffee mug"
3. Watch boxes appear around detected objects
4. Try different prompts:
   - "person"
   - "the laptop"
   - "something red"

*[Live demo: running detection and drawing boxes]*

---

## SLIDE 15: Demo - Understanding the Response

**What the API returns:**

```json
{
  "objects": [
    {
      "x_min": 0.25,
      "y_min": 0.30,
      "x_max": 0.45,
      "y_max": 0.60,
      "confidence": 0.94
    }
  ]
}
```

- Normalized coordinates (0-1)
- Multiple objects possible
- Confidence for each detection

---

## SLIDE 16: Demo - Drawing Boxes

**Converting coordinates to pixels:**

```javascript
// Normalized → Pixel coordinates
const pixelX = normalizedX * canvasWidth;
const pixelY = normalizedY * canvasHeight;

// Draw the box
ctx.strokeRect(
  x_min * width,
  y_min * height,
  (x_max - x_min) * width,
  (y_max - y_min) * height
);
```

*[Live demo: examining the drawing code]*

---

## SLIDE 17: Demo - Auto-Track Project

**PTZOptics-Moondream-Tracker**

The full tracking loop:
1. Capture frame
2. Detect target object
3. Calculate offset from center
4. Send PTZ command to correct
5. Repeat

*[Live demo: tracking an object with PTZ camera]*

---

## SLIDE 18: Demo - Tracking Logic

**Keeping the target centered:**

```javascript
// Where is the object?
const objectCenter = {
  x: (x_min + x_max) / 2,  // 0.0 to 1.0
  y: (y_min + y_max) / 2
};

// How far from frame center?
const offset = {
  x: objectCenter.x - 0.5,  // negative = left
  y: objectCenter.y - 0.5   // negative = up
};

// Move camera to compensate
if (Math.abs(offset.x) > deadzone) {
  sendPanCommand(offset.x * speed);
}
```

---

## SLIDE 19: Demo - Guardrails

**Production safety features:**

| Guardrail | Purpose |
|-----------|---------|
| **Confidence threshold** | Don't act on uncertain detections |
| **Deadzone** | Ignore tiny movements |
| **Cooldown** | Prevent command flooding |
| **Smoothing** | Avoid jerky camera motion |
| **Bounds checking** | Don't exceed PTZ limits |

*[Live demo: adjusting guardrail settings]*

---

## SLIDE 20: Demo - MediaPipe Comparison

**Side-by-side: VLM vs Traditional CV**

| | Moondream | MediaPipe |
|--|-----------|-----------|
| Target | "person in blue" | Any person |
| Latency | ~800ms | ~30ms |
| Setup | API key | None (browser) |
| Flexibility | High | Limited |

*[Live demo: running both trackers on same scene]*

---

## SLIDE 21: Bonus - Search and Find

**The fun activity:**

Type any object description → Camera searches the room → Finds and centers on target

**How it works:**
1. Camera pans through search grid
2. At each position: "Do you see [target]?"
3. When found: zoom in to confirm
4. Success: center and announce

**Great for demos, kids love it!**

---

## SLIDE 22: Key Takeaways

**What You Learned Today:**

1. **5-Stage Pipeline** — Media → Perception → Reasoning → Decision → Control
2. **Bounding boxes** — Normalized coordinates define detected objects
3. **Confidence scores** — Gate your automations on certainty
4. **Right tool for the job** — VLMs for flexibility, traditional CV for speed
5. **Guardrails matter** — Thresholds, deadzones, cooldowns prevent bad behavior

---

## SLIDE 23: The Pipeline Mindset

**Before building anything, ask:**

1. What's my **media input**?
2. What **perception** data do I need?
3. What **reasoning** turns that into decisions?
4. What **guardrails** keep it safe?
5. What **control** actions result?

*This framework applies to everything we build.*

---

## SLIDE 24: Module 2 Complete

# Congratulations!

You've completed **Module 2: Visual Understanding & Object Tracking**

You now have:
- ✅ Understanding of the 5-Stage Pipeline
- ✅ Working detection box system
- ✅ Object tracking with confidence thresholds
- ✅ Knowledge of when to use VLMs vs traditional CV

---

## SLIDE 25: Coming Up Next

**Module 3: From Understanding to Action**

- Connect visual reasoning to production systems
- OBS WebSocket integration
- Gesture-controlled scene switching
- Thumbs up → Play video. Thumbs down → Cut away.

*Your AI is about to control your production.*

---

## SLIDE 26: Resources

**Links for This Module:**

- Detection Boxes: `code-examples/02-detection-boxes/`
- Auto-Tracker: `code-examples/PTZOptics-Moondream-Tracker/`
- MediaPipe Docs: mediapipe.dev
- Book Chapters: 7-8 (Auto-Track, Smart Counter)

**Practice:** Try tracking different objects and adjusting confidence thresholds.

---

*End of Module 2*
