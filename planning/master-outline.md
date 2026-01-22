# Master Outline - Book, Course & Code Alignment

> **Design Principle:** Begin with the end in mind. The Playground Tools drive everything.

---

## The Visual Reasoning Playground

These 8 tools are the end goal. Everything in the book and course builds toward these:

| # | Tool | What It Does |
|---|------|--------------|
| 1 | Scene Describer | Describe what camera sees (no code) |
| 2 | Detection Boxes | Draw boxes around objects (no code) |
| 3 | Auto-Track Any Object | PTZ follows any object (Moondream + PTZOptics API) |
| 4 | Smart Counter | Count objects entering space |
| 5 | Scene Analyzer | Understand scene + answer questions |
| 6 | Zone Monitor | Draw zone → trigger on activity |
| 7 | AI Color Assistant | Match camera to reference style |
| 8 | Multimodal Fusion | Audio + video combined intelligence |

---

## Book → Course → Code Mapping

### Part I: See It In Action (Chapters 1-3)

| Chapter | Course | Code | Tool |
|---------|--------|------|------|
| Ch 1: Welcome | Module 1 intro | — | Overview |
| Ch 2: First Query | Module 1 | `vision-models/scene-describer/` | Tool 1 |
| Ch 3: Detection Boxes | Module 1 | `vision-models/detection-boxes/` | Tool 2 |

**Reader Milestone:** Visual reasoning working in browser, no code required

---

### Part II: Just Enough Theory (Chapters 4-6)

| Chapter | Course | Code | Tool |
|---------|--------|------|------|
| Ch 4: VR vs Everything | Module 1 | — | — |
| Ch 5: Models & APIs | Module 1 | `vision-models/api-setup/` | — |
| Ch 6: Dev Environment | Module 1 lab | `vision-models/environment-test/` | — |

**Reader Milestone:** Development environment ready, API key working

---

### Part III: Building the Playground Tools (Chapters 7-11)

| Chapter | Course | Code | Tool |
|---------|--------|------|------|
| Ch 7: Auto-Tracker | Module 2 | `PTZOptics-Moondream-Tracker/` ✅ | Tool 3 |
| Ch 8: Smart Counter | Module 2 | `object-tracking/smart-counter/` | Tool 4 |
| Ch 9: Scene Analyzer | Module 2 | `vision-models/scene-analyzer/` | Tool 5 |
| Ch 10: Zone Monitor | Module 3 | `zone-monitoring/zone-monitor/` | Tool 6 |
| Ch 11: Color Assistant | Module 5 | `color-matching/color-assistant/` | Tool 7 |

**Reader Milestone:** 5 working tools built and customized

---

### Part IV: Adding Audio (Chapters 12-14)

| Chapter | Course | Code | Tool |
|---------|--------|------|------|
| Ch 12: Audio Fundamentals | Module 6 | `audio-processing/whisper-setup/` | — |
| Ch 13: Intent Extraction | Module 6 | `audio-processing/intent-extraction/` | — |
| Ch 14: Fusion System | Module 6 | `multimodal-systems/fusion-system/` | Tool 8 |

**Reader Milestone:** Complete multimodal system working

---

### Part V: Production Automation (Chapters 15-17)

| Chapter | Course | Code | Tool |
|---------|--------|------|------|
| Ch 15: OBS Integration (Primary) | Module 3, 4 | `production-automation/obs-integration/` | — |
| Ch 16: PTZOptics Advanced | Module 2 ext | `production-automation/ptzoptics-control/` | — |
| Ch 17: vMix Integration (Alt) | Module 3 alt | `production-automation/vmix-integration/` | — |

**Reader Milestone:** Visual reasoning connected to production systems (OBS primary, vMix alternative)

---

### Part VI: The Visual Reasoning Harness (Chapters 18-19)

| Chapter | Course | Code | Tool |
|---------|--------|------|------|
| Ch 18: What is a Harness | Module 7 | `visual-reasoning-harness/core/` | — |
| Ch 19: Agentic Coding | Module 7 | `visual-reasoning-harness/cursor-patterns/` | — |

**Reader Milestone:** Production-ready architecture understood

---

### Part VII: Industry Applications & Future (Chapters 20-21)

| Chapter | Course | Code | Tool |
|---------|--------|------|------|
| Ch 20: Applied Ideas (Sports, Worship, Education, Corporate) | Module 4, Capstone | — | Case studies |
| Ch 21: The Future | — | — | Vision & Call to Arms |

**Reader Milestone:** Industry-specific patterns + complete understanding, ready to innovate

**Note:** Book restructuring consolidated old chapters 22-25 into chapter 20, and removed chapters on logging/debugging, model swapping, when to use AI, and ethics (condensed into front matter manifesto).

---

## Code Repository Structure

