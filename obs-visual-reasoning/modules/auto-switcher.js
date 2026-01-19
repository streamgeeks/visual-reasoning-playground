class AutoSwitcher {
    constructor(options = {}) {
        this.obsClient = options.obsClient;
        this.onRuleTriggered = options.onRuleTriggered || (() => {});
        this.onStatusUpdate = options.onStatusUpdate || (() => {});
        
        this.isEnabled = false;
        this.rules = [];
        this.lastTriggeredRule = null;
        this.lastTriggerTime = 0;
        this.cooldown = options.cooldown || 5000;
        
        this._loadRules();
    }

    setOBSClient(client) {
        this.obsClient = client;
    }

    setCooldown(ms) {
        this.cooldown = ms;
    }

    _loadRules() {
        try {
            const saved = localStorage.getItem('vr_autoswitch_rules');
            if (saved) {
                this.rules = JSON.parse(saved);
            }
        } catch (e) {
            console.error('[AutoSwitcher] Failed to load rules:', e);
        }
    }

    _saveRules() {
        try {
            localStorage.setItem('vr_autoswitch_rules', JSON.stringify(this.rules));
        } catch (e) {
            console.error('[AutoSwitcher] Failed to save rules:', e);
        }
    }

    addRule(keywords, sceneName) {
        const rule = {
            id: Date.now(),
            keywords: keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k),
            sceneName,
            enabled: true,
            triggerCount: 0
        };
        
        this.rules.push(rule);
        this._saveRules();
        return rule;
    }

    removeRule(ruleId) {
        this.rules = this.rules.filter(r => r.id !== ruleId);
        this._saveRules();
    }

    toggleRule(ruleId, enabled) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (rule) {
            rule.enabled = enabled;
            this._saveRules();
        }
    }

    getRules() {
        return this.rules;
    }

    canTrigger() {
        return (Date.now() - this.lastTriggerTime) >= this.cooldown;
    }

    checkDescription(description) {
        if (!this.isEnabled || !description) return null;
        
        const lowerDesc = description.toLowerCase();
        
        for (const rule of this.rules) {
            if (!rule.enabled) continue;
            
            const match = rule.keywords.some(keyword => lowerDesc.includes(keyword));
            
            if (match) {
                return rule;
            }
        }
        
        return null;
    }

    async processDescription(description) {
        if (!this.isEnabled) return;
        if (!this.obsClient || !this.obsClient.isConnected()) return;
        
        const matchedRule = this.checkDescription(description);
        
        if (matchedRule && this.canTrigger()) {
            const currentScene = this.obsClient.getCurrentScene();
            
            if (currentScene === matchedRule.sceneName) {
                return;
            }
            
            try {
                const switched = await this.obsClient.switchScene(matchedRule.sceneName);
                
                if (switched) {
                    this.lastTriggeredRule = matchedRule;
                    this.lastTriggerTime = Date.now();
                    matchedRule.triggerCount++;
                    this._saveRules();
                    
                    const triggerInfo = {
                        rule: matchedRule,
                        description,
                        timestamp: new Date()
                    };
                    
                    this.onRuleTriggered(triggerInfo);
                    console.log(`[AutoSwitcher] Triggered: ${matchedRule.keywords.join(', ')} → ${matchedRule.sceneName}`);
                }
            } catch (error) {
                console.error('[AutoSwitcher] Switch failed:', error);
            }
        }
    }

    enable() {
        this.isEnabled = true;
        this.onStatusUpdate('Active');
        console.log('[AutoSwitcher] Enabled');
    }

    disable() {
        this.isEnabled = false;
        this.onStatusUpdate('Disabled');
        console.log('[AutoSwitcher] Disabled');
    }

    isActive() {
        return this.isEnabled;
    }

    getLastTrigger() {
        return this.lastTriggeredRule ? {
            rule: this.lastTriggeredRule,
            time: new Date(this.lastTriggerTime)
        } : null;
    }
}

window.AutoSwitcher = AutoSwitcher;
