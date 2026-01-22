# Module 7: Capstone Project

---

## SLIDE 1: Title

**Module 7**
# Capstone Project

Visual Reasoning AI for Broadcast & ProAV

*Design and build your own visual reasoning system.*

---

## SLIDE 2: What You've Learned

**Your Journey So Far:**

| Module | Skills Gained |
|--------|---------------|
| 1 | VLMs, APIs, development environment |
| 2 | Object detection, tracking, bounding boxes |
| 3 | Gesture recognition, OBS automation |
| 4 | Data extraction, scoreboards, graphics |
| 5 | Framing analysis, color matching |
| 6 | Harness architecture, agentic coding |

**Now: Apply everything.**

---

## SLIDE 3: Capstone Goals

**This module is about:**

1. Designing a system for YOUR use case
2. Combining multiple techniques
3. Making real-world decisions
4. Building something you can use

**No templates. Your vision.**

---

## SLIDE 4: The Requirements

**Every capstone must include:**

| Required | Description |
|----------|-------------|
| ✅ Vision-based reasoning | AI analyzing video |
| ✅ At least one automation trigger | Action based on detection |
| ✅ Design documentation | Explain your decisions |

**Optional but encouraged:**
- Audio/multimodal integration
- Multiple input sources
- Production software integration

---

## SLIDE 5: Capstone Options

**Choose your domain:**

1. **Worship Automation System**
2. **Sports Production Assistant**
3. **Classroom Camera Operator**
4. **Studio AI Assistant**
5. **Venue Monitoring System**
6. **Multimodal Conference Room**
7. **Custom** (your own idea)

---

## SLIDE 6: Option 1 - Worship Automation

**Challenge:** Automate camera switching during services

**Possible features:**
- Detect speaker at podium → switch to podium camera
- Detect worship leader movement → follow with PTZ
- Detect congregation standing → switch to wide shot
- Lower third with speaker name

**Key decisions:** How much automation vs. operator control?

---

## SLIDE 7: Option 2 - Sports Production

**Challenge:** Assist with live sports broadcast

**Possible features:**
- Extract scores from physical scoreboard
- Generate graphics overlay
- Track ball position for replay suggestions
- Detect celebrations for highlight moments

**Key decisions:** Speed vs. accuracy tradeoff?

---

## SLIDE 8: Option 3 - Classroom Camera

**Challenge:** Auto-direct a lecture capture

**Possible features:**
- Track instructor movement
- Switch to whiteboard when writing detected
- Cut to student questions (hand raised)
- Picture-in-picture for demonstrations

**Key decisions:** How to handle rapid transitions?

---

## SLIDE 9: Option 4 - Studio AI Assistant

**Challenge:** Support a podcast or interview setup

**Possible features:**
- Auto-switch to active speaker
- Detect hand gestures for effects
- Monitor framing and suggest adjustments
- Generate show notes from detected topics

**Key decisions:** Active control vs. suggestions?

---

## SLIDE 10: Option 5 - Venue Monitoring

**Challenge:** Intelligent security or crowd monitoring

**Possible features:**
- Zone monitoring for restricted areas
- Crowd density estimation
- Unusual behavior detection
- Multi-camera coverage coordination

**Key decisions:** Privacy considerations?

---

## SLIDE 11: Option 6 - Multimodal Conference Room

**Challenge:** Combine audio + video for meeting automation

**Possible features:**
- Speech-to-text with Whisper
- Intent extraction ("Start the meeting")
- Voice + gesture commands
- Active speaker tracking
- Meeting summary generation

**Key decisions:** How to handle conflicting signals?

---

## SLIDE 12: Design Process

# Phase 1: Define

*What problem are you solving?*

---

## SLIDE 13: Define Your Problem

**Answer these questions:**

1. Who is the user?
2. What's their current pain point?
3. What does "done" look like for them?
4. What would make them say "This is exactly what I needed"?

**Write this down before touching code.**

---

## SLIDE 14: Define Your Scope

**Be realistic about:**

| Factor | Consider |
|--------|----------|
| **Time** | How much can you build? |
| **Complexity** | Start simple, add features |
| **Hardware** | What do you have access to? |
| **Testing** | How will you validate? |

