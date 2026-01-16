document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const analysisRateInput = document.getElementById('analysisRate');
    const confidenceThresholdInput = document.getElementById('confidenceThreshold');
    const rateValue = document.getElementById('rateValue');
    const thresholdValue = document.getElementById('thresholdValue');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const statusBar = document.getElementById('status');

    const videoIndicator = document.getElementById('videoIndicator');
    const audioIndicator = document.getElementById('audioIndicator');
    const sceneDescription = document.getElementById('sceneDescription');
    const audioBars = document.getElementById('audioBars');
    const currentTranscript = document.getElementById('currentTranscript');
    const transcriptHistory = document.getElementById('transcriptHistory');
    const whisperMode = document.getElementById('whisperMode');
    const whisperStatus = document.getElementById('whisperStatus');

    const videoConfidenceBar = document.getElementById('videoConfidenceBar');
    const audioConfidenceBar = document.getElementById('audioConfidenceBar');
    const fusedConfidenceBar = document.getElementById('fusedConfidenceBar');
    const videoConfidence = document.getElementById('videoConfidence');
    const audioConfidence = document.getElementById('audioConfidence');
    const fusedConfidence = document.getElementById('fusedConfidence');

    const decisionBox = document.getElementById('decisionBox');
    const decisionText = document.getElementById('decisionText');
    const actionLogList = document.getElementById('actionLogList');
    const actionsTriggeredSpan = document.getElementById('actionsTriggered');
    const fusionEventsSpan = document.getElementById('fusionEvents');

    let client = null;
    let isRunning = false;
    let analysisInterval = null;
    let recognition = null;
    let audioContext = null;
    let analyser = null;

    let state = {
        video: { scene: '', confidence: 0, people: false, peopleCount: 0, lastPeopleTime: 0 },
        audio: { transcript: '', confidence: 0, intent: null },
        fused: { confidence: 0, decision: '', triggered: false },
        stats: { actions: 0, fusions: 0 }
    };

    const actionRules = {
        meeting: { enabled: true },
        presentation: { enabled: true },
        lights: { enabled: true },
        record: { enabled: true },
        empty: { enabled: true }
    };

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

    function loadSettings() {
        const savedRate = localStorage.getItem('fusionAnalysisRate');
        if (savedRate) {
            analysisRateInput.value = savedRate;
            rateValue.textContent = savedRate + '/sec';
        }
        
        const savedThreshold = localStorage.getItem('fusionThreshold');
        if (savedThreshold) {
            confidenceThresholdInput.value = savedThreshold;
            thresholdValue.textContent = savedThreshold + '%';
        }
    }

    function saveSettings() {
        localStorage.setItem('fusionAnalysisRate', analysisRateInput.value);
        localStorage.setItem('fusionThreshold', confidenceThresholdInput.value);
    }

    async function startCamera() {
        try {
            window.reasoningConsole.logInfo('Requesting camera and microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: true
            });
            video.srcObject = stream;
            setupAudioVisualizer(stream);
            updateStatus('Camera and microphone ready');
            window.reasoningConsole.logInfo('Media devices initialized');
            return true;
        } catch (error) {
            updateStatus('Media error: ' + error.message, true);
            window.reasoningConsole.logError('Media access failed: ' + error.message);
            return false;
        }
    }

    function setupAudioVisualizer(stream) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 64;
        
        audioBars.innerHTML = '';
        const barCount = 16;
        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'audio-bar';
            bar.style.height = '4px';
            audioBars.appendChild(bar);
        }
        
        updateAudioBars();
    }

    function updateAudioBars() {
        if (!analyser || !isRunning) return;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        const bars = audioBars.querySelectorAll('.audio-bar');
        bars.forEach((bar, i) => {
            const value = dataArray[i * 2] || 0;
            bar.style.height = Math.max(4, value / 4) + 'px';
        });
        
        requestAnimationFrame(updateAudioBars);
    }

    function setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            whisperMode.textContent = 'Not Available';
            whisperMode.className = 'mode';
            whisperStatus.textContent = 'Speech recognition not supported';
            window.reasoningConsole.logError('Speech recognition not supported in this browser');
            return false;
        }
        
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                const confidence = event.results[i][0].confidence;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                    state.audio.confidence = Math.round(confidence * 100);
                    processAudioIntent(transcript.trim().toLowerCase());
                    addToTranscriptHistory(transcript.trim());
                } else {
                    interimTranscript += transcript;
                }
            }
            
            currentTranscript.textContent = interimTranscript || finalTranscript || 'Listening...';
            audioIndicator.classList.add('active');
            updateConfidenceDisplay();
        };
        
        recognition.onerror = (event) => {
            if (event.error !== 'no-speech') {
                whisperStatus.textContent = 'Error: ' + event.error;
                window.reasoningConsole.logError('Speech recognition error: ' + event.error);
            }
        };
        
        recognition.onend = () => {
            audioIndicator.classList.remove('active');
            if (isRunning) {
                recognition.start();
            }
        };
        
        window.reasoningConsole.logInfo('Speech recognition initialized');
        return true;
    }

    function processAudioIntent(transcript) {
        state.audio.transcript = transcript;
        
        const intents = [
            { keywords: ['start meeting', 'begin meeting', 'let\'s start'], intent: 'start_meeting', action: 'meeting' },
            { keywords: ['start presentation', 'begin presentation'], intent: 'start_presentation', action: 'presentation' },
            { keywords: ['lights on', 'turn on lights', 'turn on the lights'], intent: 'lights_on', action: 'lights' },
            { keywords: ['lights off', 'turn off lights', 'turn off the lights'], intent: 'lights_off', action: 'lights' },
            { keywords: ['dim lights', 'dim the lights'], intent: 'lights_dim', action: 'lights' },
            { keywords: ['start recording', 'begin recording'], intent: 'start_recording', action: 'record' },
            { keywords: ['stop recording', 'end recording'], intent: 'stop_recording', action: 'record' },
            { keywords: ['movie mode', 'movie time'], intent: 'movie_mode', action: 'lights' }
        ];
        
        for (const item of intents) {
            for (const keyword of item.keywords) {
                if (transcript.includes(keyword)) {
                    state.audio.intent = item;
                    logAction(`Audio intent detected: "${item.intent}"`, 'mic');
                    window.reasoningConsole.logDetection('voice command', 1, state.audio.confidence / 100);
                    performFusion();
                    return;
                }
            }
        }
        
        state.audio.intent = null;
    }

    function addToTranscriptHistory(text) {
        const history = transcriptHistory.textContent;
        const newHistory = text + (history ? ' | ' + history : '');
        transcriptHistory.textContent = newHistory.substring(0, 200);
    }

    async function analyzeVideo() {
        if (!isRunning || !window.apiKeyManager.hasMoondreamKey()) return;
        
        videoIndicator.classList.add('active');
        const startTime = Date.now();
        
        try {
            const frame = client.captureFrame(video);
            
            const [sceneResult, peopleResult] = await Promise.all([
                client.describe(frame, { maxTokens: 100 }),
                client.ask(frame, 'How many people are visible? Answer with just a number, or 0 if none.')
            ]);
            
            const latency = Date.now() - startTime;
            window.reasoningConsole.logApiCall('/describe + /ask', latency);
            
            state.video.scene = sceneResult.description;
            sceneDescription.textContent = sceneResult.description;
            
            const peopleCount = parseInt(peopleResult.answer) || 0;
            state.video.peopleCount = peopleCount;
            state.video.people = peopleCount > 0;
            
            if (state.video.people) {
                state.video.lastPeopleTime = Date.now();
                state.video.confidence = 85;
                window.reasoningConsole.logDetection('person', peopleCount, 0.85);
            } else {
                state.video.confidence = 70;
                checkEmptyRoom();
            }
            
            updateConfidenceDisplay();
            performFusion();
            
        } catch (error) {
            updateStatus('Video analysis error: ' + error.message, true);
            state.video.confidence = 0;
            window.reasoningConsole.logError('Video analysis failed: ' + error.message);
        } finally {
            videoIndicator.classList.remove('active');
        }
    }

    function checkEmptyRoom() {
        if (!actionRules.empty.enabled) return;
        
        const timeSincePeople = Date.now() - state.video.lastPeopleTime;
        if (timeSincePeople > 30000 && state.video.lastPeopleTime > 0) {
            triggerAction('Room appears empty', 'alert');
            state.video.lastPeopleTime = 0;
        }
    }

    function performFusion() {
        state.stats.fusions++;
        fusionEventsSpan.textContent = state.stats.fusions;
        
        const videoWeight = 0.4;
        const audioWeight = 0.6;
        
        let fusedScore = 0;
        let decision = '';
        
        if (state.audio.intent && state.video.people) {
            fusedScore = (state.video.confidence * videoWeight) + (state.audio.confidence * audioWeight);
            fusedScore = Math.min(100, fusedScore * 1.2);
            
            const intent = state.audio.intent.intent;
            
            if (intent === 'start_meeting' && actionRules.meeting.enabled) {
                decision = `Meeting mode: ${state.video.peopleCount} people detected + voice command`;
            } else if (intent === 'start_presentation' && actionRules.presentation.enabled) {
                decision = `Presentation mode: Speaker detected + voice command`;
            } else if (intent.includes('lights') && actionRules.lights.enabled) {
                decision = `Lighting adjustment: ${intent.replace('_', ' ')}`;
            } else if (intent.includes('recording') && actionRules.record.enabled) {
                decision = `Recording: ${intent.replace('_', ' ')}`;
            } else if (intent === 'movie_mode') {
                decision = 'Movie mode: Dimming lights, closing blinds';
            }
            
            window.reasoningConsole.logDecision('Multimodal fusion', `Video + Audio confidence: ${Math.round(fusedScore)}%`);
        } else if (state.audio.intent) {
            fusedScore = state.audio.confidence * 0.7;
            decision = `Audio only: "${state.audio.transcript}"`;
        } else if (state.video.people) {
            fusedScore = state.video.confidence * 0.5;
            decision = `Video only: ${state.video.peopleCount} person(s) in frame`;
        } else {
            fusedScore = Math.max(state.video.confidence, state.audio.confidence) * 0.3;
            decision = 'Monitoring...';
        }
        
        state.fused.confidence = Math.round(fusedScore);
        state.fused.decision = decision;
        
        updateDecisionDisplay(decision, fusedScore);
        
        const threshold = parseInt(confidenceThresholdInput.value);
        if (fusedScore >= threshold && decision && !decision.includes('Monitoring')) {
            triggerAction(decision, 'check');
            state.audio.intent = null;
        }
    }

    function updateConfidenceDisplay() {
        videoConfidenceBar.style.width = state.video.confidence + '%';
        videoConfidence.textContent = state.video.confidence + '%';
        
        audioConfidenceBar.style.width = state.audio.confidence + '%';
        audioConfidence.textContent = state.audio.confidence + '%';
        
        fusedConfidenceBar.style.width = state.fused.confidence + '%';
        fusedConfidence.textContent = state.fused.confidence + '%';
    }

    function updateDecisionDisplay(decision, confidence) {
        decisionText.textContent = decision;
        
        decisionBox.className = 'decision-box';
        if (confidence >= 70) {
            decisionBox.classList.add('high-confidence');
        } else if (confidence >= 40) {
            decisionBox.classList.add('medium-confidence');
        } else {
            decisionBox.classList.add('low-confidence');
        }
    }

    function triggerAction(description, icon = 'bolt') {
        state.stats.actions++;
        actionsTriggeredSpan.textContent = state.stats.actions;
        
        logAction(`ACTION TRIGGERED: ${description}`, icon, true);
        updateStatus(`Triggered: ${description}`);
        window.reasoningConsole.logAction('Action triggered', description);
    }

    function logAction(message, icon = 'info', isTriggered = false) {
        const time = new Date().toLocaleTimeString();
        const iconMap = {
            'info': 'i',
            'mic': 'M',
            'eye': 'E',
            'check': 'V',
            'bolt': 'A',
            'alert': '!'
        };
        
        const actionItem = document.createElement('div');
        actionItem.className = 'action-item' + (isTriggered ? ' triggered' : '');
        actionItem.innerHTML = `
            <span class="time">${time}</span>
            <span class="icon">${iconMap[icon] || icon}</span>
            <span>${message}</span>
        `;
        
        actionLogList.insertBefore(actionItem, actionLogList.firstChild);
        
        while (actionLogList.children.length > 20) {
            actionLogList.removeChild(actionLogList.lastChild);
        }
    }

    function updateStatus(message, isError = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }

    async function startFusion() {
        if (!window.apiKeyManager.hasMoondreamKey()) {
            updateStatus('Please configure your Moondream API key', true);
            window.apiKeyManager.showModal();
            return;
        }
        
        saveSettings();
        isRunning = true;
        
        startBtn.disabled = true;
        stopBtn.disabled = false;
        
        if (recognition) {
            recognition.start();
        }
        
        updateAudioBars();
        
        const rate = parseFloat(analysisRateInput.value);
        const intervalMs = 1000 / rate;
        
        analysisInterval = setInterval(analyzeVideo, intervalMs);
        analyzeVideo();
        
        logAction('Fusion system started', 'info');
        updateStatus('Fusion system running...');
        window.reasoningConsole.logInfo(`Fusion system started at ${rate}/sec`);
    }

    function stopFusion() {
        isRunning = false;
        
        startBtn.disabled = false;
        stopBtn.disabled = true;
        
        if (recognition) {
            recognition.stop();
        }
        
        if (analysisInterval) {
            clearInterval(analysisInterval);
            analysisInterval = null;
        }
        
        videoIndicator.classList.remove('active');
        audioIndicator.classList.remove('active');
        
        logAction('Fusion system stopped', 'info');
        updateStatus('System stopped');
        window.reasoningConsole.logInfo('Fusion system stopped');
    }

    document.querySelectorAll('.enabled-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            const rule = toggle.dataset.rule;
            actionRules[rule].enabled = toggle.classList.contains('active');
        });
    });

    analysisRateInput.addEventListener('input', () => {
        rateValue.textContent = analysisRateInput.value + '/sec';
    });
    
    confidenceThresholdInput.addEventListener('input', () => {
        thresholdValue.textContent = confidenceThresholdInput.value + '%';
    });

    startBtn.addEventListener('click', startFusion);
    stopBtn.addEventListener('click', stopFusion);

    loadSettings();
    setupSpeechRecognition();
    await startCamera();
});
