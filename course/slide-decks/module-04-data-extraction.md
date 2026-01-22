# Module 4: Visual Data Extraction

---

## SLIDE 1: Title

**Module 4**
# Visual Data Extraction

Visual Reasoning AI for Broadcast & ProAV

*Your AI learns to read.*

---

## SLIDE 2: Learning Objectives

**By the end of this module, you will be able to:**

1. Extract structured data from video feeds using visual reasoning
2. Understand why VLMs outperform traditional OCR for real-world extraction
3. Set up a virtual webcam test environment for reproducible demos
4. Build a live scoreboard extraction system
5. Apply extraction patterns to license plates, labels, and signage

---

## SLIDE 3: The Big Idea

**Reading visual information automatically.**

| What We've Done | What's New |
|-----------------|------------|
| Describe scenes | **Read specific data** |
| Detect objects | **Extract text + context** |
| Trigger actions | **Parse into structured output** |

**The goal:** Video frame → Structured JSON

---

## SLIDE 4: Why Not Just OCR?

**Traditional OCR limitations:**

- Struggles with perspective/angle
- No context understanding
- Confused by graphics, logos, backgrounds
- Can't handle varying layouts
- Returns raw text, not structured data

**VLMs understand WHAT they're reading, not just the characters.**

---

## SLIDE 5: OCR vs Visual Reasoning

**Scoreboard Example:**

| OCR Output | VLM Output |
|------------|------------|
| `TIGERS 24 LIONS 17 Q3 5:42` | `{"home_team": "TIGERS", "home_score": 24, "away_team": "LIONS", "away_score": 17, "quarter": 3, "time": "5:42"}` |

**OCR gives text. VLMs give structure.**

---

## SLIDE 6: Real-World Extraction Use Cases

**Where this applies:**

| Use Case | What to Extract |
|----------|-----------------|
| **Sports** | Scores, time, team names, stats |
| **Parking/Security** | License plate numbers |
| **Retail** | Product names, prices, barcodes |
| **Broadcast** | Lower thirds, tickers, graphics |
| **Manufacturing** | Serial numbers, labels, gauges |
| **Multi-cam** | Color profiles for matching |

**Same pattern. Different prompts.**

---

## SLIDE 7: The Extraction Pattern

**Universal workflow:**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   CAPTURE   │ → │   EXTRACT   │ → │    USE      │
│  video frame│    │  ask VLM    │    │  JSON data  │
│             │    │  for data   │    │  in system  │
└─────────────┘    └─────────────┘    └─────────────┘
```

**The VLM does the hard work of parsing.**

---

## SLIDE 8: Structured Prompts

**Getting clean JSON output:**

```
Look at this scoreboard image and extract:
- Home team name
- Home score
- Away team name  
- Away score
- Current quarter or period
- Time remaining

Return as JSON only, no explanation.
```

**Specific prompts = Specific outputs**

---

## SLIDE 9: Handling Variability

**Real scoreboards vary:**

- Different layouts and designs
- Various fonts and colors
- Sponsor logos and graphics
- Partial occlusion
- Camera angle changes

**VLMs handle this because they UNDERSTAND the content.**

---

## SLIDE 10: Temporal Consistency

**Problem:** Extraction errors cause flickering data

**Solutions:**

| Technique | How It Works |
|-----------|--------------|
| **Validation** | Check if values are reasonable |
| **Smoothing** | Only update if value changes significantly |
| **Voting** | Require N consistent readings |
| **Caching** | Keep last known good value |

**Same guardrail mindset from Module 3.**

---

## SLIDE 11: Test Environment Setup

**The Virtual Webcam Trick:**

```
┌─────────────────┐
│  Video File     │  (scoreboard footage)
│  (MP4, etc.)    │
└────────┬────────┘
         ↓
┌─────────────────┐
│  OBS Studio     │  (plays video)
│  Virtual Camera │  (outputs as webcam)
└────────┬────────┘
         ↓
┌─────────────────┐
│  Your App       │  (captures "webcam")
│  Extracts Data  │
└─────────────────┘
```

**Test with recorded footage. Deploy on live feeds.**

---

## SLIDE 12: Setting Up Virtual Camera

**Steps:**

1. Download scoreboard video: [ptzoptics.imagerelay.com/share/scoreboard](https://ptzoptics.imagerelay.com/share/scoreboard)
2. Open OBS Studio
3. Add Media Source → Select the downloaded video
4. Click "Start Virtual Camera"
5. Your app now sees it as a webcam

**Reproducible testing without needing live games.**

---

## SLIDE 13: Hands-On Demo

# Code Deep Dive

*Building a scoreboard extraction system*

---

## SLIDE 14: Demo - Project Overview

**What We'll Build:**

1. **Capture** scoreboard video via webcam/virtual cam
2. **Extract** scores, teams, time using Moondream
3. **Display** live-updating scoreboard graphic
4. **Output** JSON for integration with other systems

---

## SLIDE 15: Demo - The UI

**Interface layout:**

```
┌──────────────────────────────────────────────────┐
│ 🧠 VISUAL REASONING        [Scoreboard Extractor]│
│ ┌─────────────────┐  ┌─────────────────────────┐ │
│ │ Extraction Log  │  │                         │ │
│ │ ...             │  │   Video Feed            │ │
│ │ ...             │  │   (scoreboard source)   │ │
│ └─────────────────┘  └─────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐  │
│ │  TIGERS        24  │  17        LIONS       │  │
│ │            Q3 - 5:42                        │  │
│ └─────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────┐  │
│ │  JSON Output: { "home_team": "TIGERS"... }  │  │
│ └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## SLIDE 16: Demo - Extraction Prompt

