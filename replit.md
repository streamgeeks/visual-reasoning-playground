# Visual Reasoning Playground

## Overview
Visual Reasoning Playground is a mobile application that transforms PTZOptics professional cameras into AI-powered tracking systems. It bridges consumer mobile experience with professional broadcast equipment, allowing users to control PTZ cameras with their phone while leveraging computer vision models for automatic object tracking.

## Current State
MVP implementation with all core features:
- Live camera view with simulated video feed and AI tracking overlay
- PTZ joystick controls (pan/tilt/zoom)
- 4 tracking models: Person, Ball, Face, Multi-Object
- Real-time performance stats overlay (FPS, inference time, latency, etc.)
- Preset management with smart templates
- Instant replay buffer controls
- Settings with camera management and profile customization

## Project Architecture

### Technology Stack
- **Frontend**: React Native with Expo
- **Backend**: Express.js (minimal - mostly client-side app)
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
│   ├── presetTemplates.ts      # Smart preset templates
│   ├── query-client.ts         # React Query setup
│   ├── storage.ts              # AsyncStorage utilities
│   └── tracking.ts             # Tracking models and mock data
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

## Development Notes
- The app simulates RTSP camera feeds since actual RTSP streaming isn't available in Expo Go
- Tracking data is generated client-side for demonstration purposes
- Real PTZ camera integration would require network access and PTZOptics HTTP API
