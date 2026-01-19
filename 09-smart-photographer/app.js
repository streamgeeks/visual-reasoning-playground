document.addEventListener('DOMContentLoaded', async function() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const captureFlash = document.getElementById('captureFlash');
    const targetInput = document.getElementById('targetObject');
    const rateSlider = document.getElementById('detectionRate');
    const rateValueSpan = document.getElementById('rateValue');
    const cooldownSlider = document.getElementById('cooldown');
    const cooldownValueSpan = document.getElementById('cooldownValue');
    const playSoundCheckbox = document.getElementById('playSound');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const statusBar = document.getElementById('status');
    const captureIndicator = document.getElementById('captureIndicator');
    const captureStatus = document.getElementById('captureStatus');
    const photoGallery = document.getElementById('photoGallery');
    const photoCountSpan = document.getElementById('photoCount');
    const totalCapturesSpan = document.getElementById('totalCaptures');
    const detectionsCountSpan = document.getElementById('detectionsCount');
    const clearGalleryBtn = document.getElementById('clearGalleryBtn');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxClose = document.getElementById('lightboxClose');

    let client = null;
    let watchLoop = null;
    let isWatching = false;
    let lastCaptureTime = 0;
    let photos = [];
    let totalDetections = 0;

    const shutterSound = new Audio('data:audio/wav;base64,UklGRl9vT19teleVBXSFXBZMhZQVDTXVHRlJBT1VYXVZ5bWOSsq2UjYyLjIqKi4yNjY6PkJGSkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8=');

    window.apiKeyManager = new APIKeyManager({
        requireMoondream: true,
        requireOpenAI: false,
        onKeysChanged: (keys) => {
            if (keys.moondream) {
                client = new MoondreamClient(keys.moondream);
                window.reasoningConsole.logInfo('Moondream API key configured');
                updateStatus('Ready to capture');
            }
        }
    });

    window.reasoningConsole = new ReasoningConsole({ startCollapsed: false });

    if (window.apiKeyManager.hasMoondreamKey()) {
        client = new MoondreamClient(window.apiKeyManager.getMoondreamKey());
    }

    async function startCamera() {
        try {
            window.reasoningConsole.logInfo('Requesting camera access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: false
            });
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            };
            window.reasoningConsole.logInfo('Camera connected');
            updateStatus('Camera ready');
        } catch (error) {
            window.reasoningConsole.logError('Camera access denied: ' + error.message);
            updateStatus('Camera error: ' + error.message, true);
        }
    }

    function updateStatus(message, isError = false) {
        statusBar.textContent = message;
        statusBar.className = 'status-bar' + (isError ? ' error' : '');
    }

    function capturePhoto(trigger) {
        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = video.videoWidth;
        captureCanvas.height = video.videoHeight;
        const captureCtx = captureCanvas.getContext('2d');
        captureCtx.drawImage(video, 0, 0);
        
        const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.9);
        const timestamp = new Date();
        
        const photo = {
            id: Date.now(),
            dataUrl: dataUrl,
            trigger: trigger,
            timestamp: timestamp,
            timeString: timestamp.toLocaleTimeString()
        };
        
        photos.unshift(photo);
        lastCaptureTime = Date.now();
        
        captureFlash.classList.add('flash');
        setTimeout(() => captureFlash.classList.remove('flash'), 300);
        
        if (playSoundCheckbox.checked) {
            shutterSound.currentTime = 0;
            shutterSound.play().catch(() => {});
        }
        
        updateGallery();
        totalCapturesSpan.textContent = photos.length;
        photoCountSpan.textContent = photos.length;
        
        window.reasoningConsole.logAction('Photo captured', `Triggered by: ${trigger}`);
        
        return photo;
    }

    function updateGallery() {
        if (photos.length === 0) {
            photoGallery.innerHTML = '<div class="empty-gallery">Photos will appear here when captured</div>';
            return;
        }
        
        photoGallery.innerHTML = photos.map(photo => `
            <div class="photo-item" data-id="${photo.id}">
                <img src="${photo.dataUrl}" alt="Captured photo">
                <button class="download-btn" data-id="${photo.id}">⬇ Save</button>
                <div class="photo-info">
                    <span class="photo-trigger">${photo.trigger}</span>
                    ${photo.timeString}
                </div>
            </div>
        `).join('');
        
        photoGallery.querySelectorAll('.photo-item img').forEach(img => {
            img.addEventListener('click', (e) => {
                const item = e.target.closest('.photo-item');
                const photo = photos.find(p => p.id === parseInt(item.dataset.id));
                if (photo) {
                    lightboxImg.src = photo.dataUrl;
                    lightbox.classList.add('active');
                }
            });
        });
        
        photoGallery.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const photo = photos.find(p => p.id === parseInt(btn.dataset.id));
                if (photo) {
                    downloadPhoto(photo);
                }
            });
        });
    }

    function downloadPhoto(photo) {
        const link = document.createElement('a');
        link.href = photo.dataUrl;
        link.download = `smart-photo-${photo.id}.jpg`;
        link.click();
        window.reasoningConsole.logInfo('Photo downloaded');
    }

    async function checkForTarget() {
        if (!client || !targetInput.value.trim()) return;
        
        const cooldownMs = parseInt(cooldownSlider.value) * 1000;
        const timeSinceCapture = Date.now() - lastCaptureTime;
        const inCooldown = timeSinceCapture < cooldownMs;
        
        if (inCooldown) {
            const remaining = Math.ceil((cooldownMs - timeSinceCapture) / 1000);
            captureStatus.textContent = `Cooldown: ${remaining}s`;
            return;
        }
        
        captureStatus.textContent = 'Scanning...';
        
        try {
            const result = await client.detectInVideo(video, targetInput.value);
            totalDetections++;
            detectionsCountSpan.textContent = totalDetections;
            
            window.reasoningConsole.logApiCall('/detect', 0);
            
            if (result.objects.length > 0) {
                window.reasoningConsole.logDetection(targetInput.value, result.objects.length, 0.9);
                captureStatus.textContent = `Found ${result.objects.length} - Capturing!`;
                captureIndicator.classList.remove('idle');
                
                drawDetections(result.objects);
                capturePhoto(targetInput.value);
                
                updateStatus(`Captured! Found ${result.objects.length} "${targetInput.value}"`);
            } else {
                captureStatus.textContent = 'Watching...';
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            
        } catch (error) {
            window.reasoningConsole.logError(error.message);
            captureStatus.textContent = 'Error - retrying...';
        }
    }

    function drawDetections(objects) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#2A9D8F';
        ctx.lineWidth = 3;
        ctx.font = 'bold 16px system-ui';
        
        objects.forEach((obj, index) => {
            const x = obj.x_min * canvas.width;
            const y = obj.y_min * canvas.height;
            const w = (obj.x_max - obj.x_min) * canvas.width;
            const h = (obj.y_max - obj.y_min) * canvas.height;
            
            ctx.strokeRect(x, y, w, h);
            
            ctx.fillStyle = '#2A9D8F';
            const label = `📸 ${targetInput.value}`;
            const textWidth = ctx.measureText(label).width;
            ctx.fillRect(x, y - 24, textWidth + 10, 24);
            
            ctx.fillStyle = '#fff';
            ctx.fillText(label, x + 5, y - 6);
        });
    }

    function startWatching() {
        if (!client) {
            updateStatus('Please configure API key', true);
            window.apiKeyManager.showModal();
            return;
        }
        
        if (!targetInput.value.trim()) {
            updateStatus('Please enter what to capture', true);
            return;
        }
        
        isWatching = true;
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        captureIndicator.classList.remove('idle');
        
        const rate = parseFloat(rateSlider.value);
        const interval = 1000 / rate;
        
        window.reasoningConsole.logInfo(`Started watching for "${targetInput.value}" at ${rate}/sec`);
        updateStatus(`Watching for "${targetInput.value}"...`);
        
        const loop = async () => {
            if (!isWatching) return;
            await checkForTarget();
            if (isWatching) {
                watchLoop = setTimeout(loop, interval);
            }
        };
        loop();
    }

    function stopWatching() {
        isWatching = false;
        clearTimeout(watchLoop);
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        captureIndicator.classList.add('idle');
        captureStatus.textContent = 'Ready to capture';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        window.reasoningConsole.logInfo('Stopped watching');
        updateStatus('Stopped');
    }

    function clearGallery() {
        photos = [];
        totalDetections = 0;
        updateGallery();
        totalCapturesSpan.textContent = '0';
        detectionsCountSpan.textContent = '0';
        photoCountSpan.textContent = '0';
        window.reasoningConsole.logInfo('Gallery cleared');
    }

    rateSlider.addEventListener('input', () => {
        rateValueSpan.textContent = parseFloat(rateSlider.value).toFixed(1);
    });

    cooldownSlider.addEventListener('input', () => {
        cooldownValueSpan.textContent = cooldownSlider.value;
    });

    startBtn.addEventListener('click', startWatching);
    stopBtn.addEventListener('click', stopWatching);
    clearGalleryBtn.addEventListener('click', clearGallery);
    
    lightboxClose.addEventListener('click', () => {
        lightbox.classList.remove('active');
    });
    
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.classList.remove('active');
        }
    });

    window.reasoningConsole.logInfo('Smart AI Photographer initialized');
    await startCamera();
});
