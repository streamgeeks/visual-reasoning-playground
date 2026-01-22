class MediaPipeDetector {
    constructor() {
        this.faceDetection = null;
        this.pose = null;
        this.currentMode = 'face';
        this.lastDetection = null;
        this.isReady = false;
        this.pendingResolve = null;
        this.detectStartTime = 0;
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
        console.log('MediaPipe Face Detection initialized');
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
        console.log('MediaPipe Pose initialized');
    }

    async setMode(mode) {
        this.currentMode = mode;

        if (mode === 'face') {
            await this.initFaceDetection();
        } else if (mode === 'pose') {
            await this.initPose();
        }

        this.isReady = true;
    }

    handleFaceResults(results) {
        const latency = performance.now() - this.detectStartTime;

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

        if (this.pendingResolve) {
            this.pendingResolve({ detection: this.lastDetection, latency });
            this.pendingResolve = null;
        }
    }

    handlePoseResults(results) {
        const latency = performance.now() - this.detectStartTime;

        if (results.poseLandmarks && results.poseLandmarks.length > 0) {
            const landmarks = results.poseLandmarks;

            let minX = 1, maxX = 0, minY = 1, maxY = 0;

            const upperBodyIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

            upperBodyIndices.forEach(i => {
                if (landmarks[i]) {
                    minX = Math.min(minX, landmarks[i].x);
                    maxX = Math.max(maxX, landmarks[i].x);
                    minY = Math.min(minY, landmarks[i].y);
                    maxY = Math.max(maxY, landmarks[i].y);
                }
            });

            const padding = 0.05;
            minX = Math.max(0, minX - padding);
            maxX = Math.min(1, maxX + padding);
            minY = Math.max(0, minY - padding);
            maxY = Math.min(1, maxY + padding);

            const noseLandmark = landmarks[0];

            this.lastDetection = {
                x: noseLandmark.x,
                y: noseLandmark.y,
                width: maxX - minX,
                height: maxY - minY,
                x_min: minX,
                y_min: minY,
                x_max: maxX,
                y_max: maxY,
                confidence: 0.9,
                type: 'pose',
                landmarks: landmarks
            };
        } else {
            this.lastDetection = null;
        }

        if (this.pendingResolve) {
            this.pendingResolve({ detection: this.lastDetection, latency });
            this.pendingResolve = null;
        }
    }

    detect(videoElement) {
        if (!this.isReady) {
            return Promise.reject(new Error('MediaPipe not initialized. Call setMode() first.'));
        }

        return new Promise((resolve) => {
            this.pendingResolve = resolve;
            this.detectStartTime = performance.now();

            if (this.currentMode === 'face' && this.faceDetection) {
                this.faceDetection.send({ image: videoElement });
            } else if (this.currentMode === 'pose' && this.pose) {
                this.pose.send({ image: videoElement });
            }

            setTimeout(() => {
                if (this.pendingResolve) {
                    this.pendingResolve({ detection: null, latency: performance.now() - this.detectStartTime });
                    this.pendingResolve = null;
                }
            }, 5000);
        });
    }

    getLastDetection() {
        return this.lastDetection;
    }
}
