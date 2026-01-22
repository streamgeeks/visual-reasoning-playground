# Chapter 19: Agentic Coding with Cursor

I want to tell you about the moment that changed how I think about programming.

It was late 2024, and I was in the PTZOptics R&D lab with Brian Mulcahy. We were trying to build a new feature for our auto-tracking system. The traditional approach would have been: read the documentation, write the code line by line, test it, debug it, repeat. I'd been doing that for years.

Brian opened Cursor, typed a single sentence describing what we wanted, and hit enter.

The AI started writing code. Not just snippets—entire functions. It understood our project structure. It knew what imports we needed. It handled error cases I hadn't even thought about yet.

Within twenty minutes, we had a working prototype of something that would have taken me a full day to write manually.

"This is agentic coding," Brian said. "The AI isn't just autocompleting. It's acting as an agent—understanding context, making decisions, and building complete solutions."

I couldn't believe it.

## What is Agentic Coding?

Agentic coding is a fundamental shift in how we build software.

Traditional coding with AI assistance looks like autocomplete on steroids. You type the beginning of a function and the AI suggests the rest. Helpful, but you're still doing most of the work.

Agentic coding is different. You describe what you want in natural language, and the AI acts as an agent—a collaborator that:

- Understands your entire codebase, not just the current file
- Makes decisions about architecture and implementation
- Writes complete, working code across multiple files
- Handles edge cases and error handling
- Explains its reasoning so you can verify

The difference is like giving someone directions turn by turn versus telling them the destination and letting them figure out the route.

With turn-by-turn, you're doing all the thinking. With the destination approach, you're collaborating with someone who has their own intelligence and can make smart decisions along the way.

## Why This Matters for Visual Reasoning

Here's the interesting thing about visual reasoning systems: they sit at the intersection of multiple domains.

To build a complete system, you need to understand:
- Vision model APIs and their quirks
- Video processing and frame capture
- Camera control protocols
- Production software integration (vMix, OBS)
- Web technologies for interfaces
- Real-time processing considerations

No one person is an expert in all of these. Traditional development meant spending hours reading documentation, writing boilerplate, and debugging integration issues.

Agentic coding tools like Cursor have been trained on all of this. When you describe what you want to build, they draw on knowledge spanning every domain your project touches.

Combined with the Visual Reasoning Harness from Chapter 18, you get domain-specific knowledge about ProAV and broadcast. The harness provides the patterns and integrations. Cursor helps you implement them correctly.

This is "the collision" I mentioned in Chapter 1. Agentic coding tools, industry-specific harnesses, and powerful open-source models—all available at the same time. This combination is what makes building visual reasoning systems accessible to people who aren't full-time programmers.

## Begin with the End in Mind

Here's the mindset shift that matters most: **because we no longer struggle through writing code the way we used to, we should focus our creative energy on defining done.**

What does "done" actually look like for your customer? What would make this project completely finished—not just functional, but genuinely complete?

This is where your real thinking should be.

In the old world, so much mental energy went into implementation. How do I connect to this API? How do I handle this edge case? How do I structure this data? You'd spend hours—sometimes days—just getting the plumbing to work. By the time you had something functional, you were exhausted. "Good enough" became the standard because you'd already invested so much effort.

Agentic coding changes that equation. The implementation struggle is largely handled. Cursor can figure out the API connection. It can handle the edge cases. It can structure the data. That frees you to think about what actually matters: the outcome.

**Ask different questions:**

Instead of "How do I build this?" ask:
- What would make the customer say "This is exactly what I needed"?
- What's the experience from their perspective, not just the feature list?
- What would they show their colleagues? What would make them proud to demo it?
- Six months from now, what would make them glad they chose this solution?

Instead of "What's the minimum viable product?" ask:
- What's the complete vision?
- If implementation weren't a constraint, what would we build?
- What are we leaving out only because it seems hard—and is it actually hard with these tools?

**Define done before you start:**

Before opening Cursor, write down what "completely done" looks like. Not the technical requirements—the human outcomes.

"Done" for a worship automation system might be: "The production team can focus entirely on the service instead of camera operations. Transitions feel intentional, not robotic. The pastor never notices the technology—they just know the broadcast looks professional. Setup takes five minutes on Sunday morning."

"Done" for a sports graphics system might be: "Scores update within two seconds of the actual play. Graphics match the broadcast's visual style perfectly. The operator hasn't touched the score bug manually in three games. Parents watching the stream see the same quality as a professional broadcast."

When you define done at this level, you're thinking about value, not features. You're thinking about the human experience, not the technical implementation.

**Why this matters now:**

This shift is only possible because implementation got easier. When coding was hard, you had to be pragmatic. You couldn't afford to dream big because every feature was expensive.

