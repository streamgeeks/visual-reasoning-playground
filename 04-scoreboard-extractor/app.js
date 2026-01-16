document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const cameraSelect = document.getElementById('cameraSelect');
    const refreshCamerasBtn = document.getElementById('refreshCamerasBtn');
    
    const homeScoreEl = document.getElementById('homeScore');
    const awayScoreEl = document.getElementById('awayScore');
    const gameTimeEl = document.getElementById('gameTime');
    const jsonOutput = document.getElementById('jsonOutput');
    
    const extractionInterval = document.getElementById('extractionInterval');
    const extractOnceBtn = document.getElementById('extractOnceBtn');
    const startExtractionBtn = document.getElementById('startExtractionBtn');
    const stopExtractionBtn = document.getElementById('stopExtractionBtn');
    const statusBar = document.getElementById('status');
    
    const extractionCountEl = document.getElementById('extractionCount');
    const successCountEl = document.getElementById('successCount');
    const avgLatencyEl = document.getElementById('avgLatency');

    let client = null;
    let currentStream = null;
    let extractionLoopId = null;
    let isExtracting = false;
    
    let stats = {
        extractions: 0,
        successes: 0,
        totalLatency: 0
    };

    window.reasoningConsole = new ReasoningConsole({
        startCollapsed: false
    });

    window.apiKeyManager = new APIKeyManager({
        requireMoondream: true,
        requireOpenAI: false,
        onKeysChanged: (keys) => {
            if (keys.moondream) {
                client = new MoondreamClient(keys.moondream);
                window.reasoningConsole.logInfo('Moondream API key configured');
                updateStatus('Ready to extract');
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
            
            const constraints = {
                video: deviceId 
                    ? { deviceId: { exact: deviceId }, width: 1280, height: 720 }
                    : { width: 1280, height: 720 },
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
            
            window.reasoningConsole.logInfo('Camera connected');
            updateStatus('Ready to extract');
        } catch (error) {
            window.reasoningConsole.logError('Camera error: ' + error.message);
            updateStatus('Camera error: ' + error.message);
        }
    }

    function updateStatus(message, isExtracting = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isExtracting ? ' extracting' : '');
    }

    function updateStats() {
        extractionCountEl.textContent = stats.extractions;
        successCountEl.textContent = stats.successes;
        if (stats.successes > 0) {
            avgLatencyEl.textContent = Math.round(stats.totalLatency / stats.successes) + 'ms';
        }
    }

    function updateDisplay(data) {
        if (data.home_score !== null && data.home_score !== undefined) {
            homeScoreEl.textContent = data.home_score;
        }
        if (data.away_score !== null && data.away_score !== undefined) {
            awayScoreEl.textContent = data.away_score;
        }
        if (data.time) {
            gameTimeEl.textContent = data.time;
        }
    }

    function updateJSON(data) {
        jsonOutput.textContent = JSON.stringify(data, null, 2);
        localStorage.setItem('scoreboard_data', JSON.stringify(data));
    }

    function isValidData(data) {
        if (data.home_score === null && data.away_score === null && data.time === null) {
            return false;
        }
        if (data.home_score !== null && (typeof data.home_score !== 'number' || data.home_score < 0)) {
            return false;
        }
        if (data.away_score !== null && (typeof data.away_score !== 'number' || data.away_score < 0)) {
            return false;
        }
        return true;
    }

    async function extractScoreboard() {
        if (!client) {
            window.reasoningConsole.logError('No API key configured');
            window.apiKeyManager.showModal();
            return null;
        }

        const startTime = Date.now();
        stats.extractions++;
        updateStats();

        const prompt = `Look at this scoreboard image and extract the following data.
Return ONLY valid JSON with no other text:
{
  "home_score": <number or null if not visible>,
  "away_score": <number or null if not visible>,
  "time": "<time remaining as string, or null if not visible>"
}`;

        try {
            window.reasoningConsole.logApiCall('/query', 0);
            updateStatus('Extracting...', true);

            const result = await client.askVideo(video, prompt);
            const elapsed = Date.now() - startTime;

            window.reasoningConsole.logInfo(`Response: ${result.answer}`);

            let jsonStr = result.answer;
            const jsonMatch = result.answer.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            const data = JSON.parse(jsonStr);

            if (isValidData(data)) {
                stats.successes++;
                stats.totalLatency += elapsed;
                updateStats();

                window.reasoningConsole.logDetection('scoreboard data', 1, 0.9, 
                    `Home: ${data.home_score}, Away: ${data.away_score}, Time: ${data.time}`);

                updateDisplay(data);
                updateJSON(data);
                updateStatus(`Extracted in ${elapsed}ms`, false);

                return data;
            } else {
                window.reasoningConsole.logInfo('Invalid data received, skipping update');
                updateStatus('Invalid data, retrying...', false);
                return null;
            }

        } catch (error) {
            window.reasoningConsole.logError('Extraction error: ' + error.message);
            updateStatus('Extraction error', false);
            return null;
        }
    }

    async function extractionLoop() {
        if (!isExtracting) return;

        await extractScoreboard();

        if (isExtracting) {
            const interval = parseInt(extractionInterval.value);
            extractionLoopId = setTimeout(extractionLoop, interval);
        }
    }

    function startExtraction() {
        if (!client) {
            window.reasoningConsole.logError('Please configure Moondream API key first');
            window.apiKeyManager.showModal();
            return;
        }

        isExtracting = true;
        startExtractionBtn.disabled = true;
        stopExtractionBtn.disabled = false;
        extractOnceBtn.disabled = true;

        window.reasoningConsole.logInfo('Auto-extraction started');
        extractionLoop();
    }

    function stopExtraction() {
        isExtracting = false;
        
        if (extractionLoopId) {
            clearTimeout(extractionLoopId);
            extractionLoopId = null;
        }

        startExtractionBtn.disabled = false;
        stopExtractionBtn.disabled = true;
        extractOnceBtn.disabled = false;

        window.reasoningConsole.logInfo('Auto-extraction stopped');
        updateStatus('Stopped');
    }

    cameraSelect.addEventListener('change', () => {
        const deviceId = cameraSelect.value;
        if (deviceId) {
            startCamera(deviceId);
        }
    });

    refreshCamerasBtn.addEventListener('click', enumerateCameras);

    extractOnceBtn.addEventListener('click', async () => {
        extractOnceBtn.disabled = true;
        await extractScoreboard();
        extractOnceBtn.disabled = false;
    });

    startExtractionBtn.addEventListener('click', startExtraction);
    stopExtractionBtn.addEventListener('click', stopExtraction);

    window.reasoningConsole.logInfo('Scoreboard Extractor initialized');
    window.reasoningConsole.logInfo('Module 4: Visual Data Extraction');
    await startCamera();
});
