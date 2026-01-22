# Chapter 6: Your Development Environment

Here's the moment some of you have been dreading: we're going to write code.

Take a breath. It's going to be fine.

If you're an experienced developer, this chapter will be quick. Skim it, make sure you have the tools installed, and move on.

If you've never written code before—if you're an AV integrator or broadcast engineer who knows systems inside and out but has never touched a programming language—this chapter is especially for you. We're going to set up an environment that makes coding accessible, even if you don't think of yourself as a programmer.

The secret weapon? Agentic AI coding tools. They've changed the game for people who understand what they want to build but don't know the syntax to build it. Let's get you set up.

## Your ProAV Knowledge Is Your Superpower

Before we go any further, I need to tell you something important: **you don't need to become a programmer.**

You're reading this book because you want to add AI capabilities to broadcast and ProAV systems. You might be a systems integrator who's been doing this for twenty years. You might be a broadcast engineer who can troubleshoot a signal chain in your sleep. You might have certifications from QSC, Extron, Crestron, PTZOptics, or a dozen other manufacturers.

That knowledge? That experience? It's worth more than any programming degree when it comes to building useful AI systems for our industry.

Here's why: the hard part of visual reasoning isn't the code. The code is actually pretty straightforward—especially with AI tools helping you write it. The hard part is knowing what to build. Understanding what problems actually need solving. Knowing how cameras behave in different lighting. Understanding signal flow and system integration. Recognizing what clients actually need versus what they think they need.

**You already have that knowledge.**

A computer science graduate could spend months learning what you know intuitively about PTZ camera behavior, video production workflows, and real-world deployment challenges. Meanwhile, with the tools we're about to install, you can write working code in an afternoon.

The programmers need to learn your domain. You just need to learn enough code to express your ideas. That's a much shorter journey.

## Industry Certifications Still Matter

Let me be direct: don't let anyone tell you that AI makes your professional certifications obsolete.

When I'm hiring someone to build an AI-enabled system for a house of worship, do you know what I care about? Whether they understand house of worship AV. Whether they've dealt with the specific challenges of that environment—variable lighting, volunteer operators, services that must go on regardless of technical issues.

When I'm building a sports broadcasting system, I want someone who understands broadcast workflows. Who knows what a producer needs. Who can talk intelligently about ISO cameras and replay systems and the thousand details that make live production work.

The AI is a tool. Your QSC certification means you understand how audio systems work. Your Crestron certification means you understand control systems. Your Extron certification means you understand signal distribution. Your PTZOptics certification means you understand camera control protocols.

**Visual reasoning is just another tool in your toolkit.** It doesn't replace your expertise—it amplifies it.

So as we set up your development environment, remember: you're not becoming a programmer who happens to know AV. You're a ProAV professional who's adding AI to their capabilities. That's a very different thing, and it's exactly what our industry needs.

## What You Actually Need

The good news is that you don't need much:

- **A computer.** Windows, Mac, or Linux all work. Nothing fancy required—if your computer can run a web browser smoothly, it can handle what we're doing.

- **An internet connection.** For downloading tools and accessing cloud APIs.

- **A code editor with AI assistance.** This is the key tool. We'll use Cursor, but there are alternatives.

- **A web browser.** Chrome, Edge, Firefox—whatever you prefer.

