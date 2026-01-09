/**
 * Moondream API Integration Module
 * Handles communication with Moondream Cloud API for object detection
 */

class MoondreamDetector {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiEndpoint = 'https://api.moondream.ai/v1/detect';
    }

    /**
     * Update the API key
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Capture a frame from the video element and convert to base64
     * @param {HTMLVideoElement} video - The video element
     * @returns {string} Base64 encoded JPEG image with data URL prefix
     */
    captureFrame(video) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 JPEG (reduce quality to 0.8 for faster API calls)
        return canvas.toDataURL('image/jpeg', 0.8);
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
        }
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
