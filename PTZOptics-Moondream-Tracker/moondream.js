/**
 * Moondream API Integration Module
 * Handles communication with Moondream Cloud API for object detection
 * 
 * Optimized for speed:
 * - Reuses canvas to avoid GC pressure
 * - Downsamples images to reduce payload size
 * - Configurable JPEG quality
 * - Request pipelining support
 */

class MoondreamDetector {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.apiEndpoint = 'https://api.moondream.ai/v1/detect';
        
        // Performance optimization settings
        this.maxDimension = options.maxDimension || 640;  // Downsample to max 640px
        this.jpegQuality = options.jpegQuality || 0.6;     // Lower quality for detection
        
        // Reusable canvas for frame capture (avoids GC pressure)
        this.captureCanvas = null;
        this.captureCtx = null;
        
        // Request tracking for pipelining
        this.pendingRequests = 0;
        this.maxPendingRequests = options.maxPendingRequests || 2;
    }

    /**
     * Update API key
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }
    
    /**
     * Update performance settings
     */
    setPerformanceOptions(options) {
        if (options.maxDimension !== undefined) this.maxDimension = options.maxDimension;
        if (options.jpegQuality !== undefined) this.jpegQuality = options.jpegQuality;
        if (options.maxPendingRequests !== undefined) this.maxPendingRequests = options.maxPendingRequests;
    }

    /**
     * Get or create the reusable capture canvas
     */
    _getCaptureCanvas(width, height) {
        if (!this.captureCanvas || this.captureCanvas.width !== width || this.captureCanvas.height !== height) {
            this.captureCanvas = document.createElement('canvas');
            this.captureCanvas.width = width;
            this.captureCanvas.height = height;
            this.captureCtx = this.captureCanvas.getContext('2d', { alpha: false });
        }
        return this.captureCanvas;
    }

    /**
     * Capture a frame from the video element and convert to base64
     * Optimized: reuses canvas, downsamples, configurable quality
     * @param {HTMLVideoElement} video - The video element
     * @returns {string} Base64 encoded JPEG image with data URL prefix
     */
    captureFrame(video) {
        const sourceWidth = video.videoWidth;
        const sourceHeight = video.videoHeight;
        
        // Calculate downsampled dimensions (maintain aspect ratio)
        let targetWidth = sourceWidth;
        let targetHeight = sourceHeight;
        
        if (this.maxDimension > 0 && (sourceWidth > this.maxDimension || sourceHeight > this.maxDimension)) {
            const scale = this.maxDimension / Math.max(sourceWidth, sourceHeight);
            targetWidth = Math.round(sourceWidth * scale);
            targetHeight = Math.round(sourceHeight * scale);
        }
        
        // Get reusable canvas at target size
        const canvas = this._getCaptureCanvas(targetWidth, targetHeight);
        const ctx = this.captureCtx;
        
        // Draw video frame (browser handles scaling)
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        
        // Convert to base64 JPEG with configurable quality
        return canvas.toDataURL('image/jpeg', this.jpegQuality);
    }

    /**
     * Query Moondream API to detect objects
     * @param {string} imageDataUrl - Base64 encoded image with data URL prefix
     * @param {string} objectDescription - Description of object to detect
     * @returns {Promise<Array>} Array of detected objects with normalized coordinates
     */
    async detect(imageDataUrl, objectDescription) {
        if (!this.apiKey) {
            throw new Error('Moondream API key not set');
        }

        if (!objectDescription || objectDescription.trim() === '') {
            throw new Error('Object description cannot be empty');
        }

        // Track pending requests for pipelining
        this.pendingRequests++;

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Moondream-Auth': this.apiKey
                },
                body: JSON.stringify({
                    image_url: imageDataUrl,
                    object: objectDescription.trim()
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Moondream API error (${response.status}): ${errorText}`);
            }

            const result = await response.json();
            
            // Return the objects array with normalized coordinates (0-1)
            // Format: { x_min, y_min, x_max, y_max }
            return result.objects || [];
        } catch (error) {
            console.error('Moondream detection error:', error);
            throw error;
        } finally {
            this.pendingRequests--;
        }
    }

    /**
     * Check if we can pipeline another request
     */
    canPipeline() {
        return this.pendingRequests < this.maxPendingRequests;
    }

    /**
     * Detect object in video frame
     * @param {HTMLVideoElement} video - The video element
     * @param {string} objectDescription - Description of object to detect
     * @returns {Promise<Array>} Array of detections with center coordinates added
     */
    async detectInVideo(video, objectDescription) {
        const imageDataUrl = this.captureFrame(video);
        const detections = await this.detect(imageDataUrl, objectDescription);
        
        // Add center coordinates and dimensions for easier PTZ calculations
        return detections.map(obj => ({
            ...obj,
            x: (obj.x_min + obj.x_max) / 2,  // Center X (normalized 0-1)
            y: (obj.y_min + obj.y_max) / 2,  // Center Y (normalized 0-1)
            width: obj.x_max - obj.x_min,     // Width (normalized 0-1)
            height: obj.y_max - obj.y_min     // Height (normalized 0-1)
        }));
    }
}
