# Tool #15: Voice Triggers

**Speech-to-text automation with Whisper AI running entirely in-browser.**

Part of the [Visual Reasoning Playground](../README.md) - companion code for the book *Visual Reasoning AI for Broadcast and ProAV* by Paul Richards.

---

## What It Does

Define trigger phrases that fire actions when spoken. Whisper AI runs locally in your browser - no API key needed for voice recognition, and your audio never leaves your device.

## Quick Start

> **Important:** This tool requires the full repository. Clone the complete playground first — individual folders won't work because shared libraries are needed.

```bash
git clone https://github.com/streamgeeks/visual-reasoning-playground.git
cd visual-reasoning-playground
python server.py
# Open http://localhost:8000/15-voice-triggers/
```

1. Allow microphone access
2. Wait for Whisper model to download (~40MB, cached after first load)
3. Add trigger rules (phrase → action)
4. Click "Start Listening"
5. Speak your trigger phrases

## Key Features

- **No API key needed** - Whisper runs locally via WebGPU/WASM
- **Privacy-first** - Audio never leaves your device
- **~40MB model** - Downloads once, cached in browser
- **Trigger rules** - Map phrases to actions
- **Real-time transcription** - See what Whisper hears

## Use Cases

| Business Example | Personal Example |
|------------------|------------------|
| **Broadcasting**: Voice-controlled scene switches | **Smart Home**: Hands-free commands |
| **Presentations**: Navigate slides by voice | **Accessibility**: Voice-activated controls |
| **Production**: Call camera shots verbally | **Gaming**: Voice macros |

## Trigger Actions

| Action Type | Description |
|-------------|-------------|
| Log | Display message in activity log |
| Alert | Show browser notification |
| Webhook | Send HTTP request to URL |
| OBS | Control OBS via WebSocket |

## Example Triggers

| Phrase | Action |
|--------|--------|
| "camera one" | Switch to Camera 1 scene |
| "wide shot" | Switch to Wide scene |
| "start recording" | Trigger OBS recording |
| "meeting started" | Log event + webhook |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Model | whisper-tiny | Whisper model size |
| Language | en | Recognition language |
| Continuous | On | Keep listening after trigger |

## How It Works

1. Whisper model loads in browser (first time: ~40MB download)
2. Microphone audio is processed locally
3. Speech is transcribed to text
4. Text is matched against trigger phrases
5. Matching triggers fire their configured actions

## Technical Details

- Uses [Transformers.js](https://huggingface.co/docs/transformers.js) for in-browser ML
- WebGPU acceleration when available (falls back to WASM)
- Model cached in IndexedDB after first download
- No server required for voice recognition

## Files

```
15-voice-triggers/
├── index.html    # UI with trigger management
├── app.js        # Whisper integration and trigger logic
└── README.md     # This file
```

## Related

- [Tool #11: Multimodal Studio](../11-multimodal-studio/) - Full voice + video automation
- [Tool #12: Multimodal Fusion](../12-multimodal-fusion/) - Audio + video fusion
- [Book: Visual Reasoning AI](https://visualreasoning.ai/book)

---

## Get the Book

**[Visual Reasoning AI for Broadcast and ProAV](https://visualreasoning.ai/book)** by Paul Richards - Learn to build AI-powered camera systems from the ground up.

**Resources:**
- [VisualReasoning.ai](https://visualreasoning.ai) - Book, online course, and free tools
- [Moondream](https://moondream.ai) - Vision AI powering these tools
- [PTZOptics](https://ptzoptics.com) - PTZ cameras with API control
- [StreamGeeks](https://streamgeeks.com) - Live streaming education

---

*Part of the [Visual Reasoning Playground](../README.md) by [Paul Richards](https://github.com/paulwrichards)*
