document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const objectTogglesDiv = document.getElementById('objectToggles');
    const addObjectBtn = document.getElementById('addObjectBtn');
    const borderThicknessSlider = document.getElementById('borderThickness');
    const borderValueSpan = document.getElementById('borderValue');
    const labelSizeSlider = document.getElementById('labelSize');
    const labelValueSpan = document.getElementById('labelValue');
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
    let detectionResults = {};

    const DEFAULT_COLORS = ['#93CCEA', '#2A9D8F', '#E9C46A', '#E76F51', '#9B5DE5', '#F72585'];
    
    const DEFAULT_OBJECTS = [
        { name: 'Glass of Water', color: '#93CCEA', enabled: true },
        { name: 'Laptop', color: '#2A9D8F', enabled: true },
        { name: 'Coffee', color: '#E9C46A', enabled: true }
    ];

    let objects = [];
    let styleSettings = {
        borderThickness: 4,
        labelSize: 18
    };

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

    function loadPreferences() {
        const savedObjects = localStorage.getItem('detectionBoxObjects');
        const savedStyle = localStorage.getItem('detectionBoxStyle');
        
        if (savedObjects) {
            objects = JSON.parse(savedObjects);
        } else {
            objects = DEFAULT_OBJECTS.map(o => ({ ...o }));
        }
        
        if (savedStyle) {
            styleSettings = JSON.parse(savedStyle);
        }
        
        borderThicknessSlider.value = styleSettings.borderThickness;
        borderValueSpan.textContent = styleSettings.borderThickness + 'px';
        labelSizeSlider.value = styleSettings.labelSize;
        labelValueSpan.textContent = styleSettings.labelSize + 'px';
        
        renderObjectToggles();
    }

    function savePreferences() {
        localStorage.setItem('detectionBoxObjects', JSON.stringify(objects));
        localStorage.setItem('detectionBoxStyle', JSON.stringify(styleSettings));
    }

    function getNextColor() {
        return DEFAULT_COLORS[objects.length % DEFAULT_COLORS.length];
    }

    function renderObjectToggles() {
        objectTogglesDiv.innerHTML = '';
        
        objects.forEach((obj, index) => {
            const toggle = document.createElement('div');
            toggle.className = 'object-toggle';
            toggle.innerHTML = `
                <input type="checkbox" ${obj.enabled ? 'checked' : ''} data-index="${index}">
                <input type="text" value="${obj.name}" data-index="${index}" placeholder="Object name">
                <input type="color" value="${obj.color}" data-index="${index}">
                <button class="btn-remove" data-index="${index}">✕</button>
            `;
            objectTogglesDiv.appendChild(toggle);
        });
        
        objectTogglesDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                objects[idx].enabled = e.target.checked;
                savePreferences();
            });
        });
        
        objectTogglesDiv.querySelectorAll('input[type="text"]').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                objects[idx].name = e.target.value;
                savePreferences();
            });
        });
        
        objectTogglesDiv.querySelectorAll('input[type="color"]').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                objects[idx].color = e.target.value;
                savePreferences();
                drawAllDetections();
            });
        });
        
        objectTogglesDiv.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                objects.splice(idx, 1);
                savePreferences();
                renderObjectToggles();
                drawAllDetections();
            });
        });
    }

    function addObject(name = '', color = null) {
        objects.push({
            name: name,
            color: color || getNextColor(),
            enabled: true
        });
        savePreferences();
        renderObjectToggles();
        
        const inputs = objectTogglesDiv.querySelectorAll('input[type="text"]');
        if (inputs.length > 0 && !name) {
            inputs[inputs.length - 1].focus();
        }
    }

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

    async function detectAll() {
        if (!client) {
            window.reasoningConsole.logError('No API key configured');
            updateStatus('Please configure your API key', true);
            window.apiKeyManager.showModal();
            return;
        }

        const enabledObjects = objects.filter(o => o.enabled && o.name.trim());
        
        if (enabledObjects.length === 0) {
            window.reasoningConsole.logError('No objects enabled for detection');
            updateStatus('Please enable at least one object to detect', true);
            return;
        }

        const startTime = Date.now();
        updateStatus('Detecting...');
        
        detectBtn.disabled = true;
        
        try {
            const promises = enabledObjects.map(async (obj) => {
                try {
                    const result = await client.detectInVideo(video, obj.name);
                    detectionResults[obj.name] = {
                        objects: result.objects,
                        color: obj.color
                    };
                    return { name: obj.name, count: result.objects.length, success: true };
                } catch (error) {
                    window.reasoningConsole.logError(`Detection failed for "${obj.name}": ${error.message}`);
                    return { name: obj.name, count: 0, success: false, error: error.message };
                }
            });
            
            const results = await Promise.all(promises);
            const elapsed = Date.now() - startTime;
            
            window.reasoningConsole.logApiCall('/detect', elapsed);
            
            const totalCount = results.reduce((sum, r) => sum + r.count, 0);
            objectCountSpan.textContent = totalCount;
            detectTimeSpan.textContent = elapsed + 'ms';
            
            results.forEach(r => {
                if (r.success) {
                    window.reasoningConsole.logInfo(`Found ${r.count} "${r.name}"`);
                }
            });
            
            drawAllDetections();
            displayDetectionList();
            
            if (totalCount > 0) {
                updateStatus(`Found ${totalCount} object(s) in ${elapsed}ms`);
            } else {
                updateStatus(`No objects found (${elapsed}ms)`);
            }
            
        } catch (error) {
            window.reasoningConsole.logError(error.message);
            updateStatus('Error: ' + error.message, true);
        } finally {
            detectBtn.disabled = false;
        }
    }

    function drawAllDetections() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const thickness = styleSettings.borderThickness;
        const fontSize = styleSettings.labelSize;
        
        Object.entries(detectionResults).forEach(([name, data]) => {
            const obj = objects.find(o => o.name === name);
            if (!obj || !obj.enabled) return;
            
            const color = data.color;
            ctx.strokeStyle = color;
            ctx.lineWidth = thickness;
            ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
            
            data.objects.forEach((detection, index) => {
                const x = detection.x_min * canvas.width;
                const y = detection.y_min * canvas.height;
                const w = (detection.x_max - detection.x_min) * canvas.width;
                const h = (detection.y_max - detection.y_min) * canvas.height;
                
                ctx.strokeRect(x, y, w, h);
                
                const label = data.objects.length > 1 ? `${name} #${index + 1}` : name;
                const textMetrics = ctx.measureText(label);
                const labelPadX = 8;
                const labelPadY = 4;
                const labelHeight = fontSize + labelPadY * 2;
                const labelWidth = textMetrics.width + labelPadX * 2;
                
                const labelX = x;
                const labelY = y - labelHeight - 2;
                
                ctx.fillStyle = color;
                ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
                
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(label, labelX + labelPadX, labelY + labelPadY + fontSize - 2);
                
                ctx.beginPath();
                ctx.arc(detection.x * canvas.width, detection.y * canvas.height, thickness + 2, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
            });
        });
    }

    function displayDetectionList() {
        const allDetections = [];
        
        Object.entries(detectionResults).forEach(([name, data]) => {
            const obj = objects.find(o => o.name === name);
            if (!obj || !obj.enabled) return;
            
            data.objects.forEach((detection, index) => {
                allDetections.push({
                    name: data.objects.length > 1 ? `${name} #${index + 1}` : name,
                    confidence: detection.confidence || 1,
                    color: data.color
                });
            });
        });
        
        if (allDetections.length === 0) {
            detectionsDiv.innerHTML = '<p style="color: var(--text-muted)">No objects detected</p>';
            return;
        }
        
        detectionsDiv.innerHTML = allDetections.map(det => {
            const confidence = Math.round(det.confidence * 100);
            return `
                <div class="detection-item">
                    <span style="color: ${det.color}">${det.name}</span>
                    <span>${confidence}%</span>
                </div>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${confidence}%; background: ${det.color}"></div>
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
            await detectAll();
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

    addObjectBtn.addEventListener('click', () => addObject());
    
    borderThicknessSlider.addEventListener('input', () => {
        styleSettings.borderThickness = parseInt(borderThicknessSlider.value);
        borderValueSpan.textContent = styleSettings.borderThickness + 'px';
        savePreferences();
        drawAllDetections();
    });
    
    labelSizeSlider.addEventListener('input', () => {
        styleSettings.labelSize = parseInt(labelSizeSlider.value);
        labelValueSpan.textContent = styleSettings.labelSize + 'px';
        savePreferences();
        drawAllDetections();
    });

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
            detectAll();
        }
    });

    stopBtn.addEventListener('click', stopContinuous);

    window.reasoningConsole.logInfo('Detection Box Drawer initialized');
    
    loadPreferences();
    await startCamera();
});