```
code-examples/
├── vision-models/
│   ├── scene-describer/          # Tool 1: No-code web demo reference
│   ├── detection-boxes/          # Tool 2: No-code web demo reference
│   ├── scene-analyzer/           # Tool 5: Q&A system
│   ├── api-setup/                # Ch 5: API key configuration
│   ├── environment-test/         # Ch 6: Verify setup
│   └── prompt-patterns/          # Reusable prompt templates
│
├── object-tracking/
│   ├── moondream-tracker/        # Module 2: VLM-based "track anything" (flexible)
│   ├── mediapipe-tracker/        # Module 2: Traditional CV human tracking (fast)
│   ├── ptzoptics-auto-tracker/   # Tool 3: PTZ auto-tracking ⭐ Paul has code
│   └── smart-counter/            # Tool 4: Object counting
│
├── zone-monitoring/
│   └── zone-monitor/             # Tool 6: Zone-based triggers
│
├── gesture-control/
│   ├── obs-gesture-switching/    # Module 3: OBS gesture control (PRIMARY)
│   └── vmix-gesture-switching/   # Module 3: vMix adaptation (ALTERNATIVE)
│
├── data-extraction/
│   ├── virtual-webcam-setup/     # Module 4: How to set up virtual webcam test env
│   ├── scoreboard-extraction/    # Module 4: Extract scores from video feed
│   ├── license-plate-reader/     # Module 4: License plate extraction example
│   ├── color-profile-extraction/ # Module 4: Camera color data extraction
│   └── obs-score-overlay/        # Module 4: Render scores as OBS graphics
│
├── color-matching/
│   └── color-assistant/          # Tool 7: Reference image matching
│
├── audio-processing/
│   ├── whisper-setup/            # Capstone: Speech-to-text (optional)
│   ├── demuxing/                 # Capstone: Audio/video separation (optional)
│   └── intent-extraction/        # Capstone: Command parsing (optional)
│
├── multimodal-systems/
│   └── fusion-system/            # Capstone: Audio + video combined (optional)
│
├── production-automation/
│   ├── obs-integration/          # Ch 15: OBS control (PRIMARY)
│   ├── vmix-integration/         # Ch 17: vMix control (ALTERNATIVE)
│   └── ptzoptics-control/        # Ch 16: Advanced PTZ control
│
└── visual-reasoning-harness/
    ├── core/                     # Ch 18: Harness architecture
    └── cursor-patterns/          # Ch 19: Agentic coding examples
```

---

## Course Module Summary (7 Modules)

| Module | Book Chapters | Primary Tools |
|--------|---------------|---------------|
| 1: Foundations | 1-6 | Tools 1-2 (web-based) |
| 2: Visual Understanding | 7-9 | Moondream (VLM) + MediaPipe (traditional CV) |
| 3: Gesture/Automation | 10, 15, 17 | OBS WebSocket (primary) + vMix/TriCaster (alt) |
| 4: Data Extraction | 15, 20 | Virtual Webcam + Scoreboard + License Plates |
| 5: Color Matching | 11 | Tool 7 |
| 6: Harness & Agentic | 18-19 | Architecture |
| 7: Capstone | 12-14, 20 | Student's choice (multimodal optional) |

**Key Changes:**
- Module 2 now compares VLM (Moondream) vs Traditional CV (MediaPipe)
- Module 2 includes "Search and Find" bonus activity (PTZ searches room for described objects)
- Module 4 expanded: scoreboard extraction + license plates + camera color profiles
- Old Module 6 (Multimodal) removed — now a capstone project option
- Course reduced from 8 to 7 modules

---

## Development Phases

### Phase 1: Foundation + First Tool
- [x] Interview Session 1 (Origin & Vision)
- [x] Chapters 1-6 drafted
- [x] Auto-Tracker code integrated (Paul's existing code)
- [ ] Module 1 course content

### Phase 2: Core Tools
- [x] Interview Sessions 2-3
- [x] Chapters 7-11 drafted
- [x] Tools 3-7 code complete
- [ ] Modules 2-5 course content

### Phase 3: Multimodal
- [x] Interview Session 4
- [x] Chapters 12-14 drafted
- [x] Tool 8 code complete
- [ ] Module 6 course content

### Phase 4: Production & Harness
- [x] Interview Sessions 5-6
- [x] Chapters 15-19 drafted
- [x] Integration code complete
- [ ] Module 7 course content

### Phase 5: Industry & Completion
- [x] Chapters 20-21 drafted (consolidated from old 22-28)
- [x] Book restructuring complete (28 → 21 chapters)
- [ ] All code tested
- [ ] Capstone examples
- [ ] Final review
- [ ] Virtual webcam scoreboard video (pending from Paul)

---

## Two-Example Rule

Every concept needs both examples documented:

| Concept | Business Example | Personal Example |
|---------|------------------|------------------|
| Scene description | Patient fall detection | Fridge → recipes |
| Detection boxes | Manufacturing QA | Find lost items |
| VLM tracking (Moondream) | Track any product on assembly line | Track pet around house |
| MediaPipe tracking | Speaker tracking (low latency) | Fitness pose detection |
| Counting | Retail traffic | Kid activity |
| Scene Q&A | Security ops | "Garage door open?" |
| Zone triggers | Warehouse safety | Driveway alerts |
| Color matching | Multi-cam matching | YouTuber style |
| Data extraction | Scoreboard → graphics | License plate logging |
| OBS control | Sports graphics, gesture switching | Stream alerts, BRB automation |
| Audio+Video (capstone) | Conference room | Smart home |

---

*Last updated: [Date]*
