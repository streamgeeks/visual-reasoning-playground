class MoondreamClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.moondream.ai/v1';
    }

    async _request(endpoint, body) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Moondream-Auth': this.apiKey
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return response.json();
    }

    async describe(imageDataUrl, options = {}) {
        const length = options.length || 'normal';
        const result = await this._request('/caption', {
            image_url: imageDataUrl,
            length,
            stream: false
        });
        return { description: result.caption, raw: result };
    }

    async ask(imageDataUrl, question) {
        const result = await this._request('/query', {
            image_url: imageDataUrl,
            question,
            stream: false
        });
        return { answer: result.answer, raw: result };
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const describeVideo = document.getElementById('describeVideo');
    
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const ruleModal = document.getElementById('ruleModal');
    const closeRuleBtn = document.getElementById('closeRuleBtn');
    
    const apiKeyInput = document.getElementById('apiKeyInput');
    const obsUrlInput = document.getElementById('obsUrlInput');
    const obsPasswordInput = document.getElementById('obsPasswordInput');
    const connectObsBtn = document.getElementById('connectObsBtn');
    const cameraSelect = document.getElementById('cameraSelect');
    const cooldownInput = document.getElementById('cooldownInput');
    const debounceInput = document.getElementById('debounceInput');
    
    const obsStatusDot = document.querySelector('#obsStatus .status-dot');
    const cameraStatusDot = document.querySelector('#cameraStatus .status-dot');
    const aiStatusDot = document.querySelector('#aiStatus .status-dot');
    
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    const thumbsUpAction = document.getElementById('thumbsUpAction');
    const thumbsDownAction = document.getElementById('thumbsDownAction');
    const openPalmAction = document.getElementById('openPalmAction');
    const startGestureBtn = document.getElementById('startGestureBtn');
    const stopGestureBtn = document.getElementById('stopGestureBtn');
    const gestureDisplay = document.getElementById('gestureDisplay');
    
    const autoDescribeToggle = document.getElementById('autoDescribeToggle');
    const describeInterval = document.getElementById('describeInterval');
    const currentDescription = document.getElementById('currentDescription');
    const activityFeed = document.getElementById('activityFeed');
    
const autoSwitchToggle = document.getElementById('autoSwitchToggle');
    const rulesContainer = document.getElementById('rulesContainer');
    const addRuleBtn = document.getElementById('addRuleBtn');
    const ruleKeywords = document.getElementById('ruleKeywords');
    const ruleScene = document.getElementById('ruleScene');
    const saveRuleBtn = document.getElementById('saveRuleBtn');
    const currentSceneName = document.getElementById('currentSceneName');
    const lastTrigger = document.getElementById('lastTrigger');
    
    const voiceVideo = document.getElementById('voiceVideo');
    const audioVisualizer = document.getElementById('audioVisualizer');
    const voiceStatusDisplay = document.getElementById('voiceStatusDisplay');
    const voiceStatusText = document.getElementById('voiceStatusText');
    const modelStatusLabel = document.getElementById('modelStatusLabel');
    const modelStatusValue = document.getElementById('modelStatusValue');
    const modelProgress = document.getElementById('modelProgress');
    const modelProgressBar = document.getElementById('modelProgressBar');
    const currentTranscriptEl = document.getElementById('currentTranscript');
    const transcriptHistoryEl = document.getElementById('transcriptHistory');
    const voiceRulesContainer = document.getElementById('voiceRulesContainer');
    const addVoiceRuleBtn = document.getElementById('addVoiceRuleBtn');
    const lastVoiceTrigger = document.getElementById('lastVoiceTrigger');
    const startVoiceBtn = document.getElementById('startVoiceBtn');
    const stopVoiceBtn = document.getElementById('stopVoiceBtn');
    const voiceRuleModal = document.getElementById('voiceRuleModal');
    const closeVoiceRuleBtn = document.getElementById('closeVoiceRuleBtn');
    const voiceRulePhrase = document.getElementById('voiceRulePhrase');
    const voiceRuleAction = document.getElementById('voiceRuleAction');
    const saveVoiceRuleBtn = document.getElementById('saveVoiceRuleBtn');

    let moondreamClient = null;
    let obsClient = new OBSClient();
    let gestureControl = null;
    let sceneDescriber = null;
    let autoSwitcher = null;
    let voiceControl = null;
    let currentStream = null;

    function loadSettings() {
        const apiKey = localStorage.getItem('vr_moondream_key') || '';
        const obsUrl = localStorage.getItem('vr_obs_url') || 'localhost:4455';
        const obsPassword = localStorage.getItem('vr_obs_password') || '';
        
        apiKeyInput.value = apiKey;
        obsUrlInput.value = obsUrl;
        obsPasswordInput.value = obsPassword;
        
        if (apiKey) {
            moondreamClient = new MoondreamClient(apiKey);
            aiStatusDot.classList.add('connected');
        }
    }

    function saveSettings() {
        localStorage.setItem('vr_moondream_key', apiKeyInput.value);
        localStorage.setItem('vr_obs_url', obsUrlInput.value);
        localStorage.setItem('vr_obs_password', obsPasswordInput.value);
    }

    async function enumerateCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            
            cameraSelect.innerHTML = '<option value="">Select camera...</option>';
            videoDevices.forEach((device, i) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Camera ${i + 1}`;
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
                    ? { deviceId: { exact: deviceId }, width: 640, height: 480 }
                    : { width: 640, height: 480, facingMode: 'user' },
                audio: false
            };
            
currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = currentStream;
            describeVideo.srcObject = currentStream;
            voiceVideo.srcObject = currentStream;
            
            cameraStatusDot.classList.add('connected');
            await enumerateCameras();
            
            if (!deviceId) {
                const track = currentStream.getVideoTracks()[0];
                const settings = track.getSettings();
                if (settings.deviceId) {
                    cameraSelect.value = settings.deviceId;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Camera access denied:', error);
            cameraStatusDot.classList.remove('connected');
            return false;
        }
    }

function populateActionSelects(scenes) {
        const selects = [thumbsUpAction, thumbsDownAction, openPalmAction, ruleScene];
        
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">No action</option>';
            
            if (select !== ruleScene) {
                select.innerHTML += '<optgroup label="Scenes">';
            }
            scenes.forEach(scene => {
                select.innerHTML += `<option value="scene:${scene}">${scene}</option>`;
            });
            if (select !== ruleScene) {
                select.innerHTML += '</optgroup>';
                
                select.innerHTML += '<optgroup label="Recording">';
                select.innerHTML += '<option value="cmd:StartRecord">Start Recording</option>';
                select.innerHTML += '<option value="cmd:StopRecord">Stop Recording</option>';
                select.innerHTML += '<option value="cmd:ToggleRecord">Toggle Recording</option>';
                select.innerHTML += '</optgroup>';
                
                select.innerHTML += '<optgroup label="Streaming">';
                select.innerHTML += '<option value="cmd:StartStream">Start Streaming</option>';
                select.innerHTML += '<option value="cmd:StopStream">Stop Streaming</option>';
                select.innerHTML += '</optgroup>';
            }
            
            if (currentValue) select.value = currentValue;
        });

        if (scenes.length >= 1) thumbsUpAction.value = 'scene:' + scenes[0];
        if (scenes.length >= 2) thumbsDownAction.value = 'scene:' + scenes[1];
        
        populateVoiceActionSelect(scenes);
    }
    
    function populateVoiceActionSelect(scenes) {
        const currentValue = voiceRuleAction.value;
        voiceRuleAction.innerHTML = '<option value="">Select action...</option>';
        
        voiceRuleAction.innerHTML += '<optgroup label="Scenes">';
        scenes.forEach(scene => {
            voiceRuleAction.innerHTML += `<option value="scene:${scene}">${scene}</option>`;
        });
        voiceRuleAction.innerHTML += '</optgroup>';
        
        voiceRuleAction.innerHTML += '<optgroup label="Recording">';
        voiceRuleAction.innerHTML += '<option value="cmd:StartRecord">Start Recording</option>';
        voiceRuleAction.innerHTML += '<option value="cmd:StopRecord">Stop Recording</option>';
        voiceRuleAction.innerHTML += '<option value="cmd:ToggleRecord">Toggle Recording</option>';
        voiceRuleAction.innerHTML += '</optgroup>';
        
        voiceRuleAction.innerHTML += '<optgroup label="Streaming">';
        voiceRuleAction.innerHTML += '<option value="cmd:StartStream">Start Streaming</option>';
        voiceRuleAction.innerHTML += '<option value="cmd:StopStream">Stop Streaming</option>';
        voiceRuleAction.innerHTML += '</optgroup>';
        
        if (currentValue) voiceRuleAction.value = currentValue;
    }

    async function connectToOBS() {
        try {
            connectObsBtn.disabled = true;
            connectObsBtn.textContent = 'Connecting...';
            
            let url = obsUrlInput.value.trim();
            if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
                url = 'ws://' + url;
            }
            
            await obsClient.connect(url, obsPasswordInput.value);
            saveSettings();
            
        } catch (error) {
            console.error('OBS connection failed:', error);
            alert('Failed to connect to OBS: ' + error.message);
        } finally {
            connectObsBtn.disabled = false;
            connectObsBtn.textContent = obsClient.isConnected() ? 'Disconnect' : 'Connect to OBS';
        }
    }

    obsClient.onStatusChange = (connected) => {
        if (connected) {
            obsStatusDot.classList.add('connected');
            connectObsBtn.textContent = 'Disconnect';
        } else {
            obsStatusDot.classList.remove('connected');
            connectObsBtn.textContent = 'Connect to OBS';
            currentSceneName.textContent = 'Not Connected';
        }
    };

    obsClient.onSceneChange = (sceneName) => {
        currentSceneName.textContent = sceneName || 'Unknown';
    };

    obsClient.onScenesLoaded = (scenes) => {
        populateActionSelects(scenes);
    };

    function initializeModules() {
        gestureControl = new GestureControl({
            video,
            moondreamClient,
            interval: 1500,
            cooldown: parseInt(cooldownInput.value) * 1000,
            debounce: parseInt(debounceInput.value),
            onGestureDetected: async (gesture) => {
                gestureDisplay.querySelector('.gesture-icon').textContent = gesture.icon;
                gestureDisplay.classList.add('detected');
                setTimeout(() => gestureDisplay.classList.remove('detected'), 1000);
                
                let actionSelect;
                if (gesture.id === 'thumbsUp') actionSelect = thumbsUpAction;
                else if (gesture.id === 'thumbsDown') actionSelect = thumbsDownAction;
                else if (gesture.id === 'openPalm') actionSelect = openPalmAction;
                
                if (actionSelect && actionSelect.value) {
                    await executeAction(actionSelect.value);
                }
            },
            onStatusUpdate: (status) => {
                console.log('[Gesture]', status);
            }
        });

        sceneDescriber = new SceneDescriber({
            video: describeVideo,
            moondreamClient,
            interval: parseInt(describeInterval.value),
            onDescription: (description, entry) => {
                currentDescription.textContent = description;
                addActivityItem(description, entry.timestamp);
                
                if (autoSwitcher && autoSwitcher.isActive()) {
                    autoSwitcher.processDescription(description);
                }
            },
            onStatusUpdate: (status) => {
                console.log('[Describer]', status);
            }
        });

autoSwitcher = new AutoSwitcher({
            obsClient,
            cooldown: parseInt(cooldownInput.value) * 1000,
            onRuleTriggered: (info) => {
                const keywords = info.rule.keywords.join(', ');
                lastTrigger.innerHTML = `
                    <strong>"${keywords}"</strong> → ${info.rule.sceneName}<br>
                    <small>${formatTime(info.timestamp)}</small>
                `;
            },
            onStatusUpdate: (status) => {
                console.log('[AutoSwitcher]', status);
            }
        });
        
        setupAudioVisualizer();
        
        voiceControl = new VoiceControl({
            obsClient,
            cooldown: parseInt(cooldownInput.value) * 1000,
            onTranscript: (text, entry) => {
                currentTranscriptEl.textContent = text;
                currentTranscriptEl.classList.add('active');
                setTimeout(() => currentTranscriptEl.classList.remove('active'), 1000);
                addTranscriptItem(text, entry.timestamp);
            },
            onRuleTriggered: (info) => {
                lastVoiceTrigger.innerHTML = `
                    <strong>"${info.rule.phrase}"</strong> → ${info.rule.actionValue}<br>
                    <small>${formatTime(info.timestamp)}</small>
                `;
                highlightLastTranscript();
            },
            onStatusUpdate: (status) => {
                voiceStatusText.textContent = status;
                voiceStatusDisplay.classList.remove('listening', 'transcribing');
                if (status === 'Listening...') {
                    voiceStatusDisplay.classList.add('listening');
                } else if (status === 'Transcribing...') {
                    voiceStatusDisplay.classList.add('transcribing');
                }
            },
            onModelLoading: (info) => {
                if (info.status === 'loading') {
                    modelStatusValue.textContent = `Loading ${info.progress}%`;
                    modelStatusValue.className = 'loading';
                    modelProgressBar.style.width = info.progress + '%';
                    modelProgress.classList.remove('hidden');
                } else if (info.status === 'loaded') {
                    modelStatusValue.textContent = 'Ready';
                    modelStatusValue.className = 'loaded';
                    modelProgress.classList.add('hidden');
                } else if (info.status === 'error') {
                    modelStatusValue.textContent = 'Error';
                    modelStatusValue.className = 'error';
                    modelProgress.classList.add('hidden');
                }
            },
            onAudioLevel: (level, dataArray) => {
                updateAudioVisualizer(dataArray);
            }
        });

        renderRules();
        renderVoiceRules();
    }
    
    function setupAudioVisualizer() {
        audioVisualizer.innerHTML = '';
        const barCount = 16;
        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'audio-bar';
            bar.style.height = '4px';
            audioVisualizer.appendChild(bar);
        }
    }
    
    function updateAudioVisualizer(dataArray) {
        const bars = audioVisualizer.querySelectorAll('.audio-bar');
        bars.forEach((bar, i) => {
            const value = dataArray[i * 2] || 0;
            const height = Math.max(4, value / 4);
            bar.style.height = height + 'px';
            bar.classList.toggle('active', value > 100);
        });
    }
    
    function addTranscriptItem(text, timestamp) {
        const placeholder = transcriptHistoryEl.querySelector('.placeholder');
        if (placeholder) placeholder.remove();
        
        const item = document.createElement('div');
        item.className = 'transcript-item';
        item.innerHTML = `
            <div class="transcript-text">${text}</div>
            <div class="transcript-time">${formatTime(timestamp)}</div>
        `;
        
        transcriptHistoryEl.insertBefore(item, transcriptHistoryEl.firstChild);
        
        while (transcriptHistoryEl.children.length > 20) {
            transcriptHistoryEl.removeChild(transcriptHistoryEl.lastChild);
        }
    }
    
    function highlightLastTranscript() {
        const firstItem = transcriptHistoryEl.querySelector('.transcript-item');
        if (firstItem) {
            firstItem.classList.add('triggered');
        }
    }
    
    function renderVoiceRules() {
        const rules = voiceControl.getRules();
        
        if (rules.length === 0) {
            voiceRulesContainer.innerHTML = '<div class="rule-item empty-state">No voice triggers configured</div>';
            return;
        }
        
        voiceRulesContainer.innerHTML = rules.map(rule => `
            <div class="rule-item" data-id="${rule.id}">
                <div class="rule-info">
                    <div class="rule-keywords">"${rule.phrase}"</div>
                    <div class="rule-scene">→ ${rule.actionValue}</div>
                </div>
                <div class="rule-actions">
                    <label class="toggle rule-toggle">
                        <input type="checkbox" ${rule.enabled ? 'checked' : ''} data-voice-rule-toggle="${rule.id}">
                        <span class="toggle-slider"></span>
                    </label>
                    <button class="delete-btn" data-voice-rule-delete="${rule.id}">&times;</button>
                </div>
            </div>
        `).join('');
        
        voiceRulesContainer.querySelectorAll('[data-voice-rule-toggle]').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                voiceControl.toggleRule(parseInt(e.target.dataset.voiceRuleToggle), e.target.checked);
            });
        });
        
        voiceRulesContainer.querySelectorAll('[data-voice-rule-delete]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                voiceControl.removeRule(parseInt(e.target.dataset.voiceRuleDelete));
                renderVoiceRules();
            });
        });
    }

    async function executeAction(actionValue) {
        if (!actionValue || !obsClient.isConnected()) return;

        const [type, value] = actionValue.split(':');
        
        try {
            if (type === 'scene') {
                await obsClient.switchScene(value);
            } else if (type === 'cmd') {
                await obsClient.sendCommand(value);
            }
        } catch (error) {
            console.error('Action failed:', error);
        }
    }

    function addActivityItem(description, timestamp) {
        const placeholder = activityFeed.querySelector('.placeholder');
        if (placeholder) placeholder.remove();
        
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            ${description}
            <span class="timestamp">${formatTime(timestamp)}</span>
        `;
        
        activityFeed.insertBefore(item, activityFeed.firstChild);
        
        while (activityFeed.children.length > 20) {
            activityFeed.removeChild(activityFeed.lastChild);
        }
    }

    function formatTime(date) {
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    }

    function renderRules() {
        const rules = autoSwitcher.getRules();
        
        if (rules.length === 0) {
            rulesContainer.innerHTML = '<div class="rule-item empty-state">No rules configured</div>';
            return;
        }
        
        rulesContainer.innerHTML = rules.map(rule => `
            <div class="rule-item" data-id="${rule.id}">
                <div class="rule-info">
                    <div class="rule-keywords">${rule.keywords.join(', ')}</div>
                    <div class="rule-scene">→ ${rule.sceneName.replace('scene:', '')}</div>
                </div>
                <div class="rule-actions">
                    <label class="toggle rule-toggle">
                        <input type="checkbox" ${rule.enabled ? 'checked' : ''} data-rule-toggle="${rule.id}">
                        <span class="toggle-slider"></span>
                    </label>
                    <button class="delete-btn" data-rule-delete="${rule.id}">&times;</button>
                </div>
            </div>
        `).join('');
        
        rulesContainer.querySelectorAll('[data-rule-toggle]').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                autoSwitcher.toggleRule(parseInt(e.target.dataset.ruleToggle), e.target.checked);
            });
        });
        
        rulesContainer.querySelectorAll('[data-rule-delete]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                autoSwitcher.removeRule(parseInt(e.target.dataset.ruleDelete));
                renderRules();
            });
        });
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab + '-tab').classList.add('active');
        });
    });

    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('active');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('active');
        
        if (apiKeyInput.value) {
            moondreamClient = new MoondreamClient(apiKeyInput.value);
            aiStatusDot.classList.add('connected');
            
            if (gestureControl) gestureControl.setMoondreamClient(moondreamClient);
            if (sceneDescriber) sceneDescriber.setMoondreamClient(moondreamClient);
        }
        
        saveSettings();
    });

    connectObsBtn.addEventListener('click', () => {
        if (obsClient.isConnected()) {
            obsClient.disconnect();
        } else {
            connectToOBS();
        }
    });

    cameraSelect.addEventListener('change', () => {
        if (cameraSelect.value) {
            startCamera(cameraSelect.value);
        }
    });

