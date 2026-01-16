# Visual Reasoning Harness

**A framework for building production-ready visual reasoning systems for ProAV and Broadcast.**

The Visual Reasoning Harness provides standardized patterns, integrations, and best practices for building AI-powered automation in professional video production environments.

---

## Why a Harness?

Without a framework, every visual reasoning project is built from scratch. Different error handling, different logging, different configuration patterns. When something goes wrong, you're debugging unique code every time.

The harness provides:

- **Consistent architecture** across all projects
- **Production-tested integrations** for common ProAV systems
- **Built-in guardrails** that prevent AI from making costly mistakes
- **Best practices** learned from real broadcast deployments

Research shows that infrastructure around an AI model is as important as the model itself. The same model with better scaffolding achieves significantly better real-world results.

---

## Core Principles

### 1. Human Agency First

AI assists. Humans decide. Every automation includes human override capability.

**The 5-Second Rule**: When AI decides to take action, the system announces intent and waits 5 seconds. Operators can cancel during this window. If no cancel, action executes.

This pattern works because:
- Operators stay aware of what's happening
- Mistakes can be caught before they go to air
- Trust builds over time as operators see AI making good decisions
- Full automation is available when confidence is established

### 2. High Confidence Threshold

Default minimum confidence: **0.8 (80%)**

In broadcast, mistakes are visible and embarrassing. A false camera switch during a live show is worse than no switch at all. We set the bar high.

