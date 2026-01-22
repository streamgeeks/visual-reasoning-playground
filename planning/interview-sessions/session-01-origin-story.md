# Interview Session 1: Origin Story & Vision

**Date:** January 9, 2026  
**Topic:** Visual Reasoning Origin Story

---

## Part 1: Initial Origin Story

The origin story of Visual Reasoning happens to be set in the PTZOptics R&D Lab in Downingtown, Pennsylvania. Matthew Davis and I, who are both Co-CEOs of PTZOptics, regularly share ideas and argue about the best new technologies and the industry. Matthew and I have been working together for almost 20 years. He had something he wanted to show me. It was called Moondream, a new Vision Learning Model that was completely open source. This was interesting to me as an existing Roboflow customer I was familiar with computer vision. I had spent years developing computer vision models and even had some examples of computer vision programs which could do some pretty amazing things like track a basketball or a laser pointer. The interesting thing about a Vision Learning Model is that you do not need to train a computer vision model, the vision model already has billions of parameters we can use to understand what it's seeing.

So, here I walking through some of the example projects Matt had built. We were tracking any object that Moondream could detect, counting people in a room, and analyzing color correction with AI. I couldn't believe it and it was also almost completely free because at the time I am writing this Moondream gives away 5,000 API calls a day for free. So I immediately schedule a meeting with the Moondream team to discuss the future of this technology. They told me that in world of super flagship AI models they decided to create a tiny but powerful vision learning model that would be super affordable to use and very valuable in many of the scenarios ProAV and Broadcast users would want. We discussed ways to use the VLM for live video production, and ProAV in depth. Many of those conversations will be outlined in this book.

At the same time, Brian Mulcahy, who also must be mentioned in the credit of creating Visual Reasoning was innovating at PTZOptics internally helping our company adopt AI workflows of all kinds. Brian already had years of experience using AI, creating custom models, and implementing many image and video AI projects that our company was already using. Brian was digging deeper into Agentic coding and creating innovative products. Brian had the idea of creating the industries first ever Visual Reasoning Harness. Some of the worlds very first AI harnesses were just coming out by the end of 2025, and in this book you will learn why they are so valuable.

With all that being said, our team got together and realized that Visual Reasoning technology has what it takes to transform our entire ProAV and Broadcast industry. After writing over 10 books on audio visual and live streaming technology, I knew that educating our partners and customer on this technology would be a rewarding experience. My goal with this book is empower you the reader, with all of the insights and educational experience I have had as the CEO of global technology company, dedicated understanding the impacts of this special technology on our incredible industry we are a part of. So with that being said, let's dig in to Visual Reasoning AI for Broadcast and ProAV.

---

## Part 2: Follow-Up Q&A

### Q1: The R&D Lab Moment - First Reaction

**Question:** When Matt showed you Moondream tracking objects, what did you say to each other? What was the first thing you thought about doing with it?

**Paul's Answer:**
The first thing we thought was wow. Our PTZOptics cameras ship with built-in computer vision models that can track a subject, and we can do that really well, but we understand the world is a big place and our customers are asking to track horses and other objects, this technology will bring to the world so many new use cases we need to find a way to provide that to our customers.

**Key Insight:** PTZOptics already has CV in cameras, but customers want MORE (horses, custom objects). VLMs unlock unlimited use cases.

---

### Q2: The Roboflow/CV Background

**Question:** You mentioned tracking basketballs and laser pointers. What were those projects for? What was the pain of training those models?

**Paul's Answer:**
We used Roboflow to create cloud based computer vision models. The process was easy but the models were locked and proprietary, there is a big difference between the locked down roboflow model and the open source model that moondream released. So while I had purchased an enterprise account with roboflow and made many impressive models, even custom coding a PTZ tracking solution with those computer vision models, I eventually realized that it wasn't scalable for our customers.

