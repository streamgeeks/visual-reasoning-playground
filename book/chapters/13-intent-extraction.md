# Chapter 13: Intent Extraction from Speech

Whisper converts speech to text. Now we need to convert text to understanding.

When someone says "start recording the main stage," you have a transcription: the words "start recording the main stage." But what does that mean for your system? What action should be taken?

Intent extraction is the bridge between transcription and automation. It answers the question: what does the speaker want?

## The Complete Multimodal Pipeline

Before we dive into intent extraction, let's be clear about how all the pieces connect. When you build the systems in this chapter and the next, you'll be using:

**Moondream (via your Moondream API key):** Processes video from your webcam. Sees what's in the frame, detects objects, understands the visual scene. This is the vision component.

**Whisper (via your OpenAI API key):** Processes audio from your microphone. Converts speech to text. This is the hearing component.

**An LLM (via your OpenAI API key):** Takes the text from Whisper and extracts meaning. What does the user want? This is the understanding component.

All three work through cloud APIs—the keys you set up in Chapter 5. Your webcam feeds Moondream. Your microphone feeds Whisper. Whisper's transcription feeds the LLM. The LLM's structured intent drives your automation.

This is why we had you get both API keys early. They work together.

## From Words to Meaning

Consider these three utterances:

- "Start recording the main stage"
- "Can you record the main stage please?"
- "I need the main stage recorded"

They use different words, but they all mean the same thing: **Intent: START_RECORDING, Target: MAIN_STAGE**

Intent extraction identifies the underlying meaning regardless of how it's phrased. This is essential for voice-controlled systems because people don't speak in commands—they speak naturally.

## How Intent Extraction Works

The typical approach uses a Large Language Model (like ChatGPT, Claude, or a local LLM) to interpret transcribed speech:

**1. Receive transcription**
Whisper gives you: "Hey can you switch to camera two for a second"

**2. Send to LLM with context**
You ask the LLM: "Given this transcription and these available commands [list], what is the user's intent?"

**3. Receive structured intent**
The LLM identifies: SWITCH_CAMERA, camera 2

**4. Execute the intent**
Your system maps that intent to an actual action—in this case, switching to camera 2.

The LLM handles all the natural language variation. It knows that "switch to camera two," "give me cam 2," "cut to the second camera," and "let's see camera number two" all mean the same thing.

## Defining Your Intent Vocabulary

Before you can extract intents, you need to define what intents are possible. This is your command vocabulary.

For a production switcher:
- SWITCH_CAMERA { camera_number }
- START_RECORDING
- STOP_RECORDING
- ADD_LOWER_THIRD { text }
- FADE_TO_BLACK
- PLAY_VIDEO { clip_name }

For a conference room:
- START_MEETING
- END_MEETING
- DISPLAY_CONTENT { source }
- MUTE_AUDIO
- ADJUST_LIGHTING { level }
- CALL_PARTICIPANT { name }

For a smart home:
- TURN_ON { device }
- TURN_OFF { device }
- ADJUST_TEMPERATURE { value }
- SHOW_CAMERA { location }
- PLAY_MUSIC { source }

The key is defining clear, discrete actions your system can actually perform. The intent extractor maps fuzzy human speech to crisp system commands.

## The Key Insight: Teaching the LLM Your Options

Here's the powerful idea that makes intent extraction work: **you tell the LLM exactly what choices are available.**

Think about it. When someone says "cut to camera three," the LLM doesn't magically know what your system can do. It doesn't know you have three cameras, or that you can add lower thirds, or that you have a clip library. You have to tell it.

This is the context that makes intent extraction intelligent. You're not just asking "what did they say?" You're asking "given what my system can do, what are they asking for?"

**The pattern:**

You send two things to the LLM:
1. The transcription from Whisper
2. A description of your available actions

The LLM then acts as a translator—mapping fuzzy human speech to specific system commands.

**Example prompt structure:**

"Here's what someone just said: [transcription]. Here are the actions my system can perform: [list of available commands]. Which action, if any, matches their intent?"

**Why this matters:**

Different productions have different capabilities. A simple setup might only switch between two cameras. A complex broadcast might have dozens of inputs, graphics layers, replay systems, and audio controls.

By explicitly telling the LLM your options, you get an intent extractor that's customized to YOUR system without writing custom code. Change your production setup? Update the list of available actions. Add a new camera? Add it to the list. The LLM adapts.

This is fundamentally different from traditional voice command systems that require exact phrases. The LLM understands that "give me camera 2," "cut to 2," "take 2," and "let's see the second camera" all mean the same thing—and it knows to map them to SWITCH_CAMERA because you told it that's one of your available options.

## Confidence Thresholds

Just like visual detection has confidence scores, intent extraction has them too. Use them wisely:

**High confidence (>0.8):** Execute immediately.

**Medium confidence (0.5-0.8):** Execute with confirmation. "Switching to camera 2, is that right?" Or execute but allow easy undo.

