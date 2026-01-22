class OCREngine {
    constructor() {
        this.worker = null;
        this.isReady = false;
        this.isProcessing = false;
        this.onStatusChange = null;
    }

    async initialize() {
        if (this.isReady) return;

        try {
            this.updateStatus('loading', 'Loading Tesseract.js...');
            
            this.worker = await Tesseract.createWorker('eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        this.updateStatus('loading', `OCR: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });

            await this.worker.setParameters({
                tessedit_char_whitelist: '0123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz -',
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE
            });

            this.isReady = true;
            this.updateStatus('ready', 'Tesseract.js ready');
            
        } catch (error) {
            this.updateStatus('error', 'Failed to load OCR: ' + error.message);
            throw error;
        }
    }

    updateStatus(state, message) {
        if (this.onStatusChange) {
            this.onStatusChange(state, message);
        }
    }

    async recognizeRegion(video, region) {
        if (!this.isReady) {
            throw new Error('OCR engine not initialized');
        }

        if (this.isProcessing) {
            return null;
        }

        this.isProcessing = true;

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;

            const x = Math.round(region.x * videoWidth);
            const y = Math.round(region.y * videoHeight);
            const w = Math.round(region.width * videoWidth);
            const h = Math.round(region.height * videoHeight);

            canvas.width = w;
            canvas.height = h;

            ctx.drawImage(video, x, y, w, h, 0, 0, w, h);

            ctx.filter = 'contrast(1.5) brightness(1.1)';
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = 'none';

            const result = await this.worker.recognize(canvas);
            
            this.isProcessing = false;
            
            return {
                text: result.data.text.trim(),
                confidence: result.data.confidence,
                region: region.name
            };

        } catch (error) {
            this.isProcessing = false;
            throw error;
        }
    }

    async recognizeMultipleRegions(video, regions) {
        const results = {};
        
        for (const [name, region] of Object.entries(regions)) {
            if (region) {
                try {
                    const result = await this.recognizeRegion(video, { ...region, name });
                    results[name] = result;
                } catch (error) {
                    results[name] = { text: '', confidence: 0, error: error.message };
                }
            }
        }
        
        return results;
    }

    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.isReady = false;
        }
    }
}

window.OCREngine = OCREngine;
