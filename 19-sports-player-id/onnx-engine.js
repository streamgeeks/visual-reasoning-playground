/**
 * ONNX Runtime Web Engine — Local in-browser model inference
 *
 * Loads ONNX models and runs inference using ONNX Runtime Web (ort).
 * Supports both player detection and court keypoint models.
 *
 * Requires: https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js
 */

(function() {
    'use strict';

    /**
     * OnnxModelRunner — loads and runs an ONNX model in the browser.
     *
     * @param {string} modelPath - URL/path to the .onnx file
     * @param {Object} opts
     * @param {number} opts.inputWidth - model input width (default: 640)
     * @param {number} opts.inputHeight - model input height (default: 640)
     * @param {string} opts.task - 'detect' or 'pose' (affects output parsing)
     * @param {Object} opts.classNames - {0: 'ball', 1: 'player', ...}
     */
    function OnnxModelRunner(modelPath, opts) {
        opts = opts || {};
        this.modelPath = modelPath;
        this.inputWidth = opts.inputWidth || 640;
        this.inputHeight = opts.inputHeight || 640;
        this.task = opts.task || 'detect';
        this.classNames = opts.classNames || {};
        this.kptShape = opts.kptShape || null; // [numKeypoints, 3] for pose models
        this.session = null;
        this.loading = false;
        this.loaded = false;
    }

    /**
     * Load the ONNX model. Call once before inference.
     */
    OnnxModelRunner.prototype.load = async function(onProgress) {
        if (this.loaded) return true;
        if (this.loading) return false;
        this.loading = true;

        try {
            if (onProgress) onProgress('Configuring ONNX Runtime...');
            console.log('[ONNX] Loading model:', this.modelPath);

            // Configure ONNX Runtime WASM backend
            if (typeof ort !== 'undefined') {
                ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
                // Single-threaded for compatibility (multi-threading requires CORS headers)
                ort.env.wasm.numThreads = 1;
                ort.env.wasm.simd = true;
            }

            if (onProgress) onProgress('Downloading model (' + (this.modelPath) + ')...');
            console.log('[ONNX] Creating inference session (WASM backend)...');
            console.log('[ONNX] Model path:', this.modelPath);
            console.log('[ONNX] Note: models over ~50MB may fail to load in browser WASM');

            // Use WASM only — WebGL does not support GridSample op used by RF-DETR
            var sessionOpts = {
                executionProviders: ['wasm'],
                graphOptimizationLevel: 'all',
            };

            this.session = await ort.InferenceSession.create(this.modelPath, sessionOpts);

            console.log('[ONNX] Model loaded successfully');
            console.log('[ONNX] Inputs:', this.session.inputNames);
            console.log('[ONNX] Outputs:', this.session.outputNames);

            this.loaded = true;
            this.loading = false;
            if (onProgress) onProgress('Model loaded!');
            return true;
        } catch (e) {
            this.loading = false;
            console.error('[ONNX] Model load FAILED:', e);
            console.error('[ONNX] Error name:', e.name);
            console.error('[ONNX] Error message:', e.message);
            if (onProgress) onProgress('Load failed: ' + e.message);
            return false;
        }
    };

    /**
     * Preprocess a video/canvas/image element for model input.
     * Resizes to inputWidth x inputHeight, normalizes to [0,1], converts to NCHW.
     *
     * @param {HTMLVideoElement|HTMLCanvasElement|HTMLImageElement} source
     * @returns {Float32Array} - NCHW tensor data [1, 3, H, W]
     */
    OnnxModelRunner.prototype.preprocess = function(source) {
        var c = document.createElement('canvas');
        c.width = this.inputWidth;
        c.height = this.inputHeight;
        var ctx = c.getContext('2d');

        // Get source dimensions
        var sw = source.videoWidth || source.naturalWidth || source.width || this.inputWidth;
        var sh = source.videoHeight || source.naturalHeight || source.height || this.inputHeight;

        // Draw resized (stretch to model input size)
        ctx.drawImage(source, 0, 0, sw, sh, 0, 0, this.inputWidth, this.inputHeight);

        // Get pixel data
        var imgData = ctx.getImageData(0, 0, this.inputWidth, this.inputHeight);
        var data = imgData.data; // RGBA, uint8

        // Convert to NCHW float32, normalize [0, 1]
        var size = this.inputWidth * this.inputHeight;
        var float32 = new Float32Array(3 * size);
        for (var i = 0; i < size; i++) {
            float32[i] = data[i * 4] / 255.0;            // R
            float32[size + i] = data[i * 4 + 1] / 255.0; // G
            float32[2 * size + i] = data[i * 4 + 2] / 255.0; // B
        }

        return float32;
    };

    /**
     * Run inference on a video/canvas/image element.
     *
     * @param {HTMLVideoElement|HTMLCanvasElement|HTMLImageElement} source
     * @param {number} confidenceThreshold - minimum confidence (0-1)
     * @returns {Object} - parsed results (format depends on task)
     */
    OnnxModelRunner.prototype.infer = async function(source, confidenceThreshold) {
        if (!this.loaded || !this.session) {
            throw new Error('Model not loaded. Call load() first.');
        }

        confidenceThreshold = confidenceThreshold || 0.25;

        // Get source dimensions for coordinate scaling
        var srcW = source.videoWidth || source.naturalWidth || source.width || this.inputWidth;
        var srcH = source.videoHeight || source.naturalHeight || source.height || this.inputHeight;

        // Preprocess
        var inputData = this.preprocess(source);
        var inputTensor = new ort.Tensor('float32', inputData, [1, 3, this.inputHeight, this.inputWidth]);

        // Run inference
        var feeds = {};
        var inputName = this.session.inputNames[0] || 'images';
        feeds[inputName] = inputTensor;

        var results = await this.session.run(feeds);

        // Parse output based on task
        if (this.task === 'pose') {
            var outputName = this.session.outputNames[0] || 'output0';
            return this._parsePoseOutput(results[outputName], srcW, srcH, confidenceThreshold);
        } else {
            return this._parseDetectOutput(results, srcW, srcH, confidenceThreshold);
        }
    };

    /**
     * Parse detection output.
     * Supports three formats:
     *   Format A (two outputs): 'dets' [B, N, 4] + 'labels' [B, N, numClasses] (RF-DETR)
     *   Format B (YOLO transposed): [1, 4+numClasses, N] — channels first (YOLO11/YOLOv8)
     *   Format C (YOLO standard): [1, N, 4+numClasses] — detections first
     */
    OnnxModelRunner.prototype._parseDetectOutput = function(results, srcW, srcH, confThresh) {
        var scaleX = srcW / this.inputWidth;
        var scaleY = srcH / this.inputHeight;
        var detections = [];

        // Get the single output tensor
        var outputName = this.session.outputNames[0] || 'output0';
        var output = results[outputName];

        // Check for two-output format (RF-DETR: dets + labels)
        if (results['dets'] !== undefined && results['labels'] !== undefined) {
            output = null; // handled below
            var detsData = results['dets'].data;
            var detsDims = results['dets'].dims;
            var labelsData = results['labels'].data;
            var labelsDims = results['labels'].dims;
            var numDets = detsDims[1];
            var numClasses = labelsDims[2];

            for (var i = 0; i < numDets; i++) {
                var bestClass = 0;
                var bestScore = 0;
                for (var c = 0; c < numClasses; c++) {
                    var logit = labelsData[i * numClasses + c];
                    var score = 1 / (1 + Math.exp(-logit));
                    if (score > bestScore) { bestScore = score; bestClass = c; }
                }
                if (bestScore < confThresh) continue;
                var cx = detsData[i * 4 + 0];
                var cy = detsData[i * 4 + 1];
                var w = detsData[i * 4 + 2];
                var h = detsData[i * 4 + 3];
                detections.push({
                    x: (cx - w / 2) * srcW, y: (cy - h / 2) * srcH,
                    w: w * srcW, h: h * srcH,
                    confidence: bestScore,
                    class: this.classNames[bestClass] || ('class_' + bestClass),
                    classId: bestClass
                });
            }
            return { detections: detections };
        }

        if (!output) return { detections: [] };

        var data = output.data;
        var dims = output.dims; // [1, A, B]
        var dimA = dims[1];
        var dimB = dims[2];

        // Detect format: if dimA < dimB, it's transposed YOLO [1, channels, numDets]
        // If dimA > dimB, it's standard [1, numDets, channels]
        var numDets2, numChannels, transposed;
        if (dimA < dimB) {
            // Format B: YOLO transposed [1, 4+numClasses, N]
            numChannels = dimA;
            numDets2 = dimB;
            transposed = true;
        } else {
            // Format C: standard [1, N, 4+numClasses]
            numDets2 = dimA;
            numChannels = dimB;
            transposed = false;
        }
        var numClasses2 = numChannels - 4;

        console.log('[ONNX] Output format:', transposed ? 'YOLO transposed' : 'standard',
            'dims=' + dims.join('x'), 'dets=' + numDets2, 'classes=' + numClasses2);

        for (var j = 0; j < numDets2; j++) {
            // Read bbox and class scores based on layout
            var cx2, cy2, w2, h2;
            var bestClass2 = 0;
            var bestScore2 = 0;

            if (transposed) {
                // Transposed: data[channel * numDets + detIdx]
                cx2 = data[0 * numDets2 + j];
                cy2 = data[1 * numDets2 + j];
                w2 =  data[2 * numDets2 + j];
                h2 =  data[3 * numDets2 + j];
                for (var c2 = 0; c2 < numClasses2; c2++) {
                    var s = data[(4 + c2) * numDets2 + j];
                    if (s > bestScore2) { bestScore2 = s; bestClass2 = c2; }
                }
            } else {
                // Standard: data[detIdx * numChannels + channel]
                var offset = j * numChannels;
                cx2 = data[offset + 0];
                cy2 = data[offset + 1];
                w2 =  data[offset + 2];
                h2 =  data[offset + 3];
                for (var c3 = 0; c3 < numClasses2; c3++) {
                    var s2 = data[offset + 4 + c3];
                    if (s2 > bestScore2) { bestScore2 = s2; bestClass2 = c3; }
                }
            }

            if (bestScore2 < confThresh) continue;

            // YOLO outputs pixel coords in model input space, scale to source image
            detections.push({
                x: (cx2 - w2 / 2) * scaleX,
                y: (cy2 - h2 / 2) * scaleY,
                w: w2 * scaleX,
                h: h2 * scaleY,
                confidence: bestScore2,
                class: this.classNames[bestClass2] || ('class_' + bestClass2),
                classId: bestClass2
            });
        }

        return { detections: detections };
    };

    /**
     * Parse pose/keypoint output: [1, N, 4+1+1+numKpts*3]
     * For court model: [1, 300, 24] = 4 bbox + 1 conf(?) + 1 class(?) + 6*3 keypoints
     * Actually for end2end: [1, 300, 24] = 4 bbox + 2 (scores) + 6*3 keypoints
     */
    OnnxModelRunner.prototype._parsePoseOutput = function(output, srcW, srcH, confThresh) {
        var data = output.data;
        var dims = output.dims; // [1, N, cols]
        var numDets = dims[1];
        var cols = dims[2];
        var scaleX = srcW / this.inputWidth;
        var scaleY = srcH / this.inputHeight;

        var numKpts = this.kptShape ? this.kptShape[0] : Math.floor((cols - 6) / 3);
        var detections = [];

        for (var i = 0; i < numDets; i++) {
            var offset = i * cols;

            // Bbox
            var cx = data[offset + 0];
            var cy = data[offset + 1];
            var w = data[offset + 2];
            var h = data[offset + 3];

            // Confidence — try different offsets depending on model format
            var conf = data[offset + 4];
            if (conf < confThresh) continue;

            // Keypoints: starting at offset 6
            var keypoints = [];
            for (var k = 0; k < numKpts; k++) {
                var kpOffset = offset + 6 + k * 3;
                keypoints.push({
                    x: data[kpOffset] * scaleX,
                    y: data[kpOffset + 1] * scaleY,
                    confidence: data[kpOffset + 2]
                });
            }

            detections.push({
                x: (cx - w / 2) * scaleX,
                y: (cy - h / 2) * scaleY,
                w: w * scaleX,
                h: h * scaleY,
                confidence: conf,
                class: this.classNames[0] || 'court',
                classId: 0,
                keypoints: keypoints
            });
        }

        return { detections: detections, keypoints: detections.length > 0 ? detections[0].keypoints : [] };
    };

    // Expose globally
    window.OnnxModelRunner = OnnxModelRunner;
})();
