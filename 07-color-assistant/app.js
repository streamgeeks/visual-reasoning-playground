document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const apiKeyInput = document.getElementById('apiKey');
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

    let client = null;
    let referenceImage = null;
    let currentImage = null;

    function loadSettings() {
        const savedKey = localStorage.getItem('moondreamApiKey');
        if (savedKey) apiKeyInput.value = savedKey;
        client = new MoondreamClient(savedKey);
    }

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: false
            });
            video.srcObject = stream;
            updateStatus('Camera ready - Upload a reference image');
        } catch (error) {
            updateStatus('Camera error: ' + error.message, true);
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
            checkReadyState();
            updateStatus('Reference uploaded - Capture current frame');
        };
        reader.readAsDataURL(file);
    }

    function captureCurrentFrame() {
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
    }

    function checkReadyState() {
        analyzeBtn.disabled = !(referenceImage && currentImage && apiKeyInput.value);
    }

    async function analyzeAndCompare() {
        if (!referenceImage || !currentImage) return;

        client.setApiKey(apiKeyInput.value);
        localStorage.setItem('moondreamApiKey', apiKeyInput.value);

        analyzeBtn.disabled = true;
        updateStatus('Analyzing images...');

        const startTime = Date.now();

        try {
            const refAnalysis = await client.ask(referenceImage, `
                Analyze this image's visual style. Describe:
                1. Overall color temperature (warm/neutral/cool)
                2. Saturation level (low/medium/high)
                3. Contrast level (low/medium/high)
                4. Brightness level (dark/medium/bright)
                5. Any dominant colors
                6. Overall mood/aesthetic
            `);

            const currentAnalysis = await client.ask(currentImage, `
                Analyze this image's visual style. Describe:
                1. Overall color temperature (warm/neutral/cool)
                2. Saturation level (low/medium/high)
                3. Contrast level (low/medium/high)
                4. Brightness level (dark/medium/bright)
                5. Any dominant colors
                6. Overall mood/aesthetic
            `);

            const comparison = await client.ask(referenceImage, `
                Compare these two style descriptions and provide specific camera adjustments to make the second match the first:
                
                TARGET STYLE: ${refAnalysis.answer}
                
                CURRENT STYLE: ${currentAnalysis.answer}
                
                Provide specific recommendations like:
                - Color temperature: increase/decrease by amount
                - Saturation: increase/decrease by amount
                - Brightness: increase/decrease by amount
                - Contrast: increase/decrease by amount
            `);

            const elapsed = Date.now() - startTime;
            analysisTimeSpan.textContent = (elapsed / 1000).toFixed(1) + 's';

            displayRecommendations(comparison.answer, refAnalysis.answer, currentAnalysis.answer);
            updateStatus('Analysis complete');

        } catch (error) {
            updateStatus('Error: ' + error.message, true);
        } finally {
            analyzeBtn.disabled = false;
        }
    }

    function displayRecommendations(comparison, refStyle, currentStyle) {
        recommendationsDiv.classList.remove('hidden');

        const recommendations = parseRecommendations(comparison);
        
        recommendationList.innerHTML = recommendations.map(rec => `
            <div class="recommendation-item">
                <div class="icon ${rec.iconClass}">${rec.icon}</div>
                <div>
                    <strong>${rec.setting}</strong>
                    <p style="margin: 0; color: var(--text-muted); font-size: 0.85rem;">${rec.action}</p>
                </div>
            </div>
        `).join('');

        analysisText.innerHTML = `
            <p><strong>Reference Style:</strong> ${refStyle}</p>
            <hr style="border-color: var(--surface-light); margin: 10px 0;">
            <p><strong>Current Style:</strong> ${currentStyle}</p>
            <hr style="border-color: var(--surface-light); margin: 10px 0;">
            <p><strong>Recommendations:</strong> ${comparison}</p>
        `;

        const matchScore = calculateMatchScore(refStyle, currentStyle);
        matchScoreSpan.textContent = matchScore + '%';
    }

    function parseRecommendations(text) {
        const recommendations = [];
        const lower = text.toLowerCase();

        if (lower.includes('temperature') || lower.includes('warm') || lower.includes('cool')) {
            recommendations.push({
                setting: 'Color Temperature',
                action: extractAction(text, ['temperature', 'warm', 'cool', 'white balance']),
                icon: '🌡️',
                iconClass: 'rec-color'
            });
        }

        if (lower.includes('brightness') || lower.includes('exposure') || lower.includes('bright') || lower.includes('dark')) {
            recommendations.push({
                setting: 'Brightness',
                action: extractAction(text, ['brightness', 'exposure', 'brighter', 'darker']),
                icon: '☀️',
                iconClass: 'rec-brightness'
            });
        }

        if (lower.includes('contrast')) {
            recommendations.push({
                setting: 'Contrast',
                action: extractAction(text, ['contrast']),
                icon: '◐',
                iconClass: 'rec-contrast'
            });
        }

        if (lower.includes('saturation') || lower.includes('vibran')) {
            recommendations.push({
                setting: 'Saturation',
                action: extractAction(text, ['saturation', 'vibrance', 'vivid']),
                icon: '🎨',
                iconClass: 'rec-saturation'
            });
        }

        if (recommendations.length === 0) {
            recommendations.push({
                setting: 'General',
                action: text.substring(0, 100) + '...',
                icon: '📷',
                iconClass: 'rec-color'
            });
        }

        return recommendations;
    }

    function extractAction(text, keywords) {
        const sentences = text.split(/[.!?]+/);
        for (const sentence of sentences) {
            const lower = sentence.toLowerCase();
            if (keywords.some(k => lower.includes(k))) {
                return sentence.trim();
            }
        }
        return 'Adjust as needed';
    }

    function calculateMatchScore(ref, current) {
        const refWords = new Set(ref.toLowerCase().split(/\s+/));
        const currentWords = new Set(current.toLowerCase().split(/\s+/));
        let matches = 0;
        refWords.forEach(word => {
            if (currentWords.has(word) && word.length > 3) matches++;
        });
        return Math.min(95, Math.round((matches / Math.max(refWords.size, 1)) * 100) + 30);
    }

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
    apiKeyInput.addEventListener('change', () => {
        localStorage.setItem('moondreamApiKey', apiKeyInput.value);
        checkReadyState();
    });

    loadSettings();
    await startCamera();
});
