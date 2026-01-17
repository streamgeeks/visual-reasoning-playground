/**
 * Visual Reasoning Playground - Shared Navigation Header
 * Auto-injects a navigation header into any tool page
 * Usage: <script src="../shared/playground-header.js"></script>
 */

(function() {
    'use strict';

    const TOOLS = [
        { id: 'home', name: 'Home', path: '/', icon: '🏠' },
        { id: 'divider-1', divider: true, label: 'Core Tools' },
        { id: '01-scene-describer', name: 'Scene Describer', path: '/01-scene-describer/', icon: '👁️' },
        { id: '02-detection-boxes', name: 'Detection Boxes', path: '/02-detection-boxes/', icon: '📦' },
        { id: 'PTZOptics-Moondream-Tracker', name: 'PTZ Auto-Tracker', path: '/PTZOptics-Moondream-Tracker/', icon: '🎯', featured: true },
        { id: '04-smart-counter', name: 'Smart Counter', path: '/04-smart-counter/', icon: '🔢' },
        { id: '05-scene-analyzer', name: 'Scene Analyzer', path: '/05-scene-analyzer/', icon: '🔍' },
        { id: '06-zone-monitor', name: 'Zone Monitor', path: '/06-zone-monitor/', icon: '🚧' },
        { id: '07-color-assistant', name: 'Color Assistant', path: '/07-color-assistant/', icon: '🎨' },
        { id: '08-multimodal-fusion', name: 'Multimodal Fusion', path: '/08-multimodal-fusion/', icon: '🔊' },
        { id: 'divider-2', divider: true, label: 'Advanced Tools' },
        { id: '03-gesture-obs', name: 'Gesture OBS Control', path: '/03-gesture-obs/', icon: '✋' },
        { id: '04-scoreboard-extractor', name: 'Scoreboard Extractor', path: '/04-scoreboard-extractor/', icon: '🏆' },
        { id: '05-framing-assistant', name: 'Framing Assistant', path: '/05-framing-assistant/', icon: '🖼️' },
        { id: '05-color-assistant', name: 'PTZ Color Control', path: '/05-color-assistant/', icon: '🎛️' },
        { id: '07-multimodal-studio', name: 'Multimodal Studio', path: '/07-multimodal-studio/', icon: '🎬' },
    ];

    function isEmbedMode() {
        return new URLSearchParams(window.location.search).get('embed') === 'true';
    }

    function getCurrentTool() {
        const path = window.location.pathname;
        for (const tool of TOOLS) {
            if (tool.divider) continue;
            if (tool.id === 'home' && (path === '/' || path.endsWith('/index.html') || path === '')) continue;
            if (path.includes(tool.id)) return tool.id;
        }
        if (path === '/' || path.endsWith('/index.html') || path.endsWith('/code-examples/')) return 'home';
        return null;
    }

    function getBasePath() {
        const path = window.location.pathname;
        const pathParts = path.split('/').filter(Boolean);
        
        if (pathParts.length === 0) {
            return './';
        }
        
        const lastPart = pathParts[pathParts.length - 1];
        const secondLastPart = pathParts[pathParts.length - 2] || '';
        
        if (lastPart === 'index.html') {
            if (secondLastPart.match(/^\d{2}-/) || secondLastPart === 'PTZOptics-Moondream-Tracker') {
                return '../';
            }
            return './';
        }
        
        if (lastPart.match(/^\d{2}-/) || lastPart === 'PTZOptics-Moondream-Tracker') {
            return '../';
        }
        
        return './';
    }

    function injectStyles() {
        const isEmbed = isEmbedMode();
        const styles = document.createElement('style');
        styles.textContent = `
            .vr-header {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: ${isEmbed ? '44px' : '52px'};
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-bottom: 1px solid rgba(147, 204, 234, 0.2);
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 20px;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            }

            .vr-header-title {
                display: flex;
                align-items: center;
                gap: 12px;
                text-decoration: none;
            }

            .vr-header-logo {
                font-size: ${isEmbed ? '14px' : '16px'};
                font-weight: 700;
                color: #93ccea;
                letter-spacing: 1px;
                white-space: nowrap;
            }

            .vr-header-current {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.6);
                padding-left: 12px;
                border-left: 1px solid rgba(255, 255, 255, 0.2);
            }

            .vr-header-nav {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .vr-header-home {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                background: rgba(147, 204, 234, 0.1);
                border: 1px solid rgba(147, 204, 234, 0.2);
                border-radius: 8px;
                color: #93ccea;
                text-decoration: none;
                font-size: 18px;
                transition: all 0.2s;
            }

            .vr-header-home:hover {
                background: rgba(147, 204, 234, 0.2);
                border-color: rgba(147, 204, 234, 0.4);
            }

            .vr-header-dropdown {
                position: relative;
            }

            .vr-header-dropdown-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 14px;
                background: rgba(147, 204, 234, 0.1);
                border: 1px solid rgba(147, 204, 234, 0.2);
                border-radius: 8px;
                color: #e0e0e0;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .vr-header-dropdown-btn:hover {
                background: rgba(147, 204, 234, 0.2);
                border-color: rgba(147, 204, 234, 0.4);
            }

            .vr-header-dropdown-btn svg {
                width: 12px;
                height: 12px;
                transition: transform 0.2s;
            }

            .vr-header-dropdown.open .vr-header-dropdown-btn svg {
                transform: rotate(180deg);
            }

            .vr-header-dropdown-menu {
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                min-width: 240px;
                background: #1a1a2e;
                border: 1px solid rgba(147, 204, 234, 0.2);
                border-radius: 12px;
                padding: 8px;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.2s;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
                max-height: 70vh;
                overflow-y: auto;
            }

            .vr-header-dropdown.open .vr-header-dropdown-menu {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }

            .vr-header-menu-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 12px;
                color: #e0e0e0;
                text-decoration: none;
                border-radius: 8px;
                font-size: 13px;
                transition: all 0.15s;
            }

            .vr-header-menu-item:hover {
                background: rgba(147, 204, 234, 0.15);
                color: #fff;
            }

            .vr-header-menu-item.active {
                background: rgba(147, 204, 234, 0.2);
                color: #93ccea;
            }

            .vr-header-menu-item.featured {
                background: linear-gradient(135deg, rgba(147, 204, 234, 0.15) 0%, rgba(48, 102, 190, 0.15) 100%);
                border: 1px solid rgba(147, 204, 234, 0.3);
            }

            .vr-header-menu-item.featured:hover {
                background: linear-gradient(135deg, rgba(147, 204, 234, 0.25) 0%, rgba(48, 102, 190, 0.25) 100%);
            }

            .vr-header-menu-icon {
                font-size: 16px;
                width: 24px;
                text-align: center;
            }

            .vr-header-menu-divider {
                padding: 8px 12px 4px;
                font-size: 10px;
                font-weight: 600;
                color: rgba(147, 204, 234, 0.6);
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .vr-header-spacer {
                height: ${isEmbed ? '44px' : '52px'};
            }

            ${isEmbed ? `
                .vr-header-external {
                    display: none !important;
                }
            ` : ''}

            @media (max-width: 600px) {
                .vr-header {
                    padding: 0 12px;
                }
                .vr-header-logo {
                    font-size: 12px;
                    letter-spacing: 0.5px;
                }
                .vr-header-current {
                    display: none;
                }
                .vr-header-dropdown-btn span {
                    display: none;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    function createHeader() {
        const currentToolId = getCurrentTool();
        const currentTool = TOOLS.find(t => t.id === currentToolId);
        const basePath = getBasePath();
        const isEmbed = isEmbedMode();

        if (isEmbed) {
            document.body.setAttribute('data-embed', 'true');
        }

        const header = document.createElement('header');
        header.className = 'vr-header';
        header.innerHTML = `
            <a href="${basePath}index.html${isEmbed ? '?embed=true' : ''}" class="vr-header-title">
                <span class="vr-header-logo">VISUAL REASONING PLAYGROUND</span>
                ${currentTool && currentTool.id !== 'home' ? `<span class="vr-header-current">${currentTool.icon} ${currentTool.name}</span>` : ''}
            </a>
            <nav class="vr-header-nav">
                <a href="${basePath}index.html${isEmbed ? '?embed=true' : ''}" class="vr-header-home" title="Back to Launcher">🏠</a>
                <div class="vr-header-dropdown">
                    <button class="vr-header-dropdown-btn">
                        <span>Switch Tool</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 9l6 6 6-6"/>
                        </svg>
                    </button>
                    <div class="vr-header-dropdown-menu">
                        ${TOOLS.map(tool => {
                            if (tool.divider) {
                                return `<div class="vr-header-menu-divider">${tool.label}</div>`;
                            }
                            const isActive = tool.id === currentToolId;
                            const href = tool.id === 'home' 
                                ? `${basePath}index.html${isEmbed ? '?embed=true' : ''}`
                                : `${basePath}${tool.id}/index.html${isEmbed ? '?embed=true' : ''}`;
                            return `
                                <a href="${href}" class="vr-header-menu-item ${isActive ? 'active' : ''} ${tool.featured ? 'featured' : ''}">
                                    <span class="vr-header-menu-icon">${tool.icon}</span>
                                    ${tool.name}
                                </a>
                            `;
                        }).join('')}
                    </div>
                </div>
            </nav>
        `;

        const spacer = document.createElement('div');
        spacer.className = 'vr-header-spacer';

        document.body.insertBefore(spacer, document.body.firstChild);
        document.body.insertBefore(header, document.body.firstChild);

        // Dropdown toggle
        const dropdown = header.querySelector('.vr-header-dropdown');
        const dropdownBtn = header.querySelector('.vr-header-dropdown-btn');
        
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });

        document.addEventListener('click', () => {
            dropdown.classList.remove('open');
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dropdown.classList.remove('open');
            }
        });
    }

    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                injectStyles();
                createHeader();
            });
        } else {
            injectStyles();
            createHeader();
        }
    }

    init();
})();
