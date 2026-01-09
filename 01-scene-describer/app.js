document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const apiKeyInput = document.getElementById('apiKey');
    const maxTokensSlider = document.getElementById('maxTokens');
    const maxTokensValue = document.getElementById('maxTokensValue');
    const autoDescribeCheckbox = document.getElementById('autoDescribe');
    const autoIntervalInput = document.getElementById('autoInterval');
    const describeBtn = document.getElementById('describeBtn');
    const descriptionDiv = document.getElementById('description');
    const historyDiv = document.getElementById('history');
    const historyList = document.getElementById('historyList');
    const statusBar = document.getElementById('status');
    const apiCallsSpan = document.getElementById('apiCalls');
    const avgTimeSpan = document.getElementById('avgTime');

    let client = null;
    let autoDescribeInterval = null;
    let apiCallCount = 0;
    let totalTime = 0;
    let history = [];

    function loadSettings() {
        const savedKey = localStorage.getItem('moondreamApiKey');
        if (savedKey) {
            apiKeyInput.value = savedKey;
            client = new MoondreamClient(savedKey);
        }
    }

    function saveSettings() {
        localStorage.setItem('moondreamApiKey', apiKeyInput.value);
    }

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, facingMode: 'environment' },
                audio: false
            });
            video.srcObject = stream;
            updateStatus('Camera ready');
        } catch (error) {
            updateStatus('Camera error: ' + error.message, true);
        }
    }

    function updateStatus(message, isError = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }

    async function describeScene() {
        if (!client || !apiKeyInput.value) {
            updateStatus('Please enter your API key', true);
            return;
        }

        client.setApiKey(apiKeyInput.value);
        saveSettings();

        describeBtn.disabled = true;
        updateStatus('Analyzing scene...');

        const startTime = Date.now();

        try {
            const maxTokens = parseInt(maxTokensSlider.value);
            const result = await client.describeVideo(video, { maxTokens });
            const elapsed = Date.now() - startTime;

            apiCallCount++;
            totalTime += elapsed;
            apiCallsSpan.textContent = apiCallCount;
            avgTimeSpan.textContent = Math.round(totalTime / apiCallCount) + 'ms';

            displayDescription(result.description, elapsed);
            addToHistory(result.description);
            updateStatus(`Described in ${elapsed}ms`);

        } catch (error) {
            updateStatus('Error: ' + error.message, true);
        } finally {
            describeBtn.disabled = false;
        }
    }

    function displayDescription(text, time) {
        descriptionDiv.innerHTML = `
            <p class="timestamp">Just now (${time}ms)</p>
            <p class="content">${text}</p>
        `;
    }

    function addToHistory(text) {
        const timestamp = new Date().toLocaleTimeString();
        history.unshift({ text, timestamp });
        
        if (history.length > 10) history.pop();
        
        if (history.length > 1) {
            historyDiv.classList.remove('hidden');
            historyList.innerHTML = history.slice(1).map(item => `
                <div class="result-item">
                    <p class="timestamp">${item.timestamp}</p>
                    <p class="content">${item.text}</p>
                </div>
            `).join('');
        }
    }

    function toggleAutoDescribe() {
        if (autoDescribeCheckbox.checked) {
            const interval = parseInt(autoIntervalInput.value) * 1000;
            autoDescribeInterval = setInterval(describeScene, interval);
            updateStatus(`Auto-describing every ${autoIntervalInput.value}s`);
        } else {
            clearInterval(autoDescribeInterval);
            autoDescribeInterval = null;
            updateStatus('Auto-describe stopped');
        }
    }

    maxTokensSlider.addEventListener('input', () => {
        maxTokensValue.textContent = maxTokensSlider.value;
    });

    apiKeyInput.addEventListener('change', () => {
        client = new MoondreamClient(apiKeyInput.value);
        saveSettings();
    });

    describeBtn.addEventListener('click', describeScene);
    autoDescribeCheckbox.addEventListener('change', toggleAutoDescribe);
    autoIntervalInput.addEventListener('change', () => {
        if (autoDescribeCheckbox.checked) {
            toggleAutoDescribe();
            toggleAutoDescribe();
        }
    });

    loadSettings();
    await startCamera();
});
