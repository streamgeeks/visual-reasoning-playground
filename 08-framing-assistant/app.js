/**
 * PTZ Framing Assistant
 * Auto-frames subjects using Moondream detection + PTZOptics camera control
 * 
 * Part of the Visual Reasoning Playground
 * @see Book: "Visual Reasoning AI for Broadcast and ProAV" by Paul Richards
 */

document.addEventListener('DOMContentLoaded', async function() {
    // DOM Elements
    const video = document.getElementById('video');
    const overlay = document.getElementById('overlay');
    const ctx = overlay.getContext('2d');
    const cameraSelect = document.getElementById('cameraSelect');
    const cameraIPInput = document.getElementById('cameraIP');
    const testConnectionBtn = document.getElementById('testConnectionBtn');
    const connectionStatus = document.getElementById('connectionStatus');
    const useAuthCheckbox = document.getElementById('useAuth');
    const authFields = document.getElementById('authFields');
    const authUsernameInput = document.getElementById('authUsername');
    const authPasswordInput = document.getElementById('authPassword');
    const targetObjectInput = document.getElementById('targetObject');
    const deadzoneSlider = document.getElementById('deadzoneSlider');
    const deadzoneValueSpan = document.getElementById('deadzoneValue');
    const autoFrameBtn = document.getElementById('autoFrameBtn');
    const stopBtn = document.getElementById('stopBtn');
    const framingIndicator = document.getElementById('framingIndicator');
    const framingStatusText = document.getElementById('framingStatusText');
    const statusBar = document.getElementById('status');
    const detectCountSpan = document.getElementById('detectCount');
    const moveCountSpan = document.getElementById('moveCount');

    // State
    let client = null;
    let ptzController = null;
    let isAutoFraming = false;
    let frameLoopId = null;
    let detectCount = 0;
    let moveCount = 0;
    let currentZoomPreset = 'wide';
    let deadzone = 0.12;
    let moveDuration = 350;

    // Zoom preset values (PTZOptics absolute zoom positions 0-16384)
    const ZOOM_PRESETS = {
        wide: 0,
        medium: 4000,
        tight: 10000
    };

    // Initialize API Key Manager
    window.apiKeyManager = new APIKeyManager({
        requireMoondream: true,
        requireOpenAI: false,
        onKeysChanged: (keys) => {
            if (keys.moondream) {
                client = new MoondreamClient(keys.moondream);
                window.reasoningConsole.logInfo('Moondream API key configured');
            }
        }
    });

    // Initialize Reasoning Console
    window.reasoningConsole = new ReasoningConsole({ startCollapsed: false });

    // Load saved API key
    if (window.apiKeyManager.hasMoondreamKey()) {
        client = new MoondreamClient(window.apiKeyManager.getMoondreamKey());
        window.reasoningConsole.logInfo('Loaded saved Moondream API key');
    }

    // Load saved camera IP
    const savedCameraIP = localStorage.getItem('ptz_camera_ip');
    if (savedCameraIP) {
        cameraIPInput.value = savedCameraIP;
    }

    // Load saved target object
    const savedTarget = localStorage.getItem('ptz_target_object');
    if (savedTarget) {
        targetObjectInput.value = savedTarget;
    }

    // Load saved deadzone
    const savedDeadzone = localStorage.getItem('ptz_deadzone');
    if (savedDeadzone) {
        deadzone = parseFloat(savedDeadzone);
    }
    deadzoneSlider.value = Math.round(deadzone * 100);
    deadzoneValueSpan.textContent = Math.round(deadzone * 100);

    // Load saved auth settings
    const savedUseAuth = localStorage.getItem('ptz_use_auth') === 'true';
    const savedUsername = localStorage.getItem('ptz_auth_username') || '';
    const savedPassword = localStorage.getItem('ptz_auth_password') || '';
    
    useAuthCheckbox.checked = savedUseAuth;
    authFields.style.display = savedUseAuth ? 'block' : 'none';
    authUsernameInput.value = savedUsername;
    authPasswordInput.value = savedPassword;

    // Toggle auth fields visibility
    useAuthCheckbox.addEventListener('change', () => {
        authFields.style.display = useAuthCheckbox.checked ? 'block' : 'none';
        localStorage.setItem('ptz_use_auth', useAuthCheckbox.checked);
    });

    // ==================== Camera Functions ====================

    async function enumerateCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            
            cameraSelect.innerHTML = '';
            
            if (videoDevices.length === 0) {
                cameraSelect.innerHTML = '<option value="">No cameras found</option>';
                return;
            }

            videoDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Camera ${index + 1}`;
                cameraSelect.appendChild(option);
            });

            // Load saved camera preference
            const savedCamera = localStorage.getItem('preferred_camera');
            if (savedCamera) {
                cameraSelect.value = savedCamera;
            }
        } catch (error) {
            window.reasoningConsole.logError('Failed to enumerate cameras: ' + error.message);
        }
    }

    async function startCamera(deviceId = null) {
        try {
            window.reasoningConsole.logInfo('Starting camera...');
            
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            if (deviceId) {
                constraints.video.deviceId = { exact: deviceId };
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            
            // Wait for video to be ready
            await new Promise(resolve => {
                video.onloadedmetadata = resolve;
            });

            // Set overlay size
            overlay.width = video.videoWidth;
            overlay.height = video.videoHeight;
            
            drawDeadzone();

            updateStatus('Camera ready');
            window.reasoningConsole.logInfo(`Camera started: ${video.videoWidth}x${video.videoHeight}`);

            // Re-enumerate to get labels
            await enumerateCameras();

        } catch (error) {
            updateStatus('Camera error: ' + error.message, true);
            window.reasoningConsole.logError('Camera failed: ' + error.message);
        }
    }

    // ==================== PTZ Functions ====================

    async function testPTZConnection() {
        const ip = cameraIPInput.value.trim();
        if (!ip) {
            updateStatus('Please enter camera IP', true);
            return;
        }

        localStorage.setItem('ptz_camera_ip', ip);
        
        const useAuth = useAuthCheckbox.checked;
        const username = authUsernameInput.value.trim();
        const password = authPasswordInput.value;
        
        localStorage.setItem('ptz_use_auth', useAuth);
        localStorage.setItem('ptz_auth_username', username);
        localStorage.setItem('ptz_auth_password', password);
        
        ptzController = new PTZController(ip, {
            useAuth: useAuth,
            username: username,
            password: password
        });

        testConnectionBtn.disabled = true;
        connectionStatus.textContent = 'Testing...';
        connectionStatus.className = '';

        try {
            await ptzController.stop();
            
            connectionStatus.textContent = useAuth ? 'Connected (with auth)' : 'Connected';
            connectionStatus.className = 'connected';
            updateStatus('PTZ camera connected');
            window.reasoningConsole.logInfo(`PTZ connected at ${ip}${useAuth ? ' with authentication' : ''}`);
        } catch (error) {
            connectionStatus.textContent = 'Connection failed';
            connectionStatus.className = 'disconnected';
            updateStatus('PTZ connection failed - check IP and authentication', true);
            window.reasoningConsole.logError('PTZ connection failed: ' + error.message);
        } finally {
            testConnectionBtn.disabled = false;
        }
    }

    async function handleManualPTZ(command) {
        if (!ptzController) {
            updateStatus('Connect to PTZ camera first', true);
            return;
        }

        try {
            switch (command) {
                case 'up':
                    await ptzController.tiltUp();
                    await delay(200);
                    await ptzController.stop();
                    break;
                case 'down':
                    await ptzController.tiltDown();
                    await delay(200);
                    await ptzController.stop();
                    break;
                case 'left':
                    await ptzController.panLeft();
                    await delay(200);
                    await ptzController.stop();
                    break;
                case 'right':
                    await ptzController.panRight();
                    await delay(200);
                    await ptzController.stop();
                    break;
                case 'stop':
                    await ptzController.stop();
                    break;
                case 'zoomin':
                    await ptzController.zoomIn();
                    await delay(300);
                    await ptzController.zoomStop();
                    break;
                case 'zoomout':
                    await ptzController.zoomOut();
                    await delay(300);
                    await ptzController.zoomStop();
                    break;
            }
            moveCount++;
            moveCountSpan.textContent = moveCount;
        } catch (error) {
            window.reasoningConsole.logError('PTZ command failed: ' + error.message);
        }
    }

    // ==================== Auto-Framing ====================

    async function startAutoFraming() {
        // Validate requirements
        if (!client) {
            updateStatus('Configure Moondream API key first', true);
            window.apiKeyManager.showModal();
            return;
        }

        if (!ptzController) {
            updateStatus('Connect to PTZ camera first', true);
            return;
        }

        const target = targetObjectInput.value.trim();
        if (!target) {
            updateStatus('Enter a target object to track', true);
            return;
        }

        localStorage.setItem('ptz_target_object', target);

        isAutoFraming = true;
        autoFrameBtn.disabled = true;
        stopBtn.disabled = false;
        framingIndicator.classList.add('active');
        framingStatusText.textContent = 'Auto-framing active';
        updateStatus(`Tracking: ${target}`);
        window.reasoningConsole.logAction('Auto-frame started', `Target: ${target}`);

        // Set initial zoom
        try {
            await ptzController.setZoomPosition(ZOOM_PRESETS[currentZoomPreset]);
            window.reasoningConsole.logInfo(`Zoom set to ${currentZoomPreset}`);
        } catch (e) {
            window.reasoningConsole.logError('Failed to set zoom: ' + e.message);
        }

        // Start the framing loop
        frameLoop(target);
    }

    async function stopAutoFraming() {
        isAutoFraming = false;
        autoFrameBtn.disabled = false;
        stopBtn.disabled = true;
        framingIndicator.classList.remove('active');
        framingStatusText.textContent = 'Stopped';
        updateStatus('Auto-framing stopped');
        window.reasoningConsole.logAction('Auto-frame stopped');

        if (ptzController) {
            await ptzController.stop();
        }

        clearOverlay();
    }

    async function frameLoop(target) {
        if (!isAutoFraming) return;

        try {
            // Capture frame and detect
            const startTime = Date.now();
            const imageData = client.captureFrame(video);
            const result = await client.detect(imageData, target);
            const elapsed = Date.now() - startTime;

            detectCount++;
            detectCountSpan.textContent = detectCount;
            window.reasoningConsole.logApiCall('/detect', elapsed);

            // Clear previous overlay
            clearOverlay();

            if (result.objects && result.objects.length > 0) {
                // Take the first (or largest) detection
                const obj = result.objects[0];
                
                // Draw detection box
                drawDetectionBox(obj, target);

                // Calculate center offset
                const objectCenterX = obj.x;
                const objectCenterY = obj.y;
                const frameCenterX = 0.5;
                const frameCenterY = 0.5;

                const offsetX = objectCenterX - frameCenterX;
                const offsetY = objectCenterY - frameCenterY;

                framingStatusText.textContent = `Found at (${(objectCenterX * 100).toFixed(0)}%, ${(objectCenterY * 100).toFixed(0)}%)`;

                if (Math.abs(offsetX) > deadzone || Math.abs(offsetY) > deadzone) {
                    await adjustCamera(offsetX, offsetY);
                } else {
                    framingStatusText.textContent = 'Centered';
                    window.reasoningConsole.logDecision('Object centered', 'No movement needed');
                }
            } else {
                framingStatusText.textContent = `Searching for ${target}...`;
                window.reasoningConsole.logInfo(`No ${target} detected in frame`);
            }

        } catch (error) {
            window.reasoningConsole.logError('Detection error: ' + error.message);
            updateStatus('Detection error: ' + error.message, true);
        }

        // Continue loop with delay
        if (isAutoFraming) {
            frameLoopId = setTimeout(() => frameLoop(target), 500);
        }
    }

    async function adjustCamera(offsetX, offsetY) {
        if (!ptzController) return;

        try {
            let moved = false;
            
            if (Math.abs(offsetX) > deadzone) {
                if (offsetX > 0) {
                    window.reasoningConsole.logInfo('Panning right...');
                    await ptzController.panRight();
                } else {
                    window.reasoningConsole.logInfo('Panning left...');
                    await ptzController.panLeft();
                }
                moved = true;
            }

            if (Math.abs(offsetY) > deadzone) {
                if (offsetY > 0) {
                    window.reasoningConsole.logInfo('Tilting down...');
                    await ptzController.tiltDown();
                } else {
                    window.reasoningConsole.logInfo('Tilting up...');
                    await ptzController.tiltUp();
                }
                moved = true;
            }

            if (moved) {
                await delay(moveDuration);
                await ptzController.stop();
                moveCount++;
                moveCountSpan.textContent = moveCount;
            }

        } catch (error) {
            window.reasoningConsole.logError('PTZ adjustment failed: ' + error.message);
        }
    }

    // ==================== Drawing Functions ====================

    function clearOverlay() {
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        drawDeadzone();
    }

    function drawDeadzone() {
        const centerX = overlay.width / 2;
        const centerY = overlay.height / 2;
        const halfWidth = deadzone * overlay.width;
        const halfHeight = deadzone * overlay.height;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(
            centerX - halfWidth,
            centerY - halfHeight,
            halfWidth * 2,
            halfHeight * 2
        );
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(
            centerX - halfWidth,
            centerY - halfHeight,
            halfWidth * 2,
            halfHeight * 2
        );
    }

    function drawDetectionBox(obj, label) {
        const x = obj.x_min * overlay.width;
        const y = obj.y_min * overlay.height;
        const w = obj.width * overlay.width;
        const h = obj.height * overlay.height;

        // Draw box
        ctx.strokeStyle = '#2A9D8F';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        // Fill with transparency
        ctx.fillStyle = 'rgba(42, 157, 143, 0.2)';
        ctx.fillRect(x, y, w, h);

        // Draw label
        ctx.fillStyle = '#2A9D8F';
        ctx.fillRect(x, y - 22, label.length * 8 + 16, 22);
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.fillText(label, x + 8, y - 6);

        // Draw center point
        const centerX = (obj.x_min + obj.x_max) / 2 * overlay.width;
        const centerY = (obj.y_min + obj.y_max) / 2 * overlay.height;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#E63946';
        ctx.fill();
    }

    // ==================== Utility Functions ====================

    function updateStatus(message, isError = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==================== Event Listeners ====================

    cameraSelect.addEventListener('change', () => {
        localStorage.setItem('preferred_camera', cameraSelect.value);
        startCamera(cameraSelect.value);
    });

    testConnectionBtn.addEventListener('click', testPTZConnection);

    // Zoom preset buttons
    document.querySelectorAll('.zoom-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.zoom-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentZoomPreset = btn.dataset.zoom;
            
            if (ptzController) {
                try {
                    await ptzController.setZoomPosition(ZOOM_PRESETS[currentZoomPreset]);
                    window.reasoningConsole.logInfo(`Zoom changed to ${currentZoomPreset}`);
                } catch (e) {
                    window.reasoningConsole.logError('Zoom failed: ' + e.message);
                }
            }
        });
    });

    deadzoneSlider.addEventListener('input', () => {
        const value = parseInt(deadzoneSlider.value);
        deadzone = value / 100;
        deadzoneValueSpan.textContent = value;
        localStorage.setItem('ptz_deadzone', deadzone.toString());
        clearOverlay();
    });

    // Manual PTZ controls
    document.querySelectorAll('[data-ptz]').forEach(btn => {
        const cmd = btn.dataset.ptz;
        if (cmd) {
            btn.addEventListener('click', () => handleManualPTZ(cmd));
        }
    });

    autoFrameBtn.addEventListener('click', startAutoFraming);
    stopBtn.addEventListener('click', stopAutoFraming);

    // ==================== Initialize ====================

    await enumerateCameras();
    await startCamera();
});
