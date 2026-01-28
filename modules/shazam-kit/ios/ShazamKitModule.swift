import ExpoModulesCore
import ShazamKit
import AVFAudio
import Accelerate

/// Detected song result returned to JavaScript
struct DetectedSongResult: Record {
    @Field var shazamId: String = ""
    @Field var title: String = ""
    @Field var artist: String = ""
    @Field var artworkUrl: String? = nil
    @Field var appleMusicUrl: String? = nil
    @Field var webUrl: String? = nil
    @Field var genres: [String] = []
    @Field var matchOffset: Double = 0
    @Field var isrc: String? = nil
    @Field var explicitContent: Bool = false
}

/// Audio analysis result
struct AudioAnalysisResult: Record {
    @Field var bpm: Double = 0
    @Field var isSilent: Bool = false
    @Field var averageAmplitude: Double = 0
}

/// Custom catalog song metadata
struct CustomSongMetadata: Record {
    @Field var id: String = ""
    @Field var title: String = ""
    @Field var artist: String = ""
}

public class ShazamKitModule: Module {
    
    // MARK: - Shazam Session
    private var session: SHSession?
    private var delegate: ShazamSessionDelegate?
    
    // MARK: - Audio Engine
    private let audioEngine = AVAudioEngine()
    private let mixerNode = AVAudioMixerNode()
    private var isListening = false
    private var isContinuousMode = false
    
    // MARK: - Promises for async operations
    private var pendingMatchPromise: Promise?
    
    // MARK: - Custom Catalog
    private var customCatalog: SHCustomCatalog?
    
    // MARK: - Audio Analysis
    private var recentAmplitudes: [Float] = []
    private let amplitudeWindowSize = 50
    private var silenceThreshold: Float = 0.01
    
    // MARK: - Battery Optimization
    private var batteryMode: String = "balanced"
    private var sampleInterval: Int = 1 // Process every Nth buffer
    private var bufferCount: Int = 0
    
    public func definition() -> ModuleDefinition {
        Name("ShazamKit")
        
        // MARK: - Events
        Events(
            "onSongDetected",
            "onSongEnded",
            "onMatchFailed",
            "onListeningStateChanged",
            "onAudioLevel"
        )
        
        // MARK: - Lifecycle
        OnCreate {
            self.setupSession()
            self.configureAudioEngine()
        }
        
        OnDestroy {
            self.cleanup()
        }
        
        // MARK: - Availability Check
        Function("isAvailable") { () -> Bool in
            if #available(iOS 15.0, *) {
                return true
            }
            return false
        }
        
        // MARK: - Basic Detection
        
        /// Start listening for a single song match
        /// Returns when a match is found or timeout occurs
        AsyncFunction("startListening") { (promise: Promise) in
            guard #available(iOS 15.0, *) else {
                promise.reject(ShazamKitUnavailableException())
                return
            }
            
            if self.pendingMatchPromise != nil {
                promise.reject(AlreadyListeningException())
                return
            }
            
            self.pendingMatchPromise = promise
            self.isContinuousMode = false
            
