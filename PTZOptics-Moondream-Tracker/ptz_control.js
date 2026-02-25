/**
 * PTZ Camera Control Module
 * Handles pan, tilt, and zoom commands for PTZ cameras via HTTP API
 */

class PTZController {
    constructor(cameraIP, options = {}) {
        this.cameraIP = cameraIP;
        this.isMoving = false;
        
        // Authentication settings
        this.useAuth = options.useAuth || false;
        this.username = options.username || '';
        this.password = options.password || '';
        
        // Center offset - adjust where "center" actually is in the frame
        // Values are percentages: 0 = left/top edge, 50 = actual center, 100 = right/bottom edge
        this.centerOffset = {
            horizontal: 50,  // Horizontal center (50 = true center)
            vertical: 50     // Vertical center (50 = true center)
        };
        
        // Inner deadzone - object must be outside this to trigger any movement
        // When inside inner deadzone, camera is STOPPED
        this.deadzone = {
            horizontal: 10,  // 10% inner deadzone horizontally (±5% from center)
            vertical: 10     // 10% inner deadzone vertically (±5% from center)
        };

        // Outer deadzone - between inner and outer, camera moves at reduced speed
        // Beyond outer deadzone, camera moves at full speed
        this.outerDeadzone = {
            horizontal: 25,  // 25% outer deadzone
            vertical: 25     // 25% outer deadzone
        };

        // Speed reduction factors
        this.innerSpeedFactor = 0.1;  // 90% reduction in inner-to-outer zone
        this.outerSpeedFactor = 0.5;  // 50% reduction beyond outer zone
        
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

    setAuth(useAuth, username = '', password = '') {
        this.useAuth = useAuth;
        this.username = username;
        this.password = password;
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
     * Update inner deadzone tolerance (camera stops inside this zone)
     */
    setDeadzone(deadzone) {
        this.deadzone = { ...this.deadzone, ...deadzone };
    }

    /**
     * Update outer deadzone (speed reduction zone between inner and outer)
     */
    setOuterDeadzone(deadzone) {
        this.outerDeadzone = { ...this.outerDeadzone, ...deadzone };
    }

    /**
     * Update speed reduction factors
     * @param {number} innerFactor - Speed multiplier in inner zone (e.g. 0.1 = 10% speed)
     * @param {number} outerFactor - Speed multiplier in outer zone (e.g. 0.5 = 50% speed)
     */
    setSpeedFactors(innerFactor, outerFactor) {
        if (innerFactor !== undefined) this.innerSpeedFactor = innerFactor;
        if (outerFactor !== undefined) this.outerSpeedFactor = outerFactor;
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
            const fetchOptions = { 
                method: 'GET',
                mode: 'no-cors'
            };
            
            if (this.useAuth && this.username) {
                const credentials = btoa(`${this.username}:${this.password}`);
                fetchOptions.headers = { 'Authorization': `Basic ${credentials}` };
            }
            
            const response = await fetch(url, fetchOptions);
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
     * @param {number} [speedOverride] - Optional speed override (1-24)
     */
    async panRight(speedOverride) {
        const spd = speedOverride || this.speed.pan;
        console.log('PANNING RIGHT speed=' + spd);
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&right&${spd}&${spd}`);
    }

    /**
     * Pan camera left
     * @param {number} [speedOverride] - Optional speed override (1-24)
     */
    async panLeft(speedOverride) {
        const spd = speedOverride || this.speed.pan;
        console.log('PANNING LEFT speed=' + spd);
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&left&${spd}&${spd}`);
    }

    /**
     * Tilt camera down
     * @param {number} [speedOverride] - Optional speed override (1-24)
     */
    async tiltDown(speedOverride) {
        const spd = speedOverride || this.speed.tilt;
        console.log('TILTING DOWN speed=' + spd);
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&down&${spd}&${spd}`);
    }

    /**
     * Tilt camera up
     * @param {number} [speedOverride] - Optional speed override (1-24)
     */
    async tiltUp(speedOverride) {
        const spd = speedOverride || this.speed.tilt;
        console.log('TILTING UP speed=' + spd);
        this.isMoving = true;
        return this.sendCommand(`ptzcmd&up&${spd}&${spd}`);
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
        const absOffsetX = Math.abs(offsetX);
        const absOffsetY = Math.abs(offsetY);

        // Inner deadzone: camera STOPS (no movement)
        const halfInnerX = this.deadzone.horizontal / 2;
        const halfInnerY = this.deadzone.vertical / 2;

        // Outer deadzone: between inner and outer, camera moves at reduced speed
        const halfOuterX = this.outerDeadzone.horizontal / 2;
        const halfOuterY = this.outerDeadzone.vertical / 2;

        // Determine speed based on which zone the object is in
        // Inside inner deadzone → STOP
        // Between inner and outer → innerSpeedFactor (default 10% speed)
        // Beyond outer → outerSpeedFactor (default 50% speed)
        // Note: 'outer' is the braking zone, 'beyond outer' is full speed
        let panSpd = this.speed.pan;
        let tiltSpd = this.speed.tilt;

        if (absOffsetX <= halfInnerX && absOffsetY <= halfInnerY) {
            // Fully inside inner deadzone — stop
            if (this.isMoving) await this.stop();
            return;
        }

        // Calculate pan speed based on horizontal zone
        if (absOffsetX <= halfInnerX) {
            panSpd = 0; // No horizontal movement needed
        } else if (absOffsetX <= halfOuterX) {
            // In the outer deadzone band — slow speed (90% reduction)
            panSpd = Math.max(1, Math.round(this.speed.pan * this.innerSpeedFactor));
        } else {
            // Beyond outer deadzone — moderate speed (50% reduction)
            panSpd = Math.max(1, Math.round(this.speed.pan * this.outerSpeedFactor));
        }

        // Calculate tilt speed based on vertical zone
        if (absOffsetY <= halfInnerY) {
            tiltSpd = 0; // No vertical movement needed
        } else if (absOffsetY <= halfOuterY) {
            tiltSpd = Math.max(1, Math.round(this.speed.tilt * this.innerSpeedFactor));
        } else {
            tiltSpd = Math.max(1, Math.round(this.speed.tilt * this.outerSpeedFactor));
        }

        // Determine movement direction (prioritize horizontal, then vertical)
        let commandSent = false;

        if (panSpd > 0 && absOffsetX > halfInnerX) {
            if (offsetX > 0) {
                await this.panRight(panSpd);
            } else {
                await this.panLeft(panSpd);
            }
            commandSent = true;
        } else if (tiltSpd > 0 && absOffsetY > halfInnerY) {
            if (offsetY > 0) {
                await this.tiltDown(tiltSpd);
            } else {
                await this.tiltUp(tiltSpd);
            }
            commandSent = true;
        }

        if (!commandSent && this.isMoving) {
            await this.stop();
        }
    }
}
