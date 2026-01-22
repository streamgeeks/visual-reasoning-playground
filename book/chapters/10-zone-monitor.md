# Chapter 10: Zone Monitor

We've tracked objects across the entire frame. Now we're going to care about where they are within the frame.

The Zone Monitor lets you draw boundaries on your camera view and trigger actions when specific objects enter, exit, or remain in those zones. It's visual reasoning combined with spatial rules—a powerful combination for security, safety, and automation.

## Pipeline Stages in This Project

Here's how the Zone Monitor maps to our 5-stage pipeline:

- **Stage 1: Media Inputs** — Camera feed covering the monitored area
- **Stage 2: Perception** — Zone geometry (polygon coordinates defining boundaries)
- **Stage 3: Reasoning (VLM)** — Moondream detects objects, returns bounding box positions
- **Stage 4: Decision (Guardrails)** — Zone intersection logic, dwell time tracking, trigger conditions, cooldowns
- **Stage 5: Control (Outputs)** — Alerts, webhooks, logging, production system commands

**What's different from previous projects:** This project adds spatial logic to Stage 4. We're not just asking "is there a person?"—we're asking "is there a person inside this specific polygon?" The guardrails layer handles zone intersection math, dwell time calculations, and trigger debouncing.

## Spatial Awareness

Think about how you monitor spaces in real life. You don't just care that someone is visible—you care where they are.

- Is the delivery person at the front door or wandering in the backyard?
- Is the forklift in the safe area or too close to the pedestrian walkway?
- Is the customer at the checkout counter or still browsing?

Location matters. The Zone Monitor adds that spatial dimension to visual reasoning.

## How Zones Work

You've already experienced this in VisualReasoning.ai's zone detection feature. The Zone Monitor expands on that concept:

**1. Define a zone**
Draw a rectangle (or other shape) on the camera view. This could be a doorway, a restricted area, a parking spot, a checkout counter—any area you want to monitor.

**2. Specify what to detect**
Same as always: "person," "vehicle," "forklift," whatever you're watching for.

**3. Set the trigger condition**
- Object enters the zone
- Object exits the zone
- Object is present in the zone
- Object is absent from the zone
- Object remains in the zone for more than X seconds

**4. Define the action**
What happens when the condition is met? Send a notification, log an event, trigger a webhook, sound an alarm, send a command to another system.

**5. Monitor continuously**
The system watches the zone, checks for your object, evaluates the condition, and triggers when appropriate.

## The Detection Loop with Zones

The architecture adds a spatial check after detection:

- **Capture frame** from camera
- **Send to Moondream** with detection request
- **Receive bounding boxes** with coordinates
- **Check each detection against zone boundaries** — Is the object inside? Did it just enter? Just exit?
- **Evaluate trigger conditions** — Entry, exit, presence, absence, dwell time exceeded?
- **Fire actions if conditions met** — Alert, log, webhook, production command

When Moondream returns a detection, we check its coordinates against the zone boundaries. If the object is inside the zone (or just entered, or just exited), we trigger the configured action.

## Zone Math

This is simpler than it sounds. A zone is just a rectangle defined by coordinates. A detection is also a rectangle (the bounding box). We check if they overlap.

If your zone is defined as:
- Left edge: 20% of frame width
- Right edge: 60% of frame width
- Top edge: 30% of frame height
- Bottom edge: 80% of frame height

And a detected object's center is at (45%, 55%), that object is inside the zone.

You can adjust the logic to check:
- Is the object's center inside the zone? (most common)
- Is any part of the object inside the zone? (more sensitive)
- Is the entire object inside the zone? (more strict)

The right choice depends on your application.

## Business Example: Warehouse Safety

Warehouses have dangerous areas. Forklifts need space to operate. Certain equipment shouldn't be approached while running. Emergency exits need to stay clear.

Traditional safety monitoring means posting signs and hoping people follow them, or stationing a safety officer to watch. Neither scales well.

