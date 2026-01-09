/**
 * Main Application Logic
 * Manages WebRTC video stream, UI interactions, and tracking loop
 */

$(function () {
    // Application state
    let detector = null;
    let ptzController = null;
    let video = null;
    let canvas = null;
    let ctx = null;
    let isTracking = false;
    let detectionInterval = null;
    let currentDetection = null;
    
    // Operation style presets
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

    // Settings
    let settings = {
        moondreamApiKey: localStorage.getItem('moondreamApiKey') || '',
        cameraIP: localStorage.getItem('cameraIP') || '192.168.1.19',
        targetObject: localStorage.getItem('targetObject') || '',
        operationStyle: localStorage.getItem('operationStyle') || 'balanced',
        detectionRate: parseFloat(localStorage.getItem('detectionRate')) || 1.0, // Detections per second
        cameraWidth: 1920,
        cameraHeight: 1080,
        // PTZ Control Settings
        panSpeed: parseInt(localStorage.getItem('panSpeed')) || 5,
        tiltSpeed: parseInt(localStorage.getItem('tiltSpeed')) || 5,
        centerOffsetX: parseFloat(localStorage.getItem('centerOffsetX')) || 50,
        centerOffsetY: parseFloat(localStorage.getItem('centerOffsetY')) || 50,
        deadzoneX: parseFloat(localStorage.getItem('deadzoneX')) || 5,
        deadzoneY: parseFloat(localStorage.getItem('deadzoneY')) || 5
    };

    // FPS tracking
    let prevTime;
    let pastFrameTimes = [];

    /**
     * Initialize the application
     */
    async function init() {
        video = $('#video')[0];
        
        // Load saved settings into UI
        $('#apiKey').val(settings.moondreamApiKey);
        $('#cameraIP').val(settings.cameraIP);
        $('#targetObject').val(settings.targetObject);
        $('#operationStyle').val(settings.operationStyle);
        $('#detectionRate').val(settings.detectionRate);
        $('#detectionRateValue').text(settings.detectionRate.toFixed(1));
        
        // Load PTZ settings
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
        
        // Initialize detector and PTZ controller
        detector = new MoondreamDetector(settings.moondreamApiKey);
        ptzController = new PTZController(settings.cameraIP);
        
        // Apply PTZ settings
        ptzController.setSpeed({
            pan: settings.panSpeed,
            tilt: settings.tiltSpeed
        });
        ptzController.setCenterOffset({
            horizontal: settings.centerOffsetX,
            vertical: settings.centerOffsetY
        });
        ptzController.setDeadzone({
            horizontal: settings.deadzoneX,
            vertical: settings.deadzoneY
        });
        
        // Set up event listeners
        setupEventListeners();
        
        // Start video stream
        await startVideoStream();
        
        // Set up canvas
        resizeCanvas();
        
        $('body').removeClass('loading');
        
        updateStatus('Ready. Configure settings and click Start Tracking.');
    }

    /**
     * Set up UI event listeners
     */
    function setupEventListeners() {
        // Save settings when changed
        $('#apiKey').on('change', function() {
            settings.moondreamApiKey = $(this).val();
            localStorage.setItem('moondreamApiKey', settings.moondreamApiKey);
            detector.setApiKey(settings.moondreamApiKey);
        });
        
        $('#cameraIP').on('change', function() {
            settings.cameraIP = $(this).val();
            localStorage.setItem('cameraIP', settings.cameraIP);
            ptzController.setCameraIP(settings.cameraIP);
        });
        
        $('#targetObject').on('change', function() {
            settings.targetObject = $(this).val();
            localStorage.setItem('targetObject', settings.targetObject);
        });
        
        // Operation Style selector
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
            
            // If tracking is active, restart with new rate
            if (isTracking) {
                clearInterval(detectionInterval);
                const intervalMs = 1000 / rate; // Convert rate to milliseconds
                detectionInterval = setInterval(detectionLoop, intervalMs);
                updateStatus(`Detection rate updated to ${rate.toFixed(1)}/sec`);
            }
        });
        
        // PTZ Speed Controls
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
        
        // Center Offset Controls
        $('#centerOffsetX').on('input', function() {
            const val = parseFloat($(this).val());
            settings.centerOffsetX = val;
            $('#centerOffsetXValue').text(val);
            localStorage.setItem('centerOffsetX', val.toString());
            ptzController.setCenterOffset({ horizontal: val });
        });
        
        $('#centerOffsetY').on('input', function() {
            const val = parseFloat($(this).val());
            settings.centerOffsetY = val;
            $('#centerOffsetYValue').text(val);
            localStorage.setItem('centerOffsetY', val.toString());
            ptzController.setCenterOffset({ vertical: val });
        });
        
        // Deadzone Controls
        $('#deadzoneX').on('input', function() {
            const val = parseFloat($(this).val());
            settings.deadzoneX = val;
            $('#deadzoneXValue').text(val);
            localStorage.setItem('deadzoneX', val.toString());
            ptzController.setDeadzone({ horizontal: val });
            switchToCustomMode();
        });
        
        $('#deadzoneY').on('input', function() {
            const val = parseFloat($(this).val());
            settings.deadzoneY = val;
            $('#deadzoneYValue').text(val);
            localStorage.setItem('deadzoneY', val.toString());
            ptzController.setDeadzone({ vertical: val });
            switchToCustomMode();
        });
        
        // Toggle Advanced Settings
        $('#toggleAdvanced').on('click', function() {
            $('#advancedSettings').slideToggle(300);
        });
        
        // Start/Stop tracking
        $('#startBtn').on('click', startTracking);
        $('#stopBtn').on('click', stopTracking);
        
        // Window resize handler
        $(window).on('resize', resizeCanvas);
    }

    /**
     * Apply operation style preset
     */
    function applyOperationPreset(style) {
        const preset = operationPresets[style];
        if (!preset) return;
        
        // Update detection rate
        settings.detectionRate = preset.detectionRate;
        $('#detectionRate').val(preset.detectionRate);
        $('#detectionRateValue').text(preset.detectionRate.toFixed(1));
        localStorage.setItem('detectionRate', preset.detectionRate.toString());
        
        // Update speed settings
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
        
        // Update deadzone settings
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
        
        // If tracking is active, restart with new detection rate
        if (isTracking) {
            clearInterval(detectionInterval);
            const intervalMs = 1000 / preset.detectionRate;
            detectionInterval = setInterval(detectionLoop, intervalMs);
        }
        
        updateStatus(`Applied ${preset.name} preset`);
    }
    
    /**
     * Switch to custom mode when manual adjustments are made
     */
    function switchToCustomMode() {
        if (settings.operationStyle !== 'custom') {
            settings.operationStyle = 'custom';
            $('#operationStyle').val('custom');
            localStorage.setItem('operationStyle', 'custom');
        }
    }

    /**
     * Start WebRTC video stream
     */
    async function startVideoStream() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    width: settings.cameraWidth,
                    height: settings.cameraHeight,
                    facingMode: 'environment'
                }
            });
            
            video.srcObject = stream;
            
            return new Promise((resolve) => {
                video.onloadeddata = function () {
                    video.play();
                    resolve();
                };
            });
        } catch (error) {
            updateStatus('Error: Could not access camera - ' + error.message, true);
            throw error;
        }
    }

    /**
     * Calculate video dimensions maintaining aspect ratio
     */
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

    /**
     * Resize canvas to match video dimensions
     */
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
    }

    /**
     * Start tracking
     */
    async function startTracking() {
        // Validate settings
        if (!settings.moondreamApiKey) {
            updateStatus('Error: Please enter Moondream API key', true);
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
        
        // Start detection loop
        // Convert detections per second to milliseconds between detections
        const intervalMs = 1000 / settings.detectionRate;
        detectionLoop();
        detectionInterval = setInterval(detectionLoop, intervalMs);
    }

    /**
     * Stop tracking
     */
    async function stopTracking() {
        // Set tracking flag to false FIRST to prevent any new commands
        isTracking = false;
        
        // Clear the interval immediately
        if (detectionInterval) {
            clearInterval(detectionInterval);
            detectionInterval = null;
        }
        
        // Clear current detection to prevent stale data
        currentDetection = null;
        
        // Clear canvas visualization (remove bounding box and crosshair)
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas[0].width, canvas[0].height);
        }
        
        // Stop PTZ camera movement
        if (ptzController) {
            await ptzController.stop();
        }
        
        // Re-enable UI controls
        $('#startBtn').prop('disabled', false);
        $('#stopBtn').prop('disabled', true);
        $('.settings-input').prop('disabled', false);
        $('#detectionRate').prop('disabled', false);
        
        updateStatus('Tracking stopped');
    }

    /**
     * Main detection loop
     */
    async function detectionLoop() {
        if (!isTracking) return;
        
        try {
            // Call Moondream API to detect object
            const startTime = Date.now();
            const detections = await detector.detectInVideo(video, settings.targetObject);
            const detectionTime = Date.now() - startTime;
            
            // Update FPS counter
            updateFPS(detectionTime);
            
            // Use the first detection (if multiple objects found)
            currentDetection = detections.length > 0 ? detections[0] : null;
            
            // Render detection on canvas
            renderDetection(currentDetection);
            
            // Check if still tracking before sending PTZ commands
            if (!isTracking) return;
            
            // Control PTZ camera
            if (currentDetection) {
                await ptzController.trackObject(currentDetection, video.videoWidth, video.videoHeight);
                updateStatus(`Tracking: ${settings.targetObject} detected`);
            } else {
                // Stop camera if object not detected
                if (ptzController.isMoving) {
                    await ptzController.stop();
                }
                updateStatus(`Searching for: ${settings.targetObject}`);
            }
            
        } catch (error) {
            console.error('Detection loop error:', error);
            updateStatus('Error: ' + error.message, true);
            
            // Continue tracking despite errors (API might be temporarily unavailable)
        }
    }

    /**
     * Render detection on canvas
     */
    function renderDetection(detection) {
        if (!ctx || !canvas) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas[0].width, canvas[0].height);
        
        if (!detection) return;
        
        // Convert normalized coordinates to pixel coordinates
        const x = detection.x * video.videoWidth;
        const y = detection.y * video.videoHeight;
        const width = detection.width * video.videoWidth;
        const height = detection.height * video.videoHeight;
        
        // Draw bounding box
        ctx.strokeStyle = '#93CCEA';
        ctx.lineWidth = 4;
        ctx.strokeRect(
            x - width / 2,
            y - height / 2,
            width,
            height
        );
        
        // Draw label background
        ctx.fillStyle = '#93CCEA';
        const label = settings.targetObject;
        ctx.font = '16px sans-serif';
        const textWidth = ctx.measureText(label).width;
        const textHeight = 16;
        
        ctx.fillRect(
            x - width / 2,
            y - height / 2 - textHeight - 4,
            textWidth + 8,
            textHeight + 4
        );
        
        // Draw label text
        ctx.fillStyle = '#000033';
        ctx.textBaseline = 'top';
        ctx.fillText(
            label,
            x - width / 2 + 4,
            y - height / 2 - textHeight - 3
        );
        
        // Draw center crosshair
        ctx.strokeStyle = '#3066BE';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 10, y);
        ctx.lineTo(x + 10, y);
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x, y + 10);
        ctx.stroke();
    }

    /**
     * Update FPS counter
     */
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

    /**
     * Update status message
     */
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

    // Initialize on page load
    init();
});
