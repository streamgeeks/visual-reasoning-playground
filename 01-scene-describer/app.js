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
    let autoDetectInterval = null;
    let currentStream = null;

    const DEFAULT_COLORS = ['#93CCEA', '#2A9D8F', '#E9C46A', '#E76F51', '#9B5DE5'];
    const MAX_DETECTIONS = 5;
    let detections = [];
    let detectionResults = {};
    
    const detectionCanvas = document.getElementById('detectionCanvas');
    const detectionCtx = detectionCanvas.getContext('2d');
    const detectionList = document.getElementById('detectionList');
    const addDetectionBtn = document.getElementById('addDetectionBtn');
    const detectNowBtn = document.getElementById('detectNowBtn');
    const autoDetectCheckbox = document.getElementById('autoDetect');
    const detectionToggle = document.getElementById('detectionToggle');
    const detectionSection = document.querySelector('.detection-section');

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

    detectionToggle.addEventListener('click', () => {
        detectionSection.classList.toggle('collapsed');
        savePreference('detectionCollapsed', detectionSection.classList.contains('collapsed'));
    });

    function getNextColor() {
        return DEFAULT_COLORS[detections.length % DEFAULT_COLORS.length];
    }

    function createDetectionRow(target = '', color = null, enabled = true) {
        const id = Date.now() + Math.random();
        const rowColor = color || getNextColor();
        
        const row = document.createElement('div');
        row.className = 'detection-row';
        row.dataset.id = id;
        
        row.innerHTML = `
            <input type="text" placeholder="e.g., person, red car, coffee mug" value="${target}">
            <input type="color" value="${rowColor}">
            <label class="toggle-switch">
                <input type="checkbox" ${enabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </label>
            <button class="btn-delete-detection">✕</button>
        `;
        
        const textInput = row.querySelector('input[type="text"]');
        const colorInput = row.querySelector('input[type="color"]');
        const toggleInput = row.querySelector('input[type="checkbox"]');
        const deleteBtn = row.querySelector('.btn-delete-detection');
        
        textInput.addEventListener('input', () => {
            updateDetectionData();
            clearDetectionResults(id);
        });
        colorInput.addEventListener('input', () => {
            updateDetectionData();
            drawDetectionBoxes();
        });
        toggleInput.addEventListener('change', () => {
            updateDetectionData();
            drawDetectionBoxes();
        });
        deleteBtn.addEventListener('click', () => {
            row.remove();
            delete detectionResults[id];
            updateDetectionData();
            drawDetectionBoxes();
            updateAddButton();
        });
        
        detectionList.appendChild(row);
        updateDetectionData();
        updateAddButton();
        
        return row;
    }

    function updateDetectionData() {
        detections = [];
        const rows = detectionList.querySelectorAll('.detection-row');
        rows.forEach(row => {
            const id = row.dataset.id;
            const target = row.querySelector('input[type="text"]').value.trim();
            const color = row.querySelector('input[type="color"]').value;
            const enabled = row.querySelector('input[type="checkbox"]').checked;
            detections.push({ id, target, color, enabled });
        });
        savePreference('detections', detections);
    }

    function clearDetectionResults(id) {
        delete detectionResults[id];
        drawDetectionBoxes();
    }

    function updateAddButton() {
        addDetectionBtn.disabled = detections.length >= MAX_DETECTIONS;
    }

    function resizeCanvas() {
        const rect = video.getBoundingClientRect();
        detectionCanvas.width = rect.width;
        detectionCanvas.height = rect.height;
        drawDetectionBoxes();
    }

    function drawDetectionBoxes() {
        detectionCtx.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
        
        const canvasWidth = detectionCanvas.width;
        const canvasHeight = detectionCanvas.height;
        
        detections.forEach(detection => {
            if (!detection.enabled || !detection.target) return;
            
            const results = detectionResults[detection.id];
            if (!results || !results.objects || results.objects.length === 0) return;
            
            const count = results.objects.length;
            
            results.objects.forEach((obj, idx) => {
                const x = obj.x_min * canvasWidth;
                const y = obj.y_min * canvasHeight;
                const width = (obj.x_max - obj.x_min) * canvasWidth;
                const height = (obj.y_max - obj.y_min) * canvasHeight;
                
                detectionCtx.strokeStyle = detection.color;
                detectionCtx.lineWidth = 4;
                detectionCtx.strokeRect(x, y, width, height);
                
                const labelText = count > 1 ? `${detection.target} (${idx + 1})` : detection.target;
                detectionCtx.font = 'bold 14px system-ui, -apple-system, sans-serif';
                const textMetrics = detectionCtx.measureText(labelText);
                const labelPadX = 10;
                const labelPadY = 6;
                const labelHeight = 14 + labelPadY * 2;
                const labelWidth = textMetrics.width + labelPadX * 2;
                
                const labelX = x;
                const labelY = y - labelHeight;
                
                detectionCtx.fillStyle = detection.color;
                detectionCtx.beginPath();
                detectionCtx.roundRect(labelX, labelY, labelWidth, labelHeight, 4);
                detectionCtx.fill();
                
                detectionCtx.fillStyle = '#FFFFFF';
                detectionCtx.fillText(labelText, labelX + labelPadX, labelY + labelPadY + 12);
            });
        });
    }

    async function runDetection() {
        if (!client) {
            window.reasoningConsole.logError('No API key configured');
            updateStatus('Please configure your Moondream API key', 'error');
            window.apiKeyManager.showModal();
            return;
        }
        
        const activeDetections = detections.filter(d => d.enabled && d.target);
        if (activeDetections.length === 0) {
            window.reasoningConsole.logInfo('No active detections configured');
            return;
        }
        
        detectNowBtn.disabled = true;
        updateStatus('Running detection...');
        
        const startTime = Date.now();
        
        try {
            const promises = activeDetections.map(async (detection) => {
                try {
                    const result = await client.detectInVideo(video, detection.target);
                    detectionResults[detection.id] = result;
                    window.reasoningConsole.logInfo(`Detected ${result.objects.length} "${detection.target}"`);
                    return { id: detection.id, success: true, count: result.objects.length };
                } catch (error) {
                    window.reasoningConsole.logError(`Detection failed for "${detection.target}": ${error.message}`);
                    return { id: detection.id, success: false, error: error.message };
                }
            });
            
            const results = await Promise.all(promises);
            const elapsed = Date.now() - startTime;
            
            drawDetectionBoxes();
            
            const successCount = results.filter(r => r.success).length;
            const totalObjects = results.filter(r => r.success).reduce((sum, r) => sum + r.count, 0);
            
            updateStatus(`Detected ${totalObjects} object(s) across ${successCount} target(s) in ${elapsed}ms`, 'success');
            window.reasoningConsole.logDecision('Detection complete', `${totalObjects} objects found in ${elapsed}ms`);
            
            updateJsonOutput({
                type: 'object_detection',
                timestamp: new Date().toISOString(),
                latency_ms: elapsed,
                detections: activeDetections.map(d => ({
                    target: d.target,
                    color: d.color,
                    results: detectionResults[d.id]
                }))
            });
            
        } catch (error) {
            window.reasoningConsole.logError(error.message);
            updateStatus('Detection error: ' + error.message, 'error');
        } finally {
            detectNowBtn.disabled = false;
        }
    }

    function toggleAutoDetect() {
        if (autoDetectCheckbox.checked) {
            const interval = parseInt(autoIntervalInput.value) * 1000;
            autoDetectInterval = setInterval(runDetection, interval);
            window.reasoningConsole.logInfo(`Auto-detect enabled: every ${autoIntervalInput.value}s`);
        } else {
            clearInterval(autoDetectInterval);
            autoDetectInterval = null;
            window.reasoningConsole.logInfo('Auto-detect disabled');
        }
    }

    addDetectionBtn.addEventListener('click', () => {
        if (detections.length < MAX_DETECTIONS) {
            createDetectionRow();
        }
    });

    detectNowBtn.addEventListener('click', runDetection);
    
    autoDetectCheckbox.addEventListener('change', () => {
        savePreference('autoDetect', autoDetectCheckbox.checked);
        toggleAutoDetect();
    });

    video.addEventListener('loadedmetadata', resizeCanvas);
    video.addEventListener('resize', resizeCanvas);
    window.addEventListener('resize', resizeCanvas);

    function loadDetectionPreferences() {
        if (window.VRPPrefs) {
            const collapsed = VRPPrefs.getToolPref(TOOL_ID, 'detectionCollapsed', false);
            const savedDetections = VRPPrefs.getToolPref(TOOL_ID, 'detections', []);
            const savedAutoDetect = VRPPrefs.getToolPref(TOOL_ID, 'autoDetect', false);
            
            if (collapsed) {
                detectionSection.classList.add('collapsed');
            }
            
            if (savedDetections.length > 0) {
                savedDetections.forEach(d => {
                    createDetectionRow(d.target, d.color, d.enabled);
                });
            }
            
            autoDetectCheckbox.checked = savedAutoDetect;
            if (savedAutoDetect) {
                setTimeout(toggleAutoDetect, 2500);
            }
        }
    }
    
    loadDetectionPreferences();
    setTimeout(resizeCanvas, 500);

    if (window.VideoSourceAdapter) {
        VideoSourceAdapter.init({
            videoElement: video,
            toolId: 'scene-describer',
            insertInto: '.camera-controls',
            onSourceChange: (source) => {
                cameraSelect.disabled = source === 'sample';
                refreshCamerasBtn.disabled = source === 'sample';
                if (source === 'camera') {
                    enumerateCameras();
                }
                window.reasoningConsole.logInfo(`Switched to ${source === 'camera' ? 'live camera' : 'sample video'}`);
                updateStatus(source === 'camera' ? 'Camera ready' : 'Using sample video', 'success');
            }
        });
        await VideoSourceAdapter.switchToCamera().catch(() => {
            VideoSourceAdapter.switchToSample();
        });
    } else {
        await startCamera();
    }
});
