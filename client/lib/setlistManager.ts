import {
  Setlist,
  SetlistSong,
  SongPresetMapping,
  getSetlists,
  saveSetlist,
  deleteSetlist,
  getSongPresetMappings,
  generateId,
  getPresets,
  PTZPreset,
} from "@/lib/storage";
import { viscaPresetRecall, ViscaConfig } from "@/lib/visca";

export interface SetlistExecutionState {
  setlistId: string;
  currentSongIndex: number;
  currentPresetIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
}

export interface SetlistImportResult {
  success: boolean;
  setlist?: Setlist;
  warnings?: string[];
  error?: string;
}

export async function createSetlist(name: string, eventDate?: string): Promise<Setlist> {
  const setlist: Setlist = {
    id: generateId(),
    name,
    eventDate,
    songs: [],
    createdAt: new Date().toISOString(),
  };

  await saveSetlist(setlist);
  return setlist;
}

export async function addSongToSetlist(
  setlistId: string,
  song: Omit<SetlistSong, "order">
): Promise<Setlist | null> {
  const setlists = await getSetlists();
  const setlist = setlists.find((s) => s.id === setlistId);
  if (!setlist) return null;

  const newSong: SetlistSong = {
    ...song,
    order: setlist.songs.length,
  };

  setlist.songs.push(newSong);
  await saveSetlist(setlist);
  return setlist;
}

export async function removeSongFromSetlist(
  setlistId: string,
  songIndex: number
): Promise<Setlist | null> {
  const setlists = await getSetlists();
  const setlist = setlists.find((s) => s.id === setlistId);
  if (!setlist || songIndex < 0 || songIndex >= setlist.songs.length) return null;

  setlist.songs.splice(songIndex, 1);
  setlist.songs.forEach((song, i) => {
    song.order = i;
  });

  await saveSetlist(setlist);
  return setlist;
}

export async function reorderSetlistSong(
  setlistId: string,
  fromIndex: number,
  toIndex: number
): Promise<Setlist | null> {
  const setlists = await getSetlists();
  const setlist = setlists.find((s) => s.id === setlistId);
  if (!setlist) return null;

  const [movedSong] = setlist.songs.splice(fromIndex, 1);
  setlist.songs.splice(toIndex, 0, movedSong);
  setlist.songs.forEach((song, i) => {
    song.order = i;
  });

  await saveSetlist(setlist);
  return setlist;
}

export async function updateSongPresets(
  setlistId: string,
  songIndex: number,
  presetIds: string[]
): Promise<Setlist | null> {
  const setlists = await getSetlists();
  const setlist = setlists.find((s) => s.id === setlistId);
  if (!setlist || songIndex < 0 || songIndex >= setlist.songs.length) return null;

  setlist.songs[songIndex].presetSequence = presetIds;
  await saveSetlist(setlist);
  return setlist;
}

export async function populateSetlistFromMappings(setlistId: string): Promise<Setlist | null> {
  const setlists = await getSetlists();
  const setlist = setlists.find((s) => s.id === setlistId);
  if (!setlist) return null;

  const mappings = await getSongPresetMappings();

  for (const song of setlist.songs) {
    if (song.presetSequence.length === 0) {
      const mapping = mappings.find((m) => m.songIdentifier === song.songIdentifier);
      if (mapping) {
        song.presetSequence = [mapping.presetId];
      }
    }
  }

  await saveSetlist(setlist);
  return setlist;
}

export async function importSetlistFromText(text: string, name?: string): Promise<SetlistImportResult> {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { success: false, error: "No songs found in input" };
  }

  const warnings: string[] = [];
  const songs: SetlistSong[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(/[-–—]/).map((p) => p.trim());

    let title: string;
    let artist: string;

    if (parts.length >= 2) {
      artist = parts[0];
      title = parts.slice(1).join(" - ");
    } else {
      title = line;
      artist = "Unknown Artist";
      warnings.push(`Line ${i + 1}: Could not parse artist, using "Unknown Artist"`);
    }

    songs.push({
      order: i,
      songIdentifier: `manual_${generateId()}`,
      songTitle: title,
      songArtist: artist,
      presetSequence: [],
    });
  }

  const setlist: Setlist = {
    id: generateId(),
    name: name || `Imported Setlist ${new Date().toLocaleDateString()}`,
    songs,
    createdAt: new Date().toISOString(),
  };

  await saveSetlist(setlist);

  return {
    success: true,
    setlist,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export async function duplicateSetlist(setlistId: string, newName?: string): Promise<Setlist | null> {
  const setlists = await getSetlists();
  const original = setlists.find((s) => s.id === setlistId);
  if (!original) return null;

  const duplicate: Setlist = {
    ...original,
    id: generateId(),
    name: newName || `${original.name} (Copy)`,
    createdAt: new Date().toISOString(),
    songs: original.songs.map((song) => ({ ...song })),
  };

  await saveSetlist(duplicate);
  return duplicate;
}

export class SetlistExecutor {
  private state: SetlistExecutionState | null = null;
  private setlist: Setlist | null = null;
  private presets: PTZPreset[] = [];
  private viscaConfig: ViscaConfig;
  private onStateChange?: (state: SetlistExecutionState) => void;
  private onSongChange?: (song: SetlistSong, index: number) => void;
  private onPresetExecuted?: (preset: PTZPreset) => void;
  private onComplete?: () => void;

  constructor(
    viscaConfig: ViscaConfig,
    options?: {
      onStateChange?: (state: SetlistExecutionState) => void;
      onSongChange?: (song: SetlistSong, index: number) => void;
      onPresetExecuted?: (preset: PTZPreset) => void;
      onComplete?: () => void;
    }
  ) {
    this.viscaConfig = viscaConfig;
    this.onStateChange = options?.onStateChange;
    this.onSongChange = options?.onSongChange;
    this.onPresetExecuted = options?.onPresetExecuted;
    this.onComplete = options?.onComplete;
  }

  async load(setlistId: string): Promise<boolean> {
    const setlists = await getSetlists();
    this.setlist = setlists.find((s) => s.id === setlistId) ?? null;
    if (!this.setlist) return false;

    this.presets = await getPresets();

    this.state = {
      setlistId,
      currentSongIndex: 0,
      currentPresetIndex: 0,
      isPlaying: false,
      isPaused: false,
    };

    return true;
  }

  getState(): SetlistExecutionState | null {
    return this.state;
  }

  getCurrentSong(): SetlistSong | null {
    if (!this.setlist || !this.state) return null;
    return this.setlist.songs[this.state.currentSongIndex] ?? null;
  }

  async start(): Promise<void> {
    if (!this.state || !this.setlist) return;

    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.notifyStateChange();

    await this.executeCurrentPosition();
  }

  pause(): void {
    if (!this.state) return;

    this.state.isPaused = true;
    this.state.isPlaying = false;
    this.notifyStateChange();
  }

  async resume(): Promise<void> {
    if (!this.state) return;

    this.state.isPaused = false;
    this.state.isPlaying = true;
    this.notifyStateChange();
  }

  stop(): void {
    if (!this.state) return;

    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.currentSongIndex = 0;
    this.state.currentPresetIndex = 0;
    this.notifyStateChange();
  }

  async nextPreset(): Promise<void> {
    if (!this.state || !this.setlist) return;

    const currentSong = this.setlist.songs[this.state.currentSongIndex];
    if (!currentSong) return;

    if (this.state.currentPresetIndex < currentSong.presetSequence.length - 1) {
      this.state.currentPresetIndex++;
    } else {
      await this.nextSong();
      return;
    }

    this.notifyStateChange();
    await this.executeCurrentPosition();
  }

  async previousPreset(): Promise<void> {
    if (!this.state || !this.setlist) return;

    if (this.state.currentPresetIndex > 0) {
      this.state.currentPresetIndex--;
    } else if (this.state.currentSongIndex > 0) {
      this.state.currentSongIndex--;
      const prevSong = this.setlist.songs[this.state.currentSongIndex];
      this.state.currentPresetIndex = Math.max(0, prevSong.presetSequence.length - 1);
      this.onSongChange?.(prevSong, this.state.currentSongIndex);
    }

    this.notifyStateChange();
    await this.executeCurrentPosition();
  }

  async nextSong(): Promise<void> {
    if (!this.state || !this.setlist) return;

    if (this.state.currentSongIndex < this.setlist.songs.length - 1) {
      this.state.currentSongIndex++;
      this.state.currentPresetIndex = 0;

      const song = this.setlist.songs[this.state.currentSongIndex];
      this.onSongChange?.(song, this.state.currentSongIndex);
      this.notifyStateChange();
      await this.executeCurrentPosition();
    } else {
      this.stop();
      this.onComplete?.();
    }
  }

  async previousSong(): Promise<void> {
    if (!this.state || !this.setlist) return;

    if (this.state.currentSongIndex > 0) {
      this.state.currentSongIndex--;
      this.state.currentPresetIndex = 0;

      const song = this.setlist.songs[this.state.currentSongIndex];
      this.onSongChange?.(song, this.state.currentSongIndex);
      this.notifyStateChange();
      await this.executeCurrentPosition();
    }
  }

  async jumpToSong(index: number): Promise<void> {
    if (!this.state || !this.setlist) return;
    if (index < 0 || index >= this.setlist.songs.length) return;

    this.state.currentSongIndex = index;
    this.state.currentPresetIndex = 0;

    const song = this.setlist.songs[index];
    this.onSongChange?.(song, index);
    this.notifyStateChange();
    await this.executeCurrentPosition();
  }

  private async executeCurrentPosition(): Promise<void> {
    if (!this.state || !this.setlist || this.state.isPaused) return;

    const song = this.setlist.songs[this.state.currentSongIndex];
    if (!song || song.presetSequence.length === 0) return;

    const presetId = song.presetSequence[this.state.currentPresetIndex];
    const preset = this.presets.find((p) => p.id === presetId);

    if (preset) {
      await viscaPresetRecall(this.viscaConfig, parseInt(preset.id, 10) || this.state.currentPresetIndex);
      this.onPresetExecuted?.(preset);
    }
  }

  private notifyStateChange(): void {
    if (this.state) {
      this.onStateChange?.({ ...this.state });
    }
  }
}
