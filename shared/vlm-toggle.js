/**
 * VLM Toggle Component - Reusable VLM Engine Switcher
 * Part of the Visual Reasoning Playground
 * 
 * This module provides a reusable toggle to switch between Moondream
 * and OpenAI vision models across all playground tools.
 * 
 * Usage:
 *   // Include the script in your HTML:
 *   <script src="../shared/vlm-toggle.js"></script>
 *   
 *   // Initialize in your JS:
 *   window.vlmToggle = new VLMToggle({
 *       containerSelector: '.control-panel h2',  // Where to insert toggle
 *       onChange: (engine) => { ... },          // Callback when engine changes
 *       toolId: 'my-tool'                       // For localStorage key
 *   });
 * 
 * @see https://github.com/StreamGeeks/visual-reasoning-playground
 */

class VLMToggle {
    constructor(options = {}) {
        this.options = {
            containerSelector: '.control-panel h2',
            insertBefore: true,
            onChange: null,
            toolId: 'vlm-toggle',
            ...options
        };

        this.storageKey = `vrp_vlm_engine_${this.options.toolId}`;
        this.currentEngine = localStorage.getItem(this.storageKey) || 'moondream';
        
        this._injectStyles();
        this._createUI();
        this._bindEvents();
        
        // Initialize OpenAI client if key exists
        this._initClients();
    }

