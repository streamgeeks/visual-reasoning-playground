# Part IV: Adding Audio

# Chapter 12: Audio Fundamentals for Visual Reasoning

We've spent eleven chapters on vision. Now we add ears.

ProAV systems don't just have cameras—they have microphones. Conference rooms capture both video and audio. Broadcast studios have multiple audio feeds alongside video sources. Live events are as much about what's said as what's seen.

Visual reasoning becomes even more powerful when combined with audio understanding. This chapter introduces the fundamentals: how to capture audio, convert speech to text, and prepare for the multimodal systems we'll build in Chapter 14.

## The Other Half of AV

I said it earlier in this book, and I'll say it again: AV systems are the eyes and ears of modern AI systems.

We've built the eyes. Cameras feeding visual data to AI that understands what it sees. Now we add the ears. Microphones feeding audio data to AI that understands what it hears.

Together, they create something more capable than either alone. A system that can see a person enter a room AND hear them say "start the meeting." A camera that can follow a speaker AND transcribe what they're saying. A monitoring system that detects unusual activity AND understands shouted warnings.

Here's where it gets really interesting: imagine a camera that can *listen* to what it's watching. Not just transcribe words, but understand context. A jazz quartet plays in a small club—the camera hears the piano taking a solo, sees the pianist's hands moving, and smoothly frames the piano. The trumpet comes in hot for the bridge, and the camera glides to the trumpet player without anyone touching a controller.

That's not science fiction. That's what we're building toward in Chapter 14. Vision and audio working together, each informing the other. The camera that truly understands the performance.

This is multimodal AI—systems that process multiple types of input. And ProAV infrastructure is perfectly positioned to feed these systems.

## OpenAI Whisper: Speech-to-Text

Whisper is OpenAI's open-source speech recognition model. It's remarkably accurate, handles multiple languages, works with noisy audio, and—importantly—you can run it locally for free.

Before Whisper, accurate speech recognition required expensive commercial services. Now anyone can transcribe audio with professional-grade accuracy.

What Whisper does:
- Converts spoken words to text
- Handles multiple languages (and can translate to English)
- Works with varying audio quality
- Provides word-level timestamps
- Can distinguish between speakers (with additional processing)

