class GestureControl {
    constructor(options = {}) {
        this.video = options.video;
        this.moondreamClient = options.moondreamClient;
        this.onGestureDetected = options.onGestureDetected || (() => {});
        this.onStatusUpdate = options.onStatusUpdate || (() => {});
        
        this.isRunning = false;
        this.detectionInterval = options.interval || 1500;
        this.cooldown = options.cooldown || 5000;
        this.debounceCount = options.debounce || 2;
        
        this.lastActionTime = 0;
        this.gestureCounters = {
            thumbsUp: 0,
            thumbsDown: 0,
            openPalm: 0
        };
        
        this.gestures = [
            { id: 'thumbsUp', name: 'Thumbs Up', prompt: 'thumbs up hand gesture', icon: '👍' },
            { id: 'thumbsDown', name: 'Thumbs Down', prompt: 'thumbs down hand gesture', icon: '👎' },
            { id: 'openPalm', name: 'Open Palm', prompt: 'open palm or stop hand gesture', icon: '✋' }
        ];
        
        this.detectionLoopId = null;
        this.currentGesture = null;
    }

    setMoondreamClient(client) {
        this.moondreamClient = client;
    }

    setVideo(video) {
        this.video = video;
    }

    setInterval(ms) {
        this.detectionInterval = ms;
    }

    setCooldown(ms) {
        this.cooldown = ms;
    }

    setDebounce(count) {
        this.debounceCount = count;
    }

    async detectGesture(gesturePrompt) {
        if (!this.moondreamClient || !this.video) {
            return { detected: false, confidence: 0 };
        }

        const prompt = `Is there a ${gesturePrompt} clearly visible in this image? Answer only YES or NO.`;

        try {
            const frame = this._captureFrame();
            const result = await this.moondreamClient.ask(frame, prompt);
            const answer = result.answer.toUpperCase().trim();
            const detected = answer.includes('YES');
            
            return { 
                detected, 
                confidence: detected ? 0.85 : 0.15
            };
        } catch (error) {
            console.error('[Gesture] Detection error:', error);
            return { detected: false, confidence: 0 };
        }
    }

    _captureFrame() {
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.8);
    }

    canTriggerAction() {
        const now = Date.now();
        return (now - this.lastActionTime) >= this.cooldown;
    }

    recordAction() {
        this.lastActionTime = Date.now();
    }

    resetCounters() {
        this.gestureCounters = {
            thumbsUp: 0,
            thumbsDown: 0,
            openPalm: 0
        };
    }

    async _detectionLoop() {
        if (!this.isRunning) return;

        this.onStatusUpdate('Detecting...');
        
        let detectedGesture = null;

        for (const gesture of this.gestures) {
            const result = await this.detectGesture(gesture.prompt);
            
            if (result.detected) {
                this.gestureCounters[gesture.id]++;
                
                if (this.gestureCounters[gesture.id] >= this.debounceCount) {
                    detectedGesture = gesture;
                    break;
                }
            } else {
                this.gestureCounters[gesture.id] = 0;
            }
        }

        if (detectedGesture && this.canTriggerAction()) {
            this.currentGesture = detectedGesture;
            this.onGestureDetected(detectedGesture);
            this.recordAction();
            this.resetCounters();
            this.onStatusUpdate(`Detected: ${detectedGesture.name}`);
        } else if (detectedGesture) {
            this.currentGesture = detectedGesture;
            const remaining = Math.ceil((this.cooldown - (Date.now() - this.lastActionTime)) / 1000);
            this.onStatusUpdate(`Cooldown: ${remaining}s`);
        } else {
            this.currentGesture = null;
            this.onStatusUpdate('Watching...');
        }

        if (this.isRunning) {
            this.detectionLoopId = setTimeout(() => this._detectionLoop(), this.detectionInterval);
        }
    }

    start() {
        if (this.isRunning) return;
        if (!this.moondreamClient) {
            console.error('[Gesture] No Moondream client configured');
            return false;
        }
        
        this.isRunning = true;
        this.resetCounters();
        this._detectionLoop();
        console.log('[Gesture] Detection started');
        return true;
    }

    stop() {
        this.isRunning = false;
        if (this.detectionLoopId) {
            clearTimeout(this.detectionLoopId);
            this.detectionLoopId = null;
        }
        this.currentGesture = null;
        this.onStatusUpdate('Stopped');
        console.log('[Gesture] Detection stopped');
    }

    getCurrentGesture() {
        return this.currentGesture;
    }

    getGestures() {
        return this.gestures;
    }
}

window.GestureControl = GestureControl;
