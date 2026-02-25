/**
 * OpenAI Vision Client - Shared API Integration
 * Part of the Visual Reasoning Playground
 * 
 * This module provides a unified interface to OpenAI's vision API
 * (GPT-4o, GPT-4o-mini) for use across all playground tools.
 * 
 * @see https://github.com/StreamGeeks/visual-reasoning-playground
 * @see Book: "Visual Reasoning AI for Broadcast and ProAV" by Paul Richards
 */

class OpenAIVisionClient {
    constructor(apiKey = null) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.openai.com/v1';
        this.timeout = 60000; // 60 second timeout for vision requests
        this.defaultModel = 'gpt-4o-mini'; // Default to cheaper/faster model
    }

    /**
     * Set or update the API key
     * @param {string} apiKey - OpenAI API key (starts with sk-)
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Capture a frame from video element
     * @param {HTMLVideoElement} video - Video element
     * @param {number} quality - JPEG quality (0-1)
     * @returns {string} Base64 data URL
     */
    captureFrame(video, quality = 0.85) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
            return canvas.toDataURL('image/jpeg', quality);
        } catch (e) {
            if (e.name === 'SecurityError') {
                throw new Error('Cannot capture frame from sample video. Please switch to Live Camera mode.');
            }
            throw e;
        }
    }

    /**
     * Make an API request to OpenAI
     * @private
     */
    async _request(endpoint, body) {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not set. Get one at platform.openai.com');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.apiKey
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                if (response.status === 401) {
                    throw new Error('Invalid OpenAI API key. Please check your key.');
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Wait a moment or upgrade your plan.');
                } else if (response.status === 400) {
                    throw new Error(`OpenAI API error: ${errorText}`);
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
     * Generate a caption/description for an image
     * @param {string} imageDataUrl - Base64 image data URL
     * @param {Object} options - Optional parameters
     * @param {string} options.model - Model to use: 'gpt-4o', 'gpt-4o-mini' (default)
     * @param {string} options.prompt - Custom prompt (default: "Describe this image")
     * @returns {Promise<{description: string}>}
     */
    async describe(imageDataUrl, options = {}) {
        const model = options.model || this.defaultModel;
        const prompt = options.prompt || 'Describe this image in detail.';
        
        // Remove the data URL prefix
        const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');

        const result = await this._request('/chat/completions', {
            model: model,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { 
                            type: 'image_url', 
                            image_url: { 
                                url: `data:image/jpeg;base64,${base64Data}`,
                                detail: 'low' // Use low detail for faster/cheaper requests
                            } 
                        }
                    ]
                }
            ],
            max_tokens: 1000
        });

        return {
            description: result.choices[0]?.message?.content || '',
            raw: result
        };
    }

    /**
     * Ask a question about an image (equivalent to Moondream's ask)
     * @param {string} imageDataUrl - Base64 image data URL
     * @param {string} question - Question to ask about the image
     * @param {Object} options - Optional parameters
     * @param {string} options.model - Model to use
     * @returns {Promise<{answer: string}>}
     */
    async ask(imageDataUrl, question, options = {}) {
        const model = options.model || this.defaultModel;
        
        // Remove the data URL prefix
        const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');

        const result = await this._request('/chat/completions', {
            model: model,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: question },
                        { 
                            type: 'image_url', 
                            image_url: { 
                                url: `data:image/jpeg;base64,${base64Data}`,
                                detail: 'low'
                            } 
                        }
                    ]
                }
            ],
            max_tokens: 1000
        });

        return {
            answer: result.choices[0]?.message?.content || '',
            raw: result
        };
    }

    /**
     * Detect objects in an image using vision
     * Uses a structured prompt approach since OpenAI doesn't have a dedicated detect endpoint
     * @param {string} imageDataUrl - Base64 image data URL
     * @param {string} objectDescription - What to detect (e.g., "person", "red ball")
     * @param {Object} options - Optional parameters
     * @returns {Promise<{objects: Array}>} Array of detections with normalized coordinates
     */
    async detect(imageDataUrl, objectDescription, options = {}) {
        const model = options.model || this.defaultModel;
        
        // Remove the data URL prefix
        const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');

        const detectPrompt = `Analyze this image and detect all instances of "${objectDescription}".
For each detected object, provide:
1. A brief description of what you see
2. Estimate its position as percentage of image (x%, y% from top-left)
3. Estimate its size as percentage of image (width%, height%)

Respond with ONLY a valid JSON array (no markdown, no backticks):
[{"description": "brief description", "x": 0-100, "y": 0-100, "width": 0-100, "height": 0-100, "confidence": 0-1}]

If no objects found, respond with: []`;

        const result = await this._request('/chat/completions', {
            model: model,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: detectPrompt },
                        { 
                            type: 'image_url', 
                            image_url: { 
                                url: `data:image/jpeg;base64,${base64Data}`,
                                detail: 'low'
                            } 
                        }
                    ]
                }
            ],
            max_tokens: 1500
        });

        const answer = result.choices[0]?.message?.content || '[]';
        
        // Parse the JSON response
        let objects = [];
        try {
            // Try to extract JSON array from response
            const jsonMatch = answer.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                objects = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn('Failed to parse detection response:', e);
        }

        // Normalize to same format as Moondream
        const normalized = objects.map(obj => ({
            x_min: (obj.x || 0) / 100,
            y_min: (obj.y || 0) / 100,
            x_max: ((obj.x || 0) + (obj.width || 0)) / 100,
            y_max: ((obj.y || 0) + (obj.height || 0)) / 100,
            x: (obj.x || 0) / 100 + ((obj.width || 0) / 100) / 2,
            y: (obj.y || 0) / 100 + ((obj.height || 0) / 100) / 2,
            width: (obj.width || 0) / 100,
            height: (obj.height || 0) / 100,
            confidence: obj.confidence || 0.8,
            description: obj.description || ''
        }));

        return { objects: normalized, raw: result };
    }

    /**
     * Convenience method: Detect in video frame
     * @param {HTMLVideoElement} video - Video element
     * @param {string} objectDescription - What to detect
     * @param {Object} options - Optional parameters
     * @returns {Promise<{objects: Array}>}
     */
    async detectInVideo(video, objectDescription, options = {}) {
        const frame = this.captureFrame(video);
        return this.detect(frame, objectDescription, options);
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
     * @param {Object} options - Optional parameters
     * @returns {Promise<{answer: string}>}
     */
    async askVideo(video, question, options = {}) {
        const frame = this.captureFrame(video);
        return this.ask(frame, question, options);
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpenAIVisionClient;
}
