/**
 * PTZ Camera Control Module
 * Handles pan, tilt, and zoom commands for PTZ cameras via HTTP API
 */

class PTZController {
    constructor(cameraIP) {
        this.cameraIP = cameraIP;
        this.isMoving = false;
        
        // Center offset - adjust where "center" actually is in the frame
        // Values are percentages: 0 = left/top edge, 50 = actual center, 100 = right/bottom edge
        this.centerOffset = {
            horizontal: 50,  // Horizontal center (50 = true center)
            vertical: 50     // Vertical center (50 = true center)
        };
        
        // Deadzone tolerance - how far from center before camera moves (in percentage of frame)
        // Smaller values = tighter centering, larger values = wider deadzone
        this.deadzone = {
            horizontal: 5,  // 5% deadzone horizontally (±2.5% from center)
            vertical: 5     // 5% deadzone vertically (±2.5% from center)
        };
        
        // Legacy threshold support (for backward compatibility)
        this.thresholds = {
            horizontal: {
                right: 1.4,
                left: 0.6
            },
            vertical: {
                down: 1.8,
                up: 0.25
            }
        };
        
        // Movement speed (adjust based on your camera model)
        this.speed = {
            pan: 5,
            tilt: 5,
            zoom: 5
        };
    }

    /**
     * Update camera IP address
     */
    setCameraIP(ip) {
        this.cameraIP = ip;
    }

    /**
     * Update center offset
     */
    setCenterOffset(offset) {
        this.centerOffset = { ...this.centerOffset, ...offset };
    }

    /**
     * Update deadzone tolerance
     */
    setDeadzone(deadzone) {
        this.deadzone = { ...this.deadzone, ...deadzone };
    }

    /**
     * Update tracking thresholds (legacy support)
     */
    setThresholds(thresholds) {
        this.thresholds = { ...this.thresholds, ...thresholds };
    }

    /**
     * Update movement speed
     */
    setSpeed(speed) {
        this.speed = { ...this.speed, ...speed };
    }

    /**
     * Send HTTP command to PTZ camera
     * @param {string} command - Camera command endpoint
     */
    async sendCommand(command) {
        try {
            const url = `http://${this.cameraIP}/cgi-bin/ptzctrl.cgi?${command}`;
            const response = await fetch(url, { 
                method: 'GET',
                mode: 'no-cors' // Required for cross-origin camera requests
            });
            return response;
        } catch (error) {
            console.error('PTZ command error:', error);
            throw error;
        }
    }

    /**
     * Stop all camera movement
     */
    async stop() {
        console.log('PTZ STOPPED');
        this.isMoving = false;
        return this.sendCommand('ptzcmd&ptzstop');
    }

    /**
     * Pan camera right
     */
    async panRight() {
        console.log('PANNING RIGHT');
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&right&${this.speed.pan}&${this.speed.pan}`);
    }

    /**
     * Pan camera left
     */
    async panLeft() {
        console.log('PANNING LEFT');
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&left&${this.speed.pan}&${this.speed.pan}`);
    }

    /**
     * Tilt camera down
     */
    async tiltDown() {
        console.log('TILTING DOWN');
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&down&${this.speed.tilt}&${this.speed.tilt}`);
    }

    /**
     * Tilt camera up
     */
    async tiltUp() {
        console.log('TILTING UP');
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&up&${this.speed.tilt}&${this.speed.tilt}`);
    }

    /**
     * Zoom camera in
     */
    async zoomIn() {
        console.log('ZOOMING IN');
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&zoomin&${this.speed.zoom}`);
    }

    /**
     * Zoom camera out
     */
    async zoomOut() {
        console.log('ZOOMING OUT');
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&zoomout&${this.speed.zoom}`);
    }

    /**
     * Go to home position
     */
    async home() {
        console.log('GOING HOME');
        this.isMoving = false;
        return this.sendCommand('ptzcmd&home');
    }

    /**
     * Track an object based on its position in the frame
     * @param {Object} detection - Detection object with normalized x, y coordinates (0-1)
     * @param {number} videoWidth - Video frame width
     * @param {number} videoHeight - Video frame height
     */
    async trackObject(detection, videoWidth, videoHeight) {
        if (!detection) {
            if (this.isMoving) {
                await this.stop();
            }
            return;
        }

        // Object position as percentage of frame (0-100)
        const objectX = detection.x * 100;  // 0 = left edge, 100 = right edge
        const objectY = detection.y * 100;  // 0 = top edge, 100 = bottom edge

        // Calculate target center position (adjustable by user)
        const targetX = this.centerOffset.horizontal;
        const targetY = this.centerOffset.vertical;

        // Calculate offset from target center
        const offsetX = objectX - targetX;
        const offsetY = objectY - targetY;

        // Calculate half deadzone (the ± tolerance)
        const halfDeadzoneX = this.deadzone.horizontal / 2;
        const halfDeadzoneY = this.deadzone.vertical / 2;

        // Determine which direction to move based on deadzone
        let commandSent = false;

        // Prioritize horizontal movement first, then vertical
        if (offsetX > halfDeadzoneX) {
            // Object is too far right, pan right
            await this.panRight();
            commandSent = true;
        } else if (offsetX < -halfDeadzoneX) {
            // Object is too far left, pan left
            await this.panLeft();
            commandSent = true;
        } else if (offsetY > halfDeadzoneY) {
            // Object is too far down, tilt down
            await this.tiltDown();
            commandSent = true;
        } else if (offsetY < -halfDeadzoneY) {
            // Object is too far up, tilt up
            await this.tiltUp();
            commandSent = true;
        }

        // If object is within deadzone on both axes, stop the camera
        if (!commandSent && this.isMoving) {
            await this.stop();
        }
    }
}
