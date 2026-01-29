class VoiceControl {
    constructor(options = {}) {
        this.obsClient = options.obsClient;
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

    setOBSClient(client) {
        this.obsClient = client;
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
            console.log('[VoiceControl] Whisper model loaded');
            return true;
            
        } catch (error) {
            console.error('[VoiceControl] Model loading failed:', error);
            this.isModelLoading = false;
            this.onModelLoading({ status: 'error', error: error.message });
            this.onStatusUpdate('Model load failed');
            
            try {
                console.log('[VoiceControl] Retrying with WASM backend...');
                const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0');
                
                this.transcriber = await pipeline('automatic-speech-recognition', this.modelId, {
                    dtype: 'fp32'
                });
                
                this.isModelLoaded = true;
                this.onModelLoading({ status: 'loaded', progress: 100 });
                this.onStatusUpdate('Model ready (CPU)');
                console.log('[VoiceControl] Whisper model loaded (WASM fallback)');
                return true;
            } catch (fallbackError) {
                console.error('[VoiceControl] Fallback also failed:', fallbackError);
                this.onStatusUpdate('Model unavailable');
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
            const saved = localStorage.getItem('vr_voice_rules');
            if (saved) {
                this.rules = JSON.parse(saved);
            }
        } catch (e) {
            console.error('[VoiceControl] Failed to load rules:', e);
        }
    }

    _saveRules() {
        try {
            localStorage.setItem('vr_voice_rules', JSON.stringify(this.rules));
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
        if (!this.obsClient || !this.obsClient.isConnected()) {
            console.warn('[VoiceControl] OBS not connected, skipping rule execution');
            return;
        }
        
        try {
            if (rule.actionType === 'scene') {
                await this.obsClient.switchScene(rule.actionValue);
            } else if (rule.actionType === 'command') {
                await this.obsClient.sendCommand(rule.actionValue);
            }
            
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
            console.log(`[VoiceControl] Triggered: "${rule.phrase}" → ${rule.actionType}:${rule.actionValue}`);
            
        } catch (error) {
            console.error('[VoiceControl] Rule execution failed:', error);
        }
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

    getLastTrigger() {
        return this.lastTriggeredRule ? {
            rule: this.lastTriggeredRule,
            time: new Date(this.lastTriggerTime)
        } : null;
    }
}

window.VoiceControl = VoiceControl;
