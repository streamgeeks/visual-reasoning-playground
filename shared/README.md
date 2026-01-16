# Shared Utilities

Common code used across all Visual Reasoning Playground tools.

## Files

| File | Purpose |
|------|---------|
| `moondream-client.js` | Unified Moondream API client |
| `styles.css` | Common styling for all tools |

## Usage

Include in your HTML:

```html
<link rel="stylesheet" href="../shared/styles.css">
<script src="../shared/moondream-client.js"></script>
```

Then use the client:

```javascript
const client = new MoondreamClient('your-api-key');

// Describe a scene
const { description } = await client.describeVideo(videoElement);

// Detect objects
const { objects } = await client.detectInVideo(videoElement, 'person');

// Ask questions
const { answer } = await client.askVideo(videoElement, 'How many people?');
```

---

## Get the Book

**[Visual Reasoning AI for Broadcast and ProAV](https://visualreasoning.ai/book)** by Paul Richards

**Resources:**
- [VisualReasoning.ai](https://visualreasoning.ai) - Book, online course, and free tools
- [Moondream](https://moondream.ai) - Vision AI powering these tools
- [PTZOptics](https://ptzoptics.com) - PTZ cameras with API control
- [StreamGeeks](https://streamgeeks.com) - Live streaming education

---

*Part of the [Visual Reasoning Playground](../README.md) by [Paul Richards](https://github.com/paulwrichards)*
