class PTZController {
    constructor(cameraIP, options = {}) {
        this.cameraIP = cameraIP;
        this.isMoving = false;
        this.speed = { pan: 8, tilt: 8 };
        this.useAuth = options.useAuth || false;
        this.username = options.username || '';
        this.password = options.password || '';
    }

    setCameraIP(ip) {
        this.cameraIP = ip;
    }

    setAuth(useAuth, username = '', password = '') {
        this.useAuth = useAuth;
        this.username = username;
        this.password = password;
    }

    async sendCommand(command) {
        if (!this.cameraIP) {
            throw new Error('Camera IP not set');
        }
        
        const url = `http://${this.cameraIP}/cgi-bin/ptzctrl.cgi?${command}`;
        if (window.reasoningConsole) {
            window.reasoningConsole.logInfo(`PTZ: ${command}`);
        }
        
        const fetchOptions = { method: 'GET', mode: 'no-cors' };
        
        if (this.useAuth && this.username) {
            const credentials = btoa(`${this.username}:${this.password}`);
            fetchOptions.headers = { 'Authorization': `Basic ${credentials}` };
        }
        
        await fetch(url, fetchOptions);
        return true;
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

    async moveToCenter(objectX, objectY, onProgress) {
        const centerX = 0.5;
        const centerY = 0.5;
        const deadzone = 0.08;
        
        const offsetX = objectX - centerX;
        const offsetY = objectY - centerY;
        
        if (onProgress) {
            onProgress(`Target at (${(objectX * 100).toFixed(0)}%, ${(objectY * 100).toFixed(0)}%)`);
        }

        if (Math.abs(offsetX) < deadzone && Math.abs(offsetY) < deadzone) {
            if (onProgress) onProgress('Centered');
            return true;
        }

        if (Math.abs(offsetX) > deadzone) {
            if (offsetX > 0) {
                await this.panRight();
            } else {
                await this.panLeft();
            }
            await this.delay(150);
            await this.stop();
        }

        if (Math.abs(offsetY) > deadzone) {
            if (offsetY > 0) {
                await this.tiltDown();
            } else {
                await this.tiltUp();
            }
            await this.delay(150);
            await this.stop();
        }

        return false;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

window.PTZController = PTZController;