**The prompt that powers extraction:**

```javascript
const prompt = `
Analyze this scoreboard image and extract the data.
Return ONLY valid JSON with these fields:
{
  "home_team": "team name",
  "home_score": number,
  "away_team": "team name", 
  "away_score": number,
  "period": "quarter/period number or name",
  "time_remaining": "MM:SS format"
}
If you cannot read a field, use null.
`;
```

---

## SLIDE 17: Demo - Parsing the Response

**Handling VLM output:**

```javascript
async function extractScoreboard() {
    const result = await client.askVideo(video, prompt);
    
    try {
        // Parse JSON from response
        const data = JSON.parse(result.answer);
        
        // Validate the data
        if (isValidScore(data)) {
            updateDisplay(data);
            updateJSON(data);
        }
    } catch (e) {
        console.log('Parse error, retrying...');
    }
}
```

---

## SLIDE 18: Demo - Validation

**Checking extracted data:**

```javascript
function isValidScore(data) {
    // Scores should be numbers
    if (typeof data.home_score !== 'number') return false;
    if (typeof data.away_score !== 'number') return false;
    
    // Scores should be reasonable
    if (data.home_score < 0 || data.home_score > 200) return false;
    if (data.away_score < 0 || data.away_score > 200) return false;
    
    // Team names should exist
    if (!data.home_team || !data.away_team) return false;
    
    return true;
}
```

---

## SLIDE 19: Demo - Live Display

**Rendering the scoreboard:**

```javascript
function updateDisplay(data) {
    document.getElementById('homeTeam').textContent = data.home_team;
    document.getElementById('homeScore').textContent = data.home_score;
    document.getElementById('awayTeam').textContent = data.away_team;
    document.getElementById('awayScore').textContent = data.away_score;
    document.getElementById('period').textContent = data.period;
    document.getElementById('time').textContent = data.time_remaining;
}
```

*[Live demo: watching scores update in real-time]*

---

## SLIDE 20: Demo - Running the Extraction

**Testing the system:**

1. Start OBS Virtual Camera with scoreboard video
2. Open extraction tool, select virtual camera
3. Click "Start Extraction"
4. Watch data populate in real-time
5. Observe JSON output updating

*[Live demo: full extraction workflow]*

---

## SLIDE 21: Beyond Scoreboards

**Adapting the pattern:**

| Source | Prompt Modification |
|--------|---------------------|
| **License Plate** | "Extract the license plate number" |
| **Price Tag** | "Extract product name and price" |
| **Name Badge** | "Extract the person's name and company" |
| **Gauge/Meter** | "Extract the current reading" |
| **Color Profile** | "Extract RGB values of the color checker" |

**Same code. Different prompts.**

---

## SLIDE 22: License Plate Example

**Prompt adaptation:**

```javascript
const prompt = `
Look at this image and find any license plates.
Return ONLY valid JSON:
{
  "plate_number": "the plate text",
  "state": "state name if visible",
  "confidence": "high/medium/low"
}
If no plate visible, return {"plate_number": null}
`;
```

**Parking systems, security, logistics.**

---

## SLIDE 23: Integration Options

**What to do with extracted data:**

| Integration | Use Case |
|-------------|----------|
| **OBS Browser Source** | Live graphics overlay |
| **WebSocket** | Send to production switcher |
| **REST API** | Feed to graphics system |
| **File Output** | Log for later analysis |
| **Database** | Store historical data |

**The JSON output is your integration point.**

---

## SLIDE 24: Key Takeaways

**What You Learned Today:**

1. **VLMs > OCR** — Context-aware extraction handles real-world variability
2. **Structured prompts** — Ask for JSON, get JSON
3. **Virtual webcam** — Test with recorded footage
4. **Validation matters** — Check data before using it
5. **Universal pattern** — Same code works for any extraction task

---

## SLIDE 25: The Extraction Mindset

**Before building, ask:**

1. What specific data do I need?
2. What format should it be in?
3. How do I validate it's correct?
4. What happens when extraction fails?
5. How often do I need to extract?

*Design the prompt. Build the validation. Handle the errors.*

---

## SLIDE 26: Module 4 Complete

# Congratulations!

You've completed **Module 4: Visual Data Extraction**

You now have:
- ✅ Scoreboard extraction system
- ✅ Structured JSON output from video
- ✅ Validation and error handling patterns
- ✅ Virtual webcam test environment

---

## SLIDE 27: Coming Up Next

**Module 5: AI-Assisted Framing & Color Matching**

- Reference image comparison
- Camera framing suggestions
- Color matching across multiple cameras
- Human-in-the-loop AI workflows

*Your AI becomes a camera assistant.*

---

## SLIDE 28: Resources

**Links for This Module:**

- Scoreboard Extractor: `code-examples/04-scoreboard-extractor/`
- **Scoreboard Video Download:** [ptzoptics.imagerelay.com/share/scoreboard](https://ptzoptics.imagerelay.com/share/scoreboard)
- OBS Virtual Camera: Built into OBS 26+
- Book Chapter: 7-8 (Smart Counter, extraction patterns)

**Practice:** Try extracting data from a different source (price tag, name badge, etc.)

---

*End of Module 4*
