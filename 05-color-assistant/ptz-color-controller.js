class PTZColorController {
    constructor(cameraIP) {
        this.cameraIP = cameraIP;
    }

    setCameraIP(ip) {
        this.cameraIP = ip;
    }

    async sendCommand(command) {
        if (!this.cameraIP) {
            throw new Error('Camera IP not set');
        }
        
        const url = `http://${this.cameraIP}/cgi-bin/param.cgi?${command}`;
        if (window.reasoningConsole) {
            window.reasoningConsole.logInfo(`Color Command: ${command}`);
        }
        
        await fetch(url, { method: 'GET', mode: 'no-cors' });
        return true;
    }

    async setBrightness(value) {
        return this.sendCommand(`post_image_value&bright&${value}`);
    }

    async setContrast(value) {
        return this.sendCommand(`post_image_value&contrast&${value}`);
    }

    async setSaturation(value) {
        return this.sendCommand(`post_image_value&saturation&${value}`);
    }

    async setSharpness(value) {
        return this.sendCommand(`post_image_value&sharpness&${value}`);
    }

    async setWhiteBalance(mode) {
        const wbModes = {
            'auto': 0,
            'indoor': 1,
            'outdoor': 2,
            'onepush': 3,
            'manual': 5
        };
        const modeValue = wbModes[mode] ?? 0;
        return this.sendCommand(`post_image_value&wbmode&${modeValue}`);
    }

    async setExposureMode(mode) {
        const expModes = {
            'auto': 0,
            'manual': 1,
            'shutter': 2,
            'iris': 3,
            'bright': 4
        };
        const modeValue = expModes[mode] ?? 0;
        return this.sendCommand(`post_image_value&expmode&${modeValue}`);
    }

    async setGain(value) {
        return this.sendCommand(`post_image_value&gain&${value}`);
    }

    async resetToDefaults() {
        await this.setBrightness(8);
        await this.setContrast(8);
        await this.setSaturation(8);
        await this.setSharpness(6);
        await this.setWhiteBalance('auto');
        return true;
    }

    async applyColorProfile(profile) {
        if (profile.brightness !== undefined) {
            await this.setBrightness(profile.brightness);
        }
        if (profile.contrast !== undefined) {
            await this.setContrast(profile.contrast);
        }
        if (profile.saturation !== undefined) {
            await this.setSaturation(profile.saturation);
        }
        if (profile.sharpness !== undefined) {
            await this.setSharpness(profile.sharpness);
        }
        if (profile.whiteBalance) {
            await this.setWhiteBalance(profile.whiteBalance);
        }
        return true;
    }
}

window.PTZColorController = PTZColorController;
