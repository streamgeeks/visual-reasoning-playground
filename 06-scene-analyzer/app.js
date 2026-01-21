document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const cameraSelect = document.getElementById('cameraSelect');
    const refreshCamerasBtn = document.getElementById('refreshCamerasBtn');
    const snapshotBtn = document.getElementById('snapshotBtn');
    const newSnapshotBtn = document.getElementById('newSnapshotBtn');
    const clearBtn = document.getElementById('clearBtn');
    const snapshotSection = document.getElementById('snapshotSection');
    const snapshotPreview = document.getElementById('snapshotPreview');
    const chatMessages = document.getElementById('chatMessages');
    const questionInput = document.getElementById('questionInput');
    const askBtn = document.getElementById('askBtn');
    const statusBar = document.getElementById('status');
    const questionCountSpan = document.getElementById('questionCount');
    const avgResponseSpan = document.getElementById('avgResponse');

    let client = null;
    let currentSnapshot = null;
    let questionCount = 0;
    let totalResponseTime = 0;
    let currentStream = null;

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

    window.reasoningConsole = new ReasoningConsole({ startCollapsed: false });

    if (window.apiKeyManager.hasMoondreamKey()) {
        client = new MoondreamClient(window.apiKeyManager.getMoondreamKey());
        window.reasoningConsole.logInfo('Loaded saved Moondream API key');
    }

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
            
            window.reasoningConsole.logInfo('Requesting camera access...');
            
            const constraints = {
                video: deviceId 
                    ? { deviceId: { exact: deviceId }, width: 1280, height: 720 }
                    : { width: 1280, height: 720 },
                audio: false
            };
            
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = currentStream;
            
            await enumerateCameras();
            if (deviceId) cameraSelect.value = deviceId;
            
            updateStatus('Camera ready - Take a snapshot to start');
            window.reasoningConsole.logInfo('Camera initialized successfully');
        } catch (error) {
            updateStatus('Camera error: ' + error.message, true);
            window.reasoningConsole.logError('Camera access failed: ' + error.message);
        }
    }

    cameraSelect.addEventListener('change', () => {
        if (cameraSelect.value) {
            startCamera(cameraSelect.value);
        }
    });

    refreshCamerasBtn.addEventListener('click', enumerateCameras);

    function updateStatus(message, isError = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }

    function takeSnapshot() {
        if (!window.apiKeyManager.hasMoondreamKey()) {
            updateStatus('Please configure API key', true);
            window.apiKeyManager.showModal();
            return;
        }

        currentSnapshot = client.captureFrame(video);
        snapshotPreview.src = currentSnapshot;
        snapshotSection.classList.remove('hidden');
        snapshotBtn.classList.add('hidden');
        
        addMessage('assistant', 'Snapshot captured! Now you can ask me questions about what I see.');
        updateStatus('Snapshot ready - Ask questions about the scene');
        window.reasoningConsole.logAction('Snapshot captured', 'Frame captured from video');
    }

    function addMessage(role, content, imageUrl = null) {
        const timestamp = new Date().toLocaleTimeString();
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        let html = `<p>${content}</p>`;
        if (imageUrl) {
            html += `<img src="${imageUrl}" class="snapshot-preview">`;
        }
        html += `<div class="timestamp">${timestamp}</div>`;
        
        messageDiv.innerHTML = html;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function askQuestion(question) {
        if (!currentSnapshot) {
            updateStatus('Please take a snapshot first', true);
            window.reasoningConsole.logError('No snapshot available');
            return;
        }

        if (!window.apiKeyManager.hasMoondreamKey()) {
            updateStatus('Please configure API key', true);
            window.apiKeyManager.showModal();
            return;
        }

        if (!question.trim()) return;

        addMessage('user', question);
        questionInput.value = '';
        askBtn.disabled = true;
        updateStatus('Thinking...');
        window.reasoningConsole.logInfo(`Processing question: "${question}"`);

        const startTime = Date.now();

        try {
            const result = await client.ask(currentSnapshot, question);
            const elapsed = Date.now() - startTime;

            window.reasoningConsole.logApiCall('/ask', elapsed);

            questionCount++;
            totalResponseTime += elapsed;
            questionCountSpan.textContent = questionCount;
            avgResponseSpan.textContent = Math.round(totalResponseTime / questionCount) + 'ms';

            addMessage('assistant', result.answer);
            updateStatus(`Answered in ${elapsed}ms`);
            window.reasoningConsole.logDecision('Answer generated', `Response time: ${elapsed}ms`);

        } catch (error) {
            addMessage('assistant', `Error: ${error.message}`);
            updateStatus('Error: ' + error.message, true);
            window.reasoningConsole.logError('Question failed: ' + error.message);
        } finally {
            askBtn.disabled = false;
        }
    }

    function clearChat() {
        chatMessages.innerHTML = `
            <div class="message assistant">
                <p>Chat cleared. Take a new snapshot to continue.</p>
            </div>
        `;
        currentSnapshot = null;
        snapshotSection.classList.add('hidden');
        snapshotBtn.classList.remove('hidden');
        updateStatus('Ready - Take a snapshot to start');
        window.reasoningConsole.logInfo('Chat cleared');
    }

    snapshotBtn.addEventListener('click', takeSnapshot);
    newSnapshotBtn.addEventListener('click', takeSnapshot);
    clearBtn.addEventListener('click', clearChat);
    
    askBtn.addEventListener('click', () => askQuestion(questionInput.value));
    questionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') askQuestion(questionInput.value);
    });

    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => askQuestion(btn.dataset.q));
    });

    await startCamera();
});
