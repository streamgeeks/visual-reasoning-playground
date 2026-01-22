class OCREngine {
    constructor() {
        this.worker = null;
        this.isReady = false;
        this.isProcessing = false;
        this.onStatusChange = null;
        this.minScale = 3;
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
                tessedit_char_whitelist: '0123456789:.-',
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_WORD,
                preserve_interword_spaces: '0'
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

    preprocessImage(canvas, ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            const threshold = gray > 128 ? 255 : 0;
            data[i] = threshold;
            data[i + 1] = threshold;
            data[i + 2] = threshold;
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    preprocessImageInverted(canvas, ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            const threshold = gray > 128 ? 0 : 255;
            data[i] = threshold;
            data[i + 1] = threshold;
            data[i + 2] = threshold;
        }
        
        ctx.putImageData(imageData, 0, 0);
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
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;

            const x = Math.round(region.x * videoWidth);
            const y = Math.round(region.y * videoHeight);
            const w = Math.round(region.width * videoWidth);
            const h = Math.round(region.height * videoHeight);

            const scale = Math.max(this.minScale, Math.ceil(100 / h));
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = w * scale;
            canvas.height = h * scale;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(video, x, y, w, h, 0, 0, canvas.width, canvas.height);

            this.preprocessImage(canvas, ctx);

            let result = await this.worker.recognize(canvas);
            
            if (result.data.confidence < 50) {
                ctx.drawImage(video, x, y, w, h, 0, 0, canvas.width, canvas.height);
                this.preprocessImageInverted(canvas, ctx);
                result = await this.worker.recognize(canvas);
            }
            
            this.isProcessing = false;
            
            return {
                text: result.data.text.trim().replace(/\s+/g, ''),
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
