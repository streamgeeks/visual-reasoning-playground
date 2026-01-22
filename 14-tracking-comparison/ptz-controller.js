class PTZController {
    constructor(cameraIP, options = {}) {
        this.cameraIP = cameraIP;
        this.isMoving = false;
        this.useAuth = options.useAuth || false;
        this.username = options.username || '';
        this.password = options.password || '';
        this.deadzone = 10;
        this.speed = { pan: 8, tilt: 8, zoom: 5 };
        this.moveCount = 0;
        this.lastMoveTime = 0;
        this.moveCooldown = 300;
    }

    setAuth(useAuth, username = '', password = '') {
        this.useAuth = useAuth;
        this.username = username;
        this.password = password;
    }

    setCameraIP(ip) {
        this.cameraIP = ip;
    }

    setDeadzone(value) {
        this.deadzone = value;
    }

    setSpeed(speed) {
        this.speed = { ...this.speed, ...speed };
    }

    async sendCommand(command) {
        if (!this.cameraIP) {
            console.log('PTZ: No camera IP set');
            return false;
        }
        
        const url = `http://${this.cameraIP}/cgi-bin/ptzctrl.cgi?${command}`;
        console.log('PTZ: Sending to', url);
        
        const opts = { method: 'GET', mode: 'no-cors' };

        if (this.useAuth && this.username) {
            opts.headers = { 'Authorization': 'Basic ' + btoa(this.username + ':' + this.password) };
        }

        try {
            await fetch(url, opts);
            console.log('PTZ: Command sent');
            return true;
        } catch (err) {
            console.error('PTZ: Fetch error', err);
            return false;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async stop() {
        this.isMoving = false;
        return this.sendCommand('ptzcmd&ptzstop');
    }

    async panRight() {
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&right&${this.speed.pan}&${this.speed.pan}`);
    }

    async panLeft() {
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&left&${this.speed.pan}&${this.speed.pan}`);
    }

    async tiltDown() {
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&down&${this.speed.tilt}&${this.speed.tilt}`);
    }

    async tiltUp() {
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&up&${this.speed.tilt}&${this.speed.tilt}`);
    }

    async zoomIn() {
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&zoomin&${this.speed.zoom}`);
    }

    async zoomOut() {
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&zoomout&${this.speed.zoom}`);
    }

    async home() {
        this.isMoving = false;
        return this.sendCommand('ptzcmd&home');
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

        console.log(`PTZ Track: x=${detection.x.toFixed(2)} offsetX=${offsetX.toFixed(1)} threshold=${threshold}`);

        if (Math.abs(offsetX) <= threshold && Math.abs(offsetY) <= threshold) {
            if (this.isMoving) await this.stop();
            return false;
        }

        this.lastMoveTime = now;

        if (Math.abs(offsetX) > Math.abs(offsetY)) {
            if (offsetX > threshold) {
                console.log('PTZ: Pan Right');
                await this.panRight();
            } else if (offsetX < -threshold) {
                console.log('PTZ: Pan Left');
                await this.panLeft();
            }
        } else {
            if (offsetY > threshold) {
                console.log('PTZ: Tilt Down');
                await this.tiltDown();
            } else if (offsetY < -threshold) {
                console.log('PTZ: Tilt Up');
                await this.tiltUp();
            }
        }

        await this.delay(200);
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
