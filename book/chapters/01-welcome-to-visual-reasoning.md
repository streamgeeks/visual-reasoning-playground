# Part I: See It In Action

# Chapter 1: Welcome to Visual Reasoning

The first thing we thought was wow.

I was standing in the PTZOptics R&D Lab in Downingtown, Pennsylvania, watching something I didn't think was possible. Matthew Davis, my Co-CEO and partner of almost 20 years, had something he wanted to show me. Matt and I have spent two decades arguing about the best new technologies and where our industry is headed. We don't always agree, but when Matt tells me I need to see something, I pay attention.

He pulled up a demo on his screen. "Watch this," he said.

On the screen was a live video feed with a bounding box around a coffee mug. Nothing special—I'd seen object detection before. But then Matt typed "red pen" into a text field, and the system immediately found and highlighted the red pen on the desk. He typed "Matt's left hand." Found it. "The PTZOptics camera in the corner." Found it.

I couldn't believe it.

"Now watch this," Matt said. He connected the detection output to one of our PTZ cameras. The camera started tracking the coffee mug, keeping it centered in frame as he moved it around the room. Then he switched to tracking his face. Then back to the mug. No retraining. No uploading thousands of images. No waiting for a model to compile.

The software was called Moondream, a new Vision Learning Model that was completely open source. And it changed everything I thought I knew about what was possible.

## The Problem I'd Been Living With

To understand why this moment hit me so hard, you need to understand what I'd been doing for years before it.

I was an existing Roboflow customer. I'd spent years developing computer vision models—real ones, with enterprise accounts and custom training pipelines. I'd built some pretty amazing things. We had a model that could track a basketball. Another that could follow a laser pointer. These weren't toys; they were production systems that actually worked.

But here's the thing about traditional computer vision: every new object requires a new model. Want to track a basketball? Train a model on thousands of basketball images. Want to track a laser pointer? Start over. Train a new model. Want to track a person's face? Another model. A horse? Another model.

Our PTZOptics cameras ship with built-in computer vision models that can track a subject, and we can do that really well. But we understand the world is a big place. Our customers were asking to track horses, to track specific products on assembly lines, to track their pastor walking across a stage. Each request meant either saying "we can't do that" or embarking on a months-long model training project.

I eventually realized it wasn't scalable for our customers.

The models I'd built with Roboflow were impressive, but they were locked and proprietary. There's a big difference between a locked-down model you've licensed and an open-source model you can run anywhere. I'd even custom-coded a PTZ tracking solution with those computer vision models. It worked. But it couldn't scale.

## The Breakthrough

The interesting thing about a Vision Learning Model is that you do not need to train a computer vision model. The vision model already has billions of parameters we can use to understand what it's seeing.

Read that again, because it's the core insight of this entire book.

Traditional computer vision says: "Show me 10,000 pictures of basketballs, and I'll learn to recognize basketballs."

A Vision Learning Model says: "I already understand what things look like. Just tell me what you're looking for."

The scalability of "track anything" versus "build a unique computer vision model for each application" was what interested me. But there was something bigger happening.

Imagine you're filming a jazz quartet. The saxophone player starts a solo. Without anyone touching a control, your PTZ camera smoothly zooms in on the saxophonist. When the solo passes to the pianist, the camera finds the piano. The drummer takes a fill—and there's the drummer. The system is listening to the music and watching the stage simultaneously, understanding which instrument is playing and finding it visually.

This isn't science fiction. This is what visual reasoning combined with audio makes possible. And we'll build exactly this system together in this book.

## The Collision

Around the same time Matt was showing me Moondream, something remarkable was happening in the technology world. Within just a few short months, we saw:

- **AI agentic coding tools** like Cursor becoming genuinely useful for non-programmers
- **AI harnesses** emerging that could guide these tools toward specific industry needs
- **Open-source vision models** like Moondream becoming affordable and accessible
- **Open-source audio models** like Whisper making speech understanding trivial

All of these technologies arrived at roughly the same time. It wasn't just one breakthrough—it was a collision of breakthroughs.

