class ScoreParser {
    
    static parseScore(text) {
        if (!text) return null;
        
        const cleaned = text.replace(/[^0-9]/g, '');
        
        if (cleaned.length === 0) return null;
        
        const num = parseInt(cleaned, 10);
        
        if (isNaN(num) || num < 0 || num > 999) return null;
        
        return num;
    }

    static parseTime(text) {
        if (!text) return null;
        
        const cleaned = text.trim();
        
        const timePatterns = [
            /(\d{1,2}):(\d{2})/,
            /(\d{1,2})\.(\d{2})/,
            /(\d{1,2})\s*:\s*(\d{2})/
        ];
        
        for (const pattern of timePatterns) {
            const match = cleaned.match(pattern);
            if (match) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                
                if (seconds < 60 && minutes < 100) {
                    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
            }
        }
        
        const periodPatterns = [
            /Q([1-4])/i,
            /([1-4])(?:st|nd|rd|th)/i,
            /P([1-3])/i,
            /H([1-2])/i,
            /OT/i,
            /HALF/i,
            /FINAL/i
        ];
        
        for (const pattern of periodPatterns) {
            const match = cleaned.match(pattern);
            if (match) {
                return match[0].toUpperCase();
            }
        }
        
        const digitsOnly = cleaned.replace(/[^0-9]/g, '');
        if (digitsOnly.length === 4) {
            const min = digitsOnly.slice(0, 2);
            const sec = digitsOnly.slice(2, 4);
            const secNum = parseInt(sec, 10);
            if (secNum < 60) {
                return `${parseInt(min, 10)}:${sec}`;
            }
        }
        
        if (digitsOnly.length >= 1 && digitsOnly.length <= 3) {
            return cleaned;
        }
        
        return null;
    }

    static parseTeamName(text) {
        if (!text) return null;
        
        const cleaned = text.trim().replace(/[^A-Za-z\s]/g, '').trim();
        
        if (cleaned.length < 2 || cleaned.length > 30) return null;
        
        return cleaned.toUpperCase();
    }

    static parseOCRResults(ocrResults) {
        const data = {
            home_score: null,
            away_score: null,
            time: null,
            home_team: null,
            away_team: null,
            raw: {}
        };
        
        if (ocrResults.homeScore) {
            data.raw.homeScore = ocrResults.homeScore.text;
            data.home_score = this.parseScore(ocrResults.homeScore.text);
        }
        
        if (ocrResults.awayScore) {
            data.raw.awayScore = ocrResults.awayScore.text;
            data.away_score = this.parseScore(ocrResults.awayScore.text);
        }
        
        if (ocrResults.time) {
            data.raw.time = ocrResults.time.text;
            data.time = this.parseTime(ocrResults.time.text);
        }
        
        if (ocrResults.homeTeam) {
            data.raw.homeTeam = ocrResults.homeTeam.text;
            data.home_team = this.parseTeamName(ocrResults.homeTeam.text);
        }
        
        if (ocrResults.awayTeam) {
            data.raw.awayTeam = ocrResults.awayTeam.text;
            data.away_team = this.parseTeamName(ocrResults.awayTeam.text);
        }
        
        return data;
    }

    static isValidScore(data) {
        return data.home_score !== null || data.away_score !== null || data.time !== null;
    }

    static formatForDisplay(data) {
        return {
            home_score: data.home_score,
            away_score: data.away_score,
            time: data.time
        };
    }
}

window.ScoreParser = ScoreParser;
