# Part II: Just Enough Theory

# Chapter 4: Visual Reasoning vs. Everything Else

You've now used visual reasoning to describe scenes and detect objects. It works. But if someone asked you to explain what's actually happening—how this is different from other AI technologies—could you?

This chapter gives you that understanding. Not a deep technical dive, but enough foundation that you can make intelligent decisions about when to use visual reasoning, when to use something else, and how to explain the difference to others.

We're going to cover three technologies: traditional computer vision, large language models, and vision language models. By the end, you'll understand where visual reasoning fits and why it's such a breakthrough for our industry.

## Traditional Computer Vision: The Old Way

Computer vision has been around for decades. It's the technology behind facial recognition, barcode scanners, license plate readers, and thousands of industrial applications. It works, and it works well for specific tasks.

Here's how traditional computer vision operates:

**Step 1: Collect training data.** You gather hundreds or thousands of images of the thing you want to detect. If you want to detect basketballs, you need basketball images. Lots of them. From different angles, different lighting, different backgrounds.

**Step 2: Label the data.** Someone—usually a human—goes through every image and draws boxes around the objects. "This is a basketball. This is a basketball. This one too." This is tedious, time-consuming work.

**Step 3: Train the model.** You feed all those labeled images into a machine learning system. The system learns to recognize patterns: what makes a basketball look like a basketball? The round shape, the orange color, the texture of the lines.

**Step 4: Deploy and test.** You put the model into production and see how it performs on new images it's never seen before. Usually, it works pretty well on things that look like the training data, and struggles with things that don't.

**Step 5: Repeat for every new object.** Want to detect tennis balls too? Start over. New training data. New labels. New model.

I lived in this world for years. I had an enterprise account with Roboflow, a platform that makes building computer vision models easier. I built impressive models—systems that could track a basketball across a court, follow a laser pointer for presentations. These were real, production systems that actually worked.

But here's what I eventually realized: it doesn't scale.

Every new customer request meant a new model. "Can your camera track horses?" Train a horse model. "Can it track my pastor walking across the stage?" Train a person model—but wait, will it work with robes? Better add those to the training data. "Can it track a specific product on our manufacturing line?" You see where this is going.

The models were also locked and proprietary. I'd built them on Roboflow's platform, which meant I was dependent on their infrastructure. There's a big difference between a locked-down model you've licensed and an open-source model you can run anywhere.

Traditional computer vision is powerful, but it's rigid. It can only see what you've trained it to see.

## Large Language Models: Text In, Text Out

You've probably used ChatGPT, Claude, or one of the other large language models that have become ubiquitous in the past few years. These are remarkable systems that can write, analyze, summarize, translate, and answer questions about almost anything.

Here's the key thing to understand about LLMs: they work with text.

You type words. The model processes those words. It generates new words as output. Everything happens in the realm of language.

This is incredibly powerful for many tasks. Need to summarize a document? LLM. Need to write code? LLM. Need to answer questions about a topic? LLM. Need to translate between languages? LLM.

But here's what LLMs can't do: they can't see.

If you ask ChatGPT "what's in this image?" and paste in an image file, the base text model has no idea. It doesn't have eyes. It can only process language.

