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
    }

    async connect(url = 'ws://localhost:4455', password = '') {
        return new Promise((resolve, reject) => {
            try {
                if (window.reasoningConsole) {
                    window.reasoningConsole.logInfo(`Attempting connection to ${url}...`);
                }
                
                this.ws = new WebSocket(url);
                
                this.ws.onopen = () => {
                    if (window.reasoningConsole) {
                        window.reasoningConsole.logInfo('WebSocket connected, waiting for Hello...');
                    }
                };

                this.ws.onclose = (event) => {
                    this.connected = false;
                    this.currentScene = null;
                    if (this.onStatusChange) this.onStatusChange(false);
                    if (window.reasoningConsole) {
                        window.reasoningConsole.logInfo(`WebSocket closed: code=${event.code}, reason=${event.reason || 'none'}`);
                    }
                };

                this.ws.onerror = (error) => {
                    const errorMsg = `WebSocket error - Is OBS running? Is WebSocket enabled on port ${url.split(':').pop()}?`;
                    if (window.reasoningConsole) {
                        window.reasoningConsole.logError(errorMsg);
                    }
                    reject(new Error(errorMsg));
                };

                this.ws.onmessage = async (event) => {
                    const message = JSON.parse(event.data);
                    
                    if (window.reasoningConsole) {
                        window.reasoningConsole.logInfo(`Received OpCode ${message.op}`);
                    }
                    
                    if (message.op === 0) {
                        await this._handleHello(message.d, password);
                    } else if (message.op === 2) {
                        this.connected = true;
                        await this._loadScenes();
                        if (this.onStatusChange) this.onStatusChange(true);
                        if (window.reasoningConsole) {
                            window.reasoningConsole.logInfo(`OBS authenticated successfully. Found ${this.scenes.length} scene(s)`);
                        }
                        resolve();
                    }
                        resolve();
                    } else if (message.op === 7) {
                        this._handleResponse(message.d);
                    } else if (message.op === 5) {
                        this._handleEvent(message.d);
                    }
                };

                setTimeout(() => {
                    if (!this.connected && this.ws.readyState !== WebSocket.OPEN) {
                        reject(new Error('Connection timeout - check OBS WebSocket settings'));
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
            if (response && response.scenes) {
                this.scenes = response.scenes.map(s => s.sceneName);
                this.currentScene = response.currentProgramSceneName;
                if (this.onSceneChange) this.onSceneChange(this.currentScene);
                if (window.reasoningConsole) {
                    window.reasoningConsole.logInfo(`Loaded ${this.scenes.length} scenes: ${this.scenes.join(', ')}`);
                }
            } else {
                if (window.reasoningConsole) {
                    window.reasoningConsole.logError('GetSceneList returned unexpected format');
                }
            }
        } catch (error) {
            if (window.reasoningConsole) {
                window.reasoningConsole.logError('Failed to load scenes: ' + error.message);
            }
        }
    }

    async switchScene(sceneName) {
        if (!this.connected) {
            throw new Error('Not connected to OBS');
        }

        if (sceneName === this.currentScene) {
            if (window.reasoningConsole) {
                window.reasoningConsole.logInfo(`Already on scene: ${sceneName}`);
            }
            return false;
        }

        try {
            await this._sendRequest('SetCurrentProgramScene', {
                sceneName: sceneName
            });
            
            if (window.reasoningConsole) {
                window.reasoningConsole.logAction('Scene Switch', sceneName);
            }
            return true;
        } catch (error) {
            if (window.reasoningConsole) {
                window.reasoningConsole.logError(`Failed to switch scene: ${error.message}`);
            }
            throw error;
        }
    }

    async sendCommand(commandName) {
        if (!this.connected) {
            throw new Error('Not connected to OBS');
        }

        try {
            await this._sendRequest(commandName);
            if (window.reasoningConsole) {
                window.reasoningConsole.logAction('OBS Command', commandName);
            }
            return true;
        } catch (error) {
            if (window.reasoningConsole) {
                window.reasoningConsole.logError(`Command failed: ${error.message}`);
            }
            throw error;
        }
    }

    async toggleSource(sceneName, sourceName, visible) {
        if (!this.connected) {
            throw new Error('Not connected to OBS');
        }

        try {
            const sceneItemId = await this._getSceneItemId(sceneName, sourceName);
            await this._sendRequest('SetSceneItemEnabled', {
                sceneName,
                sceneItemId,
                sceneItemEnabled: visible
            });
            
            if (window.reasoningConsole) {
                window.reasoningConsole.logAction(`Source ${visible ? 'Show' : 'Hide'}`, sourceName);
            }
        } catch (error) {
            if (window.reasoningConsole) {
                window.reasoningConsole.logError(`Failed to toggle source: ${error.message}`);
            }
            throw error;
        }
    }

    async _getSceneItemId(sceneName, sourceName) {
        const response = await this._sendRequest('GetSceneItemId', {
            sceneName,
            sourceName
        });
        return response.sceneItemId;
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