**Key Insight:** 
- Roboflow = easy but proprietary/locked
- Paul had enterprise account, built impressive models
- Built PTZ tracking with CV models
- Problem: Not scalable for customers (each use case = new model)

---

### Q3: The "I Couldn't Believe It" Moment

**Question:** Was it the accuracy? The speed? The fact you didn't have to train anything? What specifically blew your mind?

**Paul's Answer:**
The scalability of track anything versus build a unique computer vision model for each application was what interested me. But also the amazing collision of all of the AI agentic coding tools, AI harnesses, and the open source vision and audio models all being available within a few short months of each other made us realize this is more than us making a single product, we need to help start a movement inside the ProAV and broadcast industry.

**Key Insights:**
- **Scalability** - Track ANYTHING vs. train a new model for each use case
- **The Collision** - Agentic coding + harnesses + open source models = perfect storm
- **Movement, Not Product** - "We need to help start a movement inside the ProAV and broadcast industry"

---

### Q4: What is a Visual Reasoning Harness?

**Question:** What problem was Brian trying to solve? Can you explain what a "harness" is to someone who's never heard the term?

**Paul's Answer:**
Sometimes AI agentic coding systems lack reference and have issues completing tasks. We want to on-board AV and broadcast engineers who understand the gear, the installation and often the customer intent but are not computer programmers. While there are so many great AI coding tools, we found that the Visual Reasoning harness provides incredible gains for those in our industry. It provides guidelines for ProAV and Broadcast engineering best practices and reference points that make building more accurate and easier to grow into our industry specific applications.

**Key Definition:**
> A Visual Reasoning Harness provides **guidelines and reference points** for ProAV/Broadcast best practices that make AI coding tools **more accurate** and **easier to grow** into industry-specific applications.

**Target User:** AV/Broadcast engineers who understand gear and customer intent but are NOT programmers.

---

### Q5: The Moondream Team Meeting

**Question:** What stood out about the Moondream team? What did they say that stuck with you?

**Paul's Answer:**
I met with Jay and Vik from the Moondream team and immediately shipped them a PTZOptics camera. I was struck by their optimism about what small teams can achieve together and their willingness to help build out these early adopter case studies. While today moondream can only process a single frame image at a time, they gave us all these ideas on how to use it for live video including creating a postage stamp of frames over time to allow the VLM to interpret images over time. There are a lot of programming ideas they freely shared with us that I will share in this book.

I really liked the idea that we can keep the costs manageable so that this can scale and the fact that they offer a free open source version that we can run locally on a computer so that we can remain HIPAA compliant and have maximum privacy and free use for those deployments but also have the cloud option as needed for low compute scenarios and easy testing for this online course.

**Key People:** Jay and Vik (Moondream team)

**Key Insights:**
- **Small team optimism** - What small teams can achieve together
- **Willingness to collaborate** - Early adopter case studies
- **Postage stamp technique** - Multiple frames over time for temporal reasoning
- **Dual deployment model:**
  - Cloud: Easy testing, low compute scenarios
  - Local: HIPAA compliant, maximum privacy, free

**Book Content:** Programming ideas from Moondream team to be shared in book.

---

### Q6: Paul's Book Portfolio

**Question:** Which of your 10+ books are you most proud of? How will this book be different?

**Paul's Books:**
- The Unofficial Guide to NDI
- The Virtual Ticket: How to Host Private Live Streams & Virtual Events
- Sports Video: Analytics, Recording & Live Streaming
- The PTZ Camera Operator Handbook
- Helping Your Church Live Stream
- Esports in Education
- Remote Production: Your Professional Guide to Cloud-Based Broadcasting, IP Video and Audio
- Accelerated Broadcast Club Curriculum
- The Unofficial Guide to vMix
- The Basics of Live Streaming
- The Unofficial Guide to Open Broadcaster Software
- OBS Super User Guidebook

