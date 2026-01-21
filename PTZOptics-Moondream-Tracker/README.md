# PTZOptics Moondream Tracker

**Tool #3** in the [Visual Reasoning Playground](https://github.com/StreamGeeks/visual-reasoning-playground)

An AI-powered PTZ (Pan-Tilt-Zoom) camera tracking application that uses Moondream's vision AI to detect and track objects in real-time. Optimized for PTZOptics cameras and other PTZ cameras with HTTP API support.

> This tool is part of the Visual Reasoning Playground, a collection of 8 tools demonstrating visual AI for broadcast and ProAV. See the [complete playground](../) for all tools, or read the book *Visual Reasoning AI for Broadcast and ProAV* by Paul Richards.

## Overview

This application uses:
- **Moondream Cloud API** for zero-shot object detection
- **WebRTC** to capture video from your camera
- **PTZ Camera Control** via HTTP API to track detected objects

## Features

- 🎯 **Zero-shot Object Detection**: Track any object by describing it (e.g., "person", "red ball", "coffee mug")
- 🎥 **Real-time Tracking**: Automatically pan/tilt camera to keep object centered
- ⚡ **Adjustable Detection Rate**: Control API usage vs. responsiveness (0.1 to 5 detections/sec)
- 🔒 **Secure**: API key stored locally in browser localStorage
- 📊 **Performance Monitoring**: Real-time FPS counter for detection rate
- 🎨 **Visual Feedback**: Bounding boxes and crosshairs show detected objects

## Setup

### Prerequisites

