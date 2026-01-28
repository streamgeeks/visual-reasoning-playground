import { useState, useEffect, useCallback, useRef } from "react";
import * as ShazamKit from "shazam-kit";
import type { DetectedSong, Subscription } from "shazam-kit";
import {
  SongPresetMapping,
  MusicModeSettings,
  getSongPresetMapping,
  saveSongPresetMapping,
  incrementSongMappingUsage,
  getMusicModeSettings,
  saveMusicModeSettings,
  generateId,
  getPresets,
  PTZPreset,
} from "@/lib/storage";
import { viscaPresetRecall, ViscaConfig } from "@/lib/visca";

export type MusicModeState = "idle" | "listening" | "detected" | "executing" | "error";

export interface DetectedSongWithMapping extends DetectedSong {
  mapping?: SongPresetMapping;
  suggestedPreset?: PTZPreset;
}

export interface UseMusicModeOptions {
  viscaConfig?: ViscaConfig;
  onSongDetected?: (song: DetectedSongWithMapping) => void;
  onPresetExecuted?: (preset: PTZPreset, song: DetectedSong) => void;
  onError?: (error: string) => void;
}

export interface UseMusicModeReturn {
  state: MusicModeState;
  isListening: boolean;
  currentSong: DetectedSongWithMapping | null;
  audioLevel: number;
  settings: MusicModeSettings;
  availablePresets: PTZPreset[];
  startListening: () => Promise<void>;
  stopListening: () => void;
  startContinuousMode: () => Promise<void>;
  stopContinuousMode: () => void;
  executePresetForSong: (presetId: string) => Promise<void>;
  learnSongPreset: (song: DetectedSong, presetId: string) => Promise<void>;
  dismissSuggestion: () => void;
  updateSettings: (settings: Partial<MusicModeSettings>) => Promise<void>;
}

