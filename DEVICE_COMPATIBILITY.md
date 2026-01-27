# Device Compatibility Guide

Visual Reasoning Playground uses advanced AI features that run directly on your iPhone. This guide explains which devices support which features and what to expect.

---

## Quick Reference

| Your Device | Experience Level | What to Expect |
|-------------|-----------------|----------------|
| iPhone 12 and newer | **Full Support** | All features at maximum speed |
| iPhone XS, XR, 11 series | **Good Support** | Most features work well |
| iPhone X, 8 | **Basic Support** | Use cloud fallback for best results |
| iPhone 7 and older | **Not Supported** | Device doesn't meet requirements |

---

## Understanding the AI

This app uses multiple AI technologies:

### On-Device AI (Fast & Private)
- **Apple Vision Framework** - Face, person, animal detection, body poses, hand gestures
- **YOLOv8n** - 80 object classes (people, cars, animals, furniture, etc.)
- **CoreML** - Powers all on-device machine learning

Your images never leave your device. Processing happens on the Neural Engine.

### Cloud AI (Flexible)
- **Moondream** - Custom object detection, scene descriptions, natural language
- Works on ANY device with internet
- Requires API key (free tier available)

---

## Compatibility Tiers

### Full Support (A14+ chips)
**Devices:** iPhone 15/14/13/12 series, iPhone SE (3rd gen)

| Feature | Performance |
|---------|-------------|
| YOLOv8n Object Detection | 30-60+ FPS |
| Body Pose Detection | Real-time |
| Hand Gesture Recognition | Real-time |
| Visual Re-ID (Identity Tracking) | <50ms |
| All Vision Framework features | Maximum speed |

**Neural Engine specs:**
- A17 Pro: 35 TOPS
- A16: 17 TOPS  
- A15: 15.8 TOPS
- A14: 11 TOPS

---

### Good Support (A12-A13 chips)
**Devices:** iPhone 11 series, iPhone XS/XR, iPhone SE (2nd gen)

| Feature | Performance |
|---------|-------------|
| YOLOv8n Object Detection | 15-25 FPS |
| Body Pose Detection | Works, may lag in crowds |
| Hand Gesture Recognition | Works, may have slight delay |
| Visual Re-ID | 100-200ms |
| Basic Vision features | Real-time |

**What you might notice:**
- YOLO detection slightly slower in complex scenes
- Consider using lower stream quality for smoother AI
- Cloud fallback recommended for demanding use cases

**Neural Engine specs:**
- A13: 8 TOPS
- A12: 5 TOPS (first generation Neural Engine)

---

### Basic Support (A11 chips)
**Devices:** iPhone X, iPhone 8/8 Plus

| Feature | Status |
|---------|--------|
| YOLOv8n Object Detection | Very slow (CPU-only) |
| Body/Hand Pose | Requires iOS 14+, slow |
| Basic Vision (faces, people) | Works |
| Moondream Cloud | **Full functionality** |

**Recommendation:** Use cloud-based features (Moondream) for the best experience on these devices.

---

### Not Supported
**Devices:** iPhone 7 and older, iPod Touch

These devices cannot run the app due to:
- iOS version requirements not met
- No Neural Engine hardware
- Insufficient processing power

---

## Feature Requirements

| Feature | Min iOS | Min Chip | Runs On |
|---------|---------|----------|---------|
| Face Detection | iOS 11+ | A9+ | Device |
| Person Detection | iOS 12+ | A10+ | Device |
| Animal Detection | iOS 13+ | A11+ | Device |
| Scene Classification | iOS 13+ | A11+ | Device |
| Body Pose Detection | iOS 14+ | A12+ | Device |
| Hand Gesture Recognition | iOS 14+ | A12+ | Device |
| Visual Feature Prints | iOS 13+ | A11+ | Device |
| YOLOv8n (80 classes) | iOS 14+ | A12+ | Device |
| MobileCLIP Search | iOS 16+ | A14+ | Device |
| Moondream AI | Any | Any | Cloud |

---

## Moondream: The Universal Fallback

**Works on EVERY device** that can run the app.

Since Moondream runs in the cloud, device hardware doesn't matter. If your device is too slow for on-device AI, Moondream can handle:

- Custom object detection ("find the red backpack")
- Scene descriptions in natural language
- Identity-based person tracking
- Complex visual queries

**Trade-offs:**

| Aspect | On-Device AI | Moondream Cloud |
|--------|--------------|-----------------|
| Latency | 10-50ms | 200-800ms |
| Privacy | Images stay local | Images sent to API |
| Offline | Works | Requires internet |
| Flexibility | Fixed classes | Any description |
| Battery | Higher usage | Lower usage |

---

## Recommendations by Use Case

### Professional Broadcasting (sports, events)
**Recommended:** iPhone 12 Pro or newer
- Smooth real-time tracking
- No frame drops during fast action
- Can handle multiple detected objects

### Home/Small Events
**Recommended:** iPhone XS/XR or newer
- Adequate performance for typical use
- May need to lower stream quality in demanding scenes

### Casual/Testing
**Works:** iPhone X/8 with cloud fallback
- Use Moondream for detection
- On-device tracking still works once object is found

---

## Performance Tips

1. **Close background apps** - Free up Neural Engine and memory
2. **Avoid overheating** - Sustained AI processing generates heat; take breaks if device feels warm
3. **Use Wi-Fi** - Cloud features work better with stable connection
4. **Lower stream quality** - Smaller frames = faster AI processing
5. **Choose appropriate tracking mode** - Person/face use Vision (optimized), custom objects use more resources

---

## Technical Details

### Neural Engine Performance (TOPS = Trillion Operations Per Second)

| Chip | Neural Engine | Year |
|------|---------------|------|
| A17 Pro | 35 TOPS | 2023 |
| A16 | 17 TOPS | 2022 |
| A15 | 15.8 TOPS | 2021 |
| A14 | 11 TOPS | 2020 |
| A13 | 8 TOPS | 2019 |
| A12 | 5 TOPS | 2018 |
| A11 | None (GPU ML) | 2017 |

### Model Sizes
- **YOLOv8n**: ~6MB (nano variant, optimized for mobile)
- **MobileCLIP-S0**: ~25MB (compact vision-language model)
- **Vision Framework**: Built into iOS (no additional download)

---

## Checking Your Device

In the app:
1. Go to **Settings**
2. Tap **Device Compatibility**
3. See your device's compatibility tier and supported features

Or check manually:
1. Open **Settings** app on iPhone
2. Go to **General** → **About**
3. Look at **Model Name** to identify your iPhone

---

## Questions?

If you're experiencing performance issues:

1. Check that your device meets minimum requirements
2. Try lowering stream quality in camera settings
3. Use cloud-based features if on-device AI is too slow
4. Ensure you're running the latest iOS version

For optimal performance, we recommend **iPhone 12 or newer**.
