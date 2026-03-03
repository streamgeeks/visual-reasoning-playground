/**
 * VLM Result Badge - Shows which AI engine produced results
 * Part of the Visual Reasoning Playground
 * 
 * Displays a small, non-intrusive badge (e.g., "via Moondream" or "via GPT-4o-mini")
 * near results to help users understand which engine they're using.
 * 
 * Usage:
 *   // Include in HTML:
 *   <script src="../shared/vlm-result-badge.js"></script>
 * 
 *   // Show badge after getting results:
 *   VLMResultBadge.show('moondream', elapsed);
 *   VLMResultBadge.show('openai', elapsed);
 * 
 *   // Or auto-detect from vlmToggle:
 *   VLMResultBadge.showCurrent(elapsed);
 * 
 *   // Attach to a specific container:
 *   VLMResultBadge.showInContainer(containerEl, 'moondream', elapsed);
 */

const VLMResultBadge = (() => {
    let stylesInjected = false;

    const ENGINE_LABELS = {
        moondream: { name: 'Moondream', icon: '🌙', cssClass: 'vlm-badge-moondream' },
        openai:    { name: 'GPT-4o-mini', icon: '⚡', cssClass: 'vlm-badge-openai' }
    };

    function _injectStyles() {
        if (stylesInjected) return;
        stylesInjected = true;

        const style = document.createElement('style');
        style.id = 'vlm-result-badge-styles';
        style.textContent = `
            .vlm-result-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 0.7rem;
                font-weight: 600;
                letter-spacing: 0.02em;
                line-height: 1;
                white-space: nowrap;
                vertical-align: middle;
            }
            .vlm-badge-moondream {
                background: rgba(42, 157, 143, 0.15);
                color: #2A9D8F;
                border: 1px solid rgba(42, 157, 143, 0.3);
            }
            .vlm-badge-openai {
                background: rgba(147, 51, 234, 0.15);
                color: #a78bfa;
                border: 1px solid rgba(147, 51, 234, 0.3);
            }
            .vlm-result-badge .vlm-badge-time {
                opacity: 0.7;
                font-weight: 400;
            }
            /* Floating badge anchored to status bar */
            #vlmFloatingBadge {
                position: fixed;
                bottom: 12px;
                right: 12px;
                z-index: 9999;
                transition: opacity 0.3s, transform 0.3s;
                opacity: 0;
                transform: translateY(8px);
                pointer-events: none;
            }
            #vlmFloatingBadge.visible {
                opacity: 1;
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);
    }

    function _getEngineInfo(engine) {
        return ENGINE_LABELS[engine] || ENGINE_LABELS.moondream;
    }

    function _getCurrentEngine() {
        if (window.vlmToggle) return window.vlmToggle.getEngine();
        return 'moondream';
    }

    /**
     * Create a badge HTML element
     */
    function createBadge(engine, elapsedMs) {
        _injectStyles();
        const info = _getEngineInfo(engine);
        const badge = document.createElement('span');
        badge.className = `vlm-result-badge ${info.cssClass}`;
        
        let html = `${info.icon} via ${info.name}`;
        if (elapsedMs !== undefined && elapsedMs !== null) {
            html += ` <span class="vlm-badge-time">${elapsedMs}ms</span>`;
        }
        badge.innerHTML = html;
        return badge;
    }

    /**
     * Create badge as HTML string (for innerHTML insertion)
     */
    function createBadgeHTML(engine, elapsedMs) {
        _injectStyles();
        const info = _getEngineInfo(engine);
        let html = `<span class="vlm-result-badge ${info.cssClass}">${info.icon} via ${info.name}`;
        if (elapsedMs !== undefined && elapsedMs !== null) {
            html += ` <span class="vlm-badge-time">${elapsedMs}ms</span>`;
        }
        html += `</span>`;
        return html;
    }

    /**
     * Show the floating badge (bottom-right corner)
     */
    function show(engine, elapsedMs) {
        _injectStyles();
        let floating = document.getElementById('vlmFloatingBadge');
        if (!floating) {
            floating = document.createElement('div');
            floating.id = 'vlmFloatingBadge';
            document.body.appendChild(floating);
        }

        const info = _getEngineInfo(engine);
        let html = `<span class="vlm-result-badge ${info.cssClass}">${info.icon} via ${info.name}`;
        if (elapsedMs !== undefined && elapsedMs !== null) {
            html += ` <span class="vlm-badge-time">${elapsedMs}ms</span>`;
        }
        html += `</span>`;

        floating.innerHTML = html;
        floating.classList.add('visible');

        // Auto-hide after 4 seconds
        clearTimeout(floating._hideTimer);
        floating._hideTimer = setTimeout(() => {
            floating.classList.remove('visible');
        }, 4000);
    }

    /**
     * Show badge using current vlmToggle engine
     */
    function showCurrent(elapsedMs) {
        show(_getCurrentEngine(), elapsedMs);
    }

    /**
     * Insert badge into a specific container element
     */
    function showInContainer(container, engine, elapsedMs) {
        if (!container) return;
        _injectStyles();

        // Remove any existing badge in this container
        const existing = container.querySelector('.vlm-result-badge');
        if (existing) existing.remove();

        const badge = createBadge(engine || _getCurrentEngine(), elapsedMs);
        container.appendChild(badge);
    }

    /**
     * Insert badge as HTML string into a container (by selector)
     */
    function showInSelector(selector, engine, elapsedMs) {
        const el = document.querySelector(selector);
        if (el) showInContainer(el, engine, elapsedMs);
    }

    return {
        show,
        showCurrent,
        showInContainer,
        showInSelector,
        createBadge,
        createBadgeHTML
    };
})();

// Also expose globally
window.VLMResultBadge = VLMResultBadge;
