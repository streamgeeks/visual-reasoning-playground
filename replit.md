# Visual Reasoning Playground

## Overview
Visual Reasoning Playground is a mobile application that transforms PTZOptics professional cameras into AI-powered tracking systems. It bridges consumer mobile experience with professional broadcast equipment, allowing users to control PTZ cameras with their phone while leveraging computer vision models for automatic object tracking.

## Current State
MVP implementation with all core features:
- Live camera view with PTZ camera streaming and AI tracking overlay
- PTZ joystick controls (pan/tilt/zoom)
- 5 tracking models: Person, Ball, Face, Multi-Object (YOLO), Custom (Moondream AI)
- Autonomous object tracking with visual feedback (bounding boxes, tracking state indicators)
- Real-time performance stats overlay (FPS, inference time, latency, stream mode)
- Multi-mode streaming: RTSP (20-30 FPS), MJPEG (web), Snapshot (1-2 FPS fallback)
- Stream mode indicator with color coding (green=RTSP, yellow=snapshot)
- Preset management with smart templates
- Instant replay buffer controls
- Settings with camera management and profile customization

## Tracking System

### Detection Backends
1. **YOLO (Local)**: Person, Ball, Face, Multi-Object models use YOLOv5 via torch hub
   - No API key required
   - Faster updates (~3 FPS)
   - Runs on Python backend (port 8082)
   
2. **Moondream (API)**: Custom object tracking
   - User types any object description
   - Requires API key (Settings)
   - Flexible detection of any object

### Visual Feedback
- **Bounding Box**: Shows detected object with color-coded border
  - Green = LOCKED (centered in deadzone)
  - Yellow = TRACKING (camera moving to center object)
- **Status Indicator**: LOCKED / TRACKING [direction] / SEARCHING
- **Deadzone**: 15% center area where no PTZ movement occurs

## Project Architecture

### Technology Stack
- **Frontend**: React Native with Expo
- **Backend**: Express.js (port 5000) - Moondream AI integration, static file serving
- **RTSP Backend**: Python/FastAPI + OpenCV (port 8082) - PTZ camera streaming
- **State Management**: React hooks + AsyncStorage for persistence
- **Navigation**: React Navigation 7+ (Bottom Tabs + Native Stack)

### File Structure
```
client/
├── App.tsx                     # Root component with providers
├── components/
│   ├── Button.tsx              # Animated primary button
│   ├── Card.tsx                # Elevation-based card component
│   ├── CameraCard.tsx          # Camera profile card
│   ├── DetectionOverlay.tsx    # AI detection bounding boxes
│   ├── EmptyState.tsx          # Empty state with illustration
│   ├── ErrorBoundary.tsx       # Error boundary wrapper
│   ├── ErrorFallback.tsx       # Crash recovery UI
│   ├── HeaderTitle.tsx         # App branding in header
│   ├── ModelSelector.tsx       # AI model picker + tracking toggle
│   ├── PresetCard.tsx          # Preset item card
│   ├── PTZJoystick.tsx         # Pan/tilt/zoom controls
│   ├── SettingsRow.tsx         # Settings list items
│   ├── StatRow.tsx             # Single stat display
│   ├── StatsOverlay.tsx        # Performance metrics panel
│   ├── TemplateCard.tsx        # Preset template card
│   ├── ThemedText.tsx          # Themed typography
│   └── ThemedView.tsx          # Themed container
├── constants/
│   └── theme.ts                # Colors, spacing, typography, shadows
├── hooks/
│   ├── useColorScheme.ts       # System color scheme detection
│   ├── useScreenOptions.ts     # Navigation screen options
│   └── useTheme.ts             # Theme hook
├── lib/
│   ├── camera.ts               # Direct camera connection utilities
│   ├── presetTemplates.ts      # Smart preset templates
│   ├── query-client.ts         # React Query setup
│   ├── rtspBackend.ts          # RTSP backend integration (high FPS streaming)
│   ├── storage.ts              # AsyncStorage utilities
│   └── tracking.ts             # Tracking models and mock data
├── components/
│   └── MJPEGStream.tsx         # WebView-based MJPEG streaming for native
├── navigation/
│   ├── LiveStackNavigator.tsx  # Live tab stack
│   ├── MainTabNavigator.tsx    # Bottom tab navigator (4 tabs)
│   ├── PresetsStackNavigator.tsx
│   ├── ReplayStackNavigator.tsx
│   ├── RootStackNavigator.tsx
│   └── SettingsStackNavigator.tsx
└── screens/
    ├── LiveScreen.tsx          # Main camera view with controls
    ├── ModelInfoScreen.tsx     # AI model information
    ├── PresetsScreen.tsx       # Preset management
    ├── ReplayScreen.tsx        # Instant replay buffer
    └── SettingsScreen.tsx      # App configuration

backend/                        # Python RTSP backend
├── main.py                     # FastAPI app with WebSocket streaming
├── requirements.txt            # Python dependencies
└── services/
    ├── camera_manager.py       # Multi-camera connection manager
    └── rtsp_service.py         # OpenCV RTSP capture service
```

