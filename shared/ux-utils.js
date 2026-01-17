(function() {
    'use strict';

    const UX_STYLES = `
        .vrp-loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s, visibility 0.2s;
        }

        .vrp-loading-overlay.visible {
            opacity: 1;
            visibility: visible;
        }

        .vrp-loading-content {
            text-align: center;
            color: #fff;
        }

        .vrp-spinner {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(147, 204, 234, 0.2);
            border-top-color: #93ccea;
            border-radius: 50%;
            animation: vrp-spin 0.8s linear infinite;
            margin: 0 auto 16px;
        }

        .vrp-spinner.small {
            width: 20px;
            height: 20px;
            border-width: 2px;
            margin: 0;
        }

        .vrp-spinner.inline {
            display: inline-block;
            vertical-align: middle;
            margin-right: 8px;
        }

        @keyframes vrp-spin {
            to { transform: rotate(360deg); }
        }

        .vrp-loading-text {
            font-size: 1rem;
            color: rgba(255, 255, 255, 0.9);
        }

        .vrp-toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            padding: 14px 20px;
            border-radius: 10px;
            color: #fff;
            font-size: 0.9rem;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10001;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s ease;
            max-width: 400px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        .vrp-toast.visible {
            transform: translateY(0);
            opacity: 1;
        }

        .vrp-toast.success {
            background: linear-gradient(135deg, #2a9d8f 0%, #238b7e 100%);
        }

        .vrp-toast.error {
            background: linear-gradient(135deg, #e63946 0%, #c1121f 100%);
        }

        .vrp-toast.warning {
            background: linear-gradient(135deg, #f4a261 0%, #e76f51 100%);
        }

        .vrp-toast.info {
            background: linear-gradient(135deg, #3066be 0%, #1d4e89 100%);
        }

        .vrp-toast-icon {
            font-size: 1.2rem;
        }

        .vrp-toast-close {
            background: none;
            border: none;
            color: rgba(255,255,255,0.7);
            cursor: pointer;
            padding: 0;
            margin-left: 8px;
            font-size: 1.2rem;
        }

        .vrp-toast-close:hover {
            color: #fff;
        }

        .vrp-btn-loading {
            position: relative;
            pointer-events: none;
        }

        .vrp-btn-loading .vrp-btn-text {
            visibility: hidden;
        }

        .vrp-btn-loading::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 18px;
            height: 18px;
            margin: -9px 0 0 -9px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: #fff;
            border-radius: 50%;
            animation: vrp-spin 0.8s linear infinite;
        }

        .vrp-getting-started-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10002;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s, visibility 0.3s;
        }

        .vrp-getting-started-overlay.visible {
            opacity: 1;
            visibility: visible;
        }

        .vrp-getting-started-modal {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 20px;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            transform: scale(0.9);
            transition: transform 0.3s;
            border: 1px solid rgba(147, 204, 234, 0.2);
        }

        .vrp-getting-started-overlay.visible .vrp-getting-started-modal {
            transform: scale(1);
        }

        .vrp-gs-header {
            padding: 30px 30px 20px;
            text-align: center;
            border-bottom: 1px solid rgba(147, 204, 234, 0.1);
        }

        .vrp-gs-header h2 {
            color: #93ccea;
            font-size: 1.8rem;
            margin: 0 0 8px 0;
        }

        .vrp-gs-header p {
            color: rgba(255,255,255,0.6);
            margin: 0;
            font-size: 1rem;
        }

        .vrp-gs-body {
            padding: 30px;
        }

        .vrp-gs-step {
            display: flex;
            gap: 16px;
            margin-bottom: 24px;
            align-items: flex-start;
        }

        .vrp-gs-step-number {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #3066be 0%, #93ccea 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            color: #fff;
            flex-shrink: 0;
        }

        .vrp-gs-step-content h3 {
            color: #fff;
            font-size: 1.1rem;
            margin: 0 0 6px 0;
        }

        .vrp-gs-step-content p {
            color: rgba(255,255,255,0.6);
            margin: 0;
            font-size: 0.9rem;
            line-height: 1.5;
        }

        .vrp-gs-step-content a {
            color: #93ccea;
            text-decoration: none;
        }

        .vrp-gs-step-content a:hover {
            text-decoration: underline;
        }

        .vrp-gs-equipment {
            background: rgba(147, 204, 234, 0.1);
            border: 1px solid rgba(147, 204, 234, 0.2);
            border-radius: 12px;
            padding: 20px;
            margin-top: 20px;
        }

        .vrp-gs-equipment h4 {
            color: #93ccea;
            margin: 0 0 12px 0;
            font-size: 0.95rem;
        }

        .vrp-gs-equipment-options {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .vrp-gs-equipment-btn {
            background: rgba(0,0,0,0.3);
            border: 1px solid rgba(147, 204, 234, 0.3);
            padding: 12px 18px;
            border-radius: 8px;
            color: #fff;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .vrp-gs-equipment-btn:hover {
            background: rgba(147, 204, 234, 0.15);
            border-color: rgba(147, 204, 234, 0.5);
        }

        .vrp-gs-equipment-btn.selected {
            background: rgba(147, 204, 234, 0.2);
            border-color: #93ccea;
        }

        .vrp-gs-footer {
            padding: 20px 30px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .vrp-gs-skip {
            background: none;
            border: none;
            color: rgba(255,255,255,0.5);
            cursor: pointer;
            font-size: 0.9rem;
        }

        .vrp-gs-skip:hover {
            color: rgba(255,255,255,0.8);
        }

        .vrp-gs-start-btn {
            background: linear-gradient(135deg, #3066be 0%, #93ccea 100%);
            border: none;
            color: #fff;
            padding: 14px 28px;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .vrp-gs-start-btn:hover {
            box-shadow: 0 4px 20px rgba(48, 102, 190, 0.4);
            transform: translateY(-2px);
        }
    `;

    function injectStyles() {
        if (document.getElementById('vrp-ux-styles')) return;
        const style = document.createElement('style');
        style.id = 'vrp-ux-styles';
        style.textContent = UX_STYLES;
        document.head.appendChild(style);
    }

    let loadingOverlay = null;
    let toastContainer = null;
    let activeToasts = [];

    function createLoadingOverlay() {
        if (loadingOverlay) return;
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'vrp-loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="vrp-loading-content">
                <div class="vrp-spinner"></div>
                <div class="vrp-loading-text">Loading...</div>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }

    const VRPUtils = {
        showLoading(message = 'Loading...') {
            createLoadingOverlay();
            loadingOverlay.querySelector('.vrp-loading-text').textContent = message;
            loadingOverlay.classList.add('visible');
        },

        hideLoading() {
            if (loadingOverlay) {
                loadingOverlay.classList.remove('visible');
            }
        },

        toast(message, type = 'info', duration = 4000) {
            const icons = {
                success: '✓',
                error: '✗',
                warning: '⚠',
                info: 'ℹ'
            };

            const toast = document.createElement('div');
            toast.className = `vrp-toast ${type}`;
            toast.innerHTML = `
                <span class="vrp-toast-icon">${icons[type] || icons.info}</span>
                <span>${message}</span>
                <button class="vrp-toast-close">&times;</button>
            `;

            document.body.appendChild(toast);
            
            const existingToasts = document.querySelectorAll('.vrp-toast.visible');
            const offset = existingToasts.length * 70;
            toast.style.bottom = `${24 + offset}px`;

            requestAnimationFrame(() => toast.classList.add('visible'));

            const close = () => {
                toast.classList.remove('visible');
                setTimeout(() => toast.remove(), 300);
            };

            toast.querySelector('.vrp-toast-close').onclick = close;
            if (duration > 0) {
                setTimeout(close, duration);
            }

            return { close };
        },

        success(message, duration) {
            return this.toast(message, 'success', duration);
        },

        error(message, duration) {
            return this.toast(message, 'error', duration);
        },

        warning(message, duration) {
            return this.toast(message, 'warning', duration);
        },

        info(message, duration) {
            return this.toast(message, 'info', duration);
        },

        setButtonLoading(button, loading = true) {
            if (loading) {
                button.classList.add('vrp-btn-loading');
                button.disabled = true;
                if (!button.querySelector('.vrp-btn-text')) {
                    button.innerHTML = `<span class="vrp-btn-text">${button.innerHTML}</span>`;
                }
            } else {
                button.classList.remove('vrp-btn-loading');
                button.disabled = false;
            }
        },

        createSpinner(size = 'normal') {
            const spinner = document.createElement('div');
            spinner.className = `vrp-spinner ${size}`;
            return spinner;
        },

        showGettingStarted(options = {}) {
            const {
                onComplete = () => {},
                onSkip = () => {},
                showEquipment = true
            } = options;

            const STORAGE_KEY = 'vrp_getting_started_completed';
            if (localStorage.getItem(STORAGE_KEY) && !options.force) {
                return;
            }

            const overlay = document.createElement('div');
            overlay.className = 'vrp-getting-started-overlay';
            overlay.innerHTML = `
                <div class="vrp-getting-started-modal">
                    <div class="vrp-gs-header">
                        <h2>👋 Welcome to the Playground!</h2>
                        <p>Let's get you set up in 60 seconds</p>
                    </div>
                    <div class="vrp-gs-body">
                        <div class="vrp-gs-step">
                            <div class="vrp-gs-step-number">1</div>
                            <div class="vrp-gs-step-content">
                                <h3>Get Your Free API Key</h3>
                                <p>Sign up at <a href="https://console.moondream.ai" target="_blank">console.moondream.ai</a> to get your Moondream API key. It's free to start!</p>
                            </div>
                        </div>
                        <div class="vrp-gs-step">
                            <div class="vrp-gs-step-number">2</div>
                            <div class="vrp-gs-step-content">
                                <h3>Enter Your Key</h3>
                                <p>Click "Manage API Keys" in any tool and paste your key. It's saved locally and shared across all tools.</p>
                            </div>
                        </div>
                        <div class="vrp-gs-step">
                            <div class="vrp-gs-step-number">3</div>
                            <div class="vrp-gs-step-content">
                                <h3>Allow Camera Access</h3>
                                <p>When prompted, allow camera access. Your video is processed locally and only sent to Moondream for AI analysis.</p>
                            </div>
                        </div>
                        ${showEquipment ? `
                        <div class="vrp-gs-equipment">
                            <h4>What equipment do you have?</h4>
                            <div class="vrp-gs-equipment-options">
                                <button class="vrp-gs-equipment-btn" data-equipment="webcam">
                                    📷 Webcam Only
                                </button>
                                <button class="vrp-gs-equipment-btn" data-equipment="ptz">
                                    🎥 PTZ Camera
                                </button>
                                <button class="vrp-gs-equipment-btn" data-equipment="obs">
                                    🖥️ OBS Studio
                                </button>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    <div class="vrp-gs-footer">
                        <button class="vrp-gs-skip">Skip for now</button>
                        <button class="vrp-gs-start-btn">Let's Go! →</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('visible'));

            const selectedEquipment = new Set();
            const equipmentBtns = overlay.querySelectorAll('.vrp-gs-equipment-btn');
            equipmentBtns.forEach(btn => {
                btn.onclick = () => {
                    btn.classList.toggle('selected');
                    const eq = btn.dataset.equipment;
                    if (selectedEquipment.has(eq)) {
                        selectedEquipment.delete(eq);
                    } else {
                        selectedEquipment.add(eq);
                    }
                };
            });

            const close = (completed = false) => {
                overlay.classList.remove('visible');
                setTimeout(() => overlay.remove(), 300);
                if (completed) {
                    localStorage.setItem(STORAGE_KEY, 'true');
                    localStorage.setItem('vrp_equipment', JSON.stringify([...selectedEquipment]));
                }
            };

            overlay.querySelector('.vrp-gs-skip').onclick = () => {
                close(false);
                onSkip();
            };

            overlay.querySelector('.vrp-gs-start-btn').onclick = () => {
                close(true);
                onComplete([...selectedEquipment]);
            };

            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    close(false);
                    onSkip();
                }
            };
        },

        getEquipment() {
            try {
                return JSON.parse(localStorage.getItem('vrp_equipment') || '[]');
            } catch {
                return [];
            }
        },

        hasEquipment(type) {
            return this.getEquipment().includes(type);
        },

        async validateMoondreamKey(apiKey) {
            if (!apiKey || apiKey.trim().length < 20) {
                return { valid: false, message: 'API key appears too short' };
            }

            try {
                const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
                
                const response = await fetch('https://api.moondream.ai/v1/caption', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Moondream-Auth': apiKey.trim()
                    },
                    body: JSON.stringify({
                        image_url: testImage,
                        length: 'short',
                        stream: false
                    })
                });

                if (response.ok) {
                    return { valid: true, message: 'API key verified successfully!' };
                } else if (response.status === 401) {
                    return { valid: false, message: 'Invalid API key. Please check and try again.' };
                } else if (response.status === 429) {
                    return { valid: true, message: 'Key valid but rate limited. Wait a moment.' };
                } else {
                    return { valid: false, message: `API error (${response.status})` };
                }
            } catch (error) {
                if (error.message.includes('fetch')) {
                    return { valid: false, message: 'Network error. Check your connection.' };
                }
                return { valid: false, message: error.message };
            }
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectStyles);
    } else {
        injectStyles();
    }

    window.VRPUtils = VRPUtils;
})();
