/**
 * ByteTrack — JavaScript Implementation
 *
 * A faithful port of the ByteTrack multi-object tracking algorithm.
 * Based on: "ByteTrack: Multi-Object Tracking by Associating Every Detection Box"
 *           by Yifu Zhang et al. (ECCV 2022)
 * Reference: https://github.com/roboflow/trackers (Apache 2.0)
 *
 * Key innovation: two-phase association.
 *   Phase 1: Match high-confidence detections to existing tracks via IoU.
 *   Phase 2: "Rescue" low-confidence detections by matching them to unmatched tracks.
 * This recovers occluded or partially-visible objects that simpler trackers lose.
 *
 * Includes a simplified Kalman filter for motion prediction.
 */

// ══════════════════════════════════════════════════════
//  KALMAN FILTER (simplified linear velocity model)
// ══════════════════════════════════════════════════════
class KalmanBoxTracker {
    /**
     * State: [cx, cy, w, h, vx, vy, vw, vh]
     * Measurement: [cx, cy, w, h]
     */
    constructor(bbox) {
        // bbox = {x, y, w, h} where x,y is top-left
        this.cx = bbox.x + bbox.w / 2;
        this.cy = bbox.y + bbox.h / 2;
        this.w = bbox.w;
        this.h = bbox.h;
        this.vx = 0;
        this.vy = 0;
        this.vw = 0;
        this.vh = 0;
        this.age = 0;
        this.hits = 0;
        this.hitStreak = 0;
        this.timeSinceUpdate = 0;
    }

    predict() {
        // Linear velocity prediction
        this.cx += this.vx;
        this.cy += this.vy;
        this.w += this.vw;
        this.h += this.vh;
        // Clamp dimensions
        this.w = Math.max(1, this.w);
        this.h = Math.max(1, this.h);
        this.age++;
        if (this.timeSinceUpdate > 0) this.hitStreak = 0;
        this.timeSinceUpdate++;
        return this.getBBox();
    }

    update(bbox) {
        // Exponential moving average for velocity (alpha = 0.4)
        var alpha = 0.4;
        var newCx = bbox.x + bbox.w / 2;
        var newCy = bbox.y + bbox.h / 2;
        this.vx = alpha * (newCx - this.cx) + (1 - alpha) * this.vx;
        this.vy = alpha * (newCy - this.cy) + (1 - alpha) * this.vy;
        this.vw = alpha * (bbox.w - this.w) + (1 - alpha) * this.vw;
        this.vh = alpha * (bbox.h - this.h) + (1 - alpha) * this.vh;
        // Update position
        this.cx = newCx;
        this.cy = newCy;
        this.w = bbox.w;
        this.h = bbox.h;
        this.timeSinceUpdate = 0;
        this.hits++;
        this.hitStreak++;
    }

    getBBox() {
        return {
            x: this.cx - this.w / 2,
            y: this.cy - this.h / 2,
            w: this.w,
            h: this.h
        };
    }
}

// ══════════════════════════════════════════════════════
//  STRACK — single track object
// ══════════════════════════════════════════════════════
var _sTrackCount = 0;

class STrack {
    constructor(bbox, score, cls) {
        this.trackId = 0;       // assigned when activated
        this.kalman = new KalmanBoxTracker(bbox);
        this.score = score;
        this.cls = cls || '';
        this.isActivated = false;
        this.state = 'new';     // 'new' | 'tracked' | 'lost' | 'removed'
        this.frameId = 0;
        this.startFrame = 0;
        this.trackletLen = 0;
        // Trajectory history (for drawing paths)
        this.trajectory = [];   // [{cx, cy, frame}]
        // Extra data attached by pipeline
        this.extra = {};
    }

    activate(frameId) {
        _sTrackCount++;
        this.trackId = _sTrackCount;
        this.isActivated = true;
        this.state = 'tracked';
        this.frameId = frameId;
        this.startFrame = frameId;
        this.trackletLen = 0;
        this._recordTrajectory(frameId);
    }

