$(function () {
    let detector = null;
    let ptzController = null;
    let video = null;
    let canvas = null;
    let ctx = null;
    let isTracking = false;
    let detectionInterval = null;
    let currentDetection = null;
    
    const operationPresets = {
        smooth: {
            name: 'Smooth Tracking',
            description: 'Slow, graceful movements for broadcast',
            detectionRate: 0.5,
            panSpeed: 3,
            tiltSpeed: 3,
            deadzoneX: 12,
            deadzoneY: 12
        },
        precise: {
            name: 'Precise Centering',
            description: 'Tight centering for presentations',
            detectionRate: 1.5,
            panSpeed: 6,
            tiltSpeed: 6,
            deadzoneX: 2,
            deadzoneY: 2
        },
        balanced: {
            name: 'Balanced',
            description: 'Good balance for general use',
            detectionRate: 1.0,
            panSpeed: 5,
            tiltSpeed: 5,
            deadzoneX: 5,
            deadzoneY: 5
        },
        fast: {
            name: 'Fast Response',
            description: 'Quick movements for sports/action',
            detectionRate: 2.0,
            panSpeed: 8,
            tiltSpeed: 8,
            deadzoneX: 8,
            deadzoneY: 8
        },
        minimal: {
            name: 'Minimal Movement',
            description: 'Reduce API usage and camera movement',
            detectionRate: 0.3,
            panSpeed: 4,
            tiltSpeed: 4,
            deadzoneX: 15,
            deadzoneY: 15
        }
    };

    let settings = {
        moondreamApiKey: localStorage.getItem('moondreamApiKey') || '',
        cameraIP: localStorage.getItem('cameraIP') || '192.168.1.19',
        targetObject: localStorage.getItem('targetObject') || '',
        operationStyle: localStorage.getItem('operationStyle') || 'balanced',
        detectionRate: parseFloat(localStorage.getItem('detectionRate')) || 1.0,
        selectedWebcam: localStorage.getItem('selectedWebcam') || '',
        cameraWidth: 1920,
        cameraHeight: 1080,
        panSpeed: parseInt(localStorage.getItem('panSpeed')) || 5,
        tiltSpeed: parseInt(localStorage.getItem('tiltSpeed')) || 5,
        centerOffsetX: parseFloat(localStorage.getItem('centerOffsetX')) || 50,
        centerOffsetY: parseFloat(localStorage.getItem('centerOffsetY')) || 50,
        deadzoneX: parseFloat(localStorage.getItem('deadzoneX')) || 5,
        deadzoneY: parseFloat(localStorage.getItem('deadzoneY')) || 5,
        autoZoomEnabled: localStorage.getItem('autoZoomEnabled') === 'true',
        minHeadroom: parseFloat(localStorage.getItem('minHeadroom')) || 10,
        maxHeadroom: parseFloat(localStorage.getItem('maxHeadroom')) || 30,
        zoomSpeed: parseInt(localStorage.getItem('zoomSpeed')) || 3
    };
    
    let availableCameras = [];

    let prevTime;
    let pastFrameTimes = [];

    async function enumerateCameras() {
        try {
            await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const devices = await navigator.mediaDevices.enumerateDevices();
            availableCameras = devices.filter(device => device.kind === 'videoinput');
            
            const $select = $('#webcamSelect');
            $select.empty();
            
            if (availableCameras.length === 0) {
                $select.append('<option value="">No cameras found</option>');
                return;
            }
            
            availableCameras.forEach((camera, index) => {
                const label = camera.label || `Camera ${index + 1}`;
                const selected = camera.deviceId === settings.selectedWebcam ? 'selected' : '';
                $select.append(`<option value="${camera.deviceId}" ${selected}>${label}</option>`);
            });
            
            if (!settings.selectedWebcam && availableCameras.length > 0) {
                settings.selectedWebcam = availableCameras[0].deviceId;
            }
            
            window.reasoningConsole.logInfo(`Found ${availableCameras.length} camera(s)`);
        } catch (error) {
            $('#webcamSelect').html('<option value="">Camera access denied</option>');
            window.reasoningConsole.logError('Failed to enumerate cameras: ' + error.message);
        }
    }

    async function init() {
        video = $('#video')[0];
        
        window.apiKeyManager = new APIKeyManager({
            requireMoondream: true,
            requireOpenAI: false,
            onKeysChanged: (keys) => {
                if (keys.moondream) {
                    settings.moondreamApiKey = keys.moondream;
                    detector = new MoondreamDetector(keys.moondream);
                    window.reasoningConsole.logInfo('Moondream API key configured');
                }
            }
        });

        window.reasoningConsole = new ReasoningConsole({ startCollapsed: true });

        if (window.apiKeyManager.hasMoondreamKey()) {
            settings.moondreamApiKey = window.apiKeyManager.getMoondreamKey();
            detector = new MoondreamDetector(settings.moondreamApiKey);
            window.reasoningConsole.logInfo('Loaded saved Moondream API key');
        } else {
            detector = new MoondreamDetector(settings.moondreamApiKey);
        }
        
        $('#cameraIP').val(settings.cameraIP);
        $('#targetObject').val(settings.targetObject);
        $('#operationStyle').val(settings.operationStyle);
        $('#detectionRate').val(settings.detectionRate);
        $('#detectionRateValue').text(settings.detectionRate.toFixed(1));
        
        $('#panSpeed').val(settings.panSpeed);
        $('#panSpeedValue').text(settings.panSpeed);
        $('#tiltSpeed').val(settings.tiltSpeed);
        $('#tiltSpeedValue').text(settings.tiltSpeed);
        $('#centerOffsetX').val(settings.centerOffsetX);
        $('#centerOffsetXValue').text(settings.centerOffsetX);
        $('#centerOffsetY').val(settings.centerOffsetY);
        $('#centerOffsetYValue').text(settings.centerOffsetY);
        $('#deadzoneX').val(settings.deadzoneX);
        $('#deadzoneXValue').text(settings.deadzoneX);
        $('#deadzoneY').val(settings.deadzoneY);
        $('#deadzoneYValue').text(settings.deadzoneY);
        
        $('#autoZoomEnabled').prop('checked', settings.autoZoomEnabled);
        $('#minHeadroom').val(settings.minHeadroom);
        $('#minHeadroomValue').text(settings.minHeadroom);
        $('#maxHeadroom').val(settings.maxHeadroom);
        $('#maxHeadroomValue').text(settings.maxHeadroom);
        $('#zoomSpeed').val(settings.zoomSpeed);
        $('#zoomSpeedValue').text(settings.zoomSpeed);
        
        ptzController = new PTZController(settings.cameraIP);
        
        ptzController.setSpeed({
            pan: settings.panSpeed,
            tilt: settings.tiltSpeed,
            zoom: settings.zoomSpeed
        });
        ptzController.setCenterOffset({
            horizontal: settings.centerOffsetX,
            vertical: settings.centerOffsetY
        });
        ptzController.setDeadzone({
            horizontal: settings.deadzoneX,
            vertical: settings.deadzoneY
        });
        
        setupEventListeners();
        
        await enumerateCameras();
        await startVideoStream();
        
        resizeCanvas();
        renderDeadzone();
        
        updateStatus('Ready. Configure settings and click Start Tracking.');
        window.reasoningConsole.logInfo('PTZ Tracker initialized');
    }

    function setupEventListeners() {
        $('#webcamSelect').on('change', async function() {
            settings.selectedWebcam = $(this).val();
            localStorage.setItem('selectedWebcam', settings.selectedWebcam);
            window.reasoningConsole.logInfo('Switching webcam...');
            await startVideoStream();
        });
        
        $('#refreshCamerasBtn').on('click', async function() {
            window.reasoningConsole.logInfo('Refreshing camera list...');
            await enumerateCameras();
        });
        
        $('#cameraIP').on('change', function() {
            settings.cameraIP = $(this).val();
            localStorage.setItem('cameraIP', settings.cameraIP);
            ptzController.setCameraIP(settings.cameraIP);
            window.reasoningConsole.logInfo(`Camera IP set to ${settings.cameraIP}`);
        });
        
        $('#targetObject').on('change', function() {
            settings.targetObject = $(this).val();
            localStorage.setItem('targetObject', settings.targetObject);
            window.reasoningConsole.logInfo(`Target object: ${settings.targetObject}`);
        });
        
        $('#operationStyle').on('change', function() {
            const style = $(this).val();
            settings.operationStyle = style;
            localStorage.setItem('operationStyle', style);
            
            if (style !== 'custom' && operationPresets[style]) {
                applyOperationPreset(style);
            }
        });
        
        $('#detectionRate').on('input', function() {
            const rate = parseFloat($(this).val());
            settings.detectionRate = rate;
            $('#detectionRateValue').text(rate.toFixed(1));
            localStorage.setItem('detectionRate', rate.toString());
            switchToCustomMode();
            
            if (isTracking) {
                clearInterval(detectionInterval);
                const intervalMs = 1000 / rate;
                detectionInterval = setInterval(detectionLoop, intervalMs);
                updateStatus(`Detection rate updated to ${rate.toFixed(1)}/sec`);
                window.reasoningConsole.logInfo(`Detection rate: ${rate.toFixed(1)}/sec`);
            }
        });
        
        $('#panSpeed').on('input', function() {
            const speed = parseInt($(this).val());
            settings.panSpeed = speed;
            $('#panSpeedValue').text(speed);
            localStorage.setItem('panSpeed', speed.toString());
            ptzController.setSpeed({ pan: speed });
            switchToCustomMode();
        });
        
        $('#tiltSpeed').on('input', function() {
            const speed = parseInt($(this).val());
            settings.tiltSpeed = speed;
            $('#tiltSpeedValue').text(speed);
            localStorage.setItem('tiltSpeed', speed.toString());
            ptzController.setSpeed({ tilt: speed });
            switchToCustomMode();
        });
        
        $('#centerOffsetX').on('input', function() {
            const val = parseFloat($(this).val());
            settings.centerOffsetX = val;
            $('#centerOffsetXValue').text(val);
            localStorage.setItem('centerOffsetX', val.toString());
            ptzController.setCenterOffset({ horizontal: val });
            renderDeadzone();
        });
        
        $('#centerOffsetY').on('input', function() {
            const val = parseFloat($(this).val());
            settings.centerOffsetY = val;
            $('#centerOffsetYValue').text(val);
            localStorage.setItem('centerOffsetY', val.toString());
            ptzController.setCenterOffset({ vertical: val });
            renderDeadzone();
        });
        
        $('#deadzoneX').on('input', function() {
            const val = parseFloat($(this).val());
            settings.deadzoneX = val;
            $('#deadzoneXValue').text(val);
            localStorage.setItem('deadzoneX', val.toString());
            ptzController.setDeadzone({ horizontal: val });
            switchToCustomMode();
            renderDeadzone();
        });
        
        $('#deadzoneY').on('input', function() {
            const val = parseFloat($(this).val());
            settings.deadzoneY = val;
            $('#deadzoneYValue').text(val);
            localStorage.setItem('deadzoneY', val.toString());
            ptzController.setDeadzone({ vertical: val });
            switchToCustomMode();
            renderDeadzone();
        });
        
        $('#autoZoomEnabled').on('change', function() {
            settings.autoZoomEnabled = $(this).is(':checked');
            localStorage.setItem('autoZoomEnabled', settings.autoZoomEnabled.toString());
            window.reasoningConsole.logInfo(`Auto-zoom ${settings.autoZoomEnabled ? 'enabled' : 'disabled'}`);
        });
        
        $('#minHeadroom').on('input', function() {
            const val = parseFloat($(this).val());
            settings.minHeadroom = val;
            $('#minHeadroomValue').text(val);
            localStorage.setItem('minHeadroom', val.toString());
        });
        
        $('#maxHeadroom').on('input', function() {
            const val = parseFloat($(this).val());
            settings.maxHeadroom = val;
            $('#maxHeadroomValue').text(val);
            localStorage.setItem('maxHeadroom', val.toString());
        });
        
        $('#zoomSpeed').on('input', function() {
            const val = parseInt($(this).val());
            settings.zoomSpeed = val;
            $('#zoomSpeedValue').text(val);
            localStorage.setItem('zoomSpeed', val.toString());
            ptzController.setSpeed({ zoom: val });
        });
        
        $('#toggleAdvanced').on('click', function() {
            $('#advancedSettings').slideToggle(300);
        });
        
        $('#startBtn').on('click', startTracking);
        $('#stopBtn').on('click', stopTracking);
        
        $(window).on('resize', resizeCanvas);
        
        setupManualPTZControls();
    }
    
    function setupManualPTZControls() {
        const ptzButtons = {
            '#ptzUp': () => ptzController.tiltUp(),
            '#ptzDown': () => ptzController.tiltDown(),
            '#ptzLeft': () => ptzController.panLeft(),
            '#ptzRight': () => ptzController.panRight(),
            '#ptzZoomIn': () => ptzController.zoomIn(),
            '#ptzZoomOut': () => ptzController.zoomOut(),
            '#ptzHome': () => ptzController.home()
        };
        
        Object.entries(ptzButtons).forEach(([selector, action]) => {
            const $btn = $(selector);
            
            $btn.on('mousedown touchstart', async function(e) {
                e.preventDefault();
                if (!settings.cameraIP) {
                    updateStatus('Enter PTZ camera IP first', true);
                    return;
                }
                await action();
            });
            
            $btn.on('mouseup mouseleave touchend', async function(e) {
                e.preventDefault();
                if (selector !== '#ptzHome' && ptzController) {
                    await ptzController.stop();
                }
            });
        });
    }

    function applyOperationPreset(style) {
        const preset = operationPresets[style];
        if (!preset) return;
        
        settings.detectionRate = preset.detectionRate;
        $('#detectionRate').val(preset.detectionRate);
        $('#detectionRateValue').text(preset.detectionRate.toFixed(1));
        localStorage.setItem('detectionRate', preset.detectionRate.toString());
        
        settings.panSpeed = preset.panSpeed;
        $('#panSpeed').val(preset.panSpeed);
        $('#panSpeedValue').text(preset.panSpeed);
        localStorage.setItem('panSpeed', preset.panSpeed.toString());
        ptzController.setSpeed({ pan: preset.panSpeed });
        
        settings.tiltSpeed = preset.tiltSpeed;
        $('#tiltSpeed').val(preset.tiltSpeed);
        $('#tiltSpeedValue').text(preset.tiltSpeed);
        localStorage.setItem('tiltSpeed', preset.tiltSpeed.toString());
        ptzController.setSpeed({ tilt: preset.tiltSpeed });
        
        settings.deadzoneX = preset.deadzoneX;
        $('#deadzoneX').val(preset.deadzoneX);
        $('#deadzoneXValue').text(preset.deadzoneX);
        localStorage.setItem('deadzoneX', preset.deadzoneX.toString());
        ptzController.setDeadzone({ horizontal: preset.deadzoneX });
        
        settings.deadzoneY = preset.deadzoneY;
        $('#deadzoneY').val(preset.deadzoneY);
        $('#deadzoneYValue').text(preset.deadzoneY);
        localStorage.setItem('deadzoneY', preset.deadzoneY.toString());
        ptzController.setDeadzone({ vertical: preset.deadzoneY });
        
        if (isTracking) {
            clearInterval(detectionInterval);
            const intervalMs = 1000 / preset.detectionRate;
            detectionInterval = setInterval(detectionLoop, intervalMs);
        }
        
        renderDeadzone();
        updateStatus(`Applied ${preset.name} preset`);
        window.reasoningConsole.logInfo(`Applied preset: ${preset.name}`);
    }
    
    function switchToCustomMode() {
        if (settings.operationStyle !== 'custom') {
            settings.operationStyle = 'custom';
            $('#operationStyle').val('custom');
            localStorage.setItem('operationStyle', 'custom');
        }
    }

    async function startVideoStream() {
        try {
            if (video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
            }
            
            window.reasoningConsole.logInfo('Requesting camera access...');
            
            const videoConstraints = {
                width: settings.cameraWidth,
                height: settings.cameraHeight
            };
            
            if (settings.selectedWebcam) {
                videoConstraints.deviceId = { exact: settings.selectedWebcam };
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: videoConstraints
            });
            
            video.srcObject = stream;
            
            const track = stream.getVideoTracks()[0];
            const cameraLabel = track.label || 'Unknown camera';
            window.reasoningConsole.logInfo(`Camera stream established: ${cameraLabel}`);
            
            return new Promise((resolve) => {
                video.onloadeddata = function () {
                    video.play();
                    resolve();
                };
            });
        } catch (error) {
            updateStatus('Error: Could not access camera - ' + error.message, true);
            window.reasoningConsole.logError('Camera access failed: ' + error.message);
            throw error;
        }
    }

    function videoDimensions(video) {
        const videoRatio = video.videoWidth / video.videoHeight;
        let width = video.offsetWidth;
        let height = video.offsetHeight;
        const elementRatio = width / height;
        
        if (elementRatio > videoRatio) {
            width = height * videoRatio;
        } else {
            height = width / videoRatio;
        }
        
        return { width, height };
    }

    function resizeCanvas() {
        if (!video) return;
        
        $('canvas').remove();
        canvas = $('<canvas/>');
        ctx = canvas[0].getContext('2d');
        
        const dimensions = videoDimensions(video);
        
        canvas[0].width = video.videoWidth;
        canvas[0].height = video.videoHeight;
        
        canvas.css({
            width: dimensions.width,
            height: dimensions.height,
            left: ($(window).width() - dimensions.width) / 2,
            top: ($(window).height() - dimensions.height) / 2
        });
        
        $('body').append(canvas);
        renderDeadzone();
    }

    async function startTracking() {
        if (!window.apiKeyManager.hasMoondreamKey()) {
            updateStatus('Error: Please configure Moondream API key', true);
            window.apiKeyManager.showModal();
            return;
        }
        
        if (!settings.targetObject) {
            updateStatus('Error: Please enter target object description', true);
            return;
        }
        
        if (!settings.cameraIP) {
            updateStatus('Error: Please enter PTZ camera IP address', true);
            return;
        }
        
        isTracking = true;
        $('#startBtn').prop('disabled', true);
        $('#stopBtn').prop('disabled', false);
        $('.settings-input').prop('disabled', true);
        $('#detectionRate').prop('disabled', true);
        
        updateStatus(`Tracking started at ${settings.detectionRate.toFixed(1)} detections/sec`);
        window.reasoningConsole.logInfo(`Tracking "${settings.targetObject}" at ${settings.detectionRate.toFixed(1)}/sec`);
        
        const intervalMs = 1000 / settings.detectionRate;
        detectionLoop();
        detectionInterval = setInterval(detectionLoop, intervalMs);
    }

    async function stopTracking() {
        isTracking = false;
        
        if (detectionInterval) {
            clearInterval(detectionInterval);
            detectionInterval = null;
        }
        
        currentDetection = null;
        
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas[0].width, canvas[0].height);
        }
        
        if (ptzController) {
            await ptzController.stop();
        }
        
        $('#startBtn').prop('disabled', false);
        $('#stopBtn').prop('disabled', true);
        $('.settings-input').prop('disabled', false);
        $('#detectionRate').prop('disabled', false);
        
        updateStatus('Tracking stopped');
        window.reasoningConsole.logInfo('Tracking stopped');
    }

    async function detectionLoop() {
        if (!isTracking) return;
        
        try {
            const startTime = Date.now();
            const detections = await detector.detectInVideo(video, settings.targetObject);
            const detectionTime = Date.now() - startTime;
            
            window.reasoningConsole.logApiCall('/detect', detectionTime);
            
            updateFPS(detectionTime);
            
            currentDetection = detections.length > 0 ? detections[0] : null;
            
            renderDetection(currentDetection);
            
            if (!isTracking) return;
            
            if (currentDetection) {
                window.reasoningConsole.logDetection(settings.targetObject, 1, 0.9);
                await ptzController.trackObject(currentDetection, video.videoWidth, video.videoHeight);
                
                if (settings.autoZoomEnabled) {
                    await handleAutoZoom(currentDetection);
                }
                
                updateStatus(`Tracking: ${settings.targetObject} detected`);
            } else {
                if (ptzController.isMoving) {
                    await ptzController.stop();
                }
                updateStatus(`Searching for: ${settings.targetObject}`);
            }
            
        } catch (error) {
            console.error('Detection loop error:', error);
            updateStatus('Error: ' + error.message, true);
            window.reasoningConsole.logError('Detection error: ' + error.message);
        }
    }

    function renderDeadzone() {
        if (!ctx || !canvas || !video) return;
        
        ctx.clearRect(0, 0, canvas[0].width, canvas[0].height);
        
        const centerX = (settings.centerOffsetX / 100) * video.videoWidth;
        const centerY = (settings.centerOffsetY / 100) * video.videoHeight;
        const halfDeadzoneW = (settings.deadzoneX / 100) * video.videoWidth / 2;
        const halfDeadzoneH = (settings.deadzoneY / 100) * video.videoHeight / 2;
        
        ctx.strokeStyle = 'rgba(42, 157, 143, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(
            centerX - halfDeadzoneW,
            centerY - halfDeadzoneH,
            halfDeadzoneW * 2,
            halfDeadzoneH * 2
        );
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(42, 157, 143, 0.1)';
        ctx.fillRect(
            centerX - halfDeadzoneW,
            centerY - halfDeadzoneH,
            halfDeadzoneW * 2,
            halfDeadzoneH * 2
        );
        
        ctx.strokeStyle = 'rgba(147, 204, 234, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX - 20, centerY);
        ctx.lineTo(centerX + 20, centerY);
        ctx.moveTo(centerX, centerY - 20);
        ctx.lineTo(centerX, centerY + 20);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(147, 204, 234, 0.7)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Deadzone', centerX - halfDeadzoneW + 4, centerY - halfDeadzoneH + 4);
    }

    function renderDetection(detection) {
        if (!ctx || !canvas) return;
        
        ctx.clearRect(0, 0, canvas[0].width, canvas[0].height);
        
        renderDeadzone();
        
        if (!detection) return;
        
        const x = detection.x * video.videoWidth;
        const y = detection.y * video.videoHeight;
        const width = detection.width * video.videoWidth;
        const height = detection.height * video.videoHeight;
        
        ctx.strokeStyle = '#93CCEA';
        ctx.lineWidth = 4;
        ctx.strokeRect(
            x - width / 2,
            y - height / 2,
            width,
            height
        );
        
        ctx.fillStyle = '#93CCEA';
        const label = settings.targetObject;
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'left';
        const textWidth = ctx.measureText(label).width;
        const textHeight = 16;
        
        ctx.fillRect(
            x - width / 2,
            y - height / 2 - textHeight - 4,
            textWidth + 8,
            textHeight + 4
        );
        
        ctx.fillStyle = '#000033';
        ctx.textBaseline = 'top';
        ctx.fillText(
            label,
            x - width / 2 + 4,
            y - height / 2 - textHeight - 3
        );
        
        ctx.strokeStyle = '#3066BE';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 10, y);
        ctx.lineTo(x + 10, y);
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x, y + 10);
        ctx.stroke();
    }

    let lastZoomAction = 0;
    const zoomCooldown = 500;

    async function handleAutoZoom(detection) {
        if (!detection || !settings.autoZoomEnabled) return;
        
        const now = Date.now();
        if (now - lastZoomAction < zoomCooldown) return;
        
        const topHeadroom = (detection.y - detection.height / 2) * 100;
        const bottomHeadroom = (1 - (detection.y + detection.height / 2)) * 100;
        const avgHeadroom = (topHeadroom + bottomHeadroom) / 2;
        
        const minH = settings.minHeadroom;
        const maxH = settings.maxHeadroom;
        
        if (avgHeadroom < minH) {
            await ptzController.zoomOut();
            lastZoomAction = now;
            window.reasoningConsole.logInfo(`Auto-zoom OUT: headroom ${avgHeadroom.toFixed(1)}% < ${minH}%`);
            setTimeout(() => ptzController.stop(), 200);
        } else if (avgHeadroom > maxH) {
            await ptzController.zoomIn();
            lastZoomAction = now;
            window.reasoningConsole.logInfo(`Auto-zoom IN: headroom ${avgHeadroom.toFixed(1)}% > ${maxH}%`);
            setTimeout(() => ptzController.stop(), 200);
        }
    }

    function updateFPS(frameTime) {
        pastFrameTimes.push(frameTime);
        if (pastFrameTimes.length > 10) pastFrameTimes.shift();
        
        let total = 0;
        pastFrameTimes.forEach(t => {
            total += t / 1000;
        });
        
        const fps = pastFrameTimes.length / total;
        $('#fps').text(Math.round(fps * 10) / 10);
    }

    function updateStatus(message, isError = false) {
        const $status = $('#status');
        $status.text(message);
        
        if (isError) {
            $status.addClass('error');
        } else {
            $status.removeClass('error');
        }
        
        console.log(message);
    }

    init();
});
