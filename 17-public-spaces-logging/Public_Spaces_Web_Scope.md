# Public Spaces Data Logging — Web Implementation Scope

## Overview

A web-based, open-source reference implementation of an AI-powered event logger for public spaces. Uses computer vision (VLM) to classify activity in courtrooms, city council meetings, classrooms, and sports arenas, producing timestamped, exportable logs.

**Target Stack:** HTML, JavaScript (vanilla or React), Moondream API

---

## Core Features

### 1. Live Camera Monitoring

- Access user's webcam via `navigator.mediaDevices.getUserMedia()`
- Capture frames at configurable intervals (3s, 5s, 10s, 15s, 30s)
- Display live video preview with current event overlay
- Start/stop/pause session controls

### 2. Image Upload Mode

- Drag-and-drop or file picker for static images
- Batch upload for analyzing multiple frames
- Manual event tagging for testing

### 3. Space Type Selection

Four domain-specific environments, each with tailored event taxonomies:

| Space Type   | Focus                                       | Theme Color  |
| ------------ | ------------------------------------------- | ------------ |
| Courtroom    | Objections, witnesses, exhibits, rulings    | Navy/Gold    |
| City Council | Motions, votes, public comment              | Green/Bronze |
| Classroom    | Instruction, Q&A, presentations, group work | Blue/Blue    |
| Sports Arena | Plays, fouls, timeouts, scoring             | Red/Red      |

Each space type has its own:

- Event taxonomy (15-20 event types)
- VLM prompt optimized for that context
- Compliance guidelines
- PDF report theme

### 4. Event Classification

**API Integration:**

- Call Moondream VLM API: `https://api.moondream.ai/v1/chat`
- Send base64-encoded image with space-specific prompt
- Parse structured JSON response

**Response Schema:**

```json
{
  "eventType": "objection_sustained",
  "description": "Defense attorney's objection was sustained by the judge.",
  "confidence": 0.87,
  "speakerRole": "judge",
  "additionalContext": "Related to line of questioning about witness credibility"
}
```

### 5. Event Taxonomies

#### Courtroom Events

| Type                  | Label               | Significant |
| --------------------- | ------------------- | ----------- |
| `objection_sustained` | Objection Sustained | ✓           |
| `objection_overruled` | Objection Overruled | ✓           |
| `objection_raised`    | Objection Raised    | ✓           |
| `exhibit_introduced`  | Exhibit Introduced  | ✓           |
| `witness_sworn_in`    | Witness Sworn In    | ✓           |
| `recess_called`       | Recess Called       | ✓           |
| `sidebar`             | Sidebar             | ✓           |
| `verdict_delivered`   | Verdict Delivered   | ✓           |
| `ruling_delivered`    | Ruling Delivered    | ✓           |
| `attorney_speaking`   | Attorney Speaking   |             |
| `judge_speaking`      | Judge Speaking      |             |
| `witness_speaking`    | Witness Speaking    |             |

#### City Council Events

| Type                      | Label                   | Significant |
| ------------------------- | ----------------------- | ----------- |
| `motion_proposed`         | Motion Proposed         | ✓           |
| `motion_seconded`         | Motion Seconded         | ✓           |
| `vote_in_progress`        | Vote in Progress        | ✓           |
| `vote_passed`             | Vote Passed             | ✓           |
| `vote_failed`             | Vote Failed             | ✓           |
| `public_comment`          | Public Comment          | ✓           |
| `agenda_item`             | Agenda Item             | ✓           |
| `recess`                  | Recess                  | ✓           |
| `council_member_speaking` | Council Member Speaking |             |
| `mayor_speaking`          | Mayor/Chair Speaking    |             |
| `staff_presenting`        | Staff Presenting        |             |
| `citizen_speaking`        | Citizen Speaking        |             |

#### Classroom Events

| Type                   | Label                 | Significant |
| ---------------------- | --------------------- | ----------- |
| `lecture`              | Lecture/Instruction   |             |
| `question_asked`       | Question Asked        | ✓           |
| `question_answered`    | Question Answered     | ✓           |
| `student_presentation` | Student Presentation  | ✓           |
| `group_work`           | Group Work/Discussion | ✓           |
| `demonstration`        | Demonstration         | ✓           |
| `exam_quiz`            | Exam/Quiz             | ✓           |
| `break`                | Break                 | ✓           |
| `teacher_speaking`     | Teacher Speaking      |             |
| `student_speaking`     | Student Speaking      |             |
| `media_playing`        | Media/Video Playing   |             |

#### Sports Arena Events

| Type               | Label                     | Significant |
| ------------------ | ------------------------- | ----------- |
| `play_in_progress` | Play in Progress          |             |
| `score`            | Score/Goal                | ✓           |
| `foul`             | Foul/Penalty              | ✓           |
| `timeout`          | Timeout                   | ✓           |
| `substitution`     | Substitution              | ✓           |
| `injury`           | Injury Stoppage           | ✓           |
| `review`           | Official Review/Challenge | ✓           |
| `halftime`         | Halftime/Intermission     | ✓           |
| `period_start`     | Period Start              | ✓           |
| `period_end`       | Period End                | ✓           |
| `celebration`      | Celebration               |             |
| `crowd_reaction`   | Crowd Reaction            |             |

