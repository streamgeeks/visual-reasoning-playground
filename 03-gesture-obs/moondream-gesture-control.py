"""
Moondream Gesture Control for OBS Studio
==========================================
Control OBS scenes using hand gestures detected by Moondream AI.

Installation:
1. Copy this file to your OBS scripts folder
2. In OBS: Tools → Scripts → Add Script → Select this file
3. Configure your Moondream API key and gesture mappings

Requirements:
- OBS Studio 28.0 or later
- Moondream API key (get one at https://moondream.ai)
- Webcam connected to your computer

Web Demo: https://streamgeeks.github.io/visual-reasoning-playground/03-gesture-obs/
GitHub: https://github.com/streamgeeks/visual-reasoning-playground

Author: StreamGeeks
License: MIT
"""

import obspython as obs
import urllib.request
import urllib.error
import base64
import json
import time
import os
import tempfile

# =============================================================================
# Global Settings
# =============================================================================

settings_data = {
    "api_key": "",
    "source_name": "",
    "thumbs_up_scene": "",
    "thumbs_down_scene": "",
    "detection_interval": 2000,
    "cooldown_seconds": 3,
    "enabled": False,
    "debug_mode": False
}

# State tracking
last_action_time = 0
thumbs_up_count = 0
thumbs_down_count = 0
DEBOUNCE_REQUIRED = 2

# =============================================================================
# Script Info (shown in OBS Scripts window)
# =============================================================================

def script_description():
    return """<h2>🤖 Moondream Gesture Control</h2>
<p>Control OBS scenes using hand gestures powered by Moondream AI vision.</p>

<h3>Gestures Supported:</h3>
<ul>
<li>👍 <b>Thumbs Up</b> → Switch to Scene A</li>
<li>👎 <b>Thumbs Down</b> → Switch to Scene B</li>
</ul>

<h3>Setup:</h3>
<ol>
<li>Get a free API key from <a href="https://moondream.ai">moondream.ai</a></li>
<li>Select your webcam source below</li>
<li>Map gestures to scenes</li>
<li>Enable detection and start gesturing!</li>
</ol>

<p><a href="https://streamgeeks.github.io/visual-reasoning-playground/03-gesture-obs/">Try the Web Demo</a> | 
<a href="https://github.com/streamgeeks/visual-reasoning-playground">GitHub</a></p>
"""

# =============================================================================
# Script Properties (UI in OBS Scripts window)
# =============================================================================

def script_properties():
    props = obs.obs_properties_create()
    
    # API Key
    obs.obs_properties_add_text(props, "api_key", "Moondream API Key", obs.OBS_TEXT_PASSWORD)
    
    # Video Source Selection
    source_list = obs.obs_properties_add_list(
        props, "source_name", "Webcam Source",
        obs.OBS_COMBO_TYPE_LIST, obs.OBS_COMBO_FORMAT_STRING
    )
    obs.obs_property_list_add_string(source_list, "-- Select Source --", "")
    
    sources = obs.obs_enum_sources()
    if sources:
        for source in sources:
            source_id = obs.obs_source_get_unversioned_id(source)
            # Include video capture devices
            if source_id in ["dshow_input", "v4l2_input", "av_capture_input", "window_capture", "browser_source"]:
                name = obs.obs_source_get_name(source)
                obs.obs_property_list_add_string(source_list, name, name)
        obs.source_list_release(sources)
    
    # Scene Mappings
    thumbs_up_list = obs.obs_properties_add_list(
        props, "thumbs_up_scene", "👍 Thumbs Up → Scene",
        obs.OBS_COMBO_TYPE_LIST, obs.OBS_COMBO_FORMAT_STRING
    )
    thumbs_down_list = obs.obs_properties_add_list(
        props, "thumbs_down_scene", "👎 Thumbs Down → Scene",
        obs.OBS_COMBO_TYPE_LIST, obs.OBS_COMBO_FORMAT_STRING
    )
    
    obs.obs_property_list_add_string(thumbs_up_list, "-- No Action --", "")
    obs.obs_property_list_add_string(thumbs_down_list, "-- No Action --", "")
    
    scenes = obs.obs_frontend_get_scenes()
    if scenes:
        for scene in scenes:
            name = obs.obs_source_get_name(scene)
            obs.obs_property_list_add_string(thumbs_up_list, name, name)
            obs.obs_property_list_add_string(thumbs_down_list, name, name)
        obs.source_list_release(scenes)
    
    # Detection Settings
    obs.obs_properties_add_int_slider(
        props, "detection_interval", "Detection Interval (ms)",
        1000, 5000, 500
    )
    obs.obs_properties_add_int_slider(
        props, "cooldown_seconds", "Cooldown Between Actions (sec)",
        1, 10, 1
    )
    
    # Enable/Disable
    obs.obs_properties_add_bool(props, "enabled", "✅ Enable Gesture Detection")
    obs.obs_properties_add_bool(props, "debug_mode", "🐛 Debug Mode (log to Script Log)")
    
    return props

