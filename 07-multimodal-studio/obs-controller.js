class OBSController {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.currentScene = null;
        this.scenes = [];
        this.requestId = 0;
        this.pendingRequests = new Map();
        this.onStatusChange = null;
        this.onSceneChange = null;
        this.isRecording = false;
        this.isStreaming = false;
    }

    async connect(host = 'localhost:4455', password = '') {
        const url = host.startsWith('ws://') ? host : `ws://${host}`;
        
        return new Promise((resolve, reject) => {
            try {
                if (window.reasoningConsole) {
                    window.reasoningConsole.logInfo(`Connecting to OBS at ${url}...`);
                }
                
                this.ws = new WebSocket(url);
                
                this.ws.onopen = () => {
                    if (window.reasoningConsole) {
                        window.reasoningConsole.logInfo('WebSocket connected, authenticating...');
                    }
                };

                this.ws.onclose = (event) => {
                    this.connected = false;
                    this.currentScene = null;
                    if (this.onStatusChange) this.onStatusChange(false);
                };

                this.ws.onerror = (error) => {
                    reject(new Error('WebSocket error - Is OBS running with WebSocket enabled?'));
                };

                this.ws.onmessage = async (event) => {
                    const message = JSON.parse(event.data);
                    
                    if (message.op === 0) {
                        await this._handleHello(message.d, password);
                    } else if (message.op === 2) {
                        this.connected = true;
                        if (this.onStatusChange) this.onStatusChange(true);
                        await this._loadState();
                        if (window.reasoningConsole) {
                            window.reasoningConsole.logInfo('OBS connected successfully');
                        }
                        resolve();
                    } else if (message.op === 7) {
                        this._handleResponse(message.d);
                    } else if (message.op === 5) {
                        this._handleEvent(message.d);
                    }
                };

                setTimeout(() => {
                    if (!this.connected) {
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
            authPayload.authentication = await this._generateAuth(password, salt, challenge);
        }

        this.ws.send(JSON.stringify({ op: 1, d: authPayload }));
    }

    async _generateAuth(password, salt, challenge) {
        const encoder = new TextEncoder();
        const secretHash = await crypto.subtle.digest('SHA-256', encoder.encode(password + salt));
        const secretBase64 = btoa(String.fromCharCode(...new Uint8Array(secretHash)));
        const authHash = await crypto.subtle.digest('SHA-256', encoder.encode(secretBase64 + challenge));
        return btoa(String.fromCharCode(...new Uint8Array(authHash)));
    }

    _sendRequest(requestType, requestData = {}) {
        return new Promise((resolve, reject) => {
            const requestId = `req_${++this.requestId}`;
            this.pendingRequests.set(requestId, { resolve, reject });
            
            this.ws.send(JSON.stringify({
                op: 6,
                d: { requestType, requestId, requestData }
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
        switch (data.eventType) {
            case 'CurrentProgramSceneChanged':
                this.currentScene = data.eventData.sceneName;
                if (this.onSceneChange) this.onSceneChange(this.currentScene);
                break;
            case 'RecordStateChanged':
                this.isRecording = data.eventData.outputActive;
                break;
            case 'StreamStateChanged':
                this.isStreaming = data.eventData.outputActive;
                break;
        }
    }

    async _loadState() {
        try {
            const sceneResponse = await this._sendRequest('GetSceneList');
            this.scenes = sceneResponse.scenes.map(s => s.sceneName);
            this.currentScene = sceneResponse.currentProgramSceneName;
            if (this.onSceneChange) this.onSceneChange(this.currentScene);

            const recordStatus = await this._sendRequest('GetRecordStatus');
            this.isRecording = recordStatus.outputActive;

            try {
                const streamStatus = await this._sendRequest('GetStreamStatus');
                this.isStreaming = streamStatus.outputActive;
            } catch (e) {}
        } catch (error) {
            console.error('Failed to load OBS state:', error);
        }
    }

    async switchScene(sceneName) {
        if (!this.connected) throw new Error('Not connected to OBS');
        if (sceneName === this.currentScene) return false;

        await this._sendRequest('SetCurrentProgramScene', { sceneName });
        
        if (window.reasoningConsole) {
            window.reasoningConsole.logAction('Scene Switch', sceneName);
        }
        return true;
    }

    async switchToSceneByNumber(sceneNumber) {
        if (!this.connected) throw new Error('Not connected to OBS');
        
        const index = sceneNumber - 1;
        if (index < 0 || index >= this.scenes.length) {
            throw new Error(`Scene ${sceneNumber} not found. Available: 1-${this.scenes.length}`);
        }

        const sceneName = this.scenes[this.scenes.length - 1 - index];
        return this.switchScene(sceneName);
    }

    async startRecording() {
        if (!this.connected) throw new Error('Not connected to OBS');
        if (this.isRecording) return false;

        await this._sendRequest('StartRecord');
        this.isRecording = true;
        
        if (window.reasoningConsole) {
            window.reasoningConsole.logAction('Recording', 'Started');
        }
        return true;
    }

    async stopRecording() {
        if (!this.connected) throw new Error('Not connected to OBS');
        if (!this.isRecording) return false;

        await this._sendRequest('StopRecord');
        this.isRecording = false;
        
        if (window.reasoningConsole) {
            window.reasoningConsole.logAction('Recording', 'Stopped');
        }
        return true;
    }

    async startStreaming() {
        if (!this.connected) throw new Error('Not connected to OBS');
        if (this.isStreaming) return false;

        await this._sendRequest('StartStream');
        this.isStreaming = true;
        
        if (window.reasoningConsole) {
            window.reasoningConsole.logAction('Streaming', 'Started');
        }
        return true;
    }

    async stopStreaming() {
        if (!this.connected) throw new Error('Not connected to OBS');
        if (!this.isStreaming) return false;

        await this._sendRequest('StopStream');
        this.isStreaming = false;
        
        if (window.reasoningConsole) {
            window.reasoningConsole.logAction('Streaming', 'Stopped');
        }
        return true;
    }

    async setSourceMute(sourceName, muted) {
        if (!this.connected) throw new Error('Not connected to OBS');

        await this._sendRequest('SetInputMute', {
            inputName: sourceName,
            inputMuted: muted
        });
        
        if (window.reasoningConsole) {
            window.reasoningConsole.logAction(muted ? 'Muted' : 'Unmuted', sourceName);
        }
        return true;
    }

    async toggleSource(sceneName, sourceName, visible) {
        if (!this.connected) throw new Error('Not connected to OBS');

        const sceneItemId = await this._getSceneItemId(sceneName, sourceName);
        await this._sendRequest('SetSceneItemEnabled', {
            sceneName,
            sceneItemId,
            sceneItemEnabled: visible
        });
        
        if (window.reasoningConsole) {
            window.reasoningConsole.logAction(`Source ${visible ? 'Show' : 'Hide'}`, sourceName);
        }
    }

    async _getSceneItemId(sceneName, sourceName) {
        const response = await this._sendRequest('GetSceneItemId', { sceneName, sourceName });
        return response.sceneItemId;
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }

    isConnected() { return this.connected; }
    getCurrentScene() { return this.currentScene; }
    getScenes() { return this.scenes; }
    getRecordingStatus() { return this.isRecording; }
    getStreamingStatus() { return this.isStreaming; }
}

window.OBSController = OBSController;