            do {
                try self.startAudioCapture()
            } catch {
                self.pendingMatchPromise = nil
                promise.reject(AudioCaptureException(error.localizedDescription))
            }
        }
        
        /// Stop listening
        Function("stopListening") {
            self.stopAudioCapture()
            self.pendingMatchPromise?.reject(ListeningCancelledException())
            self.pendingMatchPromise = nil
        }
        
        /// Check if currently listening
        Function("isListening") { () -> Bool in
            return self.isListening
        }
        
        // MARK: - Continuous Mode (for "Follow the Music")
        
        /// Start continuous listening mode - emits events on each detection
        AsyncFunction("startContinuousMode") { (options: [String: Any]?, promise: Promise) in
            guard #available(iOS 15.0, *) else {
                promise.reject(ShazamKitUnavailableException())
                return
            }
            
            if self.isListening {
                promise.reject(AlreadyListeningException())
                return
            }
            
            // Parse battery optimization setting
            if let opts = options, let mode = opts["batteryMode"] as? String {
                self.batteryMode = mode
                switch mode {
                case "aggressive":
                    self.sampleInterval = 3 // Process every 3rd buffer
                case "performance":
                    self.sampleInterval = 1 // Process every buffer
                default: // balanced
                    self.sampleInterval = 2 // Process every 2nd buffer
                }
            }
            
            self.isContinuousMode = true
            
            do {
                try self.startAudioCapture()
                promise.resolve(["success": true])
            } catch {
                promise.reject(AudioCaptureException(error.localizedDescription))
            }
        }
        
        /// Stop continuous mode
        Function("stopContinuousMode") {
            self.isContinuousMode = false
            self.stopAudioCapture()
        }
        
        // MARK: - Custom Catalog (for private song libraries)
        
        /// Initialize custom catalog for matching private songs
        AsyncFunction("initializeCustomCatalog") { (promise: Promise) in
            guard #available(iOS 15.0, *) else {
                promise.reject(ShazamKitUnavailableException())
                return
            }
            
            self.customCatalog = SHCustomCatalog()
            promise.resolve(["success": true])
        }
        
        /// Add a song to custom catalog from audio file
        AsyncFunction("addToCustomCatalog") { (audioFileUrl: String, metadata: CustomSongMetadata, promise: Promise) in
            guard #available(iOS 16.0, *) else {
                promise.reject(CustomCatalogUnavailableException())
                return
            }
            
            guard let catalog = self.customCatalog else {
                promise.reject(CatalogNotInitializedException())
                return
            }
            
            guard let url = URL(string: audioFileUrl) else {
                promise.reject(InvalidUrlException())
                return
            }
            
            Task {
                do {
                    // Generate signature from audio file
                    let signatureGenerator = SHSignatureGenerator()
                    let audioFile = try AVAudioFile(forReading: url)
                    let format = audioFile.processingFormat
                    let frameCount = AVAudioFrameCount(audioFile.length)
                    
                    guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else {
                        promise.reject(AudioProcessingException("Failed to create audio buffer"))
                        return
                    }
                    
                    try audioFile.read(into: buffer)
                    try signatureGenerator.append(buffer, at: nil)
                    let signature = signatureGenerator.signature()
                    
                    // Create media item with metadata
                    let mediaItems = [
                        SHMediaItemProperty.title: metadata.title,
                        SHMediaItemProperty.artist: metadata.artist,
                        SHMediaItemProperty.shazamID: metadata.id
                    ]
                    
                    let referenceSignature = SHSignature()
                    try catalog.addReferenceSignature(signature, representing: [
                        SHMediaItem(properties: mediaItems)
                    ])
                    
                    promise.resolve(["success": true, "signatureId": metadata.id])
                } catch {
                    promise.reject(AudioProcessingException(error.localizedDescription))
                }
            }
        }
        
        /// Match against custom catalog only
        AsyncFunction("matchCustomCatalog") { (promise: Promise) in
            guard #available(iOS 15.0, *) else {
                promise.reject(ShazamKitUnavailableException())
                return
            }
            
            guard let catalog = self.customCatalog else {
                promise.reject(CatalogNotInitializedException())
                return
            }
            
            // Create session with custom catalog
            self.session = SHSession(catalog: catalog)
            self.session?.delegate = self.delegate
            
            self.pendingMatchPromise = promise
            self.isContinuousMode = false
            
            do {
                try self.startAudioCapture()
            } catch {
                self.pendingMatchPromise = nil
                promise.reject(AudioCaptureException(error.localizedDescription))
            }
        }
        
        // MARK: - Audio Analysis
        
        /// Analyze current audio for BPM (useful for beat-sync features)
        AsyncFunction("analyzeAudio") { (promise: Promise) in
            let analysis = AudioAnalysisResult()
            
            // Calculate average amplitude from recent samples
            if !self.recentAmplitudes.isEmpty {
                let avg = self.recentAmplitudes.reduce(0, +) / Float(self.recentAmplitudes.count)
                analysis.averageAmplitude = Double(avg)
                analysis.isSilent = avg < self.silenceThreshold
            } else {
                analysis.isSilent = true
                analysis.averageAmplitude = 0
            }
            
            // BPM detection would require more sophisticated analysis
            // For now, return placeholder
            analysis.bpm = 0
            
            promise.resolve(analysis)
        }
        
        /// Check if current audio is silent
        Function("isSilent") { () -> Bool in
            guard !self.recentAmplitudes.isEmpty else { return true }
            let avg = self.recentAmplitudes.reduce(0, +) / Float(self.recentAmplitudes.count)
            return avg < self.silenceThreshold
        }
        
        /// Set silence threshold
        Function("setSilenceThreshold") { (threshold: Float) in
            self.silenceThreshold = max(0.001, min(0.5, threshold))
        }
        
        // MARK: - Shazam Library
        
        /// Add most recent match to user's Shazam library
        AsyncFunction("addToShazamLibrary") { (mediaItems: [[String: Any]], promise: Promise) in
            guard #available(iOS 15.0, *) else {
                promise.reject(ShazamKitUnavailableException())
                return
            }
            
            // Create SHMediaItem array from the provided data
            var items: [SHMediaItem] = []
            for itemData in mediaItems {
                var properties: [SHMediaItemProperty: Any] = [:]
                
                if let title = itemData["title"] as? String {
                    properties[.title] = title
                }
                if let artist = itemData["artist"] as? String {
                    properties[.artist] = artist
                }
                if let shazamId = itemData["shazamId"] as? String {
                    properties[.shazamID] = shazamId
                }
                
                items.append(SHMediaItem(properties: properties))
            }
            
            guard !items.isEmpty else {
                promise.resolve(["success": false])
                return
            }
            
            SHMediaLibrary.default.add(items) { error in
                if let error = error {
                    promise.resolve(["success": false, "error": error.localizedDescription])
                } else {
                    promise.resolve(["success": true])
                }
            }
        }
    }
    
    // MARK: - Private Methods
    
    @available(iOS 15.0, *)
    private func setupSession() {
        delegate = ShazamSessionDelegate(
            onMatch: { [weak self] match in
                self?.handleMatch(match)
            },
            onNoMatch: { [weak self] signature, error in
                self?.handleNoMatch(signature: signature, error: error)
            }
        )
        
        session = SHSession()
        session?.delegate = delegate
    }
    
    private func configureAudioEngine() {
        let inputNode = audioEngine.inputNode
        let inputFormat = inputNode.inputFormat(forBus: 0)
        
        // Create output format for Shazam (mono, standard sample rate)
        guard let outputFormat = AVAudioFormat(
            standardFormatWithSampleRate: inputFormat.sampleRate,
            channels: 1
        ) else {
            print("[ShazamKit] Failed to create output format")
            return
        }
        
        audioEngine.attach(mixerNode)
        audioEngine.connect(inputNode, to: mixerNode, format: inputFormat)
        audioEngine.connect(mixerNode, to: audioEngine.mainMixerNode, format: outputFormat)
        
        // Install tap on mixer for audio processing
        mixerNode.installTap(onBus: 0, bufferSize: 2048, format: outputFormat) { [weak self] buffer, time in
            self?.processAudioBuffer(buffer, at: time)
        }
    }
    
    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer, at time: AVAudioTime) {
        bufferCount += 1
        
        // Battery optimization: skip buffers based on mode
        guard bufferCount % sampleInterval == 0 else { return }
        
        // Calculate amplitude for silence detection
        if let channelData = buffer.floatChannelData?[0] {
            let frameLength = Int(buffer.frameLength)
            var sum: Float = 0
            vDSP_meamgv(channelData, 1, &sum, vDSP_Length(frameLength))
            
            recentAmplitudes.append(sum)
            if recentAmplitudes.count > amplitudeWindowSize {
                recentAmplitudes.removeFirst()
            }
            
            // Emit audio level for UI visualization
            sendEvent("onAudioLevel", ["level": sum])
        }
        
        // Send to Shazam for matching
        if #available(iOS 15.0, *) {
            session?.matchStreamingBuffer(buffer, at: time)
        }
    }
    
    private func startAudioCapture() throws {
        guard !isListening else { return }
        
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
        try audioSession.setActive(true)
        
        audioSession.requestRecordPermission { [weak self] granted in
            guard granted else {
                self?.pendingMatchPromise?.reject(MicrophonePermissionException())
                self?.pendingMatchPromise = nil
                return
            }
            
            do {
                try self?.audioEngine.start()
                self?.isListening = true
                self?.sendEvent("onListeningStateChanged", ["isListening": true])
            } catch {
                self?.pendingMatchPromise?.reject(AudioCaptureException(error.localizedDescription))
                self?.pendingMatchPromise = nil
            }
        }
    }
    
    private func stopAudioCapture() {
        guard isListening else { return }
        
        audioEngine.stop()
        isListening = false
        recentAmplitudes.removeAll()
        bufferCount = 0
        
        sendEvent("onListeningStateChanged", ["isListening": false])
    }
    
    @available(iOS 15.0, *)
    private func handleMatch(_ match: SHMatch) {
        let results: [DetectedSongResult] = match.mediaItems.map { item in
            var result = DetectedSongResult()
            result.shazamId = item.shazamID ?? ""
            result.title = item.title ?? "Unknown"
            result.artist = item.artist ?? "Unknown"
            result.artworkUrl = item.artworkURL?.absoluteString
            result.appleMusicUrl = item.appleMusicURL?.absoluteString
            result.webUrl = item.webURL?.absoluteString
            result.genres = item.genres
            result.matchOffset = item.matchOffset.seconds
            result.isrc = item.isrc
            result.explicitContent = item.explicitContent
            return result
        }
        
        if isContinuousMode {
            // In continuous mode, emit event and keep listening
            sendEvent("onSongDetected", ["songs": results.map { songToDict($0) }])
        } else {
            // In single-shot mode, resolve promise and stop
            stopAudioCapture()
            pendingMatchPromise?.resolve(results)
            pendingMatchPromise = nil
        }
    }
    
    @available(iOS 15.0, *)
    private func handleNoMatch(signature: SHSignature, error: Error?) {
        if isContinuousMode {
            // In continuous mode, emit event and keep listening
            sendEvent("onMatchFailed", ["error": error?.localizedDescription ?? "No match found"])
        } else {
            // In single-shot mode, reject promise
            stopAudioCapture()
            pendingMatchPromise?.reject(NoMatchFoundException())
            pendingMatchPromise = nil
        }
    }
    
    private func songToDict(_ song: DetectedSongResult) -> [String: Any] {
        return [
            "shazamId": song.shazamId,
            "title": song.title,
            "artist": song.artist,
            "artworkUrl": song.artworkUrl as Any,
            "appleMusicUrl": song.appleMusicUrl as Any,
            "webUrl": song.webUrl as Any,
            "genres": song.genres,
            "matchOffset": song.matchOffset,
            "isrc": song.isrc as Any,
            "explicitContent": song.explicitContent
        ]
    }
    
    private func cleanup() {
        stopAudioCapture()
        mixerNode.removeTap(onBus: 0)
        session = nil
        delegate = nil
        customCatalog = nil
    }
}