This made us realize something important: this is more than us making a single product. We need to help start a movement inside the ProAV and broadcast industry.

## The Team Behind Visual Reasoning

I need to tell you about Brian Mulcahy, because he deserves credit for what we're building.

Brian was already innovating at PTZOptics internally, helping our company adopt AI workflows of all kinds. He had years of experience using AI, creating custom models, and implementing image and video AI projects. While Matt was showing me Moondream, Brian was digging deeper into agentic coding and asking a different question: How do we make this accessible to AV professionals who aren't programmers?

Brian had the idea of creating the industry's first Visual Reasoning Harness.

Here's the problem Brian was solving: AI agentic coding systems lack reference. They have issues completing tasks because they don't understand the specific needs of our industry. We want to onboard AV and broadcast engineers who understand the gear, the installation, and often the customer intent—but who are not computer programmers.

While there are many great AI coding tools, we found that the Visual Reasoning Harness provides incredible gains for those in our industry. It provides guidelines for ProAV and Broadcast engineering best practices and reference points that make building more accurate and easier to grow into our industry-specific applications.

Some of the world's very first AI harnesses were just coming out by the end of 2025, and in this book you'll learn why they're so valuable.

## Meeting the Moondream Team

I immediately scheduled a meeting with the Moondream team to discuss the future of this technology.

I met with Jay and Vik, and the first thing I did was ship them a PTZOptics camera. I wanted them to see what we were building and understand our use cases firsthand.

I was struck by their optimism about what small teams can achieve together and their willingness to help build out early adopter case studies. In a world of massive flagship AI models requiring billions of dollars to train, they had decided to create something different: a tiny but powerful vision learning model that would be affordable to use and valuable in the scenarios ProAV and Broadcast users actually need.

They told me that while Moondream can only process a single frame image at a time, there are creative ways to use it for live video. They shared ideas like creating a "postage stamp" of frames over time—a grid of images that allows the VLM to interpret changes across time. There are a lot of programming ideas they freely shared with us that I'll share in this book.

I really liked that we can keep the costs manageable so that this technology can scale. At the time I'm writing this, Moondream gives away 5,000 API calls a day for free. They also offer a free open-source version that you can run locally on a computer, which means you can remain HIPAA compliant and have maximum privacy for sensitive deployments. But you also have the cloud option for low-compute scenarios and easy testing—which is perfect for this online course.

## What You'll Build in This Book

Let me show you what's possible.

By the end of this book and the accompanying online course, you'll have access to a complete Visual Reasoning Playground—a collection of open-source tools and code examples that you can fork, customize, and adapt to create your own applications. Everything we build together will be available on GitHub, and I mean everything. The code is yours to take, modify, and make your own.

Here are some of the starting points we'll explore:

- **Describing scenes** — Point a camera at anything and get a natural language description of what's happening
- **Drawing detection boxes** — Locate and highlight any object you can describe in words
- **Tracking any object** — Make a PTZ camera follow whatever you tell it to follow
- **Counting things** — Track objects entering or leaving a space over time
- **Analyzing scenes** — Ask questions about what the camera sees and get intelligent answers
- **Monitoring zones** — Define areas and trigger actions when activity happens inside them
- **Matching colors and styles** — Compare camera outputs to reference images
- **Combining audio and video** — Build systems that see and hear, responding to both
- **Concert camera automation** — Listen to music, detect which instrument is soloing, and automatically track that performer with your PTZ camera

But here's the important part: these are starting points, not finished products. The real power of visual reasoning is that you can build *anything*. Once you understand how to connect a vision model to your cameras and your production systems, the applications are limited only by what you can imagine.

**Why We Show Business and Personal Examples**

Every concept in this book comes with two examples: one for business, one for personal use.

There's a reason for this. When you use AI in your personal life—asking it what's in your fridge, having it track your dog with a pet camera, setting up a driveway alert—you start to internalize how the technology thinks. You experiment more freely. You make mistakes without consequences. You develop intuition.

