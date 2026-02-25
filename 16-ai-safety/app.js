document.addEventListener('DOMContentLoaded', async function() {
    // ── DOM References ──
    const video = document.getElementById('video');
    const overlayCanvas = document.getElementById('overlayCanvas');
    const overlayCtx = overlayCanvas.getContext('2d');
    const videoContainer = document.getElementById('videoContainer');
    const cameraSelect = document.getElementById('cameraSelect');
    const refreshCamerasBtn = document.getElementById('refreshCamerasBtn');
    const cameraGroup = document.getElementById('cameraGroup');
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const modeCameraBtn = document.getElementById('modeCameraBtn');
    const modeUploadBtn = document.getElementById('modeUploadBtn');
    const modeSampleBtn = document.getElementById('modeSampleBtn');
    const ratingCard = document.getElementById('ratingCard');
    const modeUploadBtn = document.getElementById('modeUploadBtn');
    const ratingCard = document.getElementById('ratingCard');
    const hazardTags = document.getElementById('hazardTags');
    const presetSelect = document.getElementById('presetSelect');
    const presetInfo = document.getElementById('presetInfo');
    const fpmSelect = document.getElementById('fpmSelect');
    const thresholdSelect = document.getElementById('thresholdSelect');
    const thresholdDots = document.getElementById('thresholdDots');
    const consecutiveInput = document.getElementById('consecutiveInput');
    const audioToggle = document.getElementById('audioToggle');
    const notifToggle = document.getElementById('notifToggle');
    const statDuration = document.getElementById('statDuration');
    const statFrames = document.getElementById('statFrames');
    const statAlarms = document.getElementById('statAlarms');
    const statAvgRating = document.getElementById('statAvgRating');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const snapBtn = document.getElementById('snapBtn');
    const statusBar = document.getElementById('status');
    const historyStrip = document.getElementById('historyStrip');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const alarmOverlay = document.getElementById('alarmOverlay');
    const alarmConcern = document.getElementById('alarmConcern');
    const alarmAction = document.getElementById('alarmAction');
    const alarmThumb = document.getElementById('alarmThumb');
    const alarmAckBtn = document.getElementById('alarmAckBtn');
    const detailOverlay = document.getElementById('detailOverlay');
    const detailCloseBtn = document.getElementById('detailCloseBtn');
    const detailImage = document.getElementById('detailImage');
    const detailRating = document.getElementById('detailRating');

    // ── State ──
    let client = null;
    let currentStream = null;
    let monitoring = false;
    let monitorTimeout = null;
    let durationInterval = null;
    let sessionStart = null;
    let mode = 'camera'; // 'camera' or 'upload'
    let uploadIndex = 0;

    // VLM Engine: 'moondream' or 'openai'
    let vlmEngine = 'moondream';

    // Alarm state machine: clear | warning | alarming | acknowledged
    let alarmState = 'clear';
    let consecutiveBelowCount = 0;

    // Session stats
    let framesAnalyzed = 0;
    let alarmsTriggered = 0;
    let ratingSum = 0;

    // Assessment history
    let assessments = [];
    const MAX_ASSESSMENTS = 1000;

    // Audio context for alarm
    let audioCtx = null;

    // ── Environment Presets ──
    const PRESETS = {
        general: {
            name: 'General',
            description: 'All-purpose environment monitoring',
            prompt: `You are an AI safety monitor analyzing a camera frame for hazards. 

IMPORTANT: Default to SAFE. Rating 5 (All Clear) is the DEFAULT for any normal, empty, or ordinary scene. Only rate below 5 if you can describe a specific, visible hazard.

Analyze this image and respond with ONLY a valid JSON object (no markdown, no backticks, no extra text):
{
  "safetyRating": <number 1-5>,
  "status": "<all_clear|observation|caution|hazard|danger>",
  "primaryConcern": "<brief description of main concern or 'No hazards detected'>",
  "recommendedAction": "<what to do>",
  "detectedHazards": [<list of short hazard strings, empty if none>]
}

Rating scale:
5 = All Clear (green) - No hazards. Normal/empty scene. THIS IS THE DEFAULT.
4 = Observation (lime) - Minor note, no action needed
3 = Caution (yellow) - Potential concern worth monitoring
2 = Hazard (orange) - Visible safety issue, review recommended
1 = DANGER (red) - Immediate safety threat

Remember: An empty room is safe (5). A normal office is safe (5). Only flag REAL visible hazards.`
        },
        construction: {
            name: 'Construction',
            description: 'PPE compliance, fall hazards, equipment zones',
            prompt: `You are an AI safety monitor for a CONSTRUCTION SITE analyzing a camera frame.

IMPORTANT: Default to SAFE. Rating 5 is the DEFAULT for normal scenes. Only flag real, visible construction hazards.

Focus areas: PPE compliance (hard hats, vests, boots), fall hazards (unguarded edges, ladders), heavy equipment proximity, proper barriers/signage, electrical hazards, trenching safety.

Respond with ONLY a valid JSON object (no markdown, no backticks, no extra text):
{
  "safetyRating": <number 1-5>,
  "status": "<all_clear|observation|caution|hazard|danger>",
  "primaryConcern": "<brief description>",
  "recommendedAction": "<what to do>",
  "detectedHazards": [<list of hazard strings>]
}

Rating scale:
5 = All Clear - No hazards, proper PPE visible, safe conditions
4 = Observation - Minor note (e.g., slightly untidy area)
3 = Caution - Potential concern (e.g., worker near edge without visible tether)
2 = Hazard - Visible issue (e.g., missing PPE, unsecured equipment)
1 = DANGER - Immediate threat (e.g., person under suspended load, active fall risk)`
        },
        warehouse: {
            name: 'Warehouse',
            description: 'Forklifts, spills, stacking, fire exits',
            prompt: `You are an AI safety monitor for a WAREHOUSE analyzing a camera frame.

IMPORTANT: Default to SAFE. Rating 5 is the DEFAULT. Only flag real, visible warehouse hazards.

Focus areas: Forklift operations (pedestrian proximity, speed), spills on floor, improper stacking (leaning/overloaded pallets), blocked fire exits, proper aisle clearance, loading dock safety.

Respond with ONLY a valid JSON object (no markdown, no backticks, no extra text):
{
  "safetyRating": <number 1-5>,
  "status": "<all_clear|observation|caution|hazard|danger>",
  "primaryConcern": "<brief description>",
  "recommendedAction": "<what to do>",
  "detectedHazards": [<list of hazard strings>]
}

Rating scale:
5 = All Clear - Clean aisles, safe operations, exits clear
4 = Observation - Minor note (e.g., slightly disorganized shelf)
3 = Caution - Potential concern (e.g., items near aisle edge)
2 = Hazard - Visible issue (e.g., spill on floor, blocked exit)
1 = DANGER - Immediate threat (e.g., unstable stack about to fall, pedestrian in forklift path)`
        },
        school: {
            name: 'School / Sports',
            description: 'Supervision, exits, crowd safety',
            prompt: `You are an AI safety monitor for a SCHOOL or SPORTS environment analyzing a camera frame.

IMPORTANT: Default to SAFE. Rating 5 is the DEFAULT. Children playing normally is SAFE. Only flag real, visible safety concerns.

Focus areas: Adequate supervision, clear emergency exits, crowd density, equipment condition, playing surface hazards, weather conditions for outdoor activities, proper barriers for spectators.

Respond with ONLY a valid JSON object (no markdown, no backticks, no extra text):
{
  "safetyRating": <number 1-5>,
  "status": "<all_clear|observation|caution|hazard|danger>",
  "primaryConcern": "<brief description>",
  "recommendedAction": "<what to do>",
  "detectedHazards": [<list of hazard strings>]
}

Rating scale:
5 = All Clear - Safe environment, normal activity
4 = Observation - Minor note (e.g., slightly crowded area)
3 = Caution - Potential concern (e.g., unsupervised group)
2 = Hazard - Visible issue (e.g., damaged equipment, blocked exit)
1 = DANGER - Immediate threat (e.g., structural hazard, dangerous overcrowding)`
        }
    };

    // ── Rating metadata ──
    const RATING_META = {
        5: { label: 'All Clear',   color: '#2A9D8F', status: 'all_clear' },
        4: { label: 'Observation', color: '#8BC34A', status: 'observation' },
        3: { label: 'Caution',     color: '#E9C46A', status: 'caution' },
        2: { label: 'Hazard',      color: '#E76F51', status: 'hazard' },
        1: { label: 'DANGER',      color: '#E63946', status: 'danger' }
    };

    // ── Initialize shared modules ──
    window.reasoningConsole = new ReasoningConsole({ startCollapsed: false, maxEntries: 200 });

    window.apiKeyManager = new APIKeyManager({
        requireMoondream: true,
        requireOpenAI: false,
            if (keys.moondream) {
                client = new MoondreamClient(keys.moondream);
                window.reasoningConsole.logInfo('Moondream API key configured');
                updateStatus('Ready - Start monitoring');
            }
            if (keys.openai) {
                window.reasoningConsole.logInfo('OpenAI API key configured');
                updateStatus('Ready - Start monitoring');
            }
        }
    });
        }
    });

    if (window.apiKeyManager.hasMoondreamKey()) {
        client = new MoondreamClient(window.apiKeyManager.getMoondreamKey());
        window.reasoningConsole.logInfo('Loaded saved Moondream API key');
    }

    window.reasoningConsole.logInfo('AI Safety Monitor initialized');

    // ── Camera functions ──
    async function enumerateCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            cameraSelect.innerHTML = '';
            videoDevices.forEach((device, i) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Camera ${i + 1}`;
                cameraSelect.appendChild(option);
            });
            window.reasoningConsole.logInfo(`Found ${videoDevices.length} camera(s)`);
        } catch (error) {
            window.reasoningConsole.logError('Failed to enumerate cameras: ' + error.message);
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
                    : { width: 1280, height: 720, facingMode: 'environment' },
                audio: false
            };
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = currentStream;
            video.onloadedmetadata = () => {
                overlayCanvas.width = video.videoWidth;
                overlayCanvas.height = video.videoHeight;
            };
            await enumerateCameras();
            if (deviceId) cameraSelect.value = deviceId;
            updateStatus('Camera ready - Start monitoring');
            window.reasoningConsole.logInfo('Camera initialized successfully');
        } catch (error) {
            updateStatus('Camera error: ' + error.message, true);
            window.reasoningConsole.logError('Camera access failed: ' + error.message);
        }
    }

    // ── Frame capture ──
    function captureFrame(quality = 0.8) {
        const c = document.createElement('canvas');
        c.width = video.videoWidth || 640;
        c.height = video.videoHeight || 480;
        const cx = c.getContext('2d');
        cx.drawImage(video, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', quality);
    }

    function captureThumbnail() {
        const c = document.createElement('canvas');
        c.width = 160;
        c.height = 90;
        const cx = c.getContext('2d');
        cx.drawImage(video, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', 0.7);
    }

    }

    // ── Safety analysis via OpenAI Vision ──
    async function analyzeSafetyOpenAI(imageDataUrl) {
        if (!window.apiKeyManager.hasOpenAIKey()) {
            window.reasoningConsole.logError('No OpenAI API key configured');
            updateStatus('Please configure your OpenAI API key', true);
            window.apiKeyManager.showModal();
            return null;
        }

        const preset = PRESETS[presetSelect.value];
        const startTime = Date.now();

        try {
            window.reasoningConsole.logApiCall('/openai/vision', 0);
            updateStatus('Analyzing frame with GPT-4o-mini...');

            // Remove the data URL prefix
            const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + window.apiKeyManager.getOpenAIKey()
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: preset.prompt
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: `data:image/jpeg;base64,${base64Data}`,
                                        detail: 'low'
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error('OpenAI API error: ' + response.status + ' - ' + err);
            }

            const data = await response.json();
            const latency = Date.now() - startTime;
            window.reasoningConsole.logApiCall('/openai/vision', latency);

            const answer = data.choices[0]?.message?.content || '';

            // Parse the JSON response from the model
            const assessment = parseSafetyResponse(answer);
            if (assessment) {
                window.reasoningConsole.logDecision(
                    `Safety: ${assessment.safetyRating}/5 (${RATING_META[assessment.safetyRating]?.label || 'Unknown'})`,
                    `${assessment.primaryConcern} [${latency}ms]`
                );
            }
            return assessment;
        } catch (error) {
            const latency = Date.now() - startTime;
            window.reasoningConsole.logError(`OpenAI analysis failed (${latency}ms): ${error.message}`);
            updateStatus('Analysis error: ' + error.message, true);
            return null;
        }
    }

    // ── Construction PPE Detection via OpenAI (single-call approach) ──
    async function analyzeConstructionSafetyOpenAI(imageDataUrl) {
        if (!window.apiKeyManager.hasOpenAIKey()) {
            window.reasoningConsole.logError('No OpenAI API key configured');
            updateStatus('Please configure your OpenAI API key', true);
            window.apiKeyManager.showModal();
            return null;
        }

        const startTime = Date.now();
        updateStatus('Analyzing PPE with GPT-4o-mini...');
        window.reasoningConsole.logApiCall('/openai/vision', 0);

        // Single-call approach: detect people AND classify PPE in one request
        const ppePrompt = `Analyze this construction site image carefully. For each person visible, determine:
1. Are they wearing a hard hat on their head? (yes/no)
2. Are they wearing a safety vest/hi-vis vest? (yes/no)
3. Overall safety status (safe if BOTH hard hat AND vest are visible)

Respond with ONLY a valid JSON array (no markdown, no backticks):
[{"person": 1, "hard_hat": true/false, "vest": true/false, "safe": true/false, "location": "brief description"}]

If no people are visible, return: [{"person": 0, "hard_hat": false, "vest": false, "safe": true, "location": "no people detected"}]`;

        try {
            // Remove the data URL prefix
            const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + window.apiKeyManager.getOpenAIKey()
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: ppePrompt },
                                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}`, detail: 'low' } }
                            ]
                        }
                    ],
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error('OpenAI API error: ' + response.status);
            }

            const data = await response.json();
            const latency = Date.now() - startTime;
            window.reasoningConsole.logApiCall('/openai/vision', latency);

            const answer = data.choices[0]?.message?.content || '';
            window.reasoningConsole.logInfo('OpenAI PPE response: ' + answer.substring(0, 200));

            // Parse the PPE response
            const people = parseOpenAIPPEResponse(answer);

            // Draw overlays
            drawPersonOverlays(people, imageDataUrl);

            // Calculate overall safety rating
            const unsafeCount = people.filter(p => !p.safe).length;
            const totalPeople = people.length;

            let rating, status, concern, action;
            if (totalPeople === 0 || people[0]?.person === 0) {
                rating = 5;
                status = 'all_clear';
                concern = 'No personnel detected';
                action = 'Continue monitoring';
            } else if (unsafeCount === 0) {
                rating = 5;
                status = 'all_clear';
                concern = `All ${totalPeople} person(s) wearing proper PPE`;
                action = 'Continue monitoring';
            } else if (unsafeCount === 1 && totalPeople > 1) {
                rating = 2;
                status = 'hazard';
                concern = `${unsafeCount} of ${totalPeople} person(s) missing PPE`;
                action = 'Ensure all personnel have hard hats and safety vests';
            } else {
                rating = 1;
                status = 'danger';
                concern = `${unsafeCount} person(s) without proper PPE`;
                action = 'STOP WORK - All personnel must wear hard hats and safety vests';
            }

            const hazards = people.filter(p => !p.safe).map(p =>
                `Person ${p.person}: Missing ${!p.hard_hat ? 'hard hat' : ''} ${!p.hard_hat && !p.vest ? '+' : ''} ${!p.vest ? 'vest' : ''}`
            ).filter(h => h.includes('Missing'));

            window.reasoningConsole.logDecision(
                `Overall: ${rating}/5 (${RATING_META[rating]?.label})`,
                `${concern} [${latency}ms total]`
            );

            return {
                safetyRating: rating,
                status: status,
                primaryConcern: concern,
                recommendedAction: action,
                detectedHazards: hazards,
                people: people
            };
        } catch (error) {
            window.reasoningConsole.logError('OpenAI PPE analysis failed: ' + error.message);
            return null;
        }
    }

    function parseOpenAIPPEResponse(text) {
        try {
            // Try to extract JSON array from response
            let jsonStr = text;
            const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (fenceMatch) jsonStr = fenceMatch[1];

            const braceStart = jsonStr.indexOf('[');
            const braceEnd = jsonStr.lastIndexOf(']');
            if (braceStart !== -1 && braceEnd !== -1) {
                jsonStr = jsonStr.substring(braceStart, braceEnd + 1);
            }

            const parsed = JSON.parse(jsonStr);
            if (!Array.isArray(parsed)) return [];

            return parsed.map(p => ({
                bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.3 }, // Approximate - OpenAI doesn't provide exact bboxes
                safe: !!p.safe,
                wearing: [
                    ...(p.hard_hat ? ['hard hat'] : []),
                    ...(p.vest ? ['safety vest'] : [])
                ],
                missing: [
                    ...(!p.hard_hat ? ['hard hat'] : []),
                    ...(!p.vest ? ['safety vest'] : [])
                ],
                personIndex: p.person || 1
            }));
        } catch (e) {
            window.reasoningConsole.logError('Failed to parse OpenAI PPE response: ' + e.message);
            return [];
        }
    }
