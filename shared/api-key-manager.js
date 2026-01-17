/**
 * API Key Manager - Unified Key Management for Visual Reasoning Playground
 * 
 * Manages both Moondream (vision) and OpenAI (audio/Whisper) API keys
 * across all playground tools with a consistent UI.
 * 
 * @see https://github.com/StreamGeeks/visual-reasoning-playground
 * @see Book: "Visual Reasoning AI for Broadcast and ProAV" by Paul Richards
 */

class APIKeyManager {
    constructor(options = {}) {
        this.options = {
            requireMoondream: true,
            requireOpenAI: false,
            onKeysChanged: null,
            autoShow: true,  // Auto-show modal if required keys missing
            ...options
        };

        this.STORAGE_KEYS = {
            moondream: 'vrp_moondream_api_key',
            openai: 'vrp_openai_api_key',
            validated: 'vrp_keys_validated'
        };

        this.keys = {
            moondream: null,
            openai: null
        };

        this.modalElement = null;
        this.statusElement = null;

        this._loadKeys();
        this._injectStyles();
        this._createStatusBar();
        this._createModal();

        // Auto-show if required keys are missing
        if (this.options.autoShow && !this._hasRequiredKeys()) {
            setTimeout(() => this.showModal(), 500);
        }
    }

    /**
     * Load keys from localStorage
     */
    _loadKeys() {
        this.keys.moondream = localStorage.getItem(this.STORAGE_KEYS.moondream) || null;
        this.keys.openai = localStorage.getItem(this.STORAGE_KEYS.openai) || null;
    }

    /**
     * Save keys to localStorage
     */
    _saveKeys() {
        if (this.keys.moondream) {
            localStorage.setItem(this.STORAGE_KEYS.moondream, this.keys.moondream);
        } else {
            localStorage.removeItem(this.STORAGE_KEYS.moondream);
        }

        if (this.keys.openai) {
            localStorage.setItem(this.STORAGE_KEYS.openai, this.keys.openai);
        } else {
            localStorage.removeItem(this.STORAGE_KEYS.openai);
        }
    }

    /**
     * Check if all required keys are present
     */
    _hasRequiredKeys() {
        if (this.options.requireMoondream && !this.keys.moondream) return false;
        if (this.options.requireOpenAI && !this.keys.openai) return false;
        return true;
    }

