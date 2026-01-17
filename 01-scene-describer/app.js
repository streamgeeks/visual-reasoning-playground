document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const cameraSelect = document.getElementById('cameraSelect');
    const refreshCamerasBtn = document.getElementById('refreshCamerasBtn');
    const maxTokensSlider = document.getElementById('maxTokens');
    const maxTokensValue = document.getElementById('maxTokensValue');
    const autoDescribeCheckbox = document.getElementById('autoDescribe');
    const autoIntervalInput = document.getElementById('autoInterval');
    const describeBtn = document.getElementById('describeBtn');
    const askBtn = document.getElementById('askBtn');
    const questionInput = document.getElementById('questionInput');
    const descriptionDiv = document.getElementById('description');
    const descriptionTimestamp = document.getElementById('descriptionTimestamp');
    const qaContent = document.getElementById('qaContent');
    const jsonOutput = document.getElementById('jsonOutput');
    const statusBar = document.getElementById('status');

    let client = null;
    let autoDescribeInterval = null;
    let currentStream = null;

    window.reasoningConsole = new ReasoningConsole({
        startCollapsed: false
    });

    const TOOL_ID = 'scene-describer';
    
    function loadSavedPreferences() {
        if (window.VRPPrefs) {
            const savedMaxTokens = VRPPrefs.getToolPref(TOOL_ID, 'maxTokens', 200);
            const savedAutoDescribe = VRPPrefs.getToolPref(TOOL_ID, 'autoDescribe', false);
            const savedAutoInterval = VRPPrefs.getToolPref(TOOL_ID, 'autoInterval', 5);
            
            maxTokensSlider.value = savedMaxTokens;
            maxTokensValue.textContent = savedMaxTokens;
            autoDescribeCheckbox.checked = savedAutoDescribe;
            autoIntervalInput.value = savedAutoInterval;
            
            if (savedAutoDescribe) {
                setTimeout(toggleAutoDescribe, 2000);
            }
        }
    }
    
    function savePreference(key, value) {
        if (window.VRPPrefs) {
            VRPPrefs.setToolPref(TOOL_ID, key, value);
        }
    }

    window.apiKeyManager = new APIKeyManager({
        requireMoondream: true,
        requireOpenAI: false,
        onKeysChanged: (keys) => {
            if (keys.moondream) {
                client = new MoondreamClient(keys.moondream);
                window.reasoningConsole.logInfo('Moondream API key configured');
                updateStatus('Ready to describe scenes', 'success');
            }
        }
    });

    if (window.apiKeyManager.hasMoondreamKey()) {
        client = new MoondreamClient(window.apiKeyManager.getMoondreamKey());
    }

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
            updateStatus('Connecting to camera...');
            
            const constraints = {
                video: deviceId 
                    ? { deviceId: { exact: deviceId }, width: 1280, height: 720 }
                    : { width: 1280, height: 720, facingMode: 'environment' },
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
            updateStatus('Camera ready', 'success');
        } catch (error) {
            window.reasoningConsole.logError('Camera access denied: ' + error.message);
            updateStatus('Camera error: ' + error.message, 'error');
        }
    }

    function updateStatus(message, type = '') {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (type ? ' ' + type : '');
    }

    function updateJsonOutput(data) {
        jsonOutput.textContent = JSON.stringify(data, null, 2);
    }

    function formatTimestamp() {
        return new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    }

    async function describeScene() {
        if (!client) {
            window.reasoningConsole.logError('No API key configured');
            updateStatus('Please configure your Moondream API key', 'error');
            window.apiKeyManager.showModal();
            return;
        }

        describeBtn.disabled = true;
        updateStatus('Analyzing scene...');
        window.reasoningConsole.logInfo('Capturing frame from video...');

        const startTime = Date.now();

        try {
            const maxTokens = parseInt(maxTokensSlider.value);
            
            window.reasoningConsole.logApiCall('/describe', 0);
            
            const result = await client.describeVideo(video, { maxTokens });
            const elapsed = Date.now() - startTime;

            window.reasoningConsole.logSceneDescription(result.description, elapsed);
            window.reasoningConsole.logDecision('Description complete', `${result.description.split(' ').length} words in ${elapsed}ms`);

            descriptionDiv.textContent = result.description;
            descriptionDiv.classList.remove('placeholder');
            descriptionTimestamp.textContent = `${formatTimestamp()} (${elapsed}ms)`;

            updateJsonOutput({
                type: 'scene_description',
                timestamp: new Date().toISOString(),
                latency_ms: elapsed,
                tokens_requested: maxTokens,
                response: {
                    description: result.description,
                    word_count: result.description.split(' ').length
                },
                raw: result.raw
            });

            updateStatus(`Described in ${elapsed}ms`, 'success');

        } catch (error) {
            window.reasoningConsole.logError(error.message);
            updateStatus('Error: ' + error.message, 'error');
            
            updateJsonOutput({
                type: 'error',
                timestamp: new Date().toISOString(),
                error: error.message
            });
        } finally {
            describeBtn.disabled = false;
        }
    }

    async function askQuestion() {
        const question = questionInput.value.trim();
        
        if (!question) {
            window.reasoningConsole.logError('Please enter a question');
            return;
        }

        if (!client) {
            window.reasoningConsole.logError('No API key configured');
            updateStatus('Please configure your Moondream API key', 'error');
            window.apiKeyManager.showModal();
            return;
        }

        askBtn.disabled = true;
        questionInput.disabled = true;
        updateStatus('Processing question...');
        window.reasoningConsole.logInfo(`Question: "${question}"`);

        const startTime = Date.now();

        try {
            window.reasoningConsole.logApiCall('/ask', 0);
            
            const result = await client.askVideo(video, question);
            const elapsed = Date.now() - startTime;

            window.reasoningConsole.logDecision('Answer received', `${elapsed}ms`);

            qaContent.innerHTML = `
                <div style="margin-bottom: 8px; color: var(--text-muted);">
                    <strong>Q:</strong> ${question}
                </div>
                <div>
                    <strong>A:</strong> ${result.answer}
                </div>
                <div style="margin-top: 8px; font-size: 0.8rem; color: var(--text-muted);">
                    ${formatTimestamp()} (${elapsed}ms)
                </div>
            `;
            qaContent.classList.remove('placeholder');

            updateJsonOutput({
                type: 'question_answer',
                timestamp: new Date().toISOString(),
                latency_ms: elapsed,
                request: {
                    question: question
                },
                response: {
                    answer: result.answer
                },
                raw: result.raw
            });

            updateStatus(`Answered in ${elapsed}ms`, 'success');

        } catch (error) {
            window.reasoningConsole.logError(error.message);
            updateStatus('Error: ' + error.message, 'error');
            
            updateJsonOutput({
                type: 'error',
                timestamp: new Date().toISOString(),
                question: question,
                error: error.message
            });
        } finally {
            askBtn.disabled = false;
            questionInput.disabled = false;
        }
    }

    function toggleAutoDescribe() {
        if (autoDescribeCheckbox.checked) {
            const interval = parseInt(autoIntervalInput.value) * 1000;
            autoDescribeInterval = setInterval(describeScene, interval);
            window.reasoningConsole.logInfo(`Auto-describe enabled: every ${autoIntervalInput.value}s`);
            updateStatus(`Auto-describing every ${autoIntervalInput.value}s`);
        } else {
            clearInterval(autoDescribeInterval);
            autoDescribeInterval = null;
            window.reasoningConsole.logInfo('Auto-describe disabled');
            updateStatus('Auto-describe stopped');
        }
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

    maxTokensSlider.addEventListener('input', () => {
        maxTokensValue.textContent = maxTokensSlider.value;
        savePreference('maxTokens', parseInt(maxTokensSlider.value));
    });

    describeBtn.addEventListener('click', describeScene);
    askBtn.addEventListener('click', askQuestion);
    
    questionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            askQuestion();
        }
    });

    autoDescribeCheckbox.addEventListener('change', () => {
        savePreference('autoDescribe', autoDescribeCheckbox.checked);
        toggleAutoDescribe();
    });
    autoIntervalInput.addEventListener('change', () => {
        savePreference('autoInterval', parseInt(autoIntervalInput.value));
        if (autoDescribeCheckbox.checked) {
            clearInterval(autoDescribeInterval);
            toggleAutoDescribe();
        }
    });

    window.reasoningConsole.logInfo('Scene Describer initialized');
    window.reasoningConsole.logInfo('Module 1: Foundations of Visual Reasoning AI');
    
    loadSavedPreferences();
    await startCamera();
});
