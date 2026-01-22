# Appendix D: Glossary

Key terms used throughout this book, defined in the context of visual reasoning for broadcast and ProAV.

---

## A

**Agentic Coding**
A style of software development where AI acts as an autonomous agent—understanding context, making decisions, and building complete solutions based on natural language descriptions. Contrast with traditional autocomplete-style AI assistance.

**API (Application Programming Interface)**
A set of protocols and tools for building software applications. In this book, APIs provide programmatic access to vision models, cameras, and production software.

**API Key**
A unique identifier used to authenticate requests to an API. Treat API keys like passwords—keep them secret and never commit them to public repositories.

---

## B

**Bounding Box**
A rectangle that indicates where an object has been detected in an image. Defined by coordinates (x, y) for the top-left corner, plus width and height. Coordinates are typically normalized (0-1) representing percentage of frame dimensions.

**Broadcast**
The distribution of audio/video content to an audience, whether over-the-air, cable, internet streaming, or other methods. Used broadly in this book to include both traditional broadcasting and modern streaming.

---

## C

**Cloud Processing**
Running AI models on remote servers accessed via internet APIs. Advantages: no local hardware required, always up-to-date. Disadvantages: latency, cost at scale, data leaves your network.

**Computer Vision (CV)**
The field of AI focused on enabling computers to interpret and understand visual information. Traditional CV requires training models on specific objects. Visual reasoning models can understand arbitrary objects described in natural language.

**Confidence Score**
A number (typically 0-1 or 0-100) indicating how certain the model is about a detection or answer. Higher confidence = more certain. Use confidence thresholds to filter unreliable detections.

**Cursor**
An AI-powered code editor built on VS Code. Used for agentic coding throughout this book.

---

## D

**Deadzone**
An area (typically in the center of the frame) where detected movement doesn't trigger camera adjustment. Prevents unnecessary jitter when the subject is approximately centered.

**Detection**
The process of finding and locating objects in an image. Returns bounding boxes and confidence scores. Different from description, which provides natural language understanding.

**Detection Rate**
How frequently the system analyzes frames for detection. Measured in detections per second. Higher rates = more responsive but more API calls and CPU usage.

---

## E

**Edge Device**
Computing hardware located at the "edge" of a network, close to where data is generated. Running AI on edge devices (like smart cameras) reduces latency and keeps data local.

**Endpoint**
A specific URL where an API accepts requests. For example, `https://api.moondream.ai/v1/detect` is the detection endpoint for Moondream.

---

## F

**Fallback**
An alternative behavior when the primary approach fails. For example, switching to a backup model when the primary model's API is unavailable.

**Frame**
A single still image from a video stream. Video is composed of many frames per second (typically 24-60 fps for broadcast).

**Frame Buffer**
A temporary storage area holding recent video frames. Useful for debugging (reviewing what the system saw) and for implementing temporal features.

**FPS (Frames Per Second)**
The rate at which frames are captured or displayed. Higher FPS = smoother video. Common rates: 24 fps (film), 30 fps (broadcast), 60 fps (sports/gaming).

---

## G

**GPU (Graphics Processing Unit)**
A specialized processor designed for parallel computing. Running AI models locally often requires a GPU for acceptable performance. NVIDIA GPUs are most commonly supported.

---

## H

**Harness**
A framework that standardizes how applications are built. The Visual Reasoning Harness provides structure for input handling, model interaction, output actions, and logging. Think of it like a car chassis that provides standard structure for different car models.

**HIPAA (Health Insurance Portability and Accountability Act)**
US regulation governing healthcare data privacy. Relevant when deploying visual reasoning in healthcare settings. Often requires local processing to avoid sending patient images to cloud services.

**Hybrid Classroom/Meeting**
A setting where some participants are physically present and others join remotely via video conference. Presents unique challenges for camera automation and participant equity.

---

## I

**Inference**
The process of running a trained AI model to get predictions or outputs. Each time you ask a vision model to analyze an image, that's one inference.

**Input Abstraction**
The harness pattern of providing a consistent interface for different input sources (webcam, IP camera, file, NDI, etc.). Your code works the same regardless of where video comes from.

**Intent Extraction**
Analyzing speech or text to understand what action the user wants. For example, extracting "switch to camera 2" as the intent from "Can we see the presenter close up?"

---

## L

**Latency**
The delay between an action and its result. In visual reasoning, this includes frame capture time, API call time, model inference time, and action execution time. Lower latency = more responsive system.

**Local Processing**
Running AI models on your own hardware rather than via cloud APIs. Advantages: no network latency, data stays local, no per-inference cost. Disadvantages: requires capable hardware, model updates are manual.

**LLM (Large Language Model)**
AI models trained on text that can understand and generate natural language. Examples: GPT-4, Claude, Llama. LLMs process text; VLMs extend this to process images.

---

## M

**Model**
In AI context, a trained neural network that can perform specific tasks. Vision models are trained to understand images. Different models have different capabilities, speeds, and costs.

**Model Abstraction**
The harness pattern of providing a consistent interface for different vision models. You can swap from Moondream to GPT-4V by changing configuration, not code.

**Moondream**
A vision-language model used throughout this book. Notable for being efficient (runs on modest hardware), open-source (can run locally), and capable (natural language image understanding).

