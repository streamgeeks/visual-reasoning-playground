# Visual Reasoning AI for Broadcast & ProAV - Course Syllabus

**A Hands-On Course Using VisualReasoning.ai, Moondream, and Cursor**

> This is the original syllabus - a living document that will evolve as the book and course develop.

---

## Course Description

Visual Reasoning AI for Broadcast & ProAV is a hands-on, project-driven course designed for professionals working in live production, ProAV, sports media, worship, education, and broadcast environments.

This course introduces visual reasoning—a modern AI approach that allows systems to understand scenes rather than rely on rigid computer vision rules. Students will learn how Vision-Language Models (VLMs) and traditional computer vision tools can be applied to real-world production challenges such as camera automation, live switching, sports graphics, data extraction, and color matching. You'll learn when to use flexible VLMs like Moondream versus specialized tools like MediaPipe for optimal performance.

Using Cursor as an agentic AI coding tool and open-source visual reasoning projects, students will progressively build a complete visual reasoning system tailored to ProAV and broadcast workflows.

The book *Visual Reasoning AI for Broadcast and ProAV* is available to read alongside the online course. The book follows the online course structure and provides learners with additional context for the included GitHub projects. On GitHub you will find organized code examples and a complete Visual Reasoning Playground for students to fork and play with.

**No prior AI experience is required.** Access to agentic coding tools such as Cursor, Kiro or Warp is recommended.

---

## Intended Audience

- ProAV professionals
- Broadcast engineers & technical directors
- Live production teams
- Sports media & streaming operators
- Worship & education tech teams
- Educators and system designers

---

## Prerequisites

- Basic familiarity with live video production concepts
- Comfort using a computer terminal and editing code (beginner level acceptable)
- No AI or machine learning background required

---

## Course Outcomes

By the end of this course, students will be able to:

1. Explain the difference between traditional computer vision, LLMs, and VLMs
2. Choose the right AI tool for the job (VLM for flexibility vs traditional CV for speed)
3. Understand what visual reasoning is and why it matters for ProAV
4. Use Vision Models such as Moondream to perform tasks such as describing a scene, drawing detection boxes and returning structured data
5. Use MediaPipe for low-latency human/hand/face tracking
6. Use API-based AI services safely and effectively
7. Customize open-source visual reasoning systems using Cursor
8. Build AI-driven automations for live production (OBS, vMix, TriCaster)
9. Extract structured data from video feeds (scoreboards, license plates, etc.)
10. Apply visual reasoning across sports, worship, education, business, and broadcast workflows
11. Learn the difference between cloud-based models and local models
12. Confidently evaluate when and how AI should be used in production environments

---

## Tools & Technologies Used

- VisualReasoning.ai
- Moondream Vision-Language Model
- MediaPipe (Traditional CV for low-latency human tracking)
- Cursor (Agentic AI Coding Tool)
- OBS Studio + WebSocket API (primary production integration)
- vMix API (alternative for Windows users)
- Whisper (Speech-to-Text)
- PTZOptics API 2.0
- Open-source GitHub repositories (provided)

---

## Course Modules & Schedule

### Module 1 — Foundations of Visual Reasoning AI

**Overview:** This module establishes the conceptual foundation of the course and prepares students with the tools and terminology needed to succeed.

**Topics Covered:**
- What is AI (practical definition)
- What is an LLM vs a VLM
- Why visual reasoning is different from computer vision
- Local models vs cloud models
- API keys: what they are and how they work
- Obtaining and using a Moondream API key
- Introduction to Cursor and agentic workflows

**Lab:**
- Run a basic visual reasoning query on a single image
- Receive structured output from a VLM

**Deliverables:**
- Working development environment
- Successful API call and response
- Understanding of the course workflow

---

### Module 2 — Visual Understanding & Object Tracking

**Overview:** Students build their first real visual reasoning system by implementing object tracking. This module introduces the 5-stage ProAV pipeline that every project follows, and a critical concept: choosing the right AI tool for the job.

**The 5-Stage ProAV Pipeline (introduced here, used throughout):**
1. **Media Inputs** — Video/audio from RTSP, NDI, files, webcams
2. **Perception** — Fast signals: boxes, pose, tracks, OCR, embeddings
3. **Reasoning (VLM)** — Interpretation, scene state, grounded JSON
4. **Decision (Guardrails)** — Thresholds, cooldowns, smoothing
5. **Control (Outputs)** — vMix, OBS, PTZ commands, logs

**Topics Covered:**
- The 5-stage pipeline and how every project follows it
- Visual queries and structured responses
- Bounding boxes and coordinates
- Confidence scoring
- Prompt-driven behavior changes
- **VLM vs Traditional CV: Choosing the Right Tool**
  - VLMs (Moondream): Flexible, can track any described object, higher latency
  - Traditional CV (MediaPipe): Specialized, human/hand/face tracking, much lower latency
  - When to use each approach
  - Performance comparison: latency vs flexibility tradeoff

**Projects:**
1. **Moondream Tracker:** Auto-track any object you describe (coffee mug, red pen, specific person) — observe the flexibility but note the latency
2. **MediaPipe Tracker:** Track a human with MediaPipe — observe the speed difference for specialized tasks

**Deliverables:**
- Object tracking system with Moondream (flexible)
- Human tracking system with MediaPipe (fast)
- Understanding of when to use VLMs vs traditional CV
- Customized prompts via Cursor

**Bonus Activity: Search and Find**

This is a fun, interactive activity that combines PTZ control with visual reasoning in a game-like format.

**The concept:** Type a description of any object in the room ("red coffee mug," "laptop with stickers," "the plant by the window"), and the PTZ camera will search for it—panning through the room, zooming in on candidates, and announcing when it finds the target.

