document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const trackingOverlay = document.getElementById('trackingOverlay');
    const ctx = trackingOverlay.getContext('2d');
    const cameraSelect = document.getElementById('cameraSelect');
    const refreshCamerasBtn = document.getElementById('refreshCamerasBtn');
    const micIcon = document.getElementById('micIcon');
    const audioState = document.getElementById('audioState');
    const liveTranscript = document.getElementById('liveTranscript');
    const waveform = document.getElementById('waveform');
    const commandEntries = document.getElementById('commandEntries');
    const ptzIPInput = document.getElementById('ptzIP');
    const obsHostInput = document.getElementById('obsHost');
    const obsPasswordInput = document.getElementById('obsPassword');
    const ptzStatus = document.getElementById('ptzStatus');
    const obsStatus = document.getElementById('obsStatus');
    const connectBtn = document.getElementById('connectBtn');
    const trackingTargetInput = document.getElementById('trackingTarget');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const statusBar = document.getElementById('status');
    const commandCountSpan = document.getElementById('commandCount');
    const trackingCountSpan = document.getElementById('trackingCount');

    let moondreamClient = null;
    let ptzController = null;
    let obsController = null;
    let audioProcessor = null;
    let intentParser = null;
    let commandHandler = null;
    
    let isRunning = false;
    let trackingLoopId = null;
    let commandCount = 0;
    let trackingCount = 0;
    let currentMode = 'voice';
    let currentStream = null;

    window.apiKeyManager = new APIKeyManager({
        requireMoondream: true,
        requireOpenAI: true,
        onKeysChanged: (keys) => {
            if (keys.moondream) {
                moondreamClient = new MoondreamClient(keys.moondream);
            }
            if (keys.openai && audioProcessor) {
                audioProcessor.setOpenAIKey(keys.openai);
            }
        }
    });

    window.reasoningConsole = new ReasoningConsole({ startCollapsed: false });

    if (window.apiKeyManager.hasMoondreamKey()) {
        moondreamClient = new MoondreamClient(window.apiKeyManager.getMoondreamKey());
    }

    const savedPtzIP = localStorage.getItem('ptz_camera_ip');
    if (savedPtzIP) ptzIPInput.value = savedPtzIP;

    const savedObsHost = localStorage.getItem('obs_host');
    if (savedObsHost) obsHostInput.value = savedObsHost;

    intentParser = new IntentParser();

    async function enumerateCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            
            cameraSelect.innerHTML = '';
            videoDevices.forEach((device, i) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Camera ${i + 1}`;
                cameraSelect.appendChild(option);
            });
            
            window.reasoningConsole.logInfo(`Found ${videoDevices.length} camera(s)`);
        } catch (error) {
            window.reasoningConsole.logError('Failed to enumerate cameras: ' + error.message);
        }
    }

    async function startCamera(deviceId = null) {
        try {
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }
            
            const constraints = {
                video: deviceId 
                    ? { deviceId: { exact: deviceId }, width: 1280, height: 720 }
                    : { width: 1280, height: 720 },
                audio: false
            };
            
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = currentStream;
            
            await new Promise(resolve => { video.onloadedmetadata = resolve; });
            
            trackingOverlay.width = video.videoWidth;
            trackingOverlay.height = video.videoHeight;
            
            await enumerateCameras();
            if (deviceId) cameraSelect.value = deviceId;
            
            window.reasoningConsole.logInfo('Camera started');
        } catch (error) {
            updateStatus('Camera error: ' + error.message, true);
        }
    }

    cameraSelect.addEventListener('change', () => {
        if (cameraSelect.value) {
            startCamera(cameraSelect.value);
        }
    });

    refreshCamerasBtn.addEventListener('click', enumerateCameras);

    async function connectAll() {
        connectBtn.disabled = true;
        
        const ptzIP = ptzIPInput.value.trim();
        if (ptzIP) {
            localStorage.setItem('ptz_camera_ip', ptzIP);
            ptzController = new PTZController(ptzIP);
            
            try {
                await ptzController.stop();
                ptzStatus.textContent = 'Connected';
                ptzStatus.className = 'status connected';
                window.reasoningConsole.logInfo(`PTZ connected at ${ptzIP}`);
            } catch (e) {
                ptzStatus.textContent = 'Connection failed';
                ptzStatus.className = 'status disconnected';
            }
        }

        const obsHost = obsHostInput.value.trim() || 'localhost:4455';
        localStorage.setItem('obs_host', obsHost);
        obsController = new OBSController();
        
        obsController.onStatusChange = (connected) => {
            obsStatus.textContent = connected ? 'Connected' : 'Disconnected';
            obsStatus.className = connected ? 'status connected' : 'status disconnected';
        };

        try {
            await obsController.connect(obsHost, obsPasswordInput.value);
            window.reasoningConsole.logInfo('OBS connected');
        } catch (e) {
            obsStatus.textContent = 'Connection failed';
            obsStatus.className = 'status disconnected';
            window.reasoningConsole.logError('OBS: ' + e.message);
        }

        commandHandler = new CommandHandler({
            ptzController,
            obsController,
            onCommandExecuted: (info) => {
                logCommand(info.intent, 'Executed', false);
                commandCount++;
                commandCountSpan.textContent = commandCount;
            },
            onError: (info) => {
                logCommand(info.intent, info.error, true);
            },
            onTrackingStateChange: (enabled) => {
                updateStatus(enabled ? 'Tracking enabled' : 'Tracking disabled');
            }
        });

        connectBtn.disabled = false;
        updateStatus('Connections established');
    }

    async function initAudio() {
        audioProcessor = new AudioProcessor({
            wakeWord: 'hey studio',
            openAIKey: window.apiKeyManager.getOpenAIKey(),
            onStateChange: handleAudioStateChange,
            onTranscript: handleTranscript,
            onWakeWord: handleWakeWord,
            onCommand: handleCommand,
            onAudioLevel: handleAudioLevel
        });

        try {
            await audioProcessor.initialize();
            window.reasoningConsole.logInfo('Audio processor ready');
        } catch (error) {
            window.reasoningConsole.logError('Audio init failed: ' + error.message);
            throw error;
        }
    }

    function handleAudioStateChange(state) {
        micIcon.className = 'mic-icon';
        
        switch (state) {
            case 'listening':
                micIcon.classList.add('listening');
                audioState.textContent = 'Listening for "Hey Studio"...';
                break;
            case 'wake-detected':
                micIcon.classList.add('wake-detected');
                audioState.textContent = 'Wake word detected!';
                break;
            case 'processing':
                micIcon.classList.add('processing');
                audioState.textContent = 'Processing command...';
                break;
            case 'awaiting-command':
                micIcon.classList.add('wake-detected');
                audioState.textContent = 'Listening for command...';
                break;
            default:
                audioState.textContent = state.charAt(0).toUpperCase() + state.slice(1);
        }
    }

    function handleTranscript(text, isInterim) {
        liveTranscript.textContent = text;
        liveTranscript.style.opacity = isInterim ? 0.6 : 1;
    }

    function handleWakeWord() {
        window.reasoningConsole.logAction('Wake Word', 'Hey Studio detected');
    }

    async function handleCommand(commandText) {
        window.reasoningConsole.logInfo(`Command: "${commandText}"`);
        
        const parsed = intentParser.parse(commandText);
        
        if (parsed.intent === 'unknown') {
            logCommand(commandText, 'Unknown command', true);
            window.reasoningConsole.logError(`Unknown command: ${commandText}`);
            return;
        }

        window.reasoningConsole.logDecision('Intent', `${parsed.intent} (${parsed.action})`);

        try {
            await commandHandler.execute(parsed);
        } catch (error) {
            window.reasoningConsole.logError('Execution failed: ' + error.message);
        }
    }

    function handleAudioLevel(level, dataArray) {
        const bars = waveform.querySelectorAll('.bar');
        bars.forEach((bar, i) => {
            const height = 5 + (dataArray[i * 4] || 0) / 4;
            bar.style.height = `${Math.min(height, 40)}px`;
        });
    }

    function logCommand(command, action, isError = false) {
        const time = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'command-entry' + (isError ? ' error' : '');
        entry.innerHTML = `
            <span class="time">${time}</span>
            <span class="command">${command}</span>
            <span class="action">${action}</span>
        `;
        
        commandEntries.insertBefore(entry, commandEntries.firstChild);
        
        while (commandEntries.children.length > 20) {
            commandEntries.removeChild(commandEntries.lastChild);
        }
    }

    async function startAssistant() {
        if (!moondreamClient) {
            updateStatus('Configure Moondream API key', true);
            window.apiKeyManager.showModal();
            return;
        }

        try {
            await initAudio();
        } catch (e) {
            updateStatus('Microphone access required', true);
            return;
        }

        isRunning = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;

        audioProcessor.start();
        
        if (currentMode === 'tracking' || currentMode === 'both') {
            commandHandler.setTrackingEnabled(true);
            startTrackingLoop();
        }

        updateStatus('Assistant running - say "Hey Studio" followed by a command');
        window.reasoningConsole.logAction('Assistant', 'Started');
    }

    function stopAssistant() {
        isRunning = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;

        if (audioProcessor) {
            audioProcessor.stop();
        }

        if (trackingLoopId) {
            clearTimeout(trackingLoopId);
            trackingLoopId = null;
        }

        commandHandler?.setTrackingEnabled(false);
        clearOverlay();

        updateStatus('Assistant stopped');
        window.reasoningConsole.logAction('Assistant', 'Stopped');
    }

    async function startTrackingLoop() {
        if (!isRunning || !commandHandler?.isTrackingEnabled()) return;
        if (!ptzController) return;

        const target = trackingTargetInput.value.trim() || 'person';

        try {
            const imageData = moondreamClient.captureFrame(video);
            const result = await moondreamClient.detect(imageData, target);

            clearOverlay();

            if (result.objects && result.objects.length > 0) {
                const obj = result.objects[0];
                drawTrackingBox(obj);
                
                await ptzController.moveToCenter(obj.x, obj.y, (msg) => {
                    window.reasoningConsole.logInfo(msg);
                });

                trackingCount++;
                trackingCountSpan.textContent = trackingCount;
            }
        } catch (error) {
            window.reasoningConsole.logError('Tracking error: ' + error.message);
        }

        if (isRunning && commandHandler?.isTrackingEnabled()) {
            trackingLoopId = setTimeout(startTrackingLoop, 500);
        }
    }

    function drawTrackingBox(obj) {
        const x = obj.x_min * trackingOverlay.width;
        const y = obj.y_min * trackingOverlay.height;
        const w = obj.width * trackingOverlay.width;
        const h = obj.height * trackingOverlay.height;

        ctx.strokeStyle = '#2A9D8F';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = 'rgba(42, 157, 143, 0.15)';
        ctx.fillRect(x, y, w, h);

        ctx.fillStyle = '#2A9D8F';
        ctx.fillRect(x, y - 20, 80, 20);
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.fillText('TRACKING', x + 8, y - 6);
    }

    function clearOverlay() {
        ctx.clearRect(0, 0, trackingOverlay.width, trackingOverlay.height);
    }

    function updateStatus(message, isError = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            
            if (commandHandler) {
                const shouldTrack = currentMode === 'tracking' || currentMode === 'both';
                commandHandler.setTrackingEnabled(shouldTrack);
                
                if (shouldTrack && isRunning) {
                    startTrackingLoop();
                } else {
                    clearOverlay();
                }
            }
        });
    });

    connectBtn.addEventListener('click', connectAll);
    startBtn.addEventListener('click', startAssistant);
    stopBtn.addEventListener('click', stopAssistant);

    await startCamera();
});
