document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const uploadArea = document.getElementById('uploadArea');
    const referenceInput = document.getElementById('referenceInput');
    const referencePreview = document.getElementById('referencePreview');
    const currentPreview = document.getElementById('currentPreview');
    const captureBtn = document.getElementById('captureBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const recommendationsDiv = document.getElementById('recommendations');
    const recommendationList = document.getElementById('recommendationList');
    const analysisText = document.getElementById('analysisText');
    const statusBar = document.getElementById('status');
    const matchScoreSpan = document.getElementById('matchScore');
    const analysisTimeSpan = document.getElementById('analysisTime');
    const presetProfiles = document.getElementById('presetProfiles');
    const presetItems = document.querySelectorAll('.preset-item');

    let client = null;
    let referenceImage = null;
    let currentImage = null;
    let videoAdapter = null;
    let colorController = null;
    let currentRecommendations = null;

    const cameraIPInput = document.getElementById('cameraIP');
    const testConnectionBtn = document.getElementById('testConnectionBtn');
    const connectionStatus = document.getElementById('connectionStatus');
    const useAuthCheckbox = document.getElementById('useAuth');
    const authFields = document.getElementById('authFields');
    const authUsernameInput = document.getElementById('authUsername');
    const authPasswordInput = document.getElementById('authPassword');
    const brightnessSlider = document.getElementById('brightness');
    const contrastSlider = document.getElementById('contrast');
    const saturationSlider = document.getElementById('saturation');
    const sharpnessSlider = document.getElementById('sharpness');
    const resetBtn = document.getElementById('resetBtn');
    const applyRecommendationBtn = document.getElementById('applyRecommendationBtn');

    window.apiKeyManager = new APIKeyManager({
        requireMoondream: true,
        requireOpenAI: false,
        onKeysChanged: (keys) => {
            if (keys.moondream) {
                client = new MoondreamClient(keys.moondream);
                window.reasoningConsole.logInfo('Moondream API key configured');
                checkReadyState();
            }
        }
    });

    window.reasoningConsole = new ReasoningConsole({ startCollapsed: false });

    if (window.apiKeyManager.hasMoondreamKey()) {
        client = new MoondreamClient(window.apiKeyManager.getMoondreamKey());
        window.reasoningConsole.logInfo('Loaded saved Moondream API key');
    }

    async function initVideoSource() {
        try {
            window.reasoningConsole.logInfo('Initializing video source...');
            
            if (window.VideoSourceAdapter) {
                videoAdapter = window.VideoSourceAdapter.init({
                    videoElement: video,
                    toolId: 'color-assistant',
                    insertInto: video.parentElement,
                    onSourceChange: (source) => {
                        window.reasoningConsole.logInfo(`Switched to ${source === 'camera' ? 'live camera' : 'sample video'}`);
                        updateStatus(source === 'camera' ? 'Camera ready - Upload a reference image' : 'Using sample video - Upload a reference image');
                        currentImage = null;
                        currentPreview.classList.add('hidden');
                        video.parentElement.classList.remove('hidden');
                        checkReadyState();
                    }
                });
                
                await videoAdapter.switchToSample();
                updateStatus('Using sample video - Upload a reference image');
                window.reasoningConsole.logInfo('Video source initialized with sample video');
            } else {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720 },
                    audio: false
                });
                video.srcObject = stream;
                updateStatus('Camera ready - Upload a reference image');
                window.reasoningConsole.logInfo('Camera initialized successfully');
            }
        } catch (error) {
            updateStatus('Video error: ' + error.message, true);
            window.reasoningConsole.logError('Video initialization failed: ' + error.message);
        }
    }

    function updateStatus(message, isError = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }

    function handleReferenceUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            referenceImage = e.target.result;
            referencePreview.src = referenceImage;
            referencePreview.classList.remove('hidden');
            uploadArea.classList.add('hidden');
            presetProfiles.classList.add('hidden');
            presetItems.forEach(p => p.classList.remove('selected'));
            checkReadyState();
            updateStatus('Reference uploaded - Capture current frame');
            window.reasoningConsole.logAction('Reference uploaded', file.name);
        };
        reader.readAsDataURL(file);
    }

    function captureCurrentFrame() {
        if (!window.apiKeyManager.hasMoondreamKey()) {
            updateStatus('Please configure API key', true);
            window.apiKeyManager.showModal();
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        
        currentImage = canvas.toDataURL('image/jpeg', 0.9);
        currentPreview.src = currentImage;
        currentPreview.classList.remove('hidden');
        video.parentElement.classList.add('hidden');
        
        checkReadyState();
        updateStatus('Frame captured - Click Analyze to compare');
        window.reasoningConsole.logAction('Frame captured', 'Current camera frame saved');
    }

    function checkReadyState() {
        analyzeBtn.disabled = !(referenceImage && currentImage && window.apiKeyManager.hasMoondreamKey());
    }

    const ANALYSIS_PROMPT = `Analyze this image's color and lighting. Return ONLY valid JSON in this exact format:
{"temperature":"warm/neutral/cool","brightness":"dark/medium/bright","contrast":"low/medium/high","saturation":"low/medium/high","dominant_color":"color name","mood":"one or two words"}`;

    const COMPARISON_PROMPT = `Compare these two image analyses and recommend camera adjustments.

REFERENCE (target look): {REF}
CURRENT (needs adjustment): {CURRENT}

Return ONLY valid JSON in this exact format:
{"temperature":{"action":"warmer/cooler/no change","amount":"slight/moderate/significant"},"brightness":{"action":"increase/decrease/no change","amount":"slight/moderate/significant"},"contrast":{"action":"increase/decrease/no change","amount":"slight/moderate/significant"},"saturation":{"action":"increase/decrease/no change","amount":"slight/moderate/significant"},"summary":"one sentence recommendation"}`;

    function parseJSON(text) {
        try {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                return JSON.parse(match[0]);
            }
        } catch (e) {
            console.warn('JSON parse failed:', e);
        }
        return null;
    }

    async function analyzeAndCompare() {
        if (!referenceImage || !currentImage) return;

        if (!window.apiKeyManager.hasMoondreamKey()) {
            updateStatus('Please configure API key', true);
            window.apiKeyManager.showModal();
            return;
        }

        analyzeBtn.disabled = true;
        updateStatus('Analyzing reference image...');
        window.reasoningConsole.logInfo('Starting color analysis...');

        const startTime = Date.now();

        try {
            const refResult = await client.ask(referenceImage, ANALYSIS_PROMPT);
            window.reasoningConsole.logApiCall('/ask (reference)', Date.now() - startTime);
            const refAnalysis = parseJSON(refResult.answer);
            
            updateStatus('Analyzing current frame...');
            const currentStart = Date.now();
            const currentResult = await client.ask(currentImage, ANALYSIS_PROMPT);
            window.reasoningConsole.logApiCall('/ask (current)', Date.now() - currentStart);
            const currentAnalysis = parseJSON(currentResult.answer);

            updateStatus('Generating recommendations...');
            const compareStart = Date.now();
            const prompt = COMPARISON_PROMPT
                .replace('{REF}', JSON.stringify(refAnalysis || refResult.answer))
                .replace('{CURRENT}', JSON.stringify(currentAnalysis || currentResult.answer));
            const compareResult = await client.ask(referenceImage, prompt);
            window.reasoningConsole.logApiCall('/ask (comparison)', Date.now() - compareStart);
            const recommendations = parseJSON(compareResult.answer);

            const elapsed = Date.now() - startTime;
            analysisTimeSpan.textContent = (elapsed / 1000).toFixed(1) + 's';

            displayRecommendations(recommendations, refAnalysis, currentAnalysis, compareResult.answer);
            updateStatus('Analysis complete');
            window.reasoningConsole.logDecision('Analysis complete', `Total time: ${elapsed}ms`);

        } catch (error) {
            updateStatus('Error: ' + error.message, true);
            window.reasoningConsole.logError('Analysis failed: ' + error.message);
        } finally {
            analyzeBtn.disabled = false;
        }
    }

    function displayRecommendations(recs, refAnalysis, currentAnalysis, rawResponse) {
        recommendationsDiv.classList.remove('hidden');
        currentRecommendations = recs;
        applyRecommendationBtn.disabled = !colorController || !recs;

        if (recs && typeof recs === 'object') {
            const adjustments = [
                { key: 'temperature', label: 'Color Temperature', icon: '🌡️', color: '#E9C46A' },
                { key: 'brightness', label: 'Brightness', icon: '☀️', color: '#F4A261' },
                { key: 'contrast', label: 'Contrast', icon: '◐', color: '#2A9D8F' },
                { key: 'saturation', label: 'Saturation', icon: '🎨', color: '#E76F51' }
            ];

            let cardsHtml = '';
            let changeCount = 0;

            adjustments.forEach(adj => {
                const rec = recs[adj.key];
                if (rec && rec.action && rec.action !== 'no change') {
                    changeCount++;
                    const arrow = rec.action.includes('increase') || rec.action === 'warmer' ? '↑' : '↓';
                    const amountClass = rec.amount === 'significant' ? 'high' : (rec.amount === 'moderate' ? 'medium' : 'low');
                    
                    cardsHtml += `
                        <div class="rec-card">
                            <div class="rec-icon" style="background: ${adj.color}">${adj.icon}</div>
                            <div class="rec-content">
                                <div class="rec-label">${adj.label}</div>
                                <div class="rec-action">
                                    <span class="rec-arrow ${rec.action.includes('increase') || rec.action === 'warmer' ? 'up' : 'down'}">${arrow}</span>
                                    <span class="rec-text">${rec.action}</span>
                                    <span class="rec-amount ${amountClass}">${rec.amount}</span>
                                </div>
                            </div>
                        </div>
                    `;
                } else if (rec) {
                    cardsHtml += `
                        <div class="rec-card no-change">
                            <div class="rec-icon" style="background: ${adj.color}; opacity: 0.5">${adj.icon}</div>
                            <div class="rec-content">
                                <div class="rec-label">${adj.label}</div>
                                <div class="rec-action">
                                    <span class="rec-text" style="color: var(--success)">✓ Looks good</span>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });

            recommendationList.innerHTML = cardsHtml;

            const matchScore = changeCount === 0 ? 95 : Math.max(30, 90 - (changeCount * 15));
            matchScoreSpan.textContent = matchScore + '%';

            let summaryHtml = '';
            if (recs.summary) {
                summaryHtml = `<div class="rec-summary"><strong>Summary:</strong> ${recs.summary}</div>`;
            }

            let analysisHtml = '<div class="analysis-comparison">';
            if (refAnalysis) {
                analysisHtml += `
                    <div class="analysis-col">
                        <h4>Reference Style</h4>
                        <div class="analysis-item"><span>Temperature:</span> <strong>${refAnalysis.temperature || 'N/A'}</strong></div>
                        <div class="analysis-item"><span>Brightness:</span> <strong>${refAnalysis.brightness || 'N/A'}</strong></div>
                        <div class="analysis-item"><span>Contrast:</span> <strong>${refAnalysis.contrast || 'N/A'}</strong></div>
                        <div class="analysis-item"><span>Saturation:</span> <strong>${refAnalysis.saturation || 'N/A'}</strong></div>
                        <div class="analysis-item"><span>Dominant:</span> <strong>${refAnalysis.dominant_color || 'N/A'}</strong></div>
                        <div class="analysis-item"><span>Mood:</span> <strong>${refAnalysis.mood || 'N/A'}</strong></div>
                    </div>
                `;
            }
            if (currentAnalysis) {
                analysisHtml += `
                    <div class="analysis-col">
                        <h4>Current Frame</h4>
                        <div class="analysis-item"><span>Temperature:</span> <strong>${currentAnalysis.temperature || 'N/A'}</strong></div>
                        <div class="analysis-item"><span>Brightness:</span> <strong>${currentAnalysis.brightness || 'N/A'}</strong></div>
                        <div class="analysis-item"><span>Contrast:</span> <strong>${currentAnalysis.contrast || 'N/A'}</strong></div>
                        <div class="analysis-item"><span>Saturation:</span> <strong>${currentAnalysis.saturation || 'N/A'}</strong></div>
                        <div class="analysis-item"><span>Dominant:</span> <strong>${currentAnalysis.dominant_color || 'N/A'}</strong></div>
                        <div class="analysis-item"><span>Mood:</span> <strong>${currentAnalysis.mood || 'N/A'}</strong></div>
                    </div>
                `;
            }
            analysisHtml += '</div>';

            analysisText.innerHTML = summaryHtml + analysisHtml;

        } else {
            recommendationList.innerHTML = `
                <div class="rec-card">
                    <div class="rec-content" style="width: 100%">
                        <div class="rec-label">AI Recommendation</div>
                        <div class="rec-text-block">${rawResponse}</div>
                    </div>
                </div>
            `;
            analysisText.innerHTML = '';
            matchScoreSpan.textContent = '-';
        }

        window.reasoningConsole.logInfo('Recommendations displayed');
    }

    presetItems.forEach(item => {
        item.addEventListener('click', () => {
            const profileFile = item.dataset.profile;
            const profileName = item.querySelector('span').textContent;
            
            presetItems.forEach(p => p.classList.remove('selected'));
            item.classList.add('selected');
            
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                referenceImage = canvas.toDataURL('image/jpeg', 0.9);
                
                referencePreview.src = referenceImage;
                referencePreview.classList.remove('hidden');
                uploadArea.classList.add('hidden');
                presetProfiles.classList.add('hidden');
                
                checkReadyState();
                updateStatus(`Selected "${profileName}" - Capture current frame`);
                window.reasoningConsole.logAction('Preset selected', profileName);
            };
            img.onerror = () => {
                updateStatus('Failed to load preset image', true);
                window.reasoningConsole.logError('Failed to load: ' + profileFile);
            };
            img.src = `../assets/color-profiles/${profileFile}`;
        });
    });

    uploadArea.addEventListener('click', () => referenceInput.click());
    referenceInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleReferenceUpload(e.target.files[0]);
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--primary)';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '';
        if (e.dataTransfer.files[0]) handleReferenceUpload(e.dataTransfer.files[0]);
    });

    captureBtn.addEventListener('click', captureCurrentFrame);
    analyzeBtn.addEventListener('click', analyzeAndCompare);

    const savedCameraIP = localStorage.getItem('ptz_camera_ip');
    if (savedCameraIP) {
        cameraIPInput.value = savedCameraIP;
    }

    const savedUseAuth = localStorage.getItem('ptz_use_auth') === 'true';
    const savedUsername = localStorage.getItem('ptz_auth_username') || '';
    const savedPassword = localStorage.getItem('ptz_auth_password') || '';
    
    useAuthCheckbox.checked = savedUseAuth;
    authFields.style.display = savedUseAuth ? 'block' : 'none';
    authUsernameInput.value = savedUsername;
    authPasswordInput.value = savedPassword;

    useAuthCheckbox.addEventListener('change', () => {
        authFields.style.display = useAuthCheckbox.checked ? 'block' : 'none';
        localStorage.setItem('ptz_use_auth', useAuthCheckbox.checked);
    });

    async function testPTZConnection() {
        const ip = cameraIPInput.value.trim();
        if (!ip) {
            updateStatus('Please enter camera IP', true);
            return;
        }

        localStorage.setItem('ptz_camera_ip', ip);
        
        const useAuth = useAuthCheckbox.checked;
        const username = authUsernameInput.value.trim();
        const password = authPasswordInput.value;
        
        localStorage.setItem('ptz_use_auth', useAuth);
        localStorage.setItem('ptz_auth_username', username);
        localStorage.setItem('ptz_auth_password', password);
        
        colorController = new PTZColorController(ip, {
            useAuth: useAuth,
            username: username,
            password: password
        });

        testConnectionBtn.disabled = true;
        connectionStatus.textContent = 'Testing...';
        connectionStatus.className = '';

        try {
            await colorController.setBrightness(8);
            connectionStatus.textContent = useAuth ? 'Connected (with auth)' : 'Connected';
            connectionStatus.className = 'connected';
            updateStatus('PTZ camera connected');
            window.reasoningConsole.logInfo(`PTZ connected at ${ip}${useAuth ? ' with authentication' : ''}`);
        } catch (error) {
            connectionStatus.textContent = 'Connection failed';
            connectionStatus.className = 'disconnected';
            updateStatus('PTZ connection failed - check IP and authentication', true);
            window.reasoningConsole.logError('PTZ connection failed: ' + error.message);
        } finally {
            testConnectionBtn.disabled = false;
        }
    }

    async function handleSliderChange(slider, settingName) {
        if (!colorController) return;

        const value = parseInt(slider.value);
        document.getElementById(`${settingName}Val`).textContent = value;

        try {
            switch (settingName) {
                case 'brightness':
                    await colorController.setBrightness(value);
                    break;
                case 'contrast':
                    await colorController.setContrast(value);
                    break;
                case 'saturation':
                    await colorController.setSaturation(value);
                    break;
                case 'sharpness':
                    await colorController.setSharpness(value);
                    break;
            }
        } catch (error) {
            window.reasoningConsole.logError(`${settingName} adjustment failed: ` + error.message);
        }
    }

    async function handleWhiteBalance(mode) {
        if (!colorController) {
            updateStatus('Connect to PTZ camera first', true);
            return;
        }

        try {
            await colorController.setWhiteBalance(mode);
            window.reasoningConsole.logInfo(`White balance set to ${mode}`);
        } catch (error) {
            window.reasoningConsole.logError('WB adjustment failed: ' + error.message);
        }
    }

    async function resetAll() {
        if (!colorController) {
            updateStatus('Connect to PTZ camera first', true);
            return;
        }

        try {
            await colorController.resetToDefaults();
            
            brightnessSlider.value = 8;
            document.getElementById('brightnessVal').textContent = 8;
            contrastSlider.value = 8;
            document.getElementById('contrastVal').textContent = 8;
            saturationSlider.value = 8;
            document.getElementById('saturationVal').textContent = 8;
            sharpnessSlider.value = 6;
            document.getElementById('sharpnessVal').textContent = 6;

            updateStatus('Reset to defaults');
            window.reasoningConsole.logAction('Reset to defaults');
        } catch (error) {
            updateStatus('Reset failed: ' + error.message, true);
        }
    }

    async function applyRecommendation() {
        if (!colorController) {
            updateStatus('Connect to PTZ camera first', true);
            return;
        }

        if (!currentRecommendations) {
            updateStatus('Run analysis first', true);
            return;
        }

        applyRecommendationBtn.disabled = true;
        updateStatus('Applying AI settings...');

        try {
            const recs = currentRecommendations;
            
            if (recs.brightness && recs.brightness.action !== 'no change') {
                const delta = recs.brightness.amount === 'significant' ? 3 : (recs.brightness.amount === 'moderate' ? 2 : 1);
                const newVal = Math.min(14, Math.max(0, 8 + (recs.brightness.action === 'increase' ? delta : -delta)));
                brightnessSlider.value = newVal;
                document.getElementById('brightnessVal').textContent = newVal;
                await colorController.setBrightness(newVal);
            }

            if (recs.contrast && recs.contrast.action !== 'no change') {
                const delta = recs.contrast.amount === 'significant' ? 3 : (recs.contrast.amount === 'moderate' ? 2 : 1);
                const newVal = Math.min(14, Math.max(0, 8 + (recs.contrast.action === 'increase' ? delta : -delta)));
                contrastSlider.value = newVal;
                document.getElementById('contrastVal').textContent = newVal;
                await colorController.setContrast(newVal);
            }

            if (recs.saturation && recs.saturation.action !== 'no change') {
                const delta = recs.saturation.amount === 'significant' ? 3 : (recs.saturation.amount === 'moderate' ? 2 : 1);
                const newVal = Math.min(14, Math.max(0, 8 + (recs.saturation.action === 'increase' ? delta : -delta)));
                saturationSlider.value = newVal;
                document.getElementById('saturationVal').textContent = newVal;
                await colorController.setSaturation(newVal);
            }

            if (recs.temperature && recs.temperature.action !== 'no change') {
                const wbMode = recs.temperature.action === 'warmer' ? 'indoor' : 'outdoor';
                await colorController.setWhiteBalance(wbMode);
            }

            updateStatus('AI settings applied');
            window.reasoningConsole.logAction('Applied AI recommendation');
        } catch (error) {
            updateStatus('Failed to apply settings: ' + error.message, true);
            window.reasoningConsole.logError('Apply failed: ' + error.message);
        } finally {
            applyRecommendationBtn.disabled = false;
        }
    }

    testConnectionBtn.addEventListener('click', testPTZConnection);
    resetBtn.addEventListener('click', resetAll);
    applyRecommendationBtn.addEventListener('click', applyRecommendation);

    let sliderTimeout;
    [brightnessSlider, contrastSlider, saturationSlider, sharpnessSlider].forEach(slider => {
        slider.addEventListener('input', () => {
            const name = slider.id;
            document.getElementById(`${name}Val`).textContent = slider.value;
            
            clearTimeout(sliderTimeout);
            sliderTimeout = setTimeout(() => handleSliderChange(slider, name), 150);
        });
    });

    document.querySelectorAll('.wb-btn').forEach(btn => {
        btn.addEventListener('click', () => handleWhiteBalance(btn.dataset.wb));
    });

    await initVideoSource();
});