**A working simple system beats a broken complex one.**

---

## SLIDE 15: Design Process

# Phase 2: Architecture

*How will the pieces fit together?*

---

## SLIDE 16: Map to the Pipeline

**Use the 5-stage framework:**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   INPUTS    │ →  │ PERCEPTION  │ →  │  REASONING  │
└─────────────┘    └─────────────┘    └─────────────┘
     What?              How?              Why?

┌─────────────┐    ┌─────────────┐
│  DECISION   │ →  │   OUTPUT    │
└─────────────┘    └─────────────┘
    Should we?         Do it!
```

**Document each stage for your project.**

---

## SLIDE 17: Input Planning

**What video/audio sources do you need?**

| Source | Considerations |
|--------|----------------|
| Webcam | Easy to test, limited quality |
| IP Camera | Better quality, network setup |
| NDI | Professional, requires setup |
| Screen capture | Good for demos |

**Start with what you have. Upgrade later.**

---

## SLIDE 18: Perception Planning

**What do you need to detect?**

| Detection Type | Best Tool |
|----------------|-----------|
| Any described object | Moondream /detect |
| Human body/pose | MediaPipe |
| Hands/gestures | MediaPipe |
| Text/OCR | Moondream /query |
| Scene description | Moondream /caption |

**Choose the right tool for each task.**

---

## SLIDE 19: Reasoning Planning

**What questions does your system need to answer?**

Examples:
- "Is someone at the podium?"
- "What gesture is being shown?"
- "What's the current score?"
- "Is the framing correct?"

**Specific questions = better answers.**

---

## SLIDE 20: Decision Planning

**What guardrails do you need?**

| Guardrail | Purpose |
|-----------|---------|
| Confidence threshold | Avoid false positives |
| Cooldown period | Prevent rapid-fire triggers |
| Debouncing | Require sustained detection |
| State smoothing | Avoid flicker |

**Most problems come from missing guardrails.**

---

## SLIDE 21: Output Planning

**What actions will your system take?**

| Action Type | Implementation |
|-------------|----------------|
| Scene switch | OBS WebSocket |
| PTZ movement | HTTP API |
| Graphics update | Browser source |
| Alert/notification | Webhook |
| Logging | File/database |

**Map every trigger to a specific output.**

---

## SLIDE 22: Design Process

# Phase 3: Build

*Incremental development*

---

## SLIDE 23: Build Strategy

**Start with the smallest working version:**

Week 1: Core detection working
Week 2: Add first automation
Week 3: Add guardrails
Week 4: Polish and document

**Get something working fast. Improve from there.**

---

## SLIDE 24: Use the Harness

**Leverage what you learned in Module 6:**

- Use input abstraction
- Use model abstraction
- Use output abstraction
- Configuration over code
- Proper error handling

**Don't rebuild infrastructure.**

---

## SLIDE 25: Use Agentic Coding

**Let Cursor help with:**

- Boilerplate code
- Integration patterns
- Error handling
- Documentation

**Your job: Define what to build and verify it works.**

---

## SLIDE 26: Testing Strategy

**Test each stage independently:**

```
1. Input working? → Can I see frames?
2. Perception working? → Are objects detected?
3. Reasoning working? → Are questions answered?
4. Decisions working? → Do guardrails trigger correctly?
5. Output working? → Do actions happen?
```

**Isolate problems before they compound.**

---

## SLIDE 27: Design Process

# Phase 4: Document

*Explain your decisions*

---

## SLIDE 28: Documentation Requirements

**Your capstone should include:**

1. **Problem statement** - What you're solving
2. **Architecture diagram** - How pieces connect
3. **Configuration** - How to set it up
4. **Usage guide** - How to run it
5. **Design decisions** - Why you made the choices you did

---

## SLIDE 29: Design Decisions Document

**For each major decision, explain:**

| Decision | Explanation |
|----------|-------------|
| **What** | The choice you made |
| **Why** | Reasoning behind it |
| **Alternatives** | What else you considered |
| **Tradeoffs** | What you gave up |

**This is as important as the code.**

---

## SLIDE 30: Presentation Format

**If presenting your capstone:**

1. **Problem** (1 min) - What challenge did you address?
2. **Demo** (3-5 min) - Show it working
3. **Architecture** (2 min) - How it's built
4. **Decisions** (2 min) - Key choices explained
5. **Learnings** (1 min) - What surprised you?

**Show, don't just tell.**

---

## SLIDE 31: Advanced Option - Multimodal

**For those wanting a challenge:**

Combine audio + video:

```
AUDIO PATH                  VIDEO PATH
────────────                ────────────
Whisper STT    ──┐     ┌──  Moondream
Intent Extract ──┼──→──┼──  Detection
                 │     │
              ┌──┴─────┴──┐
              │   FUSION   │
              │  Decision  │
              └────────────┘
