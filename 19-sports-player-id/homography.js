/**
 * Homography — Pure JavaScript Implementation
 *
 * Computes a 3x3 perspective transformation matrix from corresponding
 * point pairs using Direct Linear Transform (DLT) + SVD.
 *
 * Based on the approach in Roboflow's camera calibration blog:
 * https://blog.roboflow.com/camera-calibration-sports-computer-vision/
 *
 * Usage:
 *   var H = computeHomography(sourcePoints, targetPoints);
 *   var projected = transformPoints(playerPositions, H);
 */

(function() {
    'use strict';

    /**
     * Compute a 3x3 homography matrix mapping source points to target points.
     * Requires at least 4 point pairs.
     *
     * @param {Array} src - Source points [[x1,y1], [x2,y2], ...]
     * @param {Array} dst - Target points [[x1,y1], [x2,y2], ...]
     * @returns {Array|null} 3x3 matrix as flat array [h0..h8], or null if computation fails
     */
    function computeHomography(src, dst) {
        if (src.length < 4 || src.length !== dst.length) return null;
        var n = src.length;

        // Normalize points for numerical stability
        var srcNorm = normalizePoints(src);
        var dstNorm = normalizePoints(dst);
        var srcN = srcNorm.points;
        var dstN = dstNorm.points;

        // Build the 2n x 9 matrix A for DLT
        var A = [];
        for (var i = 0; i < n; i++) {
            var sx = srcN[i][0], sy = srcN[i][1];
            var dx = dstN[i][0], dy = dstN[i][1];
            A.push([-sx, -sy, -1, 0, 0, 0, dx * sx, dx * sy, dx]);
            A.push([0, 0, 0, -sx, -sy, -1, dy * sx, dy * sy, dy]);
        }

        // Solve using SVD — h is the last column of V (null space of A)
        var svd = svdSolve(A);
        if (!svd) return null;

        // Denormalize: H = T_dst_inv * H_norm * T_src
        var H_norm = svd;
        var H = multiply3x3(
            multiply3x3(invertNormMatrix(dstNorm.T), H_norm),
            srcNorm.T
        );

        // Normalize so H[8] = 1
        if (Math.abs(H[8]) < 1e-10) return null;
        for (var j = 0; j < 9; j++) H[j] /= H[8];

        return H;
    }

    /**
     * Transform an array of 2D points using a 3x3 homography matrix.
     *
     * @param {Array} points - [[x1,y1], [x2,y2], ...]
     * @param {Array} H - 3x3 homography matrix (flat array [h0..h8])
     * @returns {Array} Transformed points [[x1',y1'], ...]
     */
    function transformPoints(points, H) {
        if (!H) return points;
        var result = [];
        for (var i = 0; i < points.length; i++) {
            var x = points[i][0], y = points[i][1];
            var w = H[6] * x + H[7] * y + H[8];
            if (Math.abs(w) < 1e-10) {
                result.push([0, 0]);
                continue;
            }
            var px = (H[0] * x + H[1] * y + H[2]) / w;
            var py = (H[3] * x + H[4] * y + H[5]) / w;
            result.push([px, py]);
        }
        return result;
    }

    // ── Internal helpers ──

    function normalizePoints(pts) {
        var cx = 0, cy = 0;
        for (var i = 0; i < pts.length; i++) { cx += pts[i][0]; cy += pts[i][1]; }
        cx /= pts.length; cy /= pts.length;
        var dist = 0;
        for (var j = 0; j < pts.length; j++) {
            dist += Math.sqrt(Math.pow(pts[j][0] - cx, 2) + Math.pow(pts[j][1] - cy, 2));
        }
        dist /= pts.length;
        var s = Math.sqrt(2) / (dist || 1);
        var T = [s, 0, -s * cx, 0, s, -s * cy, 0, 0, 1];
        var normed = [];
        for (var k = 0; k < pts.length; k++) {
            normed.push([s * (pts[k][0] - cx), s * (pts[k][1] - cy)]);
        }
        return { points: normed, T: T };
    }

    function invertNormMatrix(T) {
        // T is [s, 0, -s*cx, 0, s, -s*cy, 0, 0, 1]
        var s = T[0];
        if (Math.abs(s) < 1e-10) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
        var si = 1 / s;
        return [si, 0, -T[2] * si, 0, si, -T[5] * si, 0, 0, 1];
    }

    function multiply3x3(A, B) {
        var C = new Array(9);
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
            }
        }
        return C;
    }

    /**
     * Solve for the homography vector using SVD of the DLT matrix.
     * Returns the 3x3 homography as a flat 9-element array.
     * Uses a simplified power iteration approach for the smallest singular value.
     */
    function svdSolve(A) {
        var rows = A.length;
        var cols = 9;

        // Compute A^T * A (9x9 symmetric matrix)
        var AtA = new Array(81).fill(0);
        for (var i = 0; i < cols; i++) {
            for (var j = i; j < cols; j++) {
                var sum = 0;
                for (var k = 0; k < rows; k++) {
                    sum += A[k][i] * A[k][j];
                }
                AtA[i * cols + j] = sum;
                AtA[j * cols + i] = sum;
            }
        }

        // Find eigenvector corresponding to smallest eigenvalue using inverse iteration
        // Start with random vector, iterate (A^T A)^-1 * v
        // For simplicity, use power iteration on (maxEig*I - A^T A) to find min eigenvector

        // First estimate max eigenvalue via power iteration
        var v = [1, 0, 0, 0, 1, 0, 0, 0, 1];
        for (var iter = 0; iter < 100; iter++) {
            var nv = new Array(9).fill(0);
            for (var ii = 0; ii < 9; ii++) {
                for (var jj = 0; jj < 9; jj++) {
                    nv[ii] += AtA[ii * 9 + jj] * v[jj];
                }
            }
            var norm = 0;
            for (var kk = 0; kk < 9; kk++) norm += nv[kk] * nv[kk];
            norm = Math.sqrt(norm) || 1;
            for (var ll = 0; ll < 9; ll++) v[ll] = nv[ll] / norm;
        }
        var maxEig = 0;
        for (var m = 0; m < 9; m++) {
            var s = 0;
            for (var nn = 0; nn < 9; nn++) s += AtA[m * 9 + nn] * v[nn];
            maxEig += s * v[m];
        }

        // Shifted matrix: B = maxEig * I - AtA (largest eigenvalue of B = smallest of AtA)
        var B = new Array(81);
        for (var bi = 0; bi < 81; bi++) B[bi] = -AtA[bi];
        for (var d = 0; d < 9; d++) B[d * 9 + d] += maxEig * 1.01;

        // Power iteration on B to find its largest eigenvector = smallest of AtA
        var h = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
        for (var pit = 0; pit < 200; pit++) {
            var nh = new Array(9).fill(0);
            for (var pi = 0; pi < 9; pi++) {
                for (var pj = 0; pj < 9; pj++) {
                    nh[pi] += B[pi * 9 + pj] * h[pj];
                }
            }
            var pnorm = 0;
            for (var pk = 0; pk < 9; pk++) pnorm += nh[pk] * nh[pk];
            pnorm = Math.sqrt(pnorm) || 1;
            for (var pl = 0; pl < 9; pl++) h[pl] = nh[pl] / pnorm;
        }

        return h;
    }

    // Expose globally
    window.computeHomography = computeHomography;
    window.transformPoints = transformPoints;
})();