### Navigation Structure
- **Root Stack**: Main entry point
  - **Main Tab Navigator** (4 tabs):
    - **Live Tab** → LiveStackNavigator
      - LiveScreen (main camera view)
      - ModelInfoScreen (AI model details)
    - **Presets Tab** → PresetsStackNavigator
      - PresetsScreen (preset management)
    - **Replay Tab** → ReplayStackNavigator
      - ReplayScreen (instant replay)
    - **Settings Tab** → SettingsStackNavigator
      - SettingsScreen (configuration)

## Key Features

### Live View
- Simulated video feed with grid pattern and crosshair
- Detection overlay with bounding boxes
- Toggleable stats overlay (FPS, latency, confidence)
- PTZ joystick with pan/tilt control and zoom slider
- Quick actions: Home, Center, Wide

### Tracking Models
1. **Person Tracker** - Optimized for single person tracking
2. **Ball Tracker** - Sports ball detection
3. **Face Tracker** - High-precision face detection
4. **Multi-Object** - General 80+ class detection

### Presets
- Save custom camera positions
- Smart templates: Basketball, Interview, Classroom, Stage
- Quick position recall

### Replay Buffer
- Configurable duration (10-60 seconds)
- Playback controls with scrubber
- Save to Photos functionality

### Settings
- Camera profile management
- User profile customization
- Performance settings (stats overlay toggle)
- Moondream API key configuration

## Design System

### Colors (Dark Mode Primary)
- Background: #0A0E14 (deep charcoal)
- Surface: #1A1F29 (elevated panels)
- Primary: #00D9FF (broadcast cyan)
- Accent: #FF5C35 (alert orange)
- Success: #2EA043
- Warning: #D29922
- Error: #F85149

### Typography
- Uses system fonts (SF Pro on iOS)
- Monospaced for stats overlay (SF Mono)

## Recent Changes
- January 2026: Initial MVP implementation
- 4-tab navigation structure
- Complete UI for all screens
- AsyncStorage-based persistence
- Simulated tracking data for demo mode
- MJPEG streaming now works on all platforms (web, iOS, Android) via WebView
- Streaming priority: RTSP backend (if available) → MJPEG (10-15 FPS) → Snapshot fallback (1-2 FPS)

## Development Notes

### RTSP Streaming Architecture
- PTZOptics cameras use standard RTSP at `rtsp://<ip>:554/1` for main stream
- Python FastAPI backend (port 8082) handles RTSP capture via OpenCV
- Frames are captured server-side and served to mobile app as JPEG images
- WebSocket endpoint available for real-time streaming at higher FPS

### Starting the RTSP Backend
```bash
cd backend && python main.py
```

### Camera Configuration
Users configure cameras in Settings with:
- IP address (e.g., 192.168.1.100)
- RTSP port (default 554)
- HTTP port (default 80)
- Username/password for authenticated streams

### Object Tracking Tool
- Connect to configured PTZ camera via RTSP
- Select tracking model (Person, Ball, Face, Multi-Object)
- Live FPS and frame count displayed when connected