**How it works:**
1. Camera starts with a wide establishing shot
2. System divides the room into a search grid
3. Camera moves to each position, asking the VLM "Do you see [target]?"
4. When a potential match is found, camera zooms in to confirm
5. When confirmed, camera centers on the object and announces success

**Why it's fun:**
- Interactive and immediately impressive to demonstrate
- Teaches systematic search patterns
- Shows the power of natural language object descriptions
- Great for testing prompt variations ("find something red" vs "find the red mug")
- Kids love it—hide an object and see if the camera can find it

**Why it's useful:**
- Security: Search a space for specific items
- Inventory: Locate products in a warehouse
- Lost and found: "Where did I leave my keys?"
- Production: Find specific props or equipment

This activity appears in Chapter 16 of the book and can be built as an extension of the tracking projects.

---

### Module 3 — From Understanding to Action: Gesture-Controlled Production

**Overview:** This module introduces automation by mapping visual understanding to live production control. OBS Studio serves as the primary integration platform. We also demonstrate how the same patterns adapt to vMix, TriCaster, and other production systems.

**Topics Covered:**
- Gesture recognition using visual reasoning
- Drawing detection boxes around detected gestures
- Mapping AI outputs to production actions
- **OBS WebSocket Integration (Primary)**
  - Enabling and configuring OBS WebSocket server
  - Understanding WebSocket connection lifecycle
  - Scene switching commands
  - Source visibility control
  - Connection handling and error recovery
- **Adapting to Other Systems**
  - vMix API: HTTP-based control for Windows users
  - TriCaster: Adapting the pattern for NewTek systems
  - The universal pattern: Detect → Decide → Act
- Confidence thresholds and safety logic
- Debouncing and preventing false triggers

**Project:** Gesture-based scene switching with OBS
- Thumbs up → switch to a scene containing a video (e.g., "Success" clip)
- Thumbs down → switch to preview/holding scene
- Demonstrate the same logic adapted for vMix (optional)

**Deliverables:**
- Gesture-controlled OBS demo
- Understanding of OBS WebSocket API
- Knowledge of how to adapt to vMix, TriCaster, or other systems
- Functional integration with confidence thresholds

---

### Module 4 — Visual Data Extraction

**Overview:** Students apply visual reasoning to extract structured data from video feeds. The primary project uses sports scoreboard extraction, but the techniques apply broadly: license plates, camera color profiles, product labels, signage, and any visual data that needs to be read and processed.

**Topics Covered:**
- Why OCR alone is insufficient for real-world data extraction
- Context-aware extraction using visual reasoning
- Handling varying layouts and conditions
- Temporal consistency and error handling
- **Broader Data Extraction Applications:**
  - License plate recognition (parking, security)
  - Camera color profile extraction (multi-cam matching)
  - Product/label reading (retail, manufacturing)
  - Signage and display content extraction

**Setting Up the Test Environment:**
- Obtaining the scoreboard demo video (provided link)
- Using OBS Virtual Camera to play video as a webcam source
- Capturing the virtual webcam in OBS or vMix as an input
- Why this approach enables reproducible testing without live footage

**The Virtual Webcam Workflow:**
```
Video File (scoreboard, parking lot, etc.)
        ↓
OBS plays video + Virtual Camera output
        ↓
Your application captures "webcam" feed
        ↓
Visual reasoning extracts structured data
        ↓
Data drives graphics, logging, or automation
```

**Project:** Extract live scores from a simulated scoreboard feed → Render results as a digital scoreboard graphic in OBS

**Discussion:** How the same extraction pattern applies to:
- Reading license plates from a parking camera
- Extracting color/exposure values from camera feeds for matching
- Any scenario where you need to "read" visual information

**Deliverables:**
- Working virtual webcam test environment
- End-to-end data extraction pipeline
- Modular extraction logic that can adapt to different data types
- Understanding of the universal "visual data → structured output" pattern

---

### Module 5 — AI-Assisted Framing & Color Matching

**Overview:** This module explores AI as a creative and technical assistant in a broadcast studio environment.

**Topics Covered:**
- Reference image analysis
- Style and aesthetic comparison
- Structured feedback for color and framing
- Human-in-the-loop AI workflows

**Project:** AI-assisted framing and color tuning tool using a reference image

**Deliverables:**
- Structured feedback system for camera tuning
- Before/after visual comparisons

---

### Module 6 — The Visual Reasoning Harness & Agentic Workflows

**Overview:** This module focuses on scalability, maintainability, and professional deployment practices.

**Topics Covered:**
- Agentic coding workflows
- Visual Reasoning Harness architecture
- Prompt versioning
- Logging and observability
- Model swapping strategies

**Lab:** Refactor earlier projects into a unified system

**Deliverables:**
- Modular visual reasoning architecture
- Production-ready project structure

---

### Module 7 — Capstone Project

**Overview:** Students design and implement a visual reasoning system tailored to their own ProAV or broadcast use case. This is where everything comes together—and where advanced topics like multimodal (audio + video) integration can be explored.

**Capstone Options:**
- Worship automation system
- Sports production assistant
- Classroom camera operator
- Studio AI assistant
- Venue monitoring system
- **Multimodal Conference Room** (audio + visual reasoning)
  - Speech-to-text with Whisper
  - Intent extraction from speech
  - Combining audio and visual triggers
  - "Start the meeting" voice command + person detection

**Requirements:**
- Vision-based reasoning (required)
- At least one automation trigger (required)
- Clear explanation of design decisions (required)
- Audio/multimodal integration (optional, for advanced projects)

---

## Assessment & Completion

- Module labs and projects
- Final capstone presentation (if included)
- Practical demonstration of working systems
