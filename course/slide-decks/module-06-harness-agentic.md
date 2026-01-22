# Module 6: The Visual Reasoning Harness & Agentic Workflows

---

## SLIDE 1: Title

**Module 6**
# The Visual Reasoning Harness & Agentic Workflows

Visual Reasoning AI for Broadcast & ProAV

*From experiments to production systems.*

---

## SLIDE 2: Learning Objectives

**By the end of this module, you will be able to:**

1. Explain what a harness is and why it matters
2. Understand the three core abstractions
3. Use configuration over code patterns
4. Work effectively with agentic coding tools
5. Build production-ready visual reasoning systems

---

## SLIDE 3: The Problem

**Without standardization, every project is a one-off.**

Each project requires:
- How do I connect to the vision model?
- How do I handle errors?
- Where do I put configuration?
- How do I log what's happening?
- What happens when I want to switch models?

**Result: Inconsistency, wasted time, difficult maintenance.**

---

## SLIDE 4: The Research

**Infrastructure matters as much as the model.**

| Finding | Source |
|---------|--------|
| Harness design improves performance by 20% | Epoch AI (2025) |
| Same model + better scaffold = 2x results | OpenAI SWE-bench |
| AI agents degrade after 35 minutes | AIM Research (2025) |

**A well-designed harness makes modest models outperform powerful models on ad-hoc infrastructure.**

---

## SLIDE 5: What is a Harness?

**A framework that standardizes how you build applications.**

| Function | Description |
|----------|-------------|
| **Abstracts patterns** | Reusable components for common tasks |
| **Enforces structure** | Consistent patterns across projects |
| **Provides extension points** | Custom logic in defined places |
| **Embeds best practices** | Error handling, logging built-in |
| **Enables swappability** | Change models via configuration |

---

## SLIDE 6: The Car Chassis Analogy

**Think of it like a car chassis.**

Every car has:
- Wheels, engine, steering, brakes

The chassis provides:
- Structure for these components
- Standard mounting points
- Consistent interfaces

**You don't redesign the chassis for each car. You customize what matters.**

---

## SLIDE 7: Harness + Pipeline

**The harness implements the 5-stage pipeline:**

| Stage | Harness Component |
|-------|-------------------|
| Media Inputs | Input adapters (webcam, RTSP, NDI) |
| Perception | Pluggable modules (MediaPipe, OCR) |
| Reasoning (VLM) | Model abstraction layer |
| Decision | Built-in thresholds, cooldowns, smoothing |
| Control | Output adapters (OBS, vMix, PTZ) |

**Same pipeline, standardized implementation.**

---

## SLIDE 8: The Three Abstractions

# Core Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    INPUT    │ →  │    MODEL    │ →  │   OUTPUT    │
│ Abstraction │    │ Abstraction │    │ Abstraction │
└─────────────┘    └─────────────┘    └─────────────┘
     Webcam            Moondream          OBS
     RTSP              GPT-4V             vMix
     NDI               Claude             PTZ
     Files             Custom             Webhooks