Some LLM providers have added vision capabilities to their products—GPT-4V, Claude with vision, Gemini. These are actually vision language models (which we'll get to in a moment), not pure LLMs. The distinction matters.

Pure LLMs are like having a brilliant assistant who's blindfolded. They can reason, they can write, they can analyze—but they can't look at anything. For ProAV and broadcast applications, where everything is visual, that's a significant limitation.

## Vision Language Models: The Breakthrough

Now we get to the good stuff.

A Vision Language Model combines the visual understanding of computer vision with the language capabilities of an LLM. It can see and it can talk about what it sees.

Here's what makes this different from traditional computer vision:

**No training required for new objects.** Remember how traditional CV requires you to train a new model for every new thing you want to detect? VLMs skip that entirely. The model already has a general understanding of what things look like. You just describe what you're looking for in natural language.

**Natural language input and output.** Instead of getting back coordinates and class IDs, you get descriptions. Instead of choosing from a fixed list of detectable objects, you describe what you want in your own words.

**Generalizes to new situations.** A VLM can handle objects and scenarios it's never specifically seen before, because it's drawing on general knowledge rather than specific training.

This is what Moondream does. This is what you've been using on VisualReasoning.ai. When you ask it to detect "coffee mug" or describe a scene, you're using a vision language model.

The interesting thing about a Vision Learning Model is that you do not need to train a computer vision model. The vision model already has billions of parameters we can use to understand what it's seeing.

## A Simple Mental Model

Here's how I think about these three technologies:

**Traditional Computer Vision** is like a specialist who only knows what you've taught them. Train them on basketballs, and they're an expert at basketballs. Ask them about tennis balls, and they stare at you blankly.

**Large Language Models** are like a genius who's blindfolded. They can reason about anything you describe to them, but they can't look at anything themselves. They depend entirely on you to tell them what's there.

**Vision Language Models** are like a knowledgeable assistant who can both see and think. They look at what's in front of them, understand what they're seeing, and can discuss it in natural language.

For ProAV and broadcast applications—where cameras are everywhere and understanding visual content is essential—VLMs are a fundamental breakthrough.

## Why This Matters for Our Industry

Think about what we do in ProAV and broadcast. We point cameras at things. We capture video. We switch between sources based on what's happening. We make decisions based on what we see.

Traditional computer vision can help with some of this, but only for narrowly defined tasks. You can train a model to detect faces for auto-tracking. You can train a model to read scoreboards. But every new requirement means a new training project.

LLMs are powerful for scripting, automation, and text-based tasks—but they can't see what's happening on camera.

VLMs bridge the gap. They give us AI that can:

- Look at a camera feed and describe what's happening
- Detect any object we can describe in words
- Understand context and spatial relationships
- Answer questions about what's in frame
- Make decisions based on visual content

And they can do all of this without custom training for every new scenario.

This is why Matt's demo in the R&D lab hit me so hard. Our PTZOptics cameras ship with built-in computer vision for tracking, and we do that well. But our customers are asking to track horses and products and pastors and a hundred other things. With traditional CV, every request is a new project. With VLMs, we can say "track whatever the customer describes."

The scalability of "track anything" versus "build a unique computer vision model for each application" is what makes this transformative.

## The Limitations (Because Nothing Is Perfect)

I've been enthusiastic about VLMs, but I need to be honest about limitations too.

**Speed:** VLMs are slower than specialized computer vision models. A model trained specifically to detect faces will be faster at face detection than a general-purpose VLM. For real-time applications, this matters.

**Accuracy on specific tasks:** A specialized model trained on 100,000 images of your specific product will probably outperform a general VLM at detecting that product. VLMs are generalists, not specialists.

**Cost:** Every VLM query costs something—either API fees for cloud models or compute resources for local models. Traditional CV models can often run with minimal resources once trained.

**Consistency:** VLMs can give slightly different responses to the same input. Traditional CV is deterministic—same input, same output, every time.

For high-stakes, high-volume, narrowly-defined tasks, traditional computer vision may still be the better choice. If you need to detect a specific defect on a manufacturing line running 24/7, a trained CV model might be faster, cheaper, and more reliable.

But for flexibility, for rapid prototyping, for handling diverse scenarios without custom training—VLMs open doors that were previously closed.

## When to Use What

Here's a practical framework:

**Use Traditional Computer Vision when:**
- You have a single, well-defined detection task
- You need maximum speed and efficiency
- You have lots of training data available
- The task won't change over time
- You need deterministic, consistent results

**Use Large Language Models when:**
- You're working with text, not images
- You need reasoning, summarization, or generation
- You're building conversational interfaces
- You're processing documents or transcripts

**Use Vision Language Models when:**
- You need to understand visual content
- You want flexibility to detect new things without training
- You're prototyping or exploring possibilities
- You need natural language descriptions of visual content
- You want to combine visual understanding with reasoning

In practice, many systems will use multiple technologies together. You might use a VLM to understand what's happening in a scene, then pass that understanding to an LLM for decision-making, then trigger actions through traditional automation. The technologies complement each other.

## Speech-to-Text Models: The Ears

We've been focused on vision, but there's another piece of the puzzle that's just as important for ProAV and broadcast: audio.

OpenAI's Whisper is an open-source speech-to-text model that does for audio what VLMs do for video. It can transcribe speech in real-time, handle multiple languages, filter out background noise, and convert spoken words into text that other AI systems can understand.

Before Whisper, accurate speech recognition required expensive commercial services or significant development effort. Now, you can run a world-class transcription system locally on your own hardware, completely free, with remarkable accuracy.

Here's why this matters for our industry: ProAV systems don't just have cameras. They have microphones too. Every conference room, every worship space, every broadcast studio, every live event—they all capture audio alongside video.

If VLMs are the eyes of an AI system, speech-to-text models like Whisper are the ears.

And when you combine eyes and ears, things get interesting.

## AV Systems as Eyes and Ears for AI

This is something I want you to think about as we continue through this book: ProAV systems are already deployed everywhere, capturing video and audio 24/7. Conference rooms. Classrooms. Sanctuaries. Studios. Stadiums. Retail stores. Hospitals.

All of that audiovisual data is mostly unused. We record it, maybe. We stream it, sometimes. But we rarely analyze it in real-time to understand what's happening and take action.

Visual reasoning changes that equation. Suddenly, that camera feed isn't just pixels—it's data that an AI can understand. "There are three people in the conference room." "The presenter just stepped away from the podium." "Someone entered the restricted area."

Add audio understanding, and the picture gets richer. "Someone said 'let's start the meeting.'" "The speaker asked for questions." "There's applause from the audience."

Now imagine combining both. The system sees three people enter a conference room AND hears someone say "I want to host a meeting." That's much more confident signal than either one alone. The system can turn on the display, switch to the correct input, adjust the lighting—all triggered by understanding both what it sees and what it hears.

This is called multimodal AI—systems that process multiple types of input (modes) together. And ProAV infrastructure is perfectly positioned to feed these systems, because we already have the cameras and microphones deployed.

## Demuxing: Splitting Audio and Video

Here's a technical concept we'll explore in depth later, but I want to plant the seed now: demuxing.

Most AV signals combine audio and video together. An HDMI cable carries both. An NDI stream contains both. A video file has both tracks embedded.

Demuxing is the process of separating these streams—pulling apart the audio and video so they can be processed independently. You send the video frames to a vision model. You send the audio to a speech model. Each AI does what it's best at.

Then you bring the results back together. The vision model says "person detected in zone A." The speech model says "someone said 'start recording.'" Your automation logic combines these signals and decides what to do.

This separation is important because video and audio models work differently. Video models analyze images—single frames or sequences of frames. Audio models analyze waveforms over time. They're fundamentally different types of data requiring different types of processing.

In the later chapters on multimodal systems, we'll build exactly this kind of architecture. You'll learn how to demux an incoming stream, route audio and video to different AI models, and fuse the results into intelligent automation.

For now, just understand the concept: ProAV systems capture both video and audio. Modern AI can understand both. The magic happens when you combine them.

## The Collision That Started a Movement

I mentioned in Chapter 1 that visual reasoning wasn't just one breakthrough—it was a collision of multiple breakthroughs happening at the same time.

Within a few short months, we saw:

- Vision Language Models like Moondream becoming affordable and accessible
- Open-source audio models like Whisper making speech understanding trivial
- Agentic coding tools like Cursor making development accessible to non-programmers
- AI harnesses emerging that could guide these tools toward specific industry needs

All of these technologies arriving together is what made us realize this is more than making a single product. We need to help start a movement inside the ProAV and broadcast industry.

The foundational technology—the VLM—is what makes visual reasoning possible. The audio models give us the other half of the sensory picture. And the surrounding ecosystem of tools is what makes it accessible to people who aren't machine learning engineers. That's the combination that changes everything.

## What You Now Understand

After this chapter, you should be able to:

- Explain the difference between traditional CV, LLMs, and VLMs in plain language
- Understand why VLMs are a breakthrough for ProAV and broadcast
- Recognize the trade-offs between specialized and general-purpose AI
- Make informed decisions about which technology fits which use case
- Articulate why visual reasoning matters to colleagues and customers

This is the conceptual foundation for everything that follows. We're done with pure theory—from here on, we're building.

---

*Chapter 5: Models, APIs, and Getting Access — understanding cloud versus local, API keys, and the practical choices you'll need to make.*