With the Zone Monitor:

**Forklift operating area:**
Draw a zone around the area where forklifts operate. Set the detection target to "person not operating equipment" or simply "person on foot." When a pedestrian enters the forklift zone, trigger an alert.

**Equipment clearance:**
Draw a zone around dangerous machinery. When anyone enters while the equipment is running (you might use another sensor to know equipment state), trigger an immediate warning—flashing light, audible alarm, or shutdown command.

**Emergency exit monitoring:**
Draw zones in front of each emergency exit. Set the condition to "object present for more than 60 seconds"—meaning something is blocking the exit. Alert facilities management.

**Loading dock safety:**
Draw a zone at the loading dock edge. When a person approaches the edge without a truck present, trigger a warning. Combine with vehicle detection to modify behavior when trucks are docked.

**Practical considerations:**

You'll need to tune sensitivity. A forklift zone warning that triggers every time someone walks nearby will be ignored. Set appropriate thresholds—maybe alert only when someone is in the zone for more than 5 seconds, excluding quick pass-throughs.

Integration matters too. The most effective safety systems tie into existing alarm infrastructure, PA systems, or even equipment controls. Ask Cursor how to integrate with your specific systems.

## Personal Example: Home Office Focus Zone

Let's bring it home—literally, to your home office.

You're working from home and want to automate your setup based on where you are in the room. A camera watches your workspace, and zones trigger different behaviors.

**The desk zone:**
Draw a zone around your desk chair area. When you sit down:
- Turn on the desk lamp (smart plug webhook)
- Set your status to "focusing" (Slack API)
- Start a focus timer

When you leave the desk for more than 5 minutes:
- Pause the focus timer
- Set status to "away"

**The standing area:**
If you have a standing desk or whiteboard area, draw a zone there. Different triggers:
- When you move to the whiteboard, switch your camera to a wider angle (if using PTZ)
- Log "whiteboard session" for time tracking

**Meeting detection:**
Draw a zone around where you sit for video calls. Combine with detection of "person facing camera" or "person wearing headphones":
- Auto-start recording when a meeting posture is detected
- Mute notifications during detected calls

**Refinements:**

*Different alerts for different zones:*
- Desk zone: Focus mode
- Couch zone: Break time (pause timers, relax notifications)
- Door zone: Someone entering your office—maybe pause recording for privacy

*Time-based rules:*
"Only track focus time between 9 AM and 6 PM"

**Why this matters:**

Motion-based automation triggers on everything—you reaching for coffee, shifting in your chair, your cat walking by. Visual reasoning with zones means "person seated at desk" actually detects you working, not just movement. Combined with zone filtering, you get automation that actually matches your intent.

## Multiple Zones

Real applications usually involve multiple zones with different rules:

**Retail store:**
- Entrance zone: Count entries/exits
- Checkout zone: Alert if line exceeds 3 people
- Stockroom door zone: Log all access
- Emergency exit zones: Alert if blocked

**Parking lot:**
- Handicap spaces: Alert if non-permitted vehicle parks
- Fire lane: Alert if any vehicle stops
- Entrance zone: Count vehicles entering
- Exit zone: Count vehicles leaving

**Conference room:**
- Main area: Presence detection for room-in-use status
- Whiteboard zone: Capture images when someone is presenting
- Door zone: Count entries/exits

Each zone can have its own detection target, trigger conditions, and actions. The same camera can power multiple different monitoring tasks.

## Dwell Time and Occupancy

Beyond simple entry/exit detection, zones enable time-based analysis:

**Dwell time:** How long does someone stay in a zone? Useful for retail (how long do customers look at a display?), security (someone lingering suspiciously), or efficiency (how long does it take to complete a task in an area?).

**Occupancy:** How many objects are currently in the zone? Useful for capacity management, social distancing enforcement, or resource allocation.

**Heat maps:** Over time, you can build visual heat maps showing where activity concentrates. Which areas get the most traffic? Where do people spend the most time?

