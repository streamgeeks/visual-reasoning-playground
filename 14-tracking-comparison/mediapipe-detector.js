class MediaPipeDetector {
    constructor() {
        this.faceDetection = null;
        this.pose = null;
        this.currentMode = 'face';
        this.lastDetection = null;
        this.lastLatency = 0;
        this.isReady = false;
        this.isProcessing = false;
        this.detectStartTime = 0;
        this.onResultCallback = null;
    }

    async initFaceDetection() {
        if (this.faceDetection) return;

        this.faceDetection = new FaceDetection({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
        });

        this.faceDetection.setOptions({
            model: 'short',
            minDetectionConfidence: 0.5
        });

        this.faceDetection.onResults((results) => this.handleFaceResults(results));
        await this.faceDetection.initialize();
    }

    async initPose() {
        if (this.pose) return;

        this.pose = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });

        this.pose.setOptions({
            modelComplexity: 0,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.pose.onResults((results) => this.handlePoseResults(results));
        await this.pose.initialize();
    }

    async setMode(mode) {
        this.currentMode = mode;
        this.isReady = false;
        
        if (mode === 'face') {
            await this.initFaceDetection();
        } else if (mode === 'pose') {
            await this.initPose();
        }
        
        this.isReady = true;
        return true;
    }

    handleFaceResults(results) {
        this.lastLatency = performance.now() - this.detectStartTime;
        this.isProcessing = false;

        if (results.detections && results.detections.length > 0) {
            const detection = results.detections[0];
            const bbox = detection.boundingBox;

            this.lastDetection = {
                x: bbox.xCenter,
                y: bbox.yCenter,
                width: bbox.width,
                height: bbox.height,
                x_min: bbox.xCenter - bbox.width / 2,
                y_min: bbox.yCenter - bbox.height / 2,
                x_max: bbox.xCenter + bbox.width / 2,
                y_max: bbox.yCenter + bbox.height / 2,
                confidence: detection.score ? detection.score[0] : 0.9,
                type: 'face'
            };
        } else {
            this.lastDetection = null;
        }

        if (this.onResultCallback) {
            this.onResultCallback(this.lastDetection, this.lastLatency);
        }
    }

    handlePoseResults(results) {
        this.lastLatency = performance.now() - this.detectStartTime;
        this.isProcessing = false;

        if (results.poseLandmarks && results.poseLandmarks.length > 0) {
            const landmarks = results.poseLandmarks;
            let minX = 1, maxX = 0, minY = 1, maxY = 0;

            for (let i = 0; i <= 16; i++) {
                if (landmarks[i]) {
                    minX = Math.min(minX, landmarks[i].x);
                    maxX = Math.max(maxX, landmarks[i].x);
                    minY = Math.min(minY, landmarks[i].y);
                    maxY = Math.max(maxY, landmarks[i].y);
                }
            }

            const padding = 0.05;
            minX = Math.max(0, minX - padding);
            maxX = Math.min(1, maxX + padding);
            minY = Math.max(0, minY - padding);
            maxY = Math.min(1, maxY + padding);

            this.lastDetection = {
                x: landmarks[0].x,
                y: landmarks[0].y,
                width: maxX - minX,
                height: maxY - minY,
                x_min: minX,
                y_min: minY,
                x_max: maxX,
                y_max: maxY,
                confidence: 0.9,
                type: 'pose'
            };
        } else {
            this.lastDetection = null;
        }

        if (this.onResultCallback) {
            this.onResultCallback(this.lastDetection, this.lastLatency);
        }
    }

    sendFrame(videoElement) {
        if (!this.isReady || this.isProcessing) return false;

        this.isProcessing = true;
        this.detectStartTime = performance.now();

        try {
            if (this.currentMode === 'face' && this.faceDetection) {
                this.faceDetection.send({ image: videoElement });
            } else if (this.currentMode === 'pose' && this.pose) {
                this.pose.send({ image: videoElement });
            }
            return true;
        } catch (e) {
            this.isProcessing = false;
            console.error('MediaPipe send error:', e);
            return false;
        }
    }

    onResult(callback) {
        this.onResultCallback = callback;
    }

    getLastDetection() {
        return this.lastDetection;
    }

    getLastLatency() {
        return this.lastLatency;
    }
}
