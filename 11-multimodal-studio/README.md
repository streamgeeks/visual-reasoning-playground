# Multimodal Studio Assistant

**Capstone Project** - Voice + Vision controlled studio production

Part of the [Visual Reasoning Playground](https://github.com/StreamGeeks/visual-reasoning-playground)

## Overview

The Multimodal Studio Assistant combines voice commands with visual tracking to create a hands-free production control system. Say "Hey Studio" followed by a command to control your PTZ camera and OBS.

## Features

- **Wake Word Activation**: Say "Hey Studio" to trigger command listening
- **Voice Commands**: Control PTZ, switch scenes, start/stop recording
- **Visual Tracking**: Auto-follow subjects using Moondream detection
- **OBS Integration**: Scene switching, recording, streaming control
- **PTZ Control**: Pan, tilt, zoom, presets via voice

## Requirements

1. **Moondream API Key** - [console.moondream.ai](https://console.moondream.ai)
2. **OpenAI API Key** - [platform.openai.com](https://platform.openai.com/api-keys) (for Whisper)
3. **PTZOptics Camera** - Any model with HTTP API
4. **OBS Studio** - With WebSocket server enabled (Tools → WebSocket Server Settings)
5. **Microphone** - For voice commands
6. **Chrome Browser** - Required for Web Speech API

## Setup

### 1. Enable OBS WebSocket

1. Open OBS Studio
2. Go to Tools → WebSocket Server Settings
3. Enable WebSocket server
4. Note the port (default: 4455)
5. Set a password if desired

### 2. Configure the Assistant

1. Enter your PTZ camera IP address
2. Enter OBS WebSocket host (usually `localhost:4455`)
3. Enter OBS password if set
4. Click "Connect All"

### 3. Set API Keys

Click "Manage API Keys" and enter:
- Moondream API key (for visual tracking)
- OpenAI API key (for Whisper speech recognition)

### 4. Start the Assistant

1. Select your mode:
   - **Voice Control**: Commands only
   - **Auto-Track**: Visual tracking only
   - **Both**: Voice + tracking together
2. Click "Start Assistant"
3. Say "Hey Studio" followed by a command

## Voice Commands

### PTZ Control

| Command | Action |
|---------|--------|
| "Hey Studio, follow me" | Start tracking |
| "Hey Studio, stop" | Stop tracking |
| "Hey Studio, zoom in" | Zoom in |
| "Hey Studio, zoom out" | Zoom out |
| "Hey Studio, go wide" | Wide zoom preset |
| "Hey Studio, go medium" | Medium zoom preset |
| "Hey Studio, go tight" | Tight zoom preset |
| "Hey Studio, pan left" | Pan left |
| "Hey Studio, pan right" | Pan right |
| "Hey Studio, tilt up" | Tilt up |
| "Hey Studio, tilt down" | Tilt down |
| "Hey Studio, home" | Return to home position |
| "Hey Studio, preset 1" | Go to preset 1 |

### OBS Control

| Command | Action |
|---------|--------|
| "Hey Studio, camera 1" | Switch to Camera 1 scene |
| "Hey Studio, camera 2" | Switch to Camera 2 scene |
| "Hey Studio, scene 3" | Switch to scene 3 |
| "Hey Studio, start recording" | Start OBS recording |
| "Hey Studio, stop recording" | Stop OBS recording |
| "Hey Studio, go live" | Start streaming |
| "Hey Studio, stop stream" | Stop streaming |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    MULTIMODAL STUDIO                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐              ┌─────────────┐                │
│  │ MICROPHONE  │              │   CAMERA    │                │
│  └──────┬──────┘              └──────┬──────┘                │
│         │                            │                        │
│         ▼                            ▼                        │
│  ┌─────────────┐              ┌─────────────┐                │
│  │ Web Speech  │              │  Moondream  │                │
│  │     API     │              │   Detect    │                │
│  └──────┬──────┘              └──────┬──────┘                │
│         │                            │                        │
│         ▼                            │                        │
│  ┌─────────────┐                     │                        │
│  │   "Hey      │                     │                        │
│  │   Studio"   │                     │                        │
│  │  detected?  │                     │                        │
│  └──────┬──────┘                     │                        │
│         │ yes                        │                        │
│         ▼                            │                        │
│  ┌─────────────┐                     │                        │
│  │   Intent    │                     │                        │
│  │   Parser    │                     │                        │
│  └──────┬──────┘                     │                        │
│         │                            │                        │
│         └──────────┬─────────────────┘                        │
│                    ▼                                          │
│            ┌─────────────┐                                    │
│            │   Command   │                                    │
│            │   Handler   │                                    │
│            └──────┬──────┘                                    │
│                   │                                           │
│         ┌─────────┴─────────┐                                │
│         ▼                   ▼                                 │
│  ┌─────────────┐     ┌─────────────┐                         │
│  │     PTZ     │     │     OBS     │                         │
│  │ Controller  │     │ Controller  │                         │
│  └─────────────┘     └─────────────┘                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## How It Works

### Voice Pipeline

1. **Web Speech API** continuously listens for speech
2. When "Hey Studio" is detected, extract the command that follows
3. **Intent Parser** matches command against known patterns
4. **Command Handler** executes the appropriate action

### Visual Pipeline

1. Capture frame from video feed
2. Send to **Moondream /detect** with target object
3. Calculate object position relative to frame center
4. Send **PTZ commands** to center the object
5. Repeat at 500ms intervals

### Modes

- **Voice Control**: Only responds to voice commands
- **Auto-Track**: Continuously tracks target, no voice
- **Both**: Voice commands + continuous tracking

## Customization

### Adding Custom Commands

In `intent-parser.js`:

```javascript
intentParser.addCustomCommand(
    ['lights on', 'turn on lights'],  // Patterns to match
    'lights_on',                       // Intent name
    'custom',                          // Action type
    { lights: 'on' }                   // Parameters
);
```

### Changing Wake Word

In `app.js`, modify the AudioProcessor initialization:

```javascript
audioProcessor = new AudioProcessor({
    wakeWord: 'hey camera',  // Change wake word here
    // ...
});
```

### Adjusting Tracking

In `app.js`, modify tracking parameters:

```javascript
// Detection interval (ms)
trackingLoopId = setTimeout(startTrackingLoop, 500);

// Deadzone (in ptz-controller.js)
const deadzone = 0.08;  // 8% of frame
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Speech recognition not supported" | Use Chrome browser |
| Microphone not working | Check browser permissions |
| OBS not connecting | Verify WebSocket is enabled in OBS |
| PTZ not responding | Check camera IP and network |
| Commands not recognized | Speak clearly after "Hey Studio" |
| Tracking jittery | Increase deadzone value |

## Browser Support

- **Chrome**: Full support (recommended)
- **Edge**: Full support
- **Firefox**: No Web Speech API support
- **Safari**: Limited support

## Files

```
11-multimodal-studio/
├── index.html           # Main UI
├── app.js               # Application orchestration
├── audio-processor.js   # Wake word + speech recognition
├── intent-parser.js     # Command parsing
├── command-handler.js   # Action execution
├── ptz-controller.js    # PTZ camera control
├── obs-controller.js    # OBS WebSocket integration
└── README.md            # This file
```

## Related

- [Module 7 Slides](../../course/slide-decks/module-07-capstone.md)
- [PTZ Framing Assistant](../08-framing-assistant/)
- [Gesture OBS Control](../03-gesture-obs/)

---

*Capstone project from "Visual Reasoning AI for Broadcast and ProAV" by Paul Richards*
