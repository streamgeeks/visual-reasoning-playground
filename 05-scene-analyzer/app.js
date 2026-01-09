document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const apiKeyInput = document.getElementById('apiKey');
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

    function loadSettings() {
        const savedKey = localStorage.getItem('moondreamApiKey');
        if (savedKey) apiKeyInput.value = savedKey;
        client = new MoondreamClient(savedKey);
    }

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: false
            });
            video.srcObject = stream;
            updateStatus('Camera ready - Take a snapshot to start');
        } catch (error) {
            updateStatus('Camera error: ' + error.message, true);
        }
    }

    function updateStatus(message, isError = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }

    function takeSnapshot() {
        client.setApiKey(apiKeyInput.value);
        localStorage.setItem('moondreamApiKey', apiKeyInput.value);

        currentSnapshot = client.captureFrame(video);
        snapshotPreview.src = currentSnapshot;
        snapshotSection.classList.remove('hidden');
        snapshotBtn.classList.add('hidden');
        
        addMessage('assistant', 'Snapshot captured! Now you can ask me questions about what I see.');
        updateStatus('Snapshot ready - Ask questions about the scene');
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
            return;
        }

        if (!apiKeyInput.value) {
            updateStatus('Please enter API key', true);
            return;
        }

        if (!question.trim()) return;

        client.setApiKey(apiKeyInput.value);
        addMessage('user', question);
        questionInput.value = '';
        askBtn.disabled = true;
        updateStatus('Thinking...');

        const startTime = Date.now();

        try {
            const result = await client.ask(currentSnapshot, question);
            const elapsed = Date.now() - startTime;

            questionCount++;
            totalResponseTime += elapsed;
            questionCountSpan.textContent = questionCount;
            avgResponseSpan.textContent = Math.round(totalResponseTime / questionCount) + 'ms';

            addMessage('assistant', result.answer);
            updateStatus(`Answered in ${elapsed}ms`);

        } catch (error) {
            addMessage('assistant', `Error: ${error.message}`);
            updateStatus('Error: ' + error.message, true);
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

    apiKeyInput.addEventListener('change', () => {
        localStorage.setItem('moondreamApiKey', apiKeyInput.value);
        client.setApiKey(apiKeyInput.value);
    });

    loadSettings();
    await startCamera();
});
