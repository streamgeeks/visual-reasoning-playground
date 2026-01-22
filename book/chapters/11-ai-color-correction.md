# Chapter 11: AI Color Correction Assistant

Everything we've built so far has been about detecting objects and triggering actions. Now we're going to use visual reasoning for something different: creative assistance.

The AI Color Correction Assistant looks at a reference image—the look you want—and compares it to your current camera output. Then it tells you, in plain English, what to adjust to get closer to that look.

This is visual reasoning as a creative partner, not just a detection engine.

## Pipeline Stages in This Project

Here's how the Color Assistant maps to our 5-stage pipeline:

- **Stage 1: Media Inputs** — Two images: reference (target look) and current camera output
- **Stage 2: Perception** — Color analysis, histogram comparison (optional for advanced implementations)
- **Stage 3: Reasoning (VLM)** — Heavy focus here: Moondream compares images and generates adjustment recommendations
- **Stage 4: Decision (Guardrails)** — Light in this project—recommendations are advisory, human makes final call
- **Stage 5: Control (Outputs)** — Plain English recommendations displayed to operator

**What's different from previous projects:** This is a human-in-the-loop workflow. The VLM provides analysis and recommendations (Stage 3), but the human applies the adjustments. Stage 5 is informational rather than automated. This pattern is important for creative and subjective tasks where AI assists but doesn't decide.

## The Color Matching Problem

Anyone who's worked with multiple cameras knows the pain of color matching. You've got three cameras on a shoot. They're the same model, same settings, pointed at similar subjects. But somehow they all look different. One is warmer. One has more contrast. The skin tones don't match.

Professional colorists spend hours tweaking settings to get cameras to match. It requires expertise, expensive scopes and monitors, and a lot of trial and error.

What if you could show the AI what you want and have it tell you how to get there?

## How It Works

The AI Color Correction Assistant uses a different Moondream capability: visual comparison and analysis.

**Option A: Reference Image**
Upload or capture a reference image—your hero camera, a screenshot from a video you admire, or a style guide from a client. The AI compares your current camera to that specific reference.

**Option B: Style Presets (No Reference Needed)**
Don't have a reference image? Choose from built-in style presets:

- **Cinematic** — Lifted blacks, teal/orange tones, filmic contrast
- **Corporate Clean** — Neutral whites, balanced exposure, professional clarity
- **Warm & Inviting** — Boosted warmth, soft contrast, flattering skin tones
- **High Contrast Modern** — Deep blacks, crisp highlights, punchy colors
- **Vintage Film** — Faded blacks, muted saturation, nostalgic warmth
- **Broadcast Standard** — Rec. 709 compliance, accurate colors, balanced levels

Moondream understands these visual styles. When you select "Cinematic," it knows what that look entails and can tell you how your current image differs from that aesthetic.

**The workflow:**

1. Capture your current camera output
2. Either upload a reference image OR select a style preset from the dropdown
3. AI analyzes and compares
4. Receive structured adjustment recommendations
5. Apply adjustments to your camera
6. Iterate until satisfied

It's not automatic color grading—you're still making the adjustments. But the AI serves as an expert advisor telling you what to change.

## What the AI Can See

Vision Language Models are surprisingly good at analyzing visual style. They can identify:

**Color temperature:** Is the image warm (orange/yellow) or cool (blue)? How do the two compare?

**Contrast:** Are the blacks deep or lifted? Are the highlights bright or muted? Is there a lot of difference between light and dark areas?

**Saturation:** Are colors vivid or desaturated? Are specific colors (reds, greens, blues) more or less saturated?

**Exposure:** Is the overall image bright or dark? Are there blown highlights or crushed shadows?

**White balance:** Do whites appear truly white, or tinted toward a color?

**Style characteristics:** Does the image have a "filmic" look? High contrast? Desaturated? Vintage? Modern?

## Structured Output for Clean UI

Here's where the pipeline concept pays off. Instead of getting a paragraph of text, we ask Moondream for **structured output**—specific values for each parameter that we can display in a clean interface.

**What we request from the VLM:**

```
For each parameter, provide:
- Current state (description of current image)
- Target state (description of reference/style)
- Direction (increase/decrease/maintain)
- Magnitude (slight/moderate/significant)
```

**The actual prompt:**

To get this structured data, we ask explicitly for JSON:

```
Analyze this image for video production color grading. 
Respond ONLY in JSON format with these exact fields:

{
  "overall_tone": "warm" or "cool" or "neutral",
  "exposure": "underexposed" or "good" or "overexposed",
  "white_balance_suggestion": "auto" or "indoor" or "outdoor",
  "dominant_color": "the main color in the scene",
  "brightness_adjustment": -3 to +3 (0 means no change),
  "saturation_adjustment": -3 to +3,
  "recommendation": "brief suggestion for improvement"
}
```

By showing the exact schema we want, the VLM mirrors that structure. The numeric adjustment fields (-3 to +3) give us values we can map directly to camera controls or display as visual indicators.

**What we get back:**

```json
{
  "overall_tone": "cool",
  "exposure": "good",
  "white_balance_suggestion": "indoor",
  "dominant_color": "blue",
  "brightness_adjustment": 1,
  "saturation_adjustment": -1,
  "recommendation": "Scene has cool office lighting. Add warmth and reduce saturation slightly for more natural skin tones."
}
```

**How this enables the UI:**

With structured data, we can build visual indicators for each parameter:

- Progress bars showing current vs. target
- Color-coded direction arrows (↑ increase, ↓ decrease, — maintain)
- Magnitude indicators (small, medium, large adjustment needed)
- Parameter cards that update in real-time as you make adjustments

This is the same structured output pattern from Chapter 9 (Scene Analyzer). By asking for specific, predictable data formats, we can build interfaces that present AI insights clearly—not just dump text on screen.