def script_defaults(settings):
    obs.obs_data_set_default_int(settings, "detection_interval", 2000)
    obs.obs_data_set_default_int(settings, "cooldown_seconds", 3)
    obs.obs_data_set_default_bool(settings, "enabled", False)
    obs.obs_data_set_default_bool(settings, "debug_mode", False)

def script_update(settings):
    global settings_data
    
    settings_data["api_key"] = obs.obs_data_get_string(settings, "api_key")
    settings_data["source_name"] = obs.obs_data_get_string(settings, "source_name")
    settings_data["thumbs_up_scene"] = obs.obs_data_get_string(settings, "thumbs_up_scene")
    settings_data["thumbs_down_scene"] = obs.obs_data_get_string(settings, "thumbs_down_scene")
    settings_data["detection_interval"] = obs.obs_data_get_int(settings, "detection_interval")
    settings_data["cooldown_seconds"] = obs.obs_data_get_int(settings, "cooldown_seconds")
    settings_data["enabled"] = obs.obs_data_get_bool(settings, "enabled")
    settings_data["debug_mode"] = obs.obs_data_get_bool(settings, "debug_mode")
    
    # Restart timer with new interval
    obs.timer_remove(detection_callback)
    
    if settings_data["enabled"] and settings_data["api_key"] and settings_data["source_name"]:
        obs.timer_add(detection_callback, settings_data["detection_interval"])
        log_debug("Gesture detection ENABLED")
    else:
        log_debug("Gesture detection DISABLED")

def script_unload():
    obs.timer_remove(detection_callback)
    log_debug("Script unloaded")

# =============================================================================
# Logging
# =============================================================================

def log_debug(message):
    if settings_data.get("debug_mode", False):
        print(f"[Moondream Gesture] {message}")

def log_info(message):
    print(f"[Moondream Gesture] {message}")

# =============================================================================
# Screenshot Capture
# =============================================================================

def capture_source_frame():
    """Capture a frame from the selected OBS source and return as base64"""
    source_name = settings_data["source_name"]
    if not source_name:
        return None
    
    source = obs.obs_get_source_by_name(source_name)
    if not source:
        log_debug(f"Source not found: {source_name}")
        return None
    
    # Create a temporary file for the screenshot
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, "moondream_gesture_frame.jpg")
    
    try:
        # Use OBS screenshot functionality (OBS 28+)
        # Note: This saves synchronously which may cause brief stutters
        obs.obs_source_save_screenshot(source, "jpg", temp_path, 640, 480)
        
        # Small delay to ensure file is written
        time.sleep(0.05)
        
        # Read and encode the image
        if os.path.exists(temp_path):
            with open(temp_path, "rb") as f:
                image_data = f.read()
            
            # Clean up temp file
            try:
                os.remove(temp_path)
            except:
                pass
            
            return base64.b64encode(image_data).decode("utf-8")
    except Exception as e:
        log_debug(f"Screenshot error: {e}")
    finally:
        obs.obs_source_release(source)
    
    return None

# =============================================================================
# Moondream API
# =============================================================================