That intuition is exactly what you need when you're designing a system for a client or your employer. The person who has built a "what can I cook tonight" system at home will immediately see how to build a patient monitoring system for a hospital. The person who set up zone alerts for their driveway will know exactly how to approach warehouse safety monitoring.

By using AI in your personal life, you reinforce the rethinking of your business tools. The technology is the same. The patterns are the same. Only the stakes are different.

So throughout this book, when I show you something for healthcare or manufacturing or broadcast production, I'll also show you the personal equivalent. Learn both. Build both. The skills transfer directly.

## Who This Book Is For

I've written over ten books on audio visual and live streaming technology. The Unofficial Guide to NDI. The Unofficial Guide to vMix. The Unofficial Guide to Open Broadcaster Software. Helping Your Church Live Stream. Sports Video. Remote Production. Every year at IBC or NAB or InfoComm, people come up to me saying they read one of my books or took one of the courses. All my books have an online course I make available for free on YouTube.

And that makes me proud.

This book continues that tradition, but it's different. This isn't just about operating equipment or configuring software. This is about understanding a technology that will transform our entire industry.

You don't need to be a programmer. The Visual Reasoning Harness and tools like Cursor will help you build things you never thought possible. You don't need a background in AI or machine learning. I'll explain everything from the ground up.

What you need is curiosity and a willingness to experiment.

This book is for:

- **ProAV integrators** who know customer needs well enough to build custom solutions
- **Broadcast engineers** who understand the gear and the installation
- **DIY live streamers** who want to level up their productions
- **IT professionals** looking to add AV intelligence to their systems
- **AV professionals** who see AI coming and want to get ahead of it

The common thread? You understand the equipment. You understand what your customers or viewers need. You might not be a programmer—and that's okay. That's exactly who this book is for.

## The Vision: Where This Is All Going

I see AV systems becoming the eyes and ears to modern AI systems.

The idea of an AI system will change over time. They won't all be in the cloud. There will be private and secure local AI models trained specifically for what the Broadcast and ProAV industry needs. The automation will appear seamless to end users—they won't even know AI is involved.

Here's what I believe: any area of ProAV systems where there is friction—users not knowing how to use equipment, things not being set up properly, cameras pointed at the wrong thing, audio levels that are wrong—will be automated with AI using data sources like video and audio to understand what's going on.

There will be new use cases that continue to improve, sometimes reaching a tipping point beyond early adopters and truly having an impact. This will be transformative.

But transformation requires education and empowerment. That's core to what we do at PTZOptics and StreamGeeks, and VisualReasoning.ai will be the next leg of this journey for us.

## How to Use This Book

This book is designed to work alongside the online course at VisualReasoning.ai. Here's how they fit together:

**The Book** gives you the concepts, the context, and the "why." It's designed for reading—large text, clear explanations, stories that help the ideas stick. Read it on your commute. Read it before bed. Read it when you want to understand the bigger picture.

**The Online Course** gives you the hands-on practice. Video walkthroughs, step-by-step exercises, and the chance to see these tools working in real time.

**The GitHub Repository** gives you the code. Every tool in this book has working code you can fork, modify, and make your own. The Visual Reasoning Playground is designed to be a starting point, not a finished product.

You don't need to go in order. If you want to jump straight to building the Auto-Tracker, go for it. If you want to understand the theory first, start at the beginning. The book is organized so each chapter builds on the last, but every chapter is also designed to stand alone.

## Let's Dig In

With all that being said, our team got together and realized that Visual Reasoning technology has what it takes to transform our entire ProAV and Broadcast industry.

After writing over ten books on audio visual and live streaming technology, I knew that educating our partners and customers on this technology would be a rewarding experience. My goal with this book is to empower you, the reader, with all of the insights and educational experience I've had as the CEO of a global technology company, dedicated to understanding the impacts of this special technology on the incredible industry we're a part of.

So with that being said, let's dig in to Visual Reasoning AI for Broadcast and ProAV.

---

*In Chapter 2, you'll run your first visual reasoning query—no code required. Just your browser, a webcam, and the VisualReasoning.ai website. Within minutes, you'll see AI describing what your camera sees. Let's go.*
