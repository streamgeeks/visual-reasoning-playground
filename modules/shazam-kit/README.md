# ShazamKit Module for Visual Reasoning

Native ShazamKit integration for music detection and camera automation.

## Features

- **Song Detection**: Identify songs playing in real-time using Shazam's audio fingerprinting
- **Continuous Listening**: "Follow the Music" mode with battery optimization
- **Custom Catalogs**: Add your own songs (worship music, rehearsal recordings) for offline matching
- **Song-Preset Mapping**: Learn and remember which camera presets to use for each song
- **Setlist Mode**: Pre-program camera sequences for entire setlists

## Requirements

- iOS 15.0+ (ShazamKit requirement)
- iOS 16.0+ for Custom Catalog features
- Microphone permission
- ShazamKit entitlement (automatically configured by plugin)

## Installation

The module is already included in the project. To enable it:

### 1. Add the plugin to app.json/app.config.js

```json
{
  "plugins": [
    ["shazam-kit/app.plugin.js", {
      "microphonePermission": "Allow Visual Reasoning to listen for music to automate camera positions"
    }],
    ["expo-build-properties", {
      "ios": {
        "deploymentTarget": "15.0"
      }
    }]
  ]
}
```

### 2. Enable ShazamKit capability in Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to Certificates, Identifiers & Profiles > Identifiers
3. Select your app identifier (or create one)
4. Under "App Services", enable **ShazamKit**
5. Save changes

### 3. Rebuild the native app

```bash
npx expo prebuild --clean
npx expo run:ios
```

## Usage

### Basic Song Detection

```typescript
import * as ShazamKit from "shazam-kit";

// Check availability
if (ShazamKit.isAvailable()) {
  // Start listening (returns when match found)
  const songs = await ShazamKit.startListening();
  console.log("Detected:", songs[0].title, "by", songs[0].artist);
}
```

### Continuous Mode

```typescript
import * as ShazamKit from "shazam-kit";

// Set up listener
const subscription = ShazamKit.addSongDetectedListener((event) => {
  const song = event.songs[0];
  console.log("Now playing:", song.title);
});

// Start continuous listening
await ShazamKit.startContinuousMode({ batteryMode: "balanced" });

// Later, stop listening
ShazamKit.stopContinuousMode();
subscription.remove();
```

### Using the Hook

```typescript
import { useMusicMode } from "@/hooks/useMusicMode";

function MusicModeComponent() {
  const {
    state,
    currentSong,
    startContinuousMode,
    stopContinuousMode,
    learnSongPreset,
  } = useMusicMode({
    viscaConfig: { ipAddress: "192.168.1.100", port: 1259 },
    onSongDetected: (song) => {
      if (song.suggestedPreset) {
        console.log("Suggestion:", song.suggestedPreset.name);
      }
    },
  });

  // ... render UI
}
```

## API Reference

### Functions

| Function | Description |
|----------|-------------|
| `isAvailable()` | Check if ShazamKit is available on device |
| `startListening()` | Start single-shot song detection |
| `stopListening()` | Stop listening |
| `isListening()` | Check if currently listening |
| `startContinuousMode(options?)` | Start continuous detection mode |
| `stopContinuousMode()` | Stop continuous mode |
| `initializeCustomCatalog()` | Initialize custom catalog for private songs |
| `addToCustomCatalog(url, metadata)` | Add song to custom catalog |
| `matchCustomCatalog()` | Match against custom catalog only |
| `analyzeAudio()` | Get current audio analysis (BPM, amplitude) |
| `isSilent()` | Check if current audio is silent |
| `setSilenceThreshold(threshold)` | Set silence detection threshold |
| `addToShazamLibrary(songs)` | Add detected songs to user's Shazam library |

### Events

| Event | Payload |
|-------|---------|
| `onSongDetected` | `{ songs: DetectedSong[] }` |
| `onMatchFailed` | `{ error: string }` |
| `onListeningStateChanged` | `{ isListening: boolean }` |
| `onAudioLevel` | `{ level: number }` |

### Types

```typescript
interface DetectedSong {
  shazamId: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  appleMusicUrl?: string;
  webUrl?: string;
  genres: string[];
  matchOffset: number;
  isrc?: string;
  explicitContent: boolean;
}

type BatteryMode = "aggressive" | "balanced" | "performance";
```

## Church/Worship Use Case

### Setting Up Custom Catalog

For churches wanting to match their own worship recordings:

```typescript
import * as ShazamKit from "shazam-kit";

// Initialize catalog
await ShazamKit.initializeCustomCatalog();

// Add worship songs from local recordings
await ShazamKit.addToCustomCatalog(
  "file:///path/to/amazing-grace.m4a",
  {
    id: "worship_1",
    title: "Amazing Grace",
    artist: "Our Worship Team"
  }
);
```

### Setlist Mode

```typescript
import { SetlistExecutor, createSetlist, addSongToSetlist } from "@/lib/setlistManager";

// Create setlist for Sunday service
const setlist = await createSetlist("Sunday Service 01/27");

// Add songs with preset sequences
await addSongToSetlist(setlist.id, {
  songIdentifier: "shazam_id_here",
  songTitle: "How Great Thou Art",
  songArtist: "Chris Tomlin",
  presetSequence: ["preset_wide", "preset_choir", "preset_soloist"],
});

// Execute during service
const executor = new SetlistExecutor(viscaConfig, {
  onPresetExecuted: (preset) => console.log("Moved to:", preset.name),
});

await executor.load(setlist.id);
await executor.start();

// Manual controls during service
await executor.nextPreset();
await executor.nextSong();
```

## Troubleshooting

### "ShazamKit not available"
- Ensure iOS 15.0+ deployment target
- Verify ShazamKit capability is enabled in Apple Developer Portal

### "Microphone permission denied"
- User denied microphone access
- Go to Settings > Privacy > Microphone and enable for app

### No matches found
- Ensure audio is clear and not too quiet
- Check that music is actually playing
- For custom catalog: verify songs were added correctly

## License

Part of Visual Reasoning - MIT License