def detect_gesture(image_base64, gesture_name):
    """Call Moondream API to detect if a gesture is present"""
    api_key = settings_data["api_key"]
    if not api_key or not image_base64:
        return False
    
    url = "https://api.moondream.ai/v1/query"
    headers = {
        "X-Moondream-Auth": api_key,
        "Content-Type": "application/json"
    }
    
    prompt = f"Is there a clear {gesture_name} hand gesture visible in this image? Answer only YES or NO."
    
    payload = {
        "image_url": f"data:image/jpeg;base64,{image_base64}",
        "question": prompt,
        "stream": False
    }
    
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
            answer = result.get("answer", "").upper().strip()
            detected = "YES" in answer
            log_debug(f"Gesture '{gesture_name}': {answer} -> {detected}")
            return detected
            
    except urllib.error.HTTPError as e:
        log_debug(f"API HTTP Error: {e.code} - {e.reason}")
    except urllib.error.URLError as e:
        log_debug(f"API URL Error: {e.reason}")
    except Exception as e:
        log_debug(f"API Error: {e}")
    
    return False

# =============================================================================
# Scene Switching
# =============================================================================

def switch_to_scene(scene_name):
    """Switch to the specified scene with cooldown protection"""
    global last_action_time
    
    if not scene_name:
        return False
    
    current_time = time.time()
    cooldown = settings_data["cooldown_seconds"]
    
    if current_time - last_action_time < cooldown:
        log_debug(f"Cooldown active, {cooldown - (current_time - last_action_time):.1f}s remaining")
        return False
    
    # Get current scene to avoid unnecessary switches
    current_scene = obs.obs_frontend_get_current_scene()
    if current_scene:
        current_name = obs.obs_source_get_name(current_scene)
        obs.obs_source_release(current_scene)
        if current_name == scene_name:
            log_debug(f"Already on scene: {scene_name}")
            return False
    
    # Find and switch to target scene
    scenes = obs.obs_frontend_get_scenes()
    if scenes:
        for scene in scenes:
            name = obs.obs_source_get_name(scene)
            if name == scene_name:
                obs.obs_frontend_set_current_scene(scene)
                last_action_time = current_time
                log_info(f"✓ Switched to scene: {scene_name}")
                obs.source_list_release(scenes)
                return True
        obs.source_list_release(scenes)
    
    log_debug(f"Scene not found: {scene_name}")
    return False

# =============================================================================
# Main Detection Loop (called by OBS timer)
# =============================================================================

def detection_callback():
    """Main detection callback - runs on OBS timer"""
    global thumbs_up_count, thumbs_down_count
    
    if not settings_data["enabled"]:
        return
    
    if not settings_data["api_key"]:
        log_debug("No API key configured")
        return
    
    if not settings_data["source_name"]:
        log_debug("No video source selected")
        return
    
    # Capture frame from source
    image_base64 = capture_source_frame()
    if not image_base64:
        log_debug("Failed to capture frame")
        return
    
    log_debug("Frame captured, detecting gestures...")
    
    # Check for thumbs up
    if settings_data["thumbs_up_scene"]:
        if detect_gesture(image_base64, "thumbs up"):
            thumbs_up_count += 1
            thumbs_down_count = 0
            log_debug(f"Thumbs up detected ({thumbs_up_count}/{DEBOUNCE_REQUIRED})")
            
            if thumbs_up_count >= DEBOUNCE_REQUIRED:
                switch_to_scene(settings_data["thumbs_up_scene"])
                thumbs_up_count = 0
        else:
            thumbs_up_count = 0
    
    # Check for thumbs down
    if settings_data["thumbs_down_scene"]:
        if detect_gesture(image_base64, "thumbs down"):
            thumbs_down_count += 1
            thumbs_up_count = 0
            log_debug(f"Thumbs down detected ({thumbs_down_count}/{DEBOUNCE_REQUIRED})")
            
            if thumbs_down_count >= DEBOUNCE_REQUIRED:
                switch_to_scene(settings_data["thumbs_down_scene"])
                thumbs_down_count = 0
        else:
            thumbs_down_count = 0
