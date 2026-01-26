import ExpoModulesCore
import Vision
import UIKit

/// Detection result returned to JavaScript
struct DetectionResult: Record {
    @Field var x: Double = 0
    @Field var y: Double = 0
    @Field var width: Double = 0
    @Field var height: Double = 0
    @Field var confidence: Double = 0
    @Field var label: String = ""
}

/// Tracking result returned to JavaScript
struct TrackingResult: Record {
    @Field var x: Double = 0
    @Field var y: Double = 0
    @Field var width: Double = 0
    @Field var height: Double = 0
    @Field var confidence: Double = 0
    @Field var isLost: Bool = false
}

/// Scene classification result
struct ClassificationResult: Record {
    @Field var identifier: String = ""
    @Field var confidence: Double = 0
}

/// Body pose keypoint
struct PoseKeypoint: Record {
    @Field var name: String = ""
    @Field var x: Double = 0
    @Field var y: Double = 0
    @Field var confidence: Double = 0
}

/// Body pose analysis result
struct PoseAnalysisResult: Record {
    @Field var keypoints: [PoseKeypoint] = []
    @Field var isJumping: Bool = false
    @Field var isRunning: Bool = false
    @Field var armsRaised: Bool = false
    @Field var confidence: Double = 0
}

/// Hand pose analysis result
struct HandPoseResult: Record {
    @Field var chirality: String = ""
    @Field var confidence: Double = 0
    @Field var isPointing: Bool = false
    @Field var isOpenPalm: Bool = false
    @Field var isFist: Bool = false
    @Field var isThumbsUp: Bool = false
    @Field var isPeaceSign: Bool = false
    @Field var wristX: Double = 0
    @Field var wristY: Double = 0
}

/// Gesture detection result for AI Photographer
struct GestureResult: Record {
    @Field var gesture: String = ""
    @Field var confidence: Double = 0
    @Field var x: Double = 0
    @Field var y: Double = 0
    @Field var width: Double = 0
    @Field var height: Double = 0
}

public class VisionTrackingModule: Module {
    /// Active tracking sessions: trackingId -> (observation, sequenceHandler)
    private var trackingSessions: [String: (VNDetectedObjectObservation, VNSequenceRequestHandler)] = [:]
    private var nextTrackingId: Int = 0
    
