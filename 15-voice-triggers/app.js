class VoiceControl {
    constructor(options = {}) {
        this.onTranscript = options.onTranscript || (() => {});
        this.onRuleTriggered = options.onRuleTriggered || (() => {});
        this.onStatusUpdate = options.onStatusUpdate || (() => {});
        this.onModelLoading = options.onModelLoading || (() => {});
        this.onAudioLevel = options.onAudioLevel || (() => {});
        
        this.isRunning = false;
        this.isModelLoaded = false;
        this.isModelLoading = false;
        
        this.audioContext = null;
        this.mediaStream = null;
        this.analyser = null;
        this.processor = null;
        this.audioChunks = [];
        
        this.transcriber = null;
        this.modelId = options.modelId || 'onnx-community/whisper-tiny.en';
        
        this.chunkDuration = options.chunkDuration || 5000;
        this.sampleRate = 16000;
        this.processingInterval = null;
        
        this.rules = [];
        this.cooldown = options.cooldown || 5000;
        this.lastTriggerTime = 0;
        this.lastTriggeredRule = null;
        
        this.transcriptHistory = [];
        this.maxHistory = 50;
        
        this._loadRules();
    }

    setCooldown(ms) {
        this.cooldown = ms;
    }

    setChunkDuration(ms) {
        this.chunkDuration = Math.max(2000, Math.min(10000, ms));
    }

    async loadModel() {
        if (this.isModelLoaded || this.isModelLoading) return true;
        
        this.isModelLoading = true;
        this.onModelLoading({ status: 'loading', progress: 0 });
        this.onStatusUpdate('Loading Whisper model...');
        
        try {
            const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0');
            
            console.log('[VoiceControl] Loading Whisper model:', this.modelId);
            
            this.transcriber = await pipeline('automatic-speech-recognition', this.modelId, {
                dtype: 'fp32',
                device: 'webgpu',
                progress_callback: (progress) => {
                    if (progress.status === 'progress') {
                        const pct = Math.round((progress.loaded / progress.total) * 100);
                        this.onModelLoading({ status: 'loading', progress: pct });
                    }
                }
            });
            
            this.isModelLoaded = true;
            this.isModelLoading = false;
            this.onModelLoading({ status: 'loaded', progress: 100 });
            this.onStatusUpdate('Model ready');
            console.log('[VoiceControl] Whisper model loaded with WebGPU');
            return true;
            
        } catch (error) {
            console.error('[VoiceControl] WebGPU load failed, trying WASM:', error);
            this.onStatusUpdate('WebGPU unavailable, trying WASM...');
            
            try {
                const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0');
                
                this.transcriber = await pipeline('automatic-speech-recognition', this.modelId, {
                    dtype: 'fp32',
                    progress_callback: (progress) => {
                        if (progress.status === 'progress') {
                            const pct = Math.round((progress.loaded / progress.total) * 100);
                            this.onModelLoading({ status: 'loading', progress: pct });
                        }
                    }
                });
                
                this.isModelLoaded = true;
                this.isModelLoading = false;
                this.onModelLoading({ status: 'loaded', progress: 100 });
                this.onStatusUpdate('Model ready (CPU/WASM)');
                console.log('[VoiceControl] Whisper model loaded with WASM fallback');
                return true;
            } catch (fallbackError) {
                console.error('[VoiceControl] WASM fallback also failed:', fallbackError);
                this.isModelLoading = false;
                this.onModelLoading({ status: 'error', error: fallbackError.message });
                this.onStatusUpdate('Model load failed');
                throw fallbackError;
            }
        }
    }

    async startAudioCapture() {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: this.sampleRate,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate
            });
            
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);
            
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
            source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
            
            this.audioChunks = [];
            
            this.processor.onaudioprocess = (event) => {
                if (!this.isRunning) return;
                const inputData = event.inputBuffer.getChannelData(0);
                this.audioChunks.push(new Float32Array(inputData));
            };
            
            this._monitorAudioLevel();
            
            console.log('[VoiceControl] Audio capture started');
            return true;
            
        } catch (error) {
            console.error('[VoiceControl] Audio capture failed:', error);
            this.onStatusUpdate('Microphone access denied');
            return false;
        }
    }

    stopAudioCapture() {
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        this.audioChunks = [];
    }

    _monitorAudioLevel() {
        if (!this.analyser || !this.isRunning) return;
        
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(100, Math.round(average / 128 * 100));
        
        this.onAudioLevel(normalized, dataArray);
        
        if (this.isRunning) {
            requestAnimationFrame(() => this._monitorAudioLevel());
        }
    }

    async _processAudioChunk() {
        if (!this.isRunning || !this.transcriber || this.audioChunks.length === 0) return;
        
        const totalLength = this.audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
        
        if (totalLength < this.sampleRate) {
            return;
        }
        
        const combinedAudio = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of this.audioChunks) {
            combinedAudio.set(chunk, offset);
            offset += chunk.length;
        }
        
        this.audioChunks = [];
        
        const rms = Math.sqrt(combinedAudio.reduce((sum, val) => sum + val * val, 0) / combinedAudio.length);
        if (rms < 0.01) {
            return;
        }
        
        this.onStatusUpdate('Transcribing...');
        
        try {
            const result = await this.transcriber(combinedAudio, {
                language: 'en',
                task: 'transcribe',
                return_timestamps: false
            });
            
            const transcript = result.text.trim();
            
            if (transcript && transcript.length > 0) {
                console.log('[VoiceControl] Transcript:', transcript);
                
                const entry = {
                    text: transcript,
                    timestamp: new Date(),
                    id: Date.now()
                };
                
                this.transcriptHistory.unshift(entry);
                if (this.transcriptHistory.length > this.maxHistory) {
                    this.transcriptHistory.pop();
                }
                
                this.onTranscript(transcript, entry);
                this._checkTriggerRules(transcript);
            }
            
            this.onStatusUpdate('Listening...');
            
        } catch (error) {
            console.error('[VoiceControl] Transcription error:', error);
            this.onStatusUpdate('Transcription error');
        }
    }

    _loadRules() {
        try {
            const saved = localStorage.getItem('vr_voice_rules_standalone');
            if (saved) {
                this.rules = JSON.parse(saved);
            }
        } catch (e) {
            console.error('[VoiceControl] Failed to load rules:', e);
        }
    }

    _saveRules() {
        try {
            localStorage.setItem('vr_voice_rules_standalone', JSON.stringify(this.rules));
        } catch (e) {
            console.error('[VoiceControl] Failed to save rules:', e);
        }
    }

    addRule(phrase, actionType, actionValue) {
        const rule = {
            id: Date.now(),
            phrase: phrase.toLowerCase().trim(),
            actionType,
            actionValue,
            enabled: true,
            triggerCount: 0
        };
        
        this.rules.push(rule);
        this._saveRules();
        return rule;
    }

    removeRule(ruleId) {
        this.rules = this.rules.filter(r => r.id !== ruleId);
        this._saveRules();
    }

    toggleRule(ruleId, enabled) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (rule) {
            rule.enabled = enabled;
            this._saveRules();
        }
    }

    getRules() {
        return this.rules;
    }

    canTrigger() {
        return (Date.now() - this.lastTriggerTime) >= this.cooldown;
    }

    _checkTriggerRules(transcript) {
        if (!this.canTrigger()) return;
        
        const lowerTranscript = transcript.toLowerCase();
        
        for (const rule of this.rules) {
            if (!rule.enabled) continue;
            
            if (lowerTranscript.includes(rule.phrase)) {
                this._executeRule(rule, transcript);
                break;
            }
        }
    }

    async _executeRule(rule, transcript) {
        this.lastTriggerTime = Date.now();
        this.lastTriggeredRule = rule;
        rule.triggerCount++;
        this._saveRules();
        
        const triggerInfo = {
            rule,
            transcript,
            timestamp: new Date()
        };
        
        this.onRuleTriggered(triggerInfo);
        console.log(`[VoiceControl] Triggered: "${rule.phrase}" -> ${rule.actionType}:${rule.actionValue}`);
    }

    async start() {
        if (this.isRunning) return true;
        
        if (!this.isModelLoaded) {
            const loaded = await this.loadModel();
            if (!loaded) return false;
        }
        
        const capturing = await this.startAudioCapture();
        if (!capturing) return false;
        
        this.isRunning = true;
        
        this.processingInterval = setInterval(() => {
            this._processAudioChunk();
        }, this.chunkDuration);
        
        this.onStatusUpdate('Listening...');
        console.log('[VoiceControl] Started');
        return true;
    }

    stop() {
        this.isRunning = false;
        
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        
        this.stopAudioCapture();
        this.onStatusUpdate('Stopped');
        console.log('[VoiceControl] Stopped');
    }

    isActive() {
        return this.isRunning;
    }

    getTranscriptHistory() {
        return this.transcriptHistory;
    }
}

