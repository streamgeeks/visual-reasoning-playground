# Module 5: AI-Assisted Framing & Color Matching

---

## SLIDE 1: Title

**Module 5**
# AI-Assisted Framing & Color Matching

Visual Reasoning AI for Broadcast & ProAV

*Your AI becomes a camera assistant.*

---

## SLIDE 2: Learning Objectives

**By the end of this module, you will be able to:**

1. Use reference images to guide AI feedback
2. Get structured framing suggestions from visual reasoning
3. Extract color values for multi-camera matching
4. Build human-in-the-loop AI workflows
5. Apply AI as an assistant, not a replacement

---

## SLIDE 3: The Big Idea

**AI as your second set of eyes.**

| Previous Modules | This Module |
|------------------|-------------|
| AI takes action | **AI gives advice** |
| Automated triggers | **Human makes final call** |
| Binary decisions | **Nuanced feedback** |

**Human-in-the-loop: AI suggests, you decide.**

---

## SLIDE 4: Why This Matters

**Real production challenges:**

- "Does this shot match our reference?"
- "Is the framing consistent across cameras?"
- "Are the colors balanced for multi-cam?"
- "What adjustments would improve this shot?"

**AI can analyze and suggest. You execute.**

---

## SLIDE 5: Reference-Based Workflows

**The pattern:**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  REFERENCE  │    │   CURRENT   │    │  FEEDBACK   │
│    IMAGE    │ +  │    FRAME    │ →  │   & ADVICE  │
│  (the goal) │    │ (what we have)   │  (how to fix)│
└─────────────┘    └─────────────┘    └─────────────┘
```

**Give AI context about what "good" looks like.**

---

## SLIDE 6: Framing Analysis

**What AI can evaluate:**

| Aspect | AI Feedback |
|--------|-------------|
| **Composition** | Subject centered? Rule of thirds? |
| **Headroom** | Too much? Too little? |
| **Look space** | Subject looking off-frame? |
| **Zoom level** | Tighter or wider than reference? |
| **Angle** | Higher/lower than reference? |

**Structured feedback, not vague opinions.**

---

## SLIDE 7: Framing Prompt Example

**Asking for specific feedback:**

```
Compare these two images:
1. Reference (the goal)
2. Current camera shot

Provide framing feedback as JSON:
{
  "headroom": "too much / good / too little",
  "subject_position": "left / center / right",
  "zoom_suggestion": "zoom in / good / zoom out",
  "notes": "specific adjustment advice"
}
```

---

## SLIDE 8: Color Matching Challenge

**Multi-camera problems:**

- Different cameras = different color science
- Lighting varies across positions
- White balance drift
- Inconsistent exposure

**Goal:** All cameras look like they're in the same room.

---

## SLIDE 9: AI for Color Analysis

**What AI can extract:**

| Property | Use Case |
|----------|----------|
| **Dominant colors** | Scene consistency check |
| **Skin tone values** | Match across cameras |
| **White balance** | Warm vs cool assessment |
| **Exposure** | Over/under relative to reference |
| **Contrast** | Flat vs punchy comparison |

---

## SLIDE 10: Color Extraction Prompt

**Getting usable values:**

```
Analyze the color characteristics of this image.
Return JSON with:
{
  "overall_tone": "warm / neutral / cool",
  "exposure": "underexposed / good / overexposed",
  "contrast": "low / medium / high",
  "skin_tones": "description if people visible",
  "dominant_colors": ["color1", "color2", "color3"],
  "white_balance_suggestion": "add warmth / good / add cool"
}
```

---

## SLIDE 11: Human-in-the-Loop

**Why AI suggests, not executes:**

| Automated (Modules 1-4) | Advisory (Module 5) |
|-------------------------|---------------------|
| Clear right/wrong | Subjective quality |
| Binary triggers | Nuanced adjustments |
| Speed critical | Accuracy critical |
| Low risk | High risk if wrong |

**Color and framing errors are visible. Be careful.**

---

## SLIDE 12: The Assistant Mindset

**Think of AI as a new camera operator:**

- Shows up eager to help
- Can spot obvious issues
- Needs guidance on your style
- Gets better with clear references
- Should be supervised, not trusted blindly

**Train it with references. Verify its suggestions.**

---

## SLIDE 13: Hands-On Demo

# Code Deep Dive

*Building an AI camera assistant*

---

## SLIDE 14: Demo - Project Overview

**What We'll Build:**

1. Upload or capture a reference image
2. Capture current camera frame
3. Get AI comparison and suggestions
4. Display structured feedback
5. Iterate until satisfied

---

## SLIDE 15: Demo - The UI

**Interface layout:**

```
┌──────────────────────────────────────────────────┐
│ 🧠 VISUAL REASONING        [Framing Assistant]   │
│ ┌───────────────┐  ┌───────────────┐             │
│ │   REFERENCE   │  │    CURRENT    │             │
│ │    (goal)     │  │    (live)     │             │
│ └───────────────┘  └───────────────┘             │
│ ┌─────────────────────────────────────────────┐  │
│ │  FEEDBACK                                   │  │
│ │  Headroom: Too much - tilt down slightly    │  │
│ │  Position: Subject slightly left of center  │  │
│ │  Zoom: Good match to reference              │  │
│ └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## SLIDE 16: Demo - Setting Reference

