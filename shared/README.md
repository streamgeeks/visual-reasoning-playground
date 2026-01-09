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

*Part of the [Visual Reasoning Playground](../README.md)*