That's it. You don't need a powerful GPU for the exercises in this book (we're using cloud APIs). You don't need to install complex machine learning frameworks. You don't need a computer science degree.

## Cursor: Your AI Coding Partner

Cursor is the tool that makes this book possible for non-programmers.

It's a code editor—a program where you write and edit code—but with a twist: it has AI built in. You can describe what you want to build in plain English, and Cursor will write the code for you. You can highlight code you don't understand and ask "what does this do?" You can say "this isn't working, fix it" and the AI will debug for you.

This is what we mean by "agentic coding." The AI isn't just autocompleting your typing—it's acting as an agent that can understand your intent and write code to achieve it.

I want to be clear: Cursor doesn't replace understanding. As you work through this book, you'll learn what the code is doing and why. But Cursor dramatically lowers the barrier to entry. You can build working systems while you're still learning, rather than waiting until you've mastered programming.

### Installing Cursor

**Step 1:** Go to cursor.com

**Step 2:** Download the installer for your operating system

**Step 3:** Run the installer and follow the prompts

**Step 4:** Open Cursor and sign in (you can use a free account to start)

When Cursor opens, it looks like a code editor—because it is one. There's a file browser on the left, a main editing area in the center, and various panels you can open. Don't worry about understanding everything yet.

The key feature is the AI chat. You can open it with Ctrl+L (or Cmd+L on Mac) and start talking to the AI about your code.

### Alternatives to Cursor

Cursor is what we recommend and what we'll use in our examples, but it's not the only option:

**VS Code with GitHub Copilot:** Visual Studio Code is a free, popular code editor. GitHub Copilot adds AI assistance. This combination works well, though the AI integration isn't as seamless as Cursor's.

**Kiro:** Amazon's agentic coding tool with strong AI capabilities. Worth exploring if you're in the AWS ecosystem.

**Warp:** A modern terminal with AI built in. Great for command-line work, though it's a terminal rather than a full code editor.

**Windsurf:** Another AI-powered coding environment similar to Cursor.

Any of these will work for the exercises in this book. We'll show examples in Cursor, but the concepts transfer. If you're already comfortable with a different tool, use what you know.

## Working in Natural Language

Here's what makes agentic coding different from traditional programming: you don't need to memorize commands.

In the old days, learning to code meant memorizing syntax, commands, and arcane terminal incantations. You'd spend hours debugging a missing semicolon or trying to remember the right flags for a command.

With tools like Cursor, you work in natural English. You tell the AI what you want to accomplish, and it figures out the technical details.

Want to run a project? Instead of memorizing commands, you can simply ask:

*"How do I start this project?"*

Cursor will tell you—and often offer to run the commands for you.

Want to download code from GitHub? Ask:

*"Help me download the visual reasoning playground from GitHub"*

The AI will walk you through it step by step, or do it for you.

Something not working? Describe the problem:

*"I'm trying to run the tracker but I'm getting an error. Here's what I see..."*

The AI will diagnose and often fix the issue.

This is the paradigm shift. You're having a conversation about what you want to build, not wrestling with command-line syntax. The AI handles the technical translation.

### Terminal Commands: Nice to Know, Not Required

Will you occasionally see terminal commands in this book? Yes. Are there times when knowing a command is useful? Absolutely. But you don't need to memorize anything.

When we do use a command, I'll explain what it does in plain English. And you can always ask Cursor to explain or run commands for you.

The most common things you'll do:
- **Navigate to a folder** — Tell Cursor "open the ptzoptics-tracker folder"
- **Start a project** — Ask "how do I run this project?"
- **Download code** — Ask "help me clone this repository"
- **Install dependencies** — Ask "what do I need to install to run this?"

In every case, you're describing what you want in natural language. The AI translates that into whatever technical steps are needed.

This is why we can teach visual reasoning to AV professionals who've never programmed before. The barrier isn't syntax anymore—it's just understanding what you want to build.

## Getting Code from GitHub

All the code examples for this book are available on GitHub, a platform where developers share and collaborate on code. You'll download our code, run it, modify it, and eventually use it as the foundation for your own projects.

### The Easy Way: Ask Cursor

The simplest approach is to let Cursor handle it. Open Cursor and ask:

*"Help me download the Visual Reasoning Playground from GitHub. The URL is [repository-url]"*

(The actual URL will be provided on VisualReasoning.ai and in the online course materials.)

Cursor will walk you through installing Git if you don't have it, and then download the code for you. You'll end up with a folder called `visual-reasoning-playground` containing all the example code.

### Alternative: Download as ZIP

If you'd rather not deal with Git at all, you can go to the GitHub repository in your web browser, click the green "Code" button, and choose "Download ZIP." Extract the ZIP file to your Documents folder, and you're done.

The only downside is that you won't be able to easily get updates if we improve the code later. But for learning purposes, it works fine.

### Open in Cursor

However you downloaded it, open Cursor and use File > Open Folder to navigate to the `visual-reasoning-playground` folder. You should see all the example projects in the file browser on the left.

## Project Structure

When you open the Visual Reasoning Playground in Cursor, you'll see several project folders:

- **ptzoptics-tracker/** — Auto-track any object with a PTZ camera
- **smart-counter/** — Count objects entering and leaving a space
- **scene-analyzer/** — Ask questions about what the camera sees
- **zone-monitor/** — Trigger actions when objects enter specific zones
- **color-assistant/** — Match camera colors to a reference image
- **multimodal-fusion/** — Combine audio and video understanding
- **README.md** — Start here for an overview

Each folder is a self-contained project. They don't depend on each other—you can work with any of them independently.

Inside each project folder, you'll typically find:

- **README.md** — Instructions for that specific project
- **Source code files** — The actual code (.js, .py, .html, etc.)
- **Configuration files** — Settings the project needs
- **package.json or requirements.txt** — Lists of dependencies

Don't worry about understanding all of this yet. As we work through each project in subsequent chapters, I'll explain what each file does.

## Testing Your Setup

Let's make sure everything works. We'll run the PTZOptics Moondream Tracker—the same project I showed you in Chapter 1.

### Open the Project in Cursor

Open Cursor and use File > Open Folder to open the `ptzoptics-tracker` folder inside the Visual Reasoning Playground you downloaded.

### Ask Cursor to Help You Run It

Open the AI chat (Ctrl+L or Cmd+L) and ask:

*"How do I run this project in my browser?"*

Cursor will look at the project files and tell you what to do. For a simple web project like this, it will likely suggest starting a local web server—and offer to do it for you.

Once the server is running, Cursor will tell you to open your browser to an address like `http://localhost:8000`.

### Configure and Test

You should see the PTZOptics Moondream Tracker interface. From here:

1. Enter your Moondream API key (the one you got in Chapter 5)
2. Enter a target object like "person" or "coffee mug"
3. If you have a PTZOptics camera, enter its IP address. If not, you can still test the detection—just skip the PTZ parts.
4. Click "Start Tracking" and grant camera permissions when your browser asks

If you see bounding boxes appearing around detected objects—congratulations. Your development environment is working.

### If Something Goes Wrong

Don't struggle alone. Copy any error message you see and paste it into Cursor's chat:

*"I'm getting this error when I try to run the project: [paste error]. What's wrong?"*

The AI will diagnose the issue and walk you through fixing it. This is the agentic coding workflow—you describe problems in plain English, and the AI helps you solve them.

## Working with Cursor's AI

Now that you have a project open, let's use Cursor's AI to understand it.

Open one of the code files—say, `app.js` in the tracker project. Even if you don't understand the code, you can learn about it:

**Ask about the whole file:**
Press Ctrl+L to open the chat, then type: "Explain what this file does at a high level."

**Ask about specific code:**
Highlight a section of code, press Ctrl+L, and ask: "What does this selected code do?"

**Ask for modifications:**
"How would I change the default detection rate to 2 per second?"

**Ask for help with errors:**
If something doesn't work, describe the problem: "When I click Start Tracking, nothing happens. How do I debug this?"

This is the power of agentic coding. You don't need to understand every line of code to work with it. You can explore, ask questions, and make modifications with the AI as your guide.

## A Note for Experienced Developers

If you're comfortable with code and have your own preferred development environment, feel free to use it. The examples in this book don't require Cursor—they're standard web and Python projects.

What Cursor provides is a lower barrier for people who are new to coding. If that's not you, work however you're most productive.

The one thing I'd encourage: try the AI assistance features even if you don't need them. There's something valuable about describing what you want in plain English and seeing it implemented. It often reveals approaches you wouldn't have thought of.

## What's Next

Your development environment is ready. You have:

- Cursor (or an alternative) installed
- Git installed
- The Visual Reasoning Playground cloned
- Your Moondream API key configured
- The PTZOptics Tracker running locally

In the next chapter, we're going to dig into that tracker code. You'll understand how it works—how it captures video frames, sends them to Moondream, interprets the response, and controls the PTZ camera. By the end, you'll be able to modify it for your own use cases.

This is where it gets fun. You're not just using visual reasoning anymore—you're building with it.

---

*Chapter 7: Auto-Track Any Object — understanding the PTZOptics Moondream Tracker and making it your own.*