cooldownInput.addEventListener('change', () => {
        const ms = parseInt(cooldownInput.value) * 1000;
        if (gestureControl) gestureControl.setCooldown(ms);
        if (autoSwitcher) autoSwitcher.setCooldown(ms);
        if (voiceControl) voiceControl.setCooldown(ms);
    });

    debounceInput.addEventListener('change', () => {
        if (gestureControl) gestureControl.setDebounce(parseInt(debounceInput.value));
    });

    startGestureBtn.addEventListener('click', () => {
        if (!moondreamClient) {
            alert('Please configure your Moondream API key in Settings');
            settingsModal.classList.add('active');
            return;
        }
        
        if (gestureControl.start()) {
            startGestureBtn.disabled = true;
            stopGestureBtn.disabled = false;
        }
    });

    stopGestureBtn.addEventListener('click', () => {
        gestureControl.stop();
        startGestureBtn.disabled = false;
        stopGestureBtn.disabled = true;
        gestureDisplay.querySelector('.gesture-icon').textContent = '-';
    });

    autoDescribeToggle.addEventListener('change', () => {
        if (!moondreamClient) {
            autoDescribeToggle.checked = false;
            alert('Please configure your Moondream API key in Settings');
            settingsModal.classList.add('active');
            return;
        }
        
        if (autoDescribeToggle.checked) {
            sceneDescriber.start();
        } else {
            sceneDescriber.stop();
        }
    });

    describeInterval.addEventListener('change', () => {
        if (sceneDescriber) {
            sceneDescriber.setInterval(parseInt(describeInterval.value));
        }
    });

    autoSwitchToggle.addEventListener('change', () => {
        if (autoSwitchToggle.checked) {
            if (!autoDescribeToggle.checked) {
                autoDescribeToggle.checked = true;
                if (moondreamClient) sceneDescriber.start();
            }
            autoSwitcher.enable();
        } else {
            autoSwitcher.disable();
        }
    });

    addRuleBtn.addEventListener('click', () => {
        ruleKeywords.value = '';
        ruleScene.value = '';
        ruleModal.classList.add('active');
    });

    closeRuleBtn.addEventListener('click', () => {
        ruleModal.classList.remove('active');
    });

    saveRuleBtn.addEventListener('click', () => {
        const keywords = ruleKeywords.value.trim();
        const scene = ruleScene.value;
        
        if (!keywords) {
            alert('Please enter keywords');
            return;
        }
        if (!scene) {
            alert('Please select a scene');
            return;
        }
        
        autoSwitcher.addRule(keywords, scene.replace('scene:', ''));
        renderRules();
        ruleModal.classList.remove('active');
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettingsBtn.click();
        }
    });