### 6. Session Management

**Session Object:**

```javascript
{
  id: "session_123",
  spaceType: "courtroom",
  label: "Smith v. Jones - Hearing",
  location: "County Courthouse, Room 302",
  date: "2026-02-21",
  startTime: 1739923200000,
  endTime: null,
  entries: [...],
  totalFramesAnalyzed: 127
}
```

**Controls:**

- Create new session with space type, label, location
- Auto-save entries as they're logged
- End session (sets endTime, finalizes record)
- Resume/continue previous session

### 7. Event Log Display

- Real-time scrollable log of events
- Color-coded by event type
- Show/hide non-significant events filter
- Click entry to see frame snapshot (if captured)
- Confidence indicator for each entry

**Log Entry Display:**

```
┌─────────────────────────────────────────────────────┐
│ 01:23:45  ⚖️ Objection Sustained        87% ████░ │
│           Defense's objection sustained. Judge     │
│           ruled question irrelevant.               │
│           [View Frame]                             │
└─────────────────────────────────────────────────────┘
```

### 8. Deduplication Logic

Prevent log spam from repeated similar events:

```javascript
function shouldLogEvent(eventType, spaceId, entries) {
  // Always log significant events
  if (isSignificant(eventType)) return true;

  // For non-significant: skip if same type logged within 30s
  const recent = entries.find(
    (e) => e.eventType === eventType && Date.now() - e.timestamp < 30000,
  );
  return !recent;
}
```

### 9. Session Statistics

- Duration timer (HH:MM:SS)
- Frames analyzed count
- Events by type breakdown
- Significant events count
- Average confidence score

### 10. Export Options

**JSON Export:**

```json
{
  "session": { ... },
  "entries": [ ... ],
  "eventCounts": { "objection_sustained": 3, ... },
  "exportedAt": "2026-02-21T16:30:00Z"
}
```

**CSV Export:**

```
timestamp,elapsed,eventType,description,confidence,speakerRole
2026-02-21T14:23:45Z,01:23:45,objection_sustained,"Defense's objection sustained",0.87,judge
```

**PDF Report (optional advanced feature):**

- Header with session metadata
- Summary statistics
- Timeline of significant events
- Event detail table
- Space-specific theming

### 11. Compliance Guidelines

Each space type includes legal/ethical guidelines:

**Courtroom:**

- Judge permission required
- No recording jurors/spectators
- AI logs are supplementary, not official record

**City Council:**

- Open Meetings Act compliance
- Post public notice of recording
- Make logs available per FOIA

**Classroom:**

- FERPA compliance for student recordings
- Written consent required
- Educational records protections

**Sports:**

- Venue policy verification
- Youth sports parental consent
- Broadcast rights awareness

---

## UI Components