    reActivate(det, frameId, newId) {
        this.kalman.update(det.bbox);
        this.score = det.score;
        this.cls = det.cls || this.cls;
        this.state = 'tracked';
        this.isActivated = true;
        this.frameId = frameId;
        this.trackletLen = 0;
        if (newId) {
            _sTrackCount++;
            this.trackId = _sTrackCount;
        }
        this._recordTrajectory(frameId);
    }

    update(det, frameId) {
        this.kalman.update(det.bbox);
        this.score = det.score;
        this.cls = det.cls || this.cls;
        this.state = 'tracked';
        this.isActivated = true;
        this.frameId = frameId;
        this.trackletLen++;
        this._recordTrajectory(frameId);
    }

    predict() {
        this.kalman.predict();
    }

    markLost() {
        this.state = 'lost';
    }

    markRemoved() {
        this.state = 'removed';
    }

    get bbox() {
        return this.kalman.getBBox();
    }

    get center() {
        return { cx: this.kalman.cx, cy: this.kalman.cy };
    }

    _recordTrajectory(frameId) {
        this.trajectory.push({
            cx: this.kalman.cx,
            cy: this.kalman.cy,
            frame: frameId
        });
        // Keep last 90 points (3 seconds at 30fps)
        if (this.trajectory.length > 90) this.trajectory.shift();
    }

    static resetCounter() {
        _sTrackCount = 0;
    }
}

// ══════════════════════════════════════════════════════
//  IoU COMPUTATION
// ══════════════════════════════════════════════════════
function computeIoU(a, b) {
    var x1 = Math.max(a.x, b.x);
    var y1 = Math.max(a.y, b.y);
    var x2 = Math.min(a.x + a.w, b.x + b.w);
    var y2 = Math.min(a.y + a.h, b.y + b.h);
    if (x2 <= x1 || y2 <= y1) return 0;
    var inter = (x2 - x1) * (y2 - y1);
    var areaA = a.w * a.h;
    var areaB = b.w * b.h;
    return inter / (areaA + areaB - inter);
}

function computeIoUMatrix(tracks, detections) {
    // Returns matrix[trackIdx][detIdx] = IoU
    var m = [];
    for (var i = 0; i < tracks.length; i++) {
        m[i] = [];
        var tBbox = tracks[i].bbox;
        for (var j = 0; j < detections.length; j++) {
            m[i][j] = computeIoU(tBbox, detections[j].bbox);
        }
    }
    return m;
}

// ══════════════════════════════════════════════════════
//  GREEDY ASSIGNMENT (approximation of Hungarian)
// ══════════════════════════════════════════════════════
function greedyAssignment(iouMatrix, threshold) {
    // Returns: { matches: [[trackIdx, detIdx], ...], unmatchedTracks: [...], unmatchedDets: [...] }
    var numTracks = iouMatrix.length;
    var numDets = numTracks > 0 ? iouMatrix[0].length : 0;
    var usedTracks = new Set();
    var usedDets = new Set();
    var matches = [];

    // Build flat list of all (trackIdx, detIdx, iou) then sort descending
    var candidates = [];
    for (var i = 0; i < numTracks; i++) {
        for (var j = 0; j < numDets; j++) {
            if (iouMatrix[i][j] >= threshold) {
                candidates.push({ t: i, d: j, iou: iouMatrix[i][j] });
            }
        }
    }
    candidates.sort(function(a, b) { return b.iou - a.iou; });

    for (var k = 0; k < candidates.length; k++) {
        var c = candidates[k];
        if (!usedTracks.has(c.t) && !usedDets.has(c.d)) {
            matches.push([c.t, c.d]);
            usedTracks.add(c.t);
            usedDets.add(c.d);
        }
    }

    var unmatchedTracks = [];
    for (var ti = 0; ti < numTracks; ti++) {
        if (!usedTracks.has(ti)) unmatchedTracks.push(ti);
    }
    var unmatchedDets = [];
    for (var di = 0; di < numDets; di++) {
        if (!usedDets.has(di)) unmatchedDets.push(di);
    }

    return { matches: matches, unmatchedTracks: unmatchedTracks, unmatchedDets: unmatchedDets };
}

