# Color Assistant

**Tool #5b** - Analyze scene colors and adjust PTZ camera settings

Part of the [Visual Reasoning Playground](https://github.com/StreamGeeks/visual-reasoning-playground)

## Overview

The Color Assistant uses Moondream AI to analyze your video feed's color characteristics and provides intelligent recommendations for PTZOptics camera color adjustments.

## Features

- **AI Color Analysis**: Analyzes overall tone, exposure, white balance, and dominant colors
- **JSON Output**: Structured analysis data for integration with other systems
- **Manual Controls**: Brightness, contrast, saturation, and sharpness sliders
- **White Balance Presets**: Auto, Indoor, Outdoor, One Push, Manual
- **Before/After Comparison**: Visual comparison of adjustments
- **Apply AI Settings**: One-click application of AI recommendations

## Requirements

1. **Moondream API Key** - Get one at [console.moondream.ai](https://console.moondream.ai)
2. **PTZOptics Camera** - Any model with HTTP API support
3. **Webcam or Video Source** - For displaying camera feed

## Usage

### 1. Connect to PTZ Camera

Enter your PTZOptics camera IP address and click "Test" to establish connection.

### 2. Analyze Colors

Click "Analyze Colors" to capture a snapshot and get AI analysis including:

| Field | Description |
|-------|-------------|
| `overall_tone` | warm, cool, or neutral |
| `exposure` | underexposed, good, or overexposed |
| `white_balance_suggestion` | auto, indoor, or outdoor |
| `dominant_color` | Main color in the scene |
| `brightness_adjustment` | Suggested change (-3 to +3) |
| `saturation_adjustment` | Suggested change (-3 to +3) |
| `recommendation` | Text explanation |

### 3. Apply Recommendations

Click "Apply AI Settings" to automatically adjust your camera based on the analysis.

### 4. Fine-Tune Manually

Use the sliders to make additional adjustments:
- **Brightness**: 0-14 (default 8)
- **Contrast**: 0-14 (default 8)
- **Saturation**: 0-14 (default 8)
- **Sharpness**: 0-15 (default 6)

## PTZOptics Color API

The app uses the PTZOptics parameter API:

| Setting | Command |
|---------|---------|
| Brightness | `post_image_value&bright&{value}` |
| Contrast | `post_image_value&contrast&{value}` |
| Saturation | `post_image_value&saturation&{value}` |
| Sharpness | `post_image_value&sharpness&{value}` |
| White Balance | `post_image_value&wbmode&{mode}` |

### White Balance Modes

| Mode | Value |
|------|-------|
| Auto | 0 |
| Indoor | 1 |
| Outdoor | 2 |
| One Push | 3 |
| Manual | 5 |

## Example JSON Output

```json
{
  "overall_tone": "warm",
  "exposure": "good",
  "white_balance_suggestion": "indoor",
  "dominant_color": "orange",
  "brightness_adjustment": 0,
  "saturation_adjustment": -1,
  "recommendation": "Scene has warm tungsten lighting. Indoor white balance recommended. Consider reducing saturation slightly."
}
```

## Integration Ideas

- **OBS Color Grading**: Use JSON output to match graphics to scene colors
- **Automated White Balance**: Run analysis periodically to maintain consistency
- **Multi-Camera Matching**: Compare analysis between cameras for color matching
- **Logging**: Store analysis history for post-production reference

## Related

- [Framing Assistant](../05-framing-assistant/) - PTZ auto-framing
- [Module 5 Slides](../../course/slide-decks/module-05-framing-color.md)
- [PTZOptics API Documentation](https://ptzoptics.com/api)

---

*From "Visual Reasoning AI for Broadcast and ProAV" by Paul Richards*
