# Tool #7: AI Color Correction Assistant

**Match your camera's style to a reference image.**

Part of the [Visual Reasoning Playground](../README.md) - companion code for the book *Visual Reasoning AI for Broadcast and ProAV* by Paul Richards.

---

## What It Does

Upload a reference image showing the style you want, capture your current camera output, and get AI-powered recommendations to match the look.

## Quick Start

```bash
cd 07-color-assistant
python -m http.server 8000
# Open http://localhost:8000
```

1. Enter your Moondream API key
2. Upload a reference image (the look you want)
3. Click "Capture Current Frame"
4. Click "Analyze & Compare"

## Use Cases

| Business Example | Personal Example |
|------------------|------------------|
| **Multi-cam**: Match all cameras to hero shot | **YouTube**: Match your favorite creator's style |
| **Production**: Maintain consistent look | **Webcam**: Improve video call appearance |
| **Events**: Match venue lighting style | **Streaming**: Create signature look |

## Features

- Side-by-side comparison
- Drag-and-drop reference upload
- AI-powered style analysis
- Specific adjustment recommendations
- Match score indicator
- Detailed analysis breakdown

## Output Recommendations

The AI analyzes and compares:
- Color temperature (warm/cool)
- Saturation level
- Contrast level
- Brightness/exposure
- Dominant colors
- Overall mood/aesthetic

## How It Works

1. AI analyzes the reference image's visual style
2. AI analyzes your current camera output
3. AI compares the two and generates specific recommendations
4. Recommendations are displayed with actionable adjustments

## Files

```
07-color-assistant/
├── index.html    # Comparison UI
├── app.js        # Analysis logic
└── README.md     # This file
```

## Tips

- Use high-quality reference images
- Ensure similar content in both images for best results
- Apply recommendations gradually and re-check
- Consider lighting conditions when making adjustments

## Related

- [Book Chapter 11: AI Color Correction](../../book/chapters/11-ai-color-correction.md)
- [Tool #1: Scene Describer](../01-scene-describer/)

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
