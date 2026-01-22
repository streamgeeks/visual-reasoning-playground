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

    async function startCamera() {
        try {
            window.reasoningConsole.logInfo('Requesting camera access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: false
            });
            video.srcObject = stream;
            updateStatus('Camera ready - Upload a reference image');
            window.reasoningConsole.logInfo('Camera initialized successfully');
        } catch (error) {
            updateStatus('Camera error: ' + error.message, true);
            window.reasoningConsole.logError('Camera access failed: ' + error.message);
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

    await startCamera();
});
