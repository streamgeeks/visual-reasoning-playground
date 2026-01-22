# Module 3: From Understanding to Action

---

## SLIDE 1: Title

**Module 3**
# From Understanding to Action

Visual Reasoning AI for Broadcast & ProAV

*Your AI is about to control your production.*

---

## SLIDE 2: Learning Objectives

**By the end of this module, you will be able to:**

1. Connect visual reasoning output to production control systems
2. Set up OBS WebSocket for remote control
3. Detect gestures using Moondream and natural language
4. Map gestures to specific production actions
5. Implement safety guardrails (debouncing, cooldowns, thresholds)

---

## SLIDE 3: The Big Idea

**We've learned to SEE. Now we learn to ACT.**

| Module | Focus |
|--------|-------|
| Module 1 | Describe what the camera sees |
| Module 2 | Detect and track objects |
| **Module 3** | **Trigger actions based on what we see** |

**The pattern:** Detect → Decide → Act

---

## SLIDE 4: Why Gestures?

**Natural, intuitive control without touching anything.**

Use cases in production:
- Presenter signals "go to slides" with thumbs up
- Director points to switch cameras
- Speaker raises hand to pause recording
- Worship leader signals lighting change

**No clicker. No keyboard. Just natural movement.**

---

## SLIDE 5: The Control Loop

**From vision to action:**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   DETECT    │ → │   DECIDE    │ → │    ACT      │
│  "thumbs up"│    │ confidence? │    │ switch scene│
│  found at   │    │ cooldown?   │    │ in OBS      │
│  (0.3, 0.4) │    │ debounce?   │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
```

**Every action goes through the Decision stage first.**

---

## SLIDE 6: Meet OBS WebSocket

**What is it?**

OBS Studio includes a WebSocket server that allows remote control:
- Switch scenes
- Show/hide sources
- Start/stop recording
- Trigger transitions
- Control audio

**Your AI talks to OBS over WebSocket.**

---

## SLIDE 7: Enabling OBS WebSocket

**Setup steps:**

1. Open OBS Studio
2. Tools → WebSocket Server Settings
3. Enable WebSocket Server ✓
4. Set port (default: 4455)
5. Set password (optional but recommended)
6. Click OK

**That's it. OBS is now controllable.**

---

## SLIDE 8: WebSocket Connection

**How we connect:**

```javascript
const obs = new OBSWebSocket();

await obs.connect('ws://localhost:4455', 'your-password');

console.log('Connected to OBS!');
```

**Once connected, we can send commands.**

---

## SLIDE 9: Basic OBS Commands

**Common actions we'll use:**

| Command | What It Does |
|---------|--------------|
| `SetCurrentProgramScene` | Switch to a scene |
| `SetSourceVisibility` | Show/hide a source |
| `TriggerTransition` | Execute transition |
| `StartRecord` | Begin recording |
| `StopRecord` | End recording |

**Full list:** github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md

---

## SLIDE 10: Switching Scenes

**The command we'll use most:**

```javascript
await obs.call('SetCurrentProgramScene', {
    sceneName: 'Camera 2'
});
```

**That's one line to switch scenes.**

---

## SLIDE 11: Gesture Detection Strategy

**Using Moondream for gestures:**

Instead of training a gesture model, we ASK:

```
"Is the person showing a thumbs up gesture?"
→ "Yes, there is a thumbs up visible in the frame"

"Is there a thumbs down gesture?"
→ "No thumbs down gesture is visible"
```

**Natural language = flexible gesture detection.**

---

## SLIDE 12: Structured Gesture Queries

**Getting actionable responses:**

```javascript
const prompt = `Look at this image and answer with only 
YES or NO: Is someone showing a thumbs up gesture?`;

const result = await client.askVideo(video, prompt);
// result.answer = "YES" or "NO"
```

**Simple YES/NO enables clean automation logic.**

---

## SLIDE 13: The Gesture Map

**Mapping gestures to actions:**

| Gesture | Detection Prompt | OBS Action |
|---------|------------------|------------|
| Thumbs Up | "thumbs up gesture" | Switch to "Main" scene |
| Thumbs Down | "thumbs down gesture" | Switch to "BRB" scene |
| Open Palm | "open palm facing camera" | Switch to "Slides" scene |
| Pointing Up | "finger pointing upward" | Start recording |

**You define the mappings.**

---

## SLIDE 14: Why Guardrails Matter

**Without guardrails:**

- False positive → wrong scene switch
- Gesture held too long → repeated triggers
- Low confidence detection → unpredictable behavior
- Quick gesture changes → flickering

**Guardrails make it production-ready.**

---

## SLIDE 15: Guardrail #1 - Confidence Threshold

**Only act when confident:**

```javascript
const CONFIDENCE_THRESHOLD = 0.85;

if (gestureDetected && confidence >= CONFIDENCE_THRESHOLD) {
    triggerAction();
} else {
    log('Detection below threshold, ignoring');
}
```

**Start high (0.85+), lower only if needed.**

---

## SLIDE 16: Guardrail #2 - Cooldown

**Prevent rapid repeated triggers:**

```javascript
const COOLDOWN_MS = 3000; // 3 seconds
let lastActionTime = 0;

function canTrigger() {
    const now = Date.now();
    if (now - lastActionTime < COOLDOWN_MS) {
        return false; // Still in cooldown
    }
    lastActionTime = now;
    return true;
}
```

**One action per 3 seconds = stable production.**

---

## SLIDE 17: Guardrail #3 - Debouncing

**Require sustained detection:**

```javascript
const DEBOUNCE_COUNT = 2; // Must detect 2x in a row
let consecutiveDetections = 0;