**Capturing the goal:**

1. Frame your "perfect" shot
2. Click "Set as Reference"
3. Reference is saved for comparison

**Or upload an existing reference image.**

---

## SLIDE 17: Demo - Comparison Query

**The comparison prompt:**

```javascript
const prompt = `
Compare these two images:
Image 1 is the REFERENCE (desired framing).
Image 2 is the CURRENT camera shot.

Analyze and return JSON:
{
  "framing_match": "poor / fair / good / excellent",
  "headroom": "too much / good / too little",
  "subject_position": "description",
  "zoom_difference": "tighter / matched / wider",
  "suggestions": ["specific", "actionable", "advice"]
}`;
```

---

## SLIDE 18: Demo - Displaying Feedback

**Turning JSON into guidance:**

```javascript
function displayFeedback(data) {
    let html = `<div class="match-score ${data.framing_match}">
        Match: ${data.framing_match.toUpperCase()}
    </div>`;
    
    html += `<p><strong>Headroom:</strong> ${data.headroom}</p>`;
    html += `<p><strong>Position:</strong> ${data.subject_position}</p>`;
    
    if (data.suggestions.length > 0) {
        html += '<ul>';
        data.suggestions.forEach(s => html += `<li>${s}</li>`);
        html += '</ul>';
    }
    
    feedbackEl.innerHTML = html;
}
```

---

## SLIDE 19: Demo - Color Analysis Mode

**Switching to color feedback:**

```javascript
const colorPrompt = `
Analyze the color characteristics of this camera image 
compared to the reference.

Return JSON:
{
  "color_match": "poor / fair / good / excellent",
  "temperature_difference": "current is warmer / matched / cooler",
  "exposure_difference": "current is darker / matched / brighter",
  "suggestions": ["specific color adjustments"]
}`;
```

---

## SLIDE 20: Demo - Iterative Workflow

**The feedback loop:**

1. Check current vs reference
2. Read AI suggestions
3. Adjust camera/settings
4. Check again
5. Repeat until "excellent"

*[Live demo: adjusting based on feedback]*

---

## SLIDE 21: Practical Applications

**Where to use this:**

| Scenario | How AI Helps |
|----------|--------------|
| **Pre-show setup** | Verify all cameras match reference |
| **New operator** | AI coaches framing basics |
| **Remote production** | Director reviews shots remotely |
| **Training** | Objective feedback for learning |
| **QC check** | Automated consistency validation |

---

## SLIDE 22: Limitations to Know

**Where AI struggles:**

- Artistic intent (AI doesn't know your style)
- Extreme lighting conditions
- Non-standard compositions
- Rapidly changing scenes
- Subtle color differences

**AI is a tool, not an expert. Your judgment matters.**

---

## SLIDE 23: Key Takeaways

**What You Learned Today:**

1. **Reference images** provide context for AI feedback
2. **Structured prompts** yield actionable suggestions
3. **Human-in-the-loop** means AI advises, you decide
4. **Framing and color** analysis help multi-cam consistency
5. **Iterate** using AI feedback to improve shots

---

## SLIDE 24: The Assistant Philosophy

**Remember:**

✅ AI spots issues you might miss
✅ Structured feedback is actionable
✅ References make AI smarter
✅ You make the final call

❌ Don't blindly trust AI suggestions
❌ Don't expect perfection
❌ Don't skip human verification

---

## SLIDE 25: Module 5 Complete

# Congratulations!

You've completed **Module 5: AI-Assisted Framing & Color Matching**

You now have:
- ✅ Reference-based comparison workflow
- ✅ Structured framing feedback
- ✅ Color analysis for multi-cam matching
- ✅ Human-in-the-loop AI patterns

---

## SLIDE 26: Coming Up Next

**Module 6: The Visual Reasoning Harness**

- Production-ready architecture
- Prompt versioning and management
- Logging and observability
- Model swapping strategies
- Building systems that scale

*From experiments to production.*

---

## SLIDE 27: Resources

**Links for This Module:**

- Framing Assistant: `code-examples/05-framing-assistant/`
- Color Analyzer: `code-examples/07-color-assistant/`
- Book Chapter: 9-10 (Scene Analysis patterns)

**Practice:** Set up a reference shot and iterate until AI says "excellent."

---

*End of Module 5*
