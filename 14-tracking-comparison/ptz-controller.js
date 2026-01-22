class PTZController {
    constructor(cameraIP, options = {}) {
        this.cameraIP = cameraIP;
        this.isMoving = false;
        this.useAuth = options.useAuth || false;
        this.username = options.username || '';
        this.password = options.password || '';
        this.deadzone = 10;
        this.speed = { pan: 5, tilt: 5, zoom: 5 };
        this.moveCount = 0;
        this.lastMoveTime = 0;
        this.moveCooldown = 200;
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

    sendCommand(command) {
        if (!this.cameraIP) return;
        
        const url = `http://${this.cameraIP}/cgi-bin/ptzctrl.cgi?${command}`;
        const opts = { method: 'GET', mode: 'no-cors' };

        if (this.useAuth && this.username) {
            opts.headers = { 'Authorization': 'Basic ' + btoa(this.username + ':' + this.password) };
        }

        fetch(url, opts).catch(() => {});
    }

    stop() {
        this.isMoving = false;
        this.sendCommand('ptzcmd&ptzstop');
    }

    panRight() {
        this.isMoving = true;
        this.sendCommand(`ptzcmd&right&${this.speed.pan}&${this.speed.pan}`);
    }

    panLeft() {
        this.isMoving = true;
        this.sendCommand(`ptzcmd&left&${this.speed.pan}&${this.speed.pan}`);
    }

    tiltDown() {
        this.isMoving = true;
        this.sendCommand(`ptzcmd&down&${this.speed.tilt}&${this.speed.tilt}`);
    }

    tiltUp() {
        this.isMoving = true;
        this.sendCommand(`ptzcmd&up&${this.speed.tilt}&${this.speed.tilt}`);
    }

    zoomIn() {
        this.isMoving = true;
        this.sendCommand(`ptzcmd&zoomin&${this.speed.zoom}`);
    }

    zoomOut() {
        this.isMoving = true;
        this.sendCommand(`ptzcmd&zoomout&${this.speed.zoom}`);
    }

    home() {
        this.isMoving = false;
        this.sendCommand('ptzcmd&home');
    }

    trackObject(detection) {
        if (!detection) {
            if (this.isMoving) this.stop();
            return false;
        }

        const now = Date.now();
        if (now - this.lastMoveTime < this.moveCooldown) {
            return false;
        }

        const offsetX = (detection.x * 100) - 50;
        const offsetY = (detection.y * 100) - 50;
        const threshold = this.deadzone / 2;

        console.log(`PTZ: x=${detection.x.toFixed(2)} y=${detection.y.toFixed(2)} offsetX=${offsetX.toFixed(1)} offsetY=${offsetY.toFixed(1)} threshold=${threshold}`);

        if (Math.abs(offsetX) <= threshold && Math.abs(offsetY) <= threshold) {
            if (this.isMoving) this.stop();
            return false;
        }

        this.lastMoveTime = now;
        let cmd = '';

        if (Math.abs(offsetX) > Math.abs(offsetY)) {
            if (offsetX > threshold) { this.panRight(); cmd = 'panRight'; }
            else if (offsetX < -threshold) { this.panLeft(); cmd = 'panLeft'; }
        } else {
            if (offsetY > threshold) { this.tiltDown(); cmd = 'tiltDown'; }
            else if (offsetY < -threshold) { this.tiltUp(); cmd = 'tiltUp'; }
        }

        console.log(`PTZ: Sending ${cmd}`);
        this.moveCount++;
        setTimeout(() => this.stop(), 150);
        return true;
    }

    getMoveCount() {
        return this.moveCount;
    }

    resetMoveCount() {
        this.moveCount = 0;
    }
}
