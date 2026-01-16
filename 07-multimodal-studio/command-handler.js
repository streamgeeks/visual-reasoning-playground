class CommandHandler {
    constructor(options = {}) {
        this.ptzController = options.ptzController || null;
        this.obsController = options.obsController || null;
        this.onCommandExecuted = options.onCommandExecuted || (() => {});
        this.onError = options.onError || (() => {});
        this.onTrackingStateChange = options.onTrackingStateChange || (() => {});
        
        this.trackingEnabled = false;
        
        this.ZOOM_PRESETS = {
            wide: 0,
            medium: 4000,
            tight: 10000
        };
    }

    setPTZController(controller) {
        this.ptzController = controller;
    }

    setOBSController(controller) {
        this.obsController = controller;
    }

    async execute(parsedIntent) {
        const { intent, action, params } = parsedIntent;
        
        if (window.reasoningConsole) {
            window.reasoningConsole.logInfo(`Executing: ${intent}`);
        }

        try {
            let result;
            
            if (action === 'ptz') {
                result = await this.executePTZCommand(intent, params);
            } else if (action === 'obs') {
                result = await this.executeOBSCommand(intent, params);
            } else {
                throw new Error(`Unknown action type: ${action}`);
            }

            this.onCommandExecuted({
                intent,
                params,
                success: true,
                result
            });

            return result;

        } catch (error) {
            this.onError({
                intent,
                params,
                error: error.message
            });
            throw error;
        }
    }

    async executePTZCommand(intent, params) {
        if (!this.ptzController) {
            throw new Error('PTZ controller not connected');
        }

        switch (intent) {
            case 'tracking_start':
                this.trackingEnabled = true;
                this.onTrackingStateChange(true);
                return { tracking: true };

            case 'tracking_stop':
                this.trackingEnabled = false;
                this.onTrackingStateChange(false);
                await this.ptzController.stop();
                return { tracking: false };

            case 'zoom_in':
                await this.ptzController.zoomIn();
                await this.delay(500);
                await this.ptzController.zoomStop();
                return { zoomed: 'in' };

            case 'zoom_out':
                await this.ptzController.zoomOut();
                await this.delay(500);
                await this.ptzController.zoomStop();
                return { zoomed: 'out' };

            case 'zoom_preset':
                const zoomValue = this.ZOOM_PRESETS[params.zoomPreset] ?? 0;
                await this.ptzController.setZoomPosition(zoomValue);
                return { zoomPreset: params.zoomPreset };

            case 'pan_left':
                await this.ptzController.panLeft();
                await this.delay(300);
                await this.ptzController.stop();
                return { panned: 'left' };

            case 'pan_right':
                await this.ptzController.panRight();
                await this.delay(300);
                await this.ptzController.stop();
                return { panned: 'right' };

            case 'tilt_up':
                await this.ptzController.tiltUp();
                await this.delay(300);
                await this.ptzController.stop();
                return { tilted: 'up' };

            case 'tilt_down':
                await this.ptzController.tiltDown();
                await this.delay(300);
                await this.ptzController.stop();
                return { tilted: 'down' };

            case 'home':
                await this.ptzController.home();
                return { home: true };

            case 'goto_preset':
                await this.ptzController.gotoPreset(params.preset);
                return { preset: params.preset };

            default:
                throw new Error(`Unknown PTZ intent: ${intent}`);
        }
    }

    async executeOBSCommand(intent, params) {
        if (!this.obsController || !this.obsController.isConnected()) {
            throw new Error('OBS not connected');
        }

        switch (intent) {
            case 'switch_camera':
            case 'switch_scene':
                if (params.sceneNumber) {
                    await this.obsController.switchToSceneByNumber(params.sceneNumber);
                    return { scene: params.sceneNumber };
                } else if (params.scene) {
                    await this.obsController.switchScene(params.scene);
                    return { scene: params.scene };
                }
                throw new Error('No scene specified');

            case 'start_recording':
                await this.obsController.startRecording();
                return { recording: true };

            case 'stop_recording':
                await this.obsController.stopRecording();
                return { recording: false };

            case 'start_streaming':
                await this.obsController.startStreaming();
                return { streaming: true };

            case 'stop_streaming':
                await this.obsController.stopStreaming();
                return { streaming: false };

            case 'mute':
                return { muted: true };

            case 'unmute':
                return { muted: false };

            default:
                throw new Error(`Unknown OBS intent: ${intent}`);
        }
    }

    isTrackingEnabled() {
        return this.trackingEnabled;
    }

    setTrackingEnabled(enabled) {
        this.trackingEnabled = enabled;
        this.onTrackingStateChange(enabled);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

window.CommandHandler = CommandHandler;
