# Issues & Gotchas - Identity-Aware Tracking

## [2026-01-25 Initial] Known Constraints
- iOS 13+ required for VNGenerateImageFeaturePrintRequest
- Embeddings are Float arrays (~128-256 dimensions)
- Tracking loop runs at 150ms intervals for Vision backend
- Native module changes require new EAS build

## [2026-01-25] Build Error - Swift Type Mismatch
- Error: cannot convert value of type 'Data' to expected argument type 'MLMultiArray'
- Location: VisionTrackingModule.swift line 643
- Root cause: VNFeaturePrintObservation.data is Data, not MLMultiArray
- Fix: Replace mlMultiArrayToFloatArray with dataToFloatArray using withUnsafeBytes

## [2026-01-25] Build Error RESOLVED
- Fixed: Swift type mismatch in VisionTrackingModule.swift
- Solution: dataToFloatArray with withUnsafeBytes memory binding
- Status: Ready for device build