1. **Moondream API Key**: Get your API key from [console.moondream.ai](https://console.moondream.ai)
2. **PTZ Camera**: A PTZ camera with HTTP API support (e.g., `/cgi-bin/ptzctrl.cgi`)
3. **Web Browser**: Modern browser with WebRTC support (Chrome, Edge, Firefox)
4. **Web Server**: Serve the files via HTTP/HTTPS (required for WebRTC camera access)

### Installation

1. **Clone or download** this repository

2. **Serve the files** using a local web server:
   ```bash
   # Option 1: Python
   python -m http.server 8000
   
   # Option 2: Node.js
   npx http-server
   
   # Option 3: PHP
   php -S localhost:8000
   ```

3. **Open in browser**: Navigate to `http://localhost:8000/index.html`

## Usage

1. **Enter Moondream API Key**: 
   - Get your key from [console.moondream.ai](https://console.moondream.ai)
   - Enter it in the "Moondream API Key" field
   - It will be saved in your browser for future sessions

2. **Configure Target Object**:
   - Enter a description of what you want to track
   - Examples: "person", "hand", "red ball", "laptop", "face"
   - Moondream's zero-shot detection works with natural language

3. **Set PTZ Camera IP**:
   - Enter your PTZ camera's IP address (e.g., `192.168.1.19`)
   - For PTZOptics cameras: Find IP in camera's web interface or LCD menu
   - Make sure your camera is accessible from your computer (same network)

4. **Select Camera Operation Style** (Optional):
   - Choose a preset that matches your use case:
     - **Smooth Tracking**: Slow, graceful movements for broadcast (0.5/sec, large deadzone)
     - **Precise Centering**: Tight centering for presentations (1.5/sec, small deadzone)
     - **Balanced**: Good for general use (1.0/sec) - DEFAULT
     - **Fast Response**: Quick movements for sports/action (2.0/sec)
     - **Minimal Movement**: Reduce API usage and camera movement (0.3/sec)
     - **Custom**: Manually adjust all settings below
   - Presets automatically configure detection rate, speed, and deadzone
   - Adjusting any slider switches to "Custom" mode

5. **Adjust Detection Rate** (if using Custom):
   - Use the slider to set how many detections per second (0.1 to 5.0)
   - Lower rate = Less API usage and cost
   - Higher rate = More responsive tracking
   - Default: 1.0 detection/sec (recommended for most use cases)
   - You can adjust this even while tracking is active!

6. **(Optional) Configure Advanced PTZ Settings**:
   - Click "⚙️ Advanced PTZ Settings" to expand
   - **Pan/Tilt Speed**: Control how fast the camera moves (1-10)
   - **Center Target Position**: Adjust where "center" actually is (30-70%)
     - 50% = true center of frame
     - <50% = bias left/up, >50% = bias right/down
     - Useful for off-center framing or composition
   - **Centering Precision (Deadzone)**: How precisely to center (1-20%)
     - Smaller (1-3%) = Very tight centering, more camera movement
     - Medium (5-8%) = Balanced centering (default: 5%)
     - Larger (10-20%) = Looser centering, smoother/less jittery
   - All settings save automatically and apply in real-time

7. **Start Tracking**:
   - Click "Start Tracking" button
   - Grant camera permissions when prompted
   - The application will:
     - Detect the target object at your configured rate
     - Display bounding boxes around detected objects
     - Automatically move the PTZ camera to keep the object centered

8. **Stop Tracking**:
   - Click "Stop Tracking" to pause tracking
   - The PTZ camera will stop moving

## Configuration

### Detection Rate Control

The detection rate slider in the UI allows you to control API usage vs. tracking responsiveness:

- **0.1 - 0.5 detections/sec**: Very low API usage, suitable for slow-moving objects or cost-sensitive applications
- **1.0 detection/sec** (default): Balanced approach, good for most use cases
- **2.0 - 3.0 detections/sec**: More responsive tracking for faster-moving objects
- **4.0 - 5.0 detections/sec**: Maximum responsiveness, but higher API usage and cost

**API Cost Estimation:**
- At 1 detection/sec: ~3,600 API calls per hour
- At 0.5 detection/sec: ~1,800 API calls per hour  
- At 5 detections/sec: ~18,000 API calls per hour

You can adjust the rate even while tracking is active - the change takes effect immediately!

### PTZ Camera Controls

All PTZ settings are now available in the UI under "Advanced PTZ Settings":

**Movement Speed:**
- **Pan Speed (1-10)**: How fast the camera moves left/right (default: 5)
- **Tilt Speed (1-10)**: How fast the camera moves up/down (default: 5)
- Start with default and adjust based on your camera's responsiveness

**Center Target Position (30-70%):**

Control where the camera tries to position the object in the frame:
- **50%** = True center of frame (default)
- **45%** = Slightly left/up of center
- **55%** = Slightly right/down of center
- **Use cases:**
  - Off-center framing for better composition
  - Compensating for camera mounting angle
  - Rule of thirds positioning

**Centering Precision / Deadzone (1-20%):**

The "deadzone" is the tolerance range where the camera won't move. Smaller = tighter centering:

- **1-3%**: Very precise centering
  - Object stays nearly perfectly centered
  - Camera moves frequently
  - Best for: stationary objects, demos, presentations
  
- **5-8%** (default: 5%): Balanced
  - Good centering without excessive movement
  - Recommended for most use cases
  
- **10-20%**: Loose centering
  - Object can drift more before camera moves
  - Smoother, less jittery tracking
  - Best for: fast-moving objects, reducing API calls

**Tips:**
- Start with defaults (50% center, 5% deadzone)
- Adjust center position first to get desired framing
- Then tune deadzone for smoothness vs. precision trade-off
- For jittery tracking: Increase deadzone (10-15%)
- For precise centering: Decrease deadzone (2-3%)
- All changes apply immediately, even during active tracking

## File Structure

```
PTZOptics-Moondream-Tracker/
├── index.html          # Main HTML page with UI
├── main.css           # Styles for UI and video display
├── moondream.js       # Moondream API integration
├── ptz_control.js     # PTZ camera control module
├── app.js             # Main application logic
└── README.md          # This file
```

## Troubleshooting

### Camera Access Denied
- Make sure you're accessing via `http://` or `https://` (not `file://`)
- Grant camera permissions when prompted by browser
- Check browser camera settings

### Moondream API Errors
- Verify your API key is correct
- Check your internet connection
- Check API rate limits at [docs.moondream.ai](https://docs.moondream.ai/api/)

### PTZ Camera Not Responding
- Verify camera IP address is correct
- Check that camera is on the same network
- Try accessing camera's web interface: `http://YOUR_CAMERA_IP`
- Test PTZ control directly: `http://YOUR_CAMERA_IP/cgi-bin/ptzctrl.cgi?ptzcmd&ptzstop`

**For PTZOptics Cameras:**
- Ensure camera firmware is up to date
- Check that IP control is enabled in camera settings
- Default credentials (if needed): admin/admin
- Some PTZOptics cameras may require authentication - check camera documentation

### Object Not Detected
- Try more specific descriptions (e.g., "person wearing red shirt" instead of "person")
- Make sure object is clearly visible in frame
- Adjust lighting conditions
- Try different angles or distances

## API Rate Limits

Moondream Cloud API has rate limits. The default detection rate is 1.0 detections/sec, which is a good balance. You can adjust this using the slider in the UI based on your:

- **API tier/plan**: Higher tiers allow more requests
- **Use case**: Slower objects need fewer detections
- **Budget**: Lower rates = lower costs

Monitor your usage at the Moondream console and adjust accordingly. See [Moondream rate limits](https://docs.moondream.ai/api/) for more information.

## Camera Compatibility

This application is designed for PTZ cameras that support HTTP API commands via `/cgi-bin/ptzctrl.cgi` endpoints.

**Optimized for:**
- PTZOptics cameras (all models with IP control)
- ONVIF-compatible PTZ cameras
- Other IP-based PTZ cameras with CGI control

**Tested with:**
- PTZOptics 12X, 20X, 30X NDI cameras
- Standard CGI-based PTZ control interfaces

If your camera uses different endpoints, modify the `sendCommand()` function in `ptz_control.js`.

## Privacy & Security

- **API Key**: Stored in browser localStorage (never sent to any server except Moondream)
- **Video**: Processed locally in browser, only sent to Moondream API for detection
- **No Data Collection**: This application does not collect or store any user data

## Get the Book

**[Visual Reasoning AI for Broadcast and ProAV](https://visualreasoning.ai/book)** by Paul Richards - the complete guide to building AI-powered camera systems. Get your copy at [VisualReasoning.ai/book](https://visualreasoning.ai/book)

## Credits

- **Visual Reasoning AI**: Book and course at [VisualReasoning.ai](https://visualreasoning.ai)
- **Moondream**: Vision AI by [Moondream AI](https://moondream.ai/)
- **PTZOptics**: Camera control compatible with [PTZOptics](https://ptzoptics.com/) PTZ cameras
- **StreamGeeks**: Live streaming education at [StreamGeeks.com](https://streamgeeks.com)
- **Inspired by**: [Download-OBS-Controller](https://github.com/Tyler-Odenthal/Download-OBS-Controller) by Tyler Odenthal

## Related Playground Tools

| Tool | Description |
|------|-------------|
| [Scene Describer](../01-scene-describer/) | Describe what the camera sees |
| [Detection Boxes](../02-detection-boxes/) | Draw boxes around objects |
| **Auto-Tracker** (this tool) | PTZ camera follows any object |
| [Smart Counter](../05-smart-counter/) | Count objects entering a space |
| [Scene Analyzer](../06-scene-analyzer/) | Ask questions about scenes |
| [Zone Monitor](../07-zone-monitor/) | Trigger actions on zone activity |
| [Color Matcher](../10-color-matcher/) | Match camera to reference style |
| [Multimodal Fusion](../12-multimodal-fusion/) | Audio + video combined intelligence |

## License

MIT License
