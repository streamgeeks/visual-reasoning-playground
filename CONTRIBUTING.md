# Contributing to Visual Reasoning Playground

Thanks for your interest in contributing! This project provides AI-powered visual reasoning tools for broadcast and ProAV professionals.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/streamgeeks/visual-reasoning-playground.git
cd visual-reasoning-playground

# Start the local server
python server.py

# Open in browser
# http://localhost:8000
```

## Project Structure

```
visual-reasoning-playground/
├── index.html                    # Main landing page
├── server.py                     # Local development server (CORS enabled)
├── README.md                     # Project documentation
│
├── shared/                       # Shared utilities (used by all tools)
│   ├── moondream-client.js       # Unified Moondream API client
│   ├── video-source-adapter.js   # Camera/video source switching
│   ├── api-key-manager.js        # API key storage & validation
│   ├── styles.css                # Consistent dark theme UI
│   ├── playground-header.js      # Common header component
│   ├── ux-utils.js               # UX helper functions
│   ├── preferences-manager.js    # User preferences storage
│   └── reasoning-console.js      # Debug console utilities
│
├── assets/                       # Sample videos & reference images
│   ├── sample-videos/            # Demo videos for playground mode
│   └── color-profiles/           # Reference images for color matching
│
├── 01-scene-describer/           # Tool 1: Scene descriptions
├── 02-detection-boxes/           # Tool 2: Bounding box visualization
├── 03-gesture-obs/               # Tool 3: Gesture-based OBS control
├── 04-scoreboard-extractor/      # Tool 4: Score extraction (VLM)
├── 04b-scoreboard-ocr/           # Tool 4.5: Score extraction (OCR)
├── 05-smart-counter/             # Tool 5: Object counting
├── 06-scene-analyzer/            # Tool 6: Visual Q&A
├── 07-zone-monitor/              # Tool 7: Zone-based alerts
├── 08-framing-assistant/         # Tool 8: PTZ framing suggestions
├── 09-ptz-color-tuner/           # Tool 9: PTZ color control
├── 10-color-matcher/             # Tool 10: Color matching
├── 11-multimodal-studio/         # Tool 11: Full studio automation
├── 12-multimodal-fusion/         # Tool 12: Audio+video fusion
├── 13-smart-photographer/        # Tool 13: Auto-capture photos
├── 14-tracking-comparison/       # Tool 14: MediaPipe vs Moondream
├── 15-voice-triggers/            # Tool 15: Voice command triggers
│
├── PTZOptics-Moondream-Tracker/  # Featured: PTZ auto-tracking
├── obs-visual-reasoning/         # OBS Browser Dock plugin
└── 00-visual-reasoning-harness/  # Harness pattern documentation
```

## Adding a New Tool

### 1. Create the tool directory

```bash
mkdir XX-your-tool-name
```

### 2. Use the standard structure

Each tool should have:
- `index.html` - Main UI
- `app.js` - Application logic
- `README.md` - Tool-specific documentation

### 3. Use shared utilities

```html
<!-- In your index.html -->
<link rel="stylesheet" href="../shared/styles.css">
<script src="../shared/moondream-client.js"></script>
<script src="../shared/video-source-adapter.js"></script>
<script src="../shared/api-key-manager.js"></script>
<script src="../shared/playground-header.js"></script>
```

### 4. Follow the Video -> AI -> Action pattern

```javascript
// Initialize Moondream client
const moondream = new MoondreamClient();

// Get video frame
const frame = await videoAdapter.captureFrame();

// Send to AI
const result = await moondream.detect(frame, 'person');

// Take action based on result
if (result.objects.length > 0) {
    // Do something
}
```

## Code Style

- Use vanilla JavaScript (no frameworks required)
- Follow existing patterns in `shared/` utilities
- Use the dark theme from `shared/styles.css`
- Include sample video support via `video-source-adapter.js`

## Testing Your Changes

1. Start the local server: `python server.py`
2. Test with sample videos (no camera needed)
3. Test with live camera if available
4. Test with different API rate settings

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Questions?

- [StreamGeeks Discord](https://discord.gg/streamgeeks) - Community support
- [GitHub Issues](https://github.com/streamgeeks/visual-reasoning-playground/issues) - Bug reports & feature requests

## License

MIT License - Your contributions will be under the same license.