**Low confidence (<0.5):** Ask for clarification. "I didn't catch that. Which camera did you want?"

The right thresholds depend on the consequences of errors. Switching to the wrong camera for a second? Low stakes, lower threshold is fine. Starting a live broadcast? High stakes, require higher confidence or explicit confirmation.

## Context Awareness

Intent extraction gets smarter with context.

**Previous commands:** If the user said "switch to camera 1" and then "now camera 2," the second command is clearly another switch even though it doesn't say "switch."

**Current system state:** If you're already recording and someone says "start recording," that might mean "start a new recording" or might be a mistake. Context helps disambiguate.

**Visual context:** This is where multimodal gets interesting. If the vision system sees someone pointing at a screen while saying "record that," the intent is clearer than audio alone.

**Speaker identity:** Different people might have different permission levels or typical command patterns. An identified speaker provides context.

Building context-aware intent extraction is more complex than stateless extraction, but it's much more natural for users.

## Business Example: Production Voice Commands

You're running a live production. Your hands are on the switcher, your eyes are on the monitors. You don't want to look away to press buttons.

With voice-controlled intent extraction:

**Spoken:** "Standby camera 3... take 3... ready camera 1... start the lower third... take 1... kill the lower third"

**Extracted intents:**
1. STANDBY_CAMERA { 3 } — Prepare camera 3 in preview
2. TAKE { 3 } — Cut to camera 3
3. STANDBY_CAMERA { 1 } — Prepare camera 1
4. SHOW_LOWER_THIRD — Add lower third graphic
5. TAKE { 1 } — Cut to camera 1
6. HIDE_LOWER_THIRD — Remove lower third

Each spoken command is instantly recognized and executed. The production flows naturally without breaking eye contact with the show.

**Handling production jargon:**
Train your intent extractor on production terminology. "Standby," "take," "cut to," "dissolve," "fade up," "kill"—these have specific meanings in broadcast that the extractor should understand.

**Filtering non-commands:**
During a live show, lots of talking happens that isn't commands: "That was a great shot," "We're running long," "Tell talent to wrap up." The extractor needs to distinguish commands from conversation.

## Personal Example: Voice-Controlled Camera System

At home, you have several cameras set up—front door, backyard, garage, nursery. You want to check them without pulling out your phone.

**Spoken:** "Show me the front door"

The LLM knows your available actions include SHOW_CAMERA with locations for each of your cameras. It maps "front door" to the front_door camera and triggers the display.

**More complex:** "Is there anyone in the backyard?"

This requires both intent extraction (which camera to check) and visual reasoning (scene analysis for person detection). The systems work together.

**Natural conversation:** "What's happening outside?"

The system interprets "outside" as referring to your exterior cameras, then provides scene descriptions. This is where intent extraction meets scene analysis—the LLM figures out which cameras match "outside," and visual reasoning describes what it sees.

## Building the Intent Pipeline

The complete voice command pipeline has two parallel streams:

**Audio Pipeline (commands):**
- Microphone captures audio
- Whisper converts speech to text
- LLM extracts intent (given your available actions)
- System executes the matched action

**Visual Pipeline (awareness):**
- Webcam captures video
- Moondream understands the scene
- Context informs smarter decisions

Both streams feed into your automation logic. Audio provides commands. Video provides awareness. Together, they create systems that truly understand what's happening—not just what was said, but what's being seen while it's being said.

## Wake Words and Activation

You probably don't want your system listening and responding to everything. Wake words solve this.

**Wake word:** "Hey production" or "Camera assistant" or whatever phrase activates listening.

**Flow:**
1. System listens for wake word (low resource usage)
2. Wake word detected → activate full listening
3. Capture speech until pause
4. Process through Whisper → Intent extraction
5. Execute or respond
6. Return to wake word listening

This is how Alexa, Siri, and Google Assistant work. For production environments, you might use a push-to-talk button instead—more reliable, less chance of false activations during critical moments.

## Making It Your Own

Cursor prompts for intent extraction:

*"Build a simple intent extractor that takes a transcription and a list of available actions, then returns the best match"*

*"How do I add context awareness so the system remembers the previous command?"*

*"I want to add a wake word before the system listens for commands"*

*"Can we add speaker identification so the system knows who's giving commands?"*

*"I need to log all commands with timestamps for later review"*

## What You've Learned

Intent extraction transforms transcribed speech into actionable commands:

- The key insight: tell the LLM what actions are available so it can match intent to options
- Defining your command vocabulary based on what your system can actually do
- Context awareness makes extraction smarter over time
- Confidence thresholds let you balance responsiveness with accuracy
- Wake words prevent the system from acting on every utterance

With audio capture, transcription, and intent extraction in place, you have the ears and the understanding. In the next chapter, we bring it all together.

---

*Chapter 14: The Multimodal Fusion System — combining vision and audio for intelligent automation that sees and hears.*
