# Chapter 5: Models, APIs, and Getting Access

You've used visual reasoning through VisualReasoning.ai. You understand the difference between VLMs and traditional computer vision. Now it's time to understand the practical choices you'll face when building real systems: Where does the AI actually run? How do you access it? What does it cost?

These aren't just technical questions—they're business decisions that affect privacy, reliability, cost, and scalability. Let's work through them.

## The Two Models You'll Use

Before we dive into cloud versus local deployment, let me introduce you to the two AI models at the heart of this book:

**Moondream** is a Vision Language Model (VLM). It looks at images and answers questions about what it sees. When you ask "what's in this scene?" or "where is the person standing?"—that's Moondream at work.

**Whisper** is a Speech-to-Text model. It listens to audio and converts spoken words into text. When you want to understand what someone is saying—to extract commands, identify speakers, or transcribe speech—that's Whisper.

Here's what's remarkable: **both of these models are open source and can run locally.** You can download them, run them on your own hardware, and never send a single byte of data to anyone's servers. Or you can use them through cloud APIs for convenience. The choice is yours.

This flexibility is game-changing for ProAV. In Chapter 14, we'll combine these models—Moondream watching what's happening visually, Whisper listening to what's being said—to create truly intelligent systems. A concert camera that follows the music. A conference room that responds to voice commands. A broadcast system that understands both what it sees and what it hears.

But first, let's understand the fundamental choice: where does the AI actually run?

## Cloud Models vs. Local Models

When you use VisualReasoning.ai, your images are sent to a cloud service where the Moondream model runs on remote servers. This is a cloud model—the AI runs somewhere else, and you access it over the internet.

The alternative is a local model—the AI runs on your own hardware, in your own facility, under your own control.

Both approaches work. Both have trade-offs.

### Cloud Models

**How it works:** You send an image to an API endpoint. The cloud service runs the model on their servers. They send back the results. You never touch the actual AI model—you just use it as a service.

**Advantages:**
- **Easy to start.** No hardware to buy, no software to install. Sign up, get an API key, start making queries.
- **Always up to date.** The provider maintains the model and infrastructure. When they improve it, you benefit automatically.
- **Scales effortlessly.** Need to process more images? Just make more API calls. The cloud handles the capacity.
- **Low upfront cost.** You pay per use rather than investing in hardware.
- **No compute requirements.** This is huge for learning. You don't need a powerful computer. That five-year-old laptop? It works fine—all the heavy processing happens in the cloud.

**Disadvantages:**
- **Ongoing costs.** Every API call costs money. High-volume applications can get expensive.
- **Internet dependency.** If your connection goes down, your AI goes down.
- **Privacy concerns.** Your images travel to someone else's servers. For sensitive applications, this may be unacceptable.
- **Latency.** The round trip to the cloud and back takes time. For real-time applications, this can matter.

### Understanding "Compute"

You'll hear this term constantly in AI discussions: "compute." What does it actually mean?

Compute refers to the processing power needed to run AI models. These models perform billions of mathematical operations to analyze an image or transcribe audio. That takes serious hardware—typically a graphics card (GPU) with lots of memory and processing power.

**Cloud compute** means someone else owns that hardware. You're renting their processing power by the query. Great for learning, prototyping, and moderate-volume applications. You don't need to buy anything except an internet connection.

**Local compute** means you own the hardware. You need a capable machine—typically one with a dedicated GPU. Once you have it, queries are essentially free. Run as many as you want.

Here's the practical reality: **for learning this book, cloud is perfect.** You don't need to invest in hardware. You don't need to understand GPU specifications. Just get API keys and start experimenting.

Later, when you're building production systems for clients, the economics might favor local deployment. We'll discuss that when we get there. For now, cloud compute lets you focus on learning without hardware investments.

### Local Models

**How it works:** You download the model and run it on your own computer or server. Everything stays on your hardware. No data leaves your facility.

