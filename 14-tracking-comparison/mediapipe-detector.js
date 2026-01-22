/**
 * MediaPipe Detector
 * Wraps MediaPipe Face Detection and Pose for PTZ tracking
 * 
 * Uses callback-based API for optimal performance (not Promise-based)
 */

class MediaPipeDetector {
    constructor() {
        this.mode = 'face'; // 'face' or 'pose'
        this.faceDetector = null;
        this.poseDetector = null;
        this.isInitialized = false;
        this.isProcessing = false;
        this.resultCallback = null;
        this.lastDetection = null;
        
        // Performance metrics
        this.frameCount = 0;
        this.totalLatency = 0;
    }

    /**
     * Initialize the detectors
     * Must be called before use
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Initialize Face Detection
            this.faceDetector = new FaceDetection({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
                }
            });

            this.faceDetector.setOptions({
                model: 'short',
                minDetectionConfidence: 0.5
            });

            this.faceDetector.onResults((results) => {
                this.handleFaceResults(results);
            });

            // Initialize Pose Detection
            this.poseDetector = new Pose({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                }
            });

            this.poseDetector.setOptions({
                modelComplexity: 0, // 0 = Lite (fastest)
                smoothLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.poseDetector.onResults((results) => {
                this.handlePoseResults(results);
            });

            this.isInitialized = true;
            console.log('MediaPipe detectors initialized');
            
        } catch (error) {
            console.error('Failed to initialize MediaPipe:', error);
            throw error;
        }
    }

    /**
     * Set detection mode
     * @param {'face'|'pose'} mode 
     */
    setMode(mode) {
        if (mode !== 'face' && mode !== 'pose') {
            throw new Error('Mode must be "face" or "pose"');
        }
        this.mode = mode;
        console.log(`MediaPipe mode set to: ${mode}`);
    }

    /**
     * Set callback for detection results
     * @param {Function} callback - Called with detection result object
     */
    onResult(callback) {
        this.resultCallback = callback;
    }

    /**
     * Send a video frame for processing
     * Results come via the callback set with onResult()
     * @param {HTMLVideoElement} video 
     */
    async sendFrame(video) {
        if (!this.isInitialized) {
            throw new Error('Detector not initialized. Call initialize() first.');
        }

        if (this.isProcessing) {
            // Skip frame if still processing previous
            return;
        }

        this.isProcessing = true;
        this.frameStartTime = performance.now();

        try {
            if (this.mode === 'face') {
                await this.faceDetector.send({ image: video });
            } else {
                await this.poseDetector.send({ image: video });
            }
        } catch (error) {
            this.isProcessing = false;
            console.error('MediaPipe processing error:', error);
        }
    }

    /**
     * Handle face detection results
     */
    handleFaceResults(results) {
        const latency = performance.now() - this.frameStartTime;
        this.isProcessing = false;
        this.frameCount++;
        this.totalLatency += latency;

        let detection = null;

        if (results.detections && results.detections.length > 0) {
            // Take first (most confident) face
            const face = results.detections[0];
            const box = face.boundingBox;

            // MediaPipe returns pixel coordinates relative to image
            // We need to normalize to 0-1 range
            detection = {
                found: true,
                x_min: box.xCenter - box.width / 2,
                y_min: box.yCenter - box.height / 2,
                x_max: box.xCenter + box.width / 2,
                y_max: box.yCenter + box.height / 2,
                // Center point (normalized 0-1)
                x: box.xCenter,
                y: box.yCenter,
                width: box.width,
                height: box.height,
                confidence: face.score ? face.score[0] : 0.9,
                label: 'face',
                latency: latency
            };
        } else {
            detection = {
                found: false,
                latency: latency
            };
        }

        this.lastDetection = detection;
        
        if (this.resultCallback) {
            this.resultCallback(detection);
        }
    }

    /**
     * Handle pose detection results
     */
    handlePoseResults(results) {
        const latency = performance.now() - this.frameStartTime;
        this.isProcessing = false;
        this.frameCount++;
        this.totalLatency += latency;

        let detection = null;

        if (results.poseLandmarks && results.poseLandmarks.length > 0) {
            const landmarks = results.poseLandmarks;
            
            // Calculate bounding box from landmarks
            let minX = 1, minY = 1, maxX = 0, maxY = 0;
            
            for (const lm of landmarks) {
                if (lm.x < minX) minX = lm.x;
                if (lm.y < minY) minY = lm.y;
                if (lm.x > maxX) maxX = lm.x;
                if (lm.y > maxY) maxY = lm.y;
            }

            // Get nose position (landmark 0) as center point for tracking
            const nose = landmarks[0];
            
            detection = {
                found: true,
                x_min: minX,
                y_min: minY,
                x_max: maxX,
                y_max: maxY,
                // Use nose as center for PTZ tracking (more stable than box center)
                x: nose.x,
                y: nose.y,
                width: maxX - minX,
                height: maxY - minY,
                confidence: 0.9,
                label: 'pose',
                latency: latency,
                landmarks: landmarks
            };
        } else {
            detection = {
                found: false,
                latency: latency
            };
        }

        this.lastDetection = detection;
        
        if (this.resultCallback) {
            this.resultCallback(detection);
        }
    }

    /**
     * Get average latency
     */
    getAverageLatency() {
        if (this.frameCount === 0) return 0;
        return this.totalLatency / this.frameCount;
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.frameCount = 0;
        this.totalLatency = 0;
    }

    /**
     * Clean up resources
     */
    close() {
        if (this.faceDetector) {
            this.faceDetector.close();
        }
        if (this.poseDetector) {
            this.poseDetector.close();
        }
        this.isInitialized = false;
    }
}

// Export to window
window.MediaPipeDetector = MediaPipeDetector;
