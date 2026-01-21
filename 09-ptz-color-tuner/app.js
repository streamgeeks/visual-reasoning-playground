document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const cameraSelect = document.getElementById('cameraSelect');
    const cameraIPInput = document.getElementById('cameraIP');
    const testConnectionBtn = document.getElementById('testConnectionBtn');
    const connectionStatus = document.getElementById('connectionStatus');
    const useAuthCheckbox = document.getElementById('useAuth');
    const authFields = document.getElementById('authFields');
    const authUsernameInput = document.getElementById('authUsername');
    const authPasswordInput = document.getElementById('authPassword');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const beforeSnapshot = document.getElementById('beforeSnapshot');
    const afterSnapshot = document.getElementById('afterSnapshot');
    const jsonOutput = document.getElementById('jsonOutput');
    const toneValue = document.getElementById('toneValue');
    const exposureValue = document.getElementById('exposureValue');
    const wbValue = document.getElementById('wbValue');
    const dominantValue = document.getElementById('dominantValue');
    const recommendation = document.getElementById('recommendation');
    const recommendationText = document.getElementById('recommendationText');
    const applyRecommendationBtn = document.getElementById('applyRecommendationBtn');
    const resetBtn = document.getElementById('resetBtn');
    const statusBar = document.getElementById('status');
    const analysisCountSpan = document.getElementById('analysisCount');
    const adjustmentCountSpan = document.getElementById('adjustmentCount');

    const brightnessSlider = document.getElementById('brightness');
    const contrastSlider = document.getElementById('contrast');
    const saturationSlider = document.getElementById('saturation');
    const sharpnessSlider = document.getElementById('sharpness');

    let client = null;
    let colorController = null;
    let analysisCount = 0;
    let adjustmentCount = 0;
    let currentRecommendation = null;

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

    async function enumerateCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            
            cameraSelect.innerHTML = '';
            
            if (videoDevices.length === 0) {
                cameraSelect.innerHTML = '<option value="">No cameras found</option>';
                return;
            }

            videoDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Camera ${index + 1}`;
                cameraSelect.appendChild(option);
            });

            const savedCamera = localStorage.getItem('preferred_camera');
            if (savedCamera) {
                cameraSelect.value = savedCamera;
            }
        } catch (error) {
            window.reasoningConsole.logError('Failed to enumerate cameras: ' + error.message);
        }
    }

    async function startCamera(deviceId = null) {
        try {
            window.reasoningConsole.logInfo('Starting camera...');
            
            const constraints = {
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            };

            if (deviceId) {
                constraints.video.deviceId = { exact: deviceId };
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            
            await new Promise(resolve => { video.onloadedmetadata = resolve; });

            updateStatus('Camera ready');
            window.reasoningConsole.logInfo(`Camera started: ${video.videoWidth}x${video.videoHeight}`);
            await enumerateCameras();
        } catch (error) {
            updateStatus('Camera error: ' + error.message, true);
            window.reasoningConsole.logError('Camera failed: ' + error.message);
        }
    }

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

    async function analyzeColors() {
        if (!client) {
            updateStatus('Configure Moondream API key first', true);
            window.apiKeyManager.showModal();
            return;
        }

        analyzeBtn.disabled = true;
        updateStatus('Analyzing colors...');
        window.reasoningConsole.logAction('Color analysis started');

        try {
            const imageData = client.captureFrame(video);
            beforeSnapshot.src = imageData;

            const startTime = Date.now();
            
            const prompt = `Analyze this image for video production color grading. Respond in JSON format with these exact fields:
{
  "overall_tone": "warm" or "cool" or "neutral",
  "exposure": "underexposed" or "good" or "overexposed",
  "white_balance_suggestion": "auto" or "indoor" or "outdoor",
  "dominant_color": the main color in the scene,
  "brightness_adjustment": number from -3 to +3 (0 means no change needed),
  "saturation_adjustment": number from -3 to +3,
  "recommendation": brief suggestion for improvement
}`;

            const result = await client.ask(imageData, prompt);
            const elapsed = Date.now() - startTime;
            window.reasoningConsole.logApiCall('/query', elapsed);

            let analysis;
            try {
                const jsonMatch = result.answer.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    analysis = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON found in response');
                }
            } catch (parseError) {
                analysis = {
                    overall_tone: 'neutral',
                    exposure: 'good',
                    white_balance_suggestion: 'auto',
                    dominant_color: 'unknown',
                    brightness_adjustment: 0,
                    saturation_adjustment: 0,
                    recommendation: result.answer
                };
            }

            displayAnalysis(analysis);
            
            analysisCount++;
            analysisCountSpan.textContent = analysisCount;
            updateStatus(`Analysis complete (${elapsed}ms)`);

        } catch (error) {
            updateStatus('Analysis failed: ' + error.message, true);
            window.reasoningConsole.logError('Analysis failed: ' + error.message);
        } finally {
            analyzeBtn.disabled = false;
        }
    }

    function displayAnalysis(analysis) {
        toneValue.textContent = analysis.overall_tone || '—';
        toneValue.className = `value ${analysis.overall_tone || ''}`;

        exposureValue.textContent = analysis.exposure || '—';
        exposureValue.className = `value ${analysis.exposure === 'good' ? 'good' : (analysis.exposure || '')}`;

        wbValue.textContent = analysis.white_balance_suggestion || '—';
        dominantValue.textContent = analysis.dominant_color || '—';

        jsonOutput.textContent = JSON.stringify(analysis, null, 2);

        if (analysis.recommendation) {
            recommendation.classList.remove('hidden');
            recommendationText.textContent = analysis.recommendation;
        }

        currentRecommendation = {
            brightness: 8 + (analysis.brightness_adjustment || 0),
            contrast: 8,
            saturation: 8 + (analysis.saturation_adjustment || 0),
            whiteBalance: analysis.white_balance_suggestion || 'auto'
        };
        
        applyRecommendationBtn.disabled = false;
        window.reasoningConsole.logDecision('Analysis complete', JSON.stringify(analysis));
    }

    async function applyRecommendation() {
        if (!colorController || !currentRecommendation) {
            updateStatus('No recommendation to apply', true);
            return;
        }

        applyRecommendationBtn.disabled = true;
        updateStatus('Applying AI settings...');

        try {
            await colorController.applyColorProfile(currentRecommendation);
            
            brightnessSlider.value = currentRecommendation.brightness;
            document.getElementById('brightnessVal').textContent = currentRecommendation.brightness;
            saturationSlider.value = currentRecommendation.saturation;
            document.getElementById('saturationVal').textContent = currentRecommendation.saturation;

            adjustmentCount++;
            adjustmentCountSpan.textContent = adjustmentCount;

            await new Promise(r => setTimeout(r, 500));
            afterSnapshot.src = client.captureFrame(video);

            updateStatus('AI settings applied');
            window.reasoningConsole.logAction('Applied AI recommendation', JSON.stringify(currentRecommendation));
        } catch (error) {
            updateStatus('Failed to apply settings: ' + error.message, true);
            window.reasoningConsole.logError('Apply failed: ' + error.message);
        } finally {
            applyRecommendationBtn.disabled = false;
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
            adjustmentCount++;
            adjustmentCountSpan.textContent = adjustmentCount;
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
            adjustmentCount++;
            adjustmentCountSpan.textContent = adjustmentCount;
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

            adjustmentCount++;
            adjustmentCountSpan.textContent = adjustmentCount;
            updateStatus('Reset to defaults');
            window.reasoningConsole.logAction('Reset to defaults');
        } catch (error) {
            updateStatus('Reset failed: ' + error.message, true);
        }
    }

    function updateStatus(message, isError = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }

    cameraSelect.addEventListener('change', () => {
        localStorage.setItem('preferred_camera', cameraSelect.value);
        startCamera(cameraSelect.value);
    });

    testConnectionBtn.addEventListener('click', testPTZConnection);
    analyzeBtn.addEventListener('click', analyzeColors);
    applyRecommendationBtn.addEventListener('click', applyRecommendation);
    resetBtn.addEventListener('click', resetAll);

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

    await enumerateCameras();
    await startCamera();
});