Now you can afford to dream. The question isn't "Can we build it?" The question is "Should we build it? Will it matter?"

That's a much better question to be asking.

## Getting Started with Cursor

Cursor is an AI-powered code editor built on VS Code. If you've used VS Code, Cursor will feel familiar. The difference is the AI integration.

Download Cursor from cursor.com and install it like any other application. When you first open it, you'll be prompted to create an account. The free tier is generous enough for learning.

**The key interfaces:**

1. **Chat panel:** Have a conversation with the AI about your code. Ask questions, request changes, get explanations.

2. **Inline editing:** Select code and ask the AI to modify it. "Make this function handle errors better" or "Add logging here."

3. **Composer:** Create new files or make changes across multiple files. This is where agentic coding really shines.

## The Art of Prompting

Agentic coding is a conversation. The quality of what you get depends heavily on how you communicate.

**Vague prompts produce vague results:**
"Make it work better" gives the AI nothing to work with.

**Specific prompts produce specific results:**
"The camera movement looks choppy. Add smoothing to the PTZ commands so movements are more fluid." tells the AI exactly what problem to solve.

**Great prompts include context:**
- Which file or files you're working with
- What the current problem is
- What solution you want
- Any specific parameters or constraints
- References to existing code that shows the style you want

The more context you provide, the better the AI can help you.

## Working with the Harness

When you combine Cursor with the Visual Reasoning Harness, you unlock a powerful workflow.

**Adding new capabilities:**
Instead of reading documentation and writing boilerplate, you describe what you want. "Add support for Elgato capture cards as a new input source. Follow the same pattern as the webcam adapter." Cursor will study your existing code and generate something consistent.

**Extending features:**
"When a person enters the stage zone, switch to camera 2 and display their name as a lower third." Cursor understands the harness's patterns and generates appropriate code.

**Debugging issues:**
"This detection is firing too frequently. Help me add debouncing so it only triggers once per event." Cursor can analyze the existing code and suggest appropriate modifications.

## What Cursor Does Well

**Understanding context:** Cursor reads your entire project. It knows what functions exist, what patterns you use, and what conventions you follow.

**Writing boilerplate:** The tedious parts of coding—setup, error handling, type definitions—Cursor handles well.

**Integration code:** Connecting APIs, parsing responses, handling edge cases—Cursor has seen thousands of examples.

**Explaining code:** Ask Cursor to explain what a section of code does, and it will walk you through it.

## What Still Requires Human Judgment

**Architecture decisions:** Cursor can implement what you describe, but you need to decide what to build.

**Business logic:** The specific rules of your application—when to trigger actions, what thresholds to use—require domain knowledge.

**Testing and validation:** Cursor can write tests, but you need to verify they test the right things.

**Edge cases:** Unusual scenarios specific to your deployment need human attention.

**Taste:** What feels right, what looks good, what users will appreciate—these are human judgments.

Think of Cursor as a very smart assistant who can execute quickly but needs direction on what matters.

## The Workflow

Here's how I work with Cursor now:

1. **Plan:** Think about what I want to build. What's the goal? What are the pieces?

2. **Describe:** Write a clear description for Cursor. Include context and constraints.

3. **Review:** Read what Cursor generates. Does it make sense? Does it follow the patterns?

4. **Test:** Run the code. Does it work? What breaks?

5. **Iterate:** Describe what's wrong or what needs to change. Let Cursor help fix it.

6. **Refine:** Once it's working, describe improvements. "Add better error messages." "Make this more efficient."

This loop is much faster than traditional development, but you're still in control. You're directing, reviewing, and deciding. Cursor is executing.

## Common Pitfalls

**Accepting without understanding:** If Cursor generates something you don't understand, ask it to explain. Don't ship code you can't reason about.

**Fighting the AI:** If Cursor keeps suggesting something different from what you want, step back. Maybe its suggestion is better, or maybe you need to be clearer about your requirements.

**Over-relying on generated code:** Cursor is a tool, not a replacement for understanding. Learn the concepts, not just the keystrokes.

**Ignoring context:** Cursor works best when it has context. Reference existing files, explain constraints, describe the bigger picture.

## This Book and Agentic Coding

Throughout this book, I've been giving you prompts you can use with Cursor:

- "Build a basic scene describer that shows what the camera sees"
- "Add zone monitoring with configurable trigger areas"
- "Connect this to vMix so it switches cameras based on detection"

These aren't just examples—they're starting points for your own projects. Take them, modify them, build on them. That's how agentic coding works.

## What's Next

You understand agentic coding and how to use it with the Visual Reasoning Harness. In the next chapter, we'll see visual reasoning applied across different industries—from sports broadcasting to houses of worship to corporate environments.

---

*Chapter 20: Applied Ideas Across Industries — practical applications for sports, worship, education, and corporate settings.*