```

**Example:** "Zoom in on the speaker" (voice) + person detection (vision)

---

## SLIDE 32: Multimodal Architecture

**Key considerations:**

| Challenge | Solution |
|-----------|----------|
| Timing mismatch | Buffer and align |
| Conflicting signals | Priority rules |
| Latency differences | Async processing |
| Complexity | Start simple |

**Only add audio if video-only isn't enough.**

---

## SLIDE 33: Getting Help

**When you're stuck:**

1. **Re-read modules** - The answer is often there
2. **Use Cursor** - Describe your problem
3. **GitHub issues** - Search for similar problems
4. **Community** - Ask in discussions

**Struggling is part of learning. Don't give up.**

---

## SLIDE 34: Common Mistakes

| Mistake | Better Approach |
|---------|-----------------|
| Starting too big | Start with MVP |
| Skipping guardrails | Add them early |
| Hardcoding values | Use configuration |
| No error handling | Plan for failures |
| No documentation | Document as you build |

---

## SLIDE 35: Success Criteria

**Your capstone succeeds if:**

✅ It solves a real problem
✅ It works reliably in demo conditions
✅ Someone else could understand and modify it
✅ You can explain every design decision
✅ You learned something building it

**Perfection isn't required. Understanding is.**

---

## SLIDE 36: Beyond the Course

**This is a beginning, not an end.**

Where to go next:
- Deploy in a real environment
- Add features based on real feedback
- Contribute to the harness
- Share your project
- Build the next one

**The ProAV industry needs more people who can build these systems.**

---

## SLIDE 37: The Movement

**Remember the bigger picture:**

- Open ecosystems over closed stacks
- Real outcomes over AI slogans
- Human agency over black-box automation

**You're now part of building the future of ProAV.**

---

## SLIDE 38: Final Checklist

Before submitting/presenting:

- [ ] Problem statement written
- [ ] Core feature working
- [ ] At least one automation trigger
- [ ] Guardrails implemented
- [ ] Architecture documented
- [ ] Design decisions explained
- [ ] Demo tested

---

## SLIDE 39: Course Complete

# Congratulations!

You've completed **Visual Reasoning AI for Broadcast & ProAV**

You now have:
- ✅ Understanding of VLMs and visual reasoning
- ✅ Hands-on experience with Moondream
- ✅ Production integration skills (OBS, PTZ)
- ✅ Harness architecture knowledge
- ✅ Agentic coding workflow
- ✅ Your own capstone project

---

## SLIDE 40: What's Next

**Continue your journey:**

- **Book**: Full technical depth in "Visual Reasoning AI for Broadcast and ProAV"
- **GitHub**: Visual Reasoning Playground examples
- **Community**: Join discussions, share projects
- **Build**: Apply this to real productions

**Audio and video are the new inputs for AI. You know how to use them.**

---

## SLIDE 41: Resources

**Final Links:**

- Visual Reasoning Playground: `github.com/StreamGeeks/visual-reasoning-playground`
- Visual Reasoning Harness: `github.com/ptzoptics/visual-reasoning-harness`
- Book: Available on Amazon (search "Visual Reasoning AI ProAV")
- Moondream: `console.moondream.ai`

**Thank you for taking this course.**

---

*End of Module 7 - End of Course*