// ══════════════════════════════════════════════════════
//  BYTETRACK TRACKER
// ══════════════════════════════════════════════════════
class ByteTrackTracker {
    /**
     * @param {Object} opts
     * @param {number} opts.trackHighThresh - Score threshold for high-confidence detections (default: 0.5)
     * @param {number} opts.trackLowThresh  - Score threshold for low-confidence detections (default: 0.1)
     * @param {number} opts.newTrackThresh  - Minimum score to initialize a new track (default: 0.6)
     * @param {number} opts.matchThresh     - IoU threshold for first-phase matching (default: 0.8)
     * @param {number} opts.secondMatchThresh - IoU threshold for second-phase matching (default: 0.5)
     * @param {number} opts.trackBuffer     - Frames to keep lost tracks alive (default: 30)
     */
    constructor(opts) {
        opts = opts || {};
        this.trackHighThresh = opts.trackHighThresh || 0.5;
        this.trackLowThresh = opts.trackLowThresh || 0.1;
        this.newTrackThresh = opts.newTrackThresh || 0.6;
        this.matchThresh = opts.matchThresh || 0.8;
        this.secondMatchThresh = opts.secondMatchThresh || 0.5;
        this.trackBuffer = opts.trackBuffer || 30;

        this.trackedStracks = [];
        this.lostStracks = [];
        this.removedStracks = [];
        this.frameId = 0;

        STrack.resetCounter();
    }