ruleModal.addEventListener('click', (e) => {
        if (e.target === ruleModal) {
            ruleModal.classList.remove('active');
        }
    });
    
    startVoiceBtn.addEventListener('click', async () => {
        startVoiceBtn.disabled = true;
        startVoiceBtn.textContent = 'Starting...';
        
        const started = await voiceControl.start();
        
        if (started) {
            stopVoiceBtn.disabled = false;
            startVoiceBtn.textContent = 'Start Voice Detection';
        } else {
            startVoiceBtn.disabled = false;
            startVoiceBtn.textContent = 'Start Voice Detection';
        }
    });
    
    stopVoiceBtn.addEventListener('click', () => {
        voiceControl.stop();
        startVoiceBtn.disabled = false;
        stopVoiceBtn.disabled = true;
    });
    
    addVoiceRuleBtn.addEventListener('click', () => {
        voiceRulePhrase.value = '';
        voiceRuleAction.value = '';
        voiceRuleModal.classList.add('active');
    });
    
    closeVoiceRuleBtn.addEventListener('click', () => {
        voiceRuleModal.classList.remove('active');
    });
    
    saveVoiceRuleBtn.addEventListener('click', () => {
        const phrase = voiceRulePhrase.value.trim();
        const action = voiceRuleAction.value;
        
        if (!phrase) {
            alert('Please enter a trigger phrase');
            return;
        }
        if (!action) {
            alert('Please select an action');
            return;
        }
        
        const [actionType, actionValue] = action.split(':');
        voiceControl.addRule(phrase, actionType, actionValue);
        renderVoiceRules();
        voiceRuleModal.classList.remove('active');
    });
    
    voiceRuleModal.addEventListener('click', (e) => {
        if (e.target === voiceRuleModal) {
            voiceRuleModal.classList.remove('active');
        }
    });

    loadSettings();
    await startCamera();
    initializeModules();
    
    const savedObsUrl = localStorage.getItem('vr_obs_url');
    if (savedObsUrl) {
        setTimeout(() => {
            connectToOBS().catch(() => {});
        }, 500);
    }
});
