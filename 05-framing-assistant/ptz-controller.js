class PTZController {
    constructor(cameraIP) {
        this.cameraIP = cameraIP;
        this.isMoving = false;
        this.speed = { pan: 8, tilt: 8 };
        this.moveDuration = 500; // ms before stop command
    }

    setCameraIP(ip) {
        this.cameraIP = ip;
    }

    async sendCommand(command) {
        if (!this.cameraIP) {
            throw new Error('Camera IP not set');
        }
        
        try {
            const url = `http://${this.cameraIP}/cgi-bin/ptzctrl.cgi?${command}`;
            if (window.reasoningConsole) {
                window.reasoningConsole.logInfo(`PTZ Command: ${command}`);
            }
            await fetch(url, { method: 'GET', mode: 'no-cors' });
            return true;
        } catch (error) {
            if (window.reasoningConsole) {
                window.reasoningConsole.logError(`PTZ Error: ${error.message}`);
            }
            throw error;
        }
    }

    async stop() {
        this.isMoving = false;
        return this.sendCommand('ptzcmd&ptzstop');
    }

    async panRight(speed = this.speed.pan) {
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&right&${speed}&${speed}`);
    }

    async panLeft(speed = this.speed.pan) {
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&left&${speed}&${speed}`);
    }

    async tiltUp(speed = this.speed.tilt) {
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&up&${speed}&${speed}`);
    }

    async tiltDown(speed = this.speed.tilt) {
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&down&${speed}&${speed}`);
    }

    async zoomIn() {
        return this.sendCommand('ptzcmd&zoomin&5');
    }

    async zoomOut() {
        return this.sendCommand('ptzcmd&zoomout&5');
    }

    async zoomStop() {
        return this.sendCommand('ptzcmd&zoomstop');
    }

    async setZoomPosition(position) {
        return this.sendCommand(`ptzctrl&abszoom&${position}`);
    }

    async home() {
        return this.sendCommand('ptzcmd&home');
    }

    async gotoPreset(preset) {
        return this.sendCommand(`ptzcmd&posset&${preset}`);
    }

    async moveToCenter(objectX, objectY, frameWidth, frameHeight, onProgress) {
        const centerX = 0.5;
        const centerY = 0.5;
        const deadzone = 0.05;
        
        const offsetX = objectX - centerX;
        const offsetY = objectY - centerY;
        
        if (onProgress) {
            onProgress(`Object at (${(objectX * 100).toFixed(0)}%, ${(objectY * 100).toFixed(0)}%)`);
        }

        if (Math.abs(offsetX) < deadzone && Math.abs(offsetY) < deadzone) {
            if (onProgress) onProgress('Object centered!');
            return true;
        }

        if (Math.abs(offsetX) > deadzone) {
            if (offsetX > 0) {
                if (onProgress) onProgress('Panning right...');
                await this.panRight();
            } else {
                if (onProgress) onProgress('Panning left...');
                await this.panLeft();
            }
            await this.delay(this.moveDuration);
            await this.stop();
        }

        if (Math.abs(offsetY) > deadzone) {
            if (offsetY > 0) {
                if (onProgress) onProgress('Tilting down...');
                await this.tiltDown();
            } else {
                if (onProgress) onProgress('Tilting up...');
                await this.tiltUp();
            }
            await this.delay(this.moveDuration);
            await this.stop();
        }

        return false;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

window.PTZController = PTZController;