**Advantages:**
- **Complete privacy.** Images never leave your network. Essential for healthcare, legal, government, and other sensitive environments.
- **No per-query costs.** Once you have the hardware, queries are essentially free. Run millions of them.
- **No internet required.** Works in air-gapped environments or locations with unreliable connectivity.
- **Lower latency.** No round trip to the cloud means faster response times.
- **100% uptime independence.** Your AI keeps working even when AWS goes down, when the internet is spotty, or when you're in a basement with no signal.

**Disadvantages:**
- **Hardware investment.** You need capable hardware—usually a decent GPU. This costs money upfront.
- **Setup complexity.** Installing and configuring local models requires more technical skill.
- **Maintenance burden.** You're responsible for updates, security, and keeping everything running.
- **Fixed capacity.** Your hardware can only handle so much. Scaling means buying more hardware.

### Why Small Models Can Be Better

Here's something that surprises people: **the best model isn't always the biggest model.**

You've probably heard about GPT-4, Claude, Gemini—these massive models with hundreds of billions of parameters. They're incredibly capable. They're also incredibly expensive to run, require massive hardware, and are only available through cloud APIs.

Moondream takes a different approach. It's designed to be small but powerful—specifically optimized for visual understanding tasks. Why does this matter?

**Lower compute requirements.** Moondream can run on hardware that would choke on larger models. A decent laptop GPU can handle it. An embedded system at a venue can handle it. A mini PC tucked behind a display can handle it.

**Faster response times.** Smaller models run faster. When you're tracking objects in real-time or making split-second camera decisions, milliseconds matter.

**Lower costs.** Whether cloud or local, smaller models cost less to run. The API calls are cheaper. The hardware requirements are lower.

**Focused capability.** Moondream doesn't try to do everything. It focuses on visual understanding. For our use cases—understanding what cameras see—that focus is exactly what we need.

This is why we built this book around Moondream rather than a flagship model. It's not about having the "best" AI in some abstract sense. It's about having the right AI for real-world ProAV applications where cost, speed, and deployability matter.

### When to Use Each

Here's my practical advice:

**Use cloud models when:**
- You're learning, prototyping, or experimenting
- You have low to moderate query volumes
- You need the latest model capabilities
- Privacy isn't a primary concern
- You want the simplest possible setup

**Use local models when:**
- Privacy is critical (healthcare, legal, government)
- You need HIPAA compliance or similar regulatory requirements
- You have high query volumes that would be expensive in the cloud
- You need to operate without internet connectivity
- Latency is critical for your application
- You're doing professional AV installations where reliability is non-negotiable

**The Professional AV Case for Local:**

Let me paint a picture familiar to anyone who's done AV integration work.

You're installing a system in a corporate headquarters. The client wants AI-powered camera automation for their boardroom. Everything works perfectly during commissioning. Then, six months later, the client calls in a panic: "The system is broken!"

What happened? Their IT department updated firewall rules. Or the cloud service had an outage. Or the building's internet went down during a power event. Or they changed ISPs and forgot to whitelist the API endpoints.

**None of this is your fault, but it's your problem.**

With local models, the AI runs on hardware you installed. It doesn't need internet. It doesn't care about firewall rules. It doesn't go down when AWS has a bad day. When the client calls, you can confidently say: "The AI processing is entirely local. Let's check the network switch instead."

For professional installations—especially ones with service contracts—local deployment isn't just about cost or privacy. It's about reliability, supportability, and sleeping well at night.

**Use both when:**
- You want to prototype in the cloud, then deploy locally
- You have some applications that need privacy and others that don't
- You want cloud as a backup when local capacity is exceeded

When I met with Jay and Vik from the Moondream team, this flexibility was one of the things that impressed me most. They offer a cloud API for easy testing and development, but they also provide a completely free, open-source version you can run locally. You can develop in the cloud, then deploy on-premise for production. That's the best of both worlds.

## What Is an API Key?

You've seen the term "API key" throughout this book. Let's make sure you understand what it actually is.

An API (Application Programming Interface) is a way for software to talk to other software. When you use VisualReasoning.ai, the website is making API calls to Moondream's servers. When you build your own applications, your code will make API calls directly.

An API key is your credential—proof that you're authorized to use the service. It's like a password, but for software rather than humans.

