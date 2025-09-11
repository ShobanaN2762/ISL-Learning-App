/**
 * Manages the real-time sign-to-text translator functionality.
 * VERSION 5 (Corrected): Fixes mirror synchronization bug for accurate prediction.
 */
class TranslatorManager {
  constructor() {
    // State
    this.isInitialized = false;
    this.isCapturing = false;
    this.stream = null;
    this.currentMode = "text-to-sign";
    this.animationFrameId = null;
    this.isMirrored = true;

    // AI
    this.model = null;
    this.mediaPipeHands = null;
    this.classNames = [];

    // --- MODIFIED: Settings tuned for higher ACCURACY ---
    this.predictionBuffer = [];
    this.bufferSize = 8; // Increase to require more consistent frames
    this.confThreshold = 0.85; // Increase to require higher confidence

    this.stablePrediction = "";
    this.lastAppendedSign = null;
    this.sentence = [];
    this.consecutiveNoHandFrames = 0;
    this.noHandThreshold = 20;
  }

  async init() {
    if (this.isInitialized) return; //
    console.log("🔄 Initializing TranslatorManager..."); //

    try {
      await tf.setBackend("webgl"); //
      console.log("✅ TensorFlow.js backend set to WebGL."); //
    } catch (error) {
      console.warn(
        "Could not set WebGL backend, falling back to default.", //
        error
      );
    }

    await this._loadResources(); //
    this._setupEventListeners(); //
    this.isInitialized = true; //
    console.log("✅ TranslatorManager initialized"); //
  }

  async _loadResources() {
    try {
      console.log("TranslatorManager: Requesting AI resources...");
      const models = sharedAIManager.getModels("translator");
      const labels = sharedAIManager.getLabels("translator");
      this.model = models.static;
      this.classNames = labels.static;

      this.mediaPipeHands = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      // --- MODIFIED: Settings tuned for higher ACCURACY ---
      this.mediaPipeHands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1, // Use the more complex and accurate model
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      this.mediaPipeHands.onResults((res) => this._onMediaPipeResults(res));
      console.log("TranslatorManager: AI resources received.");
    } catch (e) {
      console.error("❌ TranslatorManager failed to get AI resources:", e);
    }
  }

  _setupEventListeners() {
    document.addEventListener("click", (e) => {
      const root = document.getElementById("translator-content"); //
      if (!root || !root.contains(e.target)) return; //
      const handlers = {
        "[data-translation-mode]": (el) =>
          this.switchMode(el.dataset.translationMode), //
        ".suggestion-item": (el) => {
          const tx = document.getElementById("text-input"); //
          tx.value = el.textContent; //
          tx.dispatchEvent(new Event("input", { bubbles: true })); //
        },
        "#translate-text": () => this.translateTextToSign(), //
        "#clear-text": () => this.clearTextInput(), //
        "#enable-camera": () => this.startCamera(), //
        "#stop-camera": () => this.stopCamera(), //
        "#clear-output": () => this.clearOutput(), //
      };
      for (const sel in handlers) {
        const el = e.target.closest(sel); //
        if (el) return handlers[sel](el); //
      }
    });

    document.addEventListener("input", (e) => {
      if (e.target.id === "text-input") {
        //
        this.updateTranslateButtonState(); //
        this.updateCharacterCounter(); //
      }
    });
  }

  _extractStaticFeatures(results) {
    const HAND_PAD = Array(63).fill(0);
    let right = HAND_PAD.slice();
    let left = HAND_PAD.slice();

    if (results?.multiHandedness && results?.multiHandLandmarks) {
      results.multiHandedness.forEach((h, i) => {
        const side = (h.label || "").toLowerCase(); // "left" or "right"
        const lms = results.multiHandLandmarks[i];
        if (!lms) return;

        const flat = lms.flatMap((lm) => [lm.x, lm.y, lm.z]);

        if (side === "right") {
          right = flat; // keep right hand in right slot
        } else if (side === "left") {
          left = flat; // keep left hand in left slot
        }
      });
    }

    // Always return [right, left] in this order → matches training
    return [...right, ...left];
  }