    /**
     * Inject component CSS
     * @private
     */
    _injectStyles() {
        if (document.getElementById('vlm-toggle-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'vlm-toggle-styles';
        styles.textContent = `
            /* VLM Toggle Component */
            .vlm-toggle {
                display: flex;
                gap: 4px;
                background: var(--background);
                border-radius: 6px;
                overflow: hidden;
                margin-bottom: 12px;
            }
            .vlm-toggle button {
                flex: 1;
                padding: 8px 6px;
                border: none;
                background: transparent;
                color: var(--text-muted);
                font-size: 0.75rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                text-align: center;
            }
            .vlm-toggle button.active {
                background: var(--primary);
                color: #fff;
            }
            .vlm-toggle button .vlm-sub {
                display: block;
                font-size: 0.6rem;
                font-weight: 400;
                opacity: 0.7;
                margin-top: 1px;
            }
            .vlm-toggle-info {
                font-size: 0.7rem;
                color: var(--text-muted);
                margin-top: 4px;
                padding: 6px;
                background: var(--background);
                border-radius: 4px;
            }
            .vlm-toggle-info.runby {
                font-size: 0.65rem;
                padding: 4px 6px;
                margin-top: 6px;
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Create the toggle UI
     * @private
     */
    _createUI() {
        // Check if already exists
        if (document.getElementById('vlmToggleContainer')) return;

        // Find insertion point
        const container = document.querySelector(this.options.containerSelector);
        if (!container) {
            console.warn('VLMToggle: Container not found:', this.options.containerSelector);
            return;
        }

        // Create toggle wrapper
        const wrapper = document.createElement('div');
        wrapper.id = 'vlmToggleContainer';
        wrapper.innerHTML = `
            <div class="vlm-toggle">
                <button id="vlmMoondreamBtn" class="${this.currentEngine === 'moondream' ? 'active' : ''}" data-engine="moondream">
                    Moondream<span class="vlm-sub">Free · Fast</span>
                </button>
                <button id="vlmOpenAIBtn" class="${this.currentEngine === 'openai' ? 'active' : ''}" data-engine="openai">
                    GPT-4o-mini<span class="vlm-sub">Better accuracy</span>
                </button>
            </div>
            <div id="vlmToggleInfo" class="vlm-toggle-info">
                ${this.currentEngine === 'openai' 
                    ? 'Using GPT-4o-mini (better accuracy, paid)' 
                    : 'Using Moondream API (free tier)'}
            </div>
        `;

        // Insert
        if (this.options.insertBefore) {
            container.parentNode.insertBefore(wrapper, container.nextSibling);
        } else {
            container.parentNode.insertBefore(wrapper, container);
        }
    }

    /**
     * Bind click events
     * @private
     */
    _bindEvents() {
        const moondreamBtn = document.getElementById('vlmMoondreamBtn');
        const openaiBtn = document.getElementById('vlmOpenAIBtn');

        if (moondreamBtn) {
            moondreamBtn.addEventListener('click', () => this._switchEngine('moondream'));
        }

        if (openaiBtn) {
            openaiBtn.addEventListener('click', () => this._switchEngine('openai'));
        }
    }

    /**
     * Initialize the VLM clients
     * @private
     */
    _initClients() {
        // Create clients if API keys are available
        if (window.apiKeyManager) {
            if (window.apiKeyManager.hasMoondreamKey() && !window.moondreamClient) {
                window.moondreamClient = new MoondreamClient(window.apiKeyManager.getMoondreamKey());
            }
            if (window.apiKeyManager.hasOpenAIKey() && !window.openaiClient) {
                window.openaiClient = new OpenAIVisionClient(window.apiKeyManager.getOpenAIKey());
            }
        }
    }

    /**
     * Switch VLM engine
     * @private
     */
    _switchEngine(engine) {
        if (engine === this.currentEngine) return;

        this.currentEngine = engine;
        localStorage.setItem(this.storageKey, engine);

        // Update UI
        const moondreamBtn = document.getElementById('vlmMoondreamBtn');
        const openaiBtn = document.getElementById('vlmOpenAIBtn');
        const info = document.getElementById('vlmToggleInfo');

        if (moondreamBtn) moondreamBtn.classList.toggle('active', engine === 'moondream');
        if (openaiBtn) openaiBtn.classList.toggle('active', engine === 'openai');
        if (info) {
            info.textContent = engine === 'openai'
                ? 'Using GPT-4o-mini (better accuracy, paid)'
                : 'Using Moondream API (free tier)';
        }

        // Initialize clients if needed
        this._initClients();

        // Check for appropriate API key
        if (engine === 'openai') {
            if (!window.apiKeyManager?.hasOpenAIKey()) {
                window.apiKeyManager?.showModal();
            }
        } else {
            if (!window.apiKeyManager?.hasMoondreamKey()) {
                window.apiKeyManager?.showModal();
            }
        }

        // Callback
        if (this.options.onChange) {
            this.options.onChange(engine);
        }

        // Log to console
        if (window.reasoningConsole) {
            window.reasoningConsole.logInfo(`Switched to ${engine === 'openai' ? 'OpenAI GPT-4o-mini' : 'Moondream'} VLM`);
        }
    }

    /**
     * Get the current VLM engine
     * @returns {string} 'moondream' or 'openai'
     */
    getEngine() {
        return this.currentEngine;
    }

    /**
     * Check if using OpenAI
     * @returns {boolean}
     */
    isOpenAI() {
        return this.currentEngine === 'openai';
    }

    /**
     * Check if using Moondream
     * @returns {boolean}
     */
    isMoondream() {
        return this.currentEngine === 'moondream';
    }

    /**
     * Get the appropriate client based on current engine
     * @returns {MoondreamClient|OpenAIVisionClient|null}
     */
    getClient() {
        if (this.currentEngine === 'openai') {
            // Ensure client exists
            if (!window.openaiClient && window.apiKeyManager?.hasOpenAIKey()) {
                window.openaiClient = new OpenAIVisionClient(window.apiKeyManager.getOpenAIKey());
            }
            return window.openaiClient;
        } else {
            // Ensure client exists
            if (!window.moondreamClient && window.apiKeyManager?.hasMoondreamKey()) {
                window.moondreamClient = new MoondreamClient(window.apiKeyManager.getMoondreamKey());
            }
            return window.moondreamClient;
        }
    }

    /**
     * Auto-setup: make client available globally for backward compatibility
     * This allows existing tools to work without code changes
     */
    autoSetupGlobalClient() {
        const updateClient = () => {
            const client = this.getClient();
            if (client) {
                window.client = client;
                window.dispatchEvent(new CustomEvent('vlmClientReady', { detail: { client, engine: this.currentEngine } }));
            }
        };
        
        updateClient();
        
        const originalOnChange = this.options.onChange;
        this.options.onChange = (engine) => {
            updateClient();
            if (originalOnChange) originalOnChange(engine);
        };
    }

    /**
     * Convenience: check if client is available
     * @returns {boolean}
     */
    hasClient() {
        return this.getClient() !== null && this.getClient() !== undefined;
    }

    /**
     * Ensure appropriate client is available, show modal if not
     * @returns {boolean} true if client is available
     */
    ensureClient() {
        if (!this.hasClient()) {
            if (this.currentEngine === 'openai') {
                if (!window.apiKeyManager?.hasOpenAIKey()) {
                    window.apiKeyManager?.showModal();
                }
            } else {
                if (!window.apiKeyManager?.hasMoondreamKey()) {
                    window.apiKeyManager?.showModal();
                }
            }
            return false;
        }
        return true;
    }
}

// Also expose globally for convenience
window.VLMToggle = VLMToggle;
