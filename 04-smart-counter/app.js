document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const entryLine = document.getElementById('entryLine');
    const apiKeyInput = document.getElementById('apiKey');
    const targetInput = document.getElementById('targetObject');
    const linePositionSlider = document.getElementById('linePosition');
    const lineValue = document.getElementById('lineValue');
    const directionSelect = document.getElementById('direction');
    const rateSlider = document.getElementById('detectionRate');
    const rateValueSpan = document.getElementById('rateValue');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const resetBtn = document.getElementById('resetBtn');
    const adjustUpBtn = document.getElementById('adjustUp');
    const adjustDownBtn = document.getElementById('adjustDown');
    const statusBar = document.getElementById('status');
    const currentCountSpan = document.getElementById('currentCount');
    const totalEntriesSpan = document.getElementById('totalEntries');
    const totalExitsSpan = document.getElementById('totalExits');
    const eventLogDiv = document.getElementById('eventLog');

    let client = null;
    let countingLoop = null;
    let isRunning = false;
    
    let currentCount = 0;
    let totalEntries = 0;
    let totalExits = 0;
    let trackedObjects = new Map();
    let eventLog = [];
    let objectIdCounter = 0;

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
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                updateEntryLine();
            };
            updateStatus('Camera ready');
        } catch (error) {
            updateStatus('Camera error: ' + error.message, true);
        }
    }

    function updateEntryLine() {
        const position = parseInt(linePositionSlider.value);
        entryLine.style.left = position + '%';
        lineValue.textContent = position;
    }

    function updateStatus(message, isError = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }

    function updateDisplay() {
        currentCountSpan.textContent = currentCount;
        totalEntriesSpan.textContent = totalEntries;
        totalExitsSpan.textContent = totalExits;
    }

    function logEvent(type, objectId) {
        const timestamp = new Date().toLocaleTimeString();
        const event = { type, objectId, timestamp };
        eventLog.unshift(event);
        
        if (eventLog.length > 50) eventLog.pop();
        
        eventLogDiv.innerHTML = eventLog.map(e => `
            <div class="event-item ${e.type}">
                <strong>${e.type === 'entry' ? '→ Entry' : '← Exit'}</strong>
                <span style="float: right">${e.timestamp}</span>
            </div>
        `).join('');
    }

    function matchObjectToTracked(detection) {
        const threshold = 0.15;
        let bestMatch = null;
        let bestDistance = threshold;

        trackedObjects.forEach((tracked, id) => {
            const dx = detection.x - tracked.lastX;
            const dy = detection.y - tracked.lastY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < bestDistance) {
                bestDistance = distance;
                bestMatch = id;
            }
        });

        return bestMatch;
    }

    async function detectAndCount() {
        if (!apiKeyInput.value || !targetInput.value) return;

        client.setApiKey(apiKeyInput.value);

        try {
            const result = await client.detectInVideo(video, targetInput.value);
            const linePos = parseInt(linePositionSlider.value) / 100;
            const isLeftToRight = directionSelect.value === 'left-to-right';

            drawDetections(result.objects, linePos);

            const currentIds = new Set();

            result.objects.forEach(detection => {
                let objectId = matchObjectToTracked(detection);
                
                if (objectId === null) {
                    objectId = ++objectIdCounter;
                    trackedObjects.set(objectId, {
                        lastX: detection.x,
                        lastY: detection.y,
                        crossedLine: false,
                        side: detection.x < linePos ? 'left' : 'right'
                    });
                }

                currentIds.add(objectId);
                const tracked = trackedObjects.get(objectId);
                const previousSide = tracked.side;
                const currentSide = detection.x < linePos ? 'left' : 'right';

                if (previousSide !== currentSide && !tracked.crossedLine) {
                    tracked.crossedLine = true;
                    
                    const isEntry = isLeftToRight 
                        ? (previousSide === 'left' && currentSide === 'right')
                        : (previousSide === 'right' && currentSide === 'left');

                    if (isEntry) {
                        currentCount++;
                        totalEntries++;
                        logEvent('entry', objectId);
                    } else {
                        currentCount = Math.max(0, currentCount - 1);
                        totalExits++;
                        logEvent('exit', objectId);
                    }
                    
                    updateDisplay();
                }

                tracked.lastX = detection.x;
                tracked.lastY = detection.y;
                tracked.side = currentSide;
            });

            trackedObjects.forEach((_, id) => {
                if (!currentIds.has(id)) {
                    trackedObjects.delete(id);
                }
            });

            updateStatus(`Tracking ${result.objects.length} ${targetInput.value}(s)`);

        } catch (error) {
            updateStatus('Error: ' + error.message, true);
        }
    }

    function drawDetections(objects, linePos) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(46, 204, 113, 0.8)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(linePos * canvas.width, 0);
        ctx.lineTo(linePos * canvas.width, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        objects.forEach(obj => {
            const x = obj.x * canvas.width;
            const y = obj.y * canvas.height;
            const w = obj.width * canvas.width;
            const h = obj.height * canvas.height;

            ctx.strokeStyle = '#93CCEA';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - w/2, y - h/2, w, h);

            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#93CCEA';
            ctx.fill();
        });
    }

    function startCounting() {
        if (!apiKeyInput.value) {
            updateStatus('Please enter API key', true);
            return;
        }

        isRunning = true;
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        localStorage.setItem('moondreamApiKey', apiKeyInput.value);

        const interval = 1000 / parseFloat(rateSlider.value);
        
        const loop = async () => {
            if (!isRunning) return;
            await detectAndCount();
            if (isRunning) {
                countingLoop = setTimeout(loop, interval);
            }
        };
        loop();
    }

    function stopCounting() {
        isRunning = false;
        clearTimeout(countingLoop);
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        updateStatus('Stopped');
    }

    function resetCount() {
        currentCount = 0;
        totalEntries = 0;
        totalExits = 0;
        trackedObjects.clear();
        eventLog = [];
        eventLogDiv.innerHTML = '<p style="color: var(--text-muted)">Events will appear here</p>';
        updateDisplay();
    }

    linePositionSlider.addEventListener('input', updateEntryLine);
    rateSlider.addEventListener('input', () => {
        rateValueSpan.textContent = parseFloat(rateSlider.value).toFixed(1);
    });
    startBtn.addEventListener('click', startCounting);
    stopBtn.addEventListener('click', stopCounting);
    resetBtn.addEventListener('click', resetCount);
    adjustUpBtn.addEventListener('click', () => { currentCount++; updateDisplay(); });
    adjustDownBtn.addEventListener('click', () => { currentCount = Math.max(0, currentCount - 1); updateDisplay(); });

    loadSettings();
    await startCamera();
});
