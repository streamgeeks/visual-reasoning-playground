# Chapter 3: Drawing Detection Boxes

In the last chapter, you asked the AI to describe what it sees. That's powerful, but it's just the beginning. Now we're going to ask a more specific question: where exactly is that thing in the frame?

This is the difference between "there's a coffee mug on the desk" and "there's a coffee mug at coordinates 340, 220, and it's about 80 pixels wide." The first is useful for understanding. The second is useful for automation.

When you know where something is, you can do something about it. You can move a camera to center on it. You can trigger an alert if it crosses a boundary. You can count how many of them there are. You can track how they move over time.

Detection boxes—sometimes called bounding boxes—are the foundation of everything we'll build in this book. Let's learn how they work.

## From Description to Location

Go back to VisualReasoning.ai and navigate to the **Active Detection** area. This is where visual reasoning gets practical.

Point your camera at your desk or workspace—somewhere with multiple distinct objects. In the Active Detection area, you can:

- Enter specific object names you want to detect (like "coffee mug" or "person" or "keyboard")
- Assign each object a unique color so you can tell them apart visually
- Watch as bounding boxes are drawn around detected objects in real-time

Try adding a few different objects. As the system detects them, you'll see color-coded boxes appear on your video feed.

**Where to find the results:** Look at the Visual Reasoning Notification Area. This is where you'll see the detection data—including coordinates and confidence levels for each detected object. The confidence score (0 to 1) tells you how certain the AI is about each detection.

Try a few different objects. Some will be detected easily with high confidence. Others might be missed or detected with lower confidence. That's okay—we're learning how the system behaves.

## Confidence: When to Trust the Detection

Not all detections are created equal. A confidence score of 0.92 means something different than a confidence score of 0.51.

In my experience, here's a rough guide:

**Above 0.8:** High confidence. The model is pretty sure. For most applications, you can trust these detections.

**0.6 to 0.8:** Medium confidence. The model thinks it found something, but it's not certain. Good for suggestions, but you might want human verification before taking action.

**Below 0.6:** Low confidence. The model is guessing. These detections are often wrong. In production systems, you might filter these out entirely.

These thresholds aren't magic numbers—they're starting points. Depending on your application, you might need to be more conservative or more permissive. A healthcare monitoring system might require 0.9+ confidence before alerting. A "find my keys" app might show anything above 0.5 and let the user decide.

The important thing is to understand that confidence scores exist and to use them thoughtfully. Don't treat every detection as equally valid.

## Multiple Objects and Colors

In the Active Detection area, you can detect multiple different objects simultaneously—each with its own unique color. This makes it easy to see at a glance what the system is finding.

Try this: add "person" with one color and "laptop" with another. Point your camera at a workspace where both are visible. You'll see different colored boxes around each object type.

Each detection includes its own confidence score in the notification area. Some objects will be detected with high confidence, others with lower confidence, and some might be missed entirely—especially if they're partially hidden or poorly lit.

## Business Example: Who's Presenting?

Let's make this practical with a scenario you'll encounter throughout this course.

Imagine you're setting up a camera for a presentation or lecture. You want the camera to follow whoever is currently presenting. The traditional approach requires a dedicated camera operator or expensive auto-tracking hardware with specialized training.

With visual reasoning, you have another option.

Point your camera at the presentation area. In the Active Detection area, add "person" or "presenter" or "speaker at podium." The system will draw a bounding box around them and show you their position in the frame.

**Here's where it gets powerful:** Those coordinates aren't just for display. They can drive automation. If the detected person is on the left side of the frame, a PTZ camera can pan left to center on them. If they move right, the camera follows. If they walk toward the whiteboard, the camera tracks.

This is exactly what we'll build in Chapter 7—a PTZ camera that auto-tracks any object you describe. The detection boxes you're seeing right now are the same detection boxes that will control camera movement later. You're learning the foundation for real automation.

Try this yourself: move around in front of your camera and watch the detection box follow you. That box position is the data that will eventually drive a robotic camera.

**For industrial applications:** The same detection pattern works for manufacturing—detecting products, defects, or foreign objects on a production line. If you're building something for industrial quality control, check out **Detect-IT**, one of our ecosystem partners that specializes in production-ready defect detection systems. You can learn the technology here, prototype with VisualReasoning.ai, and connect with partners who can help you scale in professional environments.

## Personal Example: Where Did I Leave My Keys?

How much time have you wasted looking for your keys? Your wallet? Your glasses?

Point your phone at your living room or home office. Add "keys" or "wallet" to the Active Detection area. If the object is visible, the system draws a box around it. Found.

**Now imagine this:** What if the camera wasn't stationary? What if it could pan left, tilt up, and actively search?

This is what we'll build in later chapters. You'll connect a PTZOptics camera to visual reasoning and give the AI control over where the camera points. The detection boxes you're learning to use right now will tell the camera "the keys are in the left side of the frame—pan left to center on them."

The technology that finds your keys is identical to the technology that tracks a presenter across a stage. Only the context changes.

## The Power of Natural Language

Here's something worth pausing on: you're describing objects in plain English.

Not "object_id_7432." Not a trained class from a predefined list. Just words. "Coffee mug." "Red pen." "The PTZOptics camera in the corner." "Person wearing a blue shirt."

This is what makes visual reasoning different from traditional computer vision. In a traditional system, you can only detect what you've trained the model to detect. If the model was trained on 80 object classes, you get 80 options. Want to detect something new? Train a new model.

With a Vision Language Model, you describe what you want in natural language, and the model applies its general understanding to find it. Want to detect "the laptop that's open"? Just ask. "The chair that's pushed back from the desk"? Ask. "The person who's standing"? Ask.

This flexibility is incredibly powerful. It means you can adapt the system to new situations without retraining. It means you can describe nuanced, contextual things that would be impossible to capture in a fixed class list. It means the same tool that finds your keys can also find a specific product on a shelf or a particular piece of equipment in a rack.

Try pushing the boundaries. Ask for unusual things. "The brightest object in the scene." "Something that doesn't belong." "The oldest-looking item on the desk." Some of these will work. Some won't. But experimenting with natural language queries will teach you what the model can understand and where its limits are.

## What's Next

You've now experienced two core capabilities of visual reasoning: describing scenes and locating objects. Both of these happen through a web interface with no code required.

In the next chapter, we're going to step back and make sure you understand the foundational concepts behind what you've been doing. We'll talk about the difference between traditional computer vision, large language models, and vision language models. We'll cover when to use cloud-based models versus running models locally. And we'll make sure you have the conceptual foundation to understand everything that comes next.

Don't worry—it won't be a dry lecture. We'll keep it practical and focused on what matters for building real things. But having a clear mental model of how these technologies work will make everything easier as we move into code.

---

*Chapter 4: Visual Reasoning vs. Everything Else — understanding what makes VLMs different from traditional AI approaches.*
