document.addEventListener('DOMContentLoaded', async function() {
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
    const statusBar = document.getElementById('status');
    const historyLog = document.getElementById('historyLog');

    const mediapipeModeBtn = document.getElementById('mediapipeMode');
    const moondreamModeBtn = document.getElementById('moondreamMode');
    const mediapipeInfo = document.getElementById('mediapipeInfo');
    const moondreamInfo = document.getElementById('moondreamInfo');
    const mediapipeOptions = document.getElementById('mediapipeOptions');
    const moondreamOptions = document.getElementById('moondreamOptions');

    const latencyValue = document.getElementById('latencyValue');
    const fpsValue = document.getElementById('fpsValue');
    const detectionsValue = document.getElementById('detectionsValue');
    const ptzMovesValue = document.getElementById('ptzMovesValue');
    const mpLatencyBar = document.getElementById('mpLatencyBar');
    const mdLatencyBar = document.getElementById('mdLatencyBar');
    const mpLatencyText = document.getElementById('mpLatencyText');
    const mdLatencyText = document.getElementById('mdLatencyText');

    let currentMode = 'mediapipe';
    let mediapipeType = 'face';
    let moondreamClient = null;
    let mediapipeDetector = null;
    let ptzController = null;
    let isTracking = false;
    let trackingLoop = null;
    let detectionCount = 0;
    let latencyHistory = { mediapipe: [], moondream: [] };
    let lastDetectionState = null;
    let lastHistoryUpdate = 0;

    window.apiKeyManager = new APIKeyManager({
        requireMoondream: true,
        requireOpenAI: false,
        onKeysChanged: (keys) => {
            if (keys.moondream) {
                moondreamClient = new MoondreamClient(keys.moondream);
            }
        }
    });

    window.reasoningConsole = new ReasoningConsole({ startCollapsed: true });

    if (window.apiKeyManager.hasMoondreamKey()) {
        moondreamClient = new MoondreamClient(window.apiKeyManager.getMoondreamKey());
    }

    mediapipeDetector = new MediaPipeDetector();

    loadSavedSettings();
    await enumerateCameras();
    await startCamera();

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

            const savedCamera = localStorage.getItem('comparison_camera');
            if (savedCamera) cameraSelect.value = savedCamera;
        } catch (error) {
            console.error('Failed to enumerate cameras:', error);
        }
    }

    async function startCamera(deviceId = null) {
        try {
            const constraints = {
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            };

            if (deviceId) {
                constraints.video.deviceId = { exact: deviceId };
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;

            await new Promise(resolve => { video.onloadedmetadata = resolve; });

            overlay.width = video.videoWidth;
            overlay.height = video.videoHeight;

            updateStatus('Camera ready');
        } catch (error) {
            updateStatus('Camera error: ' + error.message, true);
        }
    }

    function loadSavedSettings() {
        const savedIP = localStorage.getItem('comparison_ptz_ip');
        if (savedIP) cameraIPInput.value = savedIP;

        const savedTarget = localStorage.getItem('comparison_target');
        if (savedTarget) targetObjectInput.value = savedTarget;

        const savedDeadzone = localStorage.getItem('comparison_deadzone');
        if (savedDeadzone) {
            deadzoneSlider.value = savedDeadzone;
            deadzoneValueSpan.textContent = savedDeadzone;
        }

        const savedAuth = localStorage.getItem('comparison_use_auth') === 'true';
        useAuthCheckbox.checked = savedAuth;
        authFields.classList.toggle('visible', savedAuth);
        authUsernameInput.value = localStorage.getItem('comparison_auth_user') || '';
        authPasswordInput.value = localStorage.getItem('comparison_auth_pass') || '';
    }

    function saveSettings() {
        localStorage.setItem('comparison_ptz_ip', cameraIPInput.value);
        localStorage.setItem('comparison_target', targetObjectInput.value);
        localStorage.setItem('comparison_deadzone', deadzoneSlider.value);
        localStorage.setItem('comparison_use_auth', useAuthCheckbox.checked);
        localStorage.setItem('comparison_auth_user', authUsernameInput.value);
        localStorage.setItem('comparison_auth_pass', authPasswordInput.value);
    }

    async function switchMode(newMode) {
        if (isTracking) {
            await stopTracking();
        }

        currentMode = newMode;

        mediapipeModeBtn.classList.toggle('active', newMode === 'mediapipe');
        moondreamModeBtn.classList.toggle('active', newMode === 'moondream');

        mediapipeInfo.classList.toggle('hidden', newMode !== 'mediapipe');
        moondreamInfo.classList.toggle('hidden', newMode !== 'moondream');
        mediapipeOptions.classList.toggle('hidden', newMode !== 'mediapipe');
        moondreamOptions.classList.toggle('hidden', newMode !== 'moondream');

        clearOverlay();
        detectionCount = 0;
        detectionsValue.textContent = '0';
        latencyValue.textContent = '--';
        fpsValue.textContent = '--';
        lastDetectionState = null;
        historyLog.innerHTML = '<div class="entry"><span>Mode switched - ready to track</span></div>';

        if (newMode === 'mediapipe') {
            updateStatus('MediaPipe mode - Local browser detection');
        } else {
            updateStatus('Moondream mode - Cloud VLM detection');
        }
    }

    mediapipeModeBtn.addEventListener('click', () => switchMode('mediapipe'));
    moondreamModeBtn.addEventListener('click', () => switchMode('moondream'));

    document.querySelectorAll('.mp-type').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.mp-type').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mediapipeType = btn.dataset.type;
            updateStatus(`MediaPipe ${mediapipeType} detection selected`);
        });
    });

    cameraSelect.addEventListener('change', () => {
        localStorage.setItem('comparison_camera', cameraSelect.value);
        startCamera(cameraSelect.value);
    });

    testConnectionBtn.addEventListener('click', async () => {
        const ip = cameraIPInput.value.trim();
        if (!ip) {
            updateStatus('Enter camera IP first', true);
            return;
        }

        saveSettings();

        ptzController = new PTZController(ip, {
            useAuth: useAuthCheckbox.checked,
            username: authUsernameInput.value,
            password: authPasswordInput.value
        });

        try {
            await ptzController.stop();
            connectionStatus.textContent = 'Connected';
            connectionStatus.classList.remove('disconnected');
            connectionStatus.classList.add('connected');
            updateStatus('PTZ camera connected');
        } catch (e) {
            connectionStatus.textContent = 'Connection failed';
            connectionStatus.classList.remove('connected');
            connectionStatus.classList.add('disconnected');
        }
    });

    useAuthCheckbox.addEventListener('change', () => {
        authFields.classList.toggle('visible', useAuthCheckbox.checked);
        saveSettings();
    });

    deadzoneSlider.addEventListener('input', () => {
        deadzoneValueSpan.textContent = deadzoneSlider.value;
        if (ptzController) ptzController.setDeadzone(parseInt(deadzoneSlider.value));
        saveSettings();
    });

    startBtn.addEventListener('click', startTracking);
    stopBtn.addEventListener('click', stopTracking);

    document.querySelectorAll('[data-ptz]').forEach(btn => {
        const cmd = btn.dataset.ptz;
        btn.addEventListener('mousedown', async () => {
            if (!ptzController) return;
            switch(cmd) {
                case 'up': await ptzController.tiltUp(); break;
                case 'down': await ptzController.tiltDown(); break;
                case 'left': await ptzController.panLeft(); break;
                case 'right': await ptzController.panRight(); break;
                case 'stop': await ptzController.stop(); break;
            }
        });
        btn.addEventListener('mouseup', async () => {
            if (ptzController && cmd !== 'stop') await ptzController.stop();
        });
        btn.addEventListener('mouseleave', async () => {
            if (ptzController && cmd !== 'stop') await ptzController.stop();
        });
    });

    async function startTracking() {
        if (currentMode === 'mediapipe') {
            updateStatus(`Initializing MediaPipe ${mediapipeType} detection...`);
            await mediapipeDetector.setMode(mediapipeType);
        } else {
            if (!moondreamClient) {
                updateStatus('Configure Moondream API key first', true);
                window.apiKeyManager.showModal();
                return;
            }
            if (!targetObjectInput.value.trim()) {
                updateStatus('Enter target object description', true);
                return;
            }
        }

        if (!ptzController) {
            const ip = cameraIPInput.value.trim();
            if (ip) {
                ptzController = new PTZController(ip, {
                    useAuth: useAuthCheckbox.checked,
                    username: authUsernameInput.value,
                    password: authPasswordInput.value
                });
                ptzController.setDeadzone(parseInt(deadzoneSlider.value));
            }
        }

        saveSettings();
        isTracking = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        mediapipeModeBtn.disabled = true;
        moondreamModeBtn.disabled = true;
        detectionCount = 0;
        if (ptzController) ptzController.resetMoveCount();

        historyLog.innerHTML = '';
        updateStatus(`Tracking started - ${currentMode === 'mediapipe' ? 'MediaPipe ' + mediapipeType : 'Moondream VLM'}`);

        runTrackingLoop();
    }

    async function stopTracking() {
        isTracking = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        mediapipeModeBtn.disabled = false;
        moondreamModeBtn.disabled = false;

        if (trackingLoop) {
            cancelAnimationFrame(trackingLoop);
            clearTimeout(trackingLoop);
            trackingLoop = null;
        }

        if (ptzController) await ptzController.stop();

        clearOverlay();
        updateStatus('Tracking stopped');
    }

    async function runTrackingLoop() {
        if (!isTracking) return;

        try {
            let detection = null;
            let latency = 0;

            if (currentMode === 'mediapipe') {
                const result = await mediapipeDetector.detect(video);
                detection = result.detection;
                latency = result.latency;
                updateLatencyStats('mediapipe', latency);
            } else {
                const startTime = performance.now();
                const imageData = moondreamClient.captureFrame(video);
                const result = await moondreamClient.detect(imageData, targetObjectInput.value);
                latency = performance.now() - startTime;

                if (result.objects && result.objects.length > 0) {
                    const obj = result.objects[0];
                    detection = {
                        x: obj.x,
                        y: obj.y,
                        width: obj.width,
                        height: obj.height,
                        x_min: obj.x_min,
                        y_min: obj.y_min,
                        x_max: obj.x_max,
                        y_max: obj.y_max,
                        type: 'moondream'
                    };
                }
                updateLatencyStats('moondream', latency);
            }

            detectionCount++;
            detectionsValue.textContent = detectionCount;
            latencyValue.textContent = Math.round(latency);

            clearOverlay();

            if (detection) {
                drawDetection(detection);

                if (ptzController) {
                    await ptzController.trackObject(detection);
                    ptzMovesValue.textContent = ptzController.getMoveCount();
                }

                addHistoryEntry(currentMode, latency, true);
            } else {
                addHistoryEntry(currentMode, latency, false);
            }

            updateFPS(latency);

        } catch (error) {
            console.error('Tracking error:', error);
            addHistoryEntry(currentMode, 0, false, error.message);
        }

        if (isTracking) {
            if (currentMode === 'mediapipe') {
                trackingLoop = requestAnimationFrame(runTrackingLoop);
            } else {
                trackingLoop = setTimeout(runTrackingLoop, 500);
            }
        }
    }

    function drawDetection(detection) {
        const x = detection.x_min * overlay.width;
        const y = detection.y_min * overlay.height;
        const w = (detection.x_max - detection.x_min) * overlay.width;
        const h = (detection.y_max - detection.y_min) * overlay.height;

        const color = currentMode === 'mediapipe' ? '#2A9D8F' : '#E9C46A';

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = color + '33';
        ctx.fillRect(x, y, w, h);

        const label = currentMode === 'mediapipe' ? `MediaPipe ${mediapipeType}` : targetObjectInput.value;
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

    function clearOverlay() {
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        const centerX = overlay.width / 2;
        const centerY = overlay.height / 2;
        const deadzone = parseInt(deadzoneSlider.value) / 100;
        const halfW = deadzone * overlay.width;
        const halfH = deadzone * overlay.height;

        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(centerX - halfW, centerY - halfH, halfW * 2, halfH * 2);
        ctx.setLineDash([]);
    }

    function updateLatencyStats(mode, latency) {
        latencyHistory[mode].push(latency);
        if (latencyHistory[mode].length > 20) {
            latencyHistory[mode].shift();
        }

        const avgLatency = arr => arr.length ? arr.reduce((a, b) => a + b) / arr.length : 0;

        if (mode === 'mediapipe') {
            const avg = avgLatency(latencyHistory.mediapipe);
            mpLatencyText.textContent = `~${Math.round(avg)}ms`;
            const pct = Math.min(100, (avg / 500) * 100);
            mpLatencyBar.style.width = `${pct}%`;
            mpLatencyBar.className = 'fill ' + (avg < 50 ? 'fast' : avg < 150 ? 'medium' : 'slow');
        } else {
            const avg = avgLatency(latencyHistory.moondream);
            mdLatencyText.textContent = `~${Math.round(avg)}ms`;
            const pct = Math.min(100, (avg / 500) * 100);
            mdLatencyBar.style.width = `${pct}%`;
            mdLatencyBar.className = 'fill ' + (avg < 100 ? 'fast' : avg < 300 ? 'medium' : 'slow');
        }
    }

    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    function updateFPS(latency) {
        frameCount++;
        const now = performance.now();
        if (now - lastFpsUpdate >= 1000) {
            fpsValue.textContent = frameCount.toFixed(1);
            frameCount = 0;
            lastFpsUpdate = now;
        }
    }

    function addHistoryEntry(mode, latency, detected, error = null) {
        const now = Date.now();
        const stateChanged = detected !== lastDetectionState;
        
        if (!error && !stateChanged && now - lastHistoryUpdate < 500) {
            return;
        }
        
        lastHistoryUpdate = now;
        lastDetectionState = detected;

        const entry = document.createElement('div');
        entry.className = 'entry';

        const time = new Date().toLocaleTimeString();
        const modeClass = mode === 'mediapipe' ? 'mediapipe' : 'moondream';

        if (error) {
            entry.innerHTML = `<span class="time">${time}</span><span style="color:var(--error)">Error: ${error}</span>`;
        } else {
            entry.innerHTML = `<span class="time">${time}</span><span class="${modeClass}">${mode === 'mediapipe' ? 'MP' : 'MD'}: ${Math.round(latency)}ms ${detected ? '✓' : '✗'}</span>`;
        }

        historyLog.insertBefore(entry, historyLog.firstChild);

        while (historyLog.children.length > 50) {
            historyLog.removeChild(historyLog.lastChild);
        }
    }

    function updateStatus(message, isError = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }
});
