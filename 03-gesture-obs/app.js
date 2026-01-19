document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const cameraSelect = document.getElementById('cameraSelect');
    const refreshCamerasBtn = document.getElementById('refreshCamerasBtn');
    
    const obsUrl = document.getElementById('obsUrl');
    const obsPassword = document.getElementById('obsPassword');
    const obsConnectBtn = document.getElementById('obsConnectBtn');
    const obsStatusEl = document.getElementById('obsStatus');
    const currentSceneEl = document.getElementById('currentScene');
    const lastActionEl = document.getElementById('lastAction');
    
    const thumbsUpAction = document.getElementById('thumbsUpAction');
    const thumbsDownAction = document.getElementById('thumbsDownAction');
    const thumbsUpIndicator = document.getElementById('thumbsUpIndicator');
    const thumbsDownIndicator = document.getElementById('thumbsDownIndicator');
    
    const confidenceThreshold = document.getElementById('confidenceThreshold');
    const confidenceValue = document.getElementById('confidenceValue');
    const cooldownTime = document.getElementById('cooldownTime');
    const debounceCount = document.getElementById('debounceCount');
    const detectionInterval = document.getElementById('detectionInterval');
    const startDetectionBtn = document.getElementById('startDetectionBtn');
    const stopDetectionBtn = document.getElementById('stopDetectionBtn');
    const activityLog = document.getElementById('activityLog');

    let moondreamClient = null;
    let obsClient = null;
    let currentStream = null;
    let detectionLoopId = null;
    let isDetecting = false;

    let lastActionTime = 0;
    let thumbsUpDetections = 0;
    let thumbsDownDetections = 0;

    window.reasoningConsole = new ReasoningConsole({
        startCollapsed: false
    });

    window.apiKeyManager = new APIKeyManager({
        requireMoondream: true,
        requireOpenAI: false,
        onKeysChanged: (keys) => {
            if (keys.moondream) {
                moondreamClient = new MoondreamClient(keys.moondream);
                window.reasoningConsole.logInfo('Moondream API key configured');
            }
        }
    });

    if (window.apiKeyManager.hasMoondreamKey()) {
        moondreamClient = new MoondreamClient(window.apiKeyManager.getMoondreamKey());
    }

    obsClient = new OBSClient();
    
    obsClient.onStatusChange = (connected) => {
        updateOBSStatus(connected);
    };

    obsClient.onSceneChange = (sceneName) => {
        currentSceneEl.textContent = sceneName || 'Unknown';
    };

    async function enumerateCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            cameraSelect.innerHTML = '<option value="">Select Camera...</option>';
            
            videoDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Camera ${index + 1}`;
                cameraSelect.appendChild(option);
            });

            window.reasoningConsole.logInfo(`Found ${videoDevices.length} camera(s)`);
            return videoDevices;
        } catch (error) {
            window.reasoningConsole.logError('Failed to enumerate cameras: ' + error.message);
            return [];
        }
    }

    async function startCamera(deviceId = null) {
        try {
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }

            window.reasoningConsole.logInfo('Requesting camera access...');
            
            const constraints = {
                video: deviceId 
                    ? { deviceId: { exact: deviceId }, width: 1280, height: 720 }
                    : { width: 1280, height: 720, facingMode: 'user' },
                audio: false
            };

            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = currentStream;

            await enumerateCameras();

            if (deviceId) {
                cameraSelect.value = deviceId;
            } else {
                const track = currentStream.getVideoTracks()[0];
                const settings = track.getSettings();
                if (settings.deviceId) {
                    cameraSelect.value = settings.deviceId;
                }
            }
            
            window.reasoningConsole.logInfo('Camera connected successfully');
        } catch (error) {
            window.reasoningConsole.logError('Camera access denied: ' + error.message);
        }
    }

    function updateOBSStatus(connected) {
        if (connected) {
            obsStatusEl.classList.add('connected');
            obsStatusEl.querySelector('.text').textContent = 'Connected';
            obsConnectBtn.textContent = 'Disconnect';
            obsConnectBtn.classList.remove('btn-primary');
            obsConnectBtn.classList.add('btn-danger');
            document.getElementById('obsHelp').style.display = 'none';
            populateActionSelects();
            addActivityLogEntry('📡', 'OBS Connected', 'info');
        } else {
            obsStatusEl.classList.remove('connected');
            obsStatusEl.querySelector('.text').textContent = 'Disconnected';
            obsConnectBtn.textContent = 'Connect';
            obsConnectBtn.classList.remove('btn-danger');
            obsConnectBtn.classList.add('btn-primary');
            currentSceneEl.textContent = 'Not Connected';
            document.getElementById('obsHelp').style.display = 'block';
            clearActionSelects();
        }
    }

    function populateActionSelects() {
        const scenes = obsClient.getScenes();
        
        [thumbsUpAction, thumbsDownAction].forEach(select => {
            select.innerHTML = '';
            
            select.innerHTML += '<option value="">No Action</option>';
            
            select.innerHTML += '<optgroup label="── Scenes ──">';
            scenes.forEach(scene => {
                select.innerHTML += `<option value="scene:${scene}">Switch to: ${scene}</option>`;
            });
            select.innerHTML += '</optgroup>';
            
            select.innerHTML += '<optgroup label="── Recording ──">';
            select.innerHTML += '<option value="cmd:StartRecord">Start Recording</option>';
            select.innerHTML += '<option value="cmd:StopRecord">Stop Recording</option>';
            select.innerHTML += '<option value="cmd:ToggleRecord">Toggle Recording</option>';
            select.innerHTML += '</optgroup>';
            
            select.innerHTML += '<optgroup label="── Streaming ──">';
            select.innerHTML += '<option value="cmd:StartStream">Start Streaming</option>';
            select.innerHTML += '<option value="cmd:StopStream">Stop Streaming</option>';
            select.innerHTML += '<option value="cmd:ToggleStream">Toggle Streaming</option>';
            select.innerHTML += '</optgroup>';
            
            select.innerHTML += '<optgroup label="── Transitions ──">';
            select.innerHTML += '<option value="cmd:TriggerStudioModeTransition">Trigger Transition</option>';
            select.innerHTML += '</optgroup>';
        });

        if (scenes.length >= 1) thumbsUpAction.value = 'scene:' + scenes[0];
        if (scenes.length >= 2) thumbsDownAction.value = 'scene:' + scenes[1];
    }

    function clearActionSelects() {
        [thumbsUpAction, thumbsDownAction].forEach(select => {
            select.innerHTML = '<option value="">Connect to OBS first</option>';
        });
    }

    async function connectOBS() {
        if (obsClient.isConnected()) {
            obsClient.disconnect();
            return;
        }

        try {
            obsConnectBtn.disabled = true;
            obsConnectBtn.textContent = 'Connecting...';
            
            let url = obsUrl.value.trim();
            if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
                url = 'ws://' + url;
            }
            
            window.reasoningConsole.logInfo(`Connecting to OBS at ${url}...`);
            
            await obsClient.connect(url, obsPassword.value);
            
        } catch (error) {
            window.reasoningConsole.logError('OBS connection failed: ' + error.message);
            updateOBSStatus(false);
        } finally {
            obsConnectBtn.disabled = false;
        }
    }

    async function detectGesture(gestureDescription) {
        if (!moondreamClient) return { detected: false, confidence: 0 };

        const prompt = `Look at this image carefully. Is there a ${gestureDescription} gesture clearly visible? Answer with only YES or NO.`;

        try {
            const result = await moondreamClient.askVideo(video, prompt);
            const answer = result.answer.toUpperCase().trim();
            const detected = answer.includes('YES');
            
            return { 
                detected, 
                confidence: detected ? 0.85 : 0.15,
                answer: result.answer
            };
        } catch (error) {
            window.reasoningConsole.logError(`Gesture detection error: ${error.message}`);
            return { detected: false, confidence: 0 };
        }
    }

    function canTriggerAction() {
        const now = Date.now();
        const cooldown = parseInt(cooldownTime.value) * 1000;
        
        if (now - lastActionTime < cooldown) {
            const remaining = Math.ceil((cooldown - (now - lastActionTime)) / 1000);
            window.reasoningConsole.logInfo(`Cooldown active: ${remaining}s remaining`);
            return false;
        }
        return true;
    }

    function updateLastAction(action) {
        lastActionTime = Date.now();
        lastActionEl.innerHTML = `Last action: <span class="action-text">${action}</span> <small>(just now)</small>`;
    }

    function addActivityLogEntry(gesture, action, type = 'success') {
        const emptyMsg = activityLog.querySelector('.activity-empty');
        if (emptyMsg) emptyMsg.remove();
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const item = document.createElement('div');
        item.className = `activity-item ${type}`;
        item.innerHTML = `<span>${gesture}</span> → <span>${action}</span> <span class="time">${time}</span>`;
        
        activityLog.insertBefore(item, activityLog.firstChild);
        
        while (activityLog.children.length > 10) {
            activityLog.removeChild(activityLog.lastChild);
        }
    }

    async function executeOBSAction(actionValue) {
        if (!actionValue || !obsClient.isConnected()) return false;

        const [type, value] = actionValue.split(':');
        
        try {
            if (type === 'scene') {
                return await obsClient.switchScene(value);
            } else if (type === 'cmd') {
                await obsClient.sendCommand(value);
                window.reasoningConsole.logAction('OBS Command', value);
                return true;
            }
        } catch (error) {
            window.reasoningConsole.logError(`Action failed: ${error.message}`);
            return false;
        }
        return false;
    }

    function updateGestureIndicator(indicator, detected) {
        if (detected) {
            indicator.classList.remove('not-detected');
            indicator.classList.add('detected');
        } else {
            indicator.classList.remove('detected');
            indicator.classList.add('not-detected');
        }
    }

    async function detectionLoop() {
        if (!isDetecting) return;

        const threshold = parseInt(confidenceThreshold.value) / 100;
        const requiredDebounce = parseInt(debounceCount.value);
        const interval = parseInt(detectionInterval.value);

        window.reasoningConsole.logApiCall('/query (gesture)', 0);

        const thumbsUp = await detectGesture('thumbs up');
        const thumbsDown = await detectGesture('thumbs down');

        updateGestureIndicator(thumbsUpIndicator, thumbsUp.detected);
        updateGestureIndicator(thumbsDownIndicator, thumbsDown.detected);

        if (thumbsUp.detected) {
            thumbsUpDetections++;
            window.reasoningConsole.logDetection('thumbs up', 1, thumbsUp.confidence);
        } else {
            thumbsUpDetections = 0;
        }

        if (thumbsDown.detected) {
            thumbsDownDetections++;
            window.reasoningConsole.logDetection('thumbs down', 1, thumbsDown.confidence);
        } else {
            thumbsDownDetections = 0;
        }

        if (thumbsUpDetections >= requiredDebounce && thumbsUpAction.value && canTriggerAction()) {
            window.reasoningConsole.logDecision('Thumbs Up Confirmed', `${thumbsUpDetections} consecutive detections`);
            
            const success = await executeOBSAction(thumbsUpAction.value);
            if (success) {
                const actionLabel = thumbsUpAction.options[thumbsUpAction.selectedIndex].text;
                updateLastAction(actionLabel);
                addActivityLogEntry('👍', actionLabel, 'success');
            }
            thumbsUpDetections = 0;
        }

        if (thumbsDownDetections >= requiredDebounce && thumbsDownAction.value && canTriggerAction()) {
            window.reasoningConsole.logDecision('Thumbs Down Confirmed', `${thumbsDownDetections} consecutive detections`);
            
            const success = await executeOBSAction(thumbsDownAction.value);
            if (success) {
                const actionLabel = thumbsDownAction.options[thumbsDownAction.selectedIndex].text;
                updateLastAction(actionLabel);
                addActivityLogEntry('👎', actionLabel, 'success');
            }
            thumbsDownDetections = 0;
        }

        if (isDetecting) {
            detectionLoopId = setTimeout(detectionLoop, interval);
        }
    }

    function startDetection() {
        if (!moondreamClient) {
            window.reasoningConsole.logError('Please configure Moondream API key first');
            window.apiKeyManager.showModal();
            return;
        }

        isDetecting = true;
        thumbsUpDetections = 0;
        thumbsDownDetections = 0;
        
        startDetectionBtn.disabled = true;
        stopDetectionBtn.disabled = false;
        
        window.reasoningConsole.logInfo('Gesture detection started');
        addActivityLogEntry('▶️', 'Detection started', 'info');
        detectionLoop();
    }

    function stopDetection() {
        isDetecting = false;
        
        if (detectionLoopId) {
            clearTimeout(detectionLoopId);
            detectionLoopId = null;
        }
        
        startDetectionBtn.disabled = false;
        stopDetectionBtn.disabled = true;
        
        updateGestureIndicator(thumbsUpIndicator, false);
        updateGestureIndicator(thumbsDownIndicator, false);
        
        window.reasoningConsole.logInfo('Gesture detection stopped');
        addActivityLogEntry('⏹️', 'Detection stopped', 'info');
    }

    cameraSelect.addEventListener('change', () => {
        const deviceId = cameraSelect.value;
        if (deviceId) {
            window.reasoningConsole.logInfo('Switching camera...');
            startCamera(deviceId);
        }
    });

    refreshCamerasBtn.addEventListener('click', async () => {
        window.reasoningConsole.logInfo('Refreshing camera list...');
        await enumerateCameras();
    });

    obsConnectBtn.addEventListener('click', connectOBS);

    confidenceThreshold.addEventListener('input', () => {
        confidenceValue.textContent = confidenceThreshold.value + '%';
    });

    startDetectionBtn.addEventListener('click', startDetection);
    stopDetectionBtn.addEventListener('click', stopDetection);

    if (window.location.protocol === 'file:') {
        document.getElementById('fileProtocolWarning').style.display = 'block';
        window.reasoningConsole.logError('Running from file:// - use a local server for WebSocket support');
    }

    document.getElementById('obsHelp').style.display = 'block';

    window.reasoningConsole.logInfo('Gesture Control initialized');
    window.reasoningConsole.logInfo('Module 3: From Understanding to Action');
    await startCamera();
});