These analytics build on the basic zone detection. Once you know when objects enter and exit zones, you can calculate everything else.

## Triggering Actions

The real power of zone monitoring is what happens when conditions are met. Options include:

**Notifications:**
- Push notification to phone
- Email alert
- SMS message
- Slack/Teams message

**Logging:**
- Write to local file
- Send to database
- Push to analytics platform

**Webhooks:**
- Trigger IFTTT applets
- Call custom API endpoints
- Integrate with home automation

**Hardware triggers:**
- Activate relay/switch
- Sound alarm
- Flash lights
- Open/close door

**System integration:**
- Change vMix scene
- Adjust OBS source
- Move PTZ camera to preset
- Start/stop recording

Ask Cursor: *"How do I send a webhook when someone enters the zone?"*

The answer will depend on your specific needs, but the pattern is consistent: detect condition → trigger action.

## Building Zone Interfaces

The Visual Reasoning Playground includes a zone definition interface. But you might want to build your own, customized for your application.

Key elements of a zone interface:

**Zone drawing:** Let users draw rectangles on the camera view. Click and drag to define corners.

**Zone editing:** Move zones, resize them, delete them. Users need to iterate.

**Zone labeling:** Give each zone a name so alerts are meaningful. "Person in Zone 3" isn't as useful as "Person in Server Room."

**Rule configuration:** For each zone, define what to detect and what triggers actions.

**Visual feedback:** Show zones overlaid on the live video. Highlight when conditions are met.

Natural language prompts:

*"Build a simple interface where I can draw rectangles on the video to define zones"*

*"How do I save zone definitions so they persist when I restart the application?"*

*"I want zones to highlight in red when there's a detection inside them"*

## Combining with Other Tools

Zone monitoring integrates naturally with other Visual Reasoning capabilities:

**Zone Monitor + PTZ Tracker:**
When something enters a zone, have the PTZ camera zoom in for a closer look. "Person detected in loading dock zone → move camera to loading dock preset and zoom in."

**Zone Monitor + Scene Analyzer:**
Zone triggers the alert; scene analysis provides context. "Person in restricted zone" triggers a scene analysis query: "Describe the person in the restricted area." The alert includes both the detection and the description.

**Zone Monitor + Smart Counter:**
Counting within zones. "Count people who enter Zone A and then enter Zone B within 5 minutes" for conversion tracking or flow analysis.

**Zone Monitor + Multimodal Fusion (coming soon):**
Combine visual zone detection with audio cues. Someone enters a zone and says something—trigger based on both conditions being met.

## Making It Your Own

Cursor prompts for zone monitoring:

*"I want to set up three zones: entrance, main floor, and checkout. Each should have different alert behaviors"*

*"How do I create a dwell time alert—notify if someone is in the zone for more than 2 minutes?"*

*"I want to log zone entries to a Google Sheet with timestamps"*

*"Can we add a feature that takes a snapshot whenever someone enters a high-security zone?"*

*"How do I build a simple occupancy counter that shows how many people are in each zone?"*

*"I want different alert sounds for different zones"*

## What You've Learned

Zone monitoring adds spatial awareness to visual reasoning:

- Define areas that matter within your camera view
- Detect when objects enter, exit, or remain in those areas
- Trigger actions based on spatial conditions
- Build more sophisticated analytics with multiple zones
- Reduce false positives by filtering to relevant areas
- Integrate with notification and automation systems

This is where visual reasoning starts to feel like genuine intelligence. It's not just seeing—it's understanding where things are and why that matters.

## What's Next

We've covered the core detection and monitoring tools. In the next chapter, we're going to add something different: AI-assisted color correction.

This isn't about detecting objects—it's about understanding visual aesthetics. Given a reference image, can the AI help you match the color, style, and look on another camera? Turns out it can.

---

*Chapter 11: AI Color Correction Assistant — matching camera styles using visual reasoning as your creative partner.*
