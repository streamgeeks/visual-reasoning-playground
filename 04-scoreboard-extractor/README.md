# 04 - Scoreboard Extractor

**Module 4: Visual Data Extraction**

Extract live scores and game time from video feeds using visual reasoning.

## Features

- **Score Extraction**: Home score, away score, game time
- **Live Display**: Visual scoreboard with extracted data
- **JSON Output**: Structured data for integration
- **Auto-Extract**: Continuous extraction at configurable intervals
- **Validation**: Filters invalid/incomplete data

## What It Extracts

| Field | Description |
|-------|-------------|
| `home_score` | Home team score (number) |
| `away_score` | Away team score (number) |
| `time` | Game time remaining (string) |

## Quick Start

### Option 1: Live Camera
1. Point a camera at a scoreboard
2. Open `index.html` via local server
3. Enter Moondream API key
4. Click "Extract Once" or "Start Auto-Extract"

### Option 2: Virtual Camera (Recommended for Testing)
1. Download sample video: [ptzoptics.imagerelay.com/share/scoreboard](https://ptzoptics.imagerelay.com/share/scoreboard)
2. Open OBS Studio
3. Add Media Source → Select the video file
4. Set to loop
5. Click "Start Virtual Camera"
6. In the extractor, select "OBS Virtual Camera"
7. Start extraction!

## Output Format

```json
{
  "home_score": 24,
  "away_score": 17,
  "time": "5:42"
}
```

## OBS Lower Third Graphic

A ready-to-use lower third graphic is included! 

### Setup in OBS:
1. Add a **Browser Source**
2. Check **"Local file"**
3. Browse to `lower-third.html`
4. Set Width: **500**, Height: **150**
5. The graphic updates automatically when you extract scores!

### How it works:
- Extractor saves data to `localStorage`
- Lower third reads from `localStorage`
- Updates in real-time across browser tabs

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Extraction Interval | Time between auto-extractions | 3000ms |

## How It Works

1. **Capture**: Grabs current video frame
2. **Query**: Asks Moondream to extract score data as JSON
3. **Parse**: Extracts JSON from response
4. **Validate**: Checks data is reasonable
5. **Display**: Updates scoreboard and JSON output

## Extending

To extract additional fields, modify the prompt in `app.js`:

```javascript
const prompt = `Look at this scoreboard and extract:
{
  "home_score": <number>,
  "away_score": <number>,
  "time": "<string>",
  "quarter": <number>,
  "home_team": "<string>",
  "away_team": "<string>"
}`;
```

## Related

- Book Chapter: 7-8 (extraction patterns)
- Sample Video: [ptzoptics.imagerelay.com/share/scoreboard](https://ptzoptics.imagerelay.com/share/scoreboard)