  async startCamera() {
    if (!this.model || !this.mediaPipeHands) {
      alert("AI resources are not ready. Please wait a moment.");
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      });
      const v = document.getElementById("camera-feed");
      const c = document.getElementById("hand-overlay-canvas"); // Get the canvas element
      v.srcObject = this.stream;
      v.onloadedmetadata = () => {
        this.isCapturing = true;

        // Apply the visual mirror effect to both the video and the canvas
        v.style.transform = "scaleX(-1)";
        if (c) {
          c.style.transform = "scaleX(-1)";
        }

        this._predictionLoop(v);
        document.getElementById("camera-placeholder").classList.add("d-none");
        document.getElementById("enable-camera").classList.add("d-none");
        document.getElementById("stop-camera").classList.remove("d-none");
      };
    } catch (e) {
      console.error("Camera access failed:", e);
      alert("Could not access camera. Please check permissions.");
    }
  }

  // --- FIX #3: Added the missing mirror toggle HTML ---
  renderSignToText() {
    // The HTML for the mirror toggle switch has been removed from the div below.
    return `
      <div class="row g-4">
        <div class="col-md-6">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title">Live Camera Feed</h5>
              <div class="bg-dark text-white text-center rounded d-flex align-items-center justify-content-center overflow-hidden position-relative" style="aspect-ratio: 16/9;">
                <video id="camera-feed" class="w-100 h-100" autoplay muted playsinline></video>
                <canvas id="hand-overlay-canvas" class="position-absolute top-0 start-0 w-100 h-100"></canvas>
                <div id="camera-placeholder" class="position-absolute">
                  <i class="fa-solid fa-video fs-2 mb-2"></i>
                  <p>Enable camera to start</p>
                </div>
              </div>
              <div class="d-flex gap-3 justify-content-center align-items-center mt-3">
                <button id="enable-camera" class="btn btn-primary">Enable Camera</button>
                <button id="stop-camera" class="btn btn-danger d-none">Stop Camera</button>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card shadow-sm h-100">
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">Detected Sign (Real-time)</h5>
              <div id="detection-results" class="bg-light p-3 rounded d-flex align-items-center justify-content-center" style="min-height: 80px;">
                <p class="text-muted m-0">Predictions will appear here...</p>
              </div>
              <h5 class="card-title mt-3">Output Sentence</h5>
              <textarea id="output-text-area" class="form-control flex-grow-1" rows="5" placeholder="Translated sentence will be built here..." readonly></textarea>
              <button id="clear-output" class="btn btn-sm btn-outline-danger mt-2">Clear Output</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  _onMediaPipeResults(results) {
    if (!this.model || !this.isCapturing) return; //
    const resBox = document.getElementById("detection-results"); //
    const canvasEl = document.getElementById("hand-overlay-canvas"); //
    const videoEl = document.getElementById("camera-feed"); //
    const outArea = document.getElementById("output-text-area"); //
    if (!resBox || !canvasEl || !videoEl || !outArea) return; //
    const ctx = canvasEl.getContext("2d"); //
    canvasEl.width = videoEl.videoWidth; //
    canvasEl.height = videoEl.videoHeight; //
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height); //
    const handsDetected =
      results.multiHandLandmarks && results.multiHandLandmarks.length > 0; //
    if (!handsDetected) {
      this._handleNoHands(resBox, outArea); //
      return; //
    }
    this.consecutiveNoHandFrames = 0; //
    for (const lms of results.multiHandLandmarks) {
      //
      drawConnectors(ctx, lms, HAND_CONNECTIONS, {
        color: "#00FF00", //
        lineWidth: 5, //
      });
      drawLandmarks(ctx, lms, { color: "#FF0000", lineWidth: 2 }); //
    }
    tf.tidy(() => {
      const features = this._extractStaticFeatures(results); //
      const input = tf.tensor2d([features]); //
      const logits = this._runStaticModel(input); //
      const probs = logits.dataSync(); //
      const idx = logits.as1D().argMax().dataSync()[0]; //
      const conf = probs[idx]; //
      const sign = this.classNames[idx] || ""; //
      this.predictionBuffer.push({ sign, conf }); //
      if (this.predictionBuffer.length > this.bufferSize) {
        //
        this.predictionBuffer.shift(); //
      }
      const allSame = this.predictionBuffer.every((p) => p.sign === sign); //
      const highConf = this.predictionBuffer.every(
        (p) => p.conf >= this.confThreshold //
      );
      this.stablePrediction = allSame && highConf ? sign : ""; //
    });
    this._updatePredictionUI(resBox, outArea); //
  }

  _runStaticModel(input2d) {
    if (this.model && typeof this.model.predict === "function") {
      //
      return this.model.predict(input2d); //
    }
    if (this.model && typeof this.model.execute === "function") {
      //
      const inputName = this.model.inputs[0].name; //
      const outputName = this.model.outputs[0].name; //
      return this.model.execute({ [inputName]: input2d }, outputName); //
    }
    throw new Error("Translator static model not loaded or unsupported type"); //
  }

  _predictionLoop(videoEl) {
    const tick = async () => {
      if (!this.isCapturing) return; //
      await this.mediaPipeHands.send({ image: videoEl }); //
      this.animationFrameId = requestAnimationFrame(tick); //
    };
    tick(); //
  }

  _handleNoHands(resBox, outArea) {
    this.consecutiveNoHandFrames++; //
    this.predictionBuffer = []; //
    this.stablePrediction = ""; //
    resBox.innerHTML = `<p class="text-muted m-0">No hands detected...</p>`; //
    if (
      this.consecutiveNoHandFrames >= this.noHandThreshold && //
      this.sentence.length > 0 && //
      this.lastAppendedSign !== " " //
    ) {
      this.sentence.push(" "); //
      outArea.value = this.sentence.join(""); //
      this.lastAppendedSign = " "; //
      this.consecutiveNoHandFrames = 0; //
    }
  }

  _updatePredictionUI(resBox, outArea) {
    let display = this.stablePrediction; //
    if (["2", "v"].includes((display || "").toLowerCase())) display = "2 / V"; //
    if (display) {
      //
      resBox.innerHTML = `
        <div class="text-center">
          <p class="fw-bold text-primary display-4 m-0">${display.toUpperCase()}</p>
          <small class="text-muted">Stable prediction</small>
        </div>`; //
      if (this.lastAppendedSign !== display) {
        //
        if (this.sentence[this.sentence.length - 1] === " ")
          //
          this.sentence.pop(); //
        this.sentence.push(display); //
        outArea.value = this.sentence.join(""); //
        this.lastAppendedSign = display; //
        outArea.scrollTop = outArea.scrollHeight; //
      }
    } else if (this.predictionBuffer.length > 0) {
      //
      const last = this.predictionBuffer[this.predictionBuffer.length - 1]; //
      resBox.innerHTML = `
        <div class="text-center">
          <p class="fw-semibold text-warning display-5 m-0">${last.sign.toUpperCase()}</p>
          <small class="text-muted">Detecting... (${
            this.predictionBuffer.length
          }/${this.bufferSize})</small>
        </div>`; //
    } else {
      resBox.innerHTML = `<p class="text-muted m-0">Detecting...</p>`; //
    }
  }

  stopCamera() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.isCapturing = false;
    this.stream = null;
    this.clearOutput();

    const v = document.getElementById("camera-feed");
    const c = document.getElementById("hand-overlay-canvas");

    if (v) {
      v.srcObject = null;
      v.style.transform = "scaleX(1)"; // Reset video transform on stop
    }
    if (c) {
      c.getContext("2d").clearRect(0, 0, c.width, c.height);
      c.style.transform = "scaleX(1)"; // Reset canvas transform on stop
    }

    document.getElementById("camera-placeholder").classList.remove("d-none");
    document.getElementById("enable-camera").classList.remove("d-none");
    document.getElementById("stop-camera").classList.add("d-none");
  }

  loadTranslatorContent() {
    const c = document.getElementById("translator-content"); //
    if (!c) return; //
    c.innerHTML = `
      <div class="container">
        <div class="d-flex justify-content-center mt-n2 mb-4">
          <div class="bg-navy p-1 rounded d-flex gap-2 w-100" style="max-width: 600px;">
            <button class="btn btn-coral mode-btn rounded flex-fill px-4 py-2" data-translation-mode="text-to-sign">Text to Sign</button>
            <button class="btn btn-outline-light mode-btn rounded flex-fill px-4 py-2" data-translation-mode="sign-to-text">Sign to Text</button>
          </div>
        </div>
        <div id="text-to-sign-section">${this.renderTextToSign()}</div>
        <div id="sign-to-text-section" class="d-none">${this.renderSignToText()}</div>
      </div>`; //
    this.switchMode("text-to-sign"); //
  }

  switchMode(mode) {
    this.currentMode = mode; //
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      const on = btn.dataset.translationMode === mode; //
      btn.classList.toggle("btn-coral", on); //
      btn.classList.toggle("btn-outline-light", !on); //
    });
    document
      .getElementById("text-to-sign-section")
      .classList.toggle("d-none", mode !== "text-to-sign"); //
    document
      .getElementById("sign-to-text-section")
      .classList.toggle("d-none", mode !== "sign-to-text"); //
    if (mode === "text-to-sign" && this.isCapturing) this.stopCamera(); //
  }

  renderTextToSign() {
    return `
      <div class="row g-4">
        <div class="col-md-6">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title">Enter Text</h5>
              <textarea id="text-input" class="form-control mb-2" rows="6" maxlength="500" placeholder="e.g., Good Morning"></textarea>
              <div class="text-end small text-muted"><span id="char-count">0</span>/500</div>
              <div class="mt-2">
                <small class="text-muted">Suggestions:</small>
                <div class="d-flex flex-wrap gap-1 mt-1">
                  <span class="badge bg-light text-dark border suggestion-item cursor-pointer">Good Morning</span>
                  <span class="badge bg-light text-dark border suggestion-item cursor-pointer">Thank You</span>
                  <span class="badge bg-light text-dark border suggestion-item cursor-pointer">What Is Your Name</span>
                </div>
              </div>
              <div class="mt-3 d-flex flex-wrap gap-2">
                <button id="translate-text" class="btn btn-success" disabled>Translate</button>
                <button id="clear-text" class="btn btn-secondary">Clear</button>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title">ISL Video Preview</h5>
              <div id="sign-display" class="bg-dark text-white d-flex align-items-center justify-content-center text-center rounded" style="aspect-ratio: 16/9;">
                <video id="sign-video-player" class="img-fluid d-none" controls autoplay muted></video>
                <div id="sign-placeholder">
                  <i class="fa-solid fa-hands-asl-interpreting fs-2 mb-2"></i>
                  <p>Sign animations will appear here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`; //
  }

  translateTextToSign() {
    const textEl = document.getElementById("text-input"); //
    const video = document.getElementById("sign-video-player"); //
    const ph = document.getElementById("sign-placeholder"); //
    const raw = textEl.value.trim(); //
    if (!raw) return; //
    const file = raw.toLowerCase().replace(/ /g, "_"); //
    const path = `videos/sentences/${file}.mp4`; //
    ph.innerHTML = `<div><i class="fa-solid fa-spinner fa-spin fs-2"></i><p class="mt-2">Loading...</p></div>`; //
    video.src = path; //
    video.oncanplay = () => {
      ph.classList.add("d-none"); //
      video.classList.remove("d-none"); //
      video.play(); //
    };
    video.onerror = () => {
      ph.classList.remove("d-none"); //
      video.classList.add("d-none"); //
      ph.innerHTML = `<div><i class="fa-solid fa-circle-exclamation fs-2 text-warning"></i><p class="mt-2">Sorry, a video for that phrase was not found.</p></div>`; //
    };
  }

  updateCharacterCounter() {
    document.getElementById("char-count").textContent =
      document.getElementById("text-input").value.length; //
  }

  updateTranslateButtonState() {
    const v = document.getElementById("text-input").value.trim(); //
    document.getElementById("translate-text").disabled = v.length === 0; //
  }

  clearTextInput() {
    document.getElementById("text-input").value = ""; //
    const v = document.getElementById("sign-video-player"); //
    v.src = ""; //
    v.classList.add("d-none"); //
    document.getElementById("sign-placeholder").classList.remove("d-none"); //
    this.updateCharacterCounter(); //
    this.updateTranslateButtonState(); //
  }

  clearOutput() {
    this.sentence = []; //
    this.lastAppendedSign = null; //
    this.stablePrediction = ""; //
    this.predictionBuffer = []; //
    const out = document.getElementById("output-text-area"); //
    if (out) out.value = ""; //
    const res = document.getElementById("detection-results"); //
    if (res)
      res.innerHTML = `<p class="text-muted m-0">Predictions will appear here...</p>`; //
  }
}

window.translatorManager = new TranslatorManager();
