document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const targetInput = document.getElementById('targetObject');
    const boxColorInput = document.getElementById('boxColor');
    const continuousCheckbox = document.getElementById('continuousMode');
    const rateGroup = document.getElementById('rateGroup');
    const rateSlider = document.getElementById('detectionRate');
    const rateValue = document.getElementById('rateValue');
    const detectBtn = document.getElementById('detectBtn');
    const stopBtn = document.getElementById('stopBtn');
    const statusBar = document.getElementById('status');
    const detectionsDiv = document.getElementById('detections');
    const objectCountSpan = document.getElementById('objectCount');
    const detectTimeSpan = document.getElementById('detectTime');

    let client = null;
    let detectionLoop = null;
    let isRunning = false;

    window.apiKeyManager = new APIKeyManager({
        requireMoondream: true,
        requireOpenAI: false,
        onKeysChanged: (keys) => {
            if (keys.moondream) {
                client = new MoondreamClient(keys.moondream);
                window.reasoningConsole.logInfo('Moondream API key configured');
                updateStatus('Ready to detect objects');
            }
        }
    });

    window.reasoningConsole = new ReasoningConsole({ startCollapsed: false });

    if (window.apiKeyManager.hasMoondreamKey()) {
        client = new MoondreamClient(window.apiKeyManager.getMoondreamKey());
    }

    const savedTarget = localStorage.getItem('detectionTarget');
    if (savedTarget) targetInput.value = savedTarget;

    async function startCamera() {
        try {
            window.reasoningConsole.logInfo('Requesting camera access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: false
            });
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            };
            window.reasoningConsole.logInfo('Camera connected');
            updateStatus('Camera ready');
        } catch (error) {
            window.reasoningConsole.logError('Camera access denied: ' + error.message);
            updateStatus('Camera error: ' + error.message, true);
        }
    }

    function updateStatus(message, isError = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }

    async function detect() {
        if (!client) {
            window.reasoningConsole.logError('No API key configured');
            updateStatus('Please configure your API key', true);
            window.apiKeyManager.showModal();
            return;
        }

        if (!targetInput.value) {
            window.reasoningConsole.logError('No target object specified');
            updateStatus('Please enter an object to detect', true);
            return;
        }

        localStorage.setItem('detectionTarget', targetInput.value);

        const startTime = Date.now();
        updateStatus('Detecting...');
        window.reasoningConsole.logInfo(`Searching for "${targetInput.value}"...`);

        try {
            const result = await client.detectInVideo(video, targetInput.value);
            const elapsed = Date.now() - startTime;

            window.reasoningConsole.logApiCall('/detect', elapsed);

            detectTimeSpan.textContent = elapsed + 'ms';
            objectCountSpan.textContent = result.objects.length;

            const avgConfidence = result.objects.length > 0 
                ? result.objects.reduce((sum, o) => sum + (o.confidence || 1), 0) / result.objects.length 
                : 0;

            window.reasoningConsole.logDetection(
                targetInput.value, 
                result.objects.length, 
                avgConfidence,
                result.objects.length > 0 ? `positions logged` : ''
            );

            result.objects.forEach((obj, i) => {
                window.reasoningConsole.logInfo(
                    `Object #${i+1}: center (${(obj.x * 100).toFixed(1)}%, ${(obj.y * 100).toFixed(1)}%), ` +
                    `size ${(obj.width * 100).toFixed(1)}% x ${(obj.height * 100).toFixed(1)}%`
                );
            });

            drawDetections(result.objects);
            displayDetectionList(result.objects);

            if (result.objects.length > 0) {
                updateStatus(`Found ${result.objects.length} object(s) in ${elapsed}ms`);
            } else {
                updateStatus(`No "${targetInput.value}" found (${elapsed}ms)`);
            }

        } catch (error) {
            window.reasoningConsole.logError(error.message);
            updateStatus('Error: ' + error.message, true);
        }
    }

    function drawDetections(objects) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const color = boxColorInput.value;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.font = '16px sans-serif';

        objects.forEach((obj, index) => {
            const x = obj.x_min * canvas.width;
            const y = obj.y_min * canvas.height;
            const w = (obj.x_max - obj.x_min) * canvas.width;
            const h = (obj.y_max - obj.y_min) * canvas.height;

            ctx.strokeRect(x, y, w, h);

            ctx.fillStyle = color;
            const label = `${targetInput.value} #${index + 1}`;
            const textWidth = ctx.measureText(label).width;
            ctx.fillRect(x, y - 20, textWidth + 8, 20);

            ctx.fillStyle = '#000';
            ctx.fillText(label, x + 4, y - 5);

            ctx.beginPath();
            ctx.arc(obj.x * canvas.width, obj.y * canvas.height, 5, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        });
    }

    function displayDetectionList(objects) {
        if (objects.length === 0) {
            detectionsDiv.innerHTML = '<p style="color: var(--text-muted)">No objects detected</p>';
            return;
        }

        detectionsDiv.innerHTML = objects.map((obj, i) => {
            const confidence = Math.round((obj.confidence || 1) * 100);
            return `
                <div class="detection-item">
                    <span>${targetInput.value} #${i + 1}</span>
                    <span>${confidence}%</span>
                </div>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${confidence}%"></div>
                </div>
            `;
        }).join('');
    }

    function startContinuous() {
        isRunning = true;
        detectBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        
        const rate = parseFloat(rateSlider.value);
        const interval = 1000 / rate;
        
        window.reasoningConsole.logInfo(`Starting continuous detection at ${rate}/sec`);
        
        const loop = async () => {
            if (!isRunning) return;
            await detect();
            if (isRunning) {
                detectionLoop = setTimeout(loop, interval);
            }
        };
        loop();
    }

    function stopContinuous() {
        isRunning = false;
        clearTimeout(detectionLoop);
        detectBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        window.reasoningConsole.logInfo('Continuous detection stopped');
        updateStatus('Stopped');
    }

    continuousCheckbox.addEventListener('change', () => {
        rateGroup.style.display = continuousCheckbox.checked ? 'block' : 'none';
    });

    rateSlider.addEventListener('input', () => {
        rateValue.textContent = parseFloat(rateSlider.value).toFixed(1);
    });

    detectBtn.addEventListener('click', () => {
        if (continuousCheckbox.checked) {
            startContinuous();
        } else {
            detect();
        }
    });

    stopBtn.addEventListener('click', stopContinuous);

    window.reasoningConsole.logInfo('Detection Box Drawer initialized');
    await startCamera();
});
