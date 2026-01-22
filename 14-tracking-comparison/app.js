/**
 * Tracking Comparison Tool
 * Compare MediaPipe (local) vs Moondream (cloud) for PTZ auto-tracking
 * 
 * Part of the Visual Reasoning Playground
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
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const framingIndicator = document.getElementById('framingIndicator');
    const framingStatusText = document.getElementById('framingStatusText');
    const statusBar = document.getElementById('status');
    
    // Metrics elements
    const latencyValueSpan = document.getElementById('latencyValue');
    const fpsValueSpan = document.getElementById('fpsValue');
    const detectCountSpan = document.getElementById('detectCount');
    const moveCountSpan = document.getElementById('moveCount');
    
    // Mode toggle elements
    const mediapipeModeBtn = document.getElementById('mediapipeMode');
    const moondreamModeBtn = document.getElementById('moondreamMode');
    const mediapipeInfo = document.getElementById('mediapipeInfo');
    const moondreamInfo = document.getElementById('moondreamInfo');
    const mediapipeOptions = document.getElementById('mediapipeOptions');
    const moondreamOptions = document.getElementById('moondreamOptions');

    // State
    let moondreamClient = null;
    let mediapipeDetector = null;
    let ptzController = null;
    let isTracking = false;
    let trackingIntervalId = null;
    let currentMode = 'mediapipe'; // 'mediapipe' or 'moondream'
    let mediapipeType = 'face'; // 'face' or 'pose'
    let deadzone = 0.12;
    let moveDuration = 350;
    
    // Metrics
    let detectCount = 0;
    let moveCount = 0;
    let latencyHistory = [];
    let lastFrameTime = 0;
    let fpsHistory = [];

    // Initialize API Key Manager
    window.apiKeyManager = new APIKeyManager({
        requireMoondream: true,
        requireOpenAI: false,
        onKeysChanged: (keys) => {
            if (keys.moondream) {
                moondreamClient = new MoondreamClient(keys.moondream);
                if (window.reasoningConsole) {
                    window.reasoningConsole.logInfo('Moondream API key configured');
                }
            }
        }
    });

    // Initialize Reasoning Console
    window.reasoningConsole = new ReasoningConsole({ startCollapsed: true });

    // Load saved Moondream API key
    if (window.apiKeyManager.hasMoondreamKey()) {
        moondreamClient = new MoondreamClient(window.apiKeyManager.getMoondreamKey());
        window.reasoningConsole.logInfo('Loaded saved Moondream API key');
    }

    // Initialize MediaPipe detector
    try {
        mediapipeDetector = new MediaPipeDetector();
        await mediapipeDetector.initialize();
        window.reasoningConsole.logInfo('MediaPipe initialized');
    } catch (error) {
        window.reasoningConsole.logError('MediaPipe init failed: ' + error.message);
    }

    // Load saved settings
    loadSavedSettings();

    // ==================== Mode Toggle ====================

    function setMode(mode) {
        currentMode = mode;
        
        if (mode === 'mediapipe') {
            mediapipeModeBtn.classList.add('active');
            moondreamModeBtn.classList.remove('active');
            mediapipeInfo.classList.remove('hidden');
            moondreamInfo.classList.add('hidden');
            mediapipeOptions.classList.remove('hidden');
            moondreamOptions.classList.add('hidden');
        } else {
            mediapipeModeBtn.classList.remove('active');
            moondreamModeBtn.classList.add('active');
            mediapipeInfo.classList.add('hidden');
            moondreamInfo.classList.remove('hidden');
            mediapipeOptions.classList.add('hidden');
            moondreamOptions.classList.remove('hidden');
        }
        
        updateStatus(`Mode: ${mode === 'mediapipe' ? 'MediaPipe (Local)' : 'Moondream (Cloud)'}`);
        resetMetrics();
    }

    mediapipeModeBtn.addEventListener('click', () => setMode('mediapipe'));
    moondreamModeBtn.addEventListener('click', () => setMode('moondream'));

    // MediaPipe type buttons (face/pose)
    document.querySelectorAll('.mp-type').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mp-type').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mediapipeType = btn.dataset.type;
            if (mediapipeDetector) {
                mediapipeDetector.setMode(mediapipeType);
            }
            window.reasoningConsole.logInfo(`MediaPipe type: ${mediapipeType}`);
        });
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
            
            await new Promise(resolve => {
                video.onloadedmetadata = resolve;
            });

            overlay.width = video.videoWidth;
            overlay.height = video.videoHeight;
            
            drawDeadzone();
            updateStatus('Camera ready');
            window.reasoningConsole.logInfo(`Camera started: ${video.videoWidth}x${video.videoHeight}`);

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
            }
            moveCount++;
            moveCountSpan.textContent = moveCount;
        } catch (error) {
            window.reasoningConsole.logError('PTZ command failed: ' + error.message);
        }
    }

    // ==================== Tracking ====================

    async function startTracking() {
        if (currentMode === 'moondream' && !moondreamClient) {
            updateStatus('Configure Moondream API key first', true);
            window.apiKeyManager.showModal();
            return;
        }

        if (!ptzController) {
            updateStatus('Connect to PTZ camera first', true);
            return;
        }

        if (currentMode === 'moondream') {
            const target = targetObjectInput.value.trim();
            if (!target) {
                updateStatus('Enter a target object to track', true);
                return;
            }
            localStorage.setItem('ptz_target_object', target);
        }

        isTracking = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        framingIndicator.classList.add('active');
        framingStatusText.textContent = 'Tracking active';
        
        const modeLabel = currentMode === 'mediapipe' 
            ? `MediaPipe (${mediapipeType})` 
            : `Moondream (${targetObjectInput.value})`;
        updateStatus(`Tracking with ${modeLabel}`);
        window.reasoningConsole.logAction('Tracking started', modeLabel);

        resetMetrics();

        if (currentMode === 'mediapipe') {
            startMediaPipeTracking();
        } else {
            startMoondreamTracking();
        }
    }

    function startMediaPipeTracking() {
        if (!mediapipeDetector) {
            updateStatus('MediaPipe not initialized', true);
            return;
        }

        mediapipeDetector.setMode(mediapipeType);
        
        mediapipeDetector.onResult((detection) => {
            if (!isTracking) return;
            
            handleDetectionResult(detection);
        });

        // Send frames at ~150ms interval (faster than Moondream)
        trackingIntervalId = setInterval(() => {
            if (!isTracking) return;
            
            const now = performance.now();
            if (lastFrameTime > 0) {
                const fps = 1000 / (now - lastFrameTime);
                updateFPS(fps);
            }
            lastFrameTime = now;
            
            mediapipeDetector.sendFrame(video);
        }, 150);
    }

    function startMoondreamTracking() {
        const target = targetObjectInput.value.trim();
        
        // Moondream loop - slower interval due to API latency
        async function moondreamLoop() {
            if (!isTracking) return;
            
            const now = performance.now();
            if (lastFrameTime > 0) {
                const fps = 1000 / (now - lastFrameTime);
                updateFPS(fps);
            }
            lastFrameTime = now;

            try {
                const startTime = Date.now();
                const imageData = moondreamClient.captureFrame(video);
                const result = await moondreamClient.detect(imageData, target);
                const latency = Date.now() - startTime;

                detectCount++;
                detectCountSpan.textContent = detectCount;
                updateLatency(latency);
                window.reasoningConsole.logApiCall('/detect', latency);

                if (result.objects && result.objects.length > 0) {
                    const obj = result.objects[0];
                    handleDetectionResult({
                        found: true,
                        x: obj.x,
                        y: obj.y,
                        x_min: obj.x_min,
                        y_min: obj.y_min,
                        x_max: obj.x_max,
                        y_max: obj.y_max,
                        width: obj.width,
                        height: obj.height,
                        label: target,
                        latency: latency
                    });
                } else {
                    handleDetectionResult({ found: false, latency: latency });
                }
            } catch (error) {
                window.reasoningConsole.logError('Moondream error: ' + error.message);
            }

            if (isTracking) {
                trackingIntervalId = setTimeout(moondreamLoop, 500);
            }
        }

        moondreamLoop();
    }

    async function handleDetectionResult(detection) {
        clearOverlay();

        if (detection.latency) {
            updateLatency(detection.latency);
        }

        if (detection.found) {
            detectCount++;
            detectCountSpan.textContent = detectCount;
            
            drawDetectionBox(detection);

            const offsetX = detection.x - 0.5;
            const offsetY = detection.y - 0.5;

            framingStatusText.textContent = `Found at (${(detection.x * 100).toFixed(0)}%, ${(detection.y * 100).toFixed(0)}%)`;

            if (Math.abs(offsetX) > deadzone || Math.abs(offsetY) > deadzone) {
                await adjustCamera(offsetX, offsetY);
            } else {
                framingStatusText.textContent = 'Centered';
            }
        } else {
            const label = currentMode === 'mediapipe' ? mediapipeType : targetObjectInput.value;
            framingStatusText.textContent = `Searching for ${label}...`;
        }
    }

    async function adjustCamera(offsetX, offsetY) {
        if (!ptzController) return;

        try {
            let moved = false;
            
            if (Math.abs(offsetX) > deadzone) {
                if (offsetX > 0) {
                    await ptzController.panRight();
                } else {
                    await ptzController.panLeft();
                }
                moved = true;
            }

            if (Math.abs(offsetY) > deadzone) {
                if (offsetY > 0) {
                    await ptzController.tiltDown();
                } else {
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

    async function stopTracking() {
        isTracking = false;
        
        if (trackingIntervalId) {
            clearInterval(trackingIntervalId);
            clearTimeout(trackingIntervalId);
            trackingIntervalId = null;
        }
        
        startBtn.disabled = false;
        stopBtn.disabled = true;
        framingIndicator.classList.remove('active');
        framingStatusText.textContent = 'Stopped';
        updateStatus('Tracking stopped');
        window.reasoningConsole.logAction('Tracking stopped');

        if (ptzController) {
            await ptzController.stop();
        }

        clearOverlay();
    }

    // ==================== Metrics ====================

    function updateLatency(ms) {
        latencyHistory.push(ms);
        if (latencyHistory.length > 20) latencyHistory.shift();
        
        const avg = latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length;
        latencyValueSpan.textContent = Math.round(avg);
    }

    function updateFPS(fps) {
        fpsHistory.push(fps);
        if (fpsHistory.length > 10) fpsHistory.shift();
        
        const avg = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
        fpsValueSpan.textContent = avg.toFixed(1);
    }

    function resetMetrics() {
        detectCount = 0;
        moveCount = 0;
        latencyHistory = [];
        fpsHistory = [];
        lastFrameTime = 0;
        
        detectCountSpan.textContent = '0';
        moveCountSpan.textContent = '0';
        latencyValueSpan.textContent = '--';
        fpsValueSpan.textContent = '--';
    }

    // ==================== Drawing ====================

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

    function drawDetectionBox(detection) {
        const x = detection.x_min * overlay.width;
        const y = detection.y_min * overlay.height;
        const w = detection.width * overlay.width;
        const h = detection.height * overlay.height;

        const color = currentMode === 'mediapipe' ? '#2A9D8F' : '#E9C46A';
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = color.replace(')', ', 0.2)').replace('rgb', 'rgba').replace('#', 'rgba(');
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
        }
        ctx.fillRect(x, y, w, h);

        const label = detection.label || (currentMode === 'mediapipe' ? mediapipeType : 'target');
        ctx.fillStyle = color;
        ctx.fillRect(x, y - 22, label.length * 8 + 16, 22);
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.fillText(label, x + 8, y - 6);

        const centerX = detection.x * overlay.width;
        const centerY = detection.y * overlay.height;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#E63946';
        ctx.fill();
    }

    // ==================== Utilities ====================

    function updateStatus(message, isError = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function loadSavedSettings() {
        const savedCameraIP = localStorage.getItem('ptz_camera_ip');
        if (savedCameraIP) {
            cameraIPInput.value = savedCameraIP;
        }

        const savedTarget = localStorage.getItem('ptz_target_object');
        if (savedTarget) {
            targetObjectInput.value = savedTarget;
        }

        const savedDeadzone = localStorage.getItem('ptz_deadzone');
        if (savedDeadzone) {
            deadzone = parseFloat(savedDeadzone);
        }
        deadzoneSlider.value = Math.round(deadzone * 100);
        deadzoneValueSpan.textContent = Math.round(deadzone * 100);

        const savedUseAuth = localStorage.getItem('ptz_use_auth') === 'true';
        const savedUsername = localStorage.getItem('ptz_auth_username') || '';
        const savedPassword = localStorage.getItem('ptz_auth_password') || '';
        
        useAuthCheckbox.checked = savedUseAuth;
        authFields.style.display = savedUseAuth ? 'block' : 'none';
        authUsernameInput.value = savedUsername;
        authPasswordInput.value = savedPassword;
    }

    // ==================== Event Listeners ====================

    cameraSelect.addEventListener('change', () => {
        localStorage.setItem('preferred_camera', cameraSelect.value);
        startCamera(cameraSelect.value);
    });

    testConnectionBtn.addEventListener('click', testPTZConnection);

    useAuthCheckbox.addEventListener('change', () => {
        authFields.style.display = useAuthCheckbox.checked ? 'block' : 'none';
        localStorage.setItem('ptz_use_auth', useAuthCheckbox.checked);
    });

    deadzoneSlider.addEventListener('input', () => {
        const value = parseInt(deadzoneSlider.value);
        deadzone = value / 100;
        deadzoneValueSpan.textContent = value;
        localStorage.setItem('ptz_deadzone', deadzone.toString());
        clearOverlay();
    });

    document.querySelectorAll('[data-ptz]').forEach(btn => {
        const cmd = btn.dataset.ptz;
        if (cmd) {
            btn.addEventListener('click', () => handleManualPTZ(cmd));
        }
    });

    startBtn.addEventListener('click', startTracking);
    stopBtn.addEventListener('click', stopTracking);

    // ==================== Initialize ====================

    setMode('mediapipe');
    await enumerateCameras();
    await startCamera();
});