When you sign up for a service like Moondream, you get an API key. Your software includes this key in every request. The service checks the key, confirms you're a valid user, and processes your request.

### API Key Security

This is important: **treat your API key like a password.**

If someone gets your API key, they can make requests as you. They can run up charges on your account. They can access any data the API provides.

Basic security practices:
- **Never put API keys in code that gets shared publicly.** If you post code on GitHub with your API key in it, anyone can use your key.
- **Use environment variables.** Store your key in a configuration file or environment variable, not in the code itself.
- **Rotate keys periodically.** Most services let you generate new keys. If you think a key might be compromised, create a new one and delete the old one.
- **Use separate keys for different purposes.** Have one key for development, another for production. If your development key leaks, your production system isn't affected.

For the exercises in this book, you don't need to worry too much—you're learning, not deploying production systems. But build good habits now. When you're building real applications for real customers, key security matters.

## Why Moondream?

There are many vision language models available. GPT-4V from OpenAI. Claude with vision from Anthropic. Gemini from Google. LLaVA. CogVLM. Dozens more.

We built this book and course around Moondream for specific reasons:

**It's designed for our use case.** When I talked to the Moondream team, they explained their philosophy: in a world of massive flagship models, they decided to create something tiny but powerful. A model that would be affordable for real-world applications, not just impressive demos.

**It's affordable.** At the time I'm writing this, Moondream gives away 5,000 API calls per day for free. That's enough to experiment extensively, build prototypes, and even run small production systems without paying anything. When you do need to pay, the pricing is designed to be sustainable for actual business use.

**It's open source.** The model itself is open source, which means you can download it and run it locally. No licensing fees. No vendor lock-in. If Moondream the company disappeared tomorrow, you'd still have the model.

**It's designed for edge deployment.** Moondream is built to run on modest hardware. You don't need a data center GPU cluster. A reasonably modern computer with a decent graphics card can run it. This makes local deployment practical for real-world ProAV installations.

**The team understands our industry.** When I shipped them a PTZOptics camera and explained our use cases, they got it. They shared programming ideas for using single-frame models with live video. They understood why privacy and cost matter for ProAV professionals.

Could you use a different model? Absolutely. The concepts in this book apply broadly. But for the hands-on exercises and code examples, we use Moondream because it hits the sweet spot of capability, cost, and accessibility.

## Understanding Costs

Let's talk about money, because it matters.

### Cloud API Costs

Cloud AI services typically charge per request or per token. For vision models, you're usually paying per image processed.

Moondream's free tier gives you 5,000 API calls per day. That's:
- 5,000 images analyzed
- About 3.5 images per minute continuously
- More than enough for learning and prototyping

For production use beyond the free tier, you'll pay per call. The exact pricing may change, so check their current rates, but the model is designed to be affordable for real applications.

Here's how to think about costs for a production system:

**Low volume (security camera checking every 30 seconds):**
- 2 calls per minute × 60 minutes × 24 hours = 2,880 calls/day
- Fits comfortably in the free tier

**Medium volume (retail analytics every 5 seconds):**
- 12 calls per minute × 60 × 24 = 17,280 calls/day
- Exceeds free tier; budget for paid usage

**High volume (real-time tracking at 1 call/second):**
- 86,400 calls/day
- Significant cost; consider local deployment

The math isn't complicated. Figure out your query rate, multiply it out, and compare to pricing tiers. For high-volume applications, local deployment often makes more economic sense.

### Local Deployment Costs

Running models locally has different economics:

**Upfront costs:**
- Hardware capable of running the model (varies widely based on performance needs)
- Time to set up and configure

**Ongoing costs:**
- Electricity
- Maintenance and administration time
- Hardware replacement/upgrades

**Per-query cost:** Essentially zero once you have the hardware

For applications with high query volumes, local deployment can be dramatically cheaper over time. The break-even point depends on your specific volumes and the hardware you need.

## Getting Your API Keys

Let's get you set up with API keys for both Moondream (vision) and OpenAI (for Whisper audio transcription). Yes, both. You'll need them as we progress through the book, and it's easier to set them up now while we're in configuration mode.

