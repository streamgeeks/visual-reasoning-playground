document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const regionCanvas = document.getElementById('regionCanvas');
    const ctx = regionCanvas.getContext('2d');
    const cameraSelect = document.getElementById('cameraSelect');
    const refreshCamerasBtn = document.getElementById('refreshCamerasBtn');
    
    const homeScoreEl = document.getElementById('homeScore');
    const awayScoreEl = document.getElementById('awayScore');
    const gameTimeEl = document.getElementById('gameTime');
    const homeTeamNameEl = document.getElementById('homeTeamName');
    const awayTeamNameEl = document.getElementById('awayTeamName');
    const jsonOutput = document.getElementById('jsonOutput');
    const rawOcrOutput = document.getElementById('rawOcrOutput');
    
    const ocrStatusEl = document.getElementById('ocrStatus');
    const extractOnceBtn = document.getElementById('extractOnceBtn');
    const startExtractionBtn = document.getElementById('startExtractionBtn');
    const stopExtractionBtn = document.getElementById('stopExtractionBtn');
    const clearRegionsBtn = document.getElementById('clearRegionsBtn');
    const statusBar = document.getElementById('status');
    
    const extractionCountEl = document.getElementById('extractionCount');
    const avgLatencyEl = document.getElementById('avgLatency');

    const regionButtons = {
        homeScore: document.getElementById('homeScoreRegion'),
        awayScore: document.getElementById('awayScoreRegion'),
        time: document.getElementById('timeRegion')
    };

    const regionColors = {
        homeScore: '#e74c3c',
        awayScore: '#3498db',
        time: '#2ecc71'
    };

    let ocrEngine = null;
    let currentStream = null;
    let extractionLoopId = null;
    let isExtracting = false;
    
    let regions = {
        homeScore: null,
        awayScore: null,
        time: null
    };
    
    let activeRegion = null;
    let isDrawing = false;
    let drawStart = { x: 0, y: 0 };
    
    let stats = {
        extractions: 0,
        totalLatency: 0
    };

    async function initOCR() {
        ocrEngine = new OCREngine();
        ocrEngine.onStatusChange = (state, message) => {
            const indicator = ocrStatusEl.querySelector('.indicator');
            const text = ocrStatusEl.querySelector('span');
            
            indicator.className = 'indicator ' + state;
            text.textContent = message;
        };
        
        try {
            await ocrEngine.initialize();
        } catch (error) {
            updateStatus('OCR initialization failed', true);
        }
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

            return videoDevices;
        } catch (error) {
            console.error('Failed to enumerate cameras:', error);
            return [];
        }
    }

    async function startCamera(deviceId = null) {
        try {
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }

            const constraints = {
                video: deviceId 
                    ? { deviceId: { exact: deviceId }, width: 1280, height: 720 }
                    : { width: 1280, height: 720 },
                audio: false
            };

            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = currentStream;

            await new Promise(resolve => {
                video.onloadedmetadata = resolve;
            });

            regionCanvas.width = video.videoWidth;
            regionCanvas.height = video.videoHeight;
            
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
            
            loadSavedRegions();
            drawAllRegions();
            updateStatus('Camera ready - define OCR regions');
            
        } catch (error) {
            updateStatus('Camera error: ' + error.message);
        }
    }

    function updateStatus(message, isError = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isError ? '' : (isExtracting ? ' extracting' : ''));
    }

    function updateStats() {
        extractionCountEl.textContent = stats.extractions;
        if (stats.extractions > 0) {
            avgLatencyEl.textContent = Math.round(stats.totalLatency / stats.extractions) + 'ms';
        }
    }

    function updateDisplay(data) {
        if (data.home_score !== null) {
            homeScoreEl.textContent = data.home_score;
        }
        if (data.away_score !== null) {
            awayScoreEl.textContent = data.away_score;
        }
        if (data.time) {
            gameTimeEl.textContent = data.time;
        }
        if (data.home_team) {
            homeTeamNameEl.textContent = data.home_team;
        }
        if (data.away_team) {
            awayTeamNameEl.textContent = data.away_team;
        }
    }

    function updateJSON(data) {
        const displayData = ScoreParser.formatForDisplay(data);
        jsonOutput.textContent = JSON.stringify(displayData, null, 2);
        localStorage.setItem('scoreboard_ocr_data', JSON.stringify(displayData));
    }

    function updateRawOCR(ocrResults) {
        const lines = [];
        for (const [name, result] of Object.entries(ocrResults)) {
            if (result && result.text) {
                lines.push(`${name}: "${result.text}" (${Math.round(result.confidence)}%)`);
            }
        }
        rawOcrOutput.textContent = lines.join('\n') || 'No text detected';
    }

    function drawAllRegions() {
        ctx.clearRect(0, 0, regionCanvas.width, regionCanvas.height);
        
        for (const [name, region] of Object.entries(regions)) {
            if (region) {
                drawRegion(region, regionColors[name], name);
            }
        }
    }

    function drawRegion(region, color, label) {
        const x = region.x * regionCanvas.width;
        const y = region.y * regionCanvas.height;
        const w = region.width * regionCanvas.width;
        const h = region.height * regionCanvas.height;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
        
        ctx.fillStyle = color.replace(')', ', 0.2)').replace('rgb', 'rgba');
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
        }
        ctx.fillRect(x, y, w, h);
        
        ctx.fillStyle = color;
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(label, x + 5, y + 18);
    }

    function getCanvasCoords(e) {
        const rect = regionCanvas.getBoundingClientRect();
        const scaleX = regionCanvas.width / rect.width;
        const scaleY = regionCanvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX / regionCanvas.width,
            y: (e.clientY - rect.top) * scaleY / regionCanvas.height
        };
    }

    function updateRegionButton(name, isConfigured) {
        const btn = regionButtons[name];
        if (btn) {
            const status = btn.querySelector('.region-status');
            if (isConfigured) {
                btn.classList.add('configured');
                status.textContent = 'Configured ✓';
            } else {
                btn.classList.remove('configured');
                status.textContent = 'Not set';
            }
        }
    }

    function saveRegions() {
        localStorage.setItem('scoreboard_ocr_regions', JSON.stringify(regions));
    }

    function loadSavedRegions() {
        const saved = localStorage.getItem('scoreboard_ocr_regions');
        if (saved) {
            try {
                const loaded = JSON.parse(saved);
                regions = { ...regions, ...loaded };
                
                for (const [name, region] of Object.entries(regions)) {
                    updateRegionButton(name, region !== null);
                }
            } catch (e) {
                console.error('Failed to load saved regions:', e);
            }
        }
    }

    regionCanvas.addEventListener('mousedown', (e) => {
        if (!activeRegion) return;
        
        isDrawing = true;
        drawStart = getCanvasCoords(e);
    });

    regionCanvas.addEventListener('mousemove', (e) => {
        if (!isDrawing || !activeRegion) return;
        
        const current = getCanvasCoords(e);
        
        drawAllRegions();
        
        const x = Math.min(drawStart.x, current.x);
        const y = Math.min(drawStart.y, current.y);
        const w = Math.abs(current.x - drawStart.x);
        const h = Math.abs(current.y - drawStart.y);
        
        ctx.strokeStyle = regionColors[activeRegion];
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
            x * regionCanvas.width,
            y * regionCanvas.height,
            w * regionCanvas.width,
            h * regionCanvas.height
        );
        ctx.setLineDash([]);
    });

    regionCanvas.addEventListener('mouseup', (e) => {
        if (!isDrawing || !activeRegion) return;
        
        isDrawing = false;
        const current = getCanvasCoords(e);
        
        const x = Math.min(drawStart.x, current.x);
        const y = Math.min(drawStart.y, current.y);
        const w = Math.abs(current.x - drawStart.x);
        const h = Math.abs(current.y - drawStart.y);
        
        if (w > 0.01 && h > 0.01) {
            regions[activeRegion] = { x, y, width: w, height: h };
            updateRegionButton(activeRegion, true);
            saveRegions();
        }
        
        regionButtons[activeRegion].classList.remove('active');
        activeRegion = null;
        drawAllRegions();
        updateStatus('Region saved. Define more or start extraction.');
    });

    for (const [name, btn] of Object.entries(regionButtons)) {
        btn.addEventListener('click', () => {
            for (const b of Object.values(regionButtons)) {
                b.classList.remove('active');
            }
            
            btn.classList.add('active');
            activeRegion = name;
            updateStatus(`Draw a box for ${name} on the video`);
        });
    }

    clearRegionsBtn.addEventListener('click', () => {
        regions = { homeScore: null, awayScore: null, time: null };
        for (const name of Object.keys(regionButtons)) {
            updateRegionButton(name, false);
        }
        saveRegions();
        drawAllRegions();
        updateStatus('All regions cleared');
    });

    async function extractScoreboard() {
        if (!ocrEngine || !ocrEngine.isReady) {
            updateStatus('OCR engine not ready');
            return null;
        }

        const hasRegions = Object.values(regions).some(r => r !== null);
        if (!hasRegions) {
            updateStatus('Define at least one OCR region first');
            return null;
        }

        const startTime = Date.now();
        stats.extractions++;
        updateStats();

        try {
            updateStatus('Extracting...', false);
            
            const ocrResults = await ocrEngine.recognizeMultipleRegions(video, regions);
            const elapsed = Date.now() - startTime;
            
            stats.totalLatency += elapsed;
            updateStats();
            
            updateRawOCR(ocrResults);
            
            const data = ScoreParser.parseOCRResults(ocrResults);
            
            if (ScoreParser.isValidScore(data)) {
                updateDisplay(data);
                updateJSON(data);
                updateStatus(`Extracted in ${elapsed}ms`);
                return data;
            } else {
                updateStatus('No valid data found in regions');
                return null;
            }

        } catch (error) {
            updateStatus('Extraction error: ' + error.message);
            return null;
        }
    }

    async function extractionLoop() {
        if (!isExtracting) return;

        await extractScoreboard();

        if (isExtracting) {
            extractionLoopId = setTimeout(extractionLoop, 2000);
        }
    }

    function startExtraction() {
        const hasRegions = Object.values(regions).some(r => r !== null);
        if (!hasRegions) {
            updateStatus('Define at least one OCR region first');
            return;
        }

        isExtracting = true;
        startExtractionBtn.disabled = true;
        stopExtractionBtn.disabled = false;
        extractOnceBtn.disabled = true;

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

        updateStatus('Extraction stopped');
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

    await initOCR();
    await startCamera();
});
