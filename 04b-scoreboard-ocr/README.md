# Tool #4b: Scoreboard OCR (Local)

**Extract scores using local OCR - no API key required for text recognition.**

Part of the [Visual Reasoning Playground](../README.md) - companion code for the book *Visual Reasoning AI for Broadcast and ProAV* by Paul Richards.

---

## What It Does

Extract scores from physical scoreboards using Tesseract.js OCR running entirely in your browser. Compare this approach with the VLM-based [Tool #4: Scoreboard Extractor](../04-scoreboard-extractor/).

## Quick Start

> **Important:** This tool requires the full repository. Clone the complete playground first — individual folders won't work because shared libraries are needed.

```bash
git clone https://github.com/streamgeeks/visual-reasoning-playground.git
cd visual-reasoning-playground
python server.py
# Open http://localhost:8000/04b-scoreboard-ocr/
```

1. Point camera at a scoreboard (or use sample video)
2. Draw regions around the score areas
3. OCR extracts text from those regions
4. Scores update automatically

## VLM vs OCR Comparison

| Aspect | Tool #4 (VLM) | Tool #4b (OCR) |
|--------|---------------|----------------|
| **API Required** | Yes (Moondream) | No - runs locally |
| **Cost** | Per API call | Free |
| **Setup** | Just API key | Draw regions manually |
| **Accuracy** | High (understands context) | Depends on font/quality |
| **Speed** | Network latency | Very fast (local) |
| **Best For** | Varied scoreboards | Consistent, clear displays |

## Features

- Tesseract.js OCR (runs in browser)
- Draw custom regions for each score
- Real-time score extraction
- No API key needed for OCR
- Region persistence
- Score parsing and validation

## Use Cases

| Business Example | Personal Example |
|------------------|------------------|
| **Sports**: Extract scores for overlays | **Gaming**: Capture game scores |
| **Events**: Live score updates | **Fitness**: Read digital displays |
| **Broadcasting**: Automated graphics | **Education**: Quiz score tracking |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Home Region | Draw on video | Area containing home score |
| Away Region | Draw on video | Area containing away score |
| Update Rate | 1/sec | How often to run OCR |

## How It Works

1. User draws rectangular regions on the video feed
2. Each region is captured as an image
3. Tesseract.js processes the image for text
4. Extracted text is parsed for numeric scores
5. Scores are displayed and can be used for overlays

## Files

```
04b-scoreboard-ocr/
├── index.html      # UI with region drawing
├── app.js          # Main application logic
├── ocr-engine.js   # Tesseract.js wrapper
├── score-parser.js # Score extraction logic
└── README.md       # This file
```

## Related

- [Tool #4: Scoreboard Extractor (VLM)](../04-scoreboard-extractor/) - Compare with AI approach
- [Tool #1: Scene Describer](../01-scene-describer/)
- [Book: Visual Reasoning AI](https://visualreasoning.ai/book) - Covers both approaches

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
