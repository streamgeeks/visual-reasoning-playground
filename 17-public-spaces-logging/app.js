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
    const spaceTabs = document.getElementById('spaceTabs');
    const currentEventType = document.getElementById('currentEventType');
    const currentEventDesc = document.getElementById('currentEventDesc');
    const confidenceBar = document.getElementById('confidenceBar');
    const confidencePct = document.getElementById('confidencePct');
    const intervalSelect = document.getElementById('intervalSelect');
    const captureFramesToggle = document.getElementById('captureFramesToggle');
    const autoScrollToggle = document.getElementById('autoScrollToggle');
    const sigOnlyToggle = document.getElementById('sigOnlyToggle');
    const dedupInput = document.getElementById('dedupInput');
    const statDuration = document.getElementById('statDuration');
    const statFrames = document.getElementById('statFrames');
    const statEvents = document.getElementById('statEvents');
    const statSignificant = document.getElementById('statSignificant');
    const eventBreakdown = document.getElementById('eventBreakdown');
    const newSessionBtn = document.getElementById('newSessionBtn');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const endSessionBtn = document.getElementById('endSessionBtn');
    const statusBar = document.getElementById('status');
    const eventLogDiv = document.getElementById('eventLog');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const sessionBar = document.getElementById('sessionBar');
    const sessionBadge = document.getElementById('sessionBadge');
    const sessionLabelDisplay = document.getElementById('sessionLabelDisplay');
    const sessionMetaDisplay = document.getElementById('sessionMetaDisplay');
    // New session modal
    const newSessionModal = document.getElementById('newSessionModal');
    const modalSpaceTabs = document.getElementById('modalSpaceTabs');
    const sessionLabelInput = document.getElementById('sessionLabelInput');
    const sessionLocationInput = document.getElementById('sessionLocationInput');
    const sessionDateInput = document.getElementById('sessionDateInput');
    const cancelSessionBtn = document.getElementById('cancelSessionBtn');
    const createSessionBtn = document.getElementById('createSessionBtn');
    // Compliance modal
    const complianceModal = document.getElementById('complianceModal');
    const complianceTitle = document.getElementById('complianceTitle');
    const complianceIntro = document.getElementById('complianceIntro');
    const complianceList = document.getElementById('complianceList');
    const complianceDontShow = document.getElementById('complianceDontShow');
    const complianceAckBtn = document.getElementById('complianceAckBtn');
    // Detail overlay
    const detailOverlay = document.getElementById('detailOverlay');
    const detailCloseBtn = document.getElementById('detailCloseBtn');
    const detailImage = document.getElementById('detailImage');
    const detailEventType = document.getElementById('detailEventType');
    const detailDesc = document.getElementById('detailDesc');
    const detailMeta = document.getElementById('detailMeta');

    // ── State ──
    let client = null;
    let currentStream = null;

    // VLM-aware client helper
    function getVLMClient() {
        if (window.vlmToggle) return window.vlmToggle.getClient();
        return client;
    }
    let selectedSpace = 'courtroom';
    let modalSelectedSpace = 'courtroom';
    let mode = 'camera';
    let uploadedImages = [];
    let uploadIndex = 0;

    let session = null;       // current session object
    let sessionActive = false;
    let analysisTimeout = null;
    let durationInterval = null;
    let totalFramesAnalyzed = 0;

    // Pending compliance callback
    let complianceCallback = null;

    // ══════════════════════════════════════════════════════════════════
    //  SPACE DEFINITIONS: taxonomies, prompts, compliance, theming
    // ══════════════════════════════════════════════════════════════════

    const SPACES = {
        courtroom: {
            name: 'Courtroom',
            icon: '\u2696\uFE0F',
            themeClass: 'space-courtroom',
            events: {
                objection_sustained:  { label: 'Objection Sustained',  significant: true },
                objection_overruled:  { label: 'Objection Overruled',  significant: true },
                objection_raised:     { label: 'Objection Raised',     significant: true },
                exhibit_introduced:   { label: 'Exhibit Introduced',   significant: true },
                witness_sworn_in:     { label: 'Witness Sworn In',     significant: true },
                recess_called:        { label: 'Recess Called',        significant: true },
                sidebar:              { label: 'Sidebar',              significant: true },
                verdict_delivered:    { label: 'Verdict Delivered',    significant: true },
                ruling_delivered:     { label: 'Ruling Delivered',     significant: true },
                attorney_speaking:    { label: 'Attorney Speaking',    significant: false },
                judge_speaking:       { label: 'Judge Speaking',       significant: false },
                witness_speaking:     { label: 'Witness Speaking',     significant: false }
            },
            prompt: `Analyze this courtroom camera frame. Identify the current proceedings activity.

Classify into exactly ONE event type from this list:
objection_sustained, objection_overruled, objection_raised, exhibit_introduced, witness_sworn_in, recess_called, sidebar, verdict_delivered, ruling_delivered, attorney_speaking, judge_speaking, witness_speaking

Respond with ONLY valid JSON (no markdown, no backticks):
{"eventType":"<type>","description":"<one neutral sentence describing what is happening>","confidence":<0.0-1.0>,"speakerRole":"<judge|attorney|witness|clerk|null>","additionalContext":"<brief extra detail or null>"}`,
            compliance: {
                title: 'Courtroom Recording Compliance',
                intro: 'Camera use in courtrooms is governed by state and local rules.',
                items: [
                    'Obtain written permission from the presiding judge',
                    'Do not record jurors or spectators',
                    'AI logs are supplementary, not official court record',
                    'Stop recording immediately if ordered by the court'
                ]
            }
        },
        council: {
            name: 'City Council',
            icon: '\uD83C\uDFDB\uFE0F',
            themeClass: 'space-council',
            events: {
                motion_proposed:          { label: 'Motion Proposed',         significant: true },
                motion_seconded:          { label: 'Motion Seconded',         significant: true },
                vote_in_progress:         { label: 'Vote in Progress',        significant: true },
                vote_passed:              { label: 'Vote Passed',             significant: true },
                vote_failed:              { label: 'Vote Failed',             significant: true },
                public_comment:           { label: 'Public Comment',          significant: true },
                agenda_item:              { label: 'Agenda Item',             significant: true },
                recess:                   { label: 'Recess',                  significant: true },
                council_member_speaking:  { label: 'Council Member Speaking', significant: false },
                mayor_speaking:           { label: 'Mayor/Chair Speaking',    significant: false },
                staff_presenting:         { label: 'Staff Presenting',        significant: false },
                citizen_speaking:         { label: 'Citizen Speaking',         significant: false }
            },
            prompt: `Analyze this city council / government meeting camera frame. Identify the current activity.

Classify into exactly ONE event type from this list:
motion_proposed, motion_seconded, vote_in_progress, vote_passed, vote_failed, public_comment, agenda_item, recess, council_member_speaking, mayor_speaking, staff_presenting, citizen_speaking

Respond with ONLY valid JSON (no markdown, no backticks):
{"eventType":"<type>","description":"<one neutral sentence>","confidence":<0.0-1.0>,"speakerRole":"<mayor|council_member|staff|citizen|null>","additionalContext":"<brief detail or null>"}`,
            compliance: {
                title: 'City Council Recording Compliance',
                intro: 'Public meetings are subject to Open Meetings Act requirements.',
                items: [
                    'Verify compliance with your state\'s Open Meetings Act',
                    'Post public notice that AI logging is in use',
                    'Make AI-generated logs available per FOIA/public records requests',
                    'AI logs do not replace official meeting minutes'
                ]
            }
        },
        classroom: {
            name: 'Classroom',
            icon: '\uD83D\uDCDA',
            themeClass: 'space-classroom',
            events: {
                lecture:                { label: 'Lecture/Instruction',   significant: false },
                question_asked:         { label: 'Question Asked',       significant: true },
                question_answered:      { label: 'Question Answered',    significant: true },
                student_presentation:   { label: 'Student Presentation', significant: true },
                group_work:             { label: 'Group Work/Discussion',significant: true },
                demonstration:          { label: 'Demonstration',        significant: true },
                exam_quiz:              { label: 'Exam/Quiz',            significant: true },
                break_time:             { label: 'Break',                significant: true },
                teacher_speaking:       { label: 'Teacher Speaking',     significant: false },
                student_speaking:       { label: 'Student Speaking',     significant: false },
                media_playing:          { label: 'Media/Video Playing',  significant: false }
            },
            prompt: `Analyze this classroom camera frame. Identify the current educational activity.

Classify into exactly ONE event type from this list:
lecture, question_asked, question_answered, student_presentation, group_work, demonstration, exam_quiz, break_time, teacher_speaking, student_speaking, media_playing

Respond with ONLY valid JSON (no markdown, no backticks):
{"eventType":"<type>","description":"<one neutral sentence>","confidence":<0.0-1.0>,"speakerRole":"<teacher|student|presenter|null>","additionalContext":"<brief detail or null>"}`,
            compliance: {
                title: 'Classroom Recording Compliance',
                intro: 'Classroom recordings involving students are subject to privacy regulations.',
                items: [
                    'Ensure FERPA compliance for any student recordings',
                    'Obtain written consent from students/parents as required',
                    'Educational records protections must be observed',
                    'AI logs do not replace official academic records'
                ]
            }
        },
        sports: {
            name: 'Sports Arena',
            icon: '\uD83C\uDFC5',
            themeClass: 'space-sports',
            events: {
                play_in_progress:   { label: 'Play in Progress',          significant: false },
                score:              { label: 'Score/Goal',                significant: true },
                foul:               { label: 'Foul/Penalty',             significant: true },
                timeout:            { label: 'Timeout',                   significant: true },
                substitution:       { label: 'Substitution',              significant: true },
                injury:             { label: 'Injury Stoppage',           significant: true },
                review:             { label: 'Official Review/Challenge', significant: true },
                halftime:           { label: 'Halftime/Intermission',     significant: true },
                period_start:       { label: 'Period Start',              significant: true },
                period_end:         { label: 'Period End',                significant: true },
                celebration:        { label: 'Celebration',               significant: false },
                crowd_reaction:     { label: 'Crowd Reaction',            significant: false }
            },
            prompt: `Analyze this sports arena / game camera frame. Identify the current game activity.

Classify into exactly ONE event type from this list:
play_in_progress, score, foul, timeout, substitution, injury, review, halftime, period_start, period_end, celebration, crowd_reaction

Respond with ONLY valid JSON (no markdown, no backticks):
{"eventType":"<type>","description":"<one neutral sentence>","confidence":<0.0-1.0>,"speakerRole":"<referee|player|coach|announcer|null>","additionalContext":"<brief detail or null>"}`,
            compliance: {
                title: 'Sports Venue Recording Compliance',
                intro: 'Recording at sports venues may be subject to venue policies and broadcast rights.',
                items: [
                    'Verify venue recording policy before use',
                    'For youth sports, obtain parental consent as required',
                    'Be aware of broadcast rights restrictions',
                    'AI logs do not replace official game statistics'
                ]
            }
        }
    };

    // ══════════════════════════════════════════════════
    //  SHARED MODULE INIT
    // ══════════════════════════════════════════════════

    window.reasoningConsole = new ReasoningConsole({ startCollapsed: false, maxEntries: 200 });

    window.apiKeyManager = new APIKeyManager({
        requireMoondream: true,
        requireOpenAI: false,
        onKeysChanged: (keys) => {
            if (keys.moondream) {
                client = new MoondreamClient(keys.moondream);
                window.reasoningConsole.logInfo('Moondream API key configured');
                updateStatus('Ready - Create a new session to begin');
            }
        }
    });

    // Initialize VLM Toggle
    window.vlmToggle = new VLMToggle({
        containerSelector: '.app-header h1',
        toolId: 'public-spaces-logging',
        onChange: (engine) => {
            window.reasoningConsole.logInfo('Switched to ' + engine + ' VLM');
        }
    });
    window.vlmToggle.autoSetupGlobalClient();

    if (window.apiKeyManager.hasMoondreamKey()) {
        client = new MoondreamClient(window.apiKeyManager.getMoondreamKey());
        window.reasoningConsole.logInfo('Loaded saved Moondream API key');
    }

    window.reasoningConsole.logInfo('Public Spaces Logger initialized');

    // ══════════════════════════════════════════════════
    //  CAMERA
    // ══════════════════════════════════════════════════

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
            if (currentStream) currentStream.getTracks().forEach(t => t.stop());
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
            updateStatus('Camera ready');
            window.reasoningConsole.logInfo('Camera initialized successfully');
        } catch (error) {
            updateStatus('Camera error: ' + error.message, true);
            window.reasoningConsole.logError('Camera access failed: ' + error.message);
        }
    }

    function captureFrame(quality = 0.8) {
        const c = document.createElement('canvas');
        c.width = video.videoWidth || 640;
        c.height = video.videoHeight || 480;
        c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', quality);
    }

    function captureThumbnail() {
        const c = document.createElement('canvas');
        c.width = 160; c.height = 90;
        c.getContext('2d').drawImage(video, 0, 0, 160, 90);
        return c.toDataURL('image/jpeg', 0.7);
    }

    // ══════════════════════════════════════════════════
    //  EVENT CLASSIFICATION
    // ══════════════════════════════════════════════════

    async function classifyEvent(imageDataUrl) {
        if (!client) {
            window.reasoningConsole.logError('No API key configured');
            updateStatus('Please configure your Moondream API key', true);
            window.apiKeyManager.showModal();
            return null;
        }

        const space = SPACES[selectedSpace];
        const startTime = Date.now();

        try {
            window.reasoningConsole.logApiCall('/query', 0);
            const result = await getVLMClient().ask(imageDataUrl, space.prompt);
            const latency = Date.now() - startTime;
            VLMResultBadge.showCurrent(latency);
            window.reasoningConsole.logApiCall('/query', latency);

            const parsed = parseEventResponse(result.answer);
            if (parsed) {
                const evDef = space.events[parsed.eventType];
                const label = evDef ? evDef.label : parsed.eventType;
                window.reasoningConsole.logDecision(
                    `Event: ${label} (${Math.round(parsed.confidence * 100)}%)`,
                    `${parsed.description} [${latency}ms]`
                );
            }
            return parsed;
        } catch (error) {
            const latency = Date.now() - startTime;
            window.reasoningConsole.logError(`Classification failed (${latency}ms): ${error.message}`);
            updateStatus('Classification error: ' + error.message, true);
            return null;
        }
    }

    function parseEventResponse(text) {
        try {
            let jsonStr = text;
            const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (fenceMatch) jsonStr = fenceMatch[1];
            const braceStart = jsonStr.indexOf('{');
            const braceEnd = jsonStr.lastIndexOf('}');
            if (braceStart !== -1 && braceEnd !== -1) jsonStr = jsonStr.substring(braceStart, braceEnd + 1);

            const parsed = JSON.parse(jsonStr);

            // Validate event type exists for selected space
            const space = SPACES[selectedSpace];
            let eventType = parsed.eventType || '';
            if (!space.events[eventType]) {
                // Try to fuzzy-match
                const types = Object.keys(space.events);
                const lower = eventType.toLowerCase();
                const match = types.find(t => t === lower || t.replace(/_/g, '') === lower.replace(/_/g, ''));
                eventType = match || types[0];
            }

            let confidence = parseFloat(parsed.confidence);
            if (isNaN(confidence) || confidence < 0) confidence = 0;
            if (confidence > 1) confidence = 1;

            return {
                eventType: eventType,
                description: parsed.description || 'Event detected',
                confidence: confidence,
                speakerRole: parsed.speakerRole || null,
                additionalContext: parsed.additionalContext || null
            };
        } catch (e) {
            window.reasoningConsole.logError('Failed to parse event response: ' + e.message);
            window.reasoningConsole.logInfo('Raw: ' + text.substring(0, 200));
            return null;
        }
    }

    // ══════════════════════════════════════════════════
    //  DEDUPLICATION
    // ══════════════════════════════════════════════════

    function isSignificant(eventType) {
        const space = SPACES[selectedSpace];
        const evDef = space.events[eventType];
        return evDef ? evDef.significant : false;
    }

    function shouldLogEvent(eventType) {
        if (!session) return true;
        if (isSignificant(eventType)) return true;

        const dedupMs = parseInt(dedupInput.value, 10) * 1000 || 30000;
        const now = Date.now();
        const recent = session.entries.find(e =>
            e.eventType === eventType && (now - e.timestamp) < dedupMs
        );
        return !recent;
    }

    // ══════════════════════════════════════════════════
    //  SESSION MANAGEMENT
    // ══════════════════════════════════════════════════

    function createSession(spaceType, label, location, date) {
        return {
            id: 'session_' + Date.now(),
            spaceType: spaceType,
            label: label || `${SPACES[spaceType].name} Session`,
            location: location || '',
            date: date || new Date().toISOString().split('T')[0],
            startTime: Date.now(),
            endTime: null,
            entries: [],
            totalFramesAnalyzed: 0
        };
    }

    function buildEntry(event, frameUrl, thumbnailUrl) {
        const elapsed = session ? Date.now() - session.startTime : 0;
        return {
            timestamp: Date.now(),
            elapsed: elapsed,
            elapsedFormatted: formatDuration(Math.floor(elapsed / 1000)),
            eventType: event.eventType,
            description: event.description,
            confidence: event.confidence,
            speakerRole: event.speakerRole,
            additionalContext: event.additionalContext,
            significant: isSignificant(event.eventType),
            frameUrl: captureFramesToggle.checked ? frameUrl : null,
            thumbnailUrl: captureFramesToggle.checked ? thumbnailUrl : null
        };
    }

    // ══════════════════════════════════════════════════
    //  ANALYSIS LOOP
    // ══════════════════════════════════════════════════

    async function analysisLoop() {
        if (!sessionActive) return;

        let imageDataUrl;
        if (mode === 'upload' && uploadedImages.length > 0) {
            imageDataUrl = uploadedImages[uploadIndex % uploadedImages.length];
            uploadIndex++;
            window.reasoningConsole.logInfo(`Analyzing uploaded image ${uploadIndex}/${uploadedImages.length}`);
        } else {
            imageDataUrl = captureFrame();
        }

        const thumbnailUrl = mode === 'upload' ? imageDataUrl : captureThumbnail();
        totalFramesAnalyzed++;
        if (session) session.totalFramesAnalyzed = totalFramesAnalyzed;

        const event = await classifyEvent(imageDataUrl);

        if (event && session) {
            if (shouldLogEvent(event.eventType)) {
                const entry = buildEntry(event, imageDataUrl, thumbnailUrl);
                session.entries.push(entry);
                updateEventLog();
                updateCurrentEvent(event);
                updateSessionStats();
                updateEventBreakdown();
                saveSession();

                const evDef = SPACES[selectedSpace].events[event.eventType];
                const label = evDef ? evDef.label : event.eventType;
                window.reasoningConsole.logAction(
                    entry.significant ? 'Significant event' : 'Event logged',
                    `${label} (${Math.round(event.confidence * 100)}%)`
                );

                updateStatus(`Logging (${SPACES[selectedSpace].name}) - Last: ${label}`);
            } else {
                window.reasoningConsole.logInfo(`Dedup: skipped ${event.eventType} (logged within ${dedupInput.value}s)`);
                updateCurrentEvent(event);
            }
        }

        updateSessionStats();

        if (sessionActive) {
            const intervalMs = parseInt(intervalSelect.value, 10) || 5000;
            analysisTimeout = setTimeout(analysisLoop, intervalMs);
        }
    }

    function startSession() {
        if (!session) return;
        sessionActive = true;
        totalFramesAnalyzed = 0;
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        endSessionBtn.classList.remove('hidden');
        newSessionBtn.classList.add('hidden');

        sessionBar.style.display = '';
        sessionBadge.textContent = 'RECORDING';
        sessionBadge.className = 'session-badge badge-active';
        sessionLabelDisplay.textContent = session.label;
        sessionMetaDisplay.textContent = `${session.location} | ${session.date}`;

        durationInterval = setInterval(updateSessionStats, 1000);

        window.reasoningConsole.logInfo(`Session started: "${session.label}" (${SPACES[session.spaceType].name})`);
        updateStatus(`Recording (${SPACES[session.spaceType].name})...`);

        analysisLoop();
    }

    function pauseSession() {
        sessionActive = false;
        clearTimeout(analysisTimeout);
        startBtn.classList.remove('hidden');
        startBtn.textContent = 'Resume';
        stopBtn.classList.add('hidden');
        clearInterval(durationInterval);
        sessionBadge.textContent = 'PAUSED';
        sessionBadge.className = 'session-badge badge-ended';
        updateStatus('Session paused');
        window.reasoningConsole.logInfo('Session paused');
    }

    function resumeSession() {
        sessionActive = true;
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        sessionBadge.textContent = 'RECORDING';
        sessionBadge.className = 'session-badge badge-active';
        durationInterval = setInterval(updateSessionStats, 1000);
        updateStatus(`Recording (${SPACES[session.spaceType].name})...`);
        window.reasoningConsole.logInfo('Session resumed');
        analysisLoop();
    }

    function endSession() {
        sessionActive = false;
        clearTimeout(analysisTimeout);
        clearInterval(durationInterval);

        if (session) {
            session.endTime = Date.now();
            saveSession();
            window.reasoningConsole.logInfo(`Session ended: ${session.entries.length} events logged, ${totalFramesAnalyzed} frames analyzed`);
        }

        sessionBadge.textContent = 'ENDED';
        sessionBadge.className = 'session-badge badge-ended';
        startBtn.classList.add('hidden');
        stopBtn.classList.add('hidden');
        endSessionBtn.classList.add('hidden');
        newSessionBtn.classList.remove('hidden');
        newSessionBtn.textContent = 'New Session';

        updateStatus('Session ended');
    }

    // ══════════════════════════════════════════════════
    //  UI UPDATES
    // ══════════════════════════════════════════════════

    function updateStatus(message, isError = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }

    function updateCurrentEvent(event) {
        const space = SPACES[selectedSpace];
        const evDef = space.events[event.eventType];
        const label = evDef ? evDef.label : event.eventType;
        const sig = evDef && evDef.significant;

        currentEventType.textContent = (sig ? '\u2713 ' : '') + label;
        currentEventDesc.textContent = event.description;

        const pct = Math.round(event.confidence * 100);
        confidenceBar.style.width = pct + '%';
        confidenceBar.style.background = pct >= 80 ? '#2A9D8F' : pct >= 50 ? '#E9C46A' : '#E63946';
        confidencePct.textContent = pct + '%';

        // Draw event overlay on canvas
        drawEventOverlay(label);
    }

    function drawEventOverlay(label) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        if (!label) return;

        const fontSize = 16;
        overlayCtx.font = `bold ${fontSize}px sans-serif`;
        const metrics = overlayCtx.measureText(label);
        const padding = 8;
        const boxW = metrics.width + padding * 2;
        const boxH = fontSize + padding * 2;
        const x = overlayCanvas.width - boxW - 10;
        const y = overlayCanvas.height - boxH - 10;

        overlayCtx.fillStyle = 'rgba(0,0,0,0.65)';
        overlayCtx.beginPath();
        overlayCtx.roundRect(x, y, boxW, boxH, 6);
        overlayCtx.fill();

        overlayCtx.fillStyle = '#fff';
        overlayCtx.fillText(label, x + padding, y + padding + fontSize - 2);
    }

    function updateEventLog() {
        if (!session || session.entries.length === 0) {
            eventLogDiv.innerHTML = '<div class="log-empty">Events will appear here once a session starts</div>';
            return;
        }

        const showSigOnly = sigOnlyToggle.checked;
        const entries = session.entries.slice().reverse();
        const filtered = showSigOnly ? entries.filter(e => e.significant) : entries;

        if (filtered.length === 0) {
            eventLogDiv.innerHTML = '<div class="log-empty">No significant events yet</div>';
            return;
        }

        const space = SPACES[selectedSpace];

        eventLogDiv.innerHTML = filtered.map((entry, i) => {
            const evDef = space.events[entry.eventType];
            const label = evDef ? evDef.label : entry.eventType;
            const pct = Math.round(entry.confidence * 100);
            const isNew = i === 0;
            const thumbHtml = entry.thumbnailUrl
                ? `<img class="log-thumb" src="${entry.thumbnailUrl}" alt="Frame">`
                : '';

            return `
                <div class="log-entry ${entry.significant ? 'significant' : ''} ${isNew ? 'new-entry' : ''}"
                     data-idx="${session.entries.length - 1 - (showSigOnly ? session.entries.indexOf(session.entries.slice().reverse().filter(e => e.significant)[i]) : i)}">
                    <span class="log-elapsed">${entry.elapsedFormatted}</span>
                    ${thumbHtml}
                    <div class="log-body">
                        <div class="log-event-type">
                            ${entry.significant ? '<span class="sig-marker">\u2713</span>' : ''}${label}
                        </div>
                        <div class="log-description">${entry.description}</div>
                    </div>
                    <span class="log-confidence">${pct}%</span>
                </div>
            `;
        }).join('');

        // Click handlers for detail view
        eventLogDiv.querySelectorAll('.log-entry').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.idx, 10);
                if (!isNaN(idx) && session.entries[idx]) {
                    showEntryDetail(session.entries[idx]);
                }
            });
        });

        if (autoScrollToggle.checked) {
            eventLogDiv.scrollTop = 0; // newest on top
        }
    }

    function showEntryDetail(entry) {
        const space = SPACES[selectedSpace];
        const evDef = space.events[entry.eventType];
        const label = evDef ? evDef.label : entry.eventType;

        if (entry.frameUrl || entry.thumbnailUrl) {
            detailImage.src = entry.frameUrl || entry.thumbnailUrl;
            detailImage.style.display = '';
        } else {
            detailImage.style.display = 'none';
        }

        detailEventType.textContent = (entry.significant ? '\u2713 ' : '') + label;
        detailDesc.textContent = entry.description;
        detailMeta.innerHTML = `
            <strong>Elapsed:</strong> ${entry.elapsedFormatted} |
            <strong>Confidence:</strong> ${Math.round(entry.confidence * 100)}% |
            <strong>Speaker:</strong> ${entry.speakerRole || 'N/A'}<br>
            ${entry.additionalContext ? `<strong>Context:</strong> ${entry.additionalContext}` : ''}
        `;
        detailOverlay.classList.add('active');
    }

    function updateSessionStats() {
        if (!session) return;
        const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
        statDuration.textContent = formatDuration(elapsed);
        statFrames.textContent = totalFramesAnalyzed;
        statEvents.textContent = session.entries.length;
        statSignificant.textContent = session.entries.filter(e => e.significant).length;
    }

    function updateEventBreakdown() {
        if (!session || session.entries.length === 0) {
            eventBreakdown.innerHTML = '<div style="font-size:0.78rem;color:var(--text-muted);padding:8px;">No events yet</div>';
            return;
        }

        const space = SPACES[selectedSpace];
        const counts = {};
        session.entries.forEach(e => {
            counts[e.eventType] = (counts[e.eventType] || 0) + 1;
        });

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        eventBreakdown.innerHTML = sorted.map(([type, count]) => {
            const evDef = space.events[type];
            const label = evDef ? evDef.label : type;
            return `<div class="event-breakdown-row">
                <span class="etype">${label}</span>
                <span class="ecount">${count}</span>
            </div>`;
        }).join('');
    }

    function formatDuration(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function applySpaceTheme(spaceId) {
        document.body.classList.remove('space-courtroom', 'space-council', 'space-classroom', 'space-sports');
        document.body.classList.add(SPACES[spaceId].themeClass);

        // Update sidebar space tabs
        spaceTabs.querySelectorAll('.space-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.space === spaceId);
        });
    }

    // ══════════════════════════════════════════════════
    //  COMPLIANCE
    // ══════════════════════════════════════════════════

    function shouldShowCompliance(spaceId) {
        try {
            const dismissed = JSON.parse(localStorage.getItem('vrp_psl_compliance_dismissed') || '{}');
            return !dismissed[spaceId];
        } catch { return true; }
    }

    function dismissCompliance(spaceId) {
        try {
            const dismissed = JSON.parse(localStorage.getItem('vrp_psl_compliance_dismissed') || '{}');
            dismissed[spaceId] = true;
            localStorage.setItem('vrp_psl_compliance_dismissed', JSON.stringify(dismissed));
        } catch { /* ignore */ }
    }

    function showComplianceModal(spaceId, callback) {
        const space = SPACES[spaceId];
        complianceTitle.textContent = space.compliance.title;
        complianceIntro.textContent = space.compliance.intro;
        complianceList.innerHTML = space.compliance.items.map(item =>
            `<li><input type="checkbox"><span>${item}</span></li>`
        ).join('');
        complianceDontShow.checked = false;
        complianceCallback = callback;
        complianceModal.classList.add('active');
    }

    // ══════════════════════════════════════════════════
    //  PERSISTENCE
    // ══════════════════════════════════════════════════

    function saveSession() {
        if (!session) return;
        try {
            // Save without full frame URLs to avoid localStorage limits
            const toSave = {
                ...session,
                entries: session.entries.map(e => ({
                    ...e,
                    frameUrl: null // too large for localStorage
                }))
            };
            localStorage.setItem('vrp_psl_current_session', JSON.stringify(toSave));
        } catch (e) { /* localStorage full */ }
    }

    function loadSession() {
        try {
            const saved = localStorage.getItem('vrp_psl_current_session');
            if (saved) {
                const s = JSON.parse(saved);
                // Only load if session isn't ended
                if (s && !s.endTime) {
                    session = s;
                    selectedSpace = s.spaceType;
                    applySpaceTheme(selectedSpace);
                    updateEventLog();
                    updateSessionStats();
                    updateEventBreakdown();

                    sessionBar.style.display = '';
                    sessionBadge.textContent = 'PAUSED';
                    sessionBadge.className = 'session-badge badge-ended';
                    sessionLabelDisplay.textContent = session.label;
                    sessionMetaDisplay.textContent = `${session.location} | ${session.date}`;

                    startBtn.classList.remove('hidden');
                    startBtn.textContent = 'Resume';
                    endSessionBtn.classList.remove('hidden');
                    newSessionBtn.classList.add('hidden');

                    window.reasoningConsole.logInfo(`Restored session: "${session.label}" (${session.entries.length} entries)`);
                    updateStatus('Session restored - Click Resume to continue');
                }
            }
        } catch (e) { /* ignore */ }
    }

    function saveSettings() {
        try {
            localStorage.setItem('vrp_psl_settings', JSON.stringify({
                interval: intervalSelect.value,
                captureFrames: captureFramesToggle.checked,
                autoScroll: autoScrollToggle.checked,
                dedupWindow: dedupInput.value
            }));
        } catch { /* ignore */ }
    }

    function loadSettings() {
        try {
            const saved = localStorage.getItem('vrp_psl_settings');
            if (saved) {
                const s = JSON.parse(saved);
                if (s.interval) intervalSelect.value = s.interval;
                if (s.captureFrames !== undefined) captureFramesToggle.checked = s.captureFrames;
                if (s.autoScroll !== undefined) autoScrollToggle.checked = s.autoScroll;
                if (s.dedupWindow) dedupInput.value = s.dedupWindow;
            }
        } catch { /* ignore */ }
    }

    // ══════════════════════════════════════════════════
    //  EXPORT
    // ══════════════════════════════════════════════════

    function exportJSON() {
        if (!session) return;

        const eventCounts = {};
        session.entries.forEach(e => {
            eventCounts[e.eventType] = (eventCounts[e.eventType] || 0) + 1;
        });

        const data = {
            session: {
                id: session.id,
                spaceType: session.spaceType,
                label: session.label,
                location: session.location,
                date: session.date,
                startTime: session.startTime,
                endTime: session.endTime,
                totalFramesAnalyzed: session.totalFramesAnalyzed
            },
            entries: session.entries.map(e => ({
                timestamp: new Date(e.timestamp).toISOString(),
                elapsed: e.elapsedFormatted,
                eventType: e.eventType,
                description: e.description,
                confidence: e.confidence,
                speakerRole: e.speakerRole,
                additionalContext: e.additionalContext,
                significant: e.significant
            })),
            eventCounts: eventCounts,
            exportedAt: new Date().toISOString()
        };

        downloadFile(JSON.stringify(data, null, 2), `${session.id}.json`, 'application/json');
        window.reasoningConsole.logAction('Export', `Exported ${session.entries.length} entries as JSON`);
    }

    function exportCSV() {
        if (!session) return;

        const headers = ['timestamp', 'elapsed', 'eventType', 'description', 'confidence', 'speakerRole', 'significant'];
        const rows = session.entries.map(e =>
            headers.map(h => {
                let val = h === 'timestamp' ? new Date(e[h]).toISOString() : e[h];
                if (val === null || val === undefined) val = '';
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(',')
        );
        const csv = headers.join(',') + '\n' + rows.join('\n');
        downloadFile(csv, `${session.id}.csv`, 'text/csv');
        window.reasoningConsole.logAction('Export', `Exported ${session.entries.length} entries as CSV`);
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

    // ══════════════════════════════════════════════════
    //  MODE SWITCHING & UPLOAD
    // ══════════════════════════════════════════════════

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

    function handleFiles(files) {
        uploadedImages = [];
        uploadIndex = 0;
        const promises = Array.from(files).map(file => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (e) => { uploadedImages.push(e.target.result); resolve(); };
            reader.readAsDataURL(file);
        }));
        Promise.all(promises).then(() => {
            window.reasoningConsole.logInfo(`Loaded ${uploadedImages.length} image(s) for analysis`);
            updateStatus(`${uploadedImages.length} image(s) loaded`);
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

    // ══════════════════════════════════════════════════
    //  EVENT LISTENERS
    // ══════════════════════════════════════════════════

    // Mode toggle
    modeCameraBtn.addEventListener('click', () => switchMode('camera'));
    modeUploadBtn.addEventListener('click', () => switchMode('upload'));

    // Camera
    cameraSelect.addEventListener('change', () => { if (cameraSelect.value) startCamera(cameraSelect.value); });
    refreshCamerasBtn.addEventListener('click', enumerateCameras);

    // Upload
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFiles(e.target.files); });
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    });

    // Space tabs (sidebar -- only active when no session running)
    spaceTabs.querySelectorAll('.space-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            if (sessionActive) return; // don't switch mid-session
            selectedSpace = tab.dataset.space;
            applySpaceTheme(selectedSpace);
            window.reasoningConsole.logInfo(`Space type changed to: ${SPACES[selectedSpace].name}`);
        });
    });

    // New session flow
    newSessionBtn.addEventListener('click', () => {
        sessionDateInput.value = new Date().toISOString().split('T')[0];
        sessionLabelInput.value = '';
        sessionLocationInput.value = '';
        // Sync modal space tabs with current selection
        modalSelectedSpace = selectedSpace;
        modalSpaceTabs.querySelectorAll('.space-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.space === modalSelectedSpace);
        });
        newSessionModal.classList.add('active');
    });

    modalSpaceTabs.querySelectorAll('.space-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            modalSelectedSpace = tab.dataset.space;
            modalSpaceTabs.querySelectorAll('.space-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.space === modalSelectedSpace);
            });
        });
    });

    cancelSessionBtn.addEventListener('click', () => newSessionModal.classList.remove('active'));
    newSessionModal.addEventListener('click', (e) => { if (e.target === newSessionModal) newSessionModal.classList.remove('active'); });

    createSessionBtn.addEventListener('click', () => {
        const spaceId = modalSelectedSpace;
        const label = sessionLabelInput.value.trim();
        const location = sessionLocationInput.value.trim();
        const date = sessionDateInput.value;

        newSessionModal.classList.remove('active');

        // Check compliance
        if (shouldShowCompliance(spaceId)) {
            showComplianceModal(spaceId, () => {
                finalizeCreateSession(spaceId, label, location, date);
            });
        } else {
            finalizeCreateSession(spaceId, label, location, date);
        }
    });

    function finalizeCreateSession(spaceId, label, location, date) {
        selectedSpace = spaceId;
        applySpaceTheme(spaceId);

        session = createSession(spaceId, label, location, date);
        totalFramesAnalyzed = 0;
        updateEventLog();
        updateSessionStats();
        updateEventBreakdown();
        currentEventType.textContent = 'Waiting...';
        currentEventDesc.textContent = 'Click Start to begin classification';
        confidenceBar.style.width = '0%';
        confidencePct.textContent = '--%';

        startBtn.classList.remove('hidden');
        startBtn.textContent = 'Start';
        newSessionBtn.classList.add('hidden');
        endSessionBtn.classList.remove('hidden');

        sessionBar.style.display = '';
        sessionBadge.textContent = 'READY';
        sessionBadge.className = 'session-badge badge-ended';
        sessionLabelDisplay.textContent = session.label;
        sessionMetaDisplay.textContent = `${session.location} | ${session.date}`;

        window.reasoningConsole.logInfo(`Session created: "${session.label}" (${SPACES[spaceId].name})`);
        updateStatus('Session ready - Click Start to begin recording');
    }

    // Compliance modal
    complianceAckBtn.addEventListener('click', () => {
        if (complianceDontShow.checked) {
            dismissCompliance(modalSelectedSpace);
        }
        complianceModal.classList.remove('active');
        if (complianceCallback) {
            complianceCallback();
            complianceCallback = null;
        }
    });
    complianceModal.addEventListener('click', (e) => {
        // Don't allow clicking outside to dismiss compliance -- must acknowledge
    });

    // Start / Stop / End
    startBtn.addEventListener('click', () => {
        if (!client) {
            updateStatus('Please configure API key', true);
            window.apiKeyManager.showModal();
            return;
        }
        if (session && session.entries.length > 0 && !sessionActive) {
            resumeSession();
        } else {
            startSession();
        }
    });

    stopBtn.addEventListener('click', pauseSession);
    endSessionBtn.addEventListener('click', () => {
        if (confirm('End this session? You can export the log before ending.')) {
            endSession();
        }
    });

    // Significant only filter
    sigOnlyToggle.addEventListener('change', updateEventLog);

    // Settings persistence
    intervalSelect.addEventListener('change', saveSettings);
    captureFramesToggle.addEventListener('change', saveSettings);
    autoScrollToggle.addEventListener('change', saveSettings);
    dedupInput.addEventListener('change', saveSettings);

    // Export
    exportJsonBtn.addEventListener('click', exportJSON);
    exportCsvBtn.addEventListener('click', exportCSV);

    // Detail overlay
    detailCloseBtn.addEventListener('click', () => detailOverlay.classList.remove('active'));
    detailOverlay.addEventListener('click', (e) => { if (e.target === detailOverlay) detailOverlay.classList.remove('active'); });

    // ══════════════════════════════════════════════════
    //  INITIALIZATION
    // ══════════════════════════════════════════════════

    loadSettings();
    loadSession();
    applySpaceTheme(selectedSpace);

    if (window.VideoSourceAdapter) {
        VideoSourceAdapter.init({
            videoElement: video,
            toolId: 'public-spaces-logging',
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