    /**
     * Inject component styles
     */
    _injectStyles() {
        if (document.getElementById('api-key-manager-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'api-key-manager-styles';
        styles.textContent = `
            /* API Key Status Bar */
            .akm-status-bar {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
                padding: 8px 15px;
                background: var(--surface);
                border-bottom: 1px solid var(--surface-light);
                font-size: 0.85rem;
            }

            .akm-key-status {
                display: flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                padding: 4px 10px;
                border-radius: 4px;
                transition: background 0.2s;
            }

            .akm-key-status:hover {
                background: var(--surface-light);
            }

            .akm-status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
            }

            .akm-status-dot.set {
                background: var(--success);
                box-shadow: 0 0 6px var(--success);
            }

            .akm-status-dot.missing {
                background: var(--error);
                box-shadow: 0 0 6px var(--error);
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            .akm-manage-btn {
                background: var(--primary);
                color: white;
                border: none;
                padding: 6px 14px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.85rem;
                font-weight: 500;
                transition: background 0.2s;
            }

            .akm-manage-btn:hover {
                background: #2555a3;
            }

            /* Modal Overlay */
            .akm-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s, visibility 0.3s;
            }

            .akm-modal-overlay.visible {
                opacity: 1;
                visibility: visible;
            }

            .akm-modal {
                background: var(--surface);
                border-radius: 12px;
                width: 90%;
                max-width: 500px;
                max-height: 90vh;
                overflow-y: auto;
                transform: translateY(20px);
                transition: transform 0.3s;
            }

            .akm-modal-overlay.visible .akm-modal {
                transform: translateY(0);
            }

            .akm-modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid var(--surface-light);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .akm-modal-header h2 {
                color: var(--primary-light);
                font-size: 1.3rem;
                margin: 0;
            }

            .akm-close-btn {
                background: none;
                border: none;
                color: var(--text-muted);
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }

            .akm-close-btn:hover {
                color: var(--text);
            }

            .akm-modal-body {
                padding: 24px;
            }

            .akm-key-section {
                margin-bottom: 24px;
            }

            .akm-key-section:last-child {
                margin-bottom: 0;
            }

            .akm-key-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }

            .akm-key-header h3 {
                margin: 0;
                font-size: 1rem;
                color: var(--text);
            }

            .akm-key-header .akm-badge {
                font-size: 0.7rem;
                padding: 2px 8px;
                border-radius: 10px;
                font-weight: 600;
            }

            .akm-badge.required {
                background: var(--warning);
                color: var(--background);
            }

            .akm-badge.optional {
                background: var(--surface-light);
                color: var(--text-muted);
            }

            .akm-key-description {
                color: var(--text-muted);
                font-size: 0.85rem;
                margin-bottom: 10px;
            }

            .akm-input-group {
                display: flex;
                gap: 8px;
            }

            .akm-input-group input {
                flex: 1;
                padding: 12px 14px;
                background: var(--background);
                border: 1px solid var(--surface-light);
                border-radius: 6px;
                color: var(--text);
                font-size: 0.9rem;
                font-family: 'Consolas', 'Monaco', monospace;
            }

            .akm-input-group input:focus {
                outline: none;
                border-color: var(--primary);
            }

            .akm-input-group input.valid {
                border-color: var(--success);
            }

            .akm-input-group input.invalid {
                border-color: var(--error);
            }

            .akm-toggle-visibility {
                background: var(--surface-light);
                border: none;
                color: var(--text-muted);
                padding: 0 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1.1rem;
            }

            .akm-toggle-visibility:hover {
                background: #3a5269;
                color: var(--text);
            }

            .akm-test-btn {
                background: var(--primary);
                border: none;
                color: white;
                padding: 0 14px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.85rem;
                font-weight: 500;
                transition: all 0.2s;
            }

            .akm-test-btn:hover {
                background: #2555a3;
            }

            .akm-test-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .akm-test-btn.testing {
                position: relative;
                color: transparent;
            }

            .akm-test-btn.testing::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 14px;
                height: 14px;
                margin: -7px 0 0 -7px;
                border: 2px solid rgba(255,255,255,0.3);
                border-top-color: #fff;
                border-radius: 50%;
                animation: akm-spin 0.8s linear infinite;
            }

            @keyframes akm-spin {
                to { transform: rotate(360deg); }
            }

            .akm-key-link {
                display: inline-block;
                margin-top: 8px;
                color: var(--secondary);
                font-size: 0.85rem;
                text-decoration: none;
            }

            .akm-key-link:hover {
                text-decoration: underline;
            }

            .akm-modal-footer {
                padding: 16px 24px;
                border-top: 1px solid var(--surface-light);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .akm-save-btn {
                background: var(--success);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1rem;
                font-weight: 600;
                transition: background 0.2s;
            }

            .akm-save-btn:hover {
                background: #238b7e;
            }

            .akm-save-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .akm-clear-btn {
                background: none;
                border: 1px solid var(--error);
                color: var(--error);
                padding: 10px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.9rem;
            }

            .akm-clear-btn:hover {
                background: rgba(230, 57, 70, 0.1);
            }

            .akm-validation-msg {
                font-size: 0.8rem;
                margin-top: 6px;
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .akm-validation-msg.success {
                color: var(--success);
            }

            .akm-validation-msg.error {
                color: var(--error);
            }

            .akm-info-box {
                background: rgba(48, 102, 190, 0.1);
                border: 1px solid var(--primary);
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 20px;
                font-size: 0.85rem;
                color: var(--text-muted);
            }

            .akm-info-box strong {
                color: var(--primary-light);
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Create the status bar that appears at the top
     */
    _createStatusBar() {
        this.statusElement = document.createElement('div');
        this.statusElement.className = 'akm-status-bar';
        this._updateStatusBar();

        // Insert after header or at top of body
        const header = document.querySelector('.app-header');
        if (header) {
            header.after(this.statusElement);
        } else {
            document.body.insertBefore(this.statusElement, document.body.firstChild);
        }
    }

    /**
     * Update the status bar display
     */
    _updateStatusBar() {
        const moondreamSet = !!this.keys.moondream;
        const openaiSet = !!this.keys.openai;

        let statusHTML = `
            <div class="akm-key-status" onclick="window.apiKeyManager.showModal()">
                <span class="akm-status-dot ${moondreamSet ? 'set' : 'missing'}"></span>
                <span>Moondream: ${moondreamSet ? 'Ready' : 'Not Set'}</span>
            </div>
        `;

        if (this.options.requireOpenAI) {
            statusHTML += `
                <div class="akm-key-status" onclick="window.apiKeyManager.showModal()">
                    <span class="akm-status-dot ${openaiSet ? 'set' : 'missing'}"></span>
                    <span>OpenAI: ${openaiSet ? 'Ready' : 'Not Set'}</span>
                </div>
            `;
        }

        statusHTML += `
            <button class="akm-manage-btn" onclick="window.apiKeyManager.showModal()">
                Manage API Keys
            </button>
        `;

        this.statusElement.innerHTML = statusHTML;
    }

    /**
     * Create the modal dialog
     */
    _createModal() {
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'akm-modal-overlay';
        this.modalElement.innerHTML = `
            <div class="akm-modal">
                <div class="akm-modal-header">
                    <h2>API Key Manager</h2>
                    <button class="akm-close-btn" onclick="window.apiKeyManager.hideModal()">&times;</button>
                </div>
                <div class="akm-modal-body">
                    <div class="akm-info-box">
                        <strong>Your keys are stored locally</strong> in your browser and never sent to our servers.
                        They're only used to communicate directly with the Moondream and OpenAI APIs.
                    </div>

                    <div class="akm-key-section">
                        <div class="akm-key-header">
                            <h3>Moondream API Key</h3>
                            <span class="akm-badge ${this.options.requireMoondream ? 'required' : 'optional'}">
                                ${this.options.requireMoondream ? 'Required' : 'Optional'}
                            </span>
                        </div>
                        <p class="akm-key-description">
                            Powers visual reasoning - scene understanding, object detection, and image Q&A.
                        </p>
                        <div class="akm-input-group">
                            <input type="password" 
                                   id="akm-moondream-key" 
                                   placeholder="Enter your Moondream API key"
                                   value="${this.keys.moondream || ''}">
                            <button class="akm-toggle-visibility" onclick="window.apiKeyManager._toggleVisibility('akm-moondream-key')">
                                👁
                            </button>
                            <button class="akm-test-btn" id="akm-test-moondream" onclick="window.apiKeyManager._testMoondreamKey()">
                                Test
                            </button>
                        </div>
                        <a href="https://console.moondream.ai" target="_blank" class="akm-key-link">
                            Get your free key at console.moondream.ai →
                        </a>
                        <div id="akm-moondream-validation" class="akm-validation-msg"></div>
                    </div>

                    <div class="akm-key-section">
                        <div class="akm-key-header">
                            <h3>OpenAI API Key</h3>
                            <span class="akm-badge ${this.options.requireOpenAI ? 'required' : 'optional'}">
                                ${this.options.requireOpenAI ? 'Required' : 'Optional'}
                            </span>
                        </div>
                        <p class="akm-key-description">
                            Powers audio features - Whisper speech-to-text and GPT intent extraction.
                        </p>
                        <div class="akm-input-group">
                            <input type="password" 
                                   id="akm-openai-key" 
                                   placeholder="Enter your OpenAI API key (sk-...)"
                                   value="${this.keys.openai || ''}">
                            <button class="akm-toggle-visibility" onclick="window.apiKeyManager._toggleVisibility('akm-openai-key')">
                                👁
                            </button>
                        </div>
                        <a href="https://platform.openai.com/api-keys" target="_blank" class="akm-key-link">
                            Get your key at platform.openai.com →
                        </a>
                        <div id="akm-openai-validation" class="akm-validation-msg"></div>
                    </div>
                </div>
                <div class="akm-modal-footer">
                    <button class="akm-clear-btn" onclick="window.apiKeyManager._clearKeys()">
                        Clear All Keys
                    </button>
                    <button class="akm-save-btn" onclick="window.apiKeyManager._saveFromModal()">
                        Save Keys
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modalElement);

        // Close on overlay click
        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.hideModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalElement.classList.contains('visible')) {
                this.hideModal();
            }
        });
    }

    /**
     * Toggle password visibility
     */
    _toggleVisibility(inputId) {
        const input = document.getElementById(inputId);
        input.type = input.type === 'password' ? 'text' : 'password';
    }

    /**
     * Show the modal
     */
    showModal() {
        // Update input values
        document.getElementById('akm-moondream-key').value = this.keys.moondream || '';
        document.getElementById('akm-openai-key').value = this.keys.openai || '';
        
        // Clear validation messages
        document.getElementById('akm-moondream-validation').innerHTML = '';
        document.getElementById('akm-openai-validation').innerHTML = '';

        this.modalElement.classList.add('visible');
    }

    /**
     * Hide the modal
     */
    hideModal() {
        this.modalElement.classList.remove('visible');
    }

    /**
     * Validate a Moondream API key format
     */
    _validateMoondreamKey(key) {
        if (!key || key.trim() === '') return { valid: false, message: '' };
        if (key.length < 20) {
            return { valid: false, message: 'Key appears too short' };
        }
        return { valid: true, message: 'Key format looks valid' };
    }

    /**
     * Test Moondream API key with a real API call
     */
    async _testMoondreamKey() {
        const input = document.getElementById('akm-moondream-key');
        const validation = document.getElementById('akm-moondream-validation');
        const testBtn = document.getElementById('akm-test-moondream');
        const key = input.value.trim();

        if (!key) {
            validation.className = 'akm-validation-msg error';
            validation.innerHTML = '✗ Please enter an API key first';
            input.className = 'invalid';
            return;
        }

        testBtn.disabled = true;
        testBtn.classList.add('testing');
        testBtn.textContent = 'Testing...';
        validation.className = 'akm-validation-msg';
        validation.innerHTML = '⏳ Validating with Moondream API...';
        input.className = '';

        try {
            const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            
            const response = await fetch('https://api.moondream.ai/v1/caption', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Moondream-Auth': key
                },
                body: JSON.stringify({
                    image_url: testImage,
                    length: 'short',
                    stream: false
                })
            });

            if (response.ok) {
                validation.className = 'akm-validation-msg success';
                validation.innerHTML = '✓ API key verified successfully!';
                input.className = 'valid';
            } else if (response.status === 401) {
                validation.className = 'akm-validation-msg error';
                validation.innerHTML = '✗ Invalid API key. Please check and try again.';
                input.className = 'invalid';
            } else if (response.status === 429) {
                validation.className = 'akm-validation-msg success';
                validation.innerHTML = '✓ Key valid (rate limited - wait a moment)';
                input.className = 'valid';
            } else {
                validation.className = 'akm-validation-msg error';
                validation.innerHTML = `✗ API error (${response.status}). Try again.`;
                input.className = 'invalid';
            }
        } catch (error) {
            validation.className = 'akm-validation-msg error';
            validation.innerHTML = '✗ Network error. Check your connection.';
            input.className = 'invalid';
        } finally {
            testBtn.disabled = false;
            testBtn.classList.remove('testing');
            testBtn.textContent = 'Test';
        }
    }

    /**
     * Validate an OpenAI API key format
     */
    _validateOpenAIKey(key) {
        if (!key || key.trim() === '') return { valid: false, message: '' };
        // OpenAI keys start with sk-
        if (!key.startsWith('sk-')) {
            return { valid: false, message: 'OpenAI keys should start with "sk-"' };
        }
        if (key.length < 40) {
            return { valid: false, message: 'Key appears too short' };
        }
        return { valid: true, message: 'Key format looks valid' };
    }

    /**
     * Save keys from modal inputs
     */
    _saveFromModal() {
        const moondreamInput = document.getElementById('akm-moondream-key');
        const openaiInput = document.getElementById('akm-openai-key');
        const moondreamValidation = document.getElementById('akm-moondream-validation');
        const openaiValidation = document.getElementById('akm-openai-validation');

        const moondreamKey = moondreamInput.value.trim();
        const openaiKey = openaiInput.value.trim();

        // Validate Moondream
        const moondreamResult = this._validateMoondreamKey(moondreamKey);
        if (moondreamKey) {
            moondreamInput.className = moondreamResult.valid ? 'valid' : 'invalid';
            moondreamValidation.className = `akm-validation-msg ${moondreamResult.valid ? 'success' : 'error'}`;
            moondreamValidation.innerHTML = moondreamResult.valid ? 
                '✓ ' + moondreamResult.message : 
                '✗ ' + moondreamResult.message;
        }

        // Validate OpenAI
        const openaiResult = this._validateOpenAIKey(openaiKey);
        if (openaiKey) {
            openaiInput.className = openaiResult.valid ? 'valid' : 'invalid';
            openaiValidation.className = `akm-validation-msg ${openaiResult.valid ? 'success' : 'error'}`;
            openaiValidation.innerHTML = openaiResult.valid ? 
                '✓ ' + openaiResult.message : 
                '✗ ' + openaiResult.message;
        }

        // Check requirements
        if (this.options.requireMoondream && !moondreamKey) {
            moondreamInput.className = 'invalid';
            moondreamValidation.className = 'akm-validation-msg error';
            moondreamValidation.innerHTML = '✗ Moondream key is required for this tool';
            return;
        }

        if (this.options.requireOpenAI && !openaiKey) {
            openaiInput.className = 'invalid';
            openaiValidation.className = 'akm-validation-msg error';
            openaiValidation.innerHTML = '✗ OpenAI key is required for this tool';
            return;
        }

        // Save keys
        this.keys.moondream = moondreamKey || null;
        this.keys.openai = openaiKey || null;
        this._saveKeys();
        this._updateStatusBar();

        // Callback
        if (this.options.onKeysChanged) {
            this.options.onKeysChanged(this.keys);
        }

        // Show success and close
        setTimeout(() => this.hideModal(), 500);
    }

    /**
     * Clear all keys
     */
    _clearKeys() {
        if (confirm('Are you sure you want to clear all API keys?')) {
            this.keys.moondream = null;
            this.keys.openai = null;
            this._saveKeys();
            this._updateStatusBar();

            document.getElementById('akm-moondream-key').value = '';
            document.getElementById('akm-openai-key').value = '';
            document.getElementById('akm-moondream-validation').innerHTML = '';
            document.getElementById('akm-openai-validation').innerHTML = '';

            if (this.options.onKeysChanged) {
                this.options.onKeysChanged(this.keys);
            }
        }
    }

    /**
     * Get the Moondream API key
     */
    getMoondreamKey() {
        return this.keys.moondream;
    }

    /**
     * Get the OpenAI API key
     */
    getOpenAIKey() {
        return this.keys.openai;
    }

    /**
     * Check if Moondream key is set
     */
    hasMoondreamKey() {
        return !!this.keys.moondream;
    }

    /**
     * Check if OpenAI key is set
     */
    hasOpenAIKey() {
        return !!this.keys.openai;
    }

    /**
     * Set a key programmatically
     */
    setKey(type, key) {
        if (type === 'moondream') {
            this.keys.moondream = key || null;
        } else if (type === 'openai') {
            this.keys.openai = key || null;
        }
        this._saveKeys();
        this._updateStatusBar();

        if (this.options.onKeysChanged) {
            this.options.onKeysChanged(this.keys);
        }
    }
}

// Auto-initialize and expose globally
window.APIKeyManager = APIKeyManager;
