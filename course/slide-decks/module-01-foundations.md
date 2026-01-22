# Module 1: Foundations of Visual Reasoning AI

---

## SLIDE 1: Title

**Module 1**
# Foundations of Visual Reasoning AI

Visual Reasoning AI for Broadcast & ProAV

*Your cameras are about to get smarter.*

---

## SLIDE 2: Learning Objectives

**By the end of this module, you will be able to:**

1. Explain what visual reasoning is and why it matters for ProAV
2. Distinguish between traditional computer vision, LLMs, and VLMs
3. Understand the difference between local and cloud-based models
4. Set up your development environment with API access
5. Run your first visual reasoning query and receive structured output

---

## SLIDE 3: The Big Picture

**AI is becoming the eyes and ears of production systems.**

- Cameras → Visual data → AI understands → System acts
- Audio → Speech/sound data → AI interprets → System responds

**PTZOptics Philosophy:**
AI is an *operator assist* and *workflow accelerator*—not a replacement for human judgment.

---

## SLIDE 4: What Problem Are We Solving?

**The Old Way: Traditional Computer Vision**

- Want to track a basketball? Train a model on thousands of basketball images.
- Want to track a coffee mug? Train a *different* model.
- Want to track a pastor on stage? Another model.
- Every new object = weeks of work

**This doesn't scale.**

---

## SLIDE 5: The Breakthrough

**Vision Language Models (VLMs)**

- Already understand what things look like
- You describe what you want in plain English
- No training required for new objects

*"Track the person in the blue shirt"* — just works.

---

## SLIDE 6: Three Technologies to Know

| Technology | What It Does | Limitation |
|------------|--------------|------------|
| **Traditional CV** | Detects trained objects fast | Only sees what you trained it on |
| **LLM** | Understands and generates text | Can't see—it's "blindfolded" |
| **VLM** | Sees AND understands language | Our focus for this course |

**VLMs combine visual understanding with language capability.**

---

## SLIDE 7: The Mental Model

**Think of it this way:**

