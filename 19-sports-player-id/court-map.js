/**
 * Basketball Court Minimap — Semi-transparent PIP overlay
 *
 * Renders a full NBA basketball court diagram on a canvas and projects
 * tracked player positions onto it using homography transformation.
 *
 * Court dimensions (NBA standard):
 *   Full court: 94 ft x 50 ft
 *   We use a coordinate system in feet, origin at bottom-left corner.
 *
 * Calibration: User clicks 4+ corresponding points on the video frame
 * and the court diagram to compute the homography matrix.
 */

(function() {
    'use strict';

    // ── NBA Court Dimensions (in feet) ──
    var COURT = {
        width: 94,    // length of court
        height: 50,   // width of court
        // Key landmarks (x, y in feet from bottom-left)
        threePointRadius: 23.75,
        threePointSideDistance: 22, // distance from baseline along sideline where arc starts
        keyWidth: 16,       // paint/lane width
        keyLength: 19,      // from baseline to free throw line
        ftCircleRadius: 6,  // free throw circle
        rimX: 5.25,         // rim distance from baseline (center of rim)
        rimRadius: 0.75,    // rim visual radius
        backboardWidth: 6,
        restrictedRadius: 4, // restricted area arc
        centerCircleRadius: 6,
        halfCourtX: 47,     // half court line
    };

    // ── Court Keypoints (for calibration reference) ──
    // These are the characteristic points a user can click on the court diagram.
    // Each has an ID, label, and position in court coordinates (feet).
    var COURT_KEYPOINTS = [
        { id: 'bl', label: 'Baseline-Left corner', x: 0, y: 0 },
        { id: 'br', label: 'Baseline-Right corner', x: 0, y: 50 },
        { id: 'ml', label: 'Half-Left corner', x: 47, y: 0 },
        { id: 'mr', label: 'Half-Right corner', x: 47, y: 50 },
        { id: 'el', label: 'End-Left corner', x: 94, y: 0 },
        { id: 'er', label: 'End-Right corner', x: 94, y: 50 },
        { id: 'ftl1', label: 'FT line left (near)', x: 19, y: 17 },
        { id: 'ftr1', label: 'FT line right (near)', x: 19, y: 33 },
        { id: 'ftl2', label: 'FT line left (far)', x: 75, y: 17 },
        { id: 'ftr2', label: 'FT line right (far)', x: 75, y: 33 },
        { id: 'cc', label: 'Center circle center', x: 47, y: 25 },
        { id: 'rim1', label: 'Rim (near)', x: 5.25, y: 25 },
        { id: 'rim2', label: 'Rim (far)', x: 88.75, y: 25 },
        { id: '3ptbl', label: '3pt baseline-left (near)', x: 0, y: 3 },
        { id: '3ptbr', label: '3pt baseline-right (near)', x: 0, y: 47 },
        { id: '3ptel', label: '3pt baseline-left (far)', x: 94, y: 3 },
        { id: '3pter', label: '3pt baseline-right (far)', x: 94, y: 47 },
    ];

    /**
     * CourtMap — manages the court canvas, calibration, and player projection.
     */
    function CourtMap(canvasId, options) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.options = options || {};

        // Calibration state
        this.calibrationMode = false;
        this.videoPoints = [];    // [{x, y}] in video pixel coords
        this.courtPoints = [];    // [{x, y}] in court feet coords
        this.homography = null;   // computed 3x3 matrix
        this.calibrated = false;

        // Display state
        this.players = [];        // [{x, y, team, number, name, trackId}] in court coords
        this.trails = {};         // trackId -> [{x, y}] history

        // Layout — court on canvas
        this.padding = 8;
        this._updateLayout();

        // Draw initial empty court
        this.drawCourt();
    }

    CourtMap.prototype._updateLayout = function() {
        var cw = this.canvas.width;
        var ch = this.canvas.height;
        var pad = this.padding;
        var availW = cw - pad * 2;
        var availH = ch - pad * 2;
        var courtAspect = COURT.width / COURT.height;
        var canvasAspect = availW / availH;

        if (canvasAspect > courtAspect) {
            this.scale = availH / COURT.height;
            this.offsetX = pad + (availW - COURT.width * this.scale) / 2;
            this.offsetY = pad;
        } else {
            this.scale = availW / COURT.width;
            this.offsetX = pad;
            this.offsetY = pad + (availH - COURT.height * this.scale) / 2;
        }
    };

    // Convert court feet to canvas pixels
    CourtMap.prototype.toCanvas = function(cx, cy) {
        return {
            x: this.offsetX + cx * this.scale,
            y: this.offsetY + (COURT.height - cy) * this.scale  // flip Y (court origin bottom-left)
        };
    };

    // Convert canvas pixels to court feet
    CourtMap.prototype.fromCanvas = function(px, py) {
        return {
            x: (px - this.offsetX) / this.scale,
            y: COURT.height - (py - this.offsetY) / this.scale
        };
    };

    /**
     * Draw the full NBA basketball court.
     */
    CourtMap.prototype.drawCourt = function() {
        var ctx = this.ctx;
        var s = this.scale;
        var cw = this.canvas.width;
        var ch = this.canvas.height;

        // Clear
        ctx.clearRect(0, 0, cw, ch);

        // Semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, cw, ch);

        // Court floor
        var tl = this.toCanvas(0, COURT.height);
        var courtW = COURT.width * s;
        var courtH = COURT.height * s;
        ctx.fillStyle = 'rgba(205, 133, 63, 0.35)'; // wood floor color, semi-transparent
        ctx.fillRect(tl.x, tl.y, courtW, courtH);

        // Court outline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(tl.x, tl.y, courtW, courtH);

        // Half court line
        var hc1 = this.toCanvas(COURT.halfCourtX, 0);
        var hc2 = this.toCanvas(COURT.halfCourtX, COURT.height);
        ctx.beginPath();
        ctx.moveTo(hc1.x, hc1.y);
        ctx.lineTo(hc2.x, hc2.y);
        ctx.stroke();

        // Center circle
        var cc = this.toCanvas(COURT.halfCourtX, COURT.height / 2);
        ctx.beginPath();
        ctx.arc(cc.x, cc.y, COURT.centerCircleRadius * s, 0, Math.PI * 2);
        ctx.stroke();

        // Draw both halves
        this._drawHalfCourt(ctx, s, 0, false);   // near half
        this._drawHalfCourt(ctx, s, COURT.width, true);  // far half (mirrored)

        // Calibration keypoints (if in calibration mode)
        if (this.calibrationMode) {
            this._drawKeypoints(ctx);
        }
    };

    CourtMap.prototype._drawHalfCourt = function(ctx, s, baseX, mirrored) {
        var dir = mirrored ? -1 : 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1;

        // Paint / key (lane)
        var keyY1 = (COURT.height - COURT.keyWidth) / 2;
        var keyY2 = (COURT.height + COURT.keyWidth) / 2;
        var keyEnd = baseX + dir * COURT.keyLength;
        var p1 = this.toCanvas(baseX, keyY1);
        var p2 = this.toCanvas(keyEnd, keyY1);
        var p3 = this.toCanvas(keyEnd, keyY2);
        var p4 = this.toCanvas(baseX, keyY2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.stroke();

        // Free throw circle
        var ftCenter = this.toCanvas(keyEnd, COURT.height / 2);
        ctx.beginPath();
        ctx.arc(ftCenter.x, ftCenter.y, COURT.ftCircleRadius * s, 0, Math.PI * 2);
        ctx.stroke();

        // Rim
        var rimPos = this.toCanvas(baseX + dir * COURT.rimX, COURT.height / 2);
        ctx.beginPath();
        ctx.arc(rimPos.x, rimPos.y, COURT.rimRadius * s * 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 100, 50, 0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1;

        // Backboard
        var bbY1 = (COURT.height - COURT.backboardWidth) / 2;
        var bbY2 = (COURT.height + COURT.backboardWidth) / 2;
        var bbX = baseX + dir * 4;
        var bb1 = this.toCanvas(bbX, bbY1);
        var bb2 = this.toCanvas(bbX, bbY2);
        ctx.beginPath();
        ctx.moveTo(bb1.x, bb1.y);
        ctx.lineTo(bb2.x, bb2.y);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;

        // Three-point line
        ctx.beginPath();
        var arcCenterX = baseX + dir * COURT.rimX;
        var arcCenter = this.toCanvas(arcCenterX, COURT.height / 2);
        var arcRadius = COURT.threePointRadius * s;

        // The 3pt line is an arc + straight sideline portions
        var startAngle, endAngle;
        if (!mirrored) {
            // Near basket: arc opens to the right
            startAngle = -Math.acos(COURT.threePointSideDistance / COURT.threePointRadius);
            endAngle = Math.acos(COURT.threePointSideDistance / COURT.threePointRadius);
            // Sideline straight parts
            var sideTop = this.toCanvas(0, COURT.height - 3);
            var sideBot = this.toCanvas(0, 3);
            var arcTop = this.toCanvas(arcCenterX + COURT.threePointRadius * Math.cos(startAngle), COURT.height / 2 + COURT.threePointRadius * Math.sin(startAngle));
            var arcBot = this.toCanvas(arcCenterX + COURT.threePointRadius * Math.cos(endAngle), COURT.height / 2 + COURT.threePointRadius * Math.sin(endAngle));
            ctx.moveTo(sideTop.x, sideTop.y);
            ctx.lineTo(arcTop.x, arcTop.y);
            ctx.arc(arcCenter.x, arcCenter.y, arcRadius, -(Math.PI - startAngle), (Math.PI - endAngle));
            ctx.lineTo(sideBot.x, sideBot.y);
        } else {
            // Far basket: arc opens to the left
            startAngle = Math.PI - Math.acos(COURT.threePointSideDistance / COURT.threePointRadius);
            endAngle = Math.PI + Math.acos(COURT.threePointSideDistance / COURT.threePointRadius);
            var sideTop2 = this.toCanvas(94, COURT.height - 3);
            var sideBot2 = this.toCanvas(94, 3);
            ctx.moveTo(sideTop2.x, sideTop2.y);
            ctx.arc(arcCenter.x, arcCenter.y, arcRadius, -(Math.PI - startAngle), (Math.PI - endAngle), true);
            ctx.lineTo(sideBot2.x, sideBot2.y);
        }
        ctx.stroke();

        // Restricted area arc
        ctx.beginPath();
        ctx.arc(rimPos.x, rimPos.y, COURT.restrictedRadius * s, 0, Math.PI * 2);
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
    };

    CourtMap.prototype._drawKeypoints = function(ctx) {
        for (var i = 0; i < COURT_KEYPOINTS.length; i++) {
            var kp = COURT_KEYPOINTS[i];
            var pos = this.toCanvas(kp.x, kp.y);
            // Check if this point is already selected
            var isSelected = this.courtPoints.some(function(cp) {
                return Math.abs(cp.x - kp.x) < 1 && Math.abs(cp.y - kp.y) < 1;
            });
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, isSelected ? 6 : 4, 0, Math.PI * 2);
            ctx.fillStyle = isSelected ? '#00FF00' : 'rgba(0, 200, 255, 0.9)';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Label
            ctx.font = '8px sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillText(kp.id, pos.x + 6, pos.y - 4);
        }
    };

    /**
     * Update player positions on the court map.
     *
     * @param {Array} trackedPlayers - [{id, bbox, team, ...}] from ByteTrack
     * @param {Object} trackMeta - {trackId: {team, confirmedNumber, name}}
     * @param {Object} teamColors - {A: '#color', B: '#color'}
     * @param {number} imageWidth - detection image width
     * @param {number} imageHeight - detection image height
     */
    CourtMap.prototype.updatePlayers = function(trackedPlayers, trackMeta, teamColors, imageWidth, imageHeight) {
        // Project player positions onto the court
        this.players = [];
        var iw = imageWidth || 640;
        var ih = imageHeight || 480;

        for (var i = 0; i < trackedPlayers.length; i++) {
            var tp = trackedPlayers[i];
            var meta = trackMeta[tp.id] || {};
            // Bottom-center of bounding box (feet position)
            var videoX = tp.bbox.x + tp.bbox.w / 2;
            var videoY = tp.bbox.y + tp.bbox.h;

            var cx, cy;
            if (this.calibrated && this.homography) {
                // Use homography for precise projection
                var projected = transformPoints([[videoX, videoY]], this.homography);
                cx = projected[0][0];
                cy = projected[0][1];
            } else {
                // Proportional mapping: video coords -> court coords
                // X in video maps to court length (0-94 ft)
                // Y in video maps to court width (0-50 ft)
                cx = (videoX / iw) * COURT.width;
                cy = COURT.height - (videoY / ih) * COURT.height;
            }

            // Clamp to court bounds
            cx = Math.max(0, Math.min(COURT.width, cx));
            cy = Math.max(0, Math.min(COURT.height, cy));

            this.players.push({
                x: cx,
                y: cy,
                team: meta.team || tp.team || 'A',
                number: meta.confirmedNumber || null,
                name: meta.name || null,
                trackId: tp.id
            });

            // Trail history
            if (!this.trails[tp.id]) this.trails[tp.id] = [];
            this.trails[tp.id].push({ x: cx, y: cy });
            if (this.trails[tp.id].length > 60) this.trails[tp.id].shift();
        }

        // Redraw
        this.drawCourt();
        this._drawTrails(teamColors);
        this._drawPlayers(teamColors);
    };

    CourtMap.prototype._drawPlayers = function(teamColors) {
        var ctx = this.ctx;
        for (var i = 0; i < this.players.length; i++) {
            var p = this.players[i];
            var pos = this.toCanvas(p.x, p.y);
            var color = p.team === 'A' ? (teamColors.A || '#E8E8E8') : (teamColors.B || '#1A5276');

            // Dot with team color
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Jersey number inside the dot
            var label = p.number ? p.number : '' + p.trackId;
            ctx.font = 'bold 6px sans-serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, pos.x, pos.y);
        }
        ctx.textAlign = 'left';
    };

    CourtMap.prototype._drawTrails = function(teamColors) {
        var ctx = this.ctx;
        for (var tid in this.trails) {
            var trail = this.trails[tid];
            if (trail.length < 2) continue;
            var p = this.players.find(function(pp) { return pp.trackId === parseInt(tid); });
            var color = p ? (p.team === 'A' ? (teamColors.A || '#E8E8E8') : (teamColors.B || '#1A5276')) : '#888';
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.4;
            var first = this.toCanvas(trail[0].x, trail[0].y);
            ctx.moveTo(first.x, first.y);
            for (var i = 1; i < trail.length; i++) {
                var pt = this.toCanvas(trail[i].x, trail[i].y);
                ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    };

    CourtMap.prototype._drawUncalibratedMessage = function() {
        // No longer needed — proportional mapping works without calibration
    };

    /**
     * Start calibration mode.
     */
    CourtMap.prototype.startCalibration = function() {
        this.calibrationMode = true;
        this.videoPoints = [];
        this.courtPoints = [];
        this.homography = null;
        this.calibrated = false;
        this.drawCourt();
    };

    /**
     * Add a court calibration point (clicked on the court diagram).
     */
    CourtMap.prototype.addCourtPoint = function(canvasX, canvasY) {
        // Snap to nearest keypoint
        var courtPos = this.fromCanvas(canvasX, canvasY);
        var nearest = null;
        var minDist = 5; // snap threshold in feet
        for (var i = 0; i < COURT_KEYPOINTS.length; i++) {
            var kp = COURT_KEYPOINTS[i];
            var dist = Math.sqrt(Math.pow(courtPos.x - kp.x, 2) + Math.pow(courtPos.y - kp.y, 2));
            if (dist < minDist) {
                minDist = dist;
                nearest = kp;
            }
        }
        if (nearest) {
            this.courtPoints.push({ x: nearest.x, y: nearest.y, id: nearest.id });
        } else {
            this.courtPoints.push({ x: courtPos.x, y: courtPos.y, id: 'custom' });
        }
        this.drawCourt();
        return this.courtPoints.length;
    };

    /**
     * Add a video calibration point (clicked on the video frame).
     */
    CourtMap.prototype.addVideoPoint = function(videoX, videoY) {
        this.videoPoints.push({ x: videoX, y: videoY });
        return this.videoPoints.length;
    };

    /**
     * Compute homography from collected calibration points.
     * Requires at least 4 point pairs.
     */
    CourtMap.prototype.computeCalibration = function() {
        var n = Math.min(this.videoPoints.length, this.courtPoints.length);
        if (n < 4) return false;

        var src = [];
        var dst = [];
        for (var i = 0; i < n; i++) {
            src.push([this.videoPoints[i].x, this.videoPoints[i].y]);
            dst.push([this.courtPoints[i].x, this.courtPoints[i].y]);
        }

        this.homography = computeHomography(src, dst);
        this.calibrated = this.homography !== null;
        this.calibrationMode = false;
        this.drawCourt();
        return this.calibrated;
    };

    /**
     * Cancel calibration.
     */
    CourtMap.prototype.cancelCalibration = function() {
        this.calibrationMode = false;
        this.videoPoints = [];
        this.courtPoints = [];
        this.drawCourt();
    };

    CourtMap.prototype.getCalibrationStatus = function() {
        return {
            calibrated: this.calibrated,
            videoPoints: this.videoPoints.length,
            courtPoints: this.courtPoints.length,
            calibrating: this.calibrationMode
        };
    };

    // Expose
    window.CourtMap = CourtMap;
    window.COURT_KEYPOINTS = COURT_KEYPOINTS;
    window.COURT_DIMS = COURT;
})();
