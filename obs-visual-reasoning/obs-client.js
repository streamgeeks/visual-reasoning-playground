class OBSClient {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.currentScene = null;
        this.scenes = [];
        this.requestId = 0;
        this.pendingRequests = new Map();
        this.onStatusChange = null;
        this.onSceneChange = null;
        this.onScenesLoaded = null;
    }

    async connect(url = 'ws://localhost:4455', password = '') {
        return new Promise((resolve, reject) => {
            try {
                console.log(`[OBS] Connecting to ${url}...`);
                
                this.ws = new WebSocket(url);
                
                this.ws.onopen = () => {
                    console.log('[OBS] WebSocket connected, awaiting Hello...');
                };

                this.ws.onclose = (event) => {
                    this.connected = false;
                    this.currentScene = null;
                    if (this.onStatusChange) this.onStatusChange(false);
                    console.log(`[OBS] Disconnected: code=${event.code}`);
                };

                this.ws.onerror = (error) => {
                    console.error('[OBS] WebSocket error');
                    reject(new Error('Connection failed - Is OBS running with WebSocket enabled?'));
                };

                this.ws.onmessage = async (event) => {
                    const message = JSON.parse(event.data);
                    
                    if (message.op === 0) {
                        await this._handleHello(message.d, password);
                    } else if (message.op === 2) {
                        this.connected = true;
                        if (this.onStatusChange) this.onStatusChange(true);
                        await this._loadScenes();
                        console.log('[OBS] Authenticated successfully');
                        resolve();
                    } else if (message.op === 7) {
                        this._handleResponse(message.d);
                    } else if (message.op === 5) {
                        this._handleEvent(message.d);
                    }
                };

                setTimeout(() => {
                    if (!this.connected && this.ws.readyState !== WebSocket.OPEN) {
                        reject(new Error('Connection timeout'));
                    }
                }, 5000);

            } catch (error) {
                reject(error);
            }
        });
    }

    async _handleHello(data, password) {
        const authPayload = { rpcVersion: 1 };
        
        if (data.authentication) {
            const { challenge, salt } = data.authentication;
            const secret = await this._generateAuth(password, salt, challenge);
            authPayload.authentication = secret;
        }

        this.ws.send(JSON.stringify({
            op: 1,
            d: authPayload
        }));
    }

    async _generateAuth(password, salt, challenge) {
        const encoder = new TextEncoder();
        
        const secretHash = await crypto.subtle.digest(
            'SHA-256',
            encoder.encode(password + salt)
        );
        const secretBase64 = btoa(String.fromCharCode(...new Uint8Array(secretHash)));
        
        const authHash = await crypto.subtle.digest(
            'SHA-256', 
            encoder.encode(secretBase64 + challenge)
        );
        return btoa(String.fromCharCode(...new Uint8Array(authHash)));
    }

    _sendRequest(requestType, requestData = {}) {
        return new Promise((resolve, reject) => {
            const requestId = `req_${++this.requestId}`;
            
            this.pendingRequests.set(requestId, { resolve, reject });
            
            this.ws.send(JSON.stringify({
                op: 6,
                d: {
                    requestType,
                    requestId,
                    requestData
                }
            }));

            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error('Request timeout'));
                }
            }, 10000);
        });
    }

    _handleResponse(data) {
        const { requestId, requestStatus, responseData } = data;
        const pending = this.pendingRequests.get(requestId);
        
        if (pending) {
            this.pendingRequests.delete(requestId);
            if (requestStatus.result) {
                pending.resolve(responseData);
            } else {
                pending.reject(new Error(requestStatus.comment || 'Request failed'));
            }
        }
    }

    _handleEvent(data) {
        if (data.eventType === 'CurrentProgramSceneChanged') {
            this.currentScene = data.eventData.sceneName;
            if (this.onSceneChange) this.onSceneChange(this.currentScene);
        }
    }

    async _loadScenes() {
        try {
            const response = await this._sendRequest('GetSceneList');
            this.scenes = response.scenes.map(s => s.sceneName).reverse();
            this.currentScene = response.currentProgramSceneName;
            if (this.onSceneChange) this.onSceneChange(this.currentScene);
            if (this.onScenesLoaded) this.onScenesLoaded(this.scenes);
        } catch (error) {
            console.error('[OBS] Failed to load scenes:', error);
        }
    }

    async switchScene(sceneName) {
        if (!this.connected) {
            throw new Error('Not connected to OBS');
        }

        if (sceneName === this.currentScene) {
            console.log(`[OBS] Already on scene: ${sceneName}`);
            return false;
        }

        try {
            await this._sendRequest('SetCurrentProgramScene', {
                sceneName: sceneName
            });
            console.log(`[OBS] Switched to: ${sceneName}`);
            return true;
        } catch (error) {
            console.error(`[OBS] Switch failed: ${error.message}`);
            throw error;
        }
    }

    async sendCommand(commandName) {
        if (!this.connected) {
            throw new Error('Not connected to OBS');
        }

        try {
            await this._sendRequest(commandName);
            console.log(`[OBS] Command: ${commandName}`);
            return true;
        } catch (error) {
            console.error(`[OBS] Command failed: ${error.message}`);
            throw error;
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.currentScene = null;
    }

    isConnected() {
        return this.connected;
    }

    getCurrentScene() {
        return this.currentScene;
    }

    getScenes() {
        return this.scenes;
    }
}

window.OBSClient = OBSClient;