export function useMusicMode(options: UseMusicModeOptions = {}): UseMusicModeReturn {
  const { viscaConfig, onSongDetected, onPresetExecuted, onError } = options;

  const [state, setState] = useState<MusicModeState>("idle");
  const [isListening, setIsListening] = useState(false);
  const [currentSong, setCurrentSong] = useState<DetectedSongWithMapping | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [settings, setSettings] = useState<MusicModeSettings | null>(null);
  const [availablePresets, setAvailablePresets] = useState<PTZPreset[]>([]);

  const subscriptionsRef = useRef<Subscription[]>([]);
  const isContinuousModeRef = useRef(false);

  useEffect(() => {
    loadInitialData();
    return () => {
      cleanupSubscriptions();
    };
  }, []);

  const loadInitialData = async () => {
    const [loadedSettings, presets] = await Promise.all([
      getMusicModeSettings(),
      getPresets(),
    ]);
    setSettings(loadedSettings);
    setAvailablePresets(presets);
  };

  const cleanupSubscriptions = () => {
    subscriptionsRef.current.forEach((sub) => sub.remove());
    subscriptionsRef.current = [];
  };

  const setupEventListeners = () => {
    cleanupSubscriptions();

    const songSub = ShazamKit.addSongDetectedListener(async (event) => {
      if (event.songs.length > 0) {
        await handleSongDetected(event.songs[0]);
      }
    });

    const stateSub = ShazamKit.addListeningStateListener((event) => {
      setIsListening(event.isListening);
      if (!event.isListening && !isContinuousModeRef.current) {
        setState("idle");
      }
    });

    const levelSub = ShazamKit.addAudioLevelListener((event) => {
      setAudioLevel(event.level);
    });

    const failSub = ShazamKit.addMatchFailedListener((event) => {
      if (!isContinuousModeRef.current) {
        setState("idle");
        onError?.(event.error);
      }
    });

    subscriptionsRef.current = [songSub, stateSub, levelSub, failSub];
  };

  const handleSongDetected = async (song: DetectedSong) => {
    setState("detected");

    const mapping = await getSongPresetMapping(song.shazamId);
    let suggestedPreset: PTZPreset | undefined;

    if (mapping) {
      suggestedPreset = availablePresets.find((p) => p.id === mapping.presetId);
    }

    const songWithMapping: DetectedSongWithMapping = {
      ...song,
      mapping: mapping ?? undefined,
      suggestedPreset,
    };

    setCurrentSong(songWithMapping);
    onSongDetected?.(songWithMapping);

    if (settings?.autoExecuteKnownSongs && mapping && suggestedPreset && viscaConfig) {
      await executePreset(suggestedPreset, song);
    }
  };

  const executePreset = async (preset: PTZPreset, song: DetectedSong) => {
    if (!viscaConfig) return;

    setState("executing");

    try {
      await viscaPresetRecall(viscaConfig, parseInt(preset.id, 10) || 0);
      await incrementSongMappingUsage(song.shazamId);
      onPresetExecuted?.(preset, song);
    } catch (error) {
      onError?.(`Failed to execute preset: ${error}`);
    }

    setState(isContinuousModeRef.current ? "listening" : "idle");
  };

  const startListening = useCallback(async () => {
    if (!ShazamKit.isAvailable()) {
      onError?.("ShazamKit not available on this device");
      return;
    }

    setState("listening");
    setupEventListeners();

    try {
      const songs = await ShazamKit.startListening();
      if (songs.length > 0) {
        await handleSongDetected(songs[0]);
      }
    } catch (error: any) {
      setState("error");
      onError?.(error.message || "Failed to start listening");
    }
  }, [settings, availablePresets, viscaConfig]);

  const stopListening = useCallback(() => {
    ShazamKit.stopListening();
    isContinuousModeRef.current = false;
    setState("idle");
    setCurrentSong(null);
    cleanupSubscriptions();
  }, []);

  const startContinuousMode = useCallback(async () => {
    if (!ShazamKit.isAvailable()) {
      onError?.("ShazamKit not available on this device");
      return;
    }

    isContinuousModeRef.current = true;
    setState("listening");
    setupEventListeners();

    try {
      await ShazamKit.startContinuousMode({
        batteryMode: settings?.batteryOptimization ?? "balanced",
      });
    } catch (error: any) {
      setState("error");
      isContinuousModeRef.current = false;
      onError?.(error.message || "Failed to start continuous mode");
    }
  }, [settings]);

  const stopContinuousMode = useCallback(() => {
    ShazamKit.stopContinuousMode();
    isContinuousModeRef.current = false;
    setState("idle");
    setCurrentSong(null);
    cleanupSubscriptions();
  }, []);

  const executePresetForSong = useCallback(
    async (presetId: string) => {
      if (!currentSong || !viscaConfig) return;

      const preset = availablePresets.find((p) => p.id === presetId);
      if (!preset) return;

      await executePreset(preset, currentSong);
    },
    [currentSong, availablePresets, viscaConfig]
  );

  const learnSongPreset = useCallback(
    async (song: DetectedSong, presetId: string) => {
      const existingMapping = await getSongPresetMapping(song.shazamId);

      const mapping: SongPresetMapping = {
        id: existingMapping?.id ?? generateId(),
        songIdentifier: song.shazamId,
        songTitle: song.title,
        songArtist: song.artist,
        artworkUrl: song.artworkUrl,
        presetId,
        triggerType: "song_start",
        confidence: existingMapping ? Math.min(1, existingMapping.confidence + 0.1) : 0.5,
        usageCount: existingMapping ? existingMapping.usageCount + 1 : 1,
        createdAt: existingMapping?.createdAt ?? new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      };

      await saveSongPresetMapping(mapping);

      if (currentSong?.shazamId === song.shazamId) {
        const preset = availablePresets.find((p) => p.id === presetId);
        setCurrentSong({
          ...currentSong,
          mapping,
          suggestedPreset: preset,
        });
      }
    },
    [currentSong, availablePresets]
  );

  const dismissSuggestion = useCallback(() => {
    setCurrentSong(null);
    if (isContinuousModeRef.current) {
      setState("listening");
    } else {
      setState("idle");
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<MusicModeSettings>) => {
    await saveMusicModeSettings(newSettings);
    const updated = await getMusicModeSettings();
    setSettings(updated);
  }, []);

  return {
    state,
    isListening,
    currentSong,
    audioLevel,
    settings: settings ?? {
      enabled: false,
      continuousListening: false,
      autoRecordOnMusic: false,
      autoStopOnSilence: true,
      silenceThresholdSeconds: 5,
      suggestPresets: true,
      autoExecuteKnownSongs: false,
      batteryOptimization: "balanced",
    },
    availablePresets,
    startListening,
    stopListening,
    startContinuousMode,
    stopContinuousMode,
    executePresetForSong,
    learnSongPreset,
    dismissSuggestion,
    updateSettings,
  };
}
