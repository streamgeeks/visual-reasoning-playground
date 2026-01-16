document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const videoContainer = document.getElementById('videoContainer');
    const zoneNameInput = document.getElementById('zoneName');
    const zoneTargetInput = document.getElementById('zoneTarget');
    const zoneColorInput = document.getElementById('zoneColor');
    const addZoneBtn = document.getElementById('addZoneBtn');
    const zoneListDiv = document.getElementById('zoneList');
    const checkRateSlider = document.getElementById('checkRate');
    const rateValueSpan = document.getElementById('rateValue');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const statusBar = document.getElementById('status');
    const alertLogDiv = document.getElementById('alertLog');

    let client = null;
    let monitorLoop = null;
    let isRunning = false;
    let isDrawing = false;
    let drawStart = null;
    let zones = [];
    let alerts = [];
    let zoneIdCounter = 0;

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
            updateStatus('Camera ready - Add zones to monitor');
            window.reasoningConsole.logInfo('Camera initialized successfully');
        } catch (error) {
            updateStatus('Camera error: ' + error.message, true);
            window.reasoningConsole.logError('Camera access failed: ' + error.message);
        }
    }

    function updateStatus(message, isError = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }

    function getMousePos(e) {
        const rect = videoContainer.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height
        };
    }

    function enableDrawMode() {
        videoContainer.style.cursor = 'crosshair';
        addZoneBtn.textContent = 'Drawing... Click & Drag';
        addZoneBtn.disabled = true;

        const onMouseDown = (e) => {
            isDrawing = true;
            drawStart = getMousePos(e);
        };

        const onMouseMove = (e) => {
            if (!isDrawing) return;
            const current = getMousePos(e);
            drawTempZone(drawStart, current);
        };

        const onMouseUp = (e) => {
            if (!isDrawing) return;
            isDrawing = false;
            const end = getMousePos(e);
            
            const zone = {
                id: ++zoneIdCounter,
                name: zoneNameInput.value || `Zone ${zoneIdCounter}`,
                target: zoneTargetInput.value || 'person',
                color: zoneColorInput.value,
                x: Math.min(drawStart.x, end.x),
                y: Math.min(drawStart.y, end.y),
                width: Math.abs(end.x - drawStart.x),
                height: Math.abs(end.y - drawStart.y),
                triggered: false,
                lastTriggered: null
            };

            if (zone.width > 0.02 && zone.height > 0.02) {
                zones.push(zone);
                updateZoneList();
                updateStatus(`Zone "${zone.name}" added`);
                window.reasoningConsole.logAction('Zone created', `"${zone.name}" detecting ${zone.target}`);
            }

            videoContainer.style.cursor = 'default';
            addZoneBtn.textContent = '+ Add Zone (Click & Drag on Video)';
            addZoneBtn.disabled = false;
            
            videoContainer.removeEventListener('mousedown', onMouseDown);
            videoContainer.removeEventListener('mousemove', onMouseMove);
            videoContainer.removeEventListener('mouseup', onMouseUp);
            
            drawZones();
        };

        videoContainer.addEventListener('mousedown', onMouseDown);
        videoContainer.addEventListener('mousemove', onMouseMove);
        videoContainer.addEventListener('mouseup', onMouseUp);
    }

    function drawTempZone(start, end) {
        drawZones();
        ctx.strokeStyle = zoneColorInput.value;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
            start.x * canvas.width,
            start.y * canvas.height,
            (end.x - start.x) * canvas.width,
            (end.y - start.y) * canvas.height
        );
        ctx.setLineDash([]);
    }

    function drawZones() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        zones.forEach(zone => {
            const x = zone.x * canvas.width;
            const y = zone.y * canvas.height;
            const w = zone.width * canvas.width;
            const h = zone.height * canvas.height;

            ctx.fillStyle = zone.triggered 
                ? zone.color + '40' 
                : zone.color + '20';
            ctx.fillRect(x, y, w, h);

            ctx.strokeStyle = zone.color;
            ctx.lineWidth = zone.triggered ? 4 : 2;
            ctx.strokeRect(x, y, w, h);

            ctx.fillStyle = zone.color;
            ctx.fillRect(x, y - 22, ctx.measureText(zone.name).width + 10, 20);
            ctx.fillStyle = '#fff';
            ctx.font = '12px sans-serif';
            ctx.fillText(zone.name, x + 5, y - 7);
        });
    }

    function updateZoneList() {
        if (zones.length === 0) {
            zoneListDiv.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No zones defined</p>';
            return;
        }

        zoneListDiv.innerHTML = zones.map(zone => `
            <div class="zone-item">
                <div class="zone-color" style="background: ${zone.color}"></div>
                <div>
                    <div>${zone.name}</div>
                    <small style="color: var(--text-muted)">Detecting: ${zone.target}</small>
                </div>
                <span class="zone-status ${zone.triggered ? 'triggered' : 'clear'}">
                    ${zone.triggered ? 'ALERT' : 'Clear'}
                </span>
                <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" 
                        onclick="removeZone(${zone.id})">x</button>
            </div>
        `).join('');
    }

    window.removeZone = function(id) {
        const zone = zones.find(z => z.id === id);
        zones = zones.filter(z => z.id !== id);
        updateZoneList();
        drawZones();
        if (zone) {
            window.reasoningConsole.logInfo(`Zone "${zone.name}" removed`);
        }
    };

    function addAlert(zone, objects) {
        const timestamp = new Date().toLocaleTimeString();
        alerts.unshift({
            zone: zone.name,
            target: zone.target,
            count: objects.length,
            timestamp
        });

        if (alerts.length > 20) alerts.pop();

        alertLogDiv.innerHTML = alerts.map(a => `
            <div class="alert-item">
                <strong>${a.zone}</strong>: ${a.count} ${a.target}(s) detected
                <span style="float: right">${a.timestamp}</span>
            </div>
        `).join('');

        window.reasoningConsole.logAction('Zone triggered', `${zone.name}: ${objects.length} ${zone.target}(s)`);
    }

    function isInZone(obj, zone) {
        return obj.x >= zone.x && 
               obj.x <= zone.x + zone.width &&
               obj.y >= zone.y && 
               obj.y <= zone.y + zone.height;
    }

    async function checkZones() {
        if (!window.apiKeyManager.hasMoondreamKey() || zones.length === 0) return;

        for (const zone of zones) {
            try {
                const startTime = Date.now();
                const result = await client.detectInVideo(video, zone.target);
                const latency = Date.now() - startTime;
                
                window.reasoningConsole.logApiCall('/detect', latency);
                
                const objectsInZone = result.objects.filter(obj => isInZone(obj, zone));
                
                const wasTriggered = zone.triggered;
                zone.triggered = objectsInZone.length > 0;

                if (zone.triggered) {
                    window.reasoningConsole.logDetection(zone.target, objectsInZone.length, 0.85);
                }

                if (zone.triggered && !wasTriggered) {
                    addAlert(zone, objectsInZone);
                    zone.lastTriggered = Date.now();
                    window.reasoningConsole.logDecision('Alert triggered', `${zone.name} detected ${objectsInZone.length} ${zone.target}(s)`);
                }

            } catch (error) {
                console.error(`Zone ${zone.name} check failed:`, error);
                window.reasoningConsole.logError(`Zone "${zone.name}" check failed: ${error.message}`);
            }
        }

        updateZoneList();
        drawZones();
        updateStatus(`Monitoring ${zones.length} zone(s)`);
    }

    function startMonitoring() {
        if (!window.apiKeyManager.hasMoondreamKey()) {
            updateStatus('Please configure API key', true);
            window.apiKeyManager.showModal();
            return;
        }
        if (zones.length === 0) {
            updateStatus('Please add at least one zone', true);
            return;
        }

        isRunning = true;
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');

        window.reasoningConsole.logInfo(`Started monitoring ${zones.length} zone(s)`);

        const interval = 1000 / parseFloat(checkRateSlider.value);
        
        const loop = async () => {
            if (!isRunning) return;
            await checkZones();
            if (isRunning) {
                monitorLoop = setTimeout(loop, interval);
            }
        };
        loop();
    }

    function stopMonitoring() {
        isRunning = false;
        clearTimeout(monitorLoop);
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        zones.forEach(z => z.triggered = false);
        updateZoneList();
        drawZones();
        updateStatus('Monitoring stopped');
        window.reasoningConsole.logInfo('Monitoring stopped');
    }

    addZoneBtn.addEventListener('click', enableDrawMode);
    checkRateSlider.addEventListener('input', () => {
        rateValueSpan.textContent = parseFloat(checkRateSlider.value).toFixed(1);
    });
    startBtn.addEventListener('click', startMonitoring);
    stopBtn.addEventListener('click', stopMonitoring);

    await startCamera();
});