class VoiceTriggersApp {
    constructor() {
        this.voiceControl = null;
        this.reasoningConsole = null;
        this.videoAdapter = null;
        this.audioBarCount = 32;
        
        this.init();
    }

    init() {
        this.reasoningConsole = new ReasoningConsole({ startCollapsed: false });
        window.reasoningConsole = this.reasoningConsole;
        
        this.reasoningConsole.logInfo('Voice Triggers tool initialized');
        
        this.initAudioVisualizer();
        this.initVoiceControl();
        this.initVideoAdapter();
        this.initEventListeners();
        this.renderRules();
    }

    initAudioVisualizer() {
        const visualizer = document.getElementById('audioVisualizer');
        visualizer.innerHTML = '';
        
        for (let i = 0; i < this.audioBarCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'audio-bar';
            bar.style.height = '4px';
            visualizer.appendChild(bar);
        }
    }

    initVoiceControl() {
        this.voiceControl = new VoiceControl({
            chunkDuration: parseInt(document.getElementById('chunkDuration').value) * 1000,
            cooldown: parseInt(document.getElementById('cooldown').value) * 1000,
            
            onTranscript: (text, entry) => this.handleTranscript(text, entry),
            onRuleTriggered: (info) => this.handleRuleTrigger(info),
            onStatusUpdate: (status) => this.updateStatus(status),
            onModelLoading: (info) => this.handleModelLoading(info),
            onAudioLevel: (level, data) => this.updateAudioVisualizer(level, data)
        });
    }

