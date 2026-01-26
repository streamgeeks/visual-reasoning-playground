import Foundation
import CoreML
import Vision
import UIKit

/// COCO 80 class labels for YOLOv8
let cocoLabels: [String] = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
    "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake",
    "chair", "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop",
    "mouse", "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
]

/// Detection result from YOLO
struct YOLODetection {
    let classIndex: Int
    let label: String
    let confidence: Float
    let boundingBox: CGRect  // Normalized 0-1, top-left origin
}

/// Native detector using YOLO + MobileCLIP
class NativeDetector {
    
    // MARK: - Singleton
    static let shared = NativeDetector()
    
    // MARK: - Models
    private var yoloModel: VNCoreMLModel?
    private var clipImageModel: MLModel?
    private var clipTextModel: MLModel?
    
    // MARK: - Configuration
    private let yoloInputSize: CGSize = CGSize(width: 640, height: 640)
    private let clipInputSize: CGSize = CGSize(width: 256, height: 256)
    private let confidenceThreshold: Float = 0.25
    private let iouThreshold: Float = 0.45
    
    // MARK: - Model Loading Status
    private(set) var isYOLOLoaded: Bool = false
    private(set) var isCLIPLoaded: Bool = false
    
    // MARK: - Bundle for Resources
    private var moduleBundle: Bundle {
        let frameworkBundle = Bundle(for: NativeDetector.self)
        
        if let resourceBundleURL = frameworkBundle.url(forResource: "VisionTrackingModels", withExtension: "bundle"),
           let resourceBundle = Bundle(url: resourceBundleURL) {
            print("[NativeDetector] Using resource bundle: \(resourceBundleURL.path)")
            return resourceBundle
        }
        
        if let resourceBundleURL = Bundle.main.url(forResource: "VisionTrackingModels", withExtension: "bundle"),
           let resourceBundle = Bundle(url: resourceBundleURL) {
            print("[NativeDetector] Using main bundle resource: \(resourceBundleURL.path)")
            return resourceBundle
        }
        
        let candidates = [frameworkBundle, Bundle.main]
        if let found = candidates.first(where: { bundle in
            bundle.url(forResource: "yolov8n", withExtension: "mlmodelc") != nil ||
            bundle.url(forResource: "yolov8n", withExtension: "mlpackage") != nil
        }) {
            print("[NativeDetector] Using direct bundle: \(found.bundlePath)")
            return found
        }
        
        print("[NativeDetector] No model bundle found, using framework bundle")
        return frameworkBundle
    }
    
    private init() {
        loadModels()
    }
    
    // MARK: - Model Loading
    
    private func loadModels() {
        loadYOLOModel()
        loadCLIPModels()
    }
    
    private func loadYOLOModel() {
        let modelNames = ["yolov8n", "YOLOv8n", "yolov8n-seg"]
        let bundle = moduleBundle
        
        print("[NativeDetector] Searching for YOLO model in bundle: \(bundle.bundlePath)")
        
        for modelName in modelNames {
            if let modelURL = bundle.url(forResource: modelName, withExtension: "mlmodelc") ??
                              bundle.url(forResource: modelName, withExtension: "mlpackage") {
                do {
                    let config = MLModelConfiguration()
                    if #available(iOS 16.0, *) {
                        config.computeUnits = .cpuAndNeuralEngine
                    } else {
                        config.computeUnits = .all
                    }
                    
                    let mlModel = try MLModel(contentsOf: modelURL, configuration: config)
                    yoloModel = try VNCoreMLModel(for: mlModel)
                    isYOLOLoaded = true
                    print("[NativeDetector] YOLO model loaded successfully: \(modelName) from \(modelURL.path)")
                    return
                } catch {
                    print("[NativeDetector] Failed to load YOLO model \(modelName): \(error)")
                }
            }
        }
        
