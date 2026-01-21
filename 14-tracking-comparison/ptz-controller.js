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
        try {
            const url = `http://${this.cameraIP}/cgi-bin/ptzctrl.cgi?${command}`;
            const fetchOptions = { method: 'GET', mode: 'no-cors' };

            if (this.useAuth && this.username) {
                const credentials = btoa(`${this.username}:${this.password}`);
                fetchOptions.headers = { 'Authorization': `Basic ${credentials}` };
            }

            await fetch(url, fetchOptions);
        } catch (error) {
            console.error('PTZ command error:', error);
        }
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

        const objectX = detection.x * 100;
        const objectY = detection.y * 100;
        const targetX = 50;
        const targetY = 50;
        const offsetX = objectX - targetX;
        const offsetY = objectY - targetY;
        const halfDeadzone = this.deadzone / 2;

        let moved = false;

        if (offsetX > halfDeadzone) {
            await this.panRight();
            moved = true;
        } else if (offsetX < -halfDeadzone) {
            await this.panLeft();
            moved = true;
        } else if (offsetY > halfDeadzone) {
            await this.tiltDown();
            moved = true;
        } else if (offsetY < -halfDeadzone) {
            await this.tiltUp();
            moved = true;
        }

        if (!moved && this.isMoving) {
            await this.stop();
        }

        if (moved) {
            this.moveCount++;
        }

        return moved;
    }

    getMoveCount() {
        return this.moveCount;
    }

    resetMoveCount() {
        this.moveCount = 0;
    }
}
