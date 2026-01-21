class IntentParser {
    constructor() {
        this.commands = [
            {
                patterns: [/follow\s*me/, /track\s*me/, /start\s*track/],
                intent: 'tracking_start',
                action: 'ptz',
                params: { tracking: true }
            },
            {
                patterns: [/stop\s*track/, /stop\s*follow/, /^stop$/],
                intent: 'tracking_stop',
                action: 'ptz',
                params: { tracking: false }
            },
            {
                patterns: [/zoom\s*in/, /closer/, /tighter/],
                intent: 'zoom_in',
                action: 'ptz',
                params: { zoom: 'in' }
            },
            {
                patterns: [/zoom\s*out/, /wider/, /further/],
                intent: 'zoom_out',
                action: 'ptz',
                params: { zoom: 'out' }
            },
            {
                patterns: [/go\s*wide/, /wide\s*shot/],
                intent: 'zoom_preset',
                action: 'ptz',
                params: { zoomPreset: 'wide' }
            },
            {
                patterns: [/go\s*medium/, /medium\s*shot/],
                intent: 'zoom_preset',
                action: 'ptz',
                params: { zoomPreset: 'medium' }
            },
            {
                patterns: [/go\s*tight/, /tight\s*shot/, /close\s*up/],
                intent: 'zoom_preset',
                action: 'ptz',
                params: { zoomPreset: 'tight' }
            },
            {
                patterns: [/pan\s*left/, /move\s*left/],
                intent: 'pan_left',
                action: 'ptz',
                params: { pan: 'left' }
            },
            {
                patterns: [/pan\s*right/, /move\s*right/],
                intent: 'pan_right',
                action: 'ptz',
                params: { pan: 'right' }
            },
            {
                patterns: [/tilt\s*up/, /look\s*up/],
                intent: 'tilt_up',
                action: 'ptz',
                params: { tilt: 'up' }
            },
            {
                patterns: [/tilt\s*down/, /look\s*down/],
                intent: 'tilt_down',
                action: 'ptz',
                params: { tilt: 'down' }
            },
            {
                patterns: [/camera\s*(\d+)/, /switch\s*(?:to\s*)?camera\s*(\d+)/, /cam\s*(\d+)/],
                intent: 'switch_camera',
                action: 'obs',
                extractParams: (match) => ({ scene: `Camera ${match[1]}`, sceneNumber: parseInt(match[1]) })
            },
            {
                patterns: [/scene\s*(\d+)/, /switch\s*(?:to\s*)?scene\s*(\d+)/],
                intent: 'switch_scene',
                action: 'obs',
                extractParams: (match) => ({ sceneNumber: parseInt(match[1]) })
            },
            {
                patterns: [/start\s*record/, /begin\s*record/],
                intent: 'start_recording',
                action: 'obs',
                params: { recording: 'start' }
            },
            {
                patterns: [/stop\s*record/, /end\s*record/],
                intent: 'stop_recording',
                action: 'obs',
                params: { recording: 'stop' }
            },
            {
                patterns: [/start\s*stream/, /go\s*live/],
                intent: 'start_streaming',
                action: 'obs',
                params: { streaming: 'start' }
            },
            {
                patterns: [/stop\s*stream/, /end\s*stream/],
                intent: 'stop_streaming',
                action: 'obs',
                params: { streaming: 'stop' }
            },
            {
                patterns: [/mute/, /mute\s*mic/],
                intent: 'mute',
                action: 'obs',
                params: { mute: true }
            },
            {
                patterns: [/unmute/, /unmute\s*mic/],
                intent: 'unmute',
                action: 'obs',
                params: { mute: false }
            },
            {
                patterns: [/home/, /center/, /reset\s*camera/],
                intent: 'home',
                action: 'ptz',
                params: { home: true }
            },
            {
                patterns: [/preset\s*(\d+)/, /go\s*(?:to\s*)?preset\s*(\d+)/],
                intent: 'goto_preset',
                action: 'ptz',
                extractParams: (match) => ({ preset: parseInt(match[1]) })
            }
        ];
    }

    parse(text) {
        const normalizedText = text.toLowerCase().trim();
        
        for (const command of this.commands) {
            for (const pattern of command.patterns) {
                const match = normalizedText.match(pattern);
                
                if (match) {
                    const result = {
                        intent: command.intent,
                        action: command.action,
                        originalText: text,
                        confidence: 1.0
                    };

                    if (command.extractParams) {
                        result.params = command.extractParams(match);
                    } else if (command.params) {
                        result.params = { ...command.params };
                    } else {
                        result.params = {};
                    }

                    return result;
                }
            }
        }

        return {
            intent: 'unknown',
            action: null,
            originalText: text,
            params: {},
            confidence: 0
        };
    }

    getAvailableCommands() {
        return this.commands.map(cmd => ({
            intent: cmd.intent,
            action: cmd.action,
            examples: cmd.patterns.map(p => p.source.replace(/\\/g, '').replace(/\^|\$/g, ''))
        }));
    }

    addCustomCommand(patterns, intent, action, params) {
        this.commands.unshift({
            patterns: patterns.map(p => new RegExp(p, 'i')),
            intent,
            action,
            params
        });
    }
}

window.IntentParser = IntentParser;
