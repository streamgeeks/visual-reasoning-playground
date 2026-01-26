# Learnings - Identity-Aware Tracking

## [2026-01-25 Initial] Session Start
- Previous session completed Camera Enhancements Pro (auth fix, color matcher, fine-tune ring)
- All TypeScript clean, ready for new feature work
- Current tracking bug: camera jumps between people due to "highest confidence" selection logic

## [2026-01-25] Phase 1 Complete - Tasks 1 & 2
- PersonProfile interface added to storage.ts (lines 85-91)
- identity.ts created with full CRUD + embedding search (115 lines)
- Swift feature printing methods added to VisionTrackingModule.swift
- generateFeaturePrint() and calculateSimilarity() exported to React Native
- TypeScript compilation: CLEAN (bun run check:types passed)
- Cosine similarity implemented in both TypeScript and Swift

## [2026-01-25] Task 3 Complete - Moondream Numbered Detection
- detectNumberedPeople() added to moondream.ts (lines 225-293)
- Uses query endpoint with custom prompt for sequential person IDs
- Regex parser extracts Person N: x1,y1,x2,y2 format
- Validates coordinates in 0-1 range with proper bounds checking
- Returns empty array on errors (graceful degradation)

## [2026-01-25] Task 4 Complete - Numbered Selection Overlay
- NumberedSelection.tsx component created with animated bubbles
- LiveScreen.tsx integrated with Select Person toggle button
- handleSelectPerson() crops person and generates embedding via VisionTracking
- TypeScript definitions added to vision-tracking module
- TypeScript compilation: CLEAN

## [2026-01-25] Task 5 Complete - Person Manager UI
- PersonManager.tsx created with horizontal FlatList
- Add/delete/track functionality with camera capture
- Integrated into SettingsScreen.tsx
- Uses identity.ts functions for persistence
- TypeScript compilation: CLEAN

## Phase 3 Task 6: Identity-Locked Tracking Loop

### Implementation Details
- Modified `detectWithVision()` to accept optional `targetEmbedding?: number[]` parameter
- Added `cropDetection()` helper function using expo-image-manipulator to crop detected persons
- When targetEmbedding is set: generates embeddings for all detected people, picks highest similarity match above 0.7 threshold
- When targetEmbedding is null: falls back to original highest-confidence logic
- Added `setTargetIdentity(embedding: number[])` and `clearTargetIdentity()` methods to TrackingController
- TrackingController passes targetEmbedding to detectWithVision in runVisionTrackingStep()

### Bug Fix
- Original bug at lines 122-124: `detections.reduce((a, b) => a.confidence > b.confidence ? a : b)`
- This caused camera to jump between people when multiple detected
- Fix: Use embedding similarity matching when targetEmbedding is set, only track the specific person

### Key Patterns
- IDENTITY_SIMILARITY_THRESHOLD = 0.7 (matches decision from decisions.md)
- cropDetection uses normalized coordinates (0-1) converted to pixels with default 1920x1080 frame size
- Promise.all for parallel embedding generation across all detections
- Error handling: failed embedding generation returns similarity 0, doesn't break loop

### TypeScript
- No new TypeScript errors introduced
- Pre-existing error in server/index.ts (unrelated)

## [2026-01-25] Task 6 Complete - Identity-Locked Tracking Loop
- BUG FIXED: Lines 122-124 no longer pick highest confidence blindly
- detectWithVision() now accepts targetEmbedding parameter
- When targetEmbedding set: generates embeddings for all detections, picks best similarity match
- Similarity threshold: 0.7 (configurable via IDENTITY_SIMILARITY_THRESHOLD)
- TrackingController has setTargetIdentity() and clearTargetIdentity() methods
- cropDetection() helper function added for extracting person crops
- Fallback to original confidence-based logic when no target set
- TypeScript compilation: CLEAN (only pre-existing server error)

## [2026-01-25] Task 7 Complete - Verification
- TypeScript compilation: CLEAN (bun run check:types passed)
- No test suite exists in project
- All 7 tasks completed successfully
- Device testing required for full verification
- Next step: eas build --profile development --platform ios

## [2026-01-25] Task 2.1 Complete - Swift Type Mismatch Fix
- Line 643: Changed from mlMultiArrayToFloatArray to dataToFloatArray
- Removed 'try' keyword (new function doesn't throw)
- Lines 651-657: New dataToFloatArray function using withUnsafeBytes
- Correctly handles VNFeaturePrintObservation.data (type: Data)
- Binds memory to Float buffer, maps to [NSNumber]
- TypeScript compilation: CLEAN
- Ready for eas build --profile development --platform ios

## [2026-01-25] ALL TASKS COMPLETE
- Total tasks: 8 (Tasks 1-7 + Task 2.1 bug fix)
- All tasks verified and marked complete
- TypeScript compilation: CLEAN
- Swift type mismatch: FIXED
- Code ready for device build
- Success criteria require device testing (cannot be automated)
