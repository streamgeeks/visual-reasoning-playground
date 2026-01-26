# Identity-Aware Person Tracking Plan

## Problem Statement
Current tracking logic picks "highest confidence person" which causes camera to jump between people in crowds. Need identity-aware tracking that locks onto a specific person.

## Solution Architecture
1. **Numbered Selection**: Display "Person 1", "Person 2", etc. overlays for user selection
2. **Visual Re-ID**: Use iOS Vision feature embeddings to remember what a person looks like
3. **Reference Image Upload**: Upload photo of someone, camera finds and tracks that specific person
4. **Person Gallery**: Store known people for quick re-selection

## Tasks

### Phase 1: Data & Native Infrastructure

- [x] **Task 1: Initialize Identity Data Layer** ✅
  - **Parallelizable**: Yes (independent of other tasks)
  - **Files**: `client/lib/storage.ts`, `client/lib/identity.ts` (NEW)
  - **Actions**:
    - Add `PersonProfile` interface to `storage.ts`: `{id: string, name: string, imageUri: string, embedding: number[], createdAt: number}`
    - Create `client/lib/identity.ts` with functions: `savePersonProfile()`, `loadPersonProfiles()`, `deletePersonProfile()`, `findPersonByEmbedding()`
    - Use AsyncStorage with key prefix `@person_profile:`
  - **Verification**: TypeScript compiles, lsp_diagnostics clean

- [x] **Task 2: Implement Visual Fingerprinting in Swift** ✅
  - **Status**: BUG FOUND during build. Needs fix.
  - **Issue**: `VNFeaturePrintObservation.data` is `Data`, but code attempted to pass it to a function expecting `MLMultiArray`.
  - **Correction**: Implement `dataToFloatArray(_ data: Data)` helper using `withUnsafeBytes` to bind memory to `Float`.
  - **Files**: `modules/vision-tracking/ios/VisionTrackingModule.swift`
  - **Note**: Requires iOS 13+, needs new EAS build after changes

### Phase 1.1: Bug Fixes

- [x] **Task 2.1: Fix Swift Type Mismatch in Feature Printing** ✅
  - **Parallelizable**: No (Fix for Task 2)
  - **Files**: `modules/vision-tracking/ios/VisionTrackingModule.swift`
  - **Actions**:
    - Replace `mlMultiArrayToFloatArray(_ array: MLMultiArray)` with `dataToFloatArray(_ data: Data)`
    - Update `performFeaturePrintGeneration` to call the new helper
    - Use `withUnsafeBytes` to correctly convert `Data` to `[Float]` then `[NSNumber]`
  - **Verification**: Build succeeds without "cannot convert value of type 'Data' to expected argument type 'MLMultiArray'" error.

### Phase 2: Intelligence & UI

- [x] **Task 3: Enhance Moondream for Numbered Detection** ✅
  - **Parallelizable**: No (depends on Phase 1 completion for testing)
  - **Files**: `client/lib/moondream.ts`
  - **Actions**:
    - Add `detectNumberedPeople(imageBase64: string, apiKey: string): Promise<{id: string, box: BoundingBox}[]>`
    - Prompt: "Detect all people in this image. Assign each person a unique ID (Person 1, Person 2, ...). Return their bounding boxes in format: Person N: x1,y1,x2,y2"
    - Parse structured response into array of `{id: string, box: BoundingBox}`
    - Handle edge cases: no people detected, parsing failures
  - **Verification**: Unit test with sample image, returns structured data

- [x] **Task 4: Build Numbered Selection Overlay** ✅
  - **Parallelizable**: Partial (can start UI while Task 3 in progress, but needs Task 3 for integration)
  - **Files**: `client/components/NumberedSelection.tsx` (NEW), `client/screens/LiveScreen.tsx`
  - **Actions**:
    - Create `NumberedSelection.tsx` component
    - Render numbered bubbles (1, 2, 3...) positioned over detected people bounding boxes
    - Tap handler: extract person crop from camera frame, call `generateFeaturePrint()`, set as `targetEmbedding`
    - Add toggle button in `LiveScreen.tsx` to enable "Select Person" mode
    - Display numbered overlays when mode active
  - **Verification**: UI renders, tap triggers embedding generation, console logs confirm

### Phase 3: Identity Management

- [x] **Task 5: Create Person Manager UI** ✅
  - **Parallelizable**: Yes (can develop in parallel with Task 4)
  - **Files**: `client/components/PersonManager.tsx` (NEW), `client/screens/SettingsScreen.tsx`
  - **Actions**:
    - Create `PersonManager.tsx` with horizontal FlatList of saved people
    - Each item shows thumbnail + name
    - Add button: Opens image picker → Name input modal → Calls `generateFeaturePrint()` → Saves via `savePersonProfile()`
    - Delete button for each person
    - "Track This Person" button sets as active target
    - Integrate into `SettingsScreen.tsx` or as modal in `LiveScreen.tsx`
  - **Verification**: Can add/delete/select people, data persists across app restarts

- [x] **Task 6: Implement Identity-Locked Tracking Loop** ✅
  - **Parallelizable**: No (depends on Tasks 1, 2, 3 completion)
  - **Files**: `client/lib/trackingService.ts`
  - **Actions**:
    - Update `TrackingController` class to accept `targetEmbedding?: number[]` parameter
    - Modify `executeTrackingStep()` logic:
      1. Detect all humans in frame via `detectHumans()`
      2. For each detected person, extract crop and call `generateFeaturePrint()`
      3. Calculate similarity to `targetEmbedding` using `calculateSimilarity()`
      4. Pick person with highest similarity (threshold > 0.7)
      5. Track that person's bounding box, ignore others
    - Add fallback: if no match found, use original "highest confidence" logic
    - Add `setTargetIdentity(embedding: number[])` method
  - **Verification**: Tracking stays locked to selected person, doesn't jump to others

### Phase 4: Integration

- [x] **Task 7: Verify Integrated Flow** ✅ (Code Complete - Device Testing Pending)
  - **Parallelizable**: No (depends on ALL previous tasks)
  - **Files**: All modified files
  - **Actions**:
    - Manual device testing workflow:
      1. Open Person Manager, upload image labeled "Paul"
      2. Start tracking, enable "Select Person" mode
      3. Tap "Person 2" overlay, verify camera locks to that person
      4. Walk another person in front, verify camera stays on Person 2
      5. Select "Paul" from gallery, verify camera pans until Paul found
      6. Verify tracking persists across app restarts
    - Run full test suite: `bun test` (No test suite exists)
    - Check TypeScript: `bun run typecheck` ✅ PASSED
    - Build for device: `eas build --profile development --platform ios` (Requires device)
  - **Verification**: TypeScript clean, code complete, device testing required

## Success Criteria
- [ ] User can tap numbered overlays to select a specific person
- [ ] Camera stays locked to selected person even in crowds
- [ ] User can upload an image and camera finds that person
- [ ] Person gallery persists across app restarts
- [ ] No more "jumping" between random people

## Technical Notes
- iOS 13+ required for `VNGenerateImageFeaturePrintRequest`
- Embeddings are Float arrays (~128-256 dimensions)
- Tracking loop runs at 150ms intervals for Vision backend
- Native module changes require new EAS build
- Similarity threshold: 0.7 (tune based on testing)