When confidence falls below threshold:
- Hold current state (don't change anything)
- Alert operator if configured
- Log the low-confidence detection for review

### 3. Graceful Degradation

When AI fails, the show must go on.

- Detection stops working → Hold last known good state
- API timeout → Continue with manual control
- Confidence drops → Maintain current settings
- Connection lost → Alert and fall back to manual

Never leave the system in a broken state. Always have a safe default.

### 4. Observable and Explainable

Operators and integrators need to understand what the AI is doing and why.

Log everything meaningful:
- What was detected
- Confidence level
- What action was triggered
- Why (or why not)

When something unexpected happens, the logs should tell the story.

---

## The 5-Stage Pipeline

Every visual reasoning project follows this pipeline:

```
┌─────────────────────────────────────────────────────────────────┐
│                         THE PIPELINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │  STAGE 1 │   │  STAGE 2 │   │  STAGE 3 │   │  STAGE 4 │     │
│  │  MEDIA   │ → │PERCEPTION│ → │REASONING │ → │ DECISION │     │
│  │  INPUTS  │   │          │   │  (VLM)   │   │(GUARDRAILS)    │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘     │
│       │                                             │           │
│       │                                             ▼           │
│       │                                       ┌──────────┐     │
│       │                                       │  STAGE 5 │     │
│       └──────────────────────────────────────▶│  CONTROL │     │
│                                               │ (OUTPUTS)│     │
│                                               └──────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Stage 1: Media Inputs

Where visual data enters the system.

| Source | Use Case |
|--------|----------|
| Webcam | Development, simple setups |
| RTSP/IP Camera | Professional installations |
| NDI | Broadcast facilities |
| SDI Capture | Traditional broadcast |
| Screen Capture | Monitoring displays, scoreboards |
| Video Files | Testing, replay analysis |

**Best Practice**: Abstract your input source. Your business logic should receive frames without caring where they came from.

### Stage 2: Perception

Fast, specialized detection that runs on every frame or at high frequency.

| Tool | Use Case | Latency |
|------|----------|---------|
| MediaPipe | Human pose, hands, face | ~10ms |
| OCR | Text extraction | ~50ms |
| Motion Detection | Activity triggers | ~5ms |
| Audio Levels | Speaking detection | Real-time |

**Best Practice**: Use specialized tools for specialized tasks. Don't send every frame to a VLM when simpler detection works.

### Stage 3: Reasoning (VLM)

The Vision Language Model interprets scenes and answers questions.

| Capability | Example |
|------------|---------|
| Scene Description | "What's happening in this room?" |
| Object Detection | "Find the person at the podium" |
| Visual Q&A | "Is someone presenting?" |
| Comparison | "How does this match the reference?" |

**Best Practice**: Request structured JSON output. "Respond in JSON with these fields..." gives you predictable, parseable data.

### Stage 4: Decision (Guardrails)

The layer between "AI thinks" and "system acts."

| Guardrail | Purpose |
|-----------|---------|
| Confidence Threshold | Only act when AI is confident (≥0.8) |
| Cooldown Period | Prevent rapid-fire triggers |
| Debouncing | Require sustained detection |
| State Smoothing | Avoid flicker between states |
| Human Override | 5-second window to cancel |

**Best Practice**: Most production problems come from missing guardrails, not bad AI. Be conservative.

### Stage 5: Control (Outputs)

Where decisions become actions.

| System | Protocol |
|--------|----------|
| OBS Studio | WebSocket API |
| vMix | HTTP/TCP API |
| PTZOptics Cameras | HTTP API |
| Blackmagic ATEM | SDK/HTTP |
| TriCaster | HTTP API |
| Ross | DashBoard protocol |
| Crestron/Extron/AMX | Native protocols |
| CasparCG | AMCP protocol |
| Dante/Q-SYS | Audio routing |

**Best Practice**: Abstract your outputs too. Your logic should trigger "switch to presenter camera" without knowing if that means OBS, vMix, or hardware switcher.

---

## Supported Integrations

### Video Production Software

| System | Status | Protocol |
|--------|--------|----------|
| OBS Studio | ✅ Supported | WebSocket v5 |
| vMix | ✅ Supported | HTTP API |
| TriCaster | 🔄 Community | HTTP |
| Ross | 🔄 Community | DashBoard |
| Blackmagic ATEM | 🔄 Community | SDK |

### Camera Control

| System | Status | Protocol |
|--------|--------|----------|
| PTZOptics | ✅ Supported | HTTP API 2.0 |
| VISCA over IP | ✅ Supported | UDP/TCP |
| ONVIF | 🔄 Community | SOAP/HTTP |
| NDI PTZ | 🔄 Community | NDI SDK |

### Control Systems

| System | Status | Notes |
|--------|--------|-------|
| Crestron | 📋 Planned | TCP/IP control |
| Extron | 📋 Planned | SIS protocol |
| AMX | 📋 Planned | ICSP protocol |
| Q-SYS | 📋 Planned | QRC protocol |

### Graphics & Overlays

| System | Status | Protocol |
|--------|--------|----------|
| Browser Sources | ✅ Supported | localStorage/WebSocket |
| CasparCG | 🔄 Community | AMCP |
| Singular.live | 🔄 Community | HTTP API |

---

## Common Workflows

These are the patterns integrators build most often:

### 1. Speaker Auto-Switching

Detect who's speaking and switch cameras accordingly.

```
Perception: Face detection + audio levels
Reasoning: "Who is the active speaker?"
Guardrails: 2-second sustained speaking before switch
Output: Switch to appropriate camera
```

### 2. Presenter Tracking

Follow a presenter with PTZ as they move.

```
Perception: Person detection with Moondream
Reasoning: "Where is the presenter?"
Guardrails: Deadzone to prevent jitter, smooth movements
Output: PTZ pan/tilt commands to center subject
```

### 3. Scoreboard to Graphics

Extract scores from a physical scoreboard and render digital graphics.

```
Perception: Frame capture of scoreboard
Reasoning: "What are the current scores?" (structured JSON)
Guardrails: Validate score format, compare to previous
Output: Update graphics overlay via browser source
```

### 4. Zone-Based Recording

Start/stop recording based on activity in defined areas.

```
Perception: Motion or person detection in zones
Reasoning: "Is there activity in the presentation zone?"
Guardrails: Debounce, minimum duration before trigger
Output: OBS start/stop recording commands
```

### 5. Attendance Monitoring

Count people and track occupancy over time.

```
Perception: Person detection
Reasoning: "How many people are in the room?"
Guardrails: Smooth counting, handle occlusion
Output: Log data, trigger alerts at thresholds
```

---

## Project Structure

Harness-based projects follow this structure:

```
my-project/
├── config/
│   ├── default.yaml        # Default configuration
│   ├── development.yaml    # Dev overrides
│   └── production.yaml     # Production settings
├── inputs/
│   └── webcam.js           # Input adapters
├── processors/
│   └── speaker-detect.js   # Detection logic
├── outputs/
│   ├── obs.js              # OBS integration
│   └── ptz.js              # Camera control
├── web/
│   └── dashboard.html      # Monitoring UI
├── app.js                  # Main application
└── README.md
```

---

## Configuration

Projects are configured via YAML files with environment overrides:

```yaml
# config/default.yaml

input:
  type: webcam
  device: 0
  resolution: 720p

model:
  provider: moondream
  endpoint: cloud
  api_key: ${MOONDREAM_API_KEY}

guardrails:
  confidence_threshold: 0.8
  cooldown_ms: 2000
  human_override_seconds: 5

output:
  obs:
    host: localhost
    port: 4455
  ptz:
    ip: 192.168.1.100

logging:
  level: info
  file: logs/reasoning.log
```

---

## Best Practices Checklist

Before deploying a visual reasoning system:

### Safety
- [ ] Confidence threshold set to 0.8 or higher
- [ ] Human override mechanism in place
- [ ] Fallback behavior defined for AI failure
- [ ] Testing completed with edge cases

### Reliability  
- [ ] Cooldown periods prevent rapid triggers
- [ ] Debouncing requires sustained detection
- [ ] Connection loss handled gracefully
- [ ] Logging captures all decisions

### Performance
- [ ] Appropriate tool for each task (MediaPipe vs VLM)
- [ ] Frame rate matched to use case needs
- [ ] API rate limits respected
- [ ] Resource usage monitored

### Maintainability
- [ ] Configuration externalized (not hardcoded)
- [ ] Inputs/outputs abstracted
- [ ] Code follows harness patterns
- [ ] Documentation updated

---

## Getting Started

1. **Clone the playground**
   ```
   git clone https://github.com/StreamGeeks/visual-reasoning-playground
   ```

2. **Explore the examples**
   - `01-scene-describer/` - Basic VLM queries
   - `03-gesture-obs/` - OBS integration pattern
   - `05-framing-assistant/` - PTZ control pattern
   - `07-multimodal-studio/` - Voice + vision

3. **Build your project**
   - Start from the example closest to your use case
   - Follow the 5-stage pipeline
   - Apply guardrails before going live

4. **Contribute back**
   - Found a better pattern? Share it
   - Built a new integration? Submit a PR
   - Discovered an edge case? Document it

---

## The Movement

This harness embodies the Visual Reasoning principles:

- **Open ecosystems** over closed stacks
- **Real outcomes** over AI slogans  
- **Human agency** over black-box automation

The ProAV industry should own its AI future—not rent it from platform vendors. This harness is a shared resource for the community to build on.

---

## Resources

- [Visual Reasoning Playground](https://github.com/StreamGeeks/visual-reasoning-playground)
- [Moondream API](https://console.moondream.ai)
- [Book: Visual Reasoning AI for Broadcast and ProAV](https://amazon.com)
- [PTZOptics Developer Resources](https://ptzoptics.com/api)

---

*Part of the Visual Reasoning AI for Broadcast and ProAV project by Paul Richards*