        print("[NativeDetector] YOLO model not found. Searched in: \(bundle.bundlePath)")
        print("[NativeDetector] Place yolov8n.mlpackage in modules/vision-tracking/ios/Models/")
    }
    
    private func loadCLIPModels() {
        let imageEncoderNames = ["MobileCLIP-S0-ImageEncoder", "mobileclip_image", "clip_image_encoder"]
        let textEncoderNames = ["MobileCLIP-S0-TextEncoder", "mobileclip_text", "clip_text_encoder"]
        let bundle = moduleBundle
        
        for modelName in imageEncoderNames {
            if let modelURL = bundle.url(forResource: modelName, withExtension: "mlmodelc") ??
                              bundle.url(forResource: modelName, withExtension: "mlpackage") {
                do {
                    let config = MLModelConfiguration()
                    if #available(iOS 16.0, *) {
                        config.computeUnits = .cpuAndNeuralEngine
                    } else {
                        config.computeUnits = .all
                    }
                    clipImageModel = try MLModel(contentsOf: modelURL, configuration: config)
                    print("[NativeDetector] CLIP image encoder loaded: \(modelName)")
                    break
                } catch {
                    print("[NativeDetector] Failed to load CLIP image encoder \(modelName): \(error)")
                }
            }
        }
        
        for modelName in textEncoderNames {
            if let modelURL = bundle.url(forResource: modelName, withExtension: "mlmodelc") ??
                              bundle.url(forResource: modelName, withExtension: "mlpackage") {
                do {
                    let config = MLModelConfiguration()
                    if #available(iOS 16.0, *) {
                        config.computeUnits = .cpuAndNeuralEngine
                    } else {
                        config.computeUnits = .all
                    }
                    clipTextModel = try MLModel(contentsOf: modelURL, configuration: config)
                    print("[NativeDetector] CLIP text encoder loaded: \(modelName)")
                    break
                } catch {
                    print("[NativeDetector] Failed to load CLIP text encoder \(modelName): \(error)")
                }
            }
        }
        
        isCLIPLoaded = clipImageModel != nil && clipTextModel != nil
        if !isCLIPLoaded {
            print("[NativeDetector] MobileCLIP models not found in: \(bundle.bundlePath)")
        }
    }
    
    // MARK: - YOLO Detection
    
    /// Detect objects using YOLO model
    /// Returns array of detections with bounding boxes and COCO labels
    func detectObjectsYOLO(image: UIImage) async throws -> [YOLODetection] {
        guard let yoloModel = yoloModel else {
            throw NSError(domain: "NativeDetector", code: 1, 
                         userInfo: [NSLocalizedDescriptionKey: "YOLO model not loaded"])
        }
        
        guard let cgImage = image.cgImage else {
            throw NSError(domain: "NativeDetector", code: 2,
                         userInfo: [NSLocalizedDescriptionKey: "Invalid image"])
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNCoreMLRequest(model: yoloModel) { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                let detections = self.parseYOLOResults(request.results, imageSize: image.size)
                continuation.resume(returning: detections)
            }
            
            request.imageCropAndScaleOption = .scaleFill
            
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    private func parseYOLOResults(_ results: [Any]?, imageSize: CGSize) -> [YOLODetection] {
        var detections: [YOLODetection] = []
        
        // Handle VNRecognizedObjectObservation (if model outputs this format)
        if let observations = results as? [VNRecognizedObjectObservation] {
            for observation in observations {
                guard observation.confidence >= confidenceThreshold else { continue }
                
                let label = observation.labels.first?.identifier ?? "object"
                let classIndex = cocoLabels.firstIndex(of: label.lowercased()) ?? -1
                
                // Convert from Vision coordinates (bottom-left) to top-left
                let box = observation.boundingBox
                let flippedY = 1.0 - box.origin.y - box.height
                
                detections.append(YOLODetection(
                    classIndex: classIndex,
                    label: label,
                    confidence: observation.confidence,
                    boundingBox: CGRect(x: box.origin.x, y: flippedY, width: box.width, height: box.height)
                ))
            }
            return detections
        }
        
        // Handle VNCoreMLFeatureValueObservation (raw tensor output)
        if let observations = results as? [VNCoreMLFeatureValueObservation] {
            for observation in observations {
                if let multiArray = observation.featureValue.multiArrayValue {
                    let parsed = parseYOLOTensor(multiArray)
                    detections.append(contentsOf: parsed)
                }
            }
        }
        
        return nonMaxSuppression(detections)
    }
    
    /// Parse raw YOLO output tensor
    /// YOLOv8 outputs shape: [1, 84, 8400] where 84 = 4 (box) + 80 (classes)
    private func parseYOLOTensor(_ tensor: MLMultiArray) -> [YOLODetection] {
        var detections: [YOLODetection] = []
        
        let shape = tensor.shape.map { $0.intValue }
        guard shape.count >= 2 else { return detections }
        
        // YOLOv8 format: [1, 84, 8400] - need to transpose
        let numClasses = 80
        let numBoxes: Int
        let boxDim: Int
        
        if shape.count == 3 && shape[1] == 84 {
            // [1, 84, 8400] format
            numBoxes = shape[2]
            boxDim = shape[1]
        } else if shape.count == 2 && shape[0] == 84 {
            // [84, 8400] format
            numBoxes = shape[1]
            boxDim = shape[0]
        } else {
            print("[NativeDetector] Unexpected YOLO tensor shape: \(shape)")
            return detections
        }
        
        let pointer = tensor.dataPointer.bindMemory(to: Float.self, capacity: tensor.count)
        
        for i in 0..<numBoxes {
            // Get box coordinates (cx, cy, w, h) - first 4 values
            let cx = pointer[0 * numBoxes + i]
            let cy = pointer[1 * numBoxes + i]
            let w = pointer[2 * numBoxes + i]
            let h = pointer[3 * numBoxes + i]
            
            // Find best class
            var bestClassIndex = 0
            var bestScore: Float = 0
            
            for c in 0..<numClasses {
                let score = pointer[(4 + c) * numBoxes + i]
                if score > bestScore {
                    bestScore = score
                    bestClassIndex = c
                }
            }
            
            guard bestScore >= confidenceThreshold else { continue }
            
            // Convert from center format to corner format, normalized 0-1
            let x = CGFloat(cx - w / 2) / 640.0
            let y = CGFloat(cy - h / 2) / 640.0
            let width = CGFloat(w) / 640.0
            let height = CGFloat(h) / 640.0
            
            // Clamp to valid range
            let clampedX = max(0, min(1, x))
            let clampedY = max(0, min(1, y))
            let clampedW = max(0, min(1 - clampedX, width))
            let clampedH = max(0, min(1 - clampedY, height))
            
            let label = bestClassIndex < cocoLabels.count ? cocoLabels[bestClassIndex] : "object"
            
            detections.append(YOLODetection(
                classIndex: bestClassIndex,
                label: label,
                confidence: bestScore,
                boundingBox: CGRect(x: clampedX, y: clampedY, width: clampedW, height: clampedH)
            ))
        }
        
        return detections
    }
    
    /// Non-maximum suppression to remove overlapping boxes
    private func nonMaxSuppression(_ detections: [YOLODetection]) -> [YOLODetection] {
        guard !detections.isEmpty else { return [] }
        
        // Sort by confidence
        let sorted = detections.sorted { $0.confidence > $1.confidence }
        var kept: [YOLODetection] = []
        var suppressed = Set<Int>()
        
        for i in 0..<sorted.count {
            guard !suppressed.contains(i) else { continue }
            
            let detection = sorted[i]
            kept.append(detection)
            
            // Suppress overlapping boxes of same class
            for j in (i + 1)..<sorted.count {
                guard !suppressed.contains(j) else { continue }
                
                let other = sorted[j]
                if detection.classIndex == other.classIndex {
                    let iou = calculateIoU(detection.boundingBox, other.boundingBox)
                    if iou > iouThreshold {
                        suppressed.insert(j)
                    }
                }
            }
        }
        
        return kept
    }
    
    private func calculateIoU(_ a: CGRect, _ b: CGRect) -> Float {
        let intersection = a.intersection(b)
        guard !intersection.isNull else { return 0 }
        
        let intersectionArea = intersection.width * intersection.height
        let unionArea = a.width * a.height + b.width * b.height - intersectionArea
        
        return Float(intersectionArea / unionArea)
    }
    
    // MARK: - CLIP Embeddings
    
    /// Generate image embedding using MobileCLIP
    func embedImage(_ image: UIImage) async throws -> [Float] {
        guard let clipImageModel = clipImageModel else {
            throw NSError(domain: "NativeDetector", code: 3,
                         userInfo: [NSLocalizedDescriptionKey: "CLIP image encoder not loaded"])
        }
        
        // Preprocess image to 256x256
        guard let resized = resizeImage(image, to: clipInputSize),
              let pixelBuffer = imageToPixelBuffer(resized) else {
            throw NSError(domain: "NativeDetector", code: 4,
                         userInfo: [NSLocalizedDescriptionKey: "Failed to preprocess image"])
        }
        
        // Run inference
        let input = try MLDictionaryFeatureProvider(dictionary: ["image": pixelBuffer])
        let output = try clipImageModel.prediction(from: input)
        
        // Extract embedding
        guard let embeddingFeature = output.featureValue(for: "embedding"),
              let multiArray = embeddingFeature.multiArrayValue else {
            throw NSError(domain: "NativeDetector", code: 5,
                         userInfo: [NSLocalizedDescriptionKey: "Failed to get embedding output"])
        }
        
        return multiArrayToFloatArray(multiArray)
    }
    
    /// Generate text embedding using MobileCLIP
    func embedText(_ text: String) async throws -> [Float] {
        guard let clipTextModel = clipTextModel else {
            throw NSError(domain: "NativeDetector", code: 6,
                         userInfo: [NSLocalizedDescriptionKey: "CLIP text encoder not loaded"])
        }
        
        // Tokenize text (simplified - real implementation needs proper tokenizer)
        let tokens = tokenizeText(text)
        let tokenArray = try MLMultiArray(shape: [NSNumber(value: 1), NSNumber(value: 77)], dataType: .int32)
        for (i, token) in tokens.enumerated() {
            tokenArray[i] = NSNumber(value: token)
        }
        
        // Run inference
        let input = try MLDictionaryFeatureProvider(dictionary: ["input_ids": tokenArray])
        let output = try clipTextModel.prediction(from: input)
        
        // Extract embedding
        guard let embeddingFeature = output.featureValue(for: "embedding"),
              let multiArray = embeddingFeature.multiArrayValue else {
            throw NSError(domain: "NativeDetector", code: 7,
                         userInfo: [NSLocalizedDescriptionKey: "Failed to get text embedding output"])
        }
        
        return multiArrayToFloatArray(multiArray)
    }
    
    /// Simple tokenizer for CLIP (maps characters to token IDs)
    /// Note: Real CLIP uses BPE tokenizer - this is a simplified version
    private func tokenizeText(_ text: String) -> [Int32] {
        var tokens: [Int32] = [49406] // Start token
        
        let lowercased = text.lowercased()
        for char in lowercased {
            if let ascii = char.asciiValue {
                tokens.append(Int32(ascii) + 100) // Simple mapping
            }
        }
        
        tokens.append(49407) // End token
        
        // Pad to 77 tokens
        while tokens.count < 77 {
            tokens.append(0)
        }
        
        return Array(tokens.prefix(77))
    }
    
    /// Calculate cosine similarity between two embeddings
    func cosineSimilarity(_ a: [Float], _ b: [Float]) -> Float {
        guard a.count == b.count, !a.isEmpty else { return 0 }
        
        var dotProduct: Float = 0
        var normA: Float = 0
        var normB: Float = 0
        
        for i in 0..<a.count {
            dotProduct += a[i] * b[i]
            normA += a[i] * a[i]
            normB += b[i] * b[i]
        }
        
        let magnitude = sqrt(normA) * sqrt(normB)
        return magnitude > 0 ? dotProduct / magnitude : 0
    }
    
    // MARK: - Open Vocabulary Detection
    
    /// Detect objects matching a text query using YOLO + CLIP
    /// 1. YOLO finds all object proposals
    /// 2. CLIP matches proposals to query text
    func detectWithQuery(image: UIImage, query: String, topK: Int = 5) async throws -> [YOLODetection] {
        // First, get YOLO detections
        let yoloDetections = try await detectObjectsYOLO(image: image)
        
        guard !yoloDetections.isEmpty else {
            return []
        }
        
        // If CLIP not loaded, filter by COCO label matching
        guard isCLIPLoaded else {
            let queryLower = query.lowercased()
            return yoloDetections.filter { detection in
                detection.label.lowercased().contains(queryLower) ||
                queryLower.contains(detection.label.lowercased())
            }
        }
        
        // Get text embedding for query
        let textEmbedding = try await embedText(query)
        
        // Score each detection by CLIP similarity
        var scoredDetections: [(detection: YOLODetection, clipScore: Float)] = []
        
        for detection in yoloDetections {
            // Crop region from image
            guard let croppedImage = cropImage(image, to: detection.boundingBox) else { continue }
            
            // Get image embedding for cropped region
            let imageEmbedding = try await embedImage(croppedImage)
            
            // Calculate similarity
            let similarity = cosineSimilarity(imageEmbedding, textEmbedding)
            
            scoredDetections.append((detection, similarity))
        }
        
        // Sort by CLIP score and return top K
        let sorted = scoredDetections.sorted { $0.clipScore > $1.clipScore }
        let topResults = sorted.prefix(topK)
        
        // Return detections with CLIP score as confidence
        return topResults.map { item in
            YOLODetection(
                classIndex: item.detection.classIndex,
                label: item.detection.label,
                confidence: item.clipScore,
                boundingBox: item.detection.boundingBox
            )
        }
    }
    
    // MARK: - Image Processing Helpers
    
    private func resizeImage(_ image: UIImage, to size: CGSize) -> UIImage? {
        UIGraphicsBeginImageContextWithOptions(size, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: size))
        let resized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        return resized
    }
    
    private func cropImage(_ image: UIImage, to normalizedRect: CGRect) -> UIImage? {
        guard let cgImage = image.cgImage else { return nil }
        
        let width = CGFloat(cgImage.width)
        let height = CGFloat(cgImage.height)
        
        let rect = CGRect(
            x: normalizedRect.origin.x * width,
            y: normalizedRect.origin.y * height,
            width: normalizedRect.width * width,
            height: normalizedRect.height * height
        )
        
        guard let croppedCG = cgImage.cropping(to: rect) else { return nil }
        return UIImage(cgImage: croppedCG)
    }
    
    private func imageToPixelBuffer(_ image: UIImage) -> CVPixelBuffer? {
        guard let cgImage = image.cgImage else { return nil }
        
        let width = cgImage.width
        let height = cgImage.height
        
        var pixelBuffer: CVPixelBuffer?
        let attrs = [
            kCVPixelBufferCGImageCompatibilityKey: kCFBooleanTrue!,
            kCVPixelBufferCGBitmapContextCompatibilityKey: kCFBooleanTrue!
        ] as CFDictionary
        
        CVPixelBufferCreate(kCFAllocatorDefault, width, height, 
                          kCVPixelFormatType_32ARGB, attrs, &pixelBuffer)
        
        guard let buffer = pixelBuffer else { return nil }
        
        CVPixelBufferLockBaseAddress(buffer, [])
        let context = CGContext(
            data: CVPixelBufferGetBaseAddress(buffer),
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
        )
        
        context?.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
        CVPixelBufferUnlockBaseAddress(buffer, [])
        
        return buffer
    }
    
    private func multiArrayToFloatArray(_ multiArray: MLMultiArray) -> [Float] {
        let pointer = multiArray.dataPointer.bindMemory(to: Float.self, capacity: multiArray.count)
        return Array(UnsafeBufferPointer(start: pointer, count: multiArray.count))
    }
}