**Paul's Answer:**
I am most proud of the books that are industry standards that help people get into live streaming and production. Every year at IBC or NAB or InfoComm people come up to me saying that they read one of my books or taken one of the courses - all my books have an online course I make available for free on YouTube. And that makes me proud. I would say the Unofficial Guides to NDI, OBS and vMix are some of my best and also I have a passion for helping churches live stream so that one is also one of my favorites.

**Key Insights:**
- All books have FREE YouTube courses
- Industry standard status (people mention at IBC, NAB, InfoComm)
- Favorites: Unofficial Guides (NDI, OBS, vMix) + Church streaming
- Pride comes from helping people get started

---

### Q7: The Target Reader

**Question:** Give me a specific person. Name, role, what they're struggling with, what they need.

**Paul's Answer:**
These are ProAV integrators and broadcast engineers who know the customer needs well enough to build custom solutions for them. So these are DIY live streamers, IT people and AV people.

**Target Audience Profile:**
| Type | Description |
|------|-------------|
| ProAV Integrators | Know customer needs, build custom solutions |
| Broadcast Engineers | Technical, understand gear and installation |
| DIY Live Streamers | Self-taught, resourceful |
| IT People | Technical background, not AV-specific |
| AV People | Industry professionals |

**Common Thread:** They understand the gear and customer intent, but may not be programmers.

---

### Q8: The 3-Year Vision

**Question:** What does ProAV/Broadcast look like in 3 years if visual reasoning takes off?

**Paul's Answer:**
I see the AV systems more as the eyes and ears to modern AI systems. The idea of an AI system will change over time, they all won't be in the cloud there will be private and secure local AI models that are trained to specifically what the Broadcast and ProAV industry needs. So it's a level of automation that will appear seamless to end users. 

Any area of ProAV systems where there is friction such as users not knowing how to use it or things not being set up properly will be automated with AI using data sources such as video and audio to understand what is going on. 

There will be new use cases we will review in this book that will continue to be improved sometimes to a tipping point beyond early adopters and truly having an impact. So this will be transformative but this layer of education and empowerment is something is core to our business at PTZOptics and StreamGeeks and VisualReasoning.ai will be the next leg of this journey for us.

**Key Vision Statements:**
- **"AV systems as the eyes and ears to modern AI systems"**
- **"Automation that will appear seamless to end users"**
- **"Any area where there is friction... will be automated with AI"**
- Local AI models trained specifically for ProAV/Broadcast needs
- Tipping point: Beyond early adopters → true impact
- Education and empowerment = core to PTZOptics/StreamGeeks/VisualReasoning.ai

---

## Extracted Quotes for Book Use

### Chapter 1 Material
> "The first thing we thought was wow."

> "This technology will bring to the world so many new use cases we need to find a way to provide that to our customers."

> "This is more than us making a single product, we need to help start a movement inside the ProAV and broadcast industry."

### Chapter on Harness
> "The Visual Reasoning harness provides incredible gains for those in our industry. It provides guidelines for ProAV and Broadcast engineering best practices and reference points that make building more accurate and easier to grow into our industry specific applications."

### Chapter on Vision/Future
> "I see the AV systems more as the eyes and ears to modern AI systems."

> "Any area of ProAV systems where there is friction such as users not knowing how to use it or things not being set up properly will be automated with AI."

---

## Technical Concepts to Cover in Book

1. **Postage stamp of frames** - Moondream's technique for temporal reasoning with single-frame VLMs
2. **Cloud vs. Local deployment** - HIPAA compliance, privacy, cost trade-offs
3. **The Harness concept** - Industry-specific guidelines for AI coding tools
4. **Scalability difference** - Train once (VLM) vs. train per use case (CV)

---

## Follow-Up Questions for Session 2

1. Walk me through the "postage stamp" technique in more detail
2. Tell me about a specific customer request that CV couldn't solve but VLM could
3. What does the Visual Reasoning Harness actually look like? Files? Structure?
4. What's a specific example of "friction" in AV systems that AI will eliminate?
5. How do you explain API costs to a non-technical customer?