What Whisper doesn't do:
- Understand meaning (that's what LLMs are for)
- Identify who is speaking by name (it knows "Speaker 1" but not "John")
- Filter what's important from what's not

Whisper is the ears. Just like Moondream is the eyes. They perceive; other systems interpret.

## Demuxing: Separating Audio and Video

Here's a concept I mentioned back in Chapter 4: demuxing.

Most AV signals combine audio and video together. An HDMI cable carries both. An NDI stream contains both. A video file has both tracks embedded. A video conference has both.

Demuxing is the process of separating these streams so they can be processed independently.

Why separate them?

**Different AI models:** Moondream processes images. Whisper processes audio. They can't process each other's data. You need to split the stream to feed each model appropriately.

**Different timing:** Video is processed frame by frame. Audio is processed in chunks of time (typically a few seconds). They have different natural processing rhythms.

**Different compute:** Video processing is often more resource-intensive than audio. You might run them on different hardware or at different rates.

**Different value:** For some applications, you care more about one than the other. A transcription service might discard video entirely. A visual monitoring system might ignore audio except for specific triggers.

The demuxing concept is simple: audio goes to audio processing, video goes to video processing. The implementation depends on your source.

## Getting Audio from Different Sources

### From a Webcam or USB Microphone

Browser-based applications can access audio through the WebRTC APIs, just like they access video. The audio stream is already separate from video at this level.

Ask Cursor: *"How do I capture audio from a microphone in a web application?"*

### From a Video File

Video files contain audio tracks that need to be extracted. Tools like FFmpeg can demux audio from video:

Ask Cursor: *"How do I extract the audio track from a video file so I can send it to Whisper?"*

### From a Live Stream (NDI, RTMP, etc.)

Live production streams contain embedded audio. You'll need to extract it in real-time.

Ask Cursor: *"How do I get the audio from an NDI stream separately from the video?"*

### From a Hardware Audio Source

Standalone microphones, mixing boards, or audio interfaces provide audio directly without video.

The implementation varies by source, but the concept is consistent: get audio into a format Whisper can process.

## Whisper Processing Basics

Whisper takes audio and returns text. Here's the basic flow:

**1. Capture audio chunk**
Typically a few seconds to a few minutes. Shorter chunks mean faster response but might cut off mid-sentence. Longer chunks mean more context but slower processing.

**2. Send to Whisper**
Either to OpenAI's API (cloud) or a local Whisper installation.

**3. Receive transcription**
Text representation of what was said, often with timestamps.

**4. Use the transcription**
Display it, log it, search it, feed it to another AI for understanding.

### Cloud vs. Local Whisper

Just like Moondream, Whisper can run in the cloud or locally.

**Cloud (OpenAI API):**
- Easy to use
- Always up to date
- Pay per minute of audio
- Audio leaves your network

**Local (open source):**
- Free after hardware investment
- Complete privacy
- Works offline
- You manage updates and configuration

For learning and prototyping, the cloud API is simpler. For production systems with privacy requirements or high volumes, local makes sense.

The good news: Whisper is genuinely open source. Unlike some "open" models with restrictions, you can run Whisper anywhere for any purpose.

## Real-Time vs. Batch Processing

**Batch processing:** Record audio, then transcribe it after the fact. Good for creating searchable archives, generating transcripts, or post-production analysis.

**Real-time processing:** Transcribe as audio comes in, with minimal delay. Good for live captioning, voice commands, or immediate response systems.

Real-time is harder. You need to:
- Process audio fast enough to keep up
- Handle partial sentences gracefully
- Decide where to segment (sentence boundaries aren't always clear)
- Manage latency expectations

For many ProAV applications, batch processing is sufficient. You don't need live transcription—you need a transcript of what was said during the meeting, generated afterward.

For voice command applications, real-time is essential. When someone says "switch to camera two," they expect immediate response.

## Business Example: Meeting Transcription with Visual Context

Let's combine audio and visual understanding.

You're capturing a conference room meeting. Video shows who's present and what's happening visually. Audio captures what's being said.

**Audio processing:**
Whisper transcribes the entire meeting. You now have a searchable text record of everything said.

**Visual processing:**
At regular intervals (maybe every minute), the Scene Analyzer captures a frame and describes what's happening. "Four people seated at conference table. One person is standing at the whiteboard. The whiteboard shows a diagram."

**Combined output:**
A meeting record that includes both transcript and visual context. 

```
10:00:00 [Scene: Four people at table, Sarah at whiteboard]
"Okay, let me walk through the architecture..."

10:05:00 [Scene: Sarah pointing at diagram, others taking notes]
"...so the data flows from here to the processing layer..."

10:12:00 [Scene: John standing, gesturing toward screen]
"I have a concern about the latency in this section..."
```

This is more useful than transcript alone (you can see who was speaking and what was being shown) or video alone (you can search for specific words or topics).

**Practical implementation:**
You don't need sophisticated synchronization for most meeting applications. Timestamped transcripts plus periodic scene captures give you the hybrid record. Ask Cursor how to combine these into a useful output format.

## Personal Example: Voice-Organized Photo Library

Here's a personal application combining audio and visual.

You take a lot of photos. They sit in folders with meaningless names. Finding specific images means scrolling through thousands of thumbnails.

What if you could describe what you're looking for and find it?

**Build the index:**
Run each image through Moondream's scene description. "Beach sunset with palm trees." "Birthday party with blue decorations." "Dog playing in snow."

Store these descriptions in a searchable database.

**Search with voice:**
"Find pictures from the beach trip last summer"

Whisper converts your voice query to text. A simple search matches against the stored descriptions. Results appear.

This combines visual reasoning (understanding image content) with audio (voice input) to create something neither could do alone.

**Extensions:**
- "Find photos with Grandma" — If you've labeled people, this works
- "Show me all the sunsets" — Scene descriptions often include lighting
- "Photos from 2023 with cake" — Combine metadata with visual search

## When to Process Audio, Video, or Both

Not every application needs both. Here's a framework:

**Audio only:**
- Transcription services
- Voice command systems
- Audio monitoring (detect specific sounds)
- Podcast/audio content analysis

**Video only:**
- Object tracking
- Visual monitoring
- Counting and analytics
- Most of what we've built so far

**Both (multimodal):**
- Conference room automation (see + hear)
- Security with verbal alerts
- Interactive systems that respond to commands about what they see
- Content analysis requiring full context

Processing both isn't twice the work—it's often much more than twice the value. But it is more complex. Start with what you need, add the other modality when it provides clear value.

## Preparing for Multimodal

In Chapter 14, we'll build the complete multimodal fusion system—the conference room example where vision and audio work together. Before we get there, Chapter 13 covers intent extraction: understanding not just what was said, but what the speaker wants.

For now, make sure you understand:
- Whisper converts speech to text
- Demuxing separates audio from video
- Cloud and local options exist for both vision and audio
- Real-time and batch processing serve different needs
- Combining modalities multiplies capability

The technical details of setting up Whisper and demuxing audio are best explored with Cursor's help for your specific environment. The concepts here give you the foundation.

## Testing Audio Without a Live Source: OBS Virtual Webcam and Virtual Audio Cables

Here's a practical problem: you want to test audio processing, but you don't have a conference room full of people to talk at your system. You don't have a jazz quartet in your living room. How do you develop and test audio features?

The answer: bring pre-recorded content into your development environment as if it were live.

### OBS Virtual Webcam

OBS (Open Broadcaster Software) is free and does something incredibly useful for testing: it creates a virtual webcam that other applications see as a real camera.

This means you can:
1. Open OBS
2. Add a YouTube video, a recording, or any media as a source
3. Enable "Start Virtual Camera"
4. Your browser and applications now see this content as webcam input

Testing your jazz concert camera automation? Play a jazz performance video through OBS. Your visual reasoning system processes it exactly like a live camera feed. No musicians required.

### Virtual Audio Cables

For audio testing, you need virtual audio routing—software that creates virtual audio devices your applications can use as inputs.

**On Windows:** VoiceMeeter or VB-Cable (both free) create virtual audio devices. Route system audio (like YouTube) to a virtual cable, and your audio capture application receives it as microphone input.

**On Mac:** BlackHole or Loopback route audio between applications. The setup is slightly more complex than Windows, but the capability is the same.

**The setup:**
1. Install virtual audio cable software
2. Set your system audio output to the virtual cable
3. Configure your testing application to use the virtual cable as audio input
4. Play any audio source (YouTube, Spotify, local files)—your application receives it as live audio

### Why This Matters

This testing setup is invaluable because:

**Reproducible testing:** The same jazz performance plays the same way every time. You can test your system's response, make changes, and test again with identical input.

**No coordination required:** You don't need to schedule time with live performers or speakers. Test at 2am in your pajamas if that's when inspiration strikes.

**Edge case testing:** Want to test how your system handles rapid musical changes? Play a drum solo. Want to test quiet passages? Play a ballad. You control the test content completely.

**Development efficiency:** Rapid iteration becomes possible. Make a change, play the same 30-second clip, see if it improved. Repeat.

Ask Cursor for specific setup instructions: *"How do I set up OBS Virtual Camera and VoiceMeeter to route YouTube audio and video into my web application for testing?"*

This is how professionals develop media applications. Now you have the same capability.

## Making It Your Own

Cursor prompts for audio setup:

*"How do I set up Whisper to transcribe audio from my microphone in real-time?"*

*"I want to transcribe a video file and get both the text and timestamps"*

*"How do I extract just the audio from an NDI stream?"*

*"Can I run Whisper locally without sending audio to the cloud?"*

*"How do I capture audio from a USB audio interface?"*

*"Set up OBS Virtual Camera so I can test with YouTube videos as webcam input"*

*"How do I route system audio to a virtual microphone for testing audio processing?"*

## What You've Learned

This chapter introduced the audio side of multimodal AI:

- Whisper for speech-to-text conversion
- Demuxing to separate audio and video streams
- Cloud vs. local processing options
- Real-time vs. batch transcription
- When audio, video, or both are needed
- Combining modalities for richer applications

The eyes and ears of your system are now ready. The next step is understanding what they hear.

---

*Chapter 13: Intent Extraction from Speech — understanding not just what was said, but what the speaker wants.*