    public func definition() -> ModuleDefinition {
        Name("VisionTracking")
        
        // MARK: - Detection Functions
        
        /// Detect humans (full body) in an image
        AsyncFunction("detectHumans") { (imageBase64: String) -> [DetectionResult] in
            guard let image = self.imageFromBase64(imageBase64) else {
                throw NSError(domain: "VisionTracking", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid image data"])
            }
            return try await self.performHumanDetection(image: image)
        }
        
        /// Detect faces in an image
        AsyncFunction("detectFaces") { (imageBase64: String) -> [DetectionResult] in
            guard let image = self.imageFromBase64(imageBase64) else {
                throw NSError(domain: "VisionTracking", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid image data"])
            }
            return try await self.performFaceDetection(image: image)
        }
        
        /// Detect animals in an image (cats and dogs)
        AsyncFunction("detectAnimals") { (imageBase64: String) -> [DetectionResult] in
            guard let image = self.imageFromBase64(imageBase64) else {
                throw NSError(domain: "VisionTracking", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid image data"])
            }
            return try await self.performAnimalDetection(image: image)
        }
        
        /// Classify scene type (basketball_court, outdoor, etc.)
        AsyncFunction("classifyScene") { (imageBase64: String, maxResults: Int) -> [ClassificationResult] in
            guard let image = self.imageFromBase64(imageBase64) else {
                throw NSError(domain: "VisionTracking", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid image data"])
            }
            return try await self.performSceneClassification(image: image, maxResults: maxResults)
        }
        
        /// Detect body poses and analyze activity
        AsyncFunction("detectBodyPoses") { (imageBase64: String) -> [PoseAnalysisResult] in
            guard let image = self.imageFromBase64(imageBase64) else {
                throw NSError(domain: "VisionTracking", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid image data"])
            }
            return try await self.performBodyPoseDetection(image: image)
        }
        
         /// Detect hand poses and gestures
         AsyncFunction("detectHandPoses") { (imageBase64: String) -> [HandPoseResult] in
             guard let image = self.imageFromBase64(imageBase64) else {
                 throw NSError(domain: "VisionTracking", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid image data"])
             }
             return try await self.performHandPoseDetection(image: image)
         }
         
         AsyncFunction("detectGesturesForTriggers") { (imageBase64: String, triggers: [String]) -> [GestureResult] in
             guard let image = self.imageFromBase64(imageBase64) else {
                 throw NSError(domain: "VisionTracking", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid image data"])
             }
             return try await self.detectGesturesForTriggers(image: image, triggers: Set(triggers))
         }
         
         // MARK: - Native YOLO Detection
         
         AsyncFunction("isYOLOAvailable") { () -> Bool in
             return NativeDetector.shared.isYOLOLoaded
         }
         
         AsyncFunction("isCLIPAvailable") { () -> Bool in
             return NativeDetector.shared.isCLIPLoaded
         }
         
         AsyncFunction("detectObjectsYOLO") { (imageBase64: String) -> [DetectionResult] in
             guard let image = self.imageFromBase64(imageBase64) else {
                 throw NSError(domain: "VisionTracking", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid image data"])
             }
             
             let detections = try await NativeDetector.shared.detectObjectsYOLO(image: image)
             return detections.map { d in
                 var result = DetectionResult()
                 result.x = d.boundingBox.origin.x
                 result.y = d.boundingBox.origin.y
                 result.width = d.boundingBox.width
                 result.height = d.boundingBox.height
                 result.confidence = Double(d.confidence)
                 result.label = d.label
                 return result
             }
         }
         
         AsyncFunction("detectWithQuery") { (imageBase64: String, query: String, topK: Int?) -> [DetectionResult] in
             guard let image = self.imageFromBase64(imageBase64) else {
                 throw NSError(domain: "VisionTracking", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid image data"])
             }
             
             let k = topK ?? 5
             let detections = try await NativeDetector.shared.detectWithQuery(image: image, query: query, topK: k)
             return detections.map { d in
                 var result = DetectionResult()
                 result.x = d.boundingBox.origin.x
                 result.y = d.boundingBox.origin.y
                 result.width = d.boundingBox.width
                 result.height = d.boundingBox.height
                 result.confidence = Double(d.confidence)
                 result.label = d.label
                 return result
             }
         }
         
         AsyncFunction("embedImageCLIP") { (imageBase64: String) -> [NSNumber] in
             guard let image = self.imageFromBase64(imageBase64) else {
                 throw NSError(domain: "VisionTracking", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid image data"])
             }
             
             let embedding = try await NativeDetector.shared.embedImage(image)
             return embedding.map { NSNumber(value: $0) }
         }
         
         AsyncFunction("embedTextCLIP") { (text: String) -> [NSNumber] in
             let embedding = try await NativeDetector.shared.embedText(text)
             return embedding.map { NSNumber(value: $0) }
         }
         
         AsyncFunction("clipSimilarity") { (embedding1: [NSNumber], embedding2: [NSNumber]) -> Double in
             let e1 = embedding1.map { $0.floatValue }
             let e2 = embedding2.map { $0.floatValue }
             return Double(NativeDetector.shared.cosineSimilarity(e1, e2))
         }
         
         // MARK: - Visual Fingerprinting Functions
         
         AsyncFunction("generateFeaturePrint") { (imageBase64: String) -> [NSNumber] in
             guard let image = self.imageFromBase64(imageBase64) else {
                 throw NSError(domain: "VisionTracking", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid image data"])
             }
             return try await self.performFeaturePrintGeneration(image: image)
         }
         
         /// Calculate similarity between two embeddings (0-1, where 1 is identical)
         AsyncFunction("calculateSimilarity") { (embedding1: [NSNumber], embedding2: [NSNumber]) -> Double in
             return try self.computeEmbeddingSimilarity(embedding1: embedding1, embedding2: embedding2)
         }
         
         // MARK: - Tracking Functions
        
        /// Start tracking an object given a bounding box (normalized 0-1, top-left origin)
        /// Returns a tracking ID to use for subsequent updates
        Function("startTracking") { (x: Double, y: Double, width: Double, height: Double) -> String in
            // Convert from top-left origin to Vision's bottom-left origin
            let flippedY = 1.0 - y - height
            let boundingBox = CGRect(x: x, y: flippedY, width: width, height: height)
            
            // Create observation for tracking
            let observation = VNDetectedObjectObservation(boundingBox: boundingBox)
            
            // Create sequence handler for this tracking session
            let sequenceHandler = VNSequenceRequestHandler()
            
            // Generate tracking ID
            let trackingId = "track_\(self.nextTrackingId)"
            self.nextTrackingId += 1
            
            // Store session
            self.trackingSessions[trackingId] = (observation, sequenceHandler)
            
            return trackingId
        }
        
        /// Update tracking with a new frame
        /// Returns updated position or marks as lost
        AsyncFunction("updateTracking") { (trackingId: String, imageBase64: String) -> TrackingResult in
            guard let (observation, sequenceHandler) = self.trackingSessions[trackingId] else {
                var result = TrackingResult()
                result.isLost = true
                return result
            }
            
            guard let image = self.imageFromBase64(imageBase64),
                  let cgImage = image.cgImage else {
                var result = TrackingResult()
                result.isLost = true
                return result
            }
            
            return try await self.performTracking(
                trackingId: trackingId,
                observation: observation,
                sequenceHandler: sequenceHandler,
                image: cgImage
            )
        }
        
        /// Stop tracking and release resources
        Function("stopTracking") { (trackingId: String) in
            self.trackingSessions.removeValue(forKey: trackingId)
        }
        
        /// Stop all tracking sessions
        Function("stopAllTracking") {
            self.trackingSessions.removeAll()
        }
        
        /// Get count of active tracking sessions
        Function("getActiveTrackingCount") { () -> Int in
            return self.trackingSessions.count
        }
    }
    
    // MARK: - Private Helper Methods
    
    private func imageFromBase64(_ base64String: String) -> UIImage? {
        // Handle data URI prefix if present
        let base64Data: String
        if base64String.contains(",") {
            base64Data = String(base64String.split(separator: ",").last ?? "")
        } else {
            base64Data = base64String
        }
        
        guard let imageData = Data(base64Encoded: base64Data) else {
            return nil
        }
        return UIImage(data: imageData)
    }
    
    private func performHumanDetection(image: UIImage) async throws -> [DetectionResult] {
        guard let cgImage = image.cgImage else {
            throw NSError(domain: "VisionTracking", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not get CGImage"])
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNDetectHumanRectanglesRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                let results = self.processDetectionResults(
                    request.results as? [VNHumanObservation],
                    label: "person",
                    imageHeight: CGFloat(cgImage.height)
                )
                continuation.resume(returning: results)
            }
            
            request.upperBodyOnly = true
            
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    private func performFaceDetection(image: UIImage) async throws -> [DetectionResult] {
        guard let cgImage = image.cgImage else {
            throw NSError(domain: "VisionTracking", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not get CGImage"])
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNDetectFaceRectanglesRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                let results = self.processDetectionResults(
                    request.results as? [VNFaceObservation],
                    label: "face",
                    imageHeight: CGFloat(cgImage.height)
                )
                continuation.resume(returning: results)
            }
            
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    private func performAnimalDetection(image: UIImage) async throws -> [DetectionResult] {
        guard let cgImage = image.cgImage else {
            throw NSError(domain: "VisionTracking", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not get CGImage"])
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNRecognizeAnimalsRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                var detectionResults: [DetectionResult] = []
                
                if let observations = request.results as? [VNRecognizedObjectObservation] {
                    for observation in observations {
                        // Get the top label
                        let label = observation.labels.first?.identifier ?? "animal"
                        
                        // Convert from Vision coordinates (bottom-left origin) to top-left origin
                        let box = observation.boundingBox
                        let flippedY = 1.0 - box.origin.y - box.size.height
                        
                        var result = DetectionResult()
                        result.x = box.origin.x
                        result.y = flippedY
                        result.width = box.size.width
                        result.height = box.size.height
                        result.confidence = Double(observation.confidence)
                        result.label = label
                        
                        detectionResults.append(result)
                    }
                }
                
                continuation.resume(returning: detectionResults)
            }
            
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    private func processDetectionResults<T: VNDetectedObjectObservation>(
        _ observations: [T]?,
        label: String,
        imageHeight: CGFloat
    ) -> [DetectionResult] {
        guard let observations = observations else {
            return []
        }
        
        return observations.map { observation in
            // Convert from Vision coordinates (bottom-left origin, normalized)
            // to top-left origin (what React Native expects)
            let box = observation.boundingBox
            let flippedY = 1.0 - box.origin.y - box.size.height
            
            var result = DetectionResult()
            result.x = box.origin.x
            result.y = flippedY
            result.width = box.size.width
            result.height = box.size.height
            result.confidence = Double(observation.confidence)
            result.label = label
            
            return result
        }
    }
    
    private func performSceneClassification(image: UIImage, maxResults: Int) async throws -> [ClassificationResult] {
        guard let cgImage = image.cgImage else {
            throw NSError(domain: "VisionTracking", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not get CGImage"])
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNClassifyImageRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let observations = request.results as? [VNClassificationObservation] else {
                    continuation.resume(returning: [])
                    return
                }
                
                let results = observations.prefix(maxResults).map { obs -> ClassificationResult in
                    var result = ClassificationResult()
                    result.identifier = obs.identifier
                    result.confidence = Double(obs.confidence)
                    return result
                }
                
                continuation.resume(returning: Array(results))
            }
            
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    private func performBodyPoseDetection(image: UIImage) async throws -> [PoseAnalysisResult] {
        guard let cgImage = image.cgImage else {
            throw NSError(domain: "VisionTracking", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not get CGImage"])
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNDetectHumanBodyPoseRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let observations = request.results as? [VNHumanBodyPoseObservation] else {
                    continuation.resume(returning: [])
                    return
                }
                
                let results = observations.map { obs -> PoseAnalysisResult in
                    self.analyzePose(observation: obs)
                }
                
                continuation.resume(returning: results)
            }
            
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    private func analyzePose(observation: VNHumanBodyPoseObservation) -> PoseAnalysisResult {
        var result = PoseAnalysisResult()
        result.confidence = Double(observation.confidence)
        
        var keypoints: [PoseKeypoint] = []
        let jointNames: [VNHumanBodyPoseObservation.JointName] = [
            .nose, .leftEye, .rightEye, .leftEar, .rightEar,
            .leftShoulder, .rightShoulder, .leftElbow, .rightElbow,
            .leftWrist, .rightWrist, .leftHip, .rightHip,
            .leftKnee, .rightKnee, .leftAnkle, .rightAnkle
        ]
        
        for jointName in jointNames {
            if let point = try? observation.recognizedPoint(jointName), point.confidence > 0.1 {
                var kp = PoseKeypoint()
                kp.name = jointName.rawValue.rawValue
                kp.x = point.location.x
                kp.y = 1.0 - point.location.y
                kp.confidence = Double(point.confidence)
                keypoints.append(kp)
            }
        }
        result.keypoints = keypoints
        
        result.isJumping = self.detectJumping(observation: observation)
        result.armsRaised = self.detectArmsRaised(observation: observation)
        result.isRunning = self.detectRunning(observation: observation)
        
        return result
    }
    
    private func detectJumping(observation: VNHumanBodyPoseObservation) -> Bool {
        guard let leftAnkle = try? observation.recognizedPoint(.leftAnkle),
              let rightAnkle = try? observation.recognizedPoint(.rightAnkle),
              let root = try? observation.recognizedPoint(.root),
              leftAnkle.confidence > 0.3, rightAnkle.confidence > 0.3, root.confidence > 0.3 else {
            return false
        }
        
        let avgAnkleY = (leftAnkle.location.y + rightAnkle.location.y) / 2
        return avgAnkleY > root.location.y + 0.1
    }
    
    private func detectArmsRaised(observation: VNHumanBodyPoseObservation) -> Bool {
        guard let leftShoulder = try? observation.recognizedPoint(.leftShoulder),
              let rightShoulder = try? observation.recognizedPoint(.rightShoulder),
              let leftWrist = try? observation.recognizedPoint(.leftWrist),
              let rightWrist = try? observation.recognizedPoint(.rightWrist),
              leftShoulder.confidence > 0.3, rightShoulder.confidence > 0.3 else {
            return false
        }
        
        let leftRaised = leftWrist.confidence > 0.3 && leftWrist.location.y > leftShoulder.location.y
        let rightRaised = rightWrist.confidence > 0.3 && rightWrist.location.y > rightShoulder.location.y
        
        return leftRaised || rightRaised
    }
    
    private func detectRunning(observation: VNHumanBodyPoseObservation) -> Bool {
        guard let leftKnee = try? observation.recognizedPoint(.leftKnee),
              let rightKnee = try? observation.recognizedPoint(.rightKnee),
              let leftAnkle = try? observation.recognizedPoint(.leftAnkle),
              let rightAnkle = try? observation.recognizedPoint(.rightAnkle),
              leftKnee.confidence > 0.3, rightKnee.confidence > 0.3 else {
            return false
        }
        
        let kneeDiff = abs(leftKnee.location.y - rightKnee.location.y)
        let ankleDiff = abs(leftAnkle.location.y - rightAnkle.location.y)
        
        return kneeDiff > 0.1 || ankleDiff > 0.15
    }
    
    private func performHandPoseDetection(image: UIImage) async throws -> [HandPoseResult] {
        guard let cgImage = image.cgImage else {
            throw NSError(domain: "VisionTracking", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not get CGImage"])
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNDetectHumanHandPoseRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let observations = request.results as? [VNHumanHandPoseObservation] else {
                    continuation.resume(returning: [])
                    return
                }
                
                let results = observations.map { obs -> HandPoseResult in
                    self.analyzeHandPose(observation: obs)
                }
                
                continuation.resume(returning: results)
            }
            
            request.maximumHandCount = 4
            
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    private func analyzeHandPose(observation: VNHumanHandPoseObservation) -> HandPoseResult {
        var result = HandPoseResult()
        result.chirality = observation.chirality == .left ? "left" : "right"
        result.confidence = Double(observation.confidence)
        
        if let wrist = try? observation.recognizedPoint(.wrist), wrist.confidence > 0.3 {
            result.wristX = wrist.location.x
            result.wristY = 1.0 - wrist.location.y
        }
        
        result.isPointing = detectPointing(observation: observation)
        result.isOpenPalm = detectOpenPalm(observation: observation)
        result.isFist = detectFist(observation: observation)
        result.isThumbsUp = detectThumbsUp(observation: observation)
        result.isPeaceSign = detectPeaceSign(observation: observation)
        
        return result
    }
    
    private func detectPointing(observation: VNHumanHandPoseObservation) -> Bool {
        guard let indexTip = try? observation.recognizedPoint(.indexTip),
              let indexPIP = try? observation.recognizedPoint(.indexPIP),
              let middleTip = try? observation.recognizedPoint(.middleTip),
              let ringTip = try? observation.recognizedPoint(.ringTip),
              let littleTip = try? observation.recognizedPoint(.littleTip),
              indexTip.confidence > 0.3 else {
            return false
        }
        
        let indexExtended = distance(indexTip.location, indexPIP.location) > 0.1
        let othersCurled = middleTip.confidence < 0.3 || 
                          (ringTip.confidence > 0.3 && littleTip.confidence > 0.3 &&
                           middleTip.location.y < indexTip.location.y)
        
        return indexExtended && othersCurled
    }
    
    private func detectOpenPalm(observation: VNHumanHandPoseObservation) -> Bool {
        guard let wrist = try? observation.recognizedPoint(.wrist),
              let indexTip = try? observation.recognizedPoint(.indexTip),
              let indexPIP = try? observation.recognizedPoint(.indexPIP),
              let middleTip = try? observation.recognizedPoint(.middleTip),
              let middlePIP = try? observation.recognizedPoint(.middlePIP),
              let ringTip = try? observation.recognizedPoint(.ringTip),
              let ringPIP = try? observation.recognizedPoint(.ringPIP),
              let littleTip = try? observation.recognizedPoint(.littleTip),
              let littlePIP = try? observation.recognizedPoint(.littlePIP),
              let thumbTip = try? observation.recognizedPoint(.thumbTip),
              wrist.confidence > 0.3 else {
            return false
        }
        
        let indexExtended = indexTip.confidence > 0.4 && indexTip.location.y > indexPIP.location.y
        let middleExtended = middleTip.confidence > 0.4 && middleTip.location.y > middlePIP.location.y
        let ringExtended = ringTip.confidence > 0.4 && ringTip.location.y > ringPIP.location.y
        let littleExtended = littleTip.confidence > 0.4 && littleTip.location.y > littlePIP.location.y
        let thumbVisible = thumbTip.confidence > 0.3
        
        let extendedCount = [indexExtended, middleExtended, ringExtended, littleExtended, thumbVisible].filter { $0 }.count
        
        return extendedCount >= 4
    }
    
    private func detectFist(observation: VNHumanHandPoseObservation) -> Bool {
        let tips: [VNHumanHandPoseObservation.JointName] = [.indexTip, .middleTip, .ringTip, .littleTip]
        var curledCount = 0
        
        for tip in tips {
            if let tipPoint = try? observation.recognizedPoint(tip), tipPoint.confidence < 0.3 {
                curledCount += 1
            }
        }
        
        return curledCount >= 3
    }
    
    private func detectThumbsUp(observation: VNHumanHandPoseObservation) -> Bool {
        guard let thumbTip = try? observation.recognizedPoint(.thumbTip),
              let thumbCMC = try? observation.recognizedPoint(.thumbCMC),
              let thumbIP = try? observation.recognizedPoint(.thumbIP),
              let indexTip = try? observation.recognizedPoint(.indexTip),
              let middleTip = try? observation.recognizedPoint(.middleTip),
              let ringTip = try? observation.recognizedPoint(.ringTip),
              let littleTip = try? observation.recognizedPoint(.littleTip),
              let wrist = try? observation.recognizedPoint(.wrist),
              thumbTip.confidence > 0.3, thumbCMC.confidence > 0.3, wrist.confidence > 0.3 else {
            return false
        }
        
        let thumbExtendedUp = thumbTip.location.y > thumbIP.location.y && thumbTip.location.y > wrist.location.y + 0.15
        
        let indexCurled = indexTip.confidence < 0.4 || indexTip.location.y < wrist.location.y + 0.05
        let middleCurled = middleTip.confidence < 0.4 || middleTip.location.y < wrist.location.y + 0.05
        let ringCurled = ringTip.confidence < 0.4 || ringTip.location.y < wrist.location.y + 0.05
        let littleCurled = littleTip.confidence < 0.4 || littleTip.location.y < wrist.location.y + 0.05
        
        let fingersCurled = [indexCurled, middleCurled, ringCurled, littleCurled].filter { $0 }.count >= 3
        
        return thumbExtendedUp && fingersCurled
    }
    
    private func detectPeaceSign(observation: VNHumanHandPoseObservation) -> Bool {
        guard let indexTip = try? observation.recognizedPoint(.indexTip),
              let indexPIP = try? observation.recognizedPoint(.indexPIP),
              let middleTip = try? observation.recognizedPoint(.middleTip),
              let middlePIP = try? observation.recognizedPoint(.middlePIP),
              let ringTip = try? observation.recognizedPoint(.ringTip),
              let ringPIP = try? observation.recognizedPoint(.ringPIP),
              let littleTip = try? observation.recognizedPoint(.littleTip),
              let thumbTip = try? observation.recognizedPoint(.thumbTip),
              let wrist = try? observation.recognizedPoint(.wrist),
              indexTip.confidence > 0.4, middleTip.confidence > 0.4, wrist.confidence > 0.3 else {
            return false
        }
        
        let indexExtended = indexTip.location.y > indexPIP.location.y && indexTip.location.y > wrist.location.y + 0.1
        let middleExtended = middleTip.location.y > middlePIP.location.y && middleTip.location.y > wrist.location.y + 0.1
        
        let ringCurled = ringTip.confidence < 0.4 || ringTip.location.y < ringPIP.location.y || ringTip.location.y < wrist.location.y + 0.05
        let littleCurled = littleTip.confidence < 0.4 || littleTip.location.y < wrist.location.y + 0.05
        let thumbNotExtendedUp = thumbTip.confidence < 0.3 || thumbTip.location.y < wrist.location.y + 0.15
        
        let indexMiddleSpread = abs(indexTip.location.x - middleTip.location.x) > 0.03
        
        return indexExtended && middleExtended && ringCurled && littleCurled && thumbNotExtendedUp && indexMiddleSpread
    }
    
     private func distance(_ a: CGPoint, _ b: CGPoint) -> CGFloat {
         return sqrt(pow(a.x - b.x, 2) + pow(a.y - b.y, 2))
     }
     
    private func detectGesturesForTriggers(image: UIImage, triggers: Set<String>) async throws -> [GestureResult] {
        guard let cgImage = image.cgImage else {
            throw NSError(domain: "VisionTracking", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not get CGImage"])
        }
        
        var results: [GestureResult] = []
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        
        let handTriggers = Set(["wave", "thumbsup", "peace", "pointing"])
        let needsHands = !triggers.intersection(handTriggers).isEmpty
        let needsSmile = triggers.contains("smile")
        
        if needsHands {
            let handResults = try await detectHandGesturesForTriggers(handler: handler, triggers: triggers)
            results.append(contentsOf: handResults)
        }
        
        if needsSmile {
            let smileResults = try await detectSmileForTrigger(handler: handler)
            results.append(contentsOf: smileResults)
        }
        
        return results
    }
    
    private func detectHandGesturesForTriggers(handler: VNImageRequestHandler, triggers: Set<String>) async throws -> [GestureResult] {
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNDetectHumanHandPoseRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                var results: [GestureResult] = []
                guard let observations = request.results as? [VNHumanHandPoseObservation] else {
                    continuation.resume(returning: [])
                    return
                }
                
                for observation in observations {
                    let handPose = self.analyzeHandPose(observation: observation)
                    var gestureFound = false
                    
                    if triggers.contains("thumbsup") && handPose.isThumbsUp {
                        var result = GestureResult()
                        result.gesture = "thumbsup"
                        result.confidence = max(0.75, handPose.confidence)
                        results.append(result)
                        gestureFound = true
                    }
                    
                    if !gestureFound && triggers.contains("peace") && handPose.isPeaceSign {
                        var result = GestureResult()
                        result.gesture = "peace"
                        result.confidence = max(0.75, handPose.confidence)
                        results.append(result)
                        gestureFound = true
                    }
                    
                    if !gestureFound && triggers.contains("pointing") && handPose.isPointing {
                        var result = GestureResult()
                        result.gesture = "pointing"
                        result.confidence = max(0.75, handPose.confidence)
                        results.append(result)
                        gestureFound = true
                    }
                    
                    if !gestureFound && triggers.contains("wave") && handPose.isOpenPalm {
                        var result = GestureResult()
                        result.gesture = "wave"
                        result.confidence = max(0.70, handPose.confidence)
                        results.append(result)
                    }
                }
                
                continuation.resume(returning: results)
            }
            
            request.maximumHandCount = 2
            
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    private func detectSmileForTrigger(handler: VNImageRequestHandler) async throws -> [GestureResult] {
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNDetectFaceLandmarksRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                var results: [GestureResult] = []
                guard let observations = request.results as? [VNFaceObservation] else {
                    continuation.resume(returning: [])
                    return
                }
                
                for observation in observations {
                    if let landmarks = observation.landmarks,
                       let outerLips = landmarks.outerLips {
                        let points = outerLips.normalizedPoints
                        if self.isSmiling(lipPoints: points) {
                            let box = observation.boundingBox
                            var result = GestureResult()
                            result.gesture = "smile"
                            result.confidence = 0.80
                            result.x = box.origin.x
                            result.y = 1 - box.origin.y - box.height
                            result.width = box.width
                            result.height = box.height
                            results.append(result)
                        }
                    }
                }
                
                continuation.resume(returning: results)
            }
            
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    private func isSmiling(lipPoints: [CGPoint]) -> Bool {
        guard lipPoints.count >= 6 else { return false }
        
        let leftCorner = lipPoints[0]
        let rightCorner = lipPoints[lipPoints.count / 2]
        let topCenter = lipPoints[lipPoints.count / 4]
        let bottomCenter = lipPoints[(lipPoints.count * 3) / 4]
        
        let mouthWidth = abs(rightCorner.x - leftCorner.x)
        let mouthHeight = abs(topCenter.y - bottomCenter.y)
        
        let widthToHeightRatio = mouthWidth / max(mouthHeight, 0.001)
        let cornerLift = ((leftCorner.y + rightCorner.y) / 2) - ((topCenter.y + bottomCenter.y) / 2)
        
        return widthToHeightRatio > 2.5 && cornerLift > 0.01
    }
     
     @available(iOS 13.0, *)
     private func performFeaturePrintGeneration(image: UIImage) async throws -> [NSNumber] {
         guard let cgImage = image.cgImage else {
             throw NSError(domain: "VisionTracking", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not get CGImage"])
         }
         
         return try await withCheckedThrowingContinuation { continuation in
             let request = VNGenerateImageFeaturePrintRequest()
             
             let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
             do {
                 try handler.perform([request])
                 
                 guard let observation = request.results?.first as? VNFeaturePrintObservation else {
                     throw NSError(domain: "VisionTracking", code: 3, userInfo: [NSLocalizedDescriptionKey: "No feature print observation found"])
                 }
                 
                  let embedding = self.dataToFloatArray(observation.data)
                 continuation.resume(returning: embedding)
             } catch {
                 continuation.resume(throwing: error)
             }
         }
     }
     
      private func dataToFloatArray(_ data: Data) -> [NSNumber] {
          let floatArray = data.withUnsafeBytes { (pointer: UnsafeRawBufferPointer) -> [Float] in
              let buffer = pointer.bindMemory(to: Float.self)
              return Array(buffer)
          }
          return floatArray.map { NSNumber(value: $0) }
      }
     
     private func computeEmbeddingSimilarity(embedding1: [NSNumber], embedding2: [NSNumber]) throws -> Double {
         guard embedding1.count == embedding2.count else {
             throw NSError(domain: "VisionTracking", code: 4, userInfo: [NSLocalizedDescriptionKey: "Embeddings must have same dimension"])
         }
         
         guard embedding1.count > 0 else {
             throw NSError(domain: "VisionTracking", code: 5, userInfo: [NSLocalizedDescriptionKey: "Embeddings cannot be empty"])
         }
         
         var dotProduct: Double = 0
         var norm1: Double = 0
         var norm2: Double = 0
         
         for i in 0..<embedding1.count {
             let v1 = Double(embedding1[i].floatValue)
             let v2 = Double(embedding2[i].floatValue)
             
             dotProduct += v1 * v2
             norm1 += v1 * v1
             norm2 += v2 * v2
         }
         
         norm1 = sqrt(norm1)
         norm2 = sqrt(norm2)
         
         guard norm1 > 0 && norm2 > 0 else {
             throw NSError(domain: "VisionTracking", code: 6, userInfo: [NSLocalizedDescriptionKey: "Embedding norms cannot be zero"])
         }
         
         let cosineSimilarity = dotProduct / (norm1 * norm2)
         return cosineSimilarity
     }
     
     private func performTracking(
        trackingId: String,
        observation: VNDetectedObjectObservation,
        sequenceHandler: VNSequenceRequestHandler,
        image: CGImage
    ) async throws -> TrackingResult {
        return try await withCheckedThrowingContinuation { continuation in
            let trackRequest = VNTrackObjectRequest(detectedObjectObservation: observation) { request, error in
                if let error = error {
                    var result = TrackingResult()
                    result.isLost = true
                    continuation.resume(returning: result)
                    return
                }
                
                guard let results = request.results as? [VNDetectedObjectObservation],
                      let trackedObservation = results.first else {
                    var result = TrackingResult()
                    result.isLost = true
                    continuation.resume(returning: result)
                    return
                }
                
                // Check if tracking confidence is too low
                let isLost = trackedObservation.confidence < 0.3
                
                // Update stored observation for next frame
                if !isLost {
                    self.trackingSessions[trackingId] = (trackedObservation, sequenceHandler)
                }
                
                // Convert from Vision coordinates to top-left origin
                let box = trackedObservation.boundingBox
                let flippedY = 1.0 - box.origin.y - box.size.height
                
                var result = TrackingResult()
                result.x = box.origin.x
                result.y = flippedY
                result.width = box.size.width
                result.height = box.size.height
                result.confidence = Double(trackedObservation.confidence)
                result.isLost = isLost
                
                continuation.resume(returning: result)
            }
            
            // Use fast tracking for real-time performance
            trackRequest.trackingLevel = .fast
            
            do {
                try sequenceHandler.perform([trackRequest], on: image)
            } catch {
                var result = TrackingResult()
                result.isLost = true
                continuation.resume(returning: result)
            }
        }
    }
}