### Main Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Header: Logo | Space Selector [Courtroom ▼] | API Key      │
├─────────────────────────────────────────────────────────────┤
│ Session Bar: [New Session] | Label: ______ | Location: ___ │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┬───────────────────────────────┐ │
│ │                         │   Current Event               │ │
│ │    Camera Preview       │   ┌───────────────────────┐   │ │
│ │    (or uploaded image)  │   │ ⚖️ Objection Raised   │   │ │
│ │                         │   │ 87% confidence        │   │ │
│ │   Event Overlay:        │   └───────────────────────┘   │ │
│   │ " attorney_speaking " │                               │ │
│ │                         │   Session Stats               │ │
│ │                         │   Duration: 01:23:45          │ │
│ │                         │   Frames: 127 | Events: 23    │ │
│ │                         │                               │ │
│ │                         │   [⚙️ Settings]               │ │
│ └─────────────────────────┴───────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Event Log                                    [☑ Significant]│
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 00:15:32  ✓ Objection Sustained      92% ████▓        ││
│ │ 00:12:08  ✓ Witness Sworn In         95% █████        ││
│ │ 00:08:44  🎤 Attorney Speaking       78% ███░░        ││
│ │ 00:05:21  ✓ Exhibit Introduced       88% ████░        ││
│ └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ [Start] [Stop] [Export ▼]    Interval: [5s ▼]              │
└─────────────────────────────────────────────────────────────┘
```

### Session Setup Modal

```
┌─────────────────────────────────────────┐
│ New Session                             │
├─────────────────────────────────────────┤
│ Space Type:                             │
│ [Courtroom] [Council] [Class] [Sports]  │
│                                         │
│ Session Label:                          │
│ [Smith v. Jones - Motion Hearing    ]   │
│                                         │
│ Location:                               │
│ [County Courthouse, Room 302        ]   │
│                                         │
│ Date: [2026-02-21]                      │
│                                         │
│ Analysis Interval: [5 seconds ▼]        │
│                                         │
│         [Cancel]  [Start Recording]     │
└─────────────────────────────────────────┘
```

### Compliance Modal

Show on first use per space type:

```
┌─────────────────────────────────────────┐
│ ⚠️ Courtroom Recording Compliance       │
├─────────────────────────────────────────┤
│ Camera use in courtrooms is governed    │
│ by state and local rules.               │
│                                         │
│ ☐ Obtain written permission from judge  │
│ ☐ Do not record jurors or spectators    │
│ ☐ AI logs are not official court record │
│ ☐ Stop recording if ordered by court    │
│                                         │
│ [ ] Don't show again                    │
│                                         │
│              [I Understand]             │
└─────────────────────────────────────────┘
```

### Settings Panel

- **API Key:** Input (localStorage)
- **Analysis Interval:** 3s, 5s, 10s, 15s, 30s
- **Capture Frames:** Toggle (saves image with event)
- **Auto-scroll Log:** Toggle
- **Show Non-significant:** Toggle
- **Dedup Window:** Seconds (default 30)

---

## Technical Details

### API Integration

```javascript
async function classifyEvent(imageBase64, spaceId) {
  const prompt = getPromptForSpace(spaceId);

  const response = await fetch("https://api.moondream.ai/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Moondream-Auth": apiKey,
    },
    body: JSON.stringify({
      image_url: `data:image/jpeg;base64,${imageBase64}`,
      prompt: prompt,
    }),
  });

  const data = await response.json();
  return parseEventResponse(data.content, spaceId);
}
```

### Prompt Design

Each space gets a tailored prompt:

```javascript
const COURTROOM_PROMPT = `Analyze this courtroom camera frame. 
Identify proceedings activity: objections, witnesses, exhibits, rulings, or who is speaking.

Classify into ONE event type:
- objection_sustained
- objection_overruled
- objection_raised
- exhibit_introduced
- witness_sworn_in
...

Respond ONLY with valid JSON, no markdown:
{"eventType":"<type>","description":"<one neutral sentence>","confidence":<0.0-1.0>,"speakerRole":"<role or null>","additionalContext":"<detail or null>"}`;
```

### Analysis Loop

```javascript
async function startSession(config) {
  const session = createSession(config);

  while (sessionActive) {
    const frame = captureFrame(videoElement);
    const event = await classifyEvent(frame, session.spaceType);

    if (shouldLogEvent(event.eventType, session.entries)) {
      const entry = buildEntry(event, session.startTime, frameCount);
      session.entries.push(entry);
      updateUI(entry);
      saveSession(session);
    }

    await sleep(config.intervalMs);
  }
}
```

### Data Persistence

**localStorage Schema:**

```javascript
localStorage.setItem('public_space_records', JSON.stringify([
  { id: 'session_1', spaceType: 'courtroom', entries: [...] },
  { id: 'session_2', spaceType: 'council', entries: [...] },
]));
```

---

## File Structure

```
public-spaces-web/
├── index.html              # Main page
├── styles.css              # All styling
├── app.js                  # Main application logic
├── camera.js               # Webcam capture utilities
├── api.js                  # Moondream API client
├── spaces.js               # Space type definitions & prompts
├── events.js               # Event taxonomies per space
├── compliance.js           # Legal guidelines per space
├── session.js              # Session management
├── export.js               # JSON/CSV/PDF export
├── storage.js              # LocalStorage helpers
└── README.md               # Documentation
```

---

## Key Design Principles

### 1. Domain-Specific Taxonomies

Generic "activity detected" is useless. Each space type has a curated taxonomy of meaningful events specific to that domain.

### 2. Significant vs. Routine Events

Not all events are equal. Mark "significant" events (objection sustained, vote passed, goal scored) distinctly from routine activity (attorney speaking, play in progress).

### 3. Deduplication Without Missing Events

Non-significant events are deduplicated within a time window (30s) to prevent log spam. Significant events are ALWAYS logged.

### 4. Compliance-First UX

Legal/ethical guidelines are shown before first recording in each space type. Users acknowledge understanding of recording restrictions.

### 5. Supplementary, Not Official

AI-generated logs are explicitly supplementary. They do NOT replace:

- Court reporter transcripts
- Official meeting minutes
- Educational records
- Official game statistics

---

## Accessibility

- Keyboard navigation throughout
- ARIA live regions for new events
- High contrast mode
- Reduced motion support
- Screen reader announcements for significant events

---

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

Requires: MediaDevices API, localStorage, Notification API (optional)

---

## Demo Mode

For GitHub Pages without API key:

- Mock VLM responses with realistic variety
- Cycle through sample event sequences per space type
- Show full UI flow with simulated latency

---

## License

MIT License — Free for commercial and personal use.

---

## Reference

This web implementation mirrors the iOS native feature in Visual Reasoning AI. For the full React Native implementation, see the parent repository.