**Multimodal**
Systems that process multiple types of input (modes). A multimodal AI system might process both video and audio together, combining insights from each.

---

## N

**NDI (Network Device Interface)**
A protocol for sending video over IP networks. Common in broadcast and ProAV. Allows any NDI-capable device to send/receive video without dedicated cables.

**Normalized Coordinates**
Coordinates expressed as percentages (0-1) of the frame dimensions rather than pixel values. Normalized coordinates work regardless of resolution: x=0.5 means center horizontally whether the frame is 720p or 4K.

---

## O

**OBS (Open Broadcaster Software)**
Free, open-source software for video recording and live streaming. Controlled via the OBS WebSocket protocol.

**OCR (Optical Character Recognition)**
The ability to read text from images. Visual reasoning models include OCR capability, allowing them to read scoreboards, slides, signs, etc.

**Output Abstraction**
The harness pattern of providing a consistent interface for different action targets (vMix, OBS, PTZ cameras, webhooks, etc.). Your code triggers abstract actions; configuration routes them to actual systems.

---

## P

**Postage Stamp Technique**
A method for giving single-frame AI models temporal context by compositing multiple frames into a grid (like a sheet of postage stamps). The model sees how the scene changes over time in a single image.

**Preset**
A saved camera position (pan, tilt, zoom) that can be recalled instantly. Cameras typically support 100+ presets. Visual reasoning can trigger presets based on detected conditions.

**ProAV (Professional Audio-Video)**
The industry of professional audio-visual equipment and services. Includes corporate meeting rooms, houses of worship, education, hospitality, and more. Distinguished from consumer AV by quality requirements and system complexity.

**Prompt**
The natural language input given to an AI model. In visual reasoning, prompts describe what to detect, what questions to answer, or what to describe. Prompt quality significantly affects result quality.

**PTZ (Pan-Tilt-Zoom)**
A camera that can remotely adjust its horizontal angle (pan), vertical angle (tilt), and focal length (zoom). PTZ cameras are essential for automated production because they can be controlled programmatically.

---

## R

**Rate Limiting**
API providers limit how many requests you can make in a given time period. Exceeding rate limits returns errors (typically HTTP 429). Design systems to stay within limits.

**Replay**
In broadcast, the ability to show a recent event again, typically in slow motion. Visual reasoning can automatically flag moments worth replaying.

**RTSP (Real-Time Streaming Protocol)**
A protocol for controlling streaming media servers. Many IP cameras provide video via RTSP. Note: browsers cannot connect directly to RTSP; you need a proxy or different approach.

---

## S

**Smoothing**
Mathematical techniques to reduce jitter in camera movement. Exponential smoothing is common: new_value = old_value + (target - old_value) * factor. Lower factors = smoother but slower response.

**Speech-to-Text**
Converting spoken audio into written text. Whisper is the primary speech-to-text model used in this book.

---

## T

**Temporal Reasoning**
Understanding how a scene changes over time, rather than just analyzing single frames. Current VLMs have limited temporal reasoning; this is an active research area.

**Threshold**
A cutoff value for making decisions. For example, a confidence threshold of 0.8 means detections below 80% confidence are ignored.

**Tracking**
Continuously following a subject across frames. Visual reasoning enables tracking by description ("track the person in red") rather than requiring the subject to be pre-defined.

---

## V

**Visual Reasoning**
The ability to not just detect objects in images, but to understand scenes and answer questions about them in natural language. Goes beyond traditional computer vision by incorporating language understanding.

**VLM (Vision-Language Model)**
An AI model that can process both images and natural language. Can describe what's in an image, answer questions about images, and locate objects based on descriptions. Moondream, GPT-4V, and Claude Vision are VLMs.

**vMix**
Professional live video production software. Controlled via HTTP API. Common in corporate, worship, and streaming productions.

---

## W

**Webhook**
An HTTP callback—a URL that receives data when events occur. Visual reasoning systems can trigger webhooks when conditions are detected, enabling integration with arbitrary external systems.

**WebSocket**
A protocol enabling two-way communication between client and server over a persistent connection. Used by OBS for real-time control and event notification.

**Whisper**
OpenAI's speech-to-text model. Available via API or for local deployment. Used for audio processing in multimodal systems.

---

## Z

**Zone**
A defined region of the frame monitored for activity. Zones enable location-aware automation: "alert when someone enters this area." Zones are typically defined as rectangles with normalized coordinates.

---

## Abbreviations Quick Reference

| Abbreviation | Meaning |
|--------------|---------|
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| AV | Audio-Video |
| CORS | Cross-Origin Resource Sharing |
| CPU | Central Processing Unit |
| CV | Computer Vision |
| FPS | Frames Per Second |
| GPU | Graphics Processing Unit |
| HTTP | HyperText Transfer Protocol |
| IP | Internet Protocol |
| LLM | Large Language Model |
| NDI | Network Device Interface |
| OBS | Open Broadcaster Software |
| OCR | Optical Character Recognition |
| PTZ | Pan-Tilt-Zoom |
| RTSP | Real-Time Streaming Protocol |
| SDK | Software Development Kit |
| URL | Uniform Resource Locator |
| VLM | Vision-Language Model |
| WS | WebSocket |

---

*Terms evolve as technology advances. Check online resources for the latest definitions and usage.*
