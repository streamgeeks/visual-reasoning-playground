# Architectural Decisions - Identity-Aware Tracking

## [2026-01-25 Initial] Architecture Choice
- Using iOS Vision framework's VNGenerateImageFeaturePrintRequest for embeddings
- Moondream will handle numbered person detection with custom prompts
- Storage layer uses AsyncStorage for PersonProfile persistence
- Tracking loop modified to use embedding similarity instead of confidence scores

## [2026-01-25] Final Architecture
- Identity storage: AsyncStorage via identity.ts
- Feature extraction: iOS Vision VNGenerateImageFeaturePrintRequest
- Similarity matching: Cosine similarity with 0.7 threshold
- Numbered detection: Moondream query endpoint with custom prompt
- UI: NumberedSelection overlay + PersonManager gallery
- Tracking: Modified detectWithVision() with embedding-based person selection
