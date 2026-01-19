class SceneDescriber {
    constructor(options = {}) {
        this.video = options.video;
        this.moondreamClient = options.moondreamClient;
        this.onDescription = options.onDescription || (() => {});
        this.onStatusUpdate = options.onStatusUpdate || (() => {});
        
        this.isRunning = false;
        this.interval = options.interval || 3000;
        this.descriptionLoopId = null;
        
        this.currentDescription = '';
        this.descriptionHistory = [];
        this.maxHistory = 50;
    }

    setMoondreamClient(client) {
        this.moondreamClient = client;
    }

    setVideo(video) {
        this.video = video;
    }

    setInterval(ms) {
        this.interval = ms;
        if (this.isRunning) {
            this.stop();
            this.start();
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

    async describeOnce() {
        if (!this.moondreamClient || !this.video) {
            return null;
        }

        try {
            const frame = this._captureFrame();
            const result = await this.moondreamClient.describe(frame, { length: 'normal' });
            
            const description = result.description;
            this.currentDescription = description;
            
            const entry = {
                description,
                timestamp: new Date(),
                id: Date.now()
            };
            
            this.descriptionHistory.unshift(entry);
            if (this.descriptionHistory.length > this.maxHistory) {
                this.descriptionHistory.pop();
            }
            
            return description;
        } catch (error) {
            console.error('[Describer] Error:', error);
            return null;
        }
    }

    async _descriptionLoop() {
        if (!this.isRunning) return;

        this.onStatusUpdate('Analyzing...');
        
        const description = await this.describeOnce();
        
        if (description) {
            this.onDescription(description, this.descriptionHistory[0]);
            this.onStatusUpdate('Active');
        } else {
            this.onStatusUpdate('Error');
        }

        if (this.isRunning) {
            this.descriptionLoopId = setTimeout(() => this._descriptionLoop(), this.interval);
        }
    }

    start() {
        if (this.isRunning) return;
        if (!this.moondreamClient) {
            console.error('[Describer] No Moondream client configured');
            return false;
        }
        
        this.isRunning = true;
        this._descriptionLoop();
        console.log('[Describer] Started');
        return true;
    }

    stop() {
        this.isRunning = false;
        if (this.descriptionLoopId) {
            clearTimeout(this.descriptionLoopId);
            this.descriptionLoopId = null;
        }
        this.onStatusUpdate('Stopped');
        console.log('[Describer] Stopped');
    }

    getCurrentDescription() {
        return this.currentDescription;
    }

    getHistory() {
        return this.descriptionHistory;
    }

    clearHistory() {
        this.descriptionHistory = [];
    }
}

window.SceneDescriber = SceneDescriber;
