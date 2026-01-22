# Visual Reasoning Playground - Design Guidelines

## 1. Brand Identity

**Purpose**: Professional broadcast tool that transforms PTZOptics cameras into AI-powered tracking systems. Bridges consumer mobile UX with industrial-grade equipment control.

**Aesthetic Direction**: **Technical Precision with Editorial Clarity**
- Inspired by professional broadcast software (vMix, OBS) and aviation cockpits
- High information density without clutter
- Dark-first interface (easier on eyes during long monitoring sessions)
- Monospaced elements for real-time stats
- Intentional use of color only for status/alerts

**Memorable Element**: Live performance overlay with FPS/latency metrics always visible - this app shows you what's happening under the hood, not just pretty results.

## 2. Navigation Architecture

**Root Navigation**: Tab Bar (4 tabs)
- **Live** (camera icon) - MainCameraView with streaming/tracking
- **Presets** (bookmark icon) - PresetManagerView
- **Replay** (clock.arrow.circlepath icon) - ReplayBufferView  
- **Settings** (gear icon) - SettingsView

**Modal Screens**:
- CameraDiscoveryView (onboarding, presented once)
- ModelSelectorView (sheet from Live tab)
- StatsOverlayView (floating overlay on Live tab)

**No Authentication Required** - Single-user utility with local storage. Settings screen includes user profile section with customizable avatar and display name for personalization.

## 3. Screen-by-Screen Specifications

### CameraDiscoveryView (Onboarding)
- **Purpose**: Add PTZOptics camera via IP + credentials
- **Layout**: 
  - Default navigation header with "Skip" button (right) to use phone camera
  - Scrollable form with IP address field, username/password, "Connect" button
  - Top inset: headerHeight + Spacing.xl
  - Bottom inset: insets.bottom + Spacing.xl
- **Components**: Text inputs, primary action button, helper text explaining RTSP discovery
- **Empty State**: Illustration showing camera with WiFi waves (camera-setup.png)

### MainCameraView (Live Tab)
- **Purpose**: Real-time RTSP stream with AI tracking overlay
- **Layout**:
  - Transparent header with camera name (left), stats toggle + model selector (right)
  - Full-screen video preview (16:9 aspect)
  - Floating PTZ joystick (bottom-left)
  - Floating StatsOverlayView (top-right, toggleable)
  - Top inset: headerHeight + Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xl
- **Components**: Video player, detection box overlays, floating controls
- **Empty State**: When no camera connected, show phone camera viewfinder with "Connect Camera" button

### PTZControlsView (Floating Component)
- **Purpose**: Manual pan/tilt/zoom control
- **Layout**: Floating card with circular joystick + vertical zoom slider
- **Components**: Touch-responsive joystick (180pt circle), zoom slider, quick preset buttons (Home, Center, Wide)
- **Visual**: Semi-transparent dark background (opacity 0.85), subtle shadow for depth

### StatsOverlayView (Floating Overlay)
- **Purpose**: Real-time performance metrics for engineers
- **Layout**: Compact list in top-right corner
- **Components**: Monospaced text showing FPS, inference time, latency, confidence, bitrate, dropped frames
- **Visual**: Black background (opacity 0.7), 8pt padding, 8pt corner radius

### ModelSelectorView (Sheet)
- **Purpose**: Switch AI tracking models (Person, Ball, Face, Multi-Object)
- **Layout**: 
  - Header with "Model Information" title, "Done" button (right)
  - List of 4 models with descriptions
  - "About Visual Reasoning" educational section
  - Top inset: Spacing.xl
  - Bottom inset: insets.bottom + Spacing.xl
- **Components**: Radio-style selection list, info cards

### PresetManagerView (Presets Tab)
- **Purpose**: Save/load camera positions
- **Layout**:
  - Header with "+" button (right) to add preset
  - List of saved presets (swipe to delete)
  - "Smart Templates" section with pre-configured positions
  - Top inset: Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xl