    /**
     * Main update method — call once per frame.
     *
     * @param {Array} detections - [{bbox: {x, y, w, h}, score: 0-1, cls: 'player', ...extra}]
     * @returns {Array} Active tracks - [{trackId, bbox, score, cls, trajectory, extra, ...}]
     */
    update(detections) {
        this.frameId++;

        // ── Step 1: Split detections into high and low confidence ──
        var detsHigh = [];
        var detsLow = [];
        for (var i = 0; i < detections.length; i++) {
            var d = detections[i];
            if (d.score >= this.trackHighThresh) {
                detsHigh.push(d);
            } else if (d.score >= this.trackLowThresh) {
                detsLow.push(d);
            }
            // Below trackLowThresh: discarded as background
        }

        // ── Step 2: Predict tracklet positions using Kalman filter ──
        var allTracks = this.trackedStracks.concat(this.lostStracks);
        for (var j = 0; j < allTracks.length; j++) {
            allTracks[j].predict();
        }

        // Separate currently tracked vs lost
        var activeTracks = [];
        var lostTracks = [];
        for (var k = 0; k < allTracks.length; k++) {
            if (allTracks[k].state === 'tracked') {
                activeTracks.push(allTracks[k]);
            } else {
                lostTracks.push(allTracks[k]);
            }
        }

        // ── Phase 1: First association — high-confidence detections vs active + lost tracks ──
        var poolTracks = activeTracks.concat(lostTracks);
        var iouMat1 = computeIoUMatrix(poolTracks, detsHigh);
        var result1 = greedyAssignment(iouMat1, this.matchThresh);

        // Process matches
        var remainTracks = [];
        for (var m = 0; m < result1.matches.length; m++) {
            var tIdx = result1.matches[m][0];
            var dIdx = result1.matches[m][1];
            poolTracks[tIdx].update(detsHigh[dIdx], this.frameId);
        }

        // Unmatched tracks from Phase 1 go to Phase 2
        for (var u = 0; u < result1.unmatchedTracks.length; u++) {
            remainTracks.push(poolTracks[result1.unmatchedTracks[u]]);
        }

        // Unmatched high-confidence detections → candidates for new tracks
        var unmatchedHighDets = [];
        for (var uh = 0; uh < result1.unmatchedDets.length; uh++) {
            unmatchedHighDets.push(detsHigh[result1.unmatchedDets[uh]]);
        }

        // ── Phase 2: Second association — low-confidence detections vs remaining tracks ──
        var iouMat2 = computeIoUMatrix(remainTracks, detsLow);
        var result2 = greedyAssignment(iouMat2, this.secondMatchThresh);

        for (var m2 = 0; m2 < result2.matches.length; m2++) {
            var tIdx2 = result2.matches[m2][0];
            var dIdx2 = result2.matches[m2][1];
            remainTracks[tIdx2].update(detsLow[dIdx2], this.frameId);
        }

        // Unmatched tracks after Phase 2 → mark lost
        for (var ul = 0; ul < result2.unmatchedTracks.length; ul++) {
            var lostTrack = remainTracks[result2.unmatchedTracks[ul]];
            if (lostTrack.state !== 'lost') {
                lostTrack.markLost();
            }
        }

        // ── Step 3: Initialize new tracks from unmatched high-confidence detections ──
        for (var n = 0; n < unmatchedHighDets.length; n++) {
            var det = unmatchedHighDets[n];
            if (det.score >= this.newTrackThresh) {
                var newTrack = new STrack(det.bbox, det.score, det.cls);
                newTrack.extra = det.extra || {};
                newTrack.activate(this.frameId);
                this.trackedStracks.push(newTrack);
            }
        }

        // ── Step 4: Update track lists ──
        var newTracked = [];
        var newLost = [];

        for (var t = 0; t < this.trackedStracks.length; t++) {
            var st = this.trackedStracks[t];
            if (st.state === 'tracked') newTracked.push(st);
            else if (st.state === 'lost') newLost.push(st);
        }
        for (var l = 0; l < this.lostStracks.length; l++) {
            var sl = this.lostStracks[l];
            if (sl.state === 'tracked') newTracked.push(sl);
            else if (sl.state === 'lost') newLost.push(sl);
        }

        // Also add newly matched Phase 1 tracks
        for (var mm = 0; mm < result1.matches.length; mm++) {
            var matched = poolTracks[result1.matches[mm][0]];
            if (matched.state === 'tracked' && newTracked.indexOf(matched) === -1) {
                newTracked.push(matched);
            }
        }
        // Phase 2 matched tracks
        for (var mm2 = 0; mm2 < result2.matches.length; mm2++) {
            var matched2 = remainTracks[result2.matches[mm2][0]];
            if (matched2.state === 'tracked' && newTracked.indexOf(matched2) === -1) {
                newTracked.push(matched2);
            }
        }

        // Remove lost tracks that exceeded buffer
        var filteredLost = [];
        for (var fl = 0; fl < newLost.length; fl++) {
            if (this.frameId - newLost[fl].frameId <= this.trackBuffer) {
                filteredLost.push(newLost[fl]);
            } else {
                newLost[fl].markRemoved();
                this.removedStracks.push(newLost[fl]);
            }
        }

        this.trackedStracks = newTracked;
        this.lostStracks = filteredLost;

        // ── Return active tracks ──
        var output = [];
        for (var o = 0; o < this.trackedStracks.length; o++) {
            var tr = this.trackedStracks[o];
            if (tr.isActivated) {
                output.push({
                    trackId: tr.trackId,
                    bbox: tr.bbox,
                    score: tr.score,
                    cls: tr.cls,
                    trajectory: tr.trajectory,
                    extra: tr.extra,
                    trackletLen: tr.trackletLen,
                    _strack: tr
                });
            }
        }
        return output;
    }

    /**
     * Reset all tracks.
     */
    reset() {
        this.trackedStracks = [];
        this.lostStracks = [];
        this.removedStracks = [];
        this.frameId = 0;
        STrack.resetCounter();
    }

    /**
     * Get count of currently active tracks.
     */
    get activeCount() {
        return this.trackedStracks.filter(function(t) { return t.isActivated; }).length;
    }
}

// Expose globally
window.ByteTrackTracker = ByteTrackTracker;
window.STrack = STrack;
