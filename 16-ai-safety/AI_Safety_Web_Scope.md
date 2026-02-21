# AI Safety Monitor — Web Implementation Scope

## Overview

A web-based, open-source reference implementation of an AI-powered safety monitoring system. Uses a webcam or uploaded images to analyze environments for safety hazards using the Moondream Vision-Language Model (VLM).

**Target Stack:** HTML, JavaScript (vanilla or React), Moondream API

---

## Core Features

### 1. Live Camera Monitoring

- Access user's webcam via `navigator.mediaDevices.getUserMedia()`
- Capture frames at configurable intervals (1-30 frames per minute)
- Display live video preview with overlay indicators
- Pause/resume monitoring

### 2. Image Upload Mode

- Drag-and-drop or file picker for static images
- Batch upload for analyzing multiple frames
- Useful for testing and demo purposes

### 3. Safety Analysis Engine

**API Integration:**

- Call Moondream VLM API: `https://api.moondream.ai/v1/chat`
- Send base64-encoded image with safety-specific prompt
- Parse structured JSON response

**Response Schema:**

```json
{
  "safetyRating": 5,
  "status": "all_clear",
  "primaryConcern": "No hazards detected",
  "recommendedAction": "Continue monitoring",
  "detectedHazards": []
}
```

### 4. Safety Ratings (1-5 Scale)

| Rating | Label       | Color  | Description                              |
| ------ | ----------- | ------ | ---------------------------------------- |
| 5      | All Clear   | Green  | No hazards detected                      |
| 4      | Observation | Lime   | Minor note, no action needed             |
| 3      | Caution     | Yellow | Potential concern worth monitoring       |
| 2      | Hazard      | Orange | Visible safety issue, review recommended |
| 1      | DANGER      | Red    | Immediate safety threat                  |

### 5. Environment Presets

Pre-configured prompts for different settings:

| Preset        | Focus Areas                                   |
| ------------- | --------------------------------------------- |
| Construction  | PPE compliance, fall hazards, equipment zones |
| Warehouse     | Forklifts, spills, stacking, fire exits       |
| School/Sports | Supervision, exits, crowd safety              |
| General       | All-purpose environment monitoring            |

Each preset injects domain-specific context into the VLM prompt to reduce false positives.

### 6. Alarm System

**States:**

- `clear` — Normal operation
- `warning` — One frame below threshold
- `alarming` — N consecutive frames below threshold
- `acknowledged` — User dismissed alarm

**Triggers:**

- Threshold rating (default: 1 = DANGER only)
- Consecutive frames required (default: 3)

**Outputs:**

- Visual overlay (flashing red border, modal)
- Audio alert (Web Audio API or audio element)
- Browser notification (Notification API)

### 7. Assessment History

- Log all assessments with timestamp, rating, thumbnail
- Filter by rating, preset, date range
- Export as JSON or CSV
- Click to view full-size image with details

### 8. Session Statistics

- Duration timer
- Frames analyzed count
- Alarms triggered count
- Average safety rating

---

## UI Components

### Main Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header: Logo, API Key Input, Settings Toggle            │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┬───────────────────────────┐ │
│ │                         │   Rating Card             │ │
│ │    Camera Preview       │   ┌───────────────────┐   │ │
│ │    (or uploaded image)  │   │ ○ All Clear (5)   │   │ │
│ │                         │   │ No hazards found  │   │ │
│ │   [Start] [Stop] [Snap] │   └───────────────────┘   │ │
│ │                         │                           │ │
│ │                         │   Current Preset          │ │
│ │                         │   [Construction ▼]        │ │
│ │                         │                           │ │
│ │                         │   Session Stats           │ │
│ │                         │   12:34 elapsed           │ │
│ │                         │   42 frames | 0 alarms    │ │
│ └─────────────────────────┴───────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ Assessment History (collapsible)                        │
│ ┌─────┬─────┬─────┬─────┬─────┬─────┐                  │
│ │ 🟢  │ 🟢  │ 🟡  │ 🟢  │ 🟠  │ ... │                  │
│ └─────┴─────┴─────┴─────┴─────┴─────┘                  │
└─────────────────────────────────────────────────────────┘
```

### Settings Panel

- **API Key:** Input field (stored in localStorage)
- **Frame Rate:** Dropdown (1, 2, 5, 10, 20, 30 FPM)
- **Preset Selection:** Dropdown with descriptions
- **Alarm Threshold:** Slider or dropdown (1-5)
- **Consecutive Frames:** Number input (1-10)
- **Audio Toggle:** Enable/disable alarm sound
- **Notifications Toggle:** Enable/disable browser notifications

### Alarm Overlay

Full-screen modal when alarming:

- Large red indicator
- Primary concern text
- Recommended action
- Thumbnail of triggering frame
- "Acknowledge" button

---

## Technical Details

### API Integration

```javascript
async function analyzeSafety(imageBase64, preset) {
  const response = await fetch("https://api.moondream.ai/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Moondream-Auth": apiKey,
    },
    body: JSON.stringify({
      image_url: `data:image/jpeg;base64,${imageBase64}`,
      prompt: preset.prompt,
    }),
  });

  const data = await response.json();
  return parseSafetyResponse(data.content);
}
```

### Prompt Design Principle

> Default to SAFE. Only flag real, visible hazards. An empty room is safe. A normal scene is safe.

The prompt explicitly instructs the VLM:

- Rating 5 (All Clear) is the DEFAULT for normal/empty scenes
- Only rate below 5 if a specific, visible hazard can be described
- Distinguish "observation" (4) from "real hazard" (1-2)

### Frame Capture Loop

```javascript
async function startMonitoring(fpm, preset) {
  const intervalMs = (60 / fpm) * 1000;

  while (monitoring) {
    const frame = captureFrame(videoElement);
    const assessment = await analyzeSafety(frame, preset);

    updateUI(assessment);
    checkAlarm(assessment);
    logAssessment(assessment);

    await sleep(intervalMs);
  }
}
```

### Data Persistence

Store in `localStorage`:

- API key (encrypted or plaintext)
- Assessment history (last 1000 entries)
- Settings preferences

---

## File Structure

```
ai-safety-web/
├── index.html          # Main page
├── styles.css          # All styling
├── app.js              # Main application logic
├── camera.js           # Webcam capture utilities
├── api.js              # Moondream API client
├── presets.js          # Safety presets and prompts
├── alarm.js            # Alarm state machine
├── storage.js          # LocalStorage helpers
├── utils.js            # Helper functions
└── README.md           # Documentation
```

---

## Accessibility

- Keyboard navigation for all controls
- ARIA labels for dynamic content
- High contrast mode option
- Reduced motion support for animations
- Screen reader announcements for rating changes

---

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

Requires: MediaDevices API, Notifications API, Web Audio API

---

## Demo Mode

For GitHub Pages demo without requiring API key:

- Use mock responses with realistic delays
- Cycle through sample scenarios
- Show expected UI behavior

---

## License

MIT License — Free for commercial and personal use.

---

## Reference

This web implementation mirrors the iOS native feature in Visual Reasoning AI. For the full Swift/SwiftUI implementation, see the parent repository.
