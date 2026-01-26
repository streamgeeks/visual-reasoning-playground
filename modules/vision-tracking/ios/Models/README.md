# Core ML Models for Native Detection

This module requires Core ML models for native object detection.

## Required Models

### 1. YOLOv8n (Object Detection) - REQUIRED
- **File**: `yolov8n.mlpackage` or `yolov8n.mlmodelc`
- **Size**: ~6MB
- **Input**: 640x640 RGB image
- **Output**: Detection boxes, class scores (80 COCO classes)

**Download options:**

Option A - Export from Ultralytics (requires Python):
```bash
pip install ultralytics
yolo export model=yolov8n.pt format=coreml nms=True
```

Option B - Download pre-converted:
- HuggingFace: https://huggingface.co/TheCluster/YOLOv8-CoreML/tree/main
- Download `yolov8n.mlpackage`

### 2. MobileCLIP-S0 (Open Vocabulary Matching) - OPTIONAL
- **Files**: 
  - `MobileCLIP-S0-ImageEncoder.mlpackage` (~15MB)
  - `MobileCLIP-S0-TextEncoder.mlpackage` (~15MB)
- **Image Input**: 256x256 RGB, normalized
- **Text Input**: Tokenized text (77 tokens max)
- **Output**: 512-dimensional embeddings

**Download:**
- HuggingFace: https://huggingface.co/apple/coreml-mobileclip/tree/main
- Download both image and text encoder packages

## Installation

1. Download model files to this `Models/` directory
2. Run `npx pod-install` from the project root
3. Rebuild with EAS: `eas build --platform ios --profile development`

## Model Placement

After download, your directory should look like:
```
modules/vision-tracking/ios/Models/
├── README.md
├── yolov8n.mlpackage/
│   └── Data/
│       └── ... (model files)
├── MobileCLIP-S0-ImageEncoder.mlpackage/  (optional)
└── MobileCLIP-S0-TextEncoder.mlpackage/   (optional)
```

## Troubleshooting

### Models Not Loading
Check the Xcode console for these log messages:
```
[NativeDetector] Searching for YOLO model in bundle: /path/to/bundle
[NativeDetector] YOLO model loaded successfully: yolov8n from /path/to/model
```

If you see "YOLO model not found", verify:
1. Model files are in this `Models/` directory (not somewhere else)
2. You ran `npx pod-install` after adding models
3. You rebuilt the app (`eas build` or Xcode clean build)

### EAS Build
For EAS builds, models are bundled automatically via the podspec.
After adding models, you MUST rebuild - hot reload won't pick up new resources.

### Local Development (Xcode)
If using Xcode directly:
1. Open `ios/VisualReasoningPlayground.xcworkspace`
2. Ensure `VisionTracking` pod includes the Models folder
3. Clean build folder (Cmd+Shift+K) and rebuild