### Moondream API Key (Vision)

**Step 1:** Go to console.moondream.ai

**Step 2:** Create an account or sign in

**Step 3:** Navigate to API Keys

**Step 4:** Generate a new API key

**Step 5:** Copy the key and store it safely

This key gives you access to Moondream's cloud API—the vision model that looks at images and answers questions about what it sees.

### OpenAI API Key (Whisper Audio)

For audio transcription, we use Whisper through OpenAI's API. While Whisper can run locally (it's open source!), the cloud API is the easiest way to get started.

**Step 1:** Go to platform.openai.com

**Step 2:** Create an account or sign in

**Step 3:** Navigate to API Keys (under your profile menu)

**Step 4:** Create a new secret key

**Step 5:** Copy the key and store it safely

**Step 6:** Add payment method and set usage limits

OpenAI requires a payment method on file. I recommend setting a monthly spending limit (Settings > Limits) while you're learning—$10-20 is plenty for working through this book.

### Storing Your Keys Safely

You now have two API keys. Treat them like passwords:

- **Never put them in code that gets shared.** If you post code on GitHub with your API key in it, bots will find it within minutes and rack up charges on your account.
- **Use a password manager.** 1Password, Bitwarden, LastPass—whatever you use for passwords works for API keys too.
- **Use environment variables in your code.** We'll show you how when we start building.
- **Consider separate keys for learning vs. production.** If a learning key gets compromised, your production systems aren't affected.

### Testing Your Moondream Key

Once you have your Moondream key, test it by plugging it into VisualReasoning.ai. There's an option to use your own API key instead of the built-in free tier. Enter your key, run a query, and confirm it works.

This is also useful if you exhaust the 500 free calls on VisualReasoning.ai—you can continue using the platform with your own Moondream key and its 5,000 daily calls.

### Why Two Different Services?

You might wonder: why Moondream for vision and OpenAI for audio? Why not one provider for everything?

The answer is specialization. Moondream is optimized specifically for visual understanding—it's smaller, faster, and cheaper for vision tasks than the big general-purpose models. OpenAI's Whisper is the gold standard for speech recognition—accurate, fast, and handles multiple languages beautifully.

Using the best tool for each job gives you better results at lower cost. As we build more sophisticated systems later in the book, you'll appreciate having specialized models that excel at their specific tasks rather than one model that's mediocre at everything.

## Privacy and Compliance Considerations

I mentioned HIPAA earlier. Let's expand on privacy considerations, because they're important for many ProAV applications.

**Healthcare:** If your cameras might capture patient information, you likely need HIPAA compliance. Sending patient images to cloud APIs may violate regulations. Local deployment keeps everything on-premise.

**Legal:** Law offices, courtrooms, and legal proceedings often have strict confidentiality requirements. Cloud processing may not be acceptable.

**Government:** Many government facilities have security requirements that prohibit sending data to external services. Local deployment is often mandatory.

**Corporate:** Even without regulatory requirements, many businesses don't want their internal operations analyzed by external services. A camera pointed at a whiteboard with proprietary information probably shouldn't send images to a cloud API.

**Education:** Schools face FERPA and other regulations around student privacy. Cameras in classrooms may capture student faces and activities.

The good news is that local deployment addresses all of these concerns. When the model runs on your hardware and images never leave your network, most privacy and compliance issues disappear.

This is why I was so pleased that Moondream offers both options. You can learn and prototype with the convenient cloud API, then deploy locally when privacy requires it.

## What's Next

You now understand the practical landscape: cloud versus local, API keys, costs, and privacy considerations. You have your own Moondream API key ready to use.

In the next chapter, we'll set up your development environment. You'll install the tools you need to write code that uses visual reasoning—including Cursor, the agentic AI coding tool that makes development accessible even if you're not an experienced programmer.

We're transitioning from using visual reasoning through web interfaces to building with it through code. The concepts you've learned in these first five chapters are the foundation. Now we start building.

---

*Chapter 6: Your Development Environment — setting up Cursor and the tools you need to start building.*