    initVideoAdapter() {
        const videoElement = document.getElementById('video');
        const cameraSelect = document.getElementById('cameraSelect');
        const refreshBtn = document.getElementById('refreshCamerasBtn');
        
        if (window.VideoSourceAdapter) {
            VideoSourceAdapter.init({
                videoElement: videoElement,
                toolId: 'voice-triggers',
                insertInto: '.camera-controls',
                onSourceChange: (source) => {
                    cameraSelect.disabled = source === 'sample';
                    if (refreshBtn) refreshBtn.disabled = source === 'sample';
                    this.reasoningConsole.logInfo(`Switched to ${source === 'camera' ? 'live camera' : 'sample video'}`);
                }
            });
            VideoSourceAdapter.switchToSample().catch(() => {
                this.reasoningConsole.logInfo('No sample video available, using camera');
            });
        }
    }

    initEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.toggleVoice());
        
        document.getElementById('chunkDuration').addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('chunkDurationValue').textContent = `${value}s`;
            if (this.voiceControl) {
                this.voiceControl.setChunkDuration(value * 1000);
            }
        });
        
        document.getElementById('cooldown').addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('cooldownValue').textContent = `${value}s`;
            if (this.voiceControl) {
                this.voiceControl.setCooldown(value * 1000);
            }
        });
        
        document.getElementById('rulesToggle').addEventListener('click', () => {
            document.getElementById('rulesSection').classList.toggle('collapsed');
        });
        
        document.getElementById('addRuleBtn').addEventListener('click', () => this.openRuleModal());
        document.getElementById('cancelRuleBtn').addEventListener('click', () => this.closeRuleModal());
        document.getElementById('saveRuleBtn').addEventListener('click', () => this.saveRule());
        
        document.getElementById('ruleModal').addEventListener('click', (e) => {
            if (e.target.id === 'ruleModal') {
                this.closeRuleModal();
            }
        });
        
        document.getElementById('clearTranscriptsBtn').addEventListener('click', () => this.clearTranscripts());
    }

    async toggleVoice() {
        const btn = document.getElementById('startBtn');
        
        if (this.voiceControl.isActive()) {
            this.voiceControl.stop();
            btn.textContent = 'Start Listening';
            btn.classList.remove('active');
            document.getElementById('audioStatus').textContent = 'Stopped';
            document.getElementById('audioStatus').classList.remove('listening');
            this.reasoningConsole.logAction('Voice recognition stopped');
        } else {
            btn.textContent = 'Loading...';
            btn.disabled = true;
            
            const started = await this.voiceControl.start();
            
            btn.disabled = false;
            
            if (started) {
                btn.textContent = 'Stop Listening';
                btn.classList.add('active');
                document.getElementById('audioStatus').textContent = 'Listening...';
                document.getElementById('audioStatus').classList.add('listening');
                this.reasoningConsole.logAction('Voice recognition started');
            } else {
                btn.textContent = 'Start Listening';
                this.reasoningConsole.logError('Failed to start voice recognition');
            }
        }
    }

    handleTranscript(text, entry) {
        this.addTranscriptEntry(entry);
        this.reasoningConsole.logDetection('speech', 1, 0.9, `"${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    }

    handleRuleTrigger(info) {
        this.highlightTriggeredTranscript(info.rule.phrase);
        
        this.reasoningConsole.logDecision(
            `Trigger matched: "${info.rule.phrase}"`,
            `${info.rule.actionType}: ${info.rule.actionValue}`
        );
        
        if (info.rule.actionType === 'alert') {
            this.updateStatus(`TRIGGERED: ${info.rule.actionValue}`);
        } else if (info.rule.actionType === 'scene') {
            this.reasoningConsole.logAction(`Would switch to scene: ${info.rule.actionValue}`, 'OBS (not connected)');
        }
        
        this.renderRules();
    }

    handleModelLoading(info) {
        const statusEl = document.getElementById('modelStatus');
        const progressEl = document.getElementById('modelProgress');
        const progressBar = document.getElementById('modelProgressBar');
        
        if (info.status === 'loading') {
            statusEl.innerHTML = `
                <div class="model-status-icon">&#x23F3;</div>
                <div class="model-status-text">
                    <div class="model-status-label">Loading Model...</div>
                    <div class="model-status-detail">${info.progress}% complete</div>
                </div>
            `;
            progressEl.style.display = 'block';
            progressBar.style.width = `${info.progress}%`;
            
            if (info.progress === 0) {
                this.reasoningConsole.logInfo('Downloading Whisper model (~40MB)...');
            }
        } else if (info.status === 'loaded') {
            statusEl.innerHTML = `
                <div class="model-status-icon">&#x2705;</div>
                <div class="model-status-text">
                    <div class="model-status-label">Model Ready</div>
                    <div class="model-status-detail">Whisper tiny.en loaded</div>
                </div>
            `;
            progressEl.style.display = 'none';
            this.reasoningConsole.logInfo('Whisper model loaded successfully');
        } else if (info.status === 'error') {
            statusEl.innerHTML = `
                <div class="model-status-icon">&#x274C;</div>
                <div class="model-status-text">
                    <div class="model-status-label">Model Error</div>
                    <div class="model-status-detail">${info.error}</div>
                </div>
            `;
            progressEl.style.display = 'none';
            this.reasoningConsole.logError(`Model load failed: ${info.error}`);
        }
    }

    updateAudioVisualizer(level, frequencyData) {
        const bars = document.querySelectorAll('.audio-bar');
        const binSize = Math.floor(frequencyData.length / bars.length);
        
        bars.forEach((bar, i) => {
            const start = i * binSize;
            const end = start + binSize;
            let sum = 0;
            for (let j = start; j < end; j++) {
                sum += frequencyData[j];
            }
            const avg = sum / binSize;
            const height = Math.max(4, (avg / 255) * 50);
            bar.style.height = `${height}px`;
            bar.classList.toggle('active', avg > 50);
        });
    }

    updateStatus(status) {
        const statusEl = document.getElementById('status');
        statusEl.textContent = status;
        statusEl.className = 'status-bar';
        
        if (status.includes('error') || status.includes('denied') || status.includes('failed')) {
            statusEl.classList.add('error');
        } else if (status.includes('ready') || status.includes('Listening')) {
            statusEl.classList.add('success');
        }
    }

    addTranscriptEntry(entry) {
        const list = document.getElementById('transcriptList');
        const empty = list.querySelector('.transcript-empty');
        if (empty) {
            empty.remove();
        }
        
        const entryEl = document.createElement('div');
        entryEl.className = 'transcript-entry';
        entryEl.dataset.id = entry.id;
        entryEl.innerHTML = `
            <div class="transcript-text">${this.escapeHtml(entry.text)}</div>
            <div class="transcript-time">${entry.timestamp.toLocaleTimeString()}</div>
        `;
        
        list.insertBefore(entryEl, list.firstChild);
        
        while (list.children.length > 50) {
            list.removeChild(list.lastChild);
        }
    }

    highlightTriggeredTranscript(phrase) {
        const entries = document.querySelectorAll('.transcript-entry');
        if (entries.length > 0) {
            entries[0].classList.add('triggered');
        }
    }

    clearTranscripts() {
        const list = document.getElementById('transcriptList');
        list.innerHTML = '<div class="transcript-empty">Transcriptions will appear here when you speak...</div>';
        if (this.voiceControl) {
            this.voiceControl.transcriptHistory = [];
        }
        this.reasoningConsole.logInfo('Transcript history cleared');
    }

    renderRules() {
        const list = document.getElementById('rulesList');
        const rules = this.voiceControl.getRules();
        
        if (rules.length === 0) {
            list.innerHTML = '<div class="rules-empty">No trigger rules defined yet</div>';
            return;
        }
        
        list.innerHTML = rules.map(rule => `
            <div class="rule-item ${rule.enabled ? '' : 'disabled'}" data-id="${rule.id}">
                <div class="rule-phrase">
                    "<strong>${this.escapeHtml(rule.phrase)}</strong>"
                </div>
                <div class="rule-action">${rule.actionType}: ${this.escapeHtml(rule.actionValue)}</div>
                <label class="toggle-switch">
                    <input type="checkbox" ${rule.enabled ? 'checked' : ''} onchange="app.toggleRule(${rule.id}, this.checked)">
                    <span class="toggle-slider"></span>
                </label>
                <button class="btn-delete-rule" onclick="app.deleteRule(${rule.id})">&#x2715;</button>
            </div>
        `).join('');
    }

    openRuleModal() {
        document.getElementById('rulePhraseInput').value = '';
        document.getElementById('ruleActionType').value = 'log';
        document.getElementById('ruleActionValue').value = '';
        document.getElementById('ruleModal').classList.add('active');
    }

    closeRuleModal() {
        document.getElementById('ruleModal').classList.remove('active');
    }

    saveRule() {
        const phrase = document.getElementById('rulePhraseInput').value.trim();
        const actionType = document.getElementById('ruleActionType').value;
        const actionValue = document.getElementById('ruleActionValue').value.trim();
        
        if (!phrase) {
            alert('Please enter a trigger phrase');
            return;
        }
        
        if (!actionValue) {
            alert('Please enter an action value');
            return;
        }
        
        this.voiceControl.addRule(phrase, actionType, actionValue);
        this.renderRules();
        this.closeRuleModal();
        
        this.reasoningConsole.logInfo(`Added rule: "${phrase}" -> ${actionType}`);
    }

    toggleRule(ruleId, enabled) {
        this.voiceControl.toggleRule(ruleId, enabled);
        this.renderRules();
    }

    deleteRule(ruleId) {
        if (confirm('Delete this trigger rule?')) {
            this.voiceControl.removeRule(ruleId);
            this.renderRules();
            this.reasoningConsole.logInfo('Rule deleted');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new VoiceTriggersApp();
});
