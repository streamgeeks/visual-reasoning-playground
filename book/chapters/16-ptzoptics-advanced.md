# Chapter 16: PTZOptics Advanced Control

In Chapter 7, we built an auto-tracker that follows objects. That's powerful, but it's just the beginning of what's possible with PTZ camera control and visual reasoning.

This chapter explores advanced camera automation: preset management, multi-camera coordination, intelligent Preset Tours, and giving AI full control over camera behavior.

## Beyond Simple Tracking

The auto-tracker does one thing well: keep a detected object centered. But real production needs more:

- **Multiple presets** for different shots (wide, medium, close-up)
- **Intelligent transitions** between presets based on context
- **Multi-camera coordination** so cameras don't all point at the same thing
- **Preset Tours** that sweep an area systematically
- **Context-aware framing** that adapts to what's happening

PTZOptics cameras support all of this through their API. Visual reasoning makes it intelligent.

## The PTZOptics API

The PTZOptics API goes far beyond basic pan/tilt commands:

**Preset Management:** Save positions and recall them instantly. A camera can store dozens of positions—wide shot, close-up, whiteboard view—and jump to any of them on command.

**Zoom Control:** Zoom in, zoom out, or move to a specific zoom position. Combine with pan/tilt for complete framing control.

**Absolute Positioning:** Some models support moving directly to specific coordinates, useful for precise, repeatable movements.

**Speed Control:** Slow movements for smooth on-air transitions, fast movements for quick repositioning between shots.

When you're ready to explore the full API, ask Cursor to show you all available PTZOptics commands.

## Preset-Based Visual Reasoning

Instead of continuous tracking, sometimes you want preset-based control: jump to predefined positions based on what visual reasoning detects.

**Scenario:** A conference room with three shot options.
- Preset 1: Wide shot of entire table
- Preset 2: Medium shot of presentation area
- Preset 3: Close-up of whiteboard

**Visual reasoning triggers:**
- Multiple people at table, no one standing → Wide shot
- Someone standing at presentation area → Medium shot
- Someone at whiteboard, writing → Close-up of whiteboard

This is often more production-appropriate than continuous tracking. Presets are framed intentionally by a human; continuous tracking can look amateur if not tuned carefully.

## Hybrid Tracking: Presets + Fine Adjustment

The best of both worlds: start with a preset, then fine-tune based on detection.

The flow:
1. Visual reasoning detects the situation → Select appropriate preset
2. Camera moves to preset
3. Visual reasoning detects subject within the preset view
4. Fine adjustments keep subject well-framed within the preset's general area

This gives you professional-looking base shots with intelligent adjustment. The camera always starts from a well-composed position, then refines.

## Multi-Camera Coordination

When you have multiple PTZ cameras, they shouldn't all do the same thing.

**The problem:** Three cameras all track the same speaker. You get three identical shots.

**The solution:** Coordinate cameras to provide variety.

**Strategy 1: Role Assignment**
- Camera 1: Always track the active speaker (close-up)
- Camera 2: Always show the wide/establishing shot
- Camera 3: Track the next most relevant person (reaction shots)

**Strategy 2: Visual Reasoning Coordination**
A central coordinator analyzes the scene and assigns each camera. The speaker gets Camera 1. Someone asking a question gets Camera 3. Camera 2 holds the wide.

**Strategy 3: Avoid Conflicts**
Before moving a camera, check what other cameras are covering. If another camera already has that shot, don't duplicate it—find something else to show.

## Intelligent Preset Tours

PTZOptics cameras have a built-in feature called Preset Tours—the camera automatically cycles through saved preset positions. For security or monitoring applications, this lets cameras systematically scan an area.

**Basic Preset Tour:** Move through a sequence of presets on a timer. Position 1 for 10 seconds, Position 2 for 10 seconds, and so on. You can configure this directly in the camera's web interface.

**Visual reasoning enhanced tours:**
- If something interesting is detected, pause the tour and observe longer
- If an area has had recent activity, check it more often
- If a zone is empty, skip to the next position quickly
- Spend more time where things are happening

The camera becomes an active observer, not just a mechanical scanner. Visual reasoning adds intelligence to what the camera already knows how to do.

## Search and Find

Remember the "find my keys" concept from Chapter 3? With PTZ control, we can actually search.

**Scenario:** "Find the red notebook in the office"

The system:
1. Starts with a wide shot to establish context
2. Scans the room systematically
3. When it detects something that might be the target, zooms in to confirm
4. When found, centers and zooms for a clear view

This is genuinely useful for security, inventory checking, or just finding things in a large space.

## Context-Aware Framing

Good camera operators don't just center subjects—they frame them appropriately for the context.

**Rule of thirds:** Place the subject off-center for more dynamic composition.

**Lead room:** When a subject is moving or facing a direction, leave space in front of them.

**Head room:** Don't cut off tops of heads; don't leave too much empty space above.

Visual reasoning can provide context for these decisions. If someone is facing left, position them on the right side of frame. If they're walking, leave room in their direction of travel. If they're looking up, adjust tilt accordingly.

## Business Example: Worship Service Automation

A house of worship with three PTZ cameras:

**Camera assignments:**
- PTZ 1: Pastor/speaker tracking
- PTZ 2: Worship leader and band
- PTZ 3: Congregation and establishing shots

**Visual reasoning automation:**
- Detect who's at the pulpit → PTZ 1 tracks them
- Detect worship leader position → PTZ 2 adjusts to band configuration
- Detect congregation size → PTZ 3 chooses appropriate wide shot
- Detect applause → PTZ 3 cuts to congregation
- Detect scripture reference → Hold current shot (don't distract from reading)

This assists the production team rather than replacing them. The cameras are always roughly correct; operators fine-tune and make creative choices.

## Personal Example: Home Security Preset Tour

A single PTZ camera covering your backyard:

**Preset Tour positions:**
- Position 1: Driveway entrance
- Position 2: Back door
- Position 3: Side gate
- Position 4: Wide overview

**Smart tour behavior:**
- Cycle through positions every 30 seconds
- If motion detected, pause and zoom to investigate
- If person detected, track them until they leave frame
- After tracking, return to the tour

**Integration with alerts:**
- Person detected → Send notification with snapshot
- Unknown person (not recognized) → More urgent alert
- Package detected at door → "Delivery arrived" notification

## Making It Your Own

When you're ready to build advanced PTZ control, here are the kinds of requests you might make to Cursor:

- "Build a preset manager that saves and recalls camera positions based on visual triggers"
- "Coordinate two PTZ cameras so they don't both track the same person"
- "Create a Preset Tour that spends more time on areas with frequent activity"
- "Search a room for a specific object I describe"
- "Implement rule-of-thirds framing based on detection position"
- "Add zoom control that adjusts based on how many people are in frame"

## What You've Learned

Advanced PTZ control turns cameras into intelligent observers:

- Preset-based switching for production-quality shots
- Hybrid tracking combining presets with fine adjustment
- Multi-camera coordination for shot variety
- Intelligent Preset Tours for monitoring
- Search functionality for finding specific objects
- Context-aware framing for better composition

With OBS integration from Chapter 15, the PTZ control here in Chapter 16, and vMix coming next in Chapter 17, you'll have the complete production automation toolkit.

---

*Chapter 17: vMix Integration — connecting visual reasoning to professional live production software.*
