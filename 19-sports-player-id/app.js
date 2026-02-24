document.addEventListener('DOMContentLoaded', async function() {
    // ══════════════════════════════════════════════════
    //  DOM REFERENCES
    // ══════════════════════════════════════════════════
    const video = document.getElementById('video');
    const overlayCanvas = document.getElementById('overlayCanvas');
    const ctx = overlayCanvas.getContext('2d');
    const engineMoondreamBtn = document.getElementById('engineMoondreamBtn');
    const roboflowInfo = document.getElementById('roboflowInfo');
    const intervalSelect = document.getElementById('intervalSelect');
    const confidenceSlider = document.getElementById('confidenceSlider');
    const confidenceValue = document.getElementById('confidenceValue');
    const confirmCount = document.getElementById('confirmCount');
    const detPlayerCount = document.getElementById('detPlayerCount');
    const teamALabel = document.getElementById('teamALabel');
    const teamBLabel = document.getElementById('teamBLabel');
    const teamACount = document.getElementById('teamACount');
    const teamBCount = document.getElementById('teamBCount');
    const teamABlock = document.getElementById('teamABlock');
    const teamBBlock = document.getElementById('teamBBlock');
    const playerList = document.getElementById('playerList');
    const teamAName = document.getElementById('teamAName');
    const teamBName = document.getElementById('teamBName');
    const teamAColor = document.getElementById('teamAColor');
    const teamBColor = document.getElementById('teamBColor');
    const rosterEntriesA = document.getElementById('rosterEntriesA');
    const rosterEntriesB = document.getElementById('rosterEntriesB');
    const addPlayerA = document.getElementById('addPlayerA');
    const addPlayerB = document.getElementById('addPlayerB');
    const statDuration = document.getElementById('statDuration');
    const statFrames = document.getElementById('statFrames');
    const statIdentified = document.getElementById('statIdentified');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const statusBar = document.getElementById('status');
    const historyLog = document.getElementById('historyLog');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // ══════════════════════════════════════════════════
    //  STATE
    // ══════════════════════════════════════════════════
    let engine = 'onnx-local'; // 'onnx-local' | 'roboflow-cloud' | 'moondream'
    let moondreamClient = null;
    let running = false;
    let analysisTimeout = null;
    let durationInterval = null;
    let sessionStart = null;
    let framesAnalyzed = 0;
    let totalConfidence = 0;


    // Roboflow API key — used for cloud inference
    var ROBOFLOW_DEFAULT_KEY = 'eMRExtPvBQ73dtzKu8Yu';

    // Local ONNX player detection model
    var playerOnnxModel = null;
    var playerModelLoaded = false;
    var PLAYER_ONNX_PATH = 'model/rfdetr-player.onnx';
    // 12 output classes: 11 object classes + 1 background (index may vary)
    // The class mapping depends on training — check Roboflow project for exact order
    var PLAYER_CLASS_NAMES = {
        0: 'ball', 1: 'ball-in-basket', 2: 'number', 3: 'player',
        4: 'player-in-possession', 5: 'player-jump-shot', 6: 'player-layup-dunk',
        7: 'player-shot-block', 8: 'referee', 9: 'rim', 10: 'background', 11: 'background'
    };

    // FPS tracking
    let fpsHistory = [];
    let lastFrameTime = 0;

    // ByteTrack tracker instance
    let byteTracker = new ByteTrackTracker({
        trackHighThresh: 0.5,
        matchThresh: 0.8,
        trackBuffer: 30
    });
    // Per-track metadata keyed by trackId (survives across ByteTrack updates)
    let trackMeta = {}; // trackId -> {team, numberReadings[], confirmedNumber, name}
    let teamColors = { A: '#E8E8E8', B: '#1A5276' };
    let identifiedCount = 0;
    let showTrajectories = true;

    // Roster: { A: [{number, name}], B: [{number, name}] }
    let roster = { A: [], B: [] };

    // Default sample roster (basketball demo)
    var DEFAULT_ROSTER = {
        A: [
            { number: '30', name: 'Player A' },
            { number: '20', name: 'Player B' },
            { number: '1',  name: 'Player C' },
            { number: '10', name: 'Player D' },
            { number: '2',  name: 'Player E' },
        ],
        B: [
            { number: '8',  name: 'Player A' },
            { number: '2',  name: 'Player B' },
            { number: '4',  name: 'Player C' },
            { number: '5',  name: 'Player D' },
            { number: '11', name: 'Player E' },
        ]
    };
    var DEFAULT_TEAM_A_NAME = 'White Team';
    var DEFAULT_TEAM_B_NAME = 'Blue Team';
    var DEFAULT_TEAM_A_COLOR = '#E8E8E8';
    var DEFAULT_TEAM_B_COLOR = '#1A5276';

    // History log
    let historyEntries = [];

    // Roboflow model config
    var ROBOFLOW_MODEL = 'basketball-player-detection-3-ycjdo';
    var ROBOFLOW_VERSION = '13';
    var ROBOFLOW_PLAYER_CLASSES = ['player', 'player-in-possession', 'player-jump-shot', 'player-layup-dunk', 'player-shot-block'];
    var ROBOFLOW_NUMBER_CLASS = 'number';
    var ROBOFLOW_ALL_CLASSES = ['ball', 'ball-in-basket', 'number', 'player', 'player-in-possession', 'player-jump-shot', 'player-layup-dunk', 'player-shot-block', 'referee', 'rim'];

    // ══════════════════════════════════════════════════
    //  SHARED MODULE INIT
    // ══════════════════════════════════════════════════
    window.reasoningConsole = new ReasoningConsole({ startCollapsed: true, maxEntries: 200 });

    window.apiKeyManager = new APIKeyManager({
        requireMoondream: false,
        requireOpenAI: false,
        showRoboflow: true,
        onKeysChanged: function(keys) {
            if (keys.moondream) {
                moondreamClient = new MoondreamClient(keys.moondream);
                window.reasoningConsole.logInfo('Moondream API key configured');
            }
            if (keys.roboflow) {
                window.reasoningConsole.logInfo('Roboflow API key configured');
            }
            updateStatus('Ready');
        }
    });

    if (window.apiKeyManager.hasMoondreamKey()) {
        moondreamClient = new MoondreamClient(window.apiKeyManager.getMoondreamKey());
    }
    window.reasoningConsole.logInfo('Sports Player Identifier initialized');

    // ══════════════════════════════════════════════════
    //  VIDEO FRAME CAPTURE
    // ══════════════════════════════════════════════════
    function captureFrame() {
        var c = document.createElement('canvas');
        c.width = video.videoWidth || 640;
        c.height = video.videoHeight || 480;
        c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', 0.85);
    }

    // ══════════════════════════════════════════════════
    //  ROBOFLOW DETECTION ENGINE
    // ══════════════════════════════════════════════════
    function captureResizedFrame(maxWidth) {
        var source = video;
        var sw = source.videoWidth || 640;
        var sh = source.videoHeight || 480;
        var scale = Math.min(1, maxWidth / sw);
        var c = document.createElement('canvas');
        c.width = Math.round(sw * scale);
        c.height = Math.round(sh * scale);
        c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', 0.7);
    }

    async function roboflowCloudDetect(imageBase64) {
        var apiKey = window.apiKeyManager.hasRoboflowKey()
            ? window.apiKeyManager.getRoboflowKey()
            : ROBOFLOW_DEFAULT_KEY;

        var confidence = parseInt(confidenceSlider.value) / 100;
        var url = 'https://detect.roboflow.com/' + ROBOFLOW_MODEL + '/' + ROBOFLOW_VERSION
            + '?api_key=' + apiKey + '&confidence=' + confidence;

        var startTime = Date.now();
        window.reasoningConsole.logApiCall('/roboflow/cloud', 0);

        // Use a smaller frame for faster upload
        var resized = captureResizedFrame(640);
        // Strip the data URL prefix — Roboflow API expects raw base64
        var base64Only = resized.replace(/^data:image\/\w+;base64,/, '');

        var resp = await fetch(url, {
            method: 'POST',
            body: base64Only,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (!resp.ok) throw new Error('Roboflow API error ' + resp.status);
        var data = await resp.json();
        var latency = Date.now() - startTime;
        window.reasoningConsole.logApiCall('/roboflow/detect', latency);

        // Separate players and numbers
        var players = [];
        var numbers = [];
        var others = [];

        (data.predictions || []).forEach(function(pred) {
            var bbox = {
                x: pred.x - pred.width / 2,
                y: pred.y - pred.height / 2,
                w: pred.width,
                h: pred.height,
                confidence: pred.confidence,
                class: pred.class
            };
            if (ROBOFLOW_PLAYER_CLASSES.indexOf(pred.class) !== -1) {
                players.push(bbox);
            } else if (pred.class === ROBOFLOW_NUMBER_CLASS) {
                numbers.push(bbox);
            } else {
                others.push(bbox);
            }
        });

        window.reasoningConsole.logInfo('Roboflow: ' + players.length + ' players, ' + numbers.length + ' numbers, ' + others.length + ' other (' + latency + 'ms)');
        return { players: players, numbers: numbers, others: others, imageWidth: data.image ? data.image.width : 640, imageHeight: data.image ? data.image.height : 480 };
    }

    // ══════════════════════════════════════════════════
    //  MOONDREAM DETECTION ENGINE
    // ══════════════════════════════════════════════════
    async function moondreamDetect(imageBase64) {
        if (!moondreamClient) {
            window.apiKeyManager.showModal();
            throw new Error('No Moondream API key configured');
        }

        var startTime = Date.now();
        window.reasoningConsole.logApiCall('/moondream/detect', 0);
        var result = await moondreamClient.detect(imageBase64, 'person');
        var latency = Date.now() - startTime;
        window.reasoningConsole.logApiCall('/moondream/detect', latency);

        // Convert Moondream detections (normalized 0-1) to pixel coordinates
        var vw = video.videoWidth || 640;
        var vh = video.videoHeight || 480;
        var players = (result.objects || []).map(function(obj) {
            return {
                x: obj.x_min * vw,
                y: obj.y_min * vh,
                w: (obj.x_max - obj.x_min) * vw,
                h: (obj.y_max - obj.y_min) * vh,
                confidence: 0.8,
                class: 'player'
            };
        });

        window.reasoningConsole.logInfo('Moondream: ' + players.length + ' players (' + latency + 'ms)');
        return { players: players, numbers: [], others: [], imageWidth: vw, imageHeight: vh };
    }

    // ══════════════════════════════════════════════════
    //  MOONDREAM JERSEY OCR (fallback engine only)
    // ══════════════════════════════════════════════════
    async function moondreamOCR(imageBase64, playerBbox) {
        if (!moondreamClient) return null;

        // Crop the player region from the image
        var img = new Image();
        await new Promise(function(res) { img.onload = res; img.src = imageBase64; });
        var c = document.createElement('canvas');
        c.width = Math.max(1, playerBbox.w);
        c.height = Math.max(1, playerBbox.h);
        c.getContext('2d').drawImage(img, playerBbox.x, playerBbox.y, playerBbox.w, playerBbox.h, 0, 0, c.width, c.height);
        var crop = c.toDataURL('image/jpeg', 0.9);

        try {
            var result = await moondreamClient.ask(crop, 'What jersey number is visible on this player? Reply with ONLY the number, or "unknown" if not visible.');
            var answer = (result.answer || '').trim();
            // Extract just the number
            var match = answer.match(/\d+/);
            return match ? match[0] : null;
        } catch (e) {
            return null;
        }
    }

    // ══════════════════════════════════════════════════
    //  LOCAL ONNX PLAYER DETECTION
    // ══════════════════════════════════════════════════
    async function loadPlayerModel() {
        if (playerModelLoaded) return true;
        updateStatus('Loading local ONNX model...');
        window.reasoningConsole.logInfo('Loading player detection ONNX model...');

        playerOnnxModel = new OnnxModelRunner(PLAYER_ONNX_PATH, {
            inputWidth: 640,
            inputHeight: 640,
            task: 'detect',
            classNames: PLAYER_CLASS_NAMES
        });

        var loaded = await playerOnnxModel.load(function(msg) {
            updateStatus('ONNX: ' + msg);
        });

        playerModelLoaded = loaded;
        if (loaded) {
            window.reasoningConsole.logInfo('Player ONNX model loaded');
            updateStatus('Local model ready');
        } else {
            window.reasoningConsole.logError('Player ONNX model failed to load');
            updateStatus('Local model failed — try Cloud engine', true);
        }
        return loaded;
    }

    async function onnxLocalDetect() {
        if (!playerModelLoaded) {
            var ok = await loadPlayerModel();
            if (!ok) throw new Error('Local ONNX model not available');
        }

        var confidence = parseInt(confidenceSlider.value) / 100;
        var startTime = Date.now();

        var result = await playerOnnxModel.infer(video, confidence);
        var latency = Date.now() - startTime;

        // Parse into standard format
        var players = [];
        var numbers = [];
        var others = [];

        (result.detections || []).forEach(function(det) {
            if (ROBOFLOW_PLAYER_CLASSES.indexOf(det.class) !== -1) {
                players.push(det);
            } else if (det.class === ROBOFLOW_NUMBER_CLASS) {
                numbers.push(det);
            } else {
                others.push(det);
            }
        });

        var vw = video.videoWidth || 640;
        var vh = video.videoHeight || 480;

        if (framesAnalyzed % 20 === 0 || latency > 500) {
            window.reasoningConsole.logInfo('ONNX Local: ' + players.length + ' players, ' + numbers.length + ' numbers (' + latency + 'ms)');
        }
        return { players: players, numbers: numbers, others: others, imageWidth: vw, imageHeight: vh };
    }

    // ══════════════════════════════════════════════════
    //  FPS TRACKING
    // ══════════════════════════════════════════════════
    function updateFPS() {
        var now = performance.now();
        if (lastFrameTime > 0) {
            var delta = now - lastFrameTime;
            fpsHistory.push(1000 / delta);
            if (fpsHistory.length > 30) fpsHistory.shift();
        }
        lastFrameTime = now;

        if (fpsHistory.length > 0) {
            var avg = fpsHistory.reduce(function(a, b) { return a + b; }, 0) / fpsHistory.length;
            document.getElementById('statFps').textContent = avg.toFixed(1);
        }
    }

    // ══════════════════════════════════════════════════
    //  K-MEANS TEAM CLUSTERING (2 teams from uniform color)
    // ══════════════════════════════════════════════════
    function sampleDominantColor(imageBase64, bbox) {
        // Create temp canvas, draw image, sample center of player crop (uniform area)
        var c = document.createElement('canvas');
        var cx = c.getContext('2d');
        var img = new Image();
        img.src = imageBase64;
        c.width = Math.max(1, Math.round(bbox.w));
        c.height = Math.max(1, Math.round(bbox.h));

        try {
            cx.drawImage(img, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, c.width, c.height);
            // Sample the center 40% of the crop (where the jersey is)
            var sx = Math.round(c.width * 0.3);
            var sy = Math.round(c.height * 0.2);
            var sw = Math.max(1, Math.round(c.width * 0.4));
            var sh = Math.max(1, Math.round(c.height * 0.4));
            var data = cx.getImageData(sx, sy, sw, sh).data;
            var r = 0, g = 0, b = 0, count = 0;
            for (var i = 0; i < data.length; i += 4) {
                r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
            }
            return count > 0 ? [r / count, g / count, b / count] : [128, 128, 128];
        } catch (e) {
            return [128, 128, 128];
        }
    }

    function kMeans2(colors) {
        // Simple 2-cluster K-means on RGB arrays
        if (colors.length <= 1) return colors.map(function() { return 0; });
        if (colors.length === 2) return [0, 1];

        // Init centroids as first and last sorted by brightness
        var sorted = colors.map(function(c, i) { return { c: c, i: i, brightness: c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114 }; });
        sorted.sort(function(a, b) { return a.brightness - b.brightness; });
        var c0 = sorted[0].c.slice();
        var c1 = sorted[sorted.length - 1].c.slice();

        var assignments = new Array(colors.length).fill(0);
        for (var iter = 0; iter < 10; iter++) {
            // Assign
            for (var i = 0; i < colors.length; i++) {
                var d0 = colorDist(colors[i], c0);
                var d1 = colorDist(colors[i], c1);
                assignments[i] = d0 <= d1 ? 0 : 1;
            }
            // Update centroids
            var sum0 = [0, 0, 0], sum1 = [0, 0, 0], n0 = 0, n1 = 0;
            for (var j = 0; j < colors.length; j++) {
                if (assignments[j] === 0) { sum0[0] += colors[j][0]; sum0[1] += colors[j][1]; sum0[2] += colors[j][2]; n0++; }
                else { sum1[0] += colors[j][0]; sum1[1] += colors[j][1]; sum1[2] += colors[j][2]; n1++; }
            }
            if (n0 > 0) c0 = [sum0[0] / n0, sum0[1] / n0, sum0[2] / n0];
            if (n1 > 0) c1 = [sum1[0] / n1, sum1[1] / n1, sum1[2] / n1];
        }
        return assignments;
    }

    function colorDist(a, b) {
        return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2));
    }

    // ══════════════════════════════════════════════════
    //  IoS (Intersection over Smaller) — pair numbers to players
    // ══════════════════════════════════════════════════
    function ios(boxA, boxB) {
        var x1 = Math.max(boxA.x, boxB.x);
        var y1 = Math.max(boxA.y, boxB.y);
        var x2 = Math.min(boxA.x + boxA.w, boxB.x + boxB.w);
        var y2 = Math.min(boxA.y + boxA.h, boxB.y + boxB.h);
        if (x2 <= x1 || y2 <= y1) return 0;
        var intersection = (x2 - x1) * (y2 - y1);
        var areaA = boxA.w * boxA.h;
        var areaB = boxB.w * boxB.h;
        var smaller = Math.min(areaA, areaB);
        return smaller > 0 ? intersection / smaller : 0;
    }

    function pairNumbersToPlayers(players, numbers) {
        var pairs = {}; // playerIndex -> numberBbox
        numbers.forEach(function(num) {
            var bestIdx = -1, bestIos = 0;
            players.forEach(function(p, pi) {
                var score = ios(p, num);
                if (score > bestIos) { bestIos = score; bestIdx = pi; }
            });
            if (bestIdx >= 0 && bestIos >= 0.7) {
                pairs[bestIdx] = num;
            }
        });
        return pairs;
    }

    // ══════════════════════════════════════════════════
    //  BYTETRACK INTEGRATION
    // ══════════════════════════════════════════════════
    function updateTrackedPlayers(detectedPlayers, teamAssignments, numberPairs, imageBase64) {
        // Convert detections to ByteTrack format
        var btDetections = detectedPlayers.map(function(det, di) {
            return {
                bbox: { x: det.x, y: det.y, w: det.w, h: det.h },
                score: det.confidence || 0.5,
                cls: det.class || 'player',
                extra: { detIndex: di, team: teamAssignments[di] === 0 ? 'A' : 'B', playerClass: det.class }
            };
        });

        // Run ByteTrack update — the core two-phase association
        var activeTracks = byteTracker.update(btDetections);

        // Sync track metadata (team, number readings, etc.)
        activeTracks.forEach(function(at) {
            var tid = at.trackId;
            if (!trackMeta[tid]) {
                trackMeta[tid] = {
                    team: at.extra.team || 'A',
                    numberReadings: [],
                    confirmedNumber: null,
                    name: null,
                    playerClass: at.cls
                };
            }
            // Update team from latest detection's cluster assignment
            if (at.extra.team) trackMeta[tid].team = at.extra.team;
            if (at.extra.playerClass) trackMeta[tid].playerClass = at.extra.playerClass;
        });

        // Build the trackedPlayers array for the rest of the pipeline
        trackedPlayers = activeTracks.map(function(at) {
            var meta = trackMeta[at.trackId] || {};
            return {
                id: at.trackId,
                bbox: at.bbox,
                team: meta.team || 'A',
                numberReadings: meta.numberReadings || [],
                confirmedNumber: meta.confirmedNumber || null,
                name: meta.name || null,
                lastSeen: Date.now(),
                confidence: at.score,
                playerClass: meta.playerClass || at.cls,
                trajectory: at.trajectory || [],
                trackletLen: at.trackletLen || 0
            };
        });
    }

    // Helper to get trackedPlayers (used throughout the pipeline)
    var trackedPlayers = [];

    // ══════════════════════════════════════════════════
    //  NUMBER CONFIRMATION HEURISTIC
    // ══════════════════════════════════════════════════
    function addNumberReading(trackId, number) {
        if (!number) return;
        var meta = trackMeta[trackId];
        if (!meta) return;
        if (meta.confirmedNumber) return;

        meta.numberReadings.push(number);
        var needed = parseInt(confirmCount.value) || 3;
        var recent = meta.numberReadings.slice(-needed);
        if (recent.length >= needed && recent.every(function(n) { return n === recent[0]; })) {
            meta.confirmedNumber = recent[0];
            meta.name = lookupRoster(meta.team, meta.confirmedNumber);
            identifiedCount++;
            updateSessionStats();

            var tp = trackedPlayers.find(function(p) { return p.id === trackId; });
            var conf = tp ? tp.confidence : 0.8;
            var label = (meta.name ? meta.name + ' (#' + meta.confirmedNumber + ')' : '#' + meta.confirmedNumber);
            addHistoryEntry(meta.team, label, conf);
            window.reasoningConsole.logDecision('ID Confirmed', 'Team ' + meta.team + ' ' + label);
        }
    }

    function lookupRoster(team, number) {
        var entries = roster[team] || [];
        for (var i = 0; i < entries.length; i++) {
            if (String(entries[i].number) === String(number)) return entries[i].name;
        }
        return null;
    }

    // ══════════════════════════════════════════════════
    //  ROBOFLOW NUMBER OCR (uses VLM query on number crop)
    // ══════════════════════════════════════════════════
    async function ocrNumberCrops(imageBase64, players, numberPairs) {
        // For each player that has a paired number bbox, try to read the number
        var promises = [];
        Object.keys(numberPairs).forEach(function(pi) {
            var numBbox = numberPairs[pi];
            var playerIdx = parseInt(pi);
            var tp = trackedPlayers[playerIdx];
            if (!tp || tp.confirmedNumber) return;

            // If Moondream is available, use it for OCR on the number crop
            if (moondreamClient) {
                promises.push(
                    moondreamOCR(imageBase64, numBbox).then(function(num) {
                        if (num) addNumberReading(tp.id, num);
                    }).catch(function() {})
                );
            }
        });
        if (promises.length > 0) await Promise.all(promises);
    }

    // ══════════════════════════════════════════════════
    //  MAIN ANALYSIS PIPELINE
    // ══════════════════════════════════════════════════
    async function analyzeFrame() {
        if (!running) return;

        // Skip analysis when frozen (edit mode)
        if (frozen) {
            if (running) {
                var interval = parseInt(intervalSelect.value) || 1000;
                analysisTimeout = setTimeout(analyzeFrame, interval);
            }
            return;
        }

        var imageBase64 = captureFrame();

        try {
            // Step 1: Detect — dispatch to selected engine
            var detResult;
            if (engine === 'onnx-local') {
                detResult = await onnxLocalDetect();
            } else if (engine === 'roboflow-cloud') {
                detResult = await roboflowCloudDetect(imageBase64);
            } else {
                detResult = await moondreamDetect(imageBase64);
            }

            framesAnalyzed++;
            updateFPS();

            // Step 2: Team clustering via K-means on uniform colors
            if (!imageBase64 || engine === 'onnx-local') {
                imageBase64 = captureFrame();
            }
            var colors = detResult.players.map(function(p) {
                return sampleDominantColor(imageBase64, p);
            });
            var teamAssignments = kMeans2(colors);

            // Step 3: Pair numbers to players (Roboflow engines — numbers come from detector)
            var numberPairs = {};
            if (detResult.numbers.length > 0) {
                numberPairs = pairNumbersToPlayers(detResult.players, detResult.numbers);
            }

            // Step 4: Update tracker
            updateTrackedPlayers(detResult.players, teamAssignments, numberPairs, imageBase64);

            // Step 5: OCR jersey numbers
            if ((engine === 'roboflow-cloud' || engine === 'onnx-local') && Object.keys(numberPairs).length > 0 && moondreamClient) {
                if (engine === 'roboflow-cloud' || framesAnalyzed % 15 === 0) {
                    ocrNumberCrops(imageBase64, detResult.players, numberPairs);
                }
            } else if (engine === 'moondream') {
                var unconfirmed = trackedPlayers.filter(function(tp) { return !tp.confirmedNumber; }).slice(0, 3);
                for (var i = 0; i < unconfirmed.length; i++) {
                    var num = await moondreamOCR(imageBase64, unconfirmed[i].bbox);
                    if (num) addNumberReading(unconfirmed[i].id, num);
                }
            }

            // Step 6: Update confidence stats
            detResult.players.forEach(function(p) { totalConfidence += p.confidence; });

            // Step 7: Draw overlays
            lastDetResult = detResult;
            drawOverlays(detResult);
            updateDetectionCard();
            updateSessionStats();
            renderDetList();
            updateCourtMap();

            var fpsStr = fpsHistory.length > 0 ? ' @ ' + (fpsHistory.reduce(function(a,b){return a+b;},0) / fpsHistory.length).toFixed(1) + ' FPS' : '';
            updateStatus('Analyzing (' + engine + ') — ' + detResult.players.length + ' players' + fpsStr);

        } catch (e) {
            window.reasoningConsole.logError('Analysis error: ' + e.message);
            updateStatus('Error: ' + e.message, true);
        }

        // Schedule next frame
        if (running) {
            var interval = parseInt(intervalSelect.value);
            if (interval === 0 && engine === 'onnx-local') {
                requestAnimationFrame(function() { analyzeFrame(); });
            } else {
                analysisTimeout = setTimeout(analyzeFrame, interval || 200);
            }
        }
    }

    // ══════════════════════════════════════════════════
    //  DRAW OVERLAYS
    // ══════════════════════════════════════════════════
    function drawOverlays(detResult) {
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        var scaleX = overlayCanvas.width / (detResult.imageWidth || overlayCanvas.width);
        var scaleY = overlayCanvas.height / (detResult.imageHeight || overlayCanvas.height);

        // Draw other detections (ball, rim, referee)
        detResult.others.forEach(function(o) {
            var x = o.x * scaleX, y = o.y * scaleY, w = o.w * scaleX, h = o.h * scaleY;
            ctx.strokeStyle = o.class === 'referee' ? '#FFD700' : o.class === 'ball' || o.class === 'ball-in-basket' ? '#FF8C00' : '#888';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);
            drawLabel(ctx, o.class, x, y - 4, ctx.strokeStyle);
        });

        // Draw tracked players
        trackedPlayers.forEach(function(tp) {
            if (hiddenTracks.has(tp.id)) return; // skip hidden tracks
            var color = tp.team === 'A' ? teamColors.A : teamColors.B;
            var meta = trackMeta[tp.id] || {};
            var isSelected = tp.id === selectedTrackId;
            var x = tp.bbox.x * scaleX, y = tp.bbox.y * scaleY;
            var w = tp.bbox.w * scaleX, h = tp.bbox.h * scaleY;

            // Trajectory line (ByteTrack feature)
            if (showTrajectories && tp.trajectory && tp.trajectory.length > 1) {
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.6;
                for (var ti = 0; ti < tp.trajectory.length; ti++) {
                    var pt = tp.trajectory[ti];
                    var px = pt.cx * scaleX;
                    var py = pt.cy * scaleY;
                    if (ti === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();
                // Draw a small dot at current position
                ctx.beginPath();
                ctx.arc(tp.trajectory[tp.trajectory.length - 1].cx * scaleX, tp.trajectory[tp.trajectory.length - 1].cy * scaleY, 3, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }

            // Bounding box
            ctx.strokeStyle = isSelected ? '#00BFFF' : color;
            ctx.lineWidth = isSelected ? 4 : (meta.confirmedNumber) ? 3 : 2;
            if (isSelected) ctx.setLineDash([6, 3]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);

            // Selection highlight + resize handle (edit mode)
            if (isSelected && editMode) {
                // Corner handles
                var hs = 6;
                ctx.fillStyle = '#00BFFF';
                ctx.fillRect(x - hs / 2, y - hs / 2, hs, hs);                 // top-left
                ctx.fillRect(x + w - hs / 2, y - hs / 2, hs, hs);             // top-right
                ctx.fillRect(x - hs / 2, y + h - hs / 2, hs, hs);             // bottom-left
                ctx.fillRect(x + w - hs / 2, y + h - hs / 2, hs + 2, hs + 2); // bottom-right (resize)
            }

            // Track ID badge (top-right corner)
            var idBadge = 'T' + tp.id;
            ctx.font = 'bold 10px sans-serif';
            var idW = ctx.measureText(idBadge).width + 6;
            ctx.fillStyle = color;
            ctx.fillRect(x + w - idW, y, idW, 14);
            ctx.fillStyle = '#000';
            ctx.fillText(idBadge, x + w - idW + 3, y + 11);

            // Label
            var label = '';
            if (meta.confirmedNumber) {
                label = meta.name ? meta.name + ' #' + meta.confirmedNumber : '#' + meta.confirmedNumber;
            } else if (meta.numberReadings && meta.numberReadings.length > 0) {
                label = '#' + meta.numberReadings[meta.numberReadings.length - 1] + '?';
            } else {
                label = 'P' + tp.id;
            }

            var teamName = tp.team === 'A' ? (teamAName.value || 'Team A') : (teamBName.value || 'Team B');
            label = teamName + ' ' + label;

            drawLabel(ctx, label, x, y - 4, color);

            // Player class badge (e.g., jump-shot, layup)
            var pClass = meta.playerClass || tp.playerClass;
            if (pClass && pClass !== 'player') {
                var badge = pClass.replace('player-', '').replace(/-/g, ' ');
                drawLabel(ctx, badge, x, y + h + 14, '#FFD700');
            }
        });

        // Draw number bounding boxes
        detResult.numbers.forEach(function(n) {
            var x = n.x * scaleX, y = n.y * scaleY, w = n.w * scaleX, h = n.h * scaleY;
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, w, h);
        });
    }

    function drawLabel(context, text, x, y, color) {
        context.font = 'bold 13px sans-serif';
        var metrics = context.measureText(text);
        var pad = 4;
        context.fillStyle = 'rgba(0,0,0,0.7)';
        context.fillRect(x, y - 14, metrics.width + pad * 2, 18);
        context.fillStyle = color || '#fff';
        context.fillText(text, x + pad, y);
    }

    // ══════════════════════════════════════════════════
    //  UI UPDATES
    // ══════════════════════════════════════════════════
    function updateStatus(msg, isError) {
        statusBar.textContent = msg;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }

    function updateDetectionCard() {
        var teamA = trackedPlayers.filter(function(p) { return p.team === 'A'; });
        var teamB = trackedPlayers.filter(function(p) { return p.team === 'B'; });
        detPlayerCount.textContent = trackedPlayers.length;
        teamACount.textContent = teamA.length;
        teamBCount.textContent = teamB.length;
        teamALabel.textContent = teamAName.value || 'Team A';
        teamBLabel.textContent = teamBName.value || 'Team B';

        // Player list
        if (trackedPlayers.length === 0) {
            playerList.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:0.78rem;padding:8px;">No players detected</div>';
            return;
        }
        playerList.innerHTML = trackedPlayers.map(function(tp) {
            var meta = trackMeta[tp.id] || {};
            var color = tp.team === 'A' ? teamColors.A : teamColors.B;
            var numStr = meta.confirmedNumber ? '#' + meta.confirmedNumber : (meta.numberReadings && meta.numberReadings.length > 0 ? '#' + meta.numberReadings[meta.numberReadings.length - 1] + '?' : '--');
            var nameStr = meta.name || (meta.confirmedNumber ? 'Unknown' : '...');
            var confStr = Math.round((tp.confidence || 0) * 100) + '%';
            var trackLen = tp.trackletLen || 0;
            return '<div class="player-item ' + (meta.confirmedNumber ? 'confirmed' : '') + '">'
                + '<div class="pi-dot" style="background:' + color + '"></div>'
                + '<span class="pi-number">' + numStr + '</span>'
                + '<span class="pi-name">' + nameStr + '</span>'
                + '<span class="pi-conf">T' + tp.id + ' ' + confStr + '</span>'
                + '</div>';
        }).join('');
    }

    function updateSessionStats() {
        if (sessionStart) {
            var elapsed = Math.floor((Date.now() - sessionStart) / 1000);
            var m = Math.floor(elapsed / 60).toString().padStart(2, '0');
            var s = (elapsed % 60).toString().padStart(2, '0');
            statDuration.textContent = m + ':' + s;
        }
        statFrames.textContent = framesAnalyzed;
        statIdentified.textContent = identifiedCount;
        // FPS is updated by updateFPS() in the analysis loop
    }

    // ══════════════════════════════════════════════════
    //  ROSTER EDITOR
    // ══════════════════════════════════════════════════
    function renderRoster(team) {
        var container = team === 'A' ? rosterEntriesA : rosterEntriesB;
        var entries = roster[team];
        container.innerHTML = entries.map(function(e, i) {
            return '<div class="roster-entry">'
                + '<input class="re-num" type="text" value="' + (e.number || '') + '" placeholder="#" data-team="' + team + '" data-idx="' + i + '" data-field="number">'
                + '<span style="color:var(--text-muted);font-size:0.78rem;">→</span>'
                + '<input class="re-name" type="text" value="' + (e.name || '') + '" placeholder="Player name" data-team="' + team + '" data-idx="' + i + '" data-field="name">'
                + '<button class="re-del" data-team="' + team + '" data-idx="' + i + '">✕</button>'
                + '</div>';
        }).join('');

        container.querySelectorAll('input').forEach(function(input) {
            input.addEventListener('change', function() {
                var t = input.dataset.team;
                var idx = parseInt(input.dataset.idx);
                var field = input.dataset.field;
                roster[t][idx][field] = input.value;
                saveRoster();
            });
        });
        container.querySelectorAll('.re-del').forEach(function(btn) {
            btn.addEventListener('click', function() {
                roster[btn.dataset.team].splice(parseInt(btn.dataset.idx), 1);
                renderRoster(btn.dataset.team);
                saveRoster();
            });
        });
    }

    function addRosterEntry(team) {
        roster[team].push({ number: '', name: '' });
        renderRoster(team);
    }

    function saveRoster() {
        try {
            localStorage.setItem('vrp_spi_roster', JSON.stringify(roster));
            localStorage.setItem('vrp_spi_team_names', JSON.stringify({
                A: teamAName.value, B: teamBName.value
            }));
            localStorage.setItem('vrp_spi_team_colors', JSON.stringify(teamColors));
        } catch (e) {}
    }
    function loadRoster() {
        try {
            var saved = localStorage.getItem('vrp_spi_roster');
            if (saved) roster = JSON.parse(saved);
            var names = localStorage.getItem('vrp_spi_team_names');
            if (names) {
                var n = JSON.parse(names);
                if (n.A) teamAName.value = n.A;
                if (n.B) teamBName.value = n.B;
            }
            var colors = localStorage.getItem('vrp_spi_team_colors');
            if (colors) {
                var c = JSON.parse(colors);
                if (c.A) { teamColors.A = c.A; teamAColor.value = c.A; teamABlock.style.borderLeftColor = c.A; document.getElementById('rosterTeamA').style.borderLeftColor = c.A; }
                if (c.B) { teamColors.B = c.B; teamBColor.value = c.B; teamBBlock.style.borderLeftColor = c.B; document.getElementById('rosterTeamB').style.borderLeftColor = c.B; }
            }
        } catch (e) {}
    }
    function loadSampleRoster() {
        roster.A = DEFAULT_ROSTER.A.map(function(e) { return { number: e.number, name: e.name }; });
        roster.B = DEFAULT_ROSTER.B.map(function(e) { return { number: e.number, name: e.name }; });
        teamAName.value = DEFAULT_TEAM_A_NAME;
        teamBName.value = DEFAULT_TEAM_B_NAME;
        teamColors.A = DEFAULT_TEAM_A_COLOR;
        teamColors.B = DEFAULT_TEAM_B_COLOR;
        teamAColor.value = DEFAULT_TEAM_A_COLOR;
        teamBColor.value = DEFAULT_TEAM_B_COLOR;
        teamABlock.style.borderLeftColor = DEFAULT_TEAM_A_COLOR;
        teamBBlock.style.borderLeftColor = DEFAULT_TEAM_B_COLOR;
        document.getElementById('rosterTeamA').style.borderLeftColor = DEFAULT_TEAM_A_COLOR;
        document.getElementById('rosterTeamB').style.borderLeftColor = DEFAULT_TEAM_B_COLOR;
        saveRoster();
        renderRoster('A');
        renderRoster('B');
        window.reasoningConsole.logInfo('Loaded sample roster: White Team (5) vs Blue Team (5)');
    }

    // ══════════════════════════════════════════════════
    //  HISTORY LOG
    // ══════════════════════════════════════════════════
    function addHistoryEntry(team, label, confidence) {
        var entry = {
            time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            timestamp: new Date().toISOString(),
            team: team,
            label: label,
            confidence: confidence
        };
        historyEntries.unshift(entry);
        renderHistory();
    }

    function renderHistory() {
        if (historyEntries.length === 0) {
            historyLog.innerHTML = '<div class="hist-empty">Player identifications will appear here</div>';
            return;
        }
        historyLog.innerHTML = historyEntries.slice(0, 100).map(function(e) {
            var color = e.team === 'A' ? teamColors.A : teamColors.B;
            return '<div class="hist-entry">'
                + '<span class="he-time">' + e.time + '</span>'
                + '<span class="he-dot" style="background:' + color + '"></span>'
                + '<span class="he-text">' + e.label + '</span>'
                + '<span class="he-conf">' + Math.round((e.confidence || 0) * 100) + '%</span>'
                + '</div>';
        }).join('');
    }

    // ══════════════════════════════════════════════════
    //  EXPORT
    // ══════════════════════════════════════════════════
    function exportJSON() {
        var data = historyEntries.map(function(e) { return { timestamp: e.timestamp, team: e.team, label: e.label, confidence: e.confidence }; });
        downloadFile(JSON.stringify(data, null, 2), 'player-identifications.json', 'application/json');
    }
    function exportCSV() {
        var rows = ['timestamp,team,label,confidence'];
        historyEntries.forEach(function(e) {
            rows.push('"' + e.timestamp + '","' + e.team + '","' + e.label.replace(/"/g, '""') + '",' + (e.confidence || 0));
        });
        downloadFile(rows.join('\n'), 'player-identifications.csv', 'text/csv');
    }
    function downloadFile(content, filename, type) {
        var blob = new Blob([content], { type: type });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    }

    // ══════════════════════════════════════════════════
    //  START / STOP
    // ══════════════════════════════════════════════════
    async function startAnalysis() {
        // Validate engine requirements
        if (engine === 'onnx-local') {
            var ok = await loadPlayerModel();
            if (!ok) {
                window.reasoningConsole.logInfo('Local ONNX failed, falling back to Cloud');
                engine = 'roboflow-cloud';
                switchEngine('roboflow-cloud');
            }
        }
        if (engine === 'roboflow-cloud') {
            if (!window.apiKeyManager.hasRoboflowKey() && !ROBOFLOW_DEFAULT_KEY) {
                window.apiKeyManager.showModal();
                return;
            }
        } else if (engine === 'moondream' && !moondreamClient) {
            window.apiKeyManager.showModal();
            return;
        }

        running = true;
        sessionStart = Date.now();
        framesAnalyzed = 0;
        totalConfidence = 0;
        identifiedCount = 0;
        trackedPlayers = [];
        trackMeta = {};
        fpsHistory = [];
        lastFrameTime = 0;

        // (Re)create ByteTrack tracker with current config
        var btHigh = parseInt(document.getElementById('btHighThresh').value) / 100;
        var btMatch = parseInt(document.getElementById('btMatchThresh').value) / 100;
        var btBuf = parseInt(document.getElementById('btBuffer').value);
        byteTracker = new ByteTrackTracker({
            trackHighThresh: btHigh,
            matchThresh: btMatch,
            trackBuffer: btBuf
        });
        showTrajectories = document.getElementById('btShowTrajectories').checked;

        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        durationInterval = setInterval(updateSessionStats, 1000);
        window.reasoningConsole.logInfo('Started analysis (' + engine + ' engine, ByteTrack: high=' + btHigh + ' match=' + btMatch + ' buffer=' + btBuf + ')');
        analyzeFrame();
    }

    function stopAnalysis() {
        running = false;
        clearTimeout(analysisTimeout);

        clearInterval(durationInterval);
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        var avgFps = fpsHistory.length > 0 ? (fpsHistory.reduce(function(a,b){return a+b;},0) / fpsHistory.length).toFixed(1) : '0';
        updateStatus('Stopped — ' + framesAnalyzed + ' frames @ avg ' + avgFps + ' FPS');
        window.reasoningConsole.logInfo('Stopped. ' + framesAnalyzed + ' frames, ' + identifiedCount + ' IDs confirmed, avg ' + avgFps + ' FPS.');
    }

    // ══════════════════════════════════════════════════
    //  ENGINE SWITCHING
    // ══════════════════════════════════════════════════
    function switchEngine(eng) {
        engine = eng;
        document.getElementById('engineLocalBtn').classList.toggle('active', engine === 'onnx-local');
        document.getElementById('engineCloudBtn').classList.toggle('active', engine === 'roboflow-cloud');
        engineMoondreamBtn.classList.toggle('active', engine === 'moondream');
        roboflowInfo.style.display = (engine === 'roboflow-cloud' || engine === 'onnx-local') ? '' : 'none';
        window.reasoningConsole.logInfo('Switched to ' + engine + ' engine');
    }



    // ══════════════════════════════════════════════════
    //  DETECTION EDITOR
    // ══════════════════════════════════════════════════
    var editMode = false;
    var selectedTrackId = null;
    var frozen = false;
    var hiddenTracks = new Set();
    var dragState = null; // {trackId, handle, startX, startY, origBbox}

    var editModeToggle = document.getElementById('editModeToggle');
    var editModeBadge = document.getElementById('editModeBadge');
    var freezeBtn = document.getElementById('freezeBtn');
    var selectedEditor = document.getElementById('selectedEditor');
    var seColorDot = document.getElementById('seColorDot');
    var seTrackLabel = document.getElementById('seTrackLabel');
    var seTeam = document.getElementById('seTeam');
    var seNumber = document.getElementById('seNumber');
    var seName = document.getElementById('seName');
    var seClass = document.getElementById('seClass');
    var seApplyBtn = document.getElementById('seApplyBtn');
    var seDeselectBtn = document.getElementById('seDeselectBtn');
    var seHideBtn = document.getElementById('seHideBtn');
    var seDeleteBtn = document.getElementById('seDeleteBtn');
    var detList = document.getElementById('detList');

    function toggleEditMode(on) {
        editMode = on;
        editModeToggle.checked = on;
        editModeBadge.classList.toggle('visible', on);
        overlayCanvas.style.cursor = on ? 'crosshair' : 'default';
        if (!on) {
            deselectTrack();
            dragState = null;
        }
    }

    function selectTrack(trackId) {
        selectedTrackId = trackId;
        var meta = trackMeta[trackId] || {};
        var tp = trackedPlayers.find(function(p) { return p.id === trackId; });

        selectedEditor.classList.add('visible');
        seTrackLabel.textContent = 'Track T' + trackId + (tp ? ' (' + Math.round(tp.confidence * 100) + '%)' : '');
        var color = (meta.team === 'A') ? teamColors.A : teamColors.B;
        seColorDot.style.background = color;
        seTeam.value = meta.team || 'A';
        seNumber.value = meta.confirmedNumber || '';
        seName.value = meta.name || '';
        seClass.value = meta.playerClass || 'player';

        // Update team select options with actual names
        seTeam.options[0].textContent = teamAName.value || 'Team A';
        seTeam.options[1].textContent = teamBName.value || 'Team B';

        renderDetList();
        redrawOverlays();
    }

    function deselectTrack() {
        selectedTrackId = null;
        selectedEditor.classList.remove('visible');
        renderDetList();
        redrawOverlays();
    }

    function applyEdits() {
        if (selectedTrackId === null) return;
        var meta = trackMeta[selectedTrackId];
        if (!meta) {
            meta = { team: 'A', numberReadings: [], confirmedNumber: null, name: null, playerClass: 'player' };
            trackMeta[selectedTrackId] = meta;
        }

        meta.team = seTeam.value;
        meta.playerClass = seClass.value;

        var num = seNumber.value.trim();
        if (num) {
            meta.confirmedNumber = num;
            meta.numberReadings = [num, num, num]; // force confirmed
        }

        var name = seName.value.trim();
        if (name) {
            meta.name = name;
        } else if (num) {
            meta.name = lookupRoster(meta.team, num);
        }

        window.reasoningConsole.logAction('Edit applied', 'T' + selectedTrackId + ': team=' + meta.team + ' #' + (meta.confirmedNumber || '?') + ' ' + (meta.name || ''));
        renderDetList();
        updateDetectionCard();
        redrawOverlays();
    }

    function hideTrack(trackId) {
        if (hiddenTracks.has(trackId)) {
            hiddenTracks.delete(trackId);
        } else {
            hiddenTracks.add(trackId);
        }
        if (selectedTrackId === trackId) deselectTrack();
        renderDetList();
        redrawOverlays();
    }

    function deleteTrack(trackId) {
        // Remove from tracked arrays
        trackedPlayers = trackedPlayers.filter(function(tp) { return tp.id !== trackId; });
        delete trackMeta[trackId];
        hiddenTracks.delete(trackId);
        if (selectedTrackId === trackId) deselectTrack();
        renderDetList();
        updateDetectionCard();
        redrawOverlays();
        window.reasoningConsole.logAction('Track deleted', 'T' + trackId);
    }

    function renderDetList() {
        if (trackedPlayers.length === 0) {
            detList.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:0.78rem;padding:12px;">No detections yet</div>';
            return;
        }
        detList.innerHTML = trackedPlayers.map(function(tp) {
            var meta = trackMeta[tp.id] || {};
            var color = (meta.team || tp.team) === 'A' ? teamColors.A : teamColors.B;
            var isSelected = tp.id === selectedTrackId;
            var isHidden = hiddenTracks.has(tp.id);
            var label = meta.confirmedNumber ? '#' + meta.confirmedNumber : (meta.numberReadings && meta.numberReadings.length > 0 ? '#' + meta.numberReadings[meta.numberReadings.length - 1] + '?' : 'P' + tp.id);
            var nameStr = meta.name || '';
            var teamStr = (meta.team || tp.team) === 'A' ? (teamAName.value || 'A') : (teamBName.value || 'B');

            return '<div class="det-row ' + (isSelected ? 'selected' : '') + (isHidden ? ' hidden-track' : '') + '" data-tid="' + tp.id + '">'
                + '<div class="dr-dot" style="background:' + color + '"></div>'
                + '<span class="dr-id">T' + tp.id + '</span>'
                + '<span class="dr-label">' + label + (nameStr ? ' ' + nameStr : '') + '</span>'
                + '<span class="dr-team">' + teamStr + '</span>'
                + '<span class="dr-actions">'
                + '<button class="dr-btn" data-action="hide" data-tid="' + tp.id + '" title="' + (isHidden ? 'Show' : 'Hide') + '">' + (isHidden ? '\u25C9' : '\u25CE') + '</button>'
                + '<button class="dr-btn del" data-action="delete" data-tid="' + tp.id + '" title="Delete">\u2715</button>'
                + '</span>'
                + '</div>';
        }).join('');

        // Click handlers
        detList.querySelectorAll('.det-row').forEach(function(row) {
            row.addEventListener('click', function(e) {
                if (e.target.closest('.dr-btn')) return;
                selectTrack(parseInt(row.dataset.tid));
            });
        });
        detList.querySelectorAll('.dr-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var tid = parseInt(btn.dataset.tid);
                if (btn.dataset.action === 'hide') hideTrack(tid);
                else if (btn.dataset.action === 'delete') deleteTrack(tid);
            });
        });
    }

    // Redraw overlays without running analysis (for edit mode)
    function redrawOverlays() {
        if (!lastDetResult) return;
        drawOverlays(lastDetResult);
    }

    // Store last detection result for redraw
    var lastDetResult = null;

    // ── Canvas click-to-select ──
    overlayCanvas.addEventListener('click', function(e) {
        if (!editMode && !e.shiftKey) return;
        var rect = overlayCanvas.getBoundingClientRect();
        var clickX = (e.clientX - rect.left) * (overlayCanvas.width / rect.width);
        var clickY = (e.clientY - rect.top) * (overlayCanvas.height / rect.height);

        // Find which player bbox contains the click
        var scaleX = lastDetResult ? overlayCanvas.width / (lastDetResult.imageWidth || overlayCanvas.width) : 1;
        var scaleY = lastDetResult ? overlayCanvas.height / (lastDetResult.imageHeight || overlayCanvas.height) : 1;

        var found = null;
        trackedPlayers.forEach(function(tp) {
            if (hiddenTracks.has(tp.id)) return;
            var x = tp.bbox.x * scaleX, y = tp.bbox.y * scaleY;
            var w = tp.bbox.w * scaleX, h = tp.bbox.h * scaleY;
            if (clickX >= x && clickX <= x + w && clickY >= y && clickY <= y + h) {
                found = tp.id;
            }
        });

        if (found !== null) {
            selectTrack(found);
        } else {
            deselectTrack();
        }
    });

    // ── Canvas drag to move/resize bbox (edit mode only) ──
    overlayCanvas.addEventListener('mousedown', function(e) {
        if (!editMode || selectedTrackId === null) return;
        var tp = trackedPlayers.find(function(p) { return p.id === selectedTrackId; });
        if (!tp) return;

        var rect = overlayCanvas.getBoundingClientRect();
        var mx = (e.clientX - rect.left) * (overlayCanvas.width / rect.width);
        var my = (e.clientY - rect.top) * (overlayCanvas.height / rect.height);
        var scaleX = lastDetResult ? overlayCanvas.width / (lastDetResult.imageWidth || overlayCanvas.width) : 1;
        var scaleY = lastDetResult ? overlayCanvas.height / (lastDetResult.imageHeight || overlayCanvas.height) : 1;

        var bx = tp.bbox.x * scaleX, by = tp.bbox.y * scaleY;
        var bw = tp.bbox.w * scaleX, bh = tp.bbox.h * scaleY;

        // Check if near bottom-right corner (resize handle)
        var cornerDist = Math.sqrt(Math.pow(mx - (bx + bw), 2) + Math.pow(my - (by + bh), 2));
        var handle = cornerDist < 15 ? 'resize' : 'move';

        dragState = {
            trackId: selectedTrackId,
            handle: handle,
            startX: mx,
            startY: my,
            origBbox: { x: tp.bbox.x, y: tp.bbox.y, w: tp.bbox.w, h: tp.bbox.h },
            scaleX: scaleX,
            scaleY: scaleY
        };
        e.preventDefault();
    });

    overlayCanvas.addEventListener('mousemove', function(e) {
        if (!dragState) return;
        var rect = overlayCanvas.getBoundingClientRect();
        var mx = (e.clientX - rect.left) * (overlayCanvas.width / rect.width);
        var my = (e.clientY - rect.top) * (overlayCanvas.height / rect.height);
        var dx = (mx - dragState.startX) / dragState.scaleX;
        var dy = (my - dragState.startY) / dragState.scaleY;

        var tp = trackedPlayers.find(function(p) { return p.id === dragState.trackId; });
        if (!tp) { dragState = null; return; }

        if (dragState.handle === 'move') {
            tp.bbox.x = dragState.origBbox.x + dx;
            tp.bbox.y = dragState.origBbox.y + dy;
        } else if (dragState.handle === 'resize') {
            tp.bbox.w = Math.max(10, dragState.origBbox.w + dx);
            tp.bbox.h = Math.max(10, dragState.origBbox.h + dy);
        }
        redrawOverlays();
    });

    window.addEventListener('mouseup', function() {
        if (dragState) {
            window.reasoningConsole.logInfo('Bbox edited for T' + dragState.trackId + ' (' + dragState.handle + ')');
            dragState = null;
        }
    });

    // ── Freeze frame (pause analysis but keep overlays) ──
    freezeBtn.addEventListener('click', function() {
        frozen = !frozen;
        freezeBtn.textContent = frozen ? 'Unfreeze' : 'Freeze Frame';
        freezeBtn.classList.toggle('btn-primary', frozen);
        freezeBtn.classList.toggle('btn-secondary', !frozen);
        if (frozen) {
            window.reasoningConsole.logInfo('Frame frozen for editing');
        } else {
            window.reasoningConsole.logInfo('Frame unfrozen, analysis resumed');
        }
    });

    // ── Edit mode toggle ──
    editModeToggle.addEventListener('change', function() {
        toggleEditMode(editModeToggle.checked);
    });

    // ── Selected editor buttons ──
    seApplyBtn.addEventListener('click', applyEdits);
    seDeselectBtn.addEventListener('click', deselectTrack);
    seHideBtn.addEventListener('click', function() {
        if (selectedTrackId !== null) hideTrack(selectedTrackId);
    });
    seDeleteBtn.addEventListener('click', function() {
        if (selectedTrackId !== null && confirm('Delete track T' + selectedTrackId + '?')) {
            deleteTrack(selectedTrackId);
        }
    });

    // ══════════════════════════════════════════════════
    //  COURT MAP INTEGRATION
    // ══════════════════════════════════════════════════
    var courtMap = new CourtMap('courtCanvas');
    var courtMapToggle = document.getElementById('courtMapToggle');
    var courtCanvas = document.getElementById('courtCanvas');

    courtMapToggle.addEventListener('change', function() {
        courtCanvas.style.display = courtMapToggle.checked ? '' : 'none';
    });

    // Update court map after each detection frame
    function updateCourtMap() {
        if (!courtMapToggle.checked) return;
        var iw = lastDetResult ? lastDetResult.imageWidth : 640;
        var ih = lastDetResult ? lastDetResult.imageHeight : 480;
        courtMap.updatePlayers(trackedPlayers, trackMeta, teamColors, iw, ih);
    }

    // ══════════════════════════════════════════════════
    //  EVENT LISTENERS
    // ══════════════════════════════════════════════════
    document.getElementById('engineLocalBtn').addEventListener('click', function() { switchEngine('onnx-local'); });
    document.getElementById('engineCloudBtn').addEventListener('click', function() { switchEngine('roboflow-cloud'); });
    engineMoondreamBtn.addEventListener('click', function() { switchEngine('moondream'); });
    confidenceSlider.addEventListener('input', function() { confidenceValue.textContent = confidenceSlider.value + '%'; });

    // ByteTrack config sliders
    document.getElementById('btHighThresh').addEventListener('input', function() {
        document.getElementById('btHighVal').textContent = (parseInt(this.value) / 100).toFixed(2);
    });
    document.getElementById('btMatchThresh').addEventListener('input', function() {
        document.getElementById('btMatchVal').textContent = (parseInt(this.value) / 100).toFixed(2);
    });
    document.getElementById('btBuffer').addEventListener('input', function() {
        document.getElementById('btBufferVal').textContent = this.value;
    });
    document.getElementById('btShowTrajectories').addEventListener('change', function() {
        showTrajectories = this.checked;
    });
    startBtn.addEventListener('click', startAnalysis);
    stopBtn.addEventListener('click', stopAnalysis);
    addPlayerA.addEventListener('click', function() { addRosterEntry('A'); });
    addPlayerB.addEventListener('click', function() { addRosterEntry('B'); });
    document.getElementById('loadSampleRosterBtn').addEventListener('click', function() {
        loadSampleRoster();
    });
    document.getElementById('clearRosterBtn').addEventListener('click', function() {
        if (confirm('Clear both team rosters?')) {
            roster = { A: [], B: [] };
            teamAName.value = 'Team A';
            teamBName.value = 'Team B';
            saveRoster();
            renderRoster('A');
            renderRoster('B');
        }
    });
    exportJsonBtn.addEventListener('click', exportJSON);
    exportCsvBtn.addEventListener('click', exportCSV);
    clearHistoryBtn.addEventListener('click', function() { historyEntries = []; renderHistory(); });

    teamAColor.addEventListener('input', function() {
        teamColors.A = teamAColor.value;
        teamABlock.style.borderLeftColor = teamColors.A;
        document.getElementById('rosterTeamA').style.borderLeftColor = teamColors.A;
    });
    teamBColor.addEventListener('input', function() {
        teamColors.B = teamBColor.value;
        teamBBlock.style.borderLeftColor = teamColors.B;
        document.getElementById('rosterTeamB').style.borderLeftColor = teamColors.B;
    });

    // ══════════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════════
    loadRoster();

    // If no saved roster, load sample defaults
    if (roster.A.length === 0 && roster.B.length === 0) {
        loadSampleRoster();
    }

    renderRoster('A');
    renderRoster('B');
    renderHistory();

    // Set up video element — auto-play the sample video
    video.onloadedmetadata = function() {
        overlayCanvas.width = video.videoWidth;
        overlayCanvas.height = video.videoHeight;
        window.reasoningConsole.logInfo('Video loaded: ' + video.videoWidth + 'x' + video.videoHeight);
        updateStatus('Video ready — click Start Detection');
    };
    video.play().catch(function() {
        updateStatus('Click the video to start playback, then click Start Detection');
    });
});