## Business Example: Multi-Camera Production

You're setting up a three-camera interview shoot. Camera A is your hero—you've spent time getting the look just right. Cameras B and C need to match.

**Traditional approach:**
- Set up each camera with identical settings (often doesn't work due to unit variation)
- Use scopes and monitors to compare
- Manually adjust each camera, switching back and forth to compare
- Spend 30-60 minutes tweaking until they're close enough

**With AI Color Correction Assistant:**

1. Capture a frame from Camera A (your reference)
2. Capture a frame from Camera B
3. Ask: "Compare these two images and tell me how to adjust the second to match the first"
4. Response: "The second image is slightly cooler in color temperature and has lower contrast. The reds appear less saturated. Try increasing color temperature by a small amount, boosting contrast, and adding some red saturation."
5. Make those adjustments on Camera B
6. Capture another frame and compare again
7. Response: "The images are now much closer. The second might still be slightly darker overall. A small exposure increase would help."
8. Final adjustment—Camera B matches Camera A
9. Repeat for Camera C

This doesn't replace expertise, but it accelerates the process and helps less experienced operators achieve professional results.

## Personal Example: Match Your Favorite YouTuber

Here's a fun one.

You've watched a YouTuber whose videos always look amazing. The colors pop. The skin tones are flattering. There's a cohesive style you'd love to replicate.

Screenshot one of their videos. That's your reference.

Point your webcam at yourself in similar lighting. That's your current output.

Ask the AI: "Compare my webcam image to this reference. What adjustments would help me achieve a similar look?"

The AI might say: "The reference has lifted blacks giving it a more filmic look. The skin tones are warmer, and there's more contrast. Your webcam image is more neutral with true blacks. Try lifting the shadows/blacks, warming the color temperature, and increasing contrast. The saturation in the reference is also slightly higher, particularly in the warm tones."

Now you know where to start. Adjust your webcam settings, your lighting, or apply a filter in OBS—and you're moving toward that look you admired.

## The Human-in-the-Loop Workflow

This tool is explicitly designed for human-in-the-loop operation. The AI suggests; you decide.

Why?

**Taste is subjective.** The AI can tell you how to match a reference, but matching might not be what you want. Maybe you want Camera B to be slightly cooler for variety. The AI informs; you choose.

**Camera controls vary.** Different cameras have different settings available. The AI doesn't know whether you have a "saturation" slider or if you need to adjust it through some other menu. You translate the suggestions to your specific equipment.

**Context matters.** The AI sees two images but doesn't know if you're shooting a wedding or a horror film. You bring the creative intent.

**Iteration is part of the process.** Color correction is rarely one-and-done. You adjust, evaluate, adjust again. The AI is a tool in that iterative workflow.

This is different from the detection tools where we often want full automation. Color correction is creative work—AI assists, humans decide.

## Connecting to Camera Controls

For cameras with remote control APIs—like PTZOptics—you can potentially close the loop more directly.

Imagine this workflow:

1. AI analyzes images and suggests "increase saturation by a moderate amount"
2. System translates that to a specific camera command
3. Camera adjusts automatically
4. New image captured and compared
5. Repeat until difference is below threshold

This is more advanced and requires careful calibration between AI descriptions and specific camera values. But it's possible. Ask Cursor:

*"How could I automatically adjust PTZOptics camera settings based on the AI's color correction suggestions?"*

For most users, manual adjustment based on AI suggestions is simpler and gives you more control.

## Beyond Matching: Style Transfer Suggestions

The AI isn't limited to matching. You can ask for creative suggestions:

*"What would make this image feel more cinematic?"*

*"How would I adjust this to look like a vintage film photograph?"*

*"What changes would give this a high-contrast, desaturated modern look?"*

The AI can suggest transformations, not just comparisons. You're using it as a creative advisor—someone to bounce ideas off of when you're not sure which direction to take.

## Integration Ideas

**Live comparison view:**
Side-by-side display of reference and current camera. When you make adjustments, see them in real time against the reference. Periodically run AI comparison to get fresh suggestions.

**Style library:**
Save reference images for different looks. "Corporate interview look," "Event coverage look," "Product shot look." Pull up the relevant reference when starting a new project.

**Preset generation:**
Once you've dialed in a look using AI guidance, save your camera settings as a preset. Build a library of AI-refined presets over time.

**Multi-camera dashboard:**
For multi-camera productions, show all cameras against the reference with AI comparison for each. Quickly identify which cameras need attention.

## Making It Your Own

Cursor prompts for color correction:

*"Build a simple interface that shows reference and current images side by side with a button to request AI comparison"*

*"How can I save successful color settings along with the reference image that inspired them?"*

*"I want to create a style library where I can save and categorize reference images"*

*"Can we build a workflow that captures reference and current from live video rather than uploaded images?"*

*"How would I display the AI suggestions in a more visual way—maybe highlighting areas of the image that need attention?"*

## What You've Learned

The AI Color Correction Assistant shows visual reasoning in a new role:

- Creative advisor rather than detection engine
- Human-in-the-loop workflow where AI suggests, you decide
- Visual comparison and style analysis
- Iterative refinement toward a target look
- Bridging subjective taste and technical adjustments

This completes Part III: Building the Playground Tools. You've built systems for tracking, counting, analyzing, monitoring zones, and now matching visual styles.

## What's Next

Part IV adds a new dimension: audio. So far, everything has been visual—cameras, images, video. In the next chapter, we introduce speech-to-text with Whisper and explore how audio understanding complements visual reasoning.

AV systems have both eyes and ears. It's time to use both.

---

*Chapter 12: Audio Fundamentals for Visual Reasoning — adding ears to your system with speech-to-text and audio analysis.*