```

---

## SLIDE 9: Input Abstraction

**All the ways visual data can enter:**

- Webcam capture
- IP camera streams (RTSP)
- NDI sources
- Video files
- Screen capture
- Image uploads

**Your logic receives frames without caring where they came from.**

---

## SLIDE 10: Model Abstraction

**All the ways to analyze visual data:**

- Moondream cloud API
- Moondream local
- GPT-4V
- Claude Vision
- Custom models

**Your logic makes queries without coupling to a specific model.**

Switch models by changing config, not code.

---

## SLIDE 11: Output Abstraction

**All the ways to act on results:**

- PTZ camera control
- Production software (vMix, OBS)
- Alerts and notifications
- Logging and analytics
- Custom actions

**Your logic triggers actions without coupling to specific systems.**

---

## SLIDE 12: Configuration Over Code

**Prefer configuration for things that vary:**

| Environment | Configuration |
|-------------|---------------|
| **Development** | Webcam, cloud model, console logs |
| **Staging** | IP camera, local model, file logs |
| **Production** | NDI, local model, database + alerts |

**Same application, different config files.**

---

## SLIDE 13: Lifecycle Management

**The harness manages your app's lifecycle:**

```
STARTUP                RUNTIME                SHUTDOWN
────────────────────────────────────────────────────────
✓ Validate config      ✓ Frame capture        ✓ Stop gracefully
✓ Init inputs          ✓ Route to processors  ✓ Close connections
✓ Connect models       ✓ Handle errors        ✓ Flush logs
✓ Setup outputs        ✓ Maintain state       ✓ Clean resources
✓ Start processing     ✓ Log events
```

**Focus on what makes your app unique.**

---

## SLIDE 14: Why ProAV Needs This

**AI coding tools lack ProAV context.**

They don't know:
- How vMix or OBS APIs work
- What PTZOptics cameras can do
- Standard broadcast terminology
- Common production workflows

**The harness provides that domain knowledge.**

---

## SLIDE 15: What is Agentic Coding?

**A fundamental shift in how we build software.**

| Traditional AI Assist | Agentic Coding |
|-----------------------|----------------|
| Autocomplete on steroids | AI as collaborator |
| You do most thinking | AI understands context |
| Suggests snippets | Writes complete solutions |
| Single file focus | Multi-file awareness |

**Like giving directions vs. sharing a destination.**

---

## SLIDE 16: Why Agentic Coding + Visual Reasoning

**Visual reasoning spans multiple domains:**

- Vision model APIs
- Video processing
- Camera control protocols
- Production software
- Web technologies
- Real-time considerations

**No one is expert in all of these. Agentic tools are.**

---

## SLIDE 17: Begin with the End in Mind

**Focus creative energy on defining "done."**

Old mindset:
- "How do I build this?"
- "What's the MVP?"

New mindset:
- "What makes the customer say 'exactly what I needed'?"
- "What's the complete vision?"
- "What are we leaving out only because it seems hard?"

**Implementation got easier. Dream bigger.**

---

## SLIDE 18: Define Done Before Starting

**Before opening Cursor, write what "done" looks like.**

**Worship automation:**
> "The team focuses on the service, not cameras. Transitions feel intentional. Setup takes 5 minutes Sunday morning."

**Sports graphics:**
> "Scores update within 2 seconds. Graphics match broadcast style. Parents see professional quality."

**Human outcomes, not feature lists.**

---

## SLIDE 19: Getting Started with Cursor

**Cursor = AI-powered VS Code**

Key interfaces:

1. **Chat panel** – Conversation about your code
2. **Inline editing** – Select and modify code
3. **Composer** – Create/change multiple files

**Download: cursor.com**

---

## SLIDE 20: The Art of Prompting

**Quality in = Quality out**

| Prompt Type | Example | Result |
|-------------|---------|--------|
| **Vague** | "Make it work better" | Vague results |
| **Specific** | "Add smoothing to PTZ so moves are fluid" | Specific fix |
| **Great** | File, problem, solution, constraints | Exactly what you need |

**More context = better help.**

---

## SLIDE 21: Cursor + Harness Workflow

**Combining tools for maximum productivity:**

```
"Add support for Elgato capture cards as a new input source. 
Follow the same pattern as the webcam adapter."
```

Cursor will:
1. Study your existing code
2. Understand harness patterns
3. Generate consistent code

**Describe intent, not implementation.**

---

## SLIDE 22: What Cursor Does Well

| Strength | Example |
|----------|---------|
| **Understanding context** | Knows your whole project |
| **Writing boilerplate** | Setup, error handling, types |
| **Integration code** | API connections, parsing |
| **Explaining code** | Walk through any section |

---

## SLIDE 23: What Requires Human Judgment

| Area | Why |
|------|-----|
| **Architecture** | Deciding what to build |
| **Business logic** | Domain-specific rules |
| **Testing** | Verifying the right things |
| **Edge cases** | Deployment-specific scenarios |
| **Taste** | What feels right to users |

**Cursor executes. You direct.**

---

## SLIDE 24: The Iteration Loop

```
┌──────────────────────────────────────────────────┐
│                 AGENTIC WORKFLOW                  │
├──────────────────────────────────────────────────┤
│  1. PLAN     → What am I building?               │
│  2. DESCRIBE → Clear prompt with context         │
│  3. REVIEW   → Does it make sense?               │
│  4. TEST     → Does it work?                     │
│  5. ITERATE  → What needs to change?             │
│  6. REFINE   → Better errors, efficiency         │
└──────────────────────────────────────────────────┘
```

**Faster than traditional dev. You're still in control.**

---

## SLIDE 25: Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Accepting without understanding | Ask Cursor to explain |
| Fighting the AI | Step back, reconsider |
| Over-relying on generated code | Learn concepts, not just keystrokes |
| Ignoring context | Reference files, explain constraints |

**Don't ship code you can't reason about.**

---

## SLIDE 26: Hands-On Demo

# Building with the Harness

*Refactoring a project into the harness structure*

---

## SLIDE 27: Demo - Project Analysis

**Starting point: Ad-hoc visual reasoning project**

Problems to solve:
- Hardcoded configuration
- Inconsistent error handling
- No logging
- Model tightly coupled
- Difficult to test

---

## SLIDE 28: Demo - Harness Structure

**Target structure:**

```
my-project/
├── config/
│   ├── development.yaml
│   └── production.yaml
├── inputs/
│   └── webcam-adapter.js
├── processors/
│   └── detection-processor.js
├── outputs/
│   └── obs-output.js
├── app.js
└── README.md
```

---

## SLIDE 29: Demo - Input Abstraction

**Cursor prompt:**

```
Refactor the webcam capture code into an input adapter
that follows the harness pattern. It should:
- Implement the InputAdapter interface
- Accept configuration for resolution and frame rate
- Handle connection/disconnection gracefully
- Emit frames to the processing pipeline
```

*[Live demo: Cursor generates adapter]*

---

## SLIDE 30: Demo - Model Abstraction

**Cursor prompt:**

```
Create a model abstraction layer that:
- Defines a common interface for all vision models
- Implements Moondream as the first provider
- Makes it easy to add new providers later
- Handles API errors and rate limiting
```

*[Live demo: Cursor generates model layer]*

---

## SLIDE 31: Demo - Output Abstraction

**Cursor prompt:**

```
Create an OBS output adapter that:
- Connects to OBS WebSocket
- Implements the OutputAdapter interface
- Can switch scenes and toggle sources
- Recovers from connection loss
```

*[Live demo: Cursor generates output adapter]*

---

## SLIDE 32: Demo - Configuration

**development.yaml:**

```yaml
input:
  type: webcam
  device: 0
  resolution: 720p

