# Appendix C: Troubleshooting Guide

This appendix covers common problems you might encounter when building visual reasoning systems, along with diagnostic approaches and solutions. Rather than diving into code-level fixes, we'll focus on understanding what's happening and how to describe problems to your AI coding assistant.

---

## API and Connection Issues

### Problem: "401 Unauthorized" from Moondream API

**What's Happening:** The API doesn't recognize your credentials.

**Diagnostic Questions:**
- Is the API key set in your environment variables?
- Does the key have any leading or trailing spaces?
- Has the key been regenerated or revoked?
- Are you using the right header name for authentication?

**Resolution Approach:**
1. Verify your `.env` file contains the correct key
2. Check for invisible whitespace characters
3. Try regenerating the key in your Moondream dashboard
4. Ask your AI coding assistant to add logging that shows whether the key is being loaded correctly

---

### Problem: "429 Too Many Requests" Rate Limiting

**What's Happening:** You're making more API calls than your plan allows.

**Diagnostic Questions:**
- How frequently is your system making API calls?
- Are you analyzing every frame, or only when needed?
- Did you recently increase detection frequency?
- Are multiple systems using the same API key?

**Resolution Approach:**
1. Reduce your detection rate (once per second is often sufficient)
2. Implement caching to avoid re-analyzing unchanged scenes
3. Add request queuing to smooth out bursts
4. Consider upgrading your API plan if you genuinely need higher throughput

---

### Problem: PTZ Camera Not Responding

**What's Happening:** Commands are sent but the camera doesn't move.

**Diagnostic Questions:**
- Can you ping the camera's IP address?
- Can you access the camera's web interface in a browser?
- Are the camera and computer on the same network subnet?
- Is something blocking port 80?

**Resolution Approach:**
1. Verify network connectivity with basic network tools
2. Try accessing the camera's web interface directly
3. Check firewall settings on your computer
4. Confirm the camera firmware supports the API version you're using
5. Try the same commands using a tool like Postman or curl to isolate whether the issue is in your code or the network

---

### Problem: WebSocket Connection to OBS Fails

**What's Happening:** Can't establish connection to OBS.

**Diagnostic Questions:**
- Is OBS actually running?
- Is the WebSocket server enabled in OBS settings?
- What port is it configured to use?
- Is a password required?

**Resolution Approach:**
1. In OBS: Tools → WebSocket Server Settings → Enable WebSocket server
2. Note the port number (default 4455 for v5.x)
3. If password is set, ensure your code uses the correct authentication flow
4. Try connecting with a WebSocket testing tool to verify OBS is accepting connections

---

## Video and Frame Capture Issues

### Problem: Webcam Not Detected

**What's Happening:** The browser or application can't find the camera.

**Diagnostic Questions:**
- Does the camera work in other applications?
- Did you grant camera permission in the browser?
- Is another application using the camera?
- Do you have multiple cameras and need to select the right one?

**Resolution Approach:**
1. Test the camera in another application first
2. Check browser permissions (usually in the address bar or site settings)
3. Close other applications that might be using the camera
4. If multiple cameras exist, you may need to specify which one to use

---

### Problem: Frame Capture Returns Black Image

**What's Happening:** Video capture succeeds but the captured frame is all black.

**Diagnostic Questions:**
- Is the video element fully loaded before you capture?
- What are the video dimensions being reported?
- Is this happening on the first frame or all frames?
- Are you working with an external video source that might have CORS restrictions?

