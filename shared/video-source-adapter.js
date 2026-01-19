(function() {
    'use strict';

    const SAMPLE_VIDEOS = {
        'scene-describer': '../assets/sample-videos/object-tracker-demo.mp4',
        'object-tracker': '../assets/sample-videos/object-tracker-demo.mp4',
        'detection-boxes': '../assets/sample-videos/scene-describer-demo.mp4',
        'gesture-detector': '../assets/sample-videos/gesture-detector-demo.mp4',
        'gesture-obs': '../assets/sample-videos/gesture-detector-demo.mp4',
        'ptz-controller': '../assets/sample-videos/ptz-controller-demo.mp4',
        'color-analyzer': '../assets/sample-videos/color-analyzer-demo.mp4',
        'motion-detector': '../assets/sample-videos/motion-detector-demo.mp4',
        'face-detector': '../assets/sample-videos/face-detector-demo.mp4',
        'text-reader': '../assets/sample-videos/text-reader-demo.mp4',
        'scoreboard-extractor': '../assets/sample-videos/scoreboard-demo.mp4',
        'zone-monitor': '../assets/sample-videos/motion-detector-demo.mp4',
        'smart-counter': '../assets/sample-videos/smart-counter-demo.mp4',
        'scene-analyzer': '../assets/sample-videos/scene-describer-demo.mp4',
        'framing-assistant': '../assets/sample-videos/ptz-controller-demo.mp4',
        'color-assistant': '../assets/sample-videos/color-analyzer-demo.mp4',
        'multimodal-studio': '../assets/sample-videos/scene-describer-demo.mp4',
        'multimodal-fusion': '../assets/sample-videos/scene-describer-demo.mp4',
        'PTZOptics-Moondream-Tracker': '../assets/sample-videos/ptz-controller-demo.mp4',
        'smart-photographer': '../assets/sample-videos/smart-photographer-demo.mp4'
    };

    const ADAPTER_STYLES = `
        .vrp-source-toggle {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: rgba(13, 27, 42, 0.9);
            border: 1px solid var(--surface-light, #2a3f54);
            border-radius: 8px;
            backdrop-filter: blur(4px);
        }

        .vrp-source-toggle label {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.85rem;
            cursor: pointer;
        }

        .vrp-source-switch {
            position: relative;
            width: 44px;
            height: 24px;
            background: #2a3f54;
            border-radius: 12px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .vrp-source-switch.active {
            background: #3066be;
        }

        .vrp-source-switch::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 20px;
            height: 20px;
            background: #fff;
            border-radius: 50%;
            transition: transform 0.2s;
        }

        .vrp-source-switch.active::after {
            transform: translateX(20px);
        }

        .vrp-source-label {
            min-width: 80px;
            font-size: 0.85rem;
            color: #93ccea;
            font-weight: 500;
        }

        .vrp-sample-badge {
            position: absolute;
            top: 10px;
            left: 10px;
            background: linear-gradient(135deg, #e63946 0%, #c1121f 100%);
            color: #fff;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            z-index: 10;
            display: none;
        }

        .vrp-sample-badge.visible {
            display: block;
        }
    `;

    function injectStyles() {
        if (document.getElementById('vrp-adapter-styles')) return;
        const style = document.createElement('style');
        style.id = 'vrp-adapter-styles';
        style.textContent = ADAPTER_STYLES;
        document.head.appendChild(style);
    }

    function getToolId() {
        const path = window.location.pathname;
        
        const match = path.match(/\/(\d+-[^/]+)\/?/);
        if (match) {
            return match[1].replace(/^\d+-/, '');
        }
        
        const folderMatch = path.match(/\/([^/]+)\/?$/);
        if (folderMatch && folderMatch[1] !== '') {
            return folderMatch[1].replace(/^\d+-/, '');
        }
        
        return null;
    }

    const VideoSourceAdapter = {
        videoElement: null,
        cameraStream: null,
        isUsingCamera: false,
        toolId: null,
        toggleContainer: null,
        badge: null,
        onSourceChange: null,

        init(options = {}) {
            this.videoElement = options.videoElement || document.getElementById('video');
            this.toolId = options.toolId || getToolId();
            this.onSourceChange = options.onSourceChange || null;

            if (!this.videoElement) {
                console.warn('VideoSourceAdapter: No video element found');
                return this;
            }

            if (!SAMPLE_VIDEOS[this.toolId]) {
                console.warn('VideoSourceAdapter: No sample video for tool:', this.toolId);
            }

            injectStyles();
            this.createToggle(options.insertAfter || options.insertInto);
            this.createBadge();

            return this;
        },

        createToggle(target) {
            this.toggleContainer = document.createElement('div');
            this.toggleContainer.className = 'vrp-source-toggle';
            this.toggleContainer.innerHTML = `
                <label>Source:</label>
                <div class="vrp-source-switch" id="vrpSourceSwitch"></div>
                <span class="vrp-source-label" id="vrpSourceLabel">Sample Video</span>
            `;

            const insertTarget = typeof target === 'string' 
                ? document.querySelector(target) 
                : target;

            if (insertTarget) {
                if (insertTarget.classList.contains('camera-controls')) {
                    insertTarget.prepend(this.toggleContainer);
                } else {
                    insertTarget.parentNode.insertBefore(
                        this.toggleContainer, 
                        insertTarget.nextSibling
                    );
                }
            } else {
                const cameraControls = document.querySelector('.camera-controls');
                if (cameraControls) {
                    cameraControls.prepend(this.toggleContainer);
                }
            }

            const switchEl = this.toggleContainer.querySelector('#vrpSourceSwitch');
            switchEl.addEventListener('click', () => this.toggle());
        },

        createBadge() {
            this.badge = document.createElement('div');
            this.badge.className = 'vrp-sample-badge';
            this.badge.textContent = 'Sample Video';
            
            const container = this.videoElement.parentElement;
            if (container) {
                container.style.position = 'relative';
                container.appendChild(this.badge);
            }
        },

        async toggle() {
            if (this.isUsingCamera) {
                await this.switchToSample();
            } else {
                await this.switchToCamera();
            }
        },

        async switchToCamera() {
            const switchEl = this.toggleContainer.querySelector('#vrpSourceSwitch');
            const labelEl = this.toggleContainer.querySelector('#vrpSourceLabel');

            try {
                this.videoElement.removeAttribute('crossOrigin');
                this.videoElement.src = '';
                
                if (this.cameraStream) {
                    this.videoElement.srcObject = this.cameraStream;
                } else {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: { width: 1280, height: 720 },
                        audio: false
                    });
                    this.cameraStream = stream;
                    this.videoElement.srcObject = stream;
                }

                this.videoElement.loop = false;
                this.videoElement.muted = true;
                await this.videoElement.play();

                this.isUsingCamera = true;
                switchEl.classList.add('active');
                labelEl.textContent = 'Live Camera';
                this.badge.classList.remove('visible');

                if (this.onSourceChange) {
                    this.onSourceChange('camera');
                }

            } catch (error) {
                console.error('Failed to switch to camera:', error);
                if (window.VRPUtils) {
                    VRPUtils.error('Camera access denied. Using sample video.');
                }
                await this.switchToSample();
            }
        },

        async switchToSample() {
            const switchEl = this.toggleContainer.querySelector('#vrpSourceSwitch');
            const labelEl = this.toggleContainer.querySelector('#vrpSourceLabel');
            const videoUrl = SAMPLE_VIDEOS[this.toolId];

            console.log('VideoSourceAdapter: toolId =', this.toolId, 'videoUrl =', videoUrl);

            if (!videoUrl) {
                console.error('No sample video for tool:', this.toolId);
                if (window.VRPUtils) {
                    VRPUtils.error('No sample video available for this tool.');
                }
                return;
            }

            if (this.videoElement.srcObject) {
                const tracks = this.videoElement.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                this.videoElement.srcObject = null;
            }
            if (this.cameraStream) {
                this.cameraStream.getTracks().forEach(track => track.stop());
                this.cameraStream = null;
            }

            this.videoElement.crossOrigin = 'anonymous';
            this.videoElement.loop = true;
            this.videoElement.muted = true;
            this.videoElement.playsInline = true;
            this.videoElement.src = videoUrl;
            this.videoElement.load();
            
            this.videoElement.onerror = (e) => {
                console.error('Video load error:', e, videoUrl);
            };
            
            this.videoElement.oncanplay = () => {
                console.log('VideoSourceAdapter: Video can play');
                this.videoElement.play().catch(e => {
                    console.warn('Auto-play blocked:', e);
                });
            };

            this.isUsingCamera = false;
            switchEl.classList.remove('active');
            labelEl.textContent = 'Sample Video';
            this.badge.classList.add('visible');

            if (this.onSourceChange) {
                this.onSourceChange('sample');
            }
        },

        isCamera() {
            return this.isUsingCamera;
        },

        isSample() {
            return !this.isUsingCamera;
        },

        getCurrentSource() {
            return this.isUsingCamera ? 'camera' : 'sample';
        },

        stopCamera() {
            if (this.cameraStream) {
                this.cameraStream.getTracks().forEach(track => track.stop());
                this.cameraStream = null;
            }
        },

        autoInit() {
            const video = document.getElementById('video');
            const cameraControls = document.querySelector('.camera-controls');
            
            if (!video) return false;
            
            this.init({
                videoElement: video,
                insertInto: cameraControls || video.parentElement
            });

            this.switchToSample().catch(() => {
                this.switchToCamera();
            });

            return true;
        }
    };

    window.VideoSourceAdapter = VideoSourceAdapter;

    function autoInitOnReady() {
        if (document.getElementById('video') && document.querySelector('.camera-controls, .video-container')) {
            VideoSourceAdapter.autoInit();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(autoInitOnReady, 500));
    } else {
        setTimeout(autoInitOnReady, 500);
    }
})();