JS|

    function parseSafetyResponse(text) {
        try {
            // Try to extract JSON from the response
            let jsonStr = text;

            // Strip markdown code fences if present
            const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (fenceMatch) {
                jsonStr = fenceMatch[1];
            }

            // Try finding JSON object in the text
            const braceStart = jsonStr.indexOf('{');
            const braceEnd = jsonStr.lastIndexOf('}');
            if (braceStart !== -1 && braceEnd !== -1) {
                jsonStr = jsonStr.substring(braceStart, braceEnd + 1);
            }

            const parsed = JSON.parse(jsonStr);

            // Validate and clamp rating
            let rating = parseInt(parsed.safetyRating, 10);
            if (isNaN(rating) || rating < 1) rating = 1;
            if (rating > 5) rating = 5;

            return {
                safetyRating: rating,
                status: parsed.status || RATING_META[rating]?.status || 'all_clear',
                primaryConcern: parsed.primaryConcern || 'Analysis complete',
                recommendedAction: parsed.recommendedAction || 'Continue monitoring',
                detectedHazards: Array.isArray(parsed.detectedHazards) ? parsed.detectedHazards : []
            };
        } catch (e) {
            window.reasoningConsole.logError('Failed to parse safety response: ' + e.message);
            window.reasoningConsole.logInfo('Raw response: ' + text.substring(0, 200));
            // Fallback: attempt heuristic parse
            return {
                safetyRating: 5,
                status: 'all_clear',
                primaryConcern: 'Could not parse structured response',
                recommendedAction: 'Continue monitoring',
                detectedHazards: []
            };
        }
    }

    // ── Construction PPE Detection (person-level safe/unsafe) ──
    // PROMPT FIXED: Made more adversarial to prevent false 'safe' responses from small VLMs
    const PPE_PROMPT = `You are a SAFETY CRITICAL PPE inspector. Your job is to detect missing safety equipment.

CRITICAL RULES:
1. ONLY say safe=true if you can CLEARLY SEE both a hard hat AND a safety vest on this person
2. If you cannot clearly see both items, you MUST say safe=false
3. When in doubt, ALWAYS choose unsafe - false positives are dangerous
4. Do not be fooled by similar-looking items (baseball caps are NOT hard hats)

Look carefully at this person and respond with ONLY valid JSON (no markdown, no backticks):
{"safe": true or false, "wearing": ["items clearly visible on this person"], "missing": ["items not clearly visible"]}

If you see ANY uncertainty about the presence of BOTH a hard hat AND a safety vest, safe MUST be false.`;

    async function analyzeConstructionSafety(imageDataUrl) {
        if (!client) return null;

        const startTime = Date.now();
        updateStatus('Detecting people...');
        window.reasoningConsole.logApiCall('/detect', 0);

        // Step 1: Detect all people in the frame
        let detections;
        try {
            const detectResult = await client.detect(imageDataUrl, 'person');
            detections = detectResult.objects || [];
            const detectLatency = Date.now() - startTime;
            window.reasoningConsole.logApiCall('/detect', detectLatency);
            window.reasoningConsole.logInfo(`Detected ${detections.length} person(s) [${detectLatency}ms]`);
        } catch (e) {
            window.reasoningConsole.logError('Person detection failed: ' + e.message);
            return null;
        }

        if (detections.length === 0) {
            // No people — scene is safe
            drawPersonOverlays([], imageDataUrl);
            return {
                safetyRating: 5,
                status: 'all_clear',
                primaryConcern: 'No personnel detected',
                recommendedAction: 'Continue monitoring',
                detectedHazards: [],
                people: []
            };
        }

        // Step 2: For each person, crop and classify PPE
        updateStatus(`Checking PPE on ${detections.length} person(s)...`);
        const people = [];

        for (let i = 0; i < detections.length; i++) {
            const det = detections[i];
            const bbox = {
                x: det.x_min || 0,
                y: det.y_min || 0,
                w: (det.x_max || 1) - (det.x_min || 0),
                h: (det.y_max || 1) - (det.y_min || 0)
            };

            try {
                // Crop the person region
                const crop = cropPersonFromFrame(imageDataUrl, bbox);
                window.reasoningConsole.logApiCall('/query (PPE)', 0);
                const ppeStart = Date.now();
                const result = await client.ask(crop, PPE_PROMPT);
                const ppeLatency = Date.now() - ppeStart;
                window.reasoningConsole.logApiCall('/query (PPE)', ppeLatency);

                const parsed = parsePPEResponse(result.answer);
                people.push({
                    bbox: bbox,
                    safe: parsed.safe,
                    wearing: parsed.wearing,
                    missing: parsed.missing,
                    personIndex: i + 1
                });

                window.reasoningConsole.logDecision(
                    `Person ${i + 1}: ${parsed.safe ? 'SAFE' : 'UNSAFE'}`,
                    `Wearing: ${parsed.wearing.join(', ') || 'nothing detected'} | Missing: ${parsed.missing.join(', ') || 'none'} [${ppeLatency}ms]`
                );
            } catch (e) {
                window.reasoningConsole.logError(`PPE check failed for person ${i + 1}: ${e.message}`);
                // Default to unsafe if we can't classify
                people.push({
                    bbox: bbox,
                    safe: false,
                    wearing: [],
                    missing: ['unknown (classification failed)'],
                    personIndex: i + 1
                });
            }
        }

        // Step 3: Draw visual overlays
        drawPersonOverlays(people, imageDataUrl);

        // Step 4: Derive overall safety rating
        const unsafeCount = people.filter(p => !p.safe).length;
        const totalPeople = people.length;
        const totalLatency = Date.now() - startTime;

        let rating, status, concern, action;
        if (unsafeCount === 0) {
            rating = 5;
            status = 'all_clear';
            concern = `All ${totalPeople} person(s) wearing proper PPE`;
            action = 'Continue monitoring';
        } else if (unsafeCount === 1 && totalPeople > 1) {
            rating = 2;
            status = 'hazard';
            concern = `${unsafeCount} of ${totalPeople} person(s) missing PPE`;
            action = 'Ensure all personnel have hard hats and safety vests';
        } else if (unsafeCount >= totalPeople) {
            rating = 1;
            status = 'danger';
            concern = `${unsafeCount} person(s) without proper PPE`;
            action = 'STOP WORK - All personnel must wear hard hats and safety vests';
        } else {
            rating = 2;
            status = 'hazard';
            concern = `${unsafeCount} of ${totalPeople} person(s) missing PPE`;
            action = 'Ensure all personnel have hard hats and safety vests';
        }

        const hazards = people.filter(p => !p.safe).map(p =>
            `Person ${p.personIndex}: Missing ${p.missing.join(', ')}`
        );

        window.reasoningConsole.logDecision(
            `Overall: ${rating}/5 (${RATING_META[rating]?.label})`,
            `${concern} [${totalLatency}ms total]`
        );

        return {
            safetyRating: rating,
            status: status,
            primaryConcern: concern,
            recommendedAction: action,
            detectedHazards: hazards,
            people: people
        };
    }

    function cropPersonFromFrame(imageDataUrl, bbox) {
        // bbox coords are normalized 0-1 from Moondream detect
        const img = new Image();
        img.src = imageDataUrl;
        const iw = img.width || video.videoWidth || 640;
        const ih = img.height || video.videoHeight || 480;

        const px = Math.round(bbox.x * iw);
        const py = Math.round(bbox.y * ih);
        const pw = Math.max(10, Math.round(bbox.w * iw));
        const ph = Math.max(10, Math.round(bbox.h * ih));

        const c = document.createElement('canvas');
        c.width = pw;
        c.height = ph;
        c.getContext('2d').drawImage(img, px, py, pw, ph, 0, 0, pw, ph);
        return c.toDataURL('image/jpeg', 0.85);
    }

    function parsePPEResponse(text) {
        try {
            let jsonStr = text;
            const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (fenceMatch) jsonStr = fenceMatch[1];
            const braceStart = jsonStr.indexOf('{');
            const braceEnd = jsonStr.lastIndexOf('}');
            if (braceStart !== -1 && braceEnd !== -1) {
                jsonStr = jsonStr.substring(braceStart, braceEnd + 1);
            }
            const parsed = JSON.parse(jsonStr);
            return {
                safe: !!parsed.safe,
                wearing: Array.isArray(parsed.wearing) ? parsed.wearing : [],
                missing: Array.isArray(parsed.missing) ? parsed.missing : []
            };
        } catch (e) {
            window.reasoningConsole.logError('Failed to parse PPE response: ' + e.message);
            // Default to unsafe if parse fails
            return { safe: false, wearing: [], missing: ['unknown'] };
        }
    }

    function drawPersonOverlays(people, imageDataUrl) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        if (people.length === 0) return;

        // Get image dimensions for coordinate scaling
        const img = new Image();
        img.src = imageDataUrl;
        const iw = img.width || video.videoWidth || 640;
        const ih = img.height || video.videoHeight || 480;
        const scaleX = overlayCanvas.width / iw;
        const scaleY = overlayCanvas.height / ih;

        people.forEach(function(person) {
            const x = person.bbox.x * iw * scaleX;
            const y = person.bbox.y * ih * scaleY;
            const w = person.bbox.w * iw * scaleX;
            const h = person.bbox.h * ih * scaleY;

            const color = person.safe ? '#2A9D8F' : '#E63946';
            const bgAlpha = person.safe ? 'rgba(42, 157, 143, 0.15)' : 'rgba(230, 57, 70, 0.15)';

            // Semi-transparent fill
            overlayCtx.fillStyle = bgAlpha;
            overlayCtx.fillRect(x, y, w, h);

            // Bounding box
            overlayCtx.strokeStyle = color;
            overlayCtx.lineWidth = person.safe ? 3 : 4;
            if (!person.safe) {
                // Pulsing dashed border for unsafe
                overlayCtx.setLineDash([8, 4]);
            }
            overlayCtx.strokeRect(x, y, w, h);
            overlayCtx.setLineDash([]);

            // Label background
            const icon = person.safe ? '\u2713' : '\u2717';
            const labelText = person.safe
                ? `${icon} SAFE - PPE OK`
                : `${icon} UNSAFE - Missing: ${person.missing.join(', ')}`;

            overlayCtx.font = 'bold 14px sans-serif';
            const textMetrics = overlayCtx.measureText(labelText);
            const labelW = textMetrics.width + 12;
            const labelH = 22;
            const labelX = x;
            const labelY = y - labelH - 2;

            // Label background
            overlayCtx.fillStyle = color;
            overlayCtx.beginPath();
            overlayCtx.roundRect(labelX, labelY, labelW, labelH, 4);
            overlayCtx.fill();

            // Label text
            overlayCtx.fillStyle = '#fff';
            overlayCtx.font = 'bold 13px sans-serif';
            overlayCtx.fillText(labelText, labelX + 6, labelY + 16);

            // PPE item icons below the label
            const itemY = labelY + labelH + 4;
            let itemX = x + 4;
            const items = [
                { name: 'Hard Hat', has: person.wearing.some(w => w.toLowerCase().includes('hat') || w.toLowerCase().includes('helmet')) },
                { name: 'Vest', has: person.wearing.some(w => w.toLowerCase().includes('vest') || w.toLowerCase().includes('hi-vis')) }
            ];
            items.forEach(function(item) {
                const itemIcon = item.has ? '\u2705' : '\u274C';
                overlayCtx.font = '11px sans-serif';
                overlayCtx.fillStyle = item.has ? '#2A9D8F' : '#E63946';
                // Small background pill
                const pillW = overlayCtx.measureText(itemIcon + ' ' + item.name).width + 8;
                overlayCtx.fillStyle = 'rgba(0,0,0,0.7)';
                overlayCtx.beginPath();
                overlayCtx.roundRect(itemX, y + 4, pillW, 18, 3);
                overlayCtx.fill();
                overlayCtx.fillStyle = item.has ? '#2A9D8F' : '#E63946';
                overlayCtx.fillText(itemIcon + ' ' + item.name, itemX + 4, y + 17);
                itemX += pillW + 4;
            });
        });

        // Overall border based on safety
        const unsafeCount = people.filter(p => !p.safe).length;
        if (unsafeCount > 0) {
            const borderColor = unsafeCount >= people.length ? '#E63946' : '#E76F51';
            const thickness = unsafeCount >= people.length ? 6 : 4;
            overlayCtx.strokeStyle = borderColor;
            overlayCtx.lineWidth = thickness;
            overlayCtx.strokeRect(thickness / 2, thickness / 2,
                overlayCanvas.width - thickness, overlayCanvas.height - thickness);
        }
    }

    // ── UI Update functions ──
    function updateStatus(message, isError = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }

    function updateRatingCard(assessment) {
        if (!assessment) return;

        const r = assessment.safetyRating;
        const meta = RATING_META[r];

        // Update card class
        ratingCard.className = `rating-card rating-${r}`;

        // Update circle
        const circle = ratingCard.querySelector('.rating-circle');
        circle.textContent = r;

        // Update label
        const label = ratingCard.querySelector('.rating-label');
        label.textContent = meta.label;

        // Update concern
        const concern = ratingCard.querySelector('.rating-concern');
        concern.textContent = assessment.primaryConcern;

        // Update action
        const action = ratingCard.querySelector('.rating-action');
        action.textContent = assessment.recommendedAction;

        // Update hazard tags
        hazardTags.innerHTML = '';
        if (assessment.detectedHazards.length > 0) {
            assessment.detectedHazards.forEach(h => {
                const tag = document.createElement('span');
                tag.className = 'hazard-tag';
                tag.textContent = h;
                hazardTags.appendChild(tag);
            });
        }

        // Draw overlay border on canvas
        drawSafetyOverlay(r, meta.color);
    }

    function drawSafetyOverlay(rating, color) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        if (rating <= 3) {
            const thickness = rating === 1 ? 8 : rating === 2 ? 5 : 3;
            overlayCtx.strokeStyle = color;
            overlayCtx.lineWidth = thickness;
            overlayCtx.strokeRect(
                thickness / 2, thickness / 2,
                overlayCanvas.width - thickness, overlayCanvas.height - thickness
            );
        }
    }

    function updateSessionStats() {
        if (sessionStart) {
            const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
            const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const secs = (elapsed % 60).toString().padStart(2, '0');
            statDuration.textContent = `${mins}:${secs}`;
        }
        statFrames.textContent = framesAnalyzed;
        statAlarms.textContent = alarmsTriggered;
        statAvgRating.textContent = framesAnalyzed > 0
            ? (ratingSum / framesAnalyzed).toFixed(1)
            : '--';
    }

    function updateThresholdDots() {
        const threshold = parseInt(thresholdSelect.value, 10);
        const dots = thresholdDots.querySelectorAll('.threshold-dot');
        dots.forEach((dot, i) => {
            const ratingForDot = i + 1; // dots are 1-5 from left to right
            dot.classList.toggle('active', ratingForDot <= threshold);
            dot.style.opacity = ratingForDot <= threshold ? '1' : '0.3';
        });
    }

    // ── Assessment history ──
    function logAssessment(assessment, thumbnail, fullImage) {
        const entry = {
            timestamp: new Date().toISOString(),
            preset: presetSelect.value,
            safetyRating: assessment.safetyRating,
            status: assessment.status,
            primaryConcern: assessment.primaryConcern,
            recommendedAction: assessment.recommendedAction,
            detectedHazards: assessment.detectedHazards,
            thumbnail: thumbnail,
            fullImage: fullImage
        };

        assessments.unshift(entry);
        if (assessments.length > MAX_ASSESSMENTS) assessments.pop();

        renderHistory();
        saveAssessments();
    }

    function renderHistory() {
        if (assessments.length === 0) {
            historyStrip.innerHTML = '<div class="history-empty">Assessments will appear here</div>';
            return;
        }

        historyStrip.innerHTML = assessments.slice(0, 100).map((a, i) => {
            const time = new Date(a.timestamp).toLocaleTimeString();
            return `
                <div class="history-item rating-${a.safetyRating}" data-index="${i}" title="${RATING_META[a.safetyRating]?.label}: ${a.primaryConcern}">
                    <img class="history-thumb" src="${a.thumbnail}" alt="Frame">
                    <div class="history-meta">
                        <span class="rating-dot dot-${a.safetyRating}"></span>
                        ${time}
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        historyStrip.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const idx = parseInt(item.dataset.index, 10);
                showDetail(assessments[idx]);
            });
        });
    }

    function showDetail(entry) {
        detailImage.src = entry.fullImage || entry.thumbnail;
        const r = entry.safetyRating;
        const meta = RATING_META[r];
        const time = new Date(entry.timestamp).toLocaleString();
        detailRating.className = `rating-card rating-${r}`;
        detailRating.innerHTML = `
            <div class="rating-circle">${r}</div>
            <div class="rating-label">${meta.label}</div>
            <div class="rating-concern">${entry.primaryConcern}</div>
            <div class="rating-action">${entry.recommendedAction}</div>
            ${entry.detectedHazards.length > 0 ? `
                <div class="hazard-tags">
                    ${entry.detectedHazards.map(h => `<span class="hazard-tag">${h}</span>`).join('')}
                </div>
            ` : ''}
            <div style="margin-top: 8px; font-size: 0.75rem; color: var(--text-muted);">
                ${time} | Preset: ${entry.preset}
            </div>
        `;
        detailOverlay.classList.add('active');
    }

    // ── LocalStorage persistence ──
    function saveAssessments() {
        try {
            // Save without full images to stay within localStorage limits
            const toSave = assessments.map(a => ({
                ...a,
                fullImage: null // don't store full images in localStorage
            }));
            localStorage.setItem('vrp_safety_assessments', JSON.stringify(toSave.slice(0, 200)));
        } catch (e) {
            // localStorage full, silently fail
        }
    }

    function loadAssessments() {
        try {
            const saved = localStorage.getItem('vrp_safety_assessments');
            if (saved) {
                assessments = JSON.parse(saved);
                renderHistory();
                window.reasoningConsole.logInfo(`Loaded ${assessments.length} saved assessments`);
            }
        } catch (e) {
            // ignore parse errors
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem('vrp_safety_settings', JSON.stringify({
                preset: presetSelect.value,
                fpm: fpmSelect.value,
                threshold: thresholdSelect.value,
                consecutive: consecutiveInput.value,
                audio: audioToggle.checked,
                notif: notifToggle.checked,
                vlmEngine: vlmEngine
            }));
        } catch (e) { /* ignore */ }
    }

    function loadSettings() {
        try {
            const saved = localStorage.getItem('vrp_safety_settings');
            if (saved) {
                const s = JSON.parse(saved);
                if (s.preset) presetSelect.value = s.preset;
                if (s.fpm) fpmSelect.value = s.fpm;
                if (s.threshold) thresholdSelect.value = s.threshold;
                if (s.consecutive) consecutiveInput.value = s.consecutive;
                if (s.audio !== undefined) audioToggle.checked = s.audio;
                if (s.notif !== undefined) notifToggle.checked = s.notif;
                updateThresholdDots();

                // Load VLM engine preference
                if (s.vlmEngine) {
                    vlmEngine = s.vlmEngine;
                    document.getElementById('vlmMoondreamBtn').classList.toggle('active', vlmEngine === 'moondream');
                    document.getElementById('vlmOpenAIBtn').classList.toggle('active', vlmEngine === 'openai');
                    document.getElementById('vlmInfo').textContent = vlmEngine === 'openai'
                        ? 'Using GPT-4o-mini (better accuracy, paid)'
                        : 'Using Moondream API (free tier)';
                }

                // Sync preset buttons with loaded value
                document.querySelectorAll('.preset-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.preset === presetSelect.value);
                });
            }
        } catch (e) { /* ignore */ }
            }
        } catch (e) { /* ignore */ }
    }

    // ── Export functions ──
    function exportJSON() {
        const data = assessments.map(a => ({
            timestamp: a.timestamp,
            preset: a.preset,
            safetyRating: a.safetyRating,
            status: a.status,
            primaryConcern: a.primaryConcern,
            recommendedAction: a.recommendedAction,
            detectedHazards: a.detectedHazards
        }));
        downloadFile(JSON.stringify(data, null, 2), 'safety-assessments.json', 'application/json');
        window.reasoningConsole.logAction('Export', `Exported ${data.length} assessments as JSON`);
    }

    function exportCSV() {
        const headers = ['timestamp', 'preset', 'safetyRating', 'status', 'primaryConcern', 'recommendedAction', 'detectedHazards'];
        const rows = assessments.map(a =>
            headers.map(h => {
                let val = a[h];
                if (Array.isArray(val)) val = val.join('; ');
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(',')
        );
        const csv = headers.join(',') + '\n' + rows.join('\n');
        downloadFile(csv, 'safety-assessments.csv', 'text/csv');
        window.reasoningConsole.logAction('Export', `Exported ${assessments.length} assessments as CSV`);
    }

    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ── Alarm system ──
    function checkAlarm(assessment) {
        const threshold = parseInt(thresholdSelect.value, 10);
        const requiredConsecutive = parseInt(consecutiveInput.value, 10);

        if (assessment.safetyRating <= threshold) {
            consecutiveBelowCount++;
            window.reasoningConsole.logInfo(`Below threshold: ${consecutiveBelowCount}/${requiredConsecutive} consecutive`);

            if (consecutiveBelowCount >= requiredConsecutive && alarmState !== 'alarming' && alarmState !== 'acknowledged') {
                triggerAlarm(assessment);
            } else if (consecutiveBelowCount === 1 && alarmState === 'clear') {
                alarmState = 'warning';
                window.reasoningConsole.logDecision('Alarm state', 'warning - 1 frame below threshold');
            }
        } else {
            if (consecutiveBelowCount > 0) {
                window.reasoningConsole.logInfo('Rating above threshold, resetting consecutive count');
            }
            consecutiveBelowCount = 0;
            if (alarmState === 'warning') {
                alarmState = 'clear';
            }
            // Reset acknowledged state when things improve
            if (alarmState === 'acknowledged') {
                alarmState = 'clear';
                window.reasoningConsole.logDecision('Alarm state', 'clear - conditions improved');
            }
        }
    }

    function triggerAlarm(assessment) {
        alarmState = 'alarming';
        alarmsTriggered++;
        updateSessionStats();

        window.reasoningConsole.logAction('ALARM TRIGGERED', `Rating ${assessment.safetyRating}: ${assessment.primaryConcern}`);

        // Visual: show alarm overlay
        alarmConcern.textContent = assessment.primaryConcern;
        alarmAction.textContent = assessment.recommendedAction;
        alarmThumb.src = captureThumbnail();
        alarmOverlay.classList.add('active');

        // Audio alert
        if (audioToggle.checked) {
            playAlarmSound();
        }

        // Browser notification
        if (notifToggle.checked) {
            sendNotification(assessment);
        }
    }

    function acknowledgeAlarm() {
        alarmState = 'acknowledged';
        consecutiveBelowCount = 0;
        alarmOverlay.classList.remove('active');
        stopAlarmSound();
        window.reasoningConsole.logAction('Alarm acknowledged', 'User dismissed alarm');
    }

    function playAlarmSound() {
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            // Generate a two-tone alarm beep
            const now = audioCtx.currentTime;
            for (let i = 0; i < 3; i++) {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'square';
                osc.frequency.value = i % 2 === 0 ? 800 : 600;
                gain.gain.value = 0.15;
                osc.start(now + i * 0.3);
                osc.stop(now + i * 0.3 + 0.2);
            }
        } catch (e) {
            // Web Audio not available
        }
    }

    function stopAlarmSound() {
        // Sound is self-stopping via osc.stop(), nothing to clean up
    }

    function sendNotification(assessment) {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            new Notification('AI Safety Monitor - ALARM', {
                body: `Rating ${assessment.safetyRating}/5: ${assessment.primaryConcern}`,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">&#9888;</text></svg>',
                tag: 'safety-alarm'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }

    // ── Monitoring loop ──
    async function startMonitoring() {
        // Check for appropriate API key based on selected VLM engine
        if (vlmEngine === 'moondream') {
            if (!client) {
                updateStatus('Please configure Moondream API key', true);
                window.apiKeyManager.showModal();
                return;
            }
        } else {
            // OpenAI
            if (!window.apiKeyManager.hasOpenAIKey()) {
                updateStatus('Please configure OpenAI API key', true);
                window.apiKeyManager.showModal();
                return;
            }
        }

        monitoring = true;
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        sessionStart = Date.now();
        framesAnalyzed = 0;
        alarmsTriggered = 0;
        ratingSum = 0;
        consecutiveBelowCount = 0;
        alarmState = 'clear';

        // Start duration timer
        durationInterval = setInterval(updateSessionStats, 1000);

        window.reasoningConsole.logInfo(`Started safety monitoring (${PRESETS[presetSelect.value].name} preset, ${fpmSelect.value} FPM)`);
        updateStatus('Monitoring active...');

        await monitorLoop();
    }

    async function monitorLoop() {
        if (!monitoring) return;

        let imageDataUrl;
        if (mode === 'upload' && uploadedImages.length > 0) {
            imageDataUrl = uploadedImages[uploadIndex % uploadedImages.length];
            uploadIndex++;
            window.reasoningConsole.logInfo(`Analyzing uploaded image ${uploadIndex}/${uploadedImages.length}`);
        } else {
            imageDataUrl = captureFrame();
        }

        const thumbnail = mode === 'upload' ? imageDataUrl : captureThumbnail();

        // Dispatch to selected VLM engine
        let assessment;
        const useOpenAI = vlmEngine === 'openai';

        if (presetSelect.value === 'construction') {
            if (useOpenAI) {
                assessment = await analyzeConstructionSafetyOpenAI(imageDataUrl);
            } else {
                assessment = await analyzeConstructionSafety(imageDataUrl);
            }
        } else {
            if (useOpenAI) {
                assessment = await analyzeSafetyOpenAI(imageDataUrl);
            } else {
                assessment = await analyzeSafety(imageDataUrl);
            }
        }

        if (assessment) {
            framesAnalyzed++;
            ratingSum += assessment.safetyRating;
            updateRatingCard(assessment);
            updateSessionStats();
            checkAlarm(assessment);
            logAssessment(assessment, thumbnail, imageDataUrl);
            updateStatus(`Monitoring (${PRESETS[presetSelect.value].name}) - Last: ${RATING_META[assessment.safetyRating]?.label}`);
        }

        if (monitoring) {
            const intervalMs = (60 / parseInt(fpmSelect.value, 10)) * 1000;
            monitorTimeout = setTimeout(monitorLoop, intervalMs);
        }
    }

    function stopMonitoring() {
        monitoring = false;
        clearTimeout(monitorTimeout);
        clearInterval(durationInterval);
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        updateStatus('Monitoring stopped');
        window.reasoningConsole.logInfo(`Monitoring stopped. ${framesAnalyzed} frames analyzed, ${alarmsTriggered} alarms triggered.`);
    }

    // Snap: single frame analysis
    async function snapAnalysis() {
        // Check for appropriate API key based on selected VLM engine
        if (vlmEngine === 'moondream') {
            if (!client) {
                updateStatus('Please configure Moondream API key', true);
                window.apiKeyManager.showModal();
                return;
            }
        } else {
            // OpenAI
            if (!window.apiKeyManager.hasOpenAIKey()) {
                updateStatus('Please configure OpenAI API key', true);
                window.apiKeyManager.showModal();
                return;
            }
        }

        snapBtn.disabled = true;
        snapBtn.textContent = 'Analyzing...';

        let imageDataUrl;
        if (mode === 'upload' && uploadedImages.length > 0) {
            imageDataUrl = uploadedImages[0];
        } else {
            imageDataUrl = captureFrame();
        }

        const thumbnail = mode === 'upload' ? imageDataUrl : captureThumbnail();

        // Dispatch to selected VLM engine
        let assessment;
        const useOpenAI = vlmEngine === 'openai';

        if (presetSelect.value === 'construction') {
            if (useOpenAI) {
                assessment = await analyzeConstructionSafetyOpenAI(imageDataUrl);
            } else {
                assessment = await analyzeConstructionSafety(imageDataUrl);
            }
        } else {
            if (useOpenAI) {
                assessment = await analyzeSafetyOpenAI(imageDataUrl);
            } else {
                assessment = await analyzeSafety(imageDataUrl);
            }
        }

        if (assessment) {
            framesAnalyzed++;
            ratingSum += assessment.safetyRating;
            updateRatingCard(assessment);
            updateSessionStats();
            logAssessment(assessment, thumbnail, imageDataUrl);
        }

        snapBtn.disabled = false;
        snapBtn.textContent = 'Snap';
    }

    // ── Mode switching ──
    function switchMode(newMode) {
        mode = newMode;
        modeCameraBtn.classList.toggle('active', mode === 'camera');
        modeUploadBtn.classList.toggle('active', mode === 'upload');
        modeSampleBtn.classList.toggle('active', mode === 'sample');
        cameraGroup.style.display = mode === 'camera' ? '' : 'none';
        uploadArea.classList.toggle('visible', mode === 'upload');
        video.style.display = (mode === 'camera' || mode === 'sample') ? '' : 'none';

        if (mode === 'upload') {
            window.reasoningConsole.logInfo('Switched to image upload mode');
            if (video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
                video.srcObject = null;
            }
        } else if (mode === 'sample') {
            window.reasoningConsole.logInfo('Switched to sample video mode');
            if (video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
                video.srcObject = null;
            }
            loadSampleVideo();
        } else {
            window.reasoningConsole.logInfo('Switched to live camera mode');
            if (video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
                video.srcObject = null;
            }
            video.removeAttribute('src');
            uploadedImages = [];
            uploadIndex = 0;
        }
    }

    // ── Sample Video ──
    function loadSampleVideo() {
        const samplePath = 'Ai-saftey-sample-video.mp4';
        video.src = samplePath;
        video.loop = true;
        video.play().catch(err => {
            window.reasoningConsole.logError('Failed to play sample video: ' + err.message);
        });
        window.reasoningConsole.logInfo('Loading sample video: ' + samplePath);
    }
    function switchMode(newMode) {
        mode = newMode;
        modeCameraBtn.classList.toggle('active', mode === 'camera');
        modeUploadBtn.classList.toggle('active', mode === 'upload');
        cameraGroup.style.display = mode === 'camera' ? '' : 'none';
        uploadArea.classList.toggle('visible', mode === 'upload');
        video.style.display = mode === 'camera' ? '' : 'none';

        if (mode === 'upload') {
            window.reasoningConsole.logInfo('Switched to image upload mode');
        } else {
            window.reasoningConsole.logInfo('Switched to live camera mode');
            uploadedImages = [];
            uploadIndex = 0;
        }
    }

    // ── Upload handling ──
    function handleFiles(files) {
        uploadedImages = [];
        uploadIndex = 0;
        const promises = Array.from(files).map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadedImages.push(e.target.result);
                    resolve();
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(promises).then(() => {
            window.reasoningConsole.logInfo(`Loaded ${uploadedImages.length} image(s) for analysis`);
            updateStatus(`${uploadedImages.length} image(s) loaded - Ready to analyze`);

            // Show first image in video area
            if (uploadedImages.length > 0) {
                const img = new Image();
                img.onload = () => {
                    overlayCanvas.width = img.width;
                    overlayCanvas.height = img.height;
                    overlayCtx.drawImage(img, 0, 0);
                };
                img.src = uploadedImages[0];
            }
        });
    }

    // ── Preset info update ──
    function updatePresetInfo() {
        presetInfo.textContent = preset.description;

        // Show/hide PPE legend for construction mode
        const ppeLegend = document.getElementById('ppeLegend');
        if (ppeLegend) {
            ppeLegend.style.display = presetSelect.value === 'construction' ? '' : 'none';
        }
    }

    // ── Event listeners ──
    modeCameraBtn.addEventListener('click', () => switchMode('camera'));
    modeUploadBtn.addEventListener('click', () => switchMode('upload'));
    modeSampleBtn.addEventListener('click', () => switchMode('sample'));
    modeCameraBtn.addEventListener('click', () => switchMode('camera'));
    modeUploadBtn.addEventListener('click', () => switchMode('upload'));

    cameraSelect.addEventListener('change', () => {
        if (cameraSelect.value) startCamera(cameraSelect.value);
    });
    refreshCamerasBtn.addEventListener('click', enumerateCameras);

    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFiles(e.target.files);
    });
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    });

    });

    // Preset button click handlers
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update hidden select value
            presetSelect.value = btn.dataset.preset;

            updatePresetInfo();
            saveSettings();

            // Show/hide PPE legend for construction mode
            const ppeLegend = document.getElementById('ppeLegend');
            if (ppeLegend) ppeLegend.style.display = presetSelect.value === 'construction' ? '' : 'none';

            // Clear overlays when switching presets
            overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            window.reasoningConsole.logInfo(`Preset changed to: ${PRESETS[presetSelect.value].name}`);
        });
    });

    // VLM engine toggle handlers
    document.getElementById('vlmMoondreamBtn').addEventListener('click', () => {
        vlmEngine = 'moondream';
        document.getElementById('vlmMoondreamBtn').classList.add('active');
        document.getElementById('vlmOpenAIBtn').classList.remove('active');
        document.getElementById('vlmInfo').textContent = 'Using Moondream API (free tier)';

        // Check if Moondream key exists, if not prompt for it
        if (!window.apiKeyManager.hasMoondreamKey()) {
            window.apiKeyManager.showModal();
        }
        saveSettings();
        window.reasoningConsole.logInfo('Switched to Moondream VLM');
    });

    document.getElementById('vlmOpenAIBtn').addEventListener('click', () => {
        vlmEngine = 'openai';
        document.getElementById('vlmOpenAIBtn').classList.add('active');
        document.getElementById('vlmMoondreamBtn').classList.remove('active');
        document.getElementById('vlmInfo').textContent = 'Using GPT-4o-mini (better accuracy, paid)';

        // Check if OpenAI key exists, if not prompt for it
        if (!window.apiKeyManager.hasOpenAIKey()) {
            window.apiKeyManager.showModal();
        }
        saveSettings();
        window.reasoningConsole.logInfo('Switched to OpenAI GPT-4o-mini VLM');
    });

NK|

    fpmSelect.addEventListener('change', saveSettings);

    thresholdSelect.addEventListener('change', () => {
        updateThresholdDots();
        saveSettings();
        window.reasoningConsole.logInfo(`Alarm threshold set to: ${thresholdSelect.value}`);
    });

    consecutiveInput.addEventListener('change', saveSettings);
    audioToggle.addEventListener('change', saveSettings);

    notifToggle.addEventListener('change', () => {
        if (notifToggle.checked && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(perm => {
                if (perm !== 'granted') {
                    notifToggle.checked = false;
                    window.reasoningConsole.logInfo('Browser notification permission denied');
                }
            });
        }
        saveSettings();
    });

    startBtn.addEventListener('click', startMonitoring);
    stopBtn.addEventListener('click', stopMonitoring);
    snapBtn.addEventListener('click', snapAnalysis);

    alarmAckBtn.addEventListener('click', acknowledgeAlarm);

    detailCloseBtn.addEventListener('click', () => {
        detailOverlay.classList.remove('active');
    });
    detailOverlay.addEventListener('click', (e) => {
        if (e.target === detailOverlay) detailOverlay.classList.remove('active');
    });

    exportJsonBtn.addEventListener('click', exportJSON);
    exportCsvBtn.addEventListener('click', exportCSV);
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Clear all assessment history?')) {
            assessments = [];
            renderHistory();
            localStorage.removeItem('vrp_safety_assessments');
            window.reasoningConsole.logAction('History cleared', 'All assessments removed');
        }
    });

    // ── Initialize ──
    loadSettings();
    loadAssessments();
    updateThresholdDots();
    updatePresetInfo();

    // Initialize VideoSourceAdapter or start camera directly
    if (window.VideoSourceAdapter) {
        VideoSourceAdapter.init({
            videoElement: video,
            toolId: 'ai-safety',
            insertInto: '.video-container',
            onSourceChange: (source) => {
                cameraSelect.disabled = source === 'sample';
                refreshCamerasBtn.disabled = source === 'sample';
                if (source === 'camera') enumerateCameras();
                window.reasoningConsole.logInfo(`Switched to ${source === 'camera' ? 'live camera' : 'sample video'}`);
            }
        });
        VideoSourceAdapter.switchToCamera().catch(() => {
            VideoSourceAdapter.switchToSample();
        });
    } else {
        await startCamera();
    }
});