**Resolution Approach:**
1. Ensure you wait for the video to be ready before capturing
2. Add logging to show video dimensions (if 0x0, video hasn't loaded)
3. For external sources, check cross-origin settings
4. Try capturing after a deliberate delay to ensure video is playing

---

### Problem: RTSP Stream Won't Connect

**What's Happening:** IP camera stream fails to load in the browser.

**Diagnostic Questions:**
- Are you trying to connect directly from a browser? (This won't work)
- Does the camera offer HTTP-based streaming alternatives?
- Does the camera support NDI?

**Resolution Approach:**
1. Understand that browsers cannot connect directly to RTSP streams
2. Look for MJPEG over HTTP option on your camera (many offer this)
3. Consider using NDI if the camera supports it
4. For RTSP sources, you'll need a server-side proxy to convert the stream

---

## Detection and Tracking Issues

### Problem: Detection Is Inaccurate

**What's Happening:** Wrong objects detected or bounding boxes in wrong locations.

**Diagnostic Questions:**
- How is the lighting in the scene?
- What resolution are you sending to the API?
- Is the object description specific enough?
- Are there reflections, shadows, or visual noise confusing the model?

**Resolution Approach:**
1. Improve lighting—even, diffused light works best
2. Use higher resolution images (but not excessively large)
3. Be more specific in object descriptions ("person in blue jacket" vs. "person")
4. Reduce motion blur by adjusting camera settings if possible
5. Save problematic frames for review to understand what the model is seeing

---

### Problem: Tracking Is Jerky or Choppy

**What's Happening:** Camera moves in sudden jumps rather than smooth motion.

**Diagnostic Questions:**
- What's your current smoothing factor?
- Is the deadzone large enough?
- How fast is the PTZ moving?
- Are you processing frames too frequently or too infrequently?

**Resolution Approach:**
1. Increase smoothing (lower factor = smoother but slower response)
2. Increase deadzone (larger center area where no movement occurs)
3. Reduce PTZ speed setting
4. Find the right balance of detection frequency—too fast causes jitter, too slow causes lag

---

### Problem: Tracking Loses Subject

**What's Happening:** Camera stops following when subject momentarily disappears.

**Diagnostic Questions:**
- Does the subject briefly leave frame or get occluded?
- What happens when detection fails for a few frames?
- Does the system have any "memory" of where the subject was?

**Resolution Approach:**
1. Implement position persistence—remember last known location for a few seconds
2. Lower confidence threshold temporarily when searching for lost subject
3. Add a "search" behavior that scans back to last known position
4. Consider using larger frame capture to avoid losing subjects at edges

---

## Performance Issues

### Problem: High Latency

**What's Happening:** Noticeable delay between action and response.

**Diagnostic Questions:**
- Where is time being spent? (Capture? API call? Camera movement?)
- Are you using cloud or local models?
- What's your network latency to the API?
- Are you waiting for operations that could run in parallel?

**Resolution Approach:**
1. Add timing measurements to identify the bottleneck
2. Consider local models for lower latency (if you have capable hardware)
3. Reduce image size sent to API (smaller = faster upload)
4. Parallelize where possible—don't wait for PTZ to finish before next detection

---

### Problem: High Memory Usage

**What's Happening:** Application slows down over time or crashes.

**Diagnostic Questions:**
- Are you storing frames in a buffer that grows indefinitely?
- Are video streams being properly released when done?
- Are event handlers accumulating without cleanup?

**Resolution Approach:**
1. Limit buffer sizes—keep only recent frames, discard old ones
2. Properly close video streams when switching sources
3. Clean up event handlers when they're no longer needed
4. Monitor memory usage to catch leaks early

---

### Problem: CPU Usage Too High

**What's Happening:** System becomes sluggish, fan runs constantly.

**Diagnostic Questions:**
- Are you processing every single frame?
- Is work happening on the main thread that should be in a worker?
- What's your frame processing interval?

**Resolution Approach:**
1. Process fewer frames (every 3rd frame, or every 500ms)
2. Move heavy processing to background workers
3. Use hardware acceleration where available
4. Consider whether you need continuous processing or event-triggered processing

---

## Integration Issues

### Problem: vMix Commands Have No Effect

**What's Happening:** API calls succeed but nothing changes in vMix.

**Diagnostic Questions:**
- Does the target input actually exist?
- Is the input name exactly right (including spaces and capitalization)?
- Is the command compatible with that input type?
- Is vMix in a state where the command makes sense?

**Resolution Approach:**
1. Fetch vMix state first to see what inputs exist
2. Use input numbers instead of names to eliminate naming issues
3. Verify the command works when sent manually (via browser)
4. Check vMix edition—some features require higher editions

---

### Problem: OBS WebSocket Authentication Fails

**What's Happening:** Connection closes immediately after attempting to authenticate.

**Diagnostic Questions:**
- Is the password exactly correct?
- Are you implementing the authentication handshake correctly for v5.x?
- Can you connect without a password to test the basic connection?

**Resolution Approach:**
1. Temporarily disable password in OBS to test basic connectivity
2. Verify you're implementing the correct authentication flow for WebSocket 5.x
3. Check that your authentication calculation matches the protocol specification
4. Use a WebSocket testing tool to verify the handshake manually

---

## Debugging Strategies

### When Something Isn't Working

1. **Isolate the problem**
   - Which component is failing? (Vision API? Camera? Production software?)
   - Does the same thing work when tested independently?

2. **Check the simplest explanation first**
   - Is the service running?
   - Are credentials correct?
   - Is the network connected?

3. **Add visibility**
   - Log what's being sent and received
   - Save frames that cause problems
   - Record timestamps to find where delays occur

4. **Reproduce consistently**
   - Can you make it fail on demand?
   - What conditions trigger the problem?

### Describing Problems to Your AI Coding Assistant

When asking for help, provide:
- What you expected to happen
- What actually happened
- Any error messages (exact text)
- What you've already tried
- Relevant configuration (camera model, software versions, etc.)

The more specific you are, the faster you'll get useful help.

---

## Preventive Measures

### Before Deploying

- Test each component independently
- Verify network connectivity to all devices
- Confirm API keys and credentials work
- Run through common scenarios manually

### During Operation

- Monitor API usage to avoid rate limits
- Log significant events for post-incident review
- Have fallback behaviors for when things fail
- Keep credentials rotated and secure

### When Things Go Wrong

- Check the obvious first (Is it plugged in? Is it turned on?)
- Isolate the failing component
- Have a manual override available
- Know how to quickly revert to a working configuration

---

## Getting Help

If you can't resolve an issue:

1. **Search existing resources** — GitHub issues, community forums, documentation
2. **Prepare a clear description** of the problem
3. **Include relevant context** — OS, software versions, hardware
4. **Show what you've tried** — This helps avoid repeated suggestions
5. **Ask in the right place** — GitHub issues for bugs, forums for usage questions

---

*Most problems have solutions. Approach debugging systematically, and don't hesitate to ask for help when you're stuck.*
