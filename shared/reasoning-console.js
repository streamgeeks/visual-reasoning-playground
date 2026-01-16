class ReasoningConsole {
    constructor(options = {}) {
        this.options = {
            maxEntries: 100,
            position: 'bottom',
            startCollapsed: false,
            showTimestamps: true,
            showConfidence: true,
            ...options
        };

        this.entries = [];
        this.stats = {
            apiCalls: 0,
            totalLatency: 0,
            errors: 0,
            detections: 0
        };

        this.consoleElement = null;
        this.isCollapsed = this.options.startCollapsed;
        
        this._injectStyles();
        this._createConsole();
    }

    _injectStyles() {
        if (document.getElementById('reasoning-console-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'reasoning-console-styles';
        styles.textContent = `
            .rc-container {
                position: fixed;
                top: 80px;
                left: 15px;
                width: 380px;
                z-index: 9000;
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: 12px;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            }

            .rc-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 14px;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-bottom: 2px solid #3066BE;
                cursor: pointer;
                user-select: none;
            }

            .rc-header:hover {
                background: linear-gradient(135deg, #1f1f3a 0%, #1a2744 100%);
            }

            .rc-title {
                display: flex;
                align-items: center;
                gap: 8px;
                color: #93CCEA;
                font-weight: 600;
                font-size: 12px;
            }

            .rc-title-icon {
                font-size: 14px;
            }

            .rc-stats {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }

            .rc-stat {
                display: flex;
                align-items: center;
                gap: 4px;
                color: #778DA9;
                font-size: 10px;
            }

            .rc-stat-value {
                color: #E0E1DD;
                font-weight: 600;
            }

            .rc-stat.success .rc-stat-value { color: #2A9D8F; }
            .rc-stat.warning .rc-stat-value { color: #E9C46A; }
            .rc-stat.error .rc-stat-value { color: #E63946; }

            .rc-toggle {
                color: #778DA9;
                font-size: 14px;
                transition: transform 0.3s;
            }

            .rc-container.collapsed .rc-toggle {
                transform: rotate(180deg);
            }

            .rc-body {
                background: rgba(13, 27, 42, 0.98);
                height: 300px;
                overflow-y: auto;
                transition: height 0.3s ease;
            }

            .rc-container.collapsed .rc-body {
                height: 0;
                overflow: hidden;
            }

            .rc-stats-bar {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 6px 12px;
                background: rgba(13, 27, 42, 0.95);
                border-bottom: 1px solid #2a3f5f;
                flex-wrap: wrap;
            }

            .rc-entries {
                padding: 8px;
            }

            .rc-entry {
                display: flex;
                gap: 12px;
                padding: 6px 10px;
                border-radius: 4px;
                margin-bottom: 4px;
                animation: rc-fadeIn 0.3s ease;
            }

            @keyframes rc-fadeIn {
                from { opacity: 0; transform: translateY(-5px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .rc-entry.api-call { background: rgba(48, 102, 190, 0.15); border-left: 3px solid #3066BE; }
            .rc-entry.detection { background: rgba(42, 157, 143, 0.15); border-left: 3px solid #2A9D8F; }
            .rc-entry.decision { background: rgba(147, 204, 234, 0.15); border-left: 3px solid #93CCEA; }
            .rc-entry.action { background: rgba(17, 157, 164, 0.15); border-left: 3px solid #119DA4; }
            .rc-entry.error { background: rgba(230, 57, 70, 0.15); border-left: 3px solid #E63946; }
            .rc-entry.info { background: rgba(119, 141, 169, 0.1); border-left: 3px solid #778DA9; }

            .rc-timestamp {
                color: #778DA9;
                min-width: 85px;
                flex-shrink: 0;
            }

            .rc-type {
                min-width: 80px;
                flex-shrink: 0;
                font-weight: 600;
                text-transform: uppercase;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 3px;
            }

            .rc-entry.api-call .rc-type { color: #3066BE; background: rgba(48, 102, 190, 0.2); }
            .rc-entry.detection .rc-type { color: #2A9D8F; background: rgba(42, 157, 143, 0.2); }
            .rc-entry.decision .rc-type { color: #93CCEA; background: rgba(147, 204, 234, 0.2); }
            .rc-entry.action .rc-type { color: #119DA4; background: rgba(17, 157, 164, 0.2); }
            .rc-entry.error .rc-type { color: #E63946; background: rgba(230, 57, 70, 0.2); }
            .rc-entry.info .rc-type { color: #778DA9; background: rgba(119, 141, 169, 0.2); }

            .rc-message {
                color: #E0E1DD;
                flex: 1;
            }

            .rc-confidence {
                min-width: 60px;
                text-align: right;
                font-weight: 600;
            }

            .rc-confidence.high { color: #2A9D8F; }
            .rc-confidence.medium { color: #E9C46A; }
            .rc-confidence.low { color: #E63946; }

            .rc-latency {
                min-width: 60px;
                text-align: right;
                color: #778DA9;
            }

            .rc-latency.fast { color: #2A9D8F; }
            .rc-latency.normal { color: #E9C46A; }
            .rc-latency.slow { color: #E63946; }

            .rc-empty {
                text-align: center;
                color: #778DA9;
                padding: 30px;
            }

            .rc-clear-btn {
                background: transparent;
                border: 1px solid #778DA9;
                color: #778DA9;
                padding: 4px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                margin-left: 15px;
            }

            .rc-clear-btn:hover {
                background: rgba(119, 141, 169, 0.2);
                color: #E0E1DD;
            }

            .rc-body::-webkit-scrollbar {
                width: 8px;
            }

            .rc-body::-webkit-scrollbar-track {
                background: rgba(13, 27, 42, 0.5);
            }

            .rc-body::-webkit-scrollbar-thumb {
                background: #3066BE;
                border-radius: 4px;
            }

            .rc-body::-webkit-scrollbar-thumb:hover {
                background: #4080d0;
            }

            .rc-highlight {
                background: rgba(233, 196, 106, 0.3);
                padding: 0 4px;
                border-radius: 2px;
            }

            .rc-code {
                font-family: 'Consolas', 'Monaco', monospace;
                background: rgba(0, 0, 0, 0.3);
                padding: 1px 5px;
                border-radius: 3px;
                color: #93CCEA;
            }
        `;
        document.head.appendChild(styles);
    }

    _createConsole() {
        this.consoleElement = document.createElement('div');
        this.consoleElement.className = 'rc-container' + (this.isCollapsed ? ' collapsed' : '');
        this.consoleElement.innerHTML = `
            <div class="rc-header" onclick="window.reasoningConsole.toggle()">
                <div class="rc-title">
                    <span class="rc-title-icon">🧠</span>
                    <span>VISUAL REASONING</span>
                </div>
                <div class="rc-toggle">▼</div>
            </div>
            <div class="rc-stats-bar">
                <div class="rc-stat">
                    <span>Calls:</span>
                    <span class="rc-stat-value" id="rc-stat-calls">0</span>
                </div>
                <div class="rc-stat success">
                    <span>Detections:</span>
                    <span class="rc-stat-value" id="rc-stat-detections">0</span>
                </div>
                <div class="rc-stat">
                    <span>Latency:</span>
                    <span class="rc-stat-value" id="rc-stat-latency">-</span>
                </div>
                <div class="rc-stat error">
                    <span>Errors:</span>
                    <span class="rc-stat-value" id="rc-stat-errors">0</span>
                </div>
                <button class="rc-clear-btn" onclick="event.stopPropagation(); window.reasoningConsole.clear()">Clear</button>
            </div>
            <div class="rc-body">
                <div class="rc-entries" id="rc-entries">
                    <div class="rc-empty">
                        Waiting for visual reasoning activity...<br>
                        <small>Real-time AI decision log</small>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.consoleElement);
    }

    _formatTime() {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            fractionalSecondDigits: 2
        });
    }

    _getConfidenceClass(confidence) {
        if (confidence >= 0.8) return 'high';
        if (confidence >= 0.5) return 'medium';
        return 'low';
    }

    _getLatencyClass(ms) {
        if (ms < 500) return 'fast';
        if (ms < 1500) return 'normal';
        return 'slow';
    }

    _addEntry(type, message, metadata = {}) {
        const entriesContainer = document.getElementById('rc-entries');
        
        if (this.entries.length === 0) {
            entriesContainer.innerHTML = '';
        }

        const entry = {
            type,
            message,
            timestamp: this._formatTime(),
            ...metadata
        };

        this.entries.unshift(entry);
        if (this.entries.length > this.options.maxEntries) {
            this.entries.pop();
        }

        let html = `
            <div class="rc-entry ${type}">
                <span class="rc-timestamp">${entry.timestamp}</span>
                <span class="rc-type">${type}</span>
                <span class="rc-message">${message}</span>
        `;

        if (metadata.confidence !== undefined) {
            const confClass = this._getConfidenceClass(metadata.confidence);
            html += `<span class="rc-confidence ${confClass}">${(metadata.confidence * 100).toFixed(0)}%</span>`;
        }

        if (metadata.latency !== undefined) {
            const latClass = this._getLatencyClass(metadata.latency);
            html += `<span class="rc-latency ${latClass}">${metadata.latency}ms</span>`;
        }

        html += '</div>';

        entriesContainer.insertAdjacentHTML('afterbegin', html);

        while (entriesContainer.children.length > this.options.maxEntries) {
            entriesContainer.removeChild(entriesContainer.lastChild);
        }
    }

    _updateStats() {
        document.getElementById('rc-stat-calls').textContent = this.stats.apiCalls;
        document.getElementById('rc-stat-detections').textContent = this.stats.detections;
        document.getElementById('rc-stat-errors').textContent = this.stats.errors;
        
        const avgLatency = this.stats.apiCalls > 0 
            ? Math.round(this.stats.totalLatency / this.stats.apiCalls) 
            : 0;
        document.getElementById('rc-stat-latency').textContent = avgLatency > 0 ? `${avgLatency}ms` : '-';
    }

    logApiCall(endpoint, latency) {
        this.stats.apiCalls++;
        this.stats.totalLatency += latency;
        this._updateStats();
        this._addEntry('api-call', 
            `Called <span class="rc-code">${endpoint}</span>`, 
            { latency }
        );
    }

    logDetection(objectType, count, confidence, details = '') {
        this.stats.detections += count;
        this._updateStats();
        
        const msg = count > 0 
            ? `Found <span class="rc-highlight">${count} ${objectType}${count > 1 ? 's' : ''}</span>${details ? ' - ' + details : ''}`
            : `No <span class="rc-highlight">${objectType}</span> detected`;
        
        this._addEntry('detection', msg, { confidence });
    }

    logDecision(decision, reason) {
        this._addEntry('decision', 
            `<strong>${decision}</strong> → ${reason}`
        );
    }

    logAction(action, target = '') {
        this._addEntry('action', 
            `Executing: <span class="rc-highlight">${action}</span>${target ? ' on ' + target : ''}`
        );
    }

    logError(error) {
        this.stats.errors++;
        this._updateStats();
        this._addEntry('error', error);
    }

    logInfo(message) {
        this._addEntry('info', message);
    }

    logSceneDescription(description, latency) {
        this.stats.apiCalls++;
        this.stats.totalLatency += latency;
        this._updateStats();
        this._addEntry('detection', 
            `Scene: <em>"${description.substring(0, 100)}${description.length > 100 ? '...' : ''}"</em>`,
            { latency }
        );
    }

    logConfidenceThreshold(actual, threshold, passed) {
        const status = passed ? 'PASSED' : 'BLOCKED';
        const msg = `Confidence check: ${(actual * 100).toFixed(0)}% vs ${(threshold * 100).toFixed(0)}% threshold → <strong>${status}</strong>`;
        this._addEntry(passed ? 'decision' : 'info', msg, { confidence: actual });
    }

    logTrackingUpdate(x, y, action) {
        this._addEntry('action', 
            `Target at <span class="rc-code">(${(x * 100).toFixed(1)}%, ${(y * 100).toFixed(1)}%)</span> → ${action}`
        );
    }

    toggle() {
        this.isCollapsed = !this.isCollapsed;
        this.consoleElement.classList.toggle('collapsed', this.isCollapsed);
    }

    show() {
        this.isCollapsed = false;
        this.consoleElement.classList.remove('collapsed');
    }

    hide() {
        this.isCollapsed = true;
        this.consoleElement.classList.add('collapsed');
    }

    clear() {
        this.entries = [];
        this.stats = { apiCalls: 0, totalLatency: 0, errors: 0, detections: 0 };
        this._updateStats();
        document.getElementById('rc-entries').innerHTML = `
            <div class="rc-empty">
                Console cleared.<br>
                <small>Waiting for visual reasoning activity...</small>
            </div>
        `;
    }
}

window.ReasoningConsole = ReasoningConsole;