if (gestureDetected) {
    consecutiveDetections++;
    if (consecutiveDetections >= DEBOUNCE_COUNT) {
        triggerAction();
        consecutiveDetections = 0;
    }
} else {
    consecutiveDetections = 0;
}
```

**Filters out momentary false positives.**

---

## SLIDE 18: Guardrail #4 - State Awareness

**Don't switch to current scene:**

```javascript
let currentScene = 'Main';

function switchScene(newScene) {
    if (newScene === currentScene) {
        log('Already on this scene, skipping');
        return;
    }
    obs.call('SetCurrentProgramScene', { sceneName: newScene });
    currentScene = newScene;
}
```

**Prevents unnecessary commands.**

---

## SLIDE 19: Hands-On Demo

# Code Deep Dive

*Building gesture-controlled OBS switching*

---

## SLIDE 20: Demo - Project Structure

**03-gesture-obs project:**

```
03-gesture-obs/
├── index.html      # UI with video + status
├── app.js          # Main application logic
├── obs-client.js   # OBS WebSocket wrapper
└── gestures.js     # Gesture detection logic
```

*Let's walk through each piece.*

---

## SLIDE 21: Demo - The UI

**What the interface shows:**

```
┌──────────────────────────────────────────────────┐
│ 🧠 VISUAL REASONING          [Gesture Control]   │
│ ┌─────────────────┐  ┌─────────────────────────┐ │
│ │ Detection Log   │  │                         │ │
│ │ ...             │  │     Camera Feed         │ │
│ │ ...             │  │                         │ │
│ └─────────────────┘  │  [Thumbs Up: DETECTED]  │ │
│                      └─────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐  │
│ │ OBS Status: Connected | Scene: Main         │  │
│ │ Last Action: Switched to "Main" (2s ago)    │  │
│ └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## SLIDE 22: Demo - OBS Connection

**Setting up the connection:**

1. Enter OBS WebSocket URL (ws://localhost:4455)
2. Enter password if set
3. Click Connect
4. Status shows "Connected"

*[Live demo: connecting to OBS]*

---

## SLIDE 23: Demo - Gesture Detection Loop

**The main loop:**

```javascript
async function detectionLoop() {
    // 1. Ask Moondream about gestures
    const thumbsUp = await detectGesture('thumbs up');
    const thumbsDown = await detectGesture('thumbs down');
    
    // 2. Apply guardrails and act
    if (thumbsUp && canTrigger()) {
        await switchScene('Main');
    } else if (thumbsDown && canTrigger()) {
        await switchScene('BRB');
    }
    
    // 3. Schedule next detection
    setTimeout(detectionLoop, 1000);
}
```

*[Live demo: watching the detection loop]*

---

## SLIDE 24: Demo - Live Test

**Testing the system:**

1. Show thumbs up → Watch scene switch to "Main"
2. Show thumbs down → Watch scene switch to "BRB"
3. Hold gesture → Observe cooldown prevents repeat
4. Quick flash gesture → Observe debounce filters it

*[Live demo: gesture control in action]*

---

## SLIDE 25: Demo - Adjusting Guardrails

**Fine-tuning for your environment:**

| Setting | Too Strict | Too Loose |
|---------|------------|-----------|
| Confidence | Gestures ignored | False triggers |
| Cooldown | Feels unresponsive | Repeated switches |
| Debounce | Delayed reaction | Flicker |

*[Live demo: adjusting settings and observing changes]*

---

## SLIDE 26: Extending the System

**Ideas to try:**

- Add more gestures (peace sign, open palm, pointing)
- Control sources instead of scenes
- Start/stop recording with gestures
- Combine with voice commands (Module 7)
- Multiple presenters, multiple gesture sets

**The pattern is the same. Just add more mappings.**

---

## SLIDE 27: Key Takeaways

**What You Learned Today:**

1. **Detect → Decide → Act** — The universal control loop
2. **OBS WebSocket** — Remote control via simple commands
3. **Natural language gestures** — Ask Moondream, get YES/NO
4. **Guardrails are essential** — Confidence, cooldown, debounce, state
5. **Production-ready** — Safe automation, not magic tricks

---

## SLIDE 28: Safety Reminder

**Remember the PTZOptics philosophy:**

✅ AI assists the operator
✅ Guardrails prevent mistakes
✅ Human override always available
✅ Predictable, reliable behavior

**A gesture that triggers the wrong scene once = distrust forever.**

*Build trust through reliability.*

---

## SLIDE 29: Module 3 Complete

# Congratulations!

You've completed **Module 3: From Understanding to Action**

You now have:
- ✅ OBS WebSocket integration
- ✅ Gesture detection with Moondream
- ✅ Gesture → Action mapping
- ✅ Production-ready guardrails

---

## SLIDE 30: Coming Up Next

**Module 4: Visual Data Extraction**

- Read scoreboards, license plates, labels
- Extract structured data from video
- OCR + context-aware reasoning
- Build a live scoreboard graphics system

*Your AI learns to read.*

---

## SLIDE 31: Resources

**Links for This Module:**

- Gesture Control: `code-examples/03-gesture-obs/`
- OBS WebSocket Docs: github.com/obsproject/obs-websocket
- obs-websocket-js: github.com/obs-websocket-community-projects/obs-websocket-js
- Book Chapter: 15 (OBS Integration)

**Practice:** Try adding a third gesture that toggles a source on/off.

---

*End of Module 3*