// MARK: - Shazam Session Delegate

@available(iOS 15.0, *)
private class ShazamSessionDelegate: NSObject, SHSessionDelegate {
    private let onMatch: (SHMatch) -> Void
    private let onNoMatch: (SHSignature, Error?) -> Void
    
    init(onMatch: @escaping (SHMatch) -> Void, onNoMatch: @escaping (SHSignature, Error?) -> Void) {
        self.onMatch = onMatch
        self.onNoMatch = onNoMatch
    }
    
    func session(_ session: SHSession, didFind match: SHMatch) {
        onMatch(match)
    }
    
    func session(_ session: SHSession, didNotFindMatchFor signature: SHSignature, error: Error?) {
        onNoMatch(signature, error)
    }
}

// MARK: - Exceptions

class ShazamKitUnavailableException: Exception {
    override var reason: String { "ShazamKit requires iOS 15.0 or later" }
}

class CustomCatalogUnavailableException: Exception {
    override var reason: String { "Custom catalogs require iOS 16.0 or later" }
}

class AlreadyListeningException: Exception {
    override var reason: String { "Already listening for music" }
}

class ListeningCancelledException: Exception {
    override var reason: String { "Listening was cancelled" }
}

class MicrophonePermissionException: Exception {
    override var reason: String { "Microphone permission denied" }
}

class AudioCaptureException: GenericException<String> {
    override var reason: String { "Audio capture failed: \(param)" }
}

class AudioProcessingException: GenericException<String> {
    override var reason: String { "Audio processing failed: \(param)" }
}

class NoMatchFoundException: Exception {
    override var reason: String { "No matching song found" }
}

class CatalogNotInitializedException: Exception {
    override var reason: String { "Custom catalog not initialized. Call initializeCustomCatalog first." }
}

class InvalidUrlException: Exception {
    override var reason: String { "Invalid audio file URL" }
}

// MARK: - TimeInterval Extension
extension TimeInterval {
    var seconds: Double {
        return self
    }
}
