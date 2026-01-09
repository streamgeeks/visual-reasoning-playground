# Multimodal Fusion System

**Tool #8** in the Visual Reasoning Playground

Combines audio (speech recognition) and video (Moondream) understanding to trigger intelligent automation. When both signals agree, confidence increases dramatically—enabling reliable hands-free control.

## Quick Start

1. Get a Moondream API key from [console.moondream.ai](https://console.moondream.ai)
2. Open `index.html` in a modern browser (Chrome recommended for speech recognition)
3. Allow camera and microphone access
4. Enter your API key
5. Click "Start Fusion"
6. Speak commands while in frame to trigger actions

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTIMODAL FUSION                            │
├─────────────────┬───────────────────────────────────────────────┤
│  VIDEO PATH     │  AUDIO PATH                                   │
│                 │                                               │
│  Camera Frame   │  Microphone Input                             │
│       ↓         │       ↓                                       │
│  Moondream API  │  Speech Recognition                           │
│       ↓         │       ↓                                       │
│  Scene + People │  Transcript + Intent                          │
│       ↓         │       ↓                                       │
│  Confidence %   │  Confidence %                                 │
│                 │                                               │
├─────────────────┴───────────────────────────────────────────────┤
│                    SIGNAL FUSION                                │
│                                                                 │
│  Video (40%) + Audio (60%) = Fused Confidence                  │
│  Bonus multiplier when both signals align                       │
│                                                                 │
│  IF fused confidence > threshold THEN trigger action           │
└─────────────────────────────────────────────────────────────────┘
```

### Why Fusion Matters

Single-signal systems are unreliable:
- **Video only**: Can't distinguish between someone walking through vs. wanting to start a meeting
- **Audio only**: Background conversations or TV might trigger false positives

Fusion solves this:
- "Start meeting" + people visible = HIGH confidence (trigger)
- "Start meeting" + empty room = LOW confidence (ignore)
- People visible + no command = MEDIUM confidence (wait)

## Business Use Case: Smart Conference Room

**Scenario**: Corporate conference room that responds to presence and voice

**Setup**:
1. Camera pointed at conference table
2. Microphone for room audio
3. Integration with room systems (via webhooks)

**Workflow**:
```
9:00 AM - Sarah enters for her meeting
├── Video: "1 person detected at conference table"
├── Audio: (silent)
└── Decision: Monitor mode, no action

9:02 AM - Team arrives
├── Video: "4 people seated at conference table"
├── Audio: (general chatter)
└── Decision: Monitor mode, no action

9:03 AM - Sarah speaks
├── Video: "4 people, one standing"
├── Audio: "Let's start the meeting"
├── Fusion: 92% confidence - START_MEETING intent
└── Actions triggered:
    ├── Display powers on
    ├── Lights adjust to presentation mode
    └── Recording begins

9:45 AM - Meeting ends
├── Audio: "Stop recording"
├── Fusion: 85% confidence
└── Action: Recording stops

9:50 AM - Room empties
├── Video: "0 people detected" (30 seconds)
└── Action: Room empty alert, lights off
```

**ROI**: No dedicated AV operator needed. Meetings start faster. Recording never missed.

## Personal Use Case: Voice + Vision Smart Home

**Scenario**: Home automation that sees AND listens

**Setup**:
1. Camera in living room
2. Microphone for voice commands
3. Smart home integration (IFTTT, Home Assistant)

**Workflow**:
```
7:00 PM - You walk in from work
├── Video: "Person entering living room"
├── Audio: "Movie mode"
├── Fusion: 95% confidence
└── Actions:
    ├── Lights dim to 20%
    ├── Blinds close
    └── TV powers on

10:30 PM - Heading to bed
├── Video: "Person walking toward door"
├── Audio: "Good night"
├── Fusion: 90% confidence
└── Actions:
    ├── All lights off
    ├── Doors lock
    └── Thermostat adjusts
```

**Why it's better than voice-only**:
- Won't trigger when TV says "movie mode"
- Won't trigger for someone just passing through
- Context-aware: knows you're present AND intending to command

## Supported Voice Commands

| Command | Intent | Required Video |
|---------|--------|----------------|
| "Start meeting" / "Begin meeting" | start_meeting | People visible |
| "Start presentation" | start_presentation | People visible |
| "Lights on" / "Turn on lights" | lights_on | Optional |
| "Lights off" / "Turn off lights" | lights_off | Optional |
| "Dim lights" | lights_dim | Optional |
| "Start recording" | start_recording | People visible |
| "Stop recording" | stop_recording | Optional |
| "Movie mode" | movie_mode | People visible |

## Configuration

### Analysis Rate
Controls how often video frames are analyzed:
- **0.5/sec**: Cost-efficient, slower response
- **1.0/sec**: Balanced (default)
- **2.0/sec**: Responsive, higher API usage
- **3.0/sec**: Real-time feel, highest cost

### Action Threshold
Minimum fused confidence to trigger actions:
- **30-50%**: Sensitive, more false positives
- **60%**: Balanced (default)
- **70-90%**: Conservative, may miss some triggers

### Action Rules
Toggle individual automations on/off:
- **Start Meeting Mode**: People + "start meeting"
- **Presentation Mode**: Person standing + "start presentation"
- **Adjust Lighting**: Voice commands for lights
- **Start/Stop Recording**: Voice-controlled recording
- **Room Empty Alert**: No people for 30 seconds

## Extending the System

### Adding Custom Actions

In `app.js`, add to the `intents` array:

```javascript
{ 
    keywords: ['zoom in', 'closer'], 
    intent: 'camera_zoom_in', 
    action: 'camera' 
}
```

Then handle in `performFusion()`:

```javascript
if (intent === 'camera_zoom_in' && actionRules.camera?.enabled) {
    decision = `Camera: Zooming in on subject`;
}
```

### Webhook Integration

Replace the `triggerAction()` function to send webhooks:

```javascript
async function triggerAction(description, icon = 'bolt') {
    state.stats.actions++;
    
    // Send to your automation system
    await fetch('https://your-webhook-url.com/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: description,
            timestamp: Date.now(),
            confidence: state.fused.confidence,
            context: {
                peopleCount: state.video.peopleCount,
                transcript: state.audio.transcript
            }
        })
    });
    
    logAction(`ACTION TRIGGERED: ${description}`, icon, true);
}
```

### vMix Integration Example

```javascript
async function triggerVmixAction(action) {
    const vmixUrl = 'http://localhost:8088/api/';
    
    const actions = {
        'start_recording': 'Function=StartRecording',
        'stop_recording': 'Function=StopRecording',
        'start_streaming': 'Function=StartStreaming',
        'cut_to_camera_1': 'Function=Cut&Input=1'
    };
    
    if (actions[action]) {
        await fetch(vmixUrl + '?' + actions[action]);
    }
}
```

## Technical Details

### Speech Recognition
Uses the Web Speech API (Chrome's built-in speech recognition). For production deployments requiring offline support or higher accuracy, consider:
- OpenAI Whisper API
- Local Whisper model
- Azure Speech Services

### Confidence Calculation

```
Video Confidence:
- People detected: 85%
- No people: 70%
- Error: 0%

Audio Confidence:
- From speech recognition API (0-100%)

Fusion Formula:
- Base: (video * 0.4) + (audio * 0.6)
- Alignment bonus: * 1.2 when both signals match
- Cap: 100%
```

### Browser Requirements
- Chrome 33+ (best speech recognition support)
- Firefox 49+ (limited speech recognition)
- Safari 14.1+ (limited speech recognition)
- HTTPS required for camera/microphone access

## Related Resources

- [Visual Reasoning Playground](https://github.com/PTZOptics/visual-reasoning-playground)
- [Moondream Documentation](https://docs.moondream.ai)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- Book: "Visual Reasoning AI for Broadcast and ProAV" by Paul Richards

## Troubleshooting

**Speech recognition not working**
- Use Chrome browser
- Ensure microphone permissions granted
- Check that you're on HTTPS (or localhost)

**Low video confidence**
- Ensure good lighting
- Position camera to clearly show occupants
- Reduce analysis rate if getting timeouts

**Actions not triggering**
- Lower the confidence threshold
- Speak clearly and include exact trigger phrases
- Ensure the relevant action rule is enabled

**API errors**
- Verify Moondream API key is correct
- Check API rate limits
- Reduce analysis rate if hitting limits