- **Traditional CV** = Specialist (knows basketballs, nothing else)
- **LLM** = Genius, but blindfolded (can't look at anything)
- **VLM** = Assistant who can see and think

For ProAV—where everything is visual—VLMs are the breakthrough.

---

## SLIDE 8: The 5-Stage Pipeline

**Every project in this course follows this structure:**

```
Media → Perception → Reasoning → Decision → Control
```

| Stage | What Happens |
|-------|--------------|
| **Media** | Video/audio inputs (RTSP, NDI, webcam) |
| **Perception** | Fast signals: boxes, pose, OCR |
| **Reasoning** | VLM interprets scene, outputs JSON |
| **Decision** | Guardrails, thresholds, cooldowns |
| **Control** | OBS, vMix, PTZ commands, logs |

*Same pipeline, every module. Learn it once, apply it everywhere.*

---

## SLIDE 9: Local vs Cloud Models

| | Cloud Models | Local Models |
|--|--------------|--------------|
| **Setup** | API key, instant | Install software, more complex |
| **Privacy** | Data leaves your network | Data stays on-premise |
| **Cost** | Pay per API call | Hardware cost, then free |
| **Latency** | Network dependent | Typically faster |
| **Use Case** | Testing, low-volume | Production, sensitive data |

**This course:** Start with cloud (Moondream API) for learning, discuss local deployment for production.

---

## SLIDE 10: What is an API Key?

**API = Application Programming Interface**

Think of it like a restaurant:
- The API is the menu (what you can order)
- The API key is your table reservation (proves you're allowed to order)
- The response is your meal (the data you get back)

**Your API key:**
- Identifies you to the service
- Tracks your usage
- Keep it secret—treat it like a password

---

## SLIDE 11: Meet Moondream

**Why Moondream?**

- Open-source Vision Language Model
- Lightweight and affordable
- 5,000 free API calls per day
- Can run locally for privacy-sensitive deployments
- Built for exactly our use cases

**Get your key:** console.moondream.ai

---

## SLIDE 12: Meet Cursor

**Your AI Coding Assistant**

- Agentic AI coding tool
- Helps you write, modify, and debug code
- No programming background required
- You describe what you want → Cursor helps build it

**The Visual Reasoning Harness** provides context so Cursor understands ProAV workflows.

---

## SLIDE 13: Reliability Over Magic

**PTZOptics Stance on AI:**

✅ Operator assist
✅ Workflow accelerator  
✅ Safety rails and guardrails
✅ Human override always available

❌ Not "full automation"
❌ Not replacing operators
❌ Not magic black boxes

**Reliable, predictable, safe.**

---

## SLIDE 14: Hands-On Demo

# Code Deep Dive

*Setting up your environment and running your first query*

---

## SLIDE 15: Demo - What We'll Build

**Goal:** Run a visual reasoning query on a single image

**Steps:**
1. Get your Moondream API key
2. Open VisualReasoning.ai
3. Point your camera at a scene
4. Ask the VLM to describe what it sees
5. Receive structured output

*Let's do it together.*

---

## SLIDE 16: Demo - API Key Setup

**Getting Your Moondream API Key**

1. Go to **console.moondream.ai**
2. Create a free account
3. Copy your API key
4. Keep it safe—you'll use this throughout the course

*[Live demo: walking through the console]*

---

## SLIDE 17: Demo - First Query

**Using VisualReasoning.ai**

1. Go to **VisualReasoning.ai**
2. Allow camera access
3. Click "Describe Scene"
4. Watch the AI describe what it sees

*[Live demo: running the query]*

---

## SLIDE 18: Demo - Understanding the Response

**What came back?**

- Natural language description
- Details about objects, colors, spatial relationships
- This is the VLM "reasoning" about what it sees

**Key insight:** No training. No setup. Just ask.

---

## SLIDE 19: Demo - Structured Output

**From description to JSON**

- Production systems need structured data, not paragraphs
- We'll learn to get responses like:

```json
{
  "object_detected": true,
  "object_type": "person",
  "confidence": 0.94,
  "position": "center-left"
}
```

*This is what enables automation.*

---

## SLIDE 20: Demo - The GitHub Repository

**Visual Reasoning Playground**

- All code for this course is on GitHub
- Fork it, modify it, make it yours
- Each module builds on this foundation

**Repo:** github.com/PTZOptics/visual-reasoning-playground

*[Live demo: touring the repository structure]*

---

## SLIDE 21: Key Takeaways

**What You Learned Today:**

1. **VLMs combine vision + language** — describe what you want, no training needed
2. **The 5-stage pipeline** — Media → Perception → Reasoning → Decision → Control
3. **Cloud vs local** — start with cloud for learning, local for production
4. **API keys** — your access credential, keep it secret
5. **Moondream + Cursor** — your tools for building visual reasoning systems

---

## SLIDE 22: Safety First

**Remember:**

- AI is an operator *assist*
- Always include human override
- Guardrails prevent false triggers
- Logging helps you debug
- Test before you deploy

**Reliable beats impressive.**

---

## SLIDE 23: Module 1 Complete

# Congratulations!

You've completed **Module 1: Foundations of Visual Reasoning AI**

You now have:
- ✅ Working development environment
- ✅ Moondream API access
- ✅ Your first visual reasoning query
- ✅ Understanding of the core concepts

---

## SLIDE 24: Coming Up Next

**Module 2: Visual Understanding & Object Tracking**

- Build your first tracking system
- Draw bounding boxes around any object
- Compare VLM flexibility vs traditional CV speed
- The fun part: **Search and Find** — make a PTZ camera hunt for objects

*Your cameras are about to start moving.*

---

## SLIDE 25: Resources

**Links for This Module:**

- Moondream Console: console.moondream.ai
- VisualReasoning.ai: visualreasoning.ai
- GitHub Repo: github.com/PTZOptics/visual-reasoning-playground
- Book Chapter: Chapter 1-6 (Foundations)

**Questions?** Drop them in the community forum.

---

*End of Module 1*
