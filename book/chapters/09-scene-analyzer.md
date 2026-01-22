# Chapter 9: Scene Analyzer

So far, we've asked visual reasoning to find specific objects and track them. Now we're going to ask it questions—and use the answers to make decisions.

This chapter focuses on a single, practical application: the smart conference room. We'll build a system that understands what's happening in a meeting space and triggers ProAV automations based on that understanding.

## From Detection to Decision-Making

The previous chapters used Moondream's detection capabilities—finding objects and their locations. The Scene Analyzer uses its reasoning capabilities—understanding context and answering questions about what it sees.

This is where we start building intelligence. Instead of just "there's a person at coordinates (340, 220)," we can ask: "Is there a meeting happening? Who's presenting? Should we be recording?"

The answers become triggers for automation.

## Pipeline Stages in This Project

Here's how the smart conference room maps to our 5-stage pipeline:

- **Stage 1: Media Inputs** — Conference room camera feeds (later we'll add audio)
- **Stage 2: Perception** — Minimal in this project—we're relying on VLM reasoning
- **Stage 3: Reasoning (VLM)** — Heavy focus here: Moondream answers structured questions about scene state
- **Stage 4: Decision (Guardrails)** — State tracking, confidence thresholds, transition logic, cooldowns
- **Stage 5: Control (Outputs)** — Recording triggers, camera switching, display control

**What's different from previous projects:** This project emphasizes Stage 3 (Reasoning) and Stage 4 (Decision). We're asking the VLM for structured JSON outputs—yes/no answers with confidence levels—then using sophisticated state tracking to decide when to act. The key is getting **grounded JSON** from the reasoning stage that flows cleanly into decision logic.

## Structured Outputs: The Key to Automation

Here's the critical concept: for automation to work, we need predictable, structured responses—not free-form descriptions.

Instead of asking "What's happening in the conference room?" and getting a paragraph, we ask specific yes/no questions with confidence levels:

**Question:** "Is there a meeting currently in progress?"
**Structured Response:**
- Answer: YES
- Confidence: 0.92
- Timestamp: 2024-01-15 14:32:05

**Question:** "Is someone actively presenting at the screen?"
**Structured Response:**
- Answer: YES
- Confidence: 0.87
- Timestamp: 2024-01-15 14:32:05

**Question:** "Are there multiple people speaking or engaged in discussion?"
**Structured Response:**
- Answer: NO
- Confidence: 0.78
- Timestamp: 2024-01-15 14:32:05

These structured responses become triggers. When "meeting in progress" changes from NO to YES with high confidence, start recording. When "multiple speakers" becomes YES, switch to the wide shot.

## Prompting for Structured JSON

How do you actually get a VLM to return structured data instead of a paragraph of text? The answer is simple: you ask for it explicitly.

VLMs are trained on vast amounts of text, including JSON. When you show them the exact format you want, they mirror it back. The trick is being specific about the structure in your prompt.

Here's a prompt that works:

```
Analyze this conference room image. Respond ONLY with valid JSON in this exact format:

{
  "meeting_active": true or false,
  "confidence": 0.0 to 1.0,
  "presenter_detected": true or false,
  "people_count": number,
  "screen_content_visible": true or false,
  "reasoning": "brief explanation of what you see"
}
```

Three things make this effective:

1. **"Respond ONLY with valid JSON"** — This prevents the VLM from adding conversational text before or after the data.

2. **Showing the exact schema** — The VLM sees the field names and types you expect, and mirrors that structure in its response.

3. **Including a "reasoning" field** — This gives the VLM a place to explain its thinking without polluting the data fields. It's also useful for debugging when results seem wrong.

When parsing the response, always handle the possibility that the VLM didn't follow instructions perfectly:

```javascript
function parseStructuredResponse(response) {
    try {
        // Extract JSON from response (in case there's extra text)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        console.log('Failed to parse JSON, falling back to simple query');
    }
    return null;
}
```

This pattern—explicit format request, schema example, graceful fallback—works across different VLMs and is the foundation for reliable automation.

## The Smart Conference Room Triggers

Let's define the specific triggers we're building:

### Trigger 1: Is There a Meeting?

**Question:** "Are there people seated at the conference table engaged in a meeting or discussion?"

**Automation:**
- YES (confidence > 0.8) → Start recording, activate room displays
- NO (confidence > 0.8) → Stop recording after 5-minute delay, power down displays

### Trigger 2: Should We Be Recording?

This combines multiple signals:
- People present at the table
- Someone speaking or presenting
- Content visible on screen or whiteboard

**Question:** "Is there active meeting content that should be captured—presentation, discussion, or whiteboard content?"

**Automation:**
- YES → Ensure recording is active
- NO for extended period → Pause or stop recording

### Trigger 3: What Video Input Is Needed?

**Question:** "Is content being displayed on the main screen or TV?"

**Automation:**
- YES → Include screen capture in recording
- NO → Camera-only recording

### Trigger 4: Who Should We Focus On?

**Question:** "Is there a single person presenting or speaking while others listen?"

**Automation:**
- YES → Zoom in on the presenter, track their position
- NO → Use wide shot to capture the full room

### Trigger 5: When to Cut Back to Wide

**Question:** "Are multiple people actively engaged in discussion or Q&A?"

**Automation:**
- YES → Switch to wide shot to capture the conversation
- NO → Maintain current framing

## Storing and Referencing Data

For these triggers to work reliably, we need to track state over time—not just react to single frames.

**What we store for each analysis:**

- **Timestamp** — When the frame was captured
- **Trigger states** — YES/NO for each question
- **Confidence levels** — How certain the model is
- **State changes** — When did the answer change from the previous check?

**Example data log:**

| Timestamp | Meeting Active | Presenter | Multi-Speaker | Confidence |
|-----------|---------------|-----------|---------------|------------|
| 14:30:00 | NO | NO | NO | 0.95 |
| 14:32:00 | YES | NO | NO | 0.88 |
| 14:34:00 | YES | YES | NO | 0.91 |
| 14:45:00 | YES | NO | YES | 0.85 |
| 14:52:00 | YES | YES | NO | 0.89 |
| 15:05:00 | NO | NO | NO | 0.92 |

By tracking state changes over time, we can:
- Avoid false triggers from momentary detection errors
- Require consistent state before taking action
- Build a timeline of what happened in the meeting
- Generate meeting analytics (how long was the presentation vs. discussion?)

## Implementing the Triggers

Here's how the logic works in practice:

### State Tracking

We maintain a state object that tracks the current and previous values:

- `meetingActive`: Current YES/NO state
- `meetingActiveConfidence`: How confident we are
- `meetingActiveSince`: Timestamp when it became YES
- `previousState`: What it was last check

### Transition Logic

Actions fire on state transitions, not on every check:

- **Meeting starts:** `meetingActive` changes from NO to YES
  - Wait for 2 consecutive YES readings (debounce)
  - Then trigger: Start recording, activate displays

- **Meeting ends:** `meetingActive` changes from YES to NO
  - Wait for 5 minutes of NO readings (grace period)
  - Then trigger: Stop recording, power down

- **Presenter detected:** `presenterActive` changes from NO to YES
  - Trigger: Switch to presenter camera, enable tracking

- **Discussion starts:** `multiSpeaker` changes from NO to YES
  - Trigger: Switch to wide shot

### Confidence Thresholds

Not all readings are equal. We set thresholds:

- **High confidence (> 0.85):** Act immediately
- **Medium confidence (0.7 - 0.85):** Wait for confirmation
- **Low confidence (< 0.7):** Ignore, request human verification

## The Query Loop

The Scene Analyzer runs on a schedule—checking the room state every 30 seconds to 2 minutes depending on your needs.

Each cycle:

1. Capture frame from conference room camera
2. Ask each trigger question
3. Parse structured responses
4. Update state tracking
5. Check for state transitions
6. Fire automations if thresholds met
7. Log everything with timestamps

The interval depends on your tolerance for latency. Faster checks mean quicker response to changes but higher API costs. For most conference rooms, checking every 60 seconds is responsive enough.

## Connecting to ProAV Systems

The trigger outputs connect to your production systems:

**Recording control:**
- Start/stop recording via OBS, vMix, or dedicated recorder
- Same WebSocket/API patterns from Chapters 15-17

**Camera switching:**
- Switch between wide shot and presenter camera
- Control PTZ zoom and tracking
- Trigger presets for different meeting modes

**Room automation:**
- Control displays via room control system
- Adjust lighting for presentation vs. discussion
- Mute/unmute audio feeds

The Scene Analyzer provides the intelligence; your existing ProAV infrastructure provides the control.

## What About Audio?

You might be thinking: "Wouldn't audio help here? We could detect who's speaking by listening."

You're absolutely right. In Chapter 14 (Multimodal Fusion), we'll add audio intelligence to this system. Speech-to-text will tell us who's talking. Combined with visual reasoning, we'll know not just that someone is presenting, but what they're saying.

For now, we're building the visual foundation. The structured data approach we're establishing here will make adding audio seamless—it's just additional trigger inputs feeding the same decision logic.

## Making It Your Own

Here are prompts for Cursor to customize the smart conference room:

*"Add a trigger that detects when someone is writing on the whiteboard"*

*"I want to log all state changes to a CSV file for later analysis"*

*"How can I add a 'presentation mode' that automatically dims lights and raises projection screen?"*

*"I want to send a Slack notification when a meeting starts in Conference Room A"*

*"Can we add facial recognition to identify who's in the meeting?"* (Note: Consider privacy implications)

## What You've Learned

The Scene Analyzer demonstrates that visual reasoning isn't just about detecting objects—it's about understanding context and making decisions:

- Structured outputs (YES/NO with confidence) enable automation
- State tracking over time prevents false triggers
- Timestamped data creates a queryable history
- Transition logic fires actions on state changes, not every frame
- Confidence thresholds filter uncertain readings

This is the foundation for intelligent ProAV automation. The same patterns apply beyond conference rooms—to any space where you want AI to understand what's happening and respond appropriately.

## What's Next

We've analyzed scenes and built decision triggers. In the next chapter, we'll define specific zones within the camera view and trigger actions when activity happens in those zones.

The Zone Monitor adds spatial awareness to visual reasoning—not just "is there a person" but "is there a person in this specific area?"

---

*Chapter 10: Zone Monitor — defining spaces and triggering actions when activity happens where it matters.*
