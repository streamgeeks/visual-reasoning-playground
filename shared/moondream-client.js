/**
 * Moondream Client - Shared API Integration
 * Part of the Visual Reasoning Playground
 * 
 * This module provides a unified interface to the Moondream API
 * used across all playground tools.
 * 
 * @see https://github.com/PTZOptics/visual-reasoning-playground
 * @see Book: "Visual Reasoning AI for Broadcast and ProAV" by Paul Richards
 */

class MoondreamClient {
    constructor(apiKey = null) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.moondream.ai/v1';
        this.timeout = 30000; // 30 second timeout
    }

    /**
     * Set or update the API key
     * @param {string} apiKey - Moondream API key
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Capture a frame from a video element
     * @param {HTMLVideoElement} video - Video element to capture from
     * @param {number} quality - JPEG quality (0-1), default 0.8
     * @returns {string} Base64 data URL of the captured frame
     */
    captureFrame(video, quality = 0.8) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        return canvas.toDataURL('image/jpeg', quality);
    }

    /**
     * Make an API request to Moondream
     * @private
     */
    async _request(endpoint, body) {
        if (!this.apiKey) {
            throw new Error('Moondream API key not set. Get one at console.moondream.ai');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Moondream-Auth': this.apiKey
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                if (response.status === 401) {
                    throw new Error('Invalid API key. Check your Moondream API key.');
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Reduce detection rate or upgrade plan.');
                }
                throw new Error(`API error (${response.status}): ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Check your connection.');
            }
            throw error;
        }
    }

    /**
     * Describe an image in natural language
     * @param {string} imageDataUrl - Base64 image data URL
     * @param {Object} options - Optional parameters
     * @param {number} options.maxTokens - Maximum response length (default: 200)
     * @returns {Promise<{description: string}>}
     */
    async describe(imageDataUrl, options = {}) {
        const result = await this._request('/describe', {
            image_url: imageDataUrl,
            max_tokens: options.maxTokens || 200
        });
        return {
            description: result.description,
            raw: result
        };
    }

    /**
     * Detect objects in an image
     * @param {string} imageDataUrl - Base64 image data URL
     * @param {string} objectDescription - What to detect (e.g., "person", "red ball")
     * @returns {Promise<{objects: Array}>} Array of detections with normalized coordinates
     */
    async detect(imageDataUrl, objectDescription) {
        if (!objectDescription || objectDescription.trim() === '') {
            throw new Error('Object description cannot be empty');
        }

        const result = await this._request('/detect', {
            image_url: imageDataUrl,
            object: objectDescription.trim()
        });

        // Normalize the response format
        const objects = (result.objects || []).map(obj => ({
            x_min: obj.x_min,
            y_min: obj.y_min,
            x_max: obj.x_max,
            y_max: obj.y_max,
            // Add center coordinates for convenience
            x: (obj.x_min + obj.x_max) / 2,
            y: (obj.y_min + obj.y_max) / 2,
            width: obj.x_max - obj.x_min,
            height: obj.y_max - obj.y_min,
            confidence: obj.confidence || 1.0
        }));

        return { objects, raw: result };
    }

    /**
     * Ask a question about an image
     * @param {string} imageDataUrl - Base64 image data URL
     * @param {string} question - Question to ask about the image
     * @returns {Promise<{answer: string}>}
     */
    async ask(imageDataUrl, question) {
        if (!question || question.trim() === '') {
            throw new Error('Question cannot be empty');
        }

        const result = await this._request('/ask', {
            image_url: imageDataUrl,
            question: question.trim()
        });

        return {
            answer: result.answer,
            raw: result
        };
    }

    /**
     * Point to a described location in an image
     * @param {string} imageDataUrl - Base64 image data URL
     * @param {string} description - Description of what to point to
     * @returns {Promise<{x: number, y: number}>} Normalized coordinates
     */
    async point(imageDataUrl, description) {
        if (!description || description.trim() === '') {
            throw new Error('Description cannot be empty');
        }

        const result = await this._request('/point', {
            image_url: imageDataUrl,
            description: description.trim()
        });

        return {
            x: result.x,
            y: result.y,
            raw: result
        };
    }

    /**
     * Convenience method: Detect in video frame
     * @param {HTMLVideoElement} video - Video element
     * @param {string} objectDescription - What to detect
     * @returns {Promise<{objects: Array}>}
     */
    async detectInVideo(video, objectDescription) {
        const frame = this.captureFrame(video);
        return this.detect(frame, objectDescription);
    }

    /**
     * Convenience method: Describe video frame
     * @param {HTMLVideoElement} video - Video element
     * @param {Object} options - Optional parameters
     * @returns {Promise<{description: string}>}
     */
    async describeVideo(video, options = {}) {
        const frame = this.captureFrame(video);
        return this.describe(frame, options);
    }

    /**
     * Convenience method: Ask about video frame
     * @param {HTMLVideoElement} video - Video element
     * @param {string} question - Question to ask
     * @returns {Promise<{answer: string}>}
     */
    async askVideo(video, question) {
        const frame = this.captureFrame(video);
        return this.ask(frame, question);
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MoondreamClient;
}
