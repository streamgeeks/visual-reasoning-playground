class PTZController {
    constructor(cameraIP, options = {}) {
        this.cameraIP = cameraIP;
        this.isMoving = false;
        this.speed = { pan: 8, tilt: 8 };
        this.moveDuration = 200;
        
        this.useAuth = options.useAuth || false;
        this.username = options.username || '';
        this.password = options.password || '';
        
        this.deadzone = 10;
        this.moveCount = 0;
        this.lastMoveTime = 0;
        this.moveCooldown = 300;
    }

    setCameraIP(ip) {
        this.cameraIP = ip;
    }

    setAuth(useAuth, username = '', password = '') {
        this.useAuth = useAuth;
        this.username = username;
        this.password = password;
    }

    setDeadzone(value) {
        this.deadzone = value;
    }

    async sendCommand(command) {
        if (!this.cameraIP) {
            throw new Error('Camera IP not set');
        }
        
        try {
            const url = `http://${this.cameraIP}/cgi-bin/ptzctrl.cgi?${command}`;
            console.log('PTZ Command:', url);
            
            const fetchOptions = { 
                method: 'GET', 
                mode: 'no-cors'
            };
            
            if (this.useAuth && this.username) {
                const credentials = btoa(`${this.username}:${this.password}`);
                fetchOptions.headers = {
                    'Authorization': `Basic ${credentials}`
                };
            }
            
            await fetch(url, fetchOptions);
            return true;
        } catch (error) {
            console.error('PTZ Error:', error.message);
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

    async home() {
        return this.sendCommand('ptzcmd&home');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async trackObject(detection) {
        if (!detection) {
            if (this.isMoving) await this.stop();
            return false;
        }

        const now = Date.now();
        if (now - this.lastMoveTime < this.moveCooldown) {
            return false;
        }

        const offsetX = (detection.x * 100) - 50;
        const offsetY = (detection.y * 100) - 50;
        const threshold = this.deadzone / 2;

        if (Math.abs(offsetX) <= threshold && Math.abs(offsetY) <= threshold) {
            if (this.isMoving) await this.stop();
            return false;
        }

        this.lastMoveTime = now;

        if (Math.abs(offsetX) > Math.abs(offsetY)) {
            if (offsetX > threshold) {
                await this.panRight();
            } else if (offsetX < -threshold) {
                await this.panLeft();
            }
        } else {
            if (offsetY > threshold) {
                await this.tiltDown();
            } else if (offsetY < -threshold) {
                await this.tiltUp();
            }
        }

        await this.delay(this.moveDuration);
        await this.stop();
        
        this.moveCount++;
        return true;
    }

    getMoveCount() {
        return this.moveCount;
    }

    resetMoveCount() {
        this.moveCount = 0;
    }
}

window.PTZController = PTZController;