model:
  provider: moondream
  endpoint: cloud

output:
  type: obs
  host: localhost
  port: 4455
```

**Change deployment by swapping config files.**

---

## SLIDE 33: Demo - Results

**Before harness:**
- 300+ lines in single file
- Hardcoded everything
- Difficult to modify

**After harness:**
- Clean separation of concerns
- Configuration-driven
- Easy to extend and test

---

## SLIDE 34: Join the Movement

**The harness is open source and evolving.**

How to participate:
- **GitHub**: Star, fork, watch for updates
- **Issues**: Report bugs, request features
- **Pull Requests**: Contribute improvements
- **Discussions**: Connect with other builders

**Your real-world experience makes it better.**

---

## SLIDE 35: Customize for Your Practice

**Fork and specialize:**

| Your Specialty | Your Harness Includes |
|----------------|----------------------|
| QSC dealer | Q-SYS integration patterns |
| Extron focus | Control system templates |
| Crestron expert | Specific API calls |
| Dante audio | Audio integration patterns |

**Encode your expertise. Share what benefits everyone.**

---

## SLIDE 36: Key Takeaways

**What You Learned Today:**

1. **Harnesses** standardize how we build
2. **Three abstractions**: Input, Model, Output
3. **Configuration over code** for flexibility
4. **Agentic coding** = AI as collaborator
5. **Define done** before you start building

---

## SLIDE 37: The Shift

**Remember:**

✅ Infrastructure matters as much as the model
✅ Standardization enables faster iteration
✅ Agentic tools handle implementation
✅ Your focus: outcomes and value

❌ Don't rebuild from scratch each time
❌ Don't hardcode what should be configurable
❌ Don't accept code you can't reason about

---

## SLIDE 38: Module 6 Complete

# Congratulations!

You've completed **Module 6: The Visual Reasoning Harness**

You now have:
- ✅ Understanding of harness architecture
- ✅ Three abstraction patterns
- ✅ Agentic coding workflow
- ✅ Production-ready project structure

---

## SLIDE 39: Coming Up Next

**Module 7: Capstone Project**

- Design your own visual reasoning system
- Choose your use case (worship, sports, corporate, education)
- Apply everything you've learned
- Optional: multimodal audio + video integration

*From learning to building.*

---

## SLIDE 40: Resources

**Links for This Module:**

- Visual Reasoning Harness: `github.com/ptzoptics/visual-reasoning-harness`
- Cursor: `cursor.com`
- Book Chapters: 18-19 (Harness and Agentic Coding)

**Practice:** Take an existing project and refactor it using harness patterns.

---

*End of Module 6*
