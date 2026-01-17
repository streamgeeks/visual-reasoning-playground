(function() {
    'use strict';

    const STORAGE_KEY = 'vrp_preferences';
    const VERSION = 1;

    const DEFAULT_PREFS = {
        version: VERSION,
        global: {
            detectionRate: 3,
            maxTokens: 200,
            showJsonOutput: true,
            darkMode: true,
            soundEnabled: false,
            autoSaveResults: false,
            resultHistoryLimit: 50,
            preferredCamera: null,
            consoleExpanded: true,
        },
        tools: {}
    };

    const TOOL_DEFAULTS = {
        'scene-describer': {
            autoDescribe: false,
            autoInterval: 5,
            responseLength: 'normal'
        },
        'object-tracker': {
            trackingTarget: 'person',
            confidenceThreshold: 0.7,
            drawBoundingBoxes: true,
            showLabels: true
        },
        'gesture-detector': {
            gestureSet: 'basic',
            sensitivity: 'medium',
            cooldownSeconds: 2
        },
        'ptz-controller': {
            cameraIp: '',
            presetCount: 6,
            moveSpeed: 0.5,
            panInvert: false,
            tiltInvert: false
        },
        'color-analyzer': {
            sampleSize: 5,
            colorFormat: 'hex',
            includeComplementary: true
        },
        'motion-detector': {
            sensitivity: 50,
            minArea: 1000,
            highlightMotion: true
        },
        'face-detector': {
            detectExpressions: true,
            detectAge: false,
            blurFaces: false
        },
        'text-reader': {
            language: 'eng',
            outputFormat: 'plain',
            preserveLayout: false
        },
        'sports-tracker': {
            sport: 'general',
            showTrails: true,
            trailLength: 30
        },
        'production-assistant': {
            sceneDetection: true,
            shotSuggestions: true,
            audioLevels: true
        },
        'obs-controller': {
            obsWebsocketUrl: 'ws://localhost:4455',
            obsPassword: '',
            autoSwitch: false
        },
        'vmix-controller': {
            vmixUrl: 'http://localhost:8088',
            pollInterval: 1000
        },
        'multi-camera': {
            gridLayout: '2x2',
            syncAnalysis: true
        }
    };

    let preferences = null;

    function loadPreferences() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.version !== VERSION) {
                    preferences = migratePreferences(parsed);
                    savePreferences();
                } else {
                    preferences = parsed;
                }
            } else {
                preferences = JSON.parse(JSON.stringify(DEFAULT_PREFS));
            }
        } catch (e) {
            console.warn('VRPPrefs: Failed to load preferences, using defaults', e);
            preferences = JSON.parse(JSON.stringify(DEFAULT_PREFS));
        }
        return preferences;
    }

    function savePreferences() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
            window.dispatchEvent(new CustomEvent('vrp-preferences-changed', { 
                detail: preferences 
            }));
        } catch (e) {
            console.error('VRPPrefs: Failed to save preferences', e);
        }
    }

    function migratePreferences(oldPrefs) {
        const newPrefs = JSON.parse(JSON.stringify(DEFAULT_PREFS));
        
        if (oldPrefs.global) {
            Object.assign(newPrefs.global, oldPrefs.global);
        }
        
        if (oldPrefs.tools) {
            Object.assign(newPrefs.tools, oldPrefs.tools);
        }
        
        newPrefs.version = VERSION;
        return newPrefs;
    }

    function getCurrentToolId() {
        const path = window.location.pathname;
        const match = path.match(/\/(\d+-[^/]+)\//);
        if (match) {
            return match[1].replace(/^\d+-/, '');
        }
        const parts = path.split('/').filter(Boolean);
        if (parts.length > 0) {
            const folder = parts[parts.length - 1] || parts[parts.length - 2];
            if (folder && folder !== 'index.html') {
                return folder.replace(/^\d+-/, '');
            }
        }
        return 'global';
    }

    loadPreferences();

    window.addEventListener('storage', function(e) {
        if (e.key === STORAGE_KEY) {
            loadPreferences();
            window.dispatchEvent(new CustomEvent('vrp-preferences-updated', { 
                detail: preferences 
            }));
        }
    });

    const VRPPrefs = {
        get(key, defaultValue = null) {
            if (!preferences) loadPreferences();
            const value = preferences.global[key];
            return value !== undefined ? value : defaultValue;
        },

        set(key, value) {
            if (!preferences) loadPreferences();
            preferences.global[key] = value;
            savePreferences();
        },

        getToolPref(toolId, key, defaultValue = null) {
            if (!preferences) loadPreferences();
            
            if (preferences.tools[toolId] && preferences.tools[toolId][key] !== undefined) {
                return preferences.tools[toolId][key];
            }
            
            if (TOOL_DEFAULTS[toolId] && TOOL_DEFAULTS[toolId][key] !== undefined) {
                return TOOL_DEFAULTS[toolId][key];
            }
            
            return defaultValue;
        },

        setToolPref(toolId, key, value) {
            if (!preferences) loadPreferences();
            if (!preferences.tools[toolId]) {
                preferences.tools[toolId] = {};
            }
            preferences.tools[toolId][key] = value;
            savePreferences();
        },

        getCurrentToolPrefs() {
            const toolId = getCurrentToolId();
            return this.getAllToolPrefs(toolId);
        },

        getAllToolPrefs(toolId) {
            if (!preferences) loadPreferences();
            const defaults = TOOL_DEFAULTS[toolId] || {};
            const saved = preferences.tools[toolId] || {};
            return { ...defaults, ...saved };
        },

        setToolPrefs(toolId, prefs) {
            if (!preferences) loadPreferences();
            if (!preferences.tools[toolId]) {
                preferences.tools[toolId] = {};
            }
            Object.assign(preferences.tools[toolId], prefs);
            savePreferences();
        },

        resetToolPrefs(toolId) {
            if (!preferences) loadPreferences();
            delete preferences.tools[toolId];
            savePreferences();
        },

        resetAll() {
            preferences = JSON.parse(JSON.stringify(DEFAULT_PREFS));
            savePreferences();
        },

        export() {
            if (!preferences) loadPreferences();
            return JSON.stringify(preferences, null, 2);
        },

        import(json) {
            try {
                const imported = JSON.parse(json);
                if (imported.version && imported.global) {
                    preferences = migratePreferences(imported);
                    savePreferences();
                    return true;
                }
            } catch (e) {
                console.error('VRPPrefs: Failed to import preferences', e);
            }
            return false;
        },

        getCurrentToolId,

        onChange(callback) {
            window.addEventListener('vrp-preferences-changed', (e) => callback(e.detail));
            window.addEventListener('vrp-preferences-updated', (e) => callback(e.detail));
        },

        bindInput(inputSelector, toolId, prefKey) {
            const input = document.querySelector(inputSelector);
            if (!input) return;

            const value = toolId === 'global' 
                ? this.get(prefKey) 
                : this.getToolPref(toolId, prefKey);

            if (input.type === 'checkbox') {
                input.checked = !!value;
            } else if (input.type === 'range' || input.type === 'number') {
                input.value = value ?? input.value;
            } else {
                input.value = value ?? '';
            }

            const saveHandler = () => {
                let newValue;
                if (input.type === 'checkbox') {
                    newValue = input.checked;
                } else if (input.type === 'range' || input.type === 'number') {
                    newValue = parseFloat(input.value);
                } else {
                    newValue = input.value;
                }

                if (toolId === 'global') {
                    this.set(prefKey, newValue);
                } else {
                    this.setToolPref(toolId, prefKey, newValue);
                }
            };

            input.addEventListener('change', saveHandler);
            if (input.type === 'range') {
                input.addEventListener('input', saveHandler);
            }
        },

        bindInputs(bindings) {
            Object.entries(bindings).forEach(([selector, config]) => {
                this.bindInput(selector, config.tool, config.key);
            });
        },

        getToolDefaults(toolId) {
            return TOOL_DEFAULTS[toolId] || {};
        }
    };

    window.VRPPrefs = VRPPrefs;
})();
