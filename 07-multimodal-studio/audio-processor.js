class AudioProcessor {
    constructor(options = {}) {
        this.wakeWord = options.wakeWord || 'hey studio';
        this.onWakeWord = options.onWakeWord || (() => {});
        this.onCommand = options.onCommand || (() => {});
        this.onStateChange = options.onStateChange || (() => {});
        this.onTranscript = options.onTranscript || (() => {});
        this.onAudioLevel = options.onAudioLevel || (() => {});
        this.openAIKey = options.openAIKey || null;
        this.useWhisperForCommands = options.useWhisperForCommands || false;
        
        this.recognition = null;
        this.audioContext = null;
        this.analyser = null;
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.isListening = false;
        this.isRecordingCommand = false;
        this.commandAudioChunks = [];
        this.levelCheckInterval = null;
        
        this.state = 'idle';
    }

    async initialize() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            throw new Error('Speech recognition not supported in this browser. Try Chrome.');
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => this.handleSpeechResult(event);
        this.recognition.onerror = (event) => this.handleSpeechError(event);
        this.recognition.onend = () => this.handleSpeechEnd();

        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.setupAudioAnalyser();
            this.setState('ready');
            return true;
        } catch (error) {
            throw new Error('Microphone access denied: ' + error.message);
        }
    }

    setupAudioAnalyser() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        source.connect(this.analyser);

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        
        this.levelCheckInterval = setInterval(() => {
            if (!this.isListening) return;
            
            this.analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            const normalizedLevel = Math.min(average / 128, 1);
            this.onAudioLevel(normalizedLevel, dataArray);
        }, 50);
    }

    start() {
        if (this.isListening) return;
        
        this.isListening = true;
        this.setState('listening');
        
        try {
            this.recognition.start();
        } catch (e) {
            console.log('Recognition already started');
        }
    }

    stop() {
        this.isListening = false;
        this.setState('idle');
        
        try {
            this.recognition.stop();
        } catch (e) {
            console.log('Recognition already stopped');
        }
    }

    setState(state) {
        this.state = state;
        this.onStateChange(state);
    }

    handleSpeechResult(event) {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        const currentTranscript = (finalTranscript || interimTranscript).toLowerCase().trim();
        this.onTranscript(currentTranscript, !finalTranscript);

        if (finalTranscript) {
            this.processTranscript(finalTranscript.toLowerCase().trim());
        }
    }

    processTranscript(transcript) {
        const wakeWordIndex = transcript.indexOf(this.wakeWord);
        
        if (wakeWordIndex !== -1) {
            this.setState('wake-detected');
            this.onWakeWord();

            const commandPart = transcript.substring(wakeWordIndex + this.wakeWord.length).trim();
            
            if (commandPart.length > 0) {
                this.processCommand(commandPart);
            } else {
                this.setState('awaiting-command');
                setTimeout(() => {
                    if (this.state === 'awaiting-command') {
                        this.setState('listening');
                    }
                }, 5000);
            }
        }
    }

    async processCommand(commandText) {
        this.setState('processing');
        
        let finalCommand = commandText;
        
        if (this.useWhisperForCommands && this.openAIKey) {
            try {
                finalCommand = await this.enhanceWithWhisper(commandText);
            } catch (e) {
                console.log('Whisper enhancement failed, using original:', e.message);
            }
        }

        this.onCommand(finalCommand);
        
        setTimeout(() => {
            if (this.isListening) {
                this.setState('listening');
            }
        }, 500);
    }

    async recordCommandAudio(durationMs = 4000) {
        return new Promise((resolve, reject) => {
            this.commandAudioChunks = [];
            
            this.mediaRecorder = new MediaRecorder(this.mediaStream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.commandAudioChunks.push(e.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.commandAudioChunks, { type: 'audio/webm' });
                resolve(audioBlob);
            };

            this.mediaRecorder.onerror = reject;
            this.mediaRecorder.start();

            setTimeout(() => {
                if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                    this.mediaRecorder.stop();
                }
            }, durationMs);
        });
    }

    async transcribeWithWhisper(audioBlob) {
        if (!this.openAIKey) {
            throw new Error('OpenAI API key not set');
        }

        const formData = new FormData();
        formData.append('file', audioBlob, 'command.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'en');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.openAIKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Whisper API error: ${error}`);
        }

        const result = await response.json();
        return result.text;
    }

    async enhanceWithWhisper(webSpeechText) {
        return webSpeechText;
    }

    async captureAndTranscribe() {
        this.setState('recording');
        
        try {
            const audioBlob = await this.recordCommandAudio(4000);
            this.setState('transcribing');
            
            const transcript = await this.transcribeWithWhisper(audioBlob);
            return transcript.toLowerCase().trim();
        } catch (error) {
            console.error('Capture and transcribe failed:', error);
            throw error;
        }
    }

    handleSpeechError(event) {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
            this.setState('error');
            return;
        }
        
        if (this.isListening && event.error !== 'aborted') {
            setTimeout(() => {
                if (this.isListening) {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        console.log('Could not restart recognition');
                    }
                }
            }, 1000);
        }
    }

    handleSpeechEnd() {
        if (this.isListening) {
            try {
                this.recognition.start();
            } catch (e) {
                console.log('Recognition restart failed');
            }
        }
    }

    setOpenAIKey(key) {
        this.openAIKey = key;
    }

    destroy() {
        this.stop();
        
        if (this.levelCheckInterval) {
            clearInterval(this.levelCheckInterval);
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
    }
}

window.AudioProcessor = AudioProcessor;
