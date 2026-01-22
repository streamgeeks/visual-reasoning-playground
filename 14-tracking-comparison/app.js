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
    let trackingInterval = null;
    let detectionCount = 0;
    let frameCount = 0;
    let lastFpsTime = performance.now();
    let latencyHistory = { mediapipe: [], moondream: [] };
    let lastLogTime = 0;
    let lastLogState = null;

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
    
    mediapipeDetector.onResult((detection, latency) => {
        if (!isTracking || currentMode !== 'mediapipe') return;
        handleDetectionResult(detection, latency);
    });

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

            const saved = localStorage.getItem('comparison_camera');
            if (saved) cameraSelect.value = saved;
        } catch (e) {
            console.error('Camera enumeration failed:', e);
        }
    }

    async function startCamera(deviceId = null) {
        try {
            const constraints = {
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            };
            if (deviceId) constraints.video.deviceId = { exact: deviceId };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            await new Promise(r => video.onloadedmetadata = r);
            
            overlay.width = video.videoWidth;
            overlay.height = video.videoHeight;
            updateStatus('Camera ready');
        } catch (e) {
            updateStatus('Camera error: ' + e.message, true);
        }
    }

    function loadSavedSettings() {
        const ip = localStorage.getItem('comparison_ptz_ip');
        if (ip) cameraIPInput.value = ip;

        const target = localStorage.getItem('comparison_target');
        if (target) targetObjectInput.value = target;

        const dz = localStorage.getItem('comparison_deadzone');
        if (dz) {
            deadzoneSlider.value = dz;
            deadzoneValueSpan.textContent = dz;
        }

        const auth = localStorage.getItem('comparison_use_auth') === 'true';
        useAuthCheckbox.checked = auth;
        authFields.classList.toggle('visible', auth);
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

    function switchMode(newMode) {
        if (isTracking) stopTracking();

        currentMode = newMode;
        mediapipeModeBtn.classList.toggle('active', newMode === 'mediapipe');
        moondreamModeBtn.classList.toggle('active', newMode === 'moondream');
        mediapipeInfo.classList.toggle('hidden', newMode !== 'mediapipe');
        moondreamInfo.classList.toggle('hidden', newMode !== 'moondream');
        mediapipeOptions.classList.toggle('hidden', newMode !== 'mediapipe');
        moondreamOptions.classList.toggle('hidden', newMode !== 'moondream');

        resetStats();
        updateStatus(newMode === 'mediapipe' ? 'MediaPipe mode - Local detection' : 'Moondream mode - Cloud VLM');
    }

    function resetStats() {
        detectionCount = 0;
        frameCount = 0;
        detectionsValue.textContent = '0';
        latencyValue.textContent = '--';
        fpsValue.textContent = '--';
        ptzMovesValue.textContent = '0';
        lastLogState = null;
        historyLog.innerHTML = '<div class="entry"><span>Ready to track</span></div>';
        clearOverlay();
    }

    mediapipeModeBtn.addEventListener('click', () => switchMode('mediapipe'));
    moondreamModeBtn.addEventListener('click', () => switchMode('moondream'));

    document.querySelectorAll('.mp-type').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mp-type').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mediapipeType = btn.dataset.type;
            updateStatus(`MediaPipe ${mediapipeType} selected`);
        });
    });

    cameraSelect.addEventListener('change', () => {
        localStorage.setItem('comparison_camera', cameraSelect.value);
        startCamera(cameraSelect.value);
    });

    testConnectionBtn.addEventListener('click', () => {
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
        ptzController.setDeadzone(parseInt(deadzoneSlider.value));
        ptzController.stop();
        connectionStatus.textContent = 'Connected';
        connectionStatus.classList.remove('disconnected');
        connectionStatus.classList.add('connected');
        updateStatus('PTZ connected');
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
        btn.addEventListener('mousedown', () => {
            if (!ptzController) return;
            if (cmd === 'up') ptzController.tiltUp();
            else if (cmd === 'down') ptzController.tiltDown();
            else if (cmd === 'left') ptzController.panLeft();
            else if (cmd === 'right') ptzController.panRight();
            else if (cmd === 'stop') ptzController.stop();
        });
        btn.addEventListener('mouseup', () => {
            if (ptzController && cmd !== 'stop') ptzController.stop();
        });
        btn.addEventListener('mouseleave', () => {
            if (ptzController && cmd !== 'stop') ptzController.stop();
        });
    });

    async function startTracking() {
        saveSettings();

        if (currentMode === 'mediapipe') {
            updateStatus(`Initializing MediaPipe ${mediapipeType}...`);
            try {
                await mediapipeDetector.setMode(mediapipeType);
            } catch (e) {
                updateStatus('MediaPipe init failed: ' + e.message, true);
                return;
            }
        } else {
            if (!moondreamClient) {
                updateStatus('Configure Moondream API key first', true);
                window.apiKeyManager.showModal();
                return;
            }
            if (!targetObjectInput.value.trim()) {
                updateStatus('Enter target object', true);
                return;
            }
        }

        if (!ptzController && cameraIPInput.value.trim()) {
            ptzController = new PTZController(cameraIPInput.value.trim(), {
                useAuth: useAuthCheckbox.checked,
                username: authUsernameInput.value,
                password: authPasswordInput.value
            });
            ptzController.setDeadzone(parseInt(deadzoneSlider.value));
        }

        isTracking = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        mediapipeModeBtn.disabled = true;
        moondreamModeBtn.disabled = true;
        
        resetStats();
        if (ptzController) ptzController.resetMoveCount();
        
        updateStatus(`Tracking: ${currentMode === 'mediapipe' ? 'MediaPipe ' + mediapipeType : 'Moondream'}`);

        if (currentMode === 'mediapipe') {
            trackingInterval = setInterval(runMediaPipeFrame, 50);
        } else {
            runMoondreamLoop();
        }
    }

    function stopTracking() {
        isTracking = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        mediapipeModeBtn.disabled = false;
        moondreamModeBtn.disabled = false;

        if (trackingInterval) {
            clearInterval(trackingInterval);
            trackingInterval = null;
        }

        if (ptzController) ptzController.stop();
        clearOverlay();
        updateStatus('Tracking stopped');
    }

    function runMediaPipeFrame() {
        if (!isTracking) return;
        mediapipeDetector.sendFrame(video);
    }

    async function runMoondreamLoop() {
        if (!isTracking || currentMode !== 'moondream') return;

        try {
            const startTime = performance.now();
            const imageData = moondreamClient.captureFrame(video);
            const result = await moondreamClient.detect(imageData, targetObjectInput.value);
            const latency = performance.now() - startTime;

            let detection = null;
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

            handleDetectionResult(detection, latency);
        } catch (e) {
            console.error('Moondream error:', e);
            logEntry(0, false, e.message);
        }

        if (isTracking && currentMode === 'moondream') {
            setTimeout(runMoondreamLoop, 100);
        }
    }

    function handleDetectionResult(detection, latency) {
        detectionCount++;
        detectionsValue.textContent = detectionCount;
        latencyValue.textContent = Math.round(latency);

        updateLatencyStats(currentMode, latency);
        updateFPS();

        clearOverlay();

        if (detection) {
            drawDetection(detection);
            if (ptzController) {
                ptzController.trackObject(detection);
                ptzMovesValue.textContent = ptzController.getMoveCount();
            }
        }

        logEntry(latency, !!detection);
    }

    function drawDetection(det) {
        const x = det.x_min * overlay.width;
        const y = det.y_min * overlay.height;
        const w = (det.x_max - det.x_min) * overlay.width;
        const h = (det.y_max - det.y_min) * overlay.height;

        const color = currentMode === 'mediapipe' ? '#2A9D8F' : '#E9C46A';

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = color + '33';
        ctx.fillRect(x, y, w, h);

        const label = currentMode === 'mediapipe' ? `${mediapipeType}` : targetObjectInput.value;
        ctx.fillStyle = color;
        ctx.fillRect(x, y - 20, ctx.measureText(label).width + 12, 20);
        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.fillText(label, x + 6, y - 5);

        ctx.beginPath();
        ctx.arc(det.x * overlay.width, det.y * overlay.height, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#E63946';
        ctx.fill();
    }

    function clearOverlay() {
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        const cx = overlay.width / 2;
        const cy = overlay.height / 2;
        const dz = parseInt(deadzoneSlider.value) / 100;
        const hw = dz * overlay.width;
        const hh = dz * overlay.height;

        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(cx - hw, cy - hh, hw * 2, hh * 2);
        ctx.setLineDash([]);
    }

    function updateLatencyStats(mode, latency) {
        latencyHistory[mode].push(latency);
        if (latencyHistory[mode].length > 20) latencyHistory[mode].shift();

        const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

        if (mode === 'mediapipe') {
            const a = avg(latencyHistory.mediapipe);
            mpLatencyText.textContent = `~${Math.round(a)}ms`;
            mpLatencyBar.style.width = Math.min(100, (a / 500) * 100) + '%';
            mpLatencyBar.className = 'fill ' + (a < 50 ? 'fast' : a < 150 ? 'medium' : 'slow');
        } else {
            const a = avg(latencyHistory.moondream);
            mdLatencyText.textContent = `~${Math.round(a)}ms`;
            mdLatencyBar.style.width = Math.min(100, (a / 500) * 100) + '%';
            mdLatencyBar.className = 'fill ' + (a < 100 ? 'fast' : a < 300 ? 'medium' : 'slow');
        }
    }

    function updateFPS() {
        frameCount++;
        const now = performance.now();
        if (now - lastFpsTime >= 1000) {
            fpsValue.textContent = frameCount.toFixed(1);
            frameCount = 0;
            lastFpsTime = now;
        }
    }

    function logEntry(latency, detected, error = null) {
        const now = Date.now();
        if (!error && detected === lastLogState && now - lastLogTime < 500) return;
        
        lastLogTime = now;
        lastLogState = detected;

        const entry = document.createElement('div');
        entry.className = 'entry';
        const time = new Date().toLocaleTimeString();
        const mode = currentMode === 'mediapipe' ? 'MP' : 'MD';
        const cls = currentMode === 'mediapipe' ? 'mediapipe' : 'moondream';

        if (error) {
            entry.innerHTML = `<span class="time">${time}</span><span style="color:var(--error)">${error}</span>`;
        } else {
            entry.innerHTML = `<span class="time">${time}</span><span class="${cls}">${mode}: ${Math.round(latency)}ms ${detected ? '✓' : '✗'}</span>`;
        }

        historyLog.insertBefore(entry, historyLog.firstChild);
        while (historyLog.children.length > 30) historyLog.removeChild(historyLog.lastChild);
    }

    function updateStatus(msg, isError = false) {
        statusBar.textContent = msg;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }
});