- **Components**: Grid of preset cards with thumbnail previews
- **Empty State**: Illustration of camera angles (empty-presets.png)

### ReplayBufferView (Replay Tab)
- **Purpose**: Review last 30-60 seconds of footage
- **Layout**:
  - Header with "Save to Photos" button (right)
  - Video player with scrubber timeline
  - Playback controls (play/pause, 10s skip)
  - Top inset: Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xl
- **Empty State**: Illustration of film reel (empty-replay.png) with "No footage captured yet"

### SettingsView (Settings Tab)
- **Purpose**: App configuration and camera management
- **Layout**:
  - Default header
  - Scrollable grouped list
  - Top inset: Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xl
- **Sections**:
  - Profile (avatar, display name)
  - Camera Settings (manage saved cameras)
  - Buffer Duration (10-60s slider)
  - Moondream API Key
  - Performance (show stats by default toggle)
  - About/Help

## 4. Color Palette

**Dark Mode Primary** (default):
- Background: `#0A0E14` (deep charcoal, not pure black)
- Surface: `#1A1F29` (elevated panels)
- Primary: `#00D9FF` (broadcast cyan - technical, precise, high contrast)
- Accent: `#FF5C35` (alert orange for recording/errors)
- Text Primary: `#E6EDF3` (off-white)
- Text Secondary: `#8B949E` (medium gray)
- Success: `#2EA043` (green for tracking active)
- Warning: `#D29922` (amber for latency warnings)
- Error: `#F85149` (red for dropped frames)

**Light Mode** (optional support):
- Background: `#FFFFFF`
- Surface: `#F6F8FA`
- Primary: `#0969DA` (darker cyan for readability)
- Keep accent/semantic colors same

## 5. Typography

**Font**: System (SF Pro) - optimized for iOS readability and performance
- **Display**: SF Pro Display Bold, 28pt (screen titles)
- **Headline**: SF Pro Text Semibold, 17pt (section headers)
- **Body**: SF Pro Text Regular, 15pt (descriptions)
- **Caption**: SF Pro Text Regular, 13pt (labels)
- **Monospaced Stats**: SF Mono Regular, 11pt (performance overlay)

## 6. Visual Design

- **Icons**: Use SF Symbols exclusively (camera, play.circle, bookmark, gear, scope, etc.)
- **Touchable Feedback**: Subtle scale down (0.95) + opacity (0.7) on press
- **Floating Elements**: Use EXACT shadow spec:
  - shadowOffset: {width: 0, height: 2}
  - shadowOpacity: 0.10
  - shadowRadius: 2
- **Detection Boxes**: 2pt stroke, color matches tracked object class, show confidence % label
- **Joystick**: Blue handle (#00D9FF) on gray track, crosshair guides
- **Video Player**: Maintain 16:9 aspect ratio, black letterboxing if needed

## 7. Assets to Generate

**Required:**
1. **icon.png** - App icon showing camera lens with AI tracking reticle overlay - **WHERE USED**: Home screen
2. **splash-icon.png** - Simplified camera lens icon - **WHERE USED**: Launch screen
3. **camera-setup.png** - PTZ camera with WiFi signal waves, dark background - **WHERE USED**: CameraDiscoveryView empty state
4. **empty-presets.png** - Grid of 9 camera angle positions (top-left, top-center, etc.) - **WHERE USED**: PresetManagerView empty state
5. **empty-replay.png** - Film reel or video timeline illustration - **WHERE USED**: ReplayBufferView empty state

**Recommended:**
6. **avatar-default.png** - Professional headshot placeholder (neutral gray silhouette) - **WHERE USED**: SettingsView profile section
7. **onboarding-hero.png** - Phone controlling PTZ camera with tracking lines - **WHERE USED**: Optional welcome screen

**Asset Style**: Minimal line art, #00D9FF accent color on dark background, technical/blueprint aesthetic to match broadcast industry.