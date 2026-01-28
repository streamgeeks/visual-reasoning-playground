import { NativeModulesProxy, EventEmitter, Subscription } from "expo-modules-core";

const ShazamKitModule = NativeModulesProxy.ShazamKit;
const emitter = new EventEmitter(ShazamKitModule);

export interface DetectedSong {
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

export interface AudioAnalysis {
  bpm: number;
  isSilent: boolean;
  averageAmplitude: number;
}

export interface CustomSongMetadata {
  id: string;
  title: string;
  artist: string;
}

export type BatteryMode = "aggressive" | "balanced" | "performance";

export interface ContinuousModeOptions {
  batteryMode?: BatteryMode;
}

export interface SongDetectedEvent {
  songs: DetectedSong[];
}

export interface MatchFailedEvent {
  error: string;
}

export interface ListeningStateEvent {
  isListening: boolean;
}

export interface AudioLevelEvent {
  level: number;
}

export function isAvailable(): boolean {
  return ShazamKitModule.isAvailable();
}

export async function startListening(): Promise<DetectedSong[]> {
  return ShazamKitModule.startListening();
}

export function stopListening(): void {
  ShazamKitModule.stopListening();
}

export function isListening(): boolean {
  return ShazamKitModule.isListening();
}

export async function startContinuousMode(
  options?: ContinuousModeOptions
): Promise<{ success: boolean }> {
  return ShazamKitModule.startContinuousMode(options ?? {});
}

export function stopContinuousMode(): void {
  ShazamKitModule.stopContinuousMode();
}

export async function initializeCustomCatalog(): Promise<{ success: boolean }> {
  return ShazamKitModule.initializeCustomCatalog();
}

export async function addToCustomCatalog(
  audioFileUrl: string,
  metadata: CustomSongMetadata
): Promise<{ success: boolean; signatureId?: string }> {
  return ShazamKitModule.addToCustomCatalog(audioFileUrl, metadata);
}

export async function matchCustomCatalog(): Promise<DetectedSong[]> {
  return ShazamKitModule.matchCustomCatalog();
}

export async function analyzeAudio(): Promise<AudioAnalysis> {
  return ShazamKitModule.analyzeAudio();
}

export function isSilent(): boolean {
  return ShazamKitModule.isSilent();
}

export function setSilenceThreshold(threshold: number): void {
  ShazamKitModule.setSilenceThreshold(threshold);
}

export async function addToShazamLibrary(
  songs: Array<{ title: string; artist: string; shazamId: string }>
): Promise<{ success: boolean; error?: string }> {
  return ShazamKitModule.addToShazamLibrary(songs);
}

export function addSongDetectedListener(
  listener: (event: SongDetectedEvent) => void
): Subscription {
  return emitter.addListener("onSongDetected", listener);
}

export function addMatchFailedListener(
  listener: (event: MatchFailedEvent) => void
): Subscription {
  return emitter.addListener("onMatchFailed", listener);
}

export function addListeningStateListener(
  listener: (event: ListeningStateEvent) => void
): Subscription {
  return emitter.addListener("onListeningStateChanged", listener);
}

export function addAudioLevelListener(
  listener: (event: AudioLevelEvent) => void
): Subscription {
  return emitter.addListener("onAudioLevel", listener);
}

export function removeAllListeners(): void {
  emitter.removeAllListeners("onSongDetected");
  emitter.removeAllListeners("onMatchFailed");
  emitter.removeAllListeners("onListeningStateChanged");
  emitter.removeAllListeners("onAudioLevel");
}
