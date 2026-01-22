# Chapter 2: Your First Visual Query

Let's not waste any time. Open your browser and go to VisualReasoning.ai.

You'll need to create a free account—just enter your email and we'll send you a magic link. No passwords to remember. Click the link in your email and you're in.

Why do we ask you to create an account? Because VisualReasoning.ai does more than just run one-off queries. Your account lets you store your images, save what we call "stories"—which are explanations of what the vision model sees through time—and build up a history of your experiments. As you work through this book, you'll want to reference things you've tried before. Your account keeps all of that organized.

VisualReasoning.ai is a free tool we built specifically for this book and online course. It works with any webcam, any smartphone camera, any video source your browser can access.

**Here's something important: VisualReasoning.ai is fully mobile-optimized.** Pull out your phone right now, open your browser, and go to the same URL. The entire interface works on mobile—you can point your phone's camera at anything and run visual reasoning queries on the spot. This isn't a stripped-down mobile version; it's the full experience.

Why does this matter? Because the best way to learn visual reasoning is to experiment constantly. When you're at a trade show booth, point your phone at the demo equipment and ask "what's on this rack?" When you're walking through a venue, test how well it detects different lighting conditions. When you're grabbing coffee, see if it can identify the items on the counter.

Your phone becomes a proof-of-concept machine. Every time you wonder "could visual reasoning handle this?"—pull out your phone and find out in ten seconds. No laptop required. No setup. Just point and ask.

If you want to keep using it beyond the free tier, you can get your own Moondream API key and plug it in, but for now, let's just get started.

## Your First Query: Describe What You See

Point your camera at something—your desk, your living room, the view out your window. It doesn't matter what. Just make sure there's something interesting in frame.

Now click the "Describe Scene" button.

Within a few seconds, you'll see text appear describing what the camera sees. Not just "there's a desk"—but details. Colors. Objects. Spatial relationships. The AI will tell you what's in the scene and often how things are arranged.

Take a moment to appreciate what just happened.

You didn't train anything. You didn't upload thousands of images. You didn't configure a model or adjust parameters. You just pointed a camera and asked a question, and the AI understood what it was looking at.

This is visual reasoning.

## What Just Happened?

Behind the scenes, here's what occurred:

1. Your browser captured a single frame from your camera
2. That image was sent to the Moondream Vision Language Model
3. The model analyzed the image using its understanding of the visual world
4. It generated a natural language description of what it saw
5. That description appeared on your screen

The whole process takes a few seconds. And the remarkable thing is that Moondream wasn't trained specifically on your desk, your living room, or your window view. It was trained on a vast understanding of what things look like and what words describe them. When you ask it to describe a scene, it's applying that general knowledge to your specific image.

This is fundamentally different from traditional computer vision, where you would need to train a model to recognize each specific thing you cared about. With a Vision Language Model, you can ask about anything—and it will do its best to understand.

## The Quality of the Response

Try running the same query a few times. Move objects around. Change the lighting. Point at different things.

You'll notice that the descriptions are pretty good, but not perfect. Sometimes the model will miss things. Sometimes it will describe something inaccurately. Sometimes it will focus on details you don't care about and ignore the things you do.

This is normal. This is expected. And this is important to understand right from the start.

Visual reasoning is not magic. It's a tool with capabilities and limitations. Part of learning to use it effectively is understanding what it's good at and what it struggles with. We'll dig deeper into this throughout the book, but for now, just notice: the AI is doing something remarkable, and it's also making mistakes. Both of those things are true.

## Business Example: Zone Monitoring

Let me show you why this matters for real-world applications.

VisualReasoning.ai has a zone monitoring feature. You can draw a zone on your camera view—say, a doorway, a restricted area, or a specific floor space—and ask a simple question: "Is there a person in this zone?" The system will answer yes or no, and it will notify you when the answer changes.

This is powerful for monitoring scenarios. You're not training a specific detection model—you're using general visual understanding combined with spatial awareness to identify situations that need attention. The same pattern works for security (is someone in the restricted area?), retail (is the checkout line too long?), or warehouse safety (is anyone near the forklift path?).

**A note on privacy-sensitive applications:** For scenarios like healthcare monitoring where HIPAA compliance matters, you wouldn't use a cloud-based tool. The good news: Moondream is fully open source. You can download it and run it entirely on your own hardware—no data ever leaves your facility. We'll cover local deployment options in Chapter 5. The visual reasoning patterns you learn in this book work the same way whether you're using our cloud playground or running models locally.

## Personal Example: What's in My Fridge?

Here's a quick experiment that shows you visual reasoning in action—using tools you probably already have.

Open ChatGPT, Claude, or Gemini on your phone. Open your refrigerator, take a picture of what's inside, and ask: "What can I make for dinner with these ingredients?"

Within seconds, you'll get recipe suggestions based on what the AI actually sees in your fridge. No typing out an ingredient list. No barcode scanning. Just point, snap, and ask.

**Here's what's happening behind the scenes:** When you send an image to ChatGPT or Claude, the LLM (Large Language Model) doesn't actually "see" the image itself. It calls a Vision Language Model—a VLM—to analyze the image and describe what's there. The VLM says something like "I see eggs, butter, cheddar cheese, leftover chicken, and some wilting spinach." Then the LLM takes that description and reasons about it: "With those ingredients, you could make a frittata, a chicken quesadilla, or a simple omelet."

**This is exactly what we'll do in this course.** We'll use VLMs like Moondream to understand what cameras see, then use that understanding to drive decisions and actions. The same pattern that helps you figure out dinner can help a production system switch cameras, help a sports broadcast update graphics, or help a warehouse track inventory.

Visual reasoning provides the understanding. What you do with that understanding is up to you.

## Understanding Without Training

Let me take a moment to explain why this is such a big deal, because it's easy to miss if you haven't spent time with traditional computer vision.

In the old world—the world I lived in for years with Roboflow and custom CV models—every new capability required training. Want to detect basketballs? Collect thousands of basketball images, label them, train a model, test it, refine it, deploy it. Want to detect tennis balls too? Start over. Different training set, different model.

This approach works. I built production systems this way. But it doesn't scale to the real world, where customers want to track horses and pastors and coffee mugs and specific products and anything else they can imagine.

Vision Language Models flip the script. Instead of training the model on your specific use case, you leverage a model that already understands the visual world in general. You don't teach it what a basketball looks like—it already knows. You just ask.

The model you're using right now, Moondream, has billions of parameters representing its understanding of visual concepts. When you ask it to describe a scene or identify an object, it's drawing on that general knowledge. No training required. No waiting. No specialized expertise.

This is what I couldn't believe when Matt first showed me the demos in our R&D lab. And it's what I want you to experience right now, in your first few minutes with the technology.

## What's Next

You've now run your first visual reasoning query. You've seen the system describe scenes, and you understand the pattern: VLMs provide visual understanding, and that understanding can drive decisions and actions.

In the next chapter, we'll go one step further. Instead of just describing what's in the scene, we'll ask the system to locate specific objects—to draw detection boxes around the things we care about. This is where visual reasoning starts to become genuinely useful for automation, because once you know where something is in the frame, you can start making decisions based on its position.

---

*Chapter 3: Drawing Detection Boxes — where visual reasoning goes from describing to locating.*
