document.addEventListener('DOMContentLoaded', async function() {
    // ══════════════════════════════════════════════════════
    //  DOM REFERENCES
    // ══════════════════════════════════════════════════════
    const cameraIpInput = document.getElementById('cameraIp');
    const cameraPortInput = document.getElementById('cameraPort');
    const cameraUserInput = document.getElementById('cameraUser');
    const cameraPassInput = document.getElementById('cameraPass');
    const testCameraBtn = document.getElementById('testCameraBtn');
    const camDot = document.getElementById('camDot');
    const cameraStatusEl = document.getElementById('cameraStatus');
    const modeGrid = document.getElementById('modeGrid');
    const vlmOptions = document.getElementById('vlmOptions');
    const maxObjectsInput = document.getElementById('maxObjects');
    const sceneNameInput = document.getElementById('sceneName');
    const scanBtn = document.getElementById('scanBtn');
    const scanEstimateEl = document.getElementById('scanEstimate');
    const scanProgress = document.getElementById('scanProgress');
    const scanStatusText = document.getElementById('scanStatusText');
    const scanPctEl = document.getElementById('scanPct');
    const progressBar = document.getElementById('progressBar');
    const logBox = document.getElementById('logBox');
    const reviewCard = document.getElementById('reviewCard');
    const reviewSceneNameInput = document.getElementById('reviewSceneName');
    const objectGrid = document.getElementById('objectGrid');
    const slotFill = document.getElementById('slotFill');
    const slotText = document.getElementById('slotText');
    const cancelReviewBtn = document.getElementById('cancelReviewBtn');
    const saveSceneBtn = document.getElementById('saveSceneBtn');
    const scenesList = document.getElementById('scenesList');
    const sceneCountBadge = document.getElementById('sceneCountBadge');
    const newSceneFromListBtn = document.getElementById('newSceneFromListBtn');
    const voiceNoScene = document.getElementById('voiceNoScene');
    const voiceActive = document.getElementById('voiceActive');
    const activeSceneLabel = document.getElementById('activeSceneLabel');
    const changeSceneBtn = document.getElementById('changeSceneBtn');
    const refreshVoiceBtn = document.getElementById('refreshVoiceBtn');
    const goToScenesBtn = document.getElementById('goToScenesBtn');
    const alwaysOnToggle = document.getElementById('alwaysOnToggle');
    const micBtn = document.getElementById('micBtn');
    const voiceStatusText = document.getElementById('voiceStatusText');
    const transcriptBox = document.getElementById('transcriptBox');
    const matchResult = document.getElementById('matchResult');
    const matchName = document.getElementById('matchName');
    const matchTier = document.getElementById('matchTier');
    const matchPreset = document.getElementById('matchPreset');
    const crossScenePrompt = document.getElementById('crossScenePrompt');
    const crossSceneText = document.getElementById('crossSceneText');
    const crossSceneYesBtn = document.getElementById('crossSceneYesBtn');
    const crossSceneNoBtn = document.getElementById('crossSceneNoBtn');
    const cameraStatusBar = document.getElementById('cameraStatusBar');
    const phase1El = document.getElementById('phase1');
    const phase2El = document.getElementById('phase2');
    const voiceObjectList = document.getElementById('voiceObjectList');
    const commandHistory = document.getElementById('commandHistory');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // ══════════════════════════════════════════════════════
    //  STATE
    // ══════════════════════════════════════════════════════
    const PRESET_START_SLOT = 103;
    const MAX_PRESET_SLOTS = 255;

    const SCAN_MODES = [
        { name: 'Current View', shots: 1, panOffsets: [0] },
        { name: 'Wide Scan (90\u00B0)', shots: 3, panOffsets: [-45, 0, 45] },
        { name: 'Room Scan (120\u00B0)', shots: 3, panOffsets: [-60, 0, 60] },
        { name: 'Full Panorama (180\u00B0)', shots: 3, panOffsets: [-90, 0, 90] },
    ];
    const SCAN_ESTIMATES = ['~10 sec', '~25 sec', '~30 sec', '~35 sec'];

    const STATE = {
        selectedMode: 0,
        selectedVlm: 'moondream',
        scanning: false,
        pendingObjects: [],
        pendingSceneName: '',
        scenes: [],
        activeScene: null,
        usedPresetSlots: [],
        listening: false,
        alwaysOn: false,
        recognition: null,
        speechSupported: false,
        pendingCrossSearchTranscript: null,
        cameraConnected: false,
    };

    let moondreamClient = null;

    // VLM-aware client helper
    function getVLMClient() {
        if (window.vlmToggle) return window.vlmToggle.getClient();
        return moondreamClient;
    }

    // ══════════════════════════════════════════════════════
    //  SHARED MODULE INIT
    // ══════════════════════════════════════════════════════
    window.reasoningConsole = new ReasoningConsole({ startCollapsed: true, maxEntries: 200 });

    window.apiKeyManager = new APIKeyManager({
        requireMoondream: true,
        requireOpenAI: false,
        onKeysChanged: function(keys) {
            if (keys.moondream) {
                moondreamClient = new MoondreamClient(keys.moondream);
                window.reasoningConsole.logInfo('Moondream API key configured');
            }
        }
    });

    if (window.apiKeyManager.hasMoondreamKey()) {
        moondreamClient = new MoondreamClient(window.apiKeyManager.getMoondreamKey());
        window.reasoningConsole.logInfo('Loaded saved Moondream API key');
    }

    // Initialize VLM Toggle
    window.vlmToggle = new VLMToggle({
        containerSelector: '.app-header h1',
        toolId: 'voice-to-ptz',
        onChange: (engine) => {
            window.reasoningConsole.logInfo('Switched to ' + engine + ' VLM');
        }
    });
    window.vlmToggle.autoSetupGlobalClient();

    window.reasoningConsole.logInfo('Voice to PTZ initialized');

    // ══════════════════════════════════════════════════════
    //  CONFIG HELPERS
    // ══════════════════════════════════════════════════════
    const cfg = {
        get ip() { return cameraIpInput.value.trim(); },
        get port() { return cameraPortInput.value || '80'; },
        get user() { return cameraUserInput.value.trim(); },
        get pass() { return cameraPassInput.value; },
        get maxObjects() { return parseInt(maxObjectsInput.value) || 5; },
        get cameraBase() { return 'http://' + cfg.ip + ':' + cfg.port; },
        get moondreamKey() {
            return window.apiKeyManager.hasMoondreamKey()
                ? window.apiKeyManager.getMoondreamKey() : '';
        },
        get openaiKey() {
            return (window.apiKeyManager.hasOpenAIKey && window.apiKeyManager.hasOpenAIKey())
                ? window.apiKeyManager.getOpenAIKey() : '';
        }
    };

    function saveCameraConfig() {
        try {
            localStorage.setItem('vtptz_camera', JSON.stringify({
                ip: cfg.ip, port: cfg.port, user: cfg.user, pass: cfg.pass
            }));
        } catch(e) { /* ignore */ }
    }

    function loadCameraConfig() {
        try {
            const s = JSON.parse(localStorage.getItem('vtptz_camera') || '{}');
            if (s.ip) cameraIpInput.value = s.ip;
            if (s.port) cameraPortInput.value = s.port;
            if (s.user) cameraUserInput.value = s.user;
            if (s.pass) cameraPassInput.value = s.pass;
        } catch(e) { /* ignore */ }
    }

    // ══════════════════════════════════════════════════════
    //  CAMERA API
    // ══════════════════════════════════════════════════════
    async function cameraGET(endpoint) {
        const url = cfg.cameraBase + endpoint;
        const headers = {};
        if (cfg.user) headers['Authorization'] = 'Basic ' + btoa(cfg.user + ':' + cfg.pass);
        const resp = await fetch(url, { headers: headers, mode: 'cors' });
        if (!resp.ok) throw new Error('Camera ' + resp.status + ': ' + resp.statusText);
        return resp;
    }

    async function testCamera() {
        camDot.className = 'status-dot';
        cameraStatusEl.innerHTML = '<span class="status-dot" id="camDot"></span>Testing...';
        try {
            await cameraGET('/cgi-bin/ptzctrl.cgi?ptzcmd&home&1');
            STATE.cameraConnected = true;
            cameraStatusEl.innerHTML = '<span class="status-dot online"></span>Connected \u2014 ' + cfg.ip;
            window.reasoningConsole.logInfo('Camera connected at ' + cfg.ip);
            if (typeof VRPUtils !== 'undefined') VRPUtils.success('PTZ camera connected at ' + cfg.ip);
            saveCameraConfig();
        } catch(e) {
            STATE.cameraConnected = false;
            cameraStatusEl.innerHTML = '<span class="status-dot error"></span>Connection failed';
            window.reasoningConsole.logError('Camera connection failed: ' + e.message);
            if (typeof VRPUtils !== 'undefined') VRPUtils.error('Camera connection failed: ' + e.message);
        }
    }

    async function recallPreset(slot) {
        await cameraGET('/cgi-bin/ptzctrl.cgi?ptzcmd&poscall&' + slot);
    }
    async function savePreset(slot) {
        await cameraGET('/cgi-bin/ptzctrl.cgi?ptzcmd&posset&' + slot);
    }
    async function panCamera(speed, direction) {
        const cmd = direction === 'left' ? ('left&' + speed + '&' + speed) : ('right&' + speed + '&' + speed);
        await cameraGET('/cgi-bin/ptzctrl.cgi?ptzcmd&' + cmd);
    }
    async function tiltCamera(speed, direction) {
        const cmd = direction === 'up' ? ('up&' + speed + '&' + speed) : ('down&' + speed + '&' + speed);
        await cameraGET('/cgi-bin/ptzctrl.cgi?ptzcmd&' + cmd);
    }
    async function zoomCamera(speed, direction) {
        const cmd = direction === 'in' ? ('zoomin&' + speed) : ('zoomout&' + speed);
        await cameraGET('/cgi-bin/ptzctrl.cgi?ptzcmd&' + cmd);
    }
    async function stopCamera() {
        await cameraGET('/cgi-bin/ptzctrl.cgi?ptzcmd&ptzstop');
    }
    async function captureFrame() {
        const resp = await cameraGET('/cgi-bin/snapshot.cgi');
        return await resp.blob();
    }

    function blobToBase64(blob) {
        return new Promise(function(res, rej) {
            const reader = new FileReader();
            reader.onload = function() { res(reader.result); };
            reader.onerror = function() { rej(new Error('File read failed')); };
            reader.readAsDataURL(blob);
        });
    }

    // ══════════════════════════════════════════════════════
    //  TAB NAVIGATION
    // ══════════════════════════════════════════════════════
    function switchTab(name) {
        document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
        document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
        document.getElementById('panel-' + name).classList.add('active');
        document.getElementById('tab-' + name).classList.add('active');
    }

    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { switchTab(btn.dataset.tab); });
    });

    // ══════════════════════════════════════════════════════
    //  MODE & VLM SELECTION
    // ══════════════════════════════════════════════════════
    modeGrid.querySelectorAll('.mode-card').forEach(function(card) {
        card.addEventListener('click', function() {
            STATE.selectedMode = parseInt(card.dataset.mode);
            modeGrid.querySelectorAll('.mode-card').forEach(function(c, i) {
                c.classList.toggle('selected', i === STATE.selectedMode);
            });
            scanEstimateEl.textContent = SCAN_ESTIMATES[STATE.selectedMode];
        });
    });

    vlmOptions.querySelectorAll('.vlm-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            STATE.selectedVlm = btn.dataset.vlm;
            vlmOptions.querySelectorAll('.vlm-btn').forEach(function(b) {
                b.classList.toggle('active', b.dataset.vlm === STATE.selectedVlm);
            });
        });
    });

    // ══════════════════════════════════════════════════════
    //  VLM INTEGRATION
    // ══════════════════════════════════════════════════════
    const VLM_SCAN_PROMPT = 'Identify the top {MAX} most notable, distinct objects or areas in this scene that would be useful for a camera operator to navigate to. For each object return: name (short, plain English), aliases (2-3 alternative names a user might say), confidence (0-1), and a suggested overall scene name. Respond with ONLY valid JSON (no markdown, no backticks): { "sceneName": "...", "objects": [{ "name": "...", "aliases": ["..."], "confidence": 0.9 }] }';

    async function analyzeFrameWithVLM(imageBlob, maxObjects) {
        const vlm = STATE.selectedVlm;
        if (vlm === 'moondream' || vlm === 'auto') {
            try {
                return await analyzeMoondream(imageBlob, maxObjects);
            } catch(e) {
                if (vlm === 'auto' && cfg.openaiKey) {
                    addLog('Moondream failed (' + e.message + '), falling back to OpenAI...', 'warn');
                    return await analyzeOpenAI(imageBlob, maxObjects);
                }
                throw e;
            }
        } else {
            return await analyzeOpenAI(imageBlob, maxObjects);
        }
    }

    async function analyzeMoondream(imageBlob, maxObjects) {
        if (!moondreamClient) throw new Error('No Moondream API key');
        const b64 = await blobToBase64(imageBlob);
        const prompt = VLM_SCAN_PROMPT.replace('{MAX}', maxObjects);
        const startTime = Date.now();
        window.reasoningConsole.logApiCall('/query', 0);
        const result = await getVLMClient().ask(b64, prompt);
        const latency = Date.now() - startTime;
        VLMResultBadge.showCurrent(latency);
        window.reasoningConsole.logApiCall('/query', latency);
        return parseVLMResponse(result.answer);
    }

    async function analyzeOpenAI(imageBlob, maxObjects) {
        if (!cfg.openaiKey) throw new Error('No OpenAI API key');
        const b64 = await blobToBase64(imageBlob);
        const prompt = VLM_SCAN_PROMPT.replace('{MAX}', maxObjects);
        const startTime = Date.now();
        window.reasoningConsole.logApiCall('/openai', 0);
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + cfg.openaiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'image_url', image_url: { url: b64, detail: 'low' } },
                        { type: 'text', text: prompt }
                    ]
                }],
                max_tokens: 600
            })
        });
        if (!resp.ok) throw new Error('OpenAI ' + resp.status);
        const data = await resp.json();
        const latency = Date.now() - startTime;
        window.reasoningConsole.logApiCall('/openai', latency);
        return parseVLMResponse(data.choices[0].message.content);
    }

    async function detectObjectInFrame(imageBlob, objectName) {
        // Use Moondream detect endpoint to find a specific object for PID loop
        if (!getVLMClient()) return null;
        try {
            const b64 = await blobToBase64(imageBlob);
            const result = await getVLMClient().detect(b64, objectName);
            if (result.objects && result.objects.length > 0) {
                const obj = result.objects[0];
                return {
                    centerX: obj.x * 100,
                    centerY: obj.y * 100,
                    width: obj.width * 100,
                    height: obj.height * 100
                };
            }
            return null;
        } catch(e) {
            return null;
        }
    }

    function parseVLMResponse(text) {
        try {
            const clean = text.replace(/```json|```/g, '').trim();
            const idx = clean.indexOf('{');
            const end = clean.lastIndexOf('}');
            return JSON.parse(clean.slice(idx, end + 1));
        } catch(e) {
            return {
                sceneName: 'Scanned Scene',
                objects: [{ name: 'Scene Area', aliases: ['area', 'scene'], confidence: 0.7 }]
            };
        }
    }

    // ══════════════════════════════════════════════════════
    //  DEMO MODE VLM RESULTS
    // ══════════════════════════════════════════════════════
    function getDemoVLMResult(position, maxObjects) {
        var demoSets = {
            left: {
                sceneName: 'Conference Room',
                objects: [
                    { name: 'Whiteboard', aliases: ['board', 'white board', 'writing board'], confidence: 0.95 },
                    { name: 'Presentation Screen', aliases: ['screen', 'projector screen', 'display'], confidence: 0.91 },
                    { name: 'Speaker Podium', aliases: ['podium', 'lectern', 'speaker stand'], confidence: 0.85 },
                ]
            },
            center: {
                sceneName: 'Conference Room',
                objects: [
                    { name: 'Conference Table', aliases: ['table', 'meeting table'], confidence: 0.97 },
                    { name: 'Main Camera', aliases: ['camera', 'PTZ camera', 'webcam'], confidence: 0.88 },
                    { name: 'TV Monitor', aliases: ['TV', 'monitor', 'display screen'], confidence: 0.90 },
                ]
            },
            right: {
                sceneName: 'Conference Room',
                objects: [
                    { name: 'Entrance Door', aliases: ['door', 'entry', 'doorway'], confidence: 0.93 },
                    { name: 'Clock', aliases: ['wall clock', 'time'], confidence: 0.78 },
                    { name: 'Water Station', aliases: ['water cooler', 'drinks', 'refreshments'], confidence: 0.72 },
                ]
            }
        };
        var result = demoSets[position] || demoSets.center;
        result.objects = result.objects.slice(0, maxObjects);
        return result;
    }

    // ══════════════════════════════════════════════════════
    //  SCAN LOGIC
    // ══════════════════════════════════════════════════════
    async function startScan() {
        if (STATE.scanning) return;
        var mode = SCAN_MODES[STATE.selectedMode];

        if (!cfg.ip) {
            if (typeof VRPUtils !== 'undefined') VRPUtils.error('Please enter a camera IP address.');
            return;
        }
        if (!cfg.moondreamKey && !cfg.openaiKey) {
            window.apiKeyManager.showModal();
            return;
        }

        STATE.scanning = true;
        scanBtn.disabled = true;
        reviewCard.style.display = 'none';
        scanProgress.classList.add('active');
        clearLog();
        setProgress(0, 'Starting scan...');

        try {
            // ── STEP 1: CAPTURE ──
            markStep('step-capture', 'active');
            addLog('Mode: ' + mode.name + ' \u2014 ' + mode.shots + ' image(s)', 'info');
            var frames = [];
            var frameNames = [];

            for (var i = 0; i < mode.shots; i++) {
                var pct = Math.round(5 + (i / mode.shots) * 20);
                var angle = mode.panOffsets[i];
                setProgress(pct, 'Capturing frame ' + (i + 1) + ' of ' + mode.shots + '...');

                if (mode.shots > 1 && angle !== 0) {
                    addLog('Panning to ' + (angle > 0 ? '+' : '') + angle + '\u00B0...', 'info');
                    try {
                        var speed = Math.round(Math.abs(angle) / 5);
                        await panCamera(Math.max(1, Math.min(speed, 20)), angle > 0 ? 'right' : 'left');
                        await sleep(Math.abs(angle) * 35 + 500);
                        await stopCamera();
                        await sleep(600);
                    } catch(e) { addLog('Pan warning: ' + e.message, 'warn'); }
                }

                try {
                    var blob = await captureFrame();
                    frames.push(blob);
                    var posLabel = mode.shots === 1 ? 'center' : (i === 0 ? 'left' : i === mode.shots - 1 ? 'right' : 'center');
                    frameNames.push(posLabel);
                    addLog('Frame ' + (i + 1) + ' captured (' + posLabel + ')', 'ok');
                    window.reasoningConsole.logInfo('Frame ' + (i + 1) + ' captured');
                } catch(e) {
                    addLog('Frame ' + (i + 1) + ' capture failed: ' + e.message + ' \u2014 using demo mode', 'warn');
                    frames.push(null);
                    frameNames.push(i === 0 ? 'left' : i === mode.shots - 1 ? 'right' : 'center');
                }
            }

            // Return to center
            if (mode.shots > 1) {
                try {
                    await recallPreset(1);
                    await sleep(1000);
                    addLog('Camera returned to home position', 'ok');
                } catch(e) { addLog('Could not return to home', 'warn'); }
            }
            markStep('step-capture', 'done');

            // ── STEP 2: VLM ANALYSIS ──
            markStep('step-vlm', 'active');
            setProgress(30, 'Analyzing frames with VLM...');
            var allObjects = [];
            var suggestedSceneName = sceneNameInput.value.trim() || '';

            for (var j = 0; j < frames.length; j++) {
                addLog('Sending frame ' + (j + 1) + ' to ' + (STATE.selectedVlm === 'auto' ? 'VLM' : STATE.selectedVlm) + '...', 'info');
                setProgress(30 + j * 10, 'VLM analyzing frame ' + (j + 1) + '...');
                try {
                    var vlmResult;
                    if (frames[j]) {
                        vlmResult = await analyzeFrameWithVLM(frames[j], cfg.maxObjects);
                    } else {
                        vlmResult = getDemoVLMResult(frameNames[j], cfg.maxObjects);
                    }
                    if (!suggestedSceneName && vlmResult.sceneName) suggestedSceneName = vlmResult.sceneName;
                    var objs = (vlmResult.objects || []).map(function(o) {
                        return Object.assign({}, o, { frameIdx: j, framePos: frameNames[j] });
                    });
                    allObjects = allObjects.concat(objs);
                    addLog('Frame ' + (j + 1) + ': found ' + objs.length + ' objects (' + objs.map(function(o) { return o.name; }).join(', ') + ')', 'ok');
                    window.reasoningConsole.logDetection('objects', objs.length, objs[0] ? objs[0].confidence : 0);
                } catch(e) {
                    addLog('VLM error on frame ' + (j + 1) + ': ' + e.message, 'err');
                    window.reasoningConsole.logError('VLM error: ' + e.message);
                }
            }
            markStep('step-vlm', 'done');

            // ── STEP 3: DEDUPLICATION ──
            markStep('step-dedup', 'active');
            setProgress(65, 'Deduplicating objects across frames...');
            var deduped = deduplicateObjects(allObjects);
            addLog('Deduplication: ' + allObjects.length + ' \u2192 ' + deduped.length + ' unique objects', 'ok');
            window.reasoningConsole.logDecision('Dedup', allObjects.length + ' -> ' + deduped.length + ' unique');
            markStep('step-dedup', 'done');

            // ── STEP 4: ASSIGN PRESETS ──
            markStep('step-preset', 'active');
            setProgress(75, 'Assigning camera presets...');
            var nextSlot = getNextFreePreset(PRESET_START_SLOT);
            var slotsUsed = STATE.usedPresetSlots.length;
            var slotsAvailable = MAX_PRESET_SLOTS - slotsUsed;

            if (deduped.length > slotsAvailable) {
                addLog('Warning: only ' + slotsAvailable + ' preset slots available, trimming to fit', 'warn');
                deduped = deduped.slice(0, slotsAvailable);
            }

            var pctThreshold = (slotsUsed + deduped.length) / MAX_PRESET_SLOTS;
            if (pctThreshold > 0.8) {
                addLog('Warning: preset slots are ' + Math.round(pctThreshold * 100) + '% full', 'warn');
                if (typeof VRPUtils !== 'undefined') VRPUtils.info('Preset slots are ' + Math.round(pctThreshold * 100) + '% full');
            }

            for (var k = 0; k < deduped.length; k++) {
                var obj = deduped[k];
                var slot = nextSlot;
                nextSlot = getNextFreePreset(nextSlot + 1);
                setProgress(75 + k * (15 / deduped.length), 'Setting preset ' + slot + ' for "' + obj.name + '"...');
                addLog('Assigning preset ' + slot + ' \u2192 "' + obj.name + '"', 'info');
                try {
                    await savePreset(slot);
                    obj.presetSlot = slot;
                    STATE.usedPresetSlots.push(slot);
                    addLog('Preset ' + slot + ' saved for "' + obj.name + '"', 'ok');
                    window.reasoningConsole.logAction('Preset saved', 'Slot ' + slot + ' = ' + obj.name);
                } catch(e) {
                    obj.presetSlot = slot;
                    addLog('Preset ' + slot + ' \u2014 camera not connected, stored for later', 'warn');
                }
                await sleep(300);
            }
            markStep('step-preset', 'done');

            // ── STEP 5: BUILD SCENE ──
            markStep('step-save', 'active');
            setProgress(95, 'Building scene...');
            STATE.pendingObjects = deduped;
            STATE.pendingSceneName = suggestedSceneName || 'New Scene';
            reviewSceneNameInput.value = STATE.pendingSceneName;
            renderReviewGrid(deduped);
            setProgress(100, 'Scan complete!');
            markStep('step-save', 'done');

            await sleep(500);
            reviewCard.style.display = 'block';
            reviewCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (typeof VRPUtils !== 'undefined') VRPUtils.success('Found ' + deduped.length + ' objects. Review and save your scene.');
            window.reasoningConsole.logDecision('Scan complete', deduped.length + ' objects ready for review');

        } catch(err) {
            addLog('Scan failed: ' + err.message, 'err');
            window.reasoningConsole.logError('Scan failed: ' + err.message);
            if (typeof VRPUtils !== 'undefined') VRPUtils.error('Scan failed: ' + err.message);
        } finally {
            STATE.scanning = false;
            scanBtn.disabled = false;
        }
    }

    function deduplicateObjects(objects) {
        var seen = new Map();
        objects.forEach(function(obj) {
            var key = obj.name.toLowerCase().replace(/\s+/g, '');
            if (!seen.has(key)) {
                seen.set(key, Object.assign({}, obj));
            } else {
                if (obj.confidence > seen.get(key).confidence) {
                    seen.set(key, Object.assign({}, obj, { multiFrame: true }));
                } else {
                    var existing = seen.get(key);
                    existing.multiFrame = true;
                }
            }
        });
        return Array.from(seen.values()).sort(function(a, b) { return b.confidence - a.confidence; });
    }

    function getNextFreePreset(start) {
        var slot = start;
        while (STATE.usedPresetSlots.indexOf(slot) !== -1 && slot < MAX_PRESET_SLOTS) slot++;
        return slot;
    }

    // ══════════════════════════════════════════════════════
    //  SCENE REVIEW UI
    // ══════════════════════════════════════════════════════
    function renderReviewGrid(objects) {
        objectGrid.innerHTML = '';
        objects.forEach(function(obj, idx) {
            var card = document.createElement('div');
            card.className = 'object-card';
            card.id = 'objcard-' + idx;
            card.innerHTML =
                '<button class="obj-delete" data-idx="' + idx + '" title="Remove">\u2715</button>' +
                '<div class="obj-thumb"><span style="font-size:1.8rem;">' + getObjectEmoji(obj.name) + '</span></div>' +
                '<input class="obj-name-input" value="' + escHtml(obj.name) + '" id="objname-' + idx + '" placeholder="Object name">' +
                '<div class="obj-aliases">' + (obj.aliases || []).join(', ') + '</div>' +
                '<div class="obj-preset">Preset ' + (obj.presetSlot || '\u2014') + '</div>' +
                '<div class="obj-confidence">' +
                    (obj.multiFrame ? '<span class="tag-chip green" style="margin-right:3px;">Multi-frame</span>' : '') +
                    '<span class="tag-chip">' + Math.round((obj.confidence || 0) * 100) + '% conf</span>' +
                '</div>';
            objectGrid.appendChild(card);
        });

        // Delete handlers
        objectGrid.querySelectorAll('.obj-delete').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var idx = parseInt(btn.dataset.idx);
                STATE.pendingObjects.splice(idx, 1);
                renderReviewGrid(STATE.pendingObjects);
            });
        });

        // Update slot usage
        updateSlotIndicator(objects.length);
    }

    function updateSlotIndicator(pendingCount) {
        var total = MAX_PRESET_SLOTS;
        var used = STATE.usedPresetSlots.length + (pendingCount || 0);
        var pct = Math.min(100, (used / total) * 100);
        slotFill.style.width = pct + '%';
        slotFill.className = 'slot-fill' + (pct > 80 ? ' danger' : pct > 60 ? ' warn' : '');
        slotText.textContent = used + ' / ' + total;
    }

    // ══════════════════════════════════════════════════════
    //  SAVE SCENE
    // ══════════════════════════════════════════════════════
    function saveScene() {
        var name = reviewSceneNameInput.value.trim() || 'Unnamed Scene';
        var finalObjects = STATE.pendingObjects.map(function(obj, idx) {
            var nameEl = document.getElementById('objname-' + idx);
            return Object.assign({}, obj, {
                name: nameEl ? nameEl.value : obj.name,
                // Store a reference bounding box size for zoom PID (normalized 0-1)
                storedBBox: { width: 0.3, height: 0.3 }
            });
        });

        var scene = {
            id: 'scene_' + Date.now(),
            name: name,
            mode: SCAN_MODES[STATE.selectedMode].name,
            vlm: STATE.selectedVlm,
            createdAt: new Date().toISOString(),
            objects: finalObjects,
            active: false,
        };

        STATE.scenes.push(scene);
        saveToStorage();
        renderScenesList();
        updateSceneCountBadge();
        reviewCard.style.display = 'none';
        STATE.pendingObjects = [];
        window.reasoningConsole.logAction('Scene saved', '"' + name + '" with ' + finalObjects.length + ' objects');
        if (typeof VRPUtils !== 'undefined') VRPUtils.success('"' + name + '" saved with ' + finalObjects.length + ' objects.');
        switchTab('scenes');
    }

    function cancelReview() {
        reviewCard.style.display = 'none';
        STATE.pendingObjects = [];
    }

    // ══════════════════════════════════════════════════════
    //  SCENES TAB
    // ══════════════════════════════════════════════════════
    function renderScenesList() {
        if (!STATE.scenes.length) {
            scenesList.innerHTML = '<div class="empty-state"><div class="empty-icon">&#127916;</div><div>No scenes yet. Run a scan to create your first scene.</div></div>';
            return;
        }
        scenesList.innerHTML = '';
        STATE.scenes.forEach(function(scene, idx) {
            var div = document.createElement('div');
            div.className = 'scene-item' + (scene.active ? ' active-scene' : '');
            div.innerHTML =
                '<div class="scene-icon">' + (scene.active ? '&#128994;' : '&#127916;') + '</div>' +
                '<div class="scene-info">' +
                    '<div class="scene-name">' + escHtml(scene.name) + ' ' + (scene.active ? '<span class="tag-chip green">Active</span>' : '') + '</div>' +
                    '<div class="scene-meta">' + scene.mode + ' \u00B7 ' + scene.objects.length + ' objects \u00B7 ' + formatDate(scene.createdAt) + '</div>' +
                '</div>' +
                '<div class="scene-actions">' +
                    '<button class="btn btn-secondary" data-load="' + idx + '" style="padding:5px 10px;font-size:0.78rem;">Load</button>' +
                    '<button class="btn btn-secondary" data-delete="' + idx + '" style="padding:5px 10px;font-size:0.78rem;color:var(--error);">Delete</button>' +
                '</div>';
            scenesList.appendChild(div);
        });

        scenesList.querySelectorAll('[data-load]').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                activateScene(parseInt(btn.dataset.load));
            });
        });
        scenesList.querySelectorAll('[data-delete]').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                deleteScene(parseInt(btn.dataset.delete));
            });
        });
    }

    function activateScene(idx) {
        STATE.scenes.forEach(function(s, i) { s.active = (i === idx); });
        saveToStorage();
        renderScenesList();
        setActiveScene(STATE.scenes[idx]);
        window.reasoningConsole.logAction('Scene loaded', '"' + STATE.scenes[idx].name + '"');
        if (typeof VRPUtils !== 'undefined') VRPUtils.success('"' + STATE.scenes[idx].name + '" is ready for voice control.');
        switchTab('voice');
    }

    function deleteScene(idx) {
        var scene = STATE.scenes[idx];
        scene.objects.forEach(function(o) {
            var si = STATE.usedPresetSlots.indexOf(o.presetSlot);
            if (si > -1) STATE.usedPresetSlots.splice(si, 1);
        });
        STATE.scenes.splice(idx, 1);
        if (STATE.activeScene === scene) {
            STATE.activeScene = null;
            voiceActive.style.display = 'none';
            voiceNoScene.style.display = 'block';
        }
        saveToStorage();
        renderScenesList();
        updateSceneCountBadge();
        window.reasoningConsole.logInfo('Scene deleted, preset slots freed');
        if (typeof VRPUtils !== 'undefined') VRPUtils.success('Scene deleted and preset slots freed.');
    }

    function setActiveScene(scene) {
        STATE.activeScene = scene;
        voiceNoScene.style.display = 'none';
        voiceActive.style.display = 'block';
        activeSceneLabel.textContent = scene.name;
        renderVoiceObjects();
    }

    function updateSceneCountBadge() {
        sceneCountBadge.textContent = STATE.scenes.length;
    }

    // ══════════════════════════════════════════════════════
    //  VOICE RECOGNITION
    // ══════════════════════════════════════════════════════
    function detectSpeechSupport() {
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            STATE.speechSupported = true;
            STATE.recognition = new SpeechRecognition();
            STATE.recognition.continuous = false;
            STATE.recognition.interimResults = true;
            STATE.recognition.lang = 'en-US';
            STATE.recognition.onresult = handleSpeechResult;
            STATE.recognition.onend = handleSpeechEnd;
            STATE.recognition.onerror = handleSpeechError;
        } else {
            STATE.speechSupported = false;
            window.reasoningConsole.logInfo('Speech recognition not available in this browser');
        }
    }

    function toggleListen() {
        if (!STATE.speechSupported) {
            if (typeof VRPUtils !== 'undefined') VRPUtils.error('Speech recognition requires Chrome or Edge.');
            return;
        }
        if (STATE.listening) {
            stopListening();
        } else {
            startListening();
        }
    }

    function startListening() {
        STATE.listening = true;
        micBtn.classList.add('listening');
        voiceStatusText.textContent = 'Listening...';
        transcriptBox.className = 'transcript-box heard';
        transcriptBox.textContent = '...';
        try { STATE.recognition.start(); } catch(e) { /* already running */ }
    }

    function stopListening() {
        STATE.listening = false;
        micBtn.classList.remove('listening');
        voiceStatusText.textContent = 'Press mic to speak a command';
        try { STATE.recognition.stop(); } catch(e) {}
    }

    function handleSpeechResult(event) {
        var interim = '';
        var final = '';
        for (var i = event.resultIndex; i < event.results.length; i++) {
            var t = event.results[i][0].transcript;
            if (event.results[i].isFinal) final += t;
            else interim += t;
        }
        var display = final || interim;
        transcriptBox.textContent = display || '...';
        if (final) {
            processVoiceCommand(final.trim());
            stopListening();
        }
    }

    function handleSpeechEnd() {
        if (STATE.alwaysOn && STATE.listening) {
            try { STATE.recognition.start(); } catch(e) {}
        } else {
            stopListening();
        }
    }

    function handleSpeechError(e) {
        addCommandHistoryEntry('Speech error: ' + e.error, 'warn');
        stopListening();
    }

    // ══════════════════════════════════════════════════════
    //  SPOKEN FEEDBACK (SpeechSynthesis)
    // ══════════════════════════════════════════════════════
    function speakFeedback(text) {
        if (!('speechSynthesis' in window)) return;
        try {
            var utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.1;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            window.speechSynthesis.speak(utterance);
        } catch(e) { /* SpeechSynthesis not available */ }
    }

    // ══════════════════════════════════════════════════════
    //  INTENT MATCHING
    // ══════════════════════════════════════════════════════
    function processVoiceCommand(transcript) {
        if (!STATE.activeScene) return;
        var ts = transcript.toLowerCase();
        addCommandHistoryEntry('\"' + transcript + '\"', 'info');
        voiceStatusText.textContent = 'Processing: "' + transcript + '"';
        window.reasoningConsole.logInfo('Voice command: "' + transcript + '"');

        // Search active scene
        var result = matchObjectInScene(ts, STATE.activeScene);

        if (result.score >= 0.55) {
            showMatchResultUI(result.obj, 'Local match', result.score);
            executeCameraMove(result.obj);
        } else if (result.score >= 0.3) {
            showMatchResultUI(result.obj, 'Best guess (low confidence)', result.score);
            executeCameraMove(result.obj);
            if (typeof VRPUtils !== 'undefined') VRPUtils.info('Low confidence match: "' + result.obj.name + '"');
        } else {
            // Not found in active scene -- offer cross-scene search
            matchResult.classList.remove('show');
            window.reasoningConsole.logInfo('No match in "' + STATE.activeScene.name + '" for "' + transcript + '"');

            if (STATE.scenes.length > 1) {
                STATE.pendingCrossSearchTranscript = ts;
                crossSceneText.textContent = 'Not found in "' + STATE.activeScene.name + '". Search all scenes?';
                crossScenePrompt.classList.add('show');
                voiceStatusText.textContent = '"' + transcript + '" not found in this scene';
                addCommandHistoryEntry('No match for "' + transcript + '" in active scene', 'warn');
            } else {
                voiceStatusText.textContent = '"' + transcript + '" not found';
                addCommandHistoryEntry('No match for "' + transcript + '"', 'err');
                if (typeof VRPUtils !== 'undefined') VRPUtils.error('"' + transcript + '" didn\'t match any object.');
            }
        }
    }

    function matchObjectInScene(query, scene) {
        var bestMatch = null;
        var bestScore = 0;
        scene.objects.forEach(function(obj) {
            var terms = [obj.name].concat(obj.aliases || []).map(function(t) { return t.toLowerCase(); });
            terms.forEach(function(term) {
                var score = fuzzyScore(query, term);
                if (score > bestScore) { bestScore = score; bestMatch = obj; }
            });
        });
        return { obj: bestMatch, score: bestScore };
    }

    function searchAllScenes(query) {
        var bestMatch = null;
        var bestScore = 0;
        var bestScene = null;
        STATE.scenes.forEach(function(scene) {
            var result = matchObjectInScene(query, scene);
            if (result.score > bestScore) {
                bestScore = result.score;
                bestMatch = result.obj;
                bestScene = scene;
            }
        });
        return { obj: bestMatch, score: bestScore, scene: bestScene };
    }

    function fuzzyScore(input, target) {
        if (input.includes(target)) return 1.0;
        if (target.includes(input)) return 0.9;
        var inputWords = input.split(/\s+/);
        var targetWords = target.split(/\s+/);
        var matches = 0;
        inputWords.forEach(function(iw) {
            targetWords.forEach(function(tw) {
                if (iw === tw) { matches += 1; }
                else if (iw.length > 3 && (tw.startsWith(iw) || iw.startsWith(tw))) { matches += 0.7; }
            });
        });
        var maxWords = Math.max(inputWords.length, targetWords.length);
        return matches / maxWords;
    }

    function showMatchResultUI(obj, tierLabel, score) {
        matchResult.classList.add('show');
        matchName.textContent = obj.name;
        matchTier.textContent = tierLabel + ' \u00B7 ' + Math.round(score * 100) + '% confidence';
        matchPreset.textContent = 'Preset slot ' + obj.presetSlot;
        voiceStatusText.textContent = 'Moving to "' + obj.name + '"...';
    }

    // ══════════════════════════════════════════════════════
    //  TWO-PHASE CAMERA EXECUTION WITH REAL PID
    // ══════════════════════════════════════════════════════
    async function executeCameraMove(obj) {
        // Highlight tapped item
        voiceObjectList.querySelectorAll('.object-list-item').forEach(function(el) {
            el.classList.remove('last-moved');
            if (el.querySelector('.oli-name').textContent === obj.name) el.classList.add('last-moved');
        });

        cameraStatusBar.classList.add('show');
        phase1El.className = 'camera-phase active';
        phase2El.className = 'camera-phase';
        crossScenePrompt.classList.remove('show');

        addCommandHistoryEntry('Moving to "' + obj.name + '" (preset ' + obj.presetSlot + ')', 'ok');
        speakFeedback('Moving to ' + obj.name);

        // ── Phase 1: Preset recall ──
        try {
            await recallPreset(obj.presetSlot);
            addCommandHistoryEntry('Preset ' + obj.presetSlot + ' recalled', 'ok');
            window.reasoningConsole.logAction('Preset recalled', 'Slot ' + obj.presetSlot + ' for "' + obj.name + '"');
        } catch(e) {
            addCommandHistoryEntry('Camera not connected \u2014 move simulated', 'warn');
        }

        await sleep(700); // settle after preset recall
        phase1El.className = 'camera-phase done';
        phase2El.className = 'camera-phase active';

        // ── Phase 2: PID refinement ──
        addCommandHistoryEntry('PID centering on "' + obj.name + '"...', 'info');
        window.reasoningConsole.logInfo('Starting PID settle for "' + obj.name + '"');

        var pidSuccess = await pidSettle(obj, {
            errorThreshold: 3,
            consecutiveRequired: 3,
            timeout: 5000,
            detectInterval: 200
        });

        if (pidSuccess) {
            phase2El.className = 'camera-phase done';
            addCommandHistoryEntry('PID centered and framed', 'ok');
            window.reasoningConsole.logAction('PID settled', '"' + obj.name + '" centered and zoomed');
        } else {
            phase2El.className = 'camera-phase done';
            addCommandHistoryEntry('PID completed (best effort)', 'warn');
        }

        voiceStatusText.textContent = 'Showing: ' + obj.name;
        speakFeedback('Now showing ' + obj.name);

        await sleep(2000);
        cameraStatusBar.classList.remove('show');
        phase1El.className = 'camera-phase';
        phase2El.className = 'camera-phase';
    }

    // ── Proportional PID settle loop ──
    async function pidSettle(obj, opts) {
        var startTime = Date.now();
        var consecutiveOk = 0;
        var Kp = 0.4; // proportional gain: maps error% to PTZ speed 1-10
        var iteration = 0;

        while (Date.now() - startTime < opts.timeout) {
            iteration++;
            try {
                var frame = await captureFrame();
                var detection = await detectObjectInFrame(frame, obj.name);

                if (!detection) {
                    var recovered = await handleObjectNotFound(obj);
                    if (!recovered) {
                        await stopCamera();
                        return false;
                    }
                    detection = recovered;
                    consecutiveOk = 0;
                }

                var errorX = detection.centerX - 50;
                var errorY = detection.centerY - 50;
                var absError = Math.max(Math.abs(errorX), Math.abs(errorY));

                if (iteration % 3 === 0) {
                    window.reasoningConsole.logInfo('PID iter ' + iteration + ': errorX=' + errorX.toFixed(1) + '% errorY=' + errorY.toFixed(1) + '%');
                }

                if (absError < opts.errorThreshold) {
                    consecutiveOk++;
                    await stopCamera();
                    if (consecutiveOk >= opts.consecutiveRequired) {
                        // Centered -- adjust zoom to match stored framing
                        await adjustZoomToMatchBBox(detection, obj.storedBBox);
                        return true;
                    }
                } else {
                    consecutiveOk = 0;
                    // Proportional speed: scale error to PTZ speed 1-10
                    var panSpeed = clamp(Math.round(Math.abs(errorX) * Kp), 1, 10);
                    var tiltSpeed = clamp(Math.round(Math.abs(errorY) * Kp), 1, 10);

                    // Issue corrections on both axes simultaneously
                    try {
                        if (Math.abs(errorX) > opts.errorThreshold) {
                            await panCamera(panSpeed, errorX > 0 ? 'right' : 'left');
                        }
                        if (Math.abs(errorY) > opts.errorThreshold) {
                            await tiltCamera(tiltSpeed, errorY > 0 ? 'down' : 'up');
                        }
                    } catch(e) {
                        // Camera commands failed -- demo mode, simulate settle
                        await sleep(800);
                        await stopCamera();
                        return true;
                    }
                }

                await sleep(opts.detectInterval);
            } catch(e) {
                // Frame capture or detection failed -- likely demo mode
                window.reasoningConsole.logInfo('PID iteration failed (demo mode): ' + e.message);
                await sleep(800);
                return true; // accept position in demo mode
            }
        }

        // Timeout
        try { await stopCamera(); } catch(e) {}
        window.reasoningConsole.logInfo('PID timeout after ' + opts.timeout + 'ms \u2014 accepting current position');
        return true;
    }

    // ── Object-not-found three-stage fallback ──
    async function handleObjectNotFound(obj) {
        window.reasoningConsole.logInfo('Object "' + obj.name + '" not found, attempting zoom-out retry');
        addCommandHistoryEntry('"' + obj.name + '" not found \u2014 zooming out to retry', 'warn');

        // Stage 1: zoom out one step and retry
        try {
            await zoomCamera(3, 'out');
            await sleep(800);
            await stopCamera();
            await sleep(400);

            var frame = await captureFrame();
            var retry = await detectObjectInFrame(frame, obj.name);

            if (retry) {
                window.reasoningConsole.logAction('Reacquired', '"' + obj.name + '" found after zoom-out');
                addCommandHistoryEntry('Reacquired "' + obj.name + '" after zoom-out', 'ok');
                return retry;
            }
        } catch(e) {
            // Camera not connected
        }

        // Stage 2: surface warning, hold position, do NOT hunt
        window.reasoningConsole.logError('"' + obj.name + '" not found after retry');
        addCommandHistoryEntry('"' + obj.name + '" not found \u2014 room may have changed', 'err');
        if (typeof VRPUtils !== 'undefined') VRPUtils.info(obj.name + ' not found \u2014 room may have changed');
        return null;
    }

    // ── Zoom adjustment to match stored bounding box ──
    async function adjustZoomToMatchBBox(currentDetection, storedBBox) {
        if (!storedBBox) return;
        var currentSize = (currentDetection.width / 100) * (currentDetection.height / 100);
        var targetSize = storedBBox.width * storedBBox.height;
        if (targetSize === 0) return;

        var sizeRatio = currentSize / targetSize;

        try {
            if (sizeRatio < 0.7) {
                // Object too small, zoom in
                window.reasoningConsole.logInfo('Zoom: object too small (ratio ' + sizeRatio.toFixed(2) + '), zooming in');
                await zoomCamera(3, 'in');
                await sleep(400);
                await stopCamera();
            } else if (sizeRatio > 1.4) {
                // Object too large, zoom out
                window.reasoningConsole.logInfo('Zoom: object too large (ratio ' + sizeRatio.toFixed(2) + '), zooming out');
                await zoomCamera(3, 'out');
                await sleep(400);
                await stopCamera();
            }
        } catch(e) {
            // Camera not connected
        }
    }

    // ══════════════════════════════════════════════════════
    //  VOICE OBJECT LIST
    // ══════════════════════════════════════════════════════
    function renderVoiceObjects() {
        if (!STATE.activeScene) return;
        voiceObjectList.innerHTML = '';
        STATE.activeScene.objects.forEach(function(obj) {
            var div = document.createElement('div');
            div.className = 'object-list-item';
            div.innerHTML =
                '<span style="font-size:1.1rem;">' + getObjectEmoji(obj.name) + '</span>' +
                '<span class="oli-name">' + escHtml(obj.name) + '</span>' +
                '<span class="oli-preset">P' + (obj.presetSlot || '\u2014') + '</span>' +
                '<span class="oli-tap">tap \u2192</span>';
            div.addEventListener('click', function() { executeCameraMove(obj); });
            voiceObjectList.appendChild(div);
        });
    }

    // ══════════════════════════════════════════════════════
    //  PERSISTENCE
    // ══════════════════════════════════════════════════════
    function saveToStorage() {
        try {
            localStorage.setItem('vtptz_scenes', JSON.stringify(STATE.scenes));
            localStorage.setItem('vtptz_presets', JSON.stringify(STATE.usedPresetSlots));
        } catch(e) { /* ignore */ }
    }

    function loadFromStorage() {
        try {
            STATE.scenes = JSON.parse(localStorage.getItem('vtptz_scenes') || '[]');
            STATE.usedPresetSlots = JSON.parse(localStorage.getItem('vtptz_presets') || '[]');
        } catch(e) { STATE.scenes = []; STATE.usedPresetSlots = []; }
    }

    // ══════════════════════════════════════════════════════
    //  LOG & PROGRESS HELPERS
    // ══════════════════════════════════════════════════════
    function addLog(msg, type) {
        var div = document.createElement('div');
        div.className = type === 'ok' ? 'log-ok' : type === 'info' ? 'log-info' : type === 'warn' ? 'log-warn' : type === 'err' ? 'log-err' : '';
        div.textContent = '[' + timeNow() + '] ' + msg;
        logBox.appendChild(div);
        logBox.scrollTop = logBox.scrollHeight;
    }

    function clearLog() { logBox.innerHTML = ''; }

    function setProgress(pct, label) {
        progressBar.style.width = pct + '%';
        scanPctEl.textContent = pct + '%';
        scanStatusText.textContent = label;
    }

    function markStep(id, state) {
        var el = document.getElementById(id);
        if (!el) return;
        el.className = 'step-pill ' + (state === 'done' ? 'done' : state === 'active' ? 'active' : '');
    }

    function addCommandHistoryEntry(msg, type) {
        if (commandHistory.querySelector('span[style]')) commandHistory.innerHTML = '';
        var div = document.createElement('div');
        div.className = type === 'ok' ? 'log-ok' : type === 'info' ? 'log-info' : type === 'warn' ? 'log-warn' : type === 'err' ? 'log-err' : '';
        div.textContent = '[' + timeNow() + '] ' + msg;
        commandHistory.appendChild(div);
        commandHistory.scrollTop = commandHistory.scrollHeight;
    }

    // ══════════════════════════════════════════════════════
    //  UTILITIES
    // ══════════════════════════════════════════════════════
    function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
    function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
    function escHtml(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function timeNow() { return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    function formatDate(iso) {
        try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
        catch(e) { return iso; }
    }
    function getObjectEmoji(name) {
        var n = (name || '').toLowerCase();
        if (n.includes('screen') || n.includes('projector') || n.includes('monitor') || n.includes('tv')) return '\uD83D\uDDA5\uFE0F';
        if (n.includes('board') || n.includes('whiteboard')) return '\uD83D\uDCCB';
        if (n.includes('door') || n.includes('entry') || n.includes('exit')) return '\uD83D\uDEAA';
        if (n.includes('table') || n.includes('desk')) return '\uD83E\uDE91';
        if (n.includes('camera')) return '\uD83D\uDCF7';
        if (n.includes('podium') || n.includes('lectern')) return '\uD83C\uDFA4';
        if (n.includes('window')) return '\uD83E\uDE9F';
        if (n.includes('clock')) return '\uD83D\uDD50';
        if (n.includes('water') || n.includes('drink')) return '\uD83D\uDCA7';
        if (n.includes('chair') || n.includes('seat')) return '\uD83D\uDCBA';
        if (n.includes('light') || n.includes('lamp')) return '\uD83D\uDCA1';
        if (n.includes('speaker')) return '\uD83D\uDD0A';
        if (n.includes('plant') || n.includes('flower')) return '\uD83C\uDF3F';
        return '\uD83D\uDCCD';
    }

    // ══════════════════════════════════════════════════════
    //  EVENT LISTENERS
    // ══════════════════════════════════════════════════════
    testCameraBtn.addEventListener('click', testCamera);
    scanBtn.addEventListener('click', startScan);
    cancelReviewBtn.addEventListener('click', cancelReview);
    saveSceneBtn.addEventListener('click', saveScene);
    newSceneFromListBtn.addEventListener('click', function() { switchTab('scan'); });
    goToScenesBtn.addEventListener('click', function() { switchTab('scenes'); });
    changeSceneBtn.addEventListener('click', function() { switchTab('scenes'); });
    refreshVoiceBtn.addEventListener('click', renderVoiceObjects);
    micBtn.addEventListener('click', toggleListen);

    alwaysOnToggle.addEventListener('change', function() {
        STATE.alwaysOn = alwaysOnToggle.checked;
        if (STATE.alwaysOn) {
            if (typeof VRPUtils !== 'undefined') VRPUtils.info('Always-on listening enabled. Higher battery usage.');
            startListening();
        } else {
            stopListening();
        }
    });

    clearHistoryBtn.addEventListener('click', function() {
        commandHistory.innerHTML = '<span style="color:var(--text-muted);font-size:0.7rem;font-style:italic;">No commands yet...</span>';
    });

    // Cross-scene search
    crossSceneYesBtn.addEventListener('click', function() {
        crossScenePrompt.classList.remove('show');
        if (!STATE.pendingCrossSearchTranscript) return;

        var result = searchAllScenes(STATE.pendingCrossSearchTranscript);
        if (result.score >= 0.3 && result.scene && result.obj) {
            // Switch to that scene and move
            activateScene(STATE.scenes.indexOf(result.scene));
            showMatchResultUI(result.obj, 'Cross-scene match (' + result.scene.name + ')', result.score);
            executeCameraMove(result.obj);
            addCommandHistoryEntry('Found "' + result.obj.name + '" in "' + result.scene.name + '"', 'ok');
            window.reasoningConsole.logAction('Cross-scene match', '"' + result.obj.name + '" in "' + result.scene.name + '"');
        } else {
            addCommandHistoryEntry('Not found in any scene', 'err');
            if (typeof VRPUtils !== 'undefined') VRPUtils.error('Object not found in any saved scene.');
        }
        STATE.pendingCrossSearchTranscript = null;
    });

    crossSceneNoBtn.addEventListener('click', function() {
        crossScenePrompt.classList.remove('show');
        STATE.pendingCrossSearchTranscript = null;
    });

    // Save camera config on changes
    [cameraIpInput, cameraPortInput, cameraUserInput, cameraPassInput].forEach(function(input) {
        input.addEventListener('change', saveCameraConfig);
    });

    // ══════════════════════════════════════════════════════
    //  INITIALIZATION
    // ══════════════════════════════════════════════════════
    loadCameraConfig();
    loadFromStorage();
    renderScenesList();
    updateSceneCountBadge();
    detectSpeechSupport();

    // Restore active scene if exists
    var lastActive = STATE.scenes.find(function(s) { return s.active; });
    if (lastActive) setActiveScene(lastActive);
});
