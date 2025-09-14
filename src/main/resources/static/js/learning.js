/**
 * Manages the learning interface, including loading modules, lessons,
 * and handling AI-powered user interactions.
 */

class LearningManager {
  constructor() {
    // State
    this.currentModule = null;
    this.currentLesson = null;
    this.isInitialized = false;
    this.isCapturing = false;
    this.isRecording = false;
    this.stream = null;
    this.currentModelType = null;
    this.keypointSequence = [];
    this.lastDetection = null; // last MediaPipe results
    this.animationFrameId = null;
    this.lessonStartTime = null;

    // Constants
    this.DYNAMIC_SEQUENCE_LENGTH = 45; // must match training

    // AI
    this.staticModel = null; // GraphModel (execute) or LayersModel (predict)
    this.dynamicModel = null; // LayersModel
    this.mediaPipeHolistic = null;
    this.mediaPipeHands = null;
    this.dynamicClassNames = [
      "Angry",
      "Family",
      "Father",
      "Friday",
      "Good Afternoon",
      "Good Evening",
      "Good Morning",
      "Good Night",
      "Grandfather",
      "Grandmother",
      "Happy",
      "Monday",
      "Mother",
      "Now",
      "Sad",
      "Saturday",
      "Sister",
      "Sunday",
      "Thank You",
      "Thursday",
      "Tuesday",
      "Wednesday",
    ];
  }

  async init() {
    if (this.isInitialized) return;
    console.log("🔄 Initializing LearningManager...");
    await this._loadAIResources();
    this._setupEventListeners();
    this.isInitialized = true;
    console.log("✅ LearningManager initialized");
  }

  async _loadAIResources() {
    try {
      console.log("LearningManager: Requesting AI resources...");
      if (!sharedAIManager.initialized) {
        await sharedAIManager.init();
      }

      const models = sharedAIManager.getModels("learning");
      const labels = sharedAIManager.getLabels("learning");

      this.staticModel = models.static;
      this.dynamicModel = models.dynamic;
      this.staticClassNames = labels.static;
      this.dynamicClassNames = labels.dynamic;

      // Initialize MediaPipe Holistic (for dynamic signs)
      this.mediaPipeHolistic = new Holistic({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
      });
      this.mediaPipeHolistic.setOptions({
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      // Initialize MediaPipe Hands (for static signs)
      this.mediaPipeHands = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      this.mediaPipeHands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      console.log("LearningManager: AI resources received.");
    } catch (e) {
      console.error("❌ LearningManager failed to get AI resources:", e);
    }
  }

  _setupEventListeners() {
    document.addEventListener("click", (e) => {
      const learningContainer = document.getElementById("learning-content");
      if (!learningContainer || !learningContainer.contains(e.target)) return;

      const handlers = {
        ".module-item": (el) => this.selectModule(el.dataset.moduleId),
        // Ensure this line does not have a 'pe-none' or 'locked-lesson' class before selecting
        ".lesson-item": (el) => {
          if (!el.classList.contains("locked-lesson")) {
            this.selectLesson(el.dataset.lessonId);
          }
        },
        "#back-to-module": (el) => this.selectModule(el.dataset.moduleId),
        "#back-to-lesson": () => this.selectLesson(this.currentLesson?.id),
        "[data-practice-shape]": (el) =>
          this.startPractice(el.dataset.practiceShape),
        "#enable-camera": () => this.startCamera(),
        "#check-my-sign": () => this.checkSign(),
        "#stop-practice-camera": () => this.stopCamera(),
        "[data-navigate-lesson-id]": (el) =>
          !el.disabled && this.selectLesson(el.dataset.navigateLessonId),

        // --- THIS IS THE CORRECTED LOGIC ---
        // It now calls your new global function from app.js instead of the old one.
        "#complete-and-navigate-btn": async (el) => {
          await this._trackLessonCompletion();
          this.selectLesson(el.dataset.nextLessonId);
        },
        "#finish-module-btn": async (el) => {
          await this._trackLessonCompletion();
          this.selectModule(el.dataset.moduleId);
        },
      };

      for (const selector in handlers) {
        const element = e.target.closest(selector);
        if (element) {
          handlers[selector](element);
        }
      }
    });
  }

  /**
   * Sends a notification to the backend that the current lesson has been completed.
   * This will trigger updates to the user's progress, streak, and recent activity.
   */
  async _trackLessonCompletion() {
    await this._trackStudyTime(); // ⏱ Track study time first
    const user = AuthManager.getCurrentUser();
    if (!user || !this.currentLesson) {
      return;
    }

    try {
      // === 1) COMPLETE THE LESSON (No changes here) ===
      const completeLessonUrl = `/api/progress/complete-lesson/${user.id}`;
      const lessonResponse = await fetch(completeLessonUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: this.currentLesson.id }),
      });

      if (!lessonResponse.ok) {
        throw new Error(
          `API Error (complete-lesson): ${lessonResponse.statusText}`
        );
      }

      AuthManager.saveCompletedLesson(this.currentLesson.id);

      if (typeof AuthManager.updateUserActivity === "function") {
        AuthManager.updateUserActivity("lesson_completed", {
          lessonTitle: this.currentLesson.title,
          lessonId: this.currentLesson.id,
        });
        console.log("✅ Recent activity updated locally via AuthManager.");
      }

      window.app.showToast("Lesson completed!", "success");

      // === 2) UPDATE THE STUDY STREAK (ONCE PER DAY) --- THIS BLOCK IS MODIFIED ===

      // 1. Get today's date in a consistent format (e.g., "2025-08-26")
      const today = new Date();
      const todayDateString = today.toISOString().split("T")[0];

      // 2. Get the date of the last streak update from local storage
      const lastUpdateDate = AuthManager.getUserData("lastStreakUpdate");

      // 3. Only run the update logic if the last update was not today
      if (todayDateString !== lastUpdateDate) {
        console.log("First lesson of the day. Updating study streak...");

        const updateStreakUrl = `/api/progress/update-streak/${user.id}`;
        const streakResponse = await fetch(updateStreakUrl, { method: "POST" });

        if (!streakResponse.ok) {
          throw new Error(
            `API Error (update-streak): ${streakResponse.statusText}`
          );
        }

        // Log to recent activities only when the streak is actually updated
        if (typeof AuthManager.updateUserActivity === "function") {
          AuthManager.updateUserActivity("streak_updated", {
            date: today.toISOString(),
          });
        }

        // 4. IMPORTANT: Save today's date as the new "last update date"
        AuthManager.setUserData("lastStreakUpdate", todayDateString);
        console.log("Streak update date saved for today.");
      } else {
        console.log("Streak has already been updated today. Skipping.");
      }
      // === END OF MODIFIED BLOCK ===

      // === 3) CHECK FOR NEW ACHIEVEMENTS (No changes here) ===
      const checkAchievementsUrl = `/api/achievements/check/${user.id}`;
      const achievementResponse = await fetch(checkAchievementsUrl, {
        method: "POST",
      });

      if (!achievementResponse.ok) {
        throw new Error(
          `API Error (check-achievements): ${achievementResponse.statusText}`
        );
      }

      const updatedAchievements = await achievementResponse.json();

      if (updatedAchievements.length > 0) {
        AuthManager.setUserData("achievements", updatedAchievements);
      }

      window.dispatchEvent(new CustomEvent("userProgressUpdated"));
    } catch (error) {
      console.error(
        "❌ Failed to track lesson completion, streak, or achievements:",
        error
      );
    }
  }

  /**
   * Calculates the time spent on the current lesson and sends it to the backend.
   */
  async _trackStudyTime() {
    const user = AuthManager.getCurrentUser();
    // Exit if there's no user, no timer, or no lesson to track.
    if (!user || !this.lessonStartTime || !this.currentLesson) {
      return;
    }

    // Calculate duration in minutes
    const endTime = new Date();
    const durationInSeconds = (endTime - this.lessonStartTime) / 1000;
    const durationInMinutes = Math.round(durationInSeconds / 60);

    // To avoid sending empty pings, only track if they spent a meaningful amount of time.
    if (durationInMinutes <= 0) {
      console.log("No significant study time to track.");
      this.lessonStartTime = null; // Reset timer
      return;
    }

    console.log(
      `Tracking ${durationInMinutes} minute(s) of study time for user ${user.id}`
    );

    try {
      const url = `/api/progress/add-study-time/${user.id}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // The backend expects the minutes as a raw integer in the body
        body: JSON.stringify(durationInMinutes),
      });

      if (!response.ok) {
        throw new Error(`API Error (add-study-time): ${response.statusText}`);
      }

      console.log("Study time tracked successfully.");
    } catch (error) {
      console.error("Failed to track study time:", error);
    } finally {
      // IMPORTANT: Reset the timer after tracking to prevent double-counting.
      this.lessonStartTime = null;
    }
  }

  // ---------- Feature extraction ----------

  _extractStaticFeatures(results) {
    const HAND_PAD = Array(63).fill(0);
    let right = HAND_PAD.slice();
    let left = HAND_PAD.slice();

    if (results?.multiHandedness && results?.multiHandLandmarks) {
      results.multiHandedness.forEach((h, i) => {
        const side = (h.label || "").toLowerCase();
        const lms = results.multiHandLandmarks[i];
        if (!lms) return;
        const flat = lms.flatMap((lm) => [lm.x, lm.y, lm.z]);
        if (side === "right") right = flat;
        if (side === "left") left = flat;
      });
    }
    return [...right, ...left]; // 126
  }

  _extractDynamicFeatures(results) {
    const posePad = Array(33 * 4).fill(0);
    const handPad = Array(21 * 3).fill(0);

    const pose = results.poseLandmarks
      ? results.poseLandmarks.flatMap((lm) => [lm.x, lm.y, lm.z, lm.visibility])
      : posePad;

    const lh = results.leftHandLandmarks
      ? results.leftHandLandmarks.flatMap((lm) => [lm.x, lm.y, lm.z])
      : handPad;

    const rh = results.rightHandLandmarks
      ? results.rightHandLandmarks.flatMap((lm) => [lm.x, lm.y, lm.z])
      : handPad;

    return [...pose, ...lh, ...rh]; // 258
  }

  // ---------- UI (high-level) ----------

  loadLearningContent() {
    const c = document.getElementById("learning-content");
    if (!c) return;
    c.innerHTML = `
      <div class="row g-4">
        <div class="col-md-4">
          <div class="bg-white rounded shadow border p-3">
            <h3 class="h6 fw-semibold text-navy mb-3">Modules</h3>
            <div id="module-list-container" class="vstack gap-2">
              ${window.learningModules
                .map(
                  (m) => `
                <div class="module-item p-3 rounded bg-light cursor-pointer border module-select" data-module-id="${m.id}">
                  <h5 class="mb-1 text-navy fw-semibold">${m.title}</h5>
                  <p class="small text-muted mb-0">${m.description}</p>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </div>
        <div class="col-md-8">
          <div id="lesson-content-area" class="bg-white rounded shadow border p-4 min-vh-50">
            <div class="text-center d-flex flex-column justify-content-center align-items-center h-100 py-5">
              <i class="fa-solid fa-book-open-reader display-4 text-muted mb-3"></i>
              <h2 class="h4 fw-bold text-navy">Select a Module</h2>
              <p class="text-muted mt-2 mx-auto" style="max-width: 500px;">
                Choose a module from the left to begin your learning journey.
              </p>
            </div>
          </div>
        </div>
      </div>`;
  }

  selectModule(moduleId) {
    this.stopCamera();
    if (this.currentLesson) {
      this._trackStudyTime();
      this.currentLesson = null;
    }

    this.currentModule = window.learningModules.find((m) => m.id === moduleId);
    if (!this.currentModule) return;

    // 1. Get the completed lessons data from AuthManager, defaulting to an empty array.
    const completedData = AuthManager.getCompletedLessons() || [];

    // 2. Ensure we are working with a Set for efficient '.has()' lookups.
    // This makes the code work even if AuthManager returns a simple array.
    const completedLessons = new Set(completedData);

    const lessonContentArea = document.getElementById("lesson-content-area");
    lessonContentArea.innerHTML = `
      <div>
        <h2 class="h4 fw-bold text-navy mb-2">${this.currentModule.title}</h2>
        <p class="text-muted mb-4">${this.currentModule.description}</p>
        <div class="vstack gap-3">
          ${this.currentModule.lessons
            .map((lesson, index) => {
              // This logic ensures the first lesson (at index 0) is never locked.
              let isLocked = false;
              if (index > 0) {
                // Any subsequent lesson is locked if the PREVIOUS lesson is not in the completed set.
                const previousLesson = this.currentModule.lessons[index - 1];
                if (!completedLessons.has(previousLesson.id)) {
                  isLocked = true;
                }
              }
              // Pass the lesson and its locked state to the rendering helper.
              return this._renderLessonItem(lesson, isLocked);
            })
            .join("")}
        </div>
      </div>
    `;

    document.querySelectorAll(".module-item").forEach((it) => {
      it.classList.toggle("bg-coral-50", it.dataset.moduleId === moduleId);
    });
  }

  selectLesson(lessonId) {
    this.stopCamera(); // Stop camera if a new lesson is selected

    if (this.currentLesson) {
      this._trackStudyTime();
    }

    if (!this.currentModule) return;

    const lesson = this.currentModule.lessons.find((l) => l.id === lessonId);

    if (!lesson) return;

    this.currentLesson = lesson;
    this.lessonStartTime = new Date();

    const area = document.getElementById("lesson-content-area");
    if (this.currentLesson.type === "interactive-practice") {
      area.innerHTML = this._renderPracticeLesson(this.currentLesson);
    } else {
      area.innerHTML = `
        <div class="position-relative">
          <button class="btn btn-sm btn-outline-secondary position-absolute top-0 end-0" id="back-to-module" data-module-id="${
            this.currentModule.id
          }">
            <i class="fa-solid fa-arrow-left me-1"></i> Back to Module
          </button>
          <h2 class="h4 fw-bold text-navy mb-2">${this.currentLesson.title}</h2>
          <p class="text-muted mb-4">${this.currentLesson.description}</p>
          <hr>
          <div class="lesson-content-reading">
            ${this.currentLesson.content}
          </div>
          ${this.renderLessonNavigation(this.currentLesson.id)}
        </div>
      `;
    }
  }

  _renderPracticeLesson(lesson) {
    const cards = lesson.content
      .map(
        (item) => `
      <div class="col-md-6 col-lg-4">
        <div class="card h-100">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title text-navy">${item.name}</h5>
            <video src="${item.videoSrc}" class="img-fluid rounded border bg-light mb-3" controls muted loop></video>
            <button class="btn btn-primary mt-auto" data-practice-shape="${item.name}">
              <i class="fa-solid fa-camera me-2"></i>Practice this Sign
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join("");

    return `
      <div class="position-relative">
        <button class="btn btn-sm btn-outline-secondary position-absolute top-0 end-0" id="back-to-module" data-module-id="${
          this.currentModule.id
        }">
          <i class="fa-solid fa-arrow-left me-1"></i> Back to Module
        </button>
        <h2 class="h4 fw-bold text-navy mb-2">${lesson.title}</h2>
        <p class="text-muted mb-4">${lesson.description}</p>
        <div class="row g-4">${cards}</div>
        ${this.renderLessonNavigation(lesson.id)}
      </div>`;
  }

  startPractice(shapeName) {
    const shape = this.currentLesson?.content?.find(
      (s) => s.name === shapeName
    );
    this.currentModelType = this.currentLesson?.modelType;
    if (!shape || !this.currentModelType) return;

    const area = document.getElementById("lesson-content-area");
    const isStatic = this.currentModelType === "static";
    area.innerHTML = `
      <div>
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h3 class="h5 text-navy mb-0">Practice Mode: ${shape.name}</h3>
          <button class="btn btn-sm btn-secondary" id="back-to-lesson">
            <i class="fa-solid fa-arrow-left me-1"></i> Back
          </button>
        </div>
        <div class="row g-4">
          <div class="col-md-6">
            <h6 class="text-muted">Reference Video</h6>
            <video src="${
              shape.videoSrc
            }" class="img-fluid rounded border bg-light" controls muted loop autoplay></video>
          </div>
          <div class="col-md-6">
            <h6 class="text-muted">Your Camera</h6>
            <div class="bg-dark rounded overflow-hidden position-relative" style="aspect-ratio: 16/9;">
              <video id="practice-camera-feed" class="w-100 h-100" autoplay muted playsinline></video>
              <canvas id="practice-overlay-canvas" class="position-absolute top-0 start-0 w-100 h-100"></canvas>
              <div id="practice-camera-placeholder" class="text-white d-flex flex-column align-items-center justify-content-center h-100">
                <i class="fa-solid fa-video fs-2 mb-2"></i>
                <p>Camera feed will appear here</p>
              </div>
              ${
                !isStatic
                  ? `
                <div id="recording-progress-container" class="position-absolute bottom-0 start-0 w-100 p-2 d-none">
                  <div class="progress" style="height: 10px;">
                    <div id="recording-progress-bar" class="progress-bar bg-coral" role="progressbar" style="width: 0%"></div>
                  </div>
                </div>
              `
                  : ""
              }
            </div>
            <div class="d-flex gap-2 justify-content-center mt-3">
              <button id="enable-camera" class="btn btn-primary">Enable Camera</button>
              <button id="check-my-sign" class="btn btn-success d-none">${
                isStatic ? "Check My Sign" : "Start Recording"
              }</button>
              <button id="stop-practice-camera" class="btn btn-danger d-none">Stop Camera</button>
            </div>
          </div>
        </div>
        <div id="practice-feedback" class="alert alert-info mt-4" data-sign-to-practice="${
          shape.name
        }">
          ${
            isStatic
              ? 'Enable your camera, perform the sign, and click "Check My Sign".'
              : 'Enable your camera, click "Start Recording," and perform the sign as the progress bar fills.'
          }
        </div>
      </div>`;
  }

  // ---------- Camera & Holistic loop ----------

  async startCamera() {
    if (!this.mediaPipeHolistic || !this.mediaPipeHands) {
      alert(
        "AI resources are not yet loaded. Please wait a moment and try again."
      );
      return;
    }
    try {
      if (this.stream) this.stopCamera(); // Ensure previous stream is stopped
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      });
      const videoEl = document.getElementById("practice-camera-feed");
      videoEl.srcObject = this.stream;

      videoEl.onloadedmetadata = () => {
        this.isCapturing = true;

        // --- NEW LOGIC: CHOOSE THE CORRECT MEDIAPIPE MODEL ---
        if (this.currentModelType === "static") {
          console.log("Starting MediaPipe Hands for static detection...");
          this._startHandLoop(
            videoEl,
            document.getElementById("practice-overlay-canvas")
          );
        } else {
          console.log("Starting MediaPipe Holistic for dynamic detection...");
          this._startLandmarkLoop(
            videoEl,
            document.getElementById("practice-overlay-canvas")
          );
        }

        // Update UI (same as before)
        document
          .getElementById("practice-camera-placeholder")
          .classList.add("d-none");
        document.getElementById("enable-camera").classList.add("d-none");
        document.getElementById("check-my-sign").classList.remove("d-none");
        document
          .getElementById("stop-practice-camera")
          .classList.remove("d-none");
      };
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access the camera. Please check browser permissions.");
    }
  }

  stopCamera() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());

    this.isCapturing = false;
    this.isRecording = false;
    this.stream = null;

    const wrap = document.getElementById("lesson-content-area");
    const ph = wrap?.querySelector("#practice-camera-placeholder");
    if (ph) {
      ph.classList.remove("d-none");
      wrap.querySelector("#enable-camera")?.classList.remove("d-none");
      wrap.querySelector("#check-my-sign")?.classList.add("d-none");
      wrap.querySelector("#stop-practice-camera")?.classList.add("d-none");
    }
  }

  _startLandmarkLoop(videoEl, canvasEl) {
    const ctx = canvasEl.getContext("2d");
    const progressBar = document.getElementById("recording-progress-bar");
    const fb = document.getElementById("practice-feedback");

    const onResults = (results) => {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      // Draw landmarks (same as before)
      if (results.poseLandmarks)
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 2,
        });
      if (results.leftHandLandmarks)
        drawConnectors(ctx, results.leftHandLandmarks, HAND_CONNECTIONS, {
          color: "#CC0000",
          lineWidth: 3,
        });
      if (results.rightHandLandmarks)
        drawConnectors(ctx, results.rightHandLandmarks, HAND_CONNECTIONS, {
          color: "#00CC00",
          lineWidth: 3,
        });

      if (this.isRecording && this.currentModelType === "dynamic") {
        this.keypointSequence.push(this._extractDynamicFeatures(results));

        const progress =
          (this.keypointSequence.length / this.DYNAMIC_SEQUENCE_LENGTH) * 100;
        if (progressBar) progressBar.style.width = `${progress}%`;

        // --- CORRECTED LOGIC ---
        // When 45 frames are collected, stop recording and run the prediction.
        if (this.keypointSequence.length >= this.DYNAMIC_SEQUENCE_LENGTH) {
          this.isRecording = false; // Stop the recording

          // Update UI to show analysis is happening
          fb.className = "alert alert-info mt-4";
          fb.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i>Analyzing your sign sequence...`;

          // Directly call the prediction function
          this._predictDynamicSign().then((result) => {
            if (result && result.predictedWord) {
              this._showDynamicFeedbackModal(result, fb.dataset.signToPractice);
              // Reset instructional text
              fb.innerHTML =
                'Enable your camera, click "Start Recording," and perform the sign as the progress bar fills.';
            } else {
              fb.className = "alert alert-warning mt-4";
              fb.innerHTML = `I couldn't analyze that sign. Please ensure you are clearly in frame and try again.`;
            }
          });

          if (progressBar) progressBar.style.width = "0%"; // Reset bar
          document
            .getElementById("recording-progress-container")
            .classList.add("d-none");
        }
      }
      this.lastDetection = results;
    };

    this.mediaPipeHolistic.onResults(onResults);

    const pump = async () => {
      if (!this.isCapturing) return;
      await this.mediaPipeHolistic.send({ image: videoEl });
      this.animationFrameId = requestAnimationFrame(pump);
    };
    pump();
  }

  // ---------- Prediction flows ----------

  checkSign() {
    if (this.currentModelType === "static") {
      this._predictStaticOnce();
    } else if (this.currentModelType === "dynamic") {
      this._toggleDynamicRecord();
    }
  }

  _predictStaticOnce() {
    const fb = document.getElementById("practice-feedback");
    if (!this.staticModel || !this.isCapturing || !this.lastDetection) {
      fb.className = "alert alert-warning mt-4";
      fb.innerHTML = `Model or camera not ready. Please try again.`;
      return;
    }

    fb.className = "alert alert-info mt-4";
    fb.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i>Analyzing your sign...`;

    const results = this.lastDetection;
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const features = this._extractStaticFeatures(results);

      tf.tidy(() => {
        const input = tf.tensor2d([features]); // Shape [1, 126]
        const prediction = this._runStaticModel(input); // Get prediction tensor

        const probabilities = prediction.dataSync();
        const predictedIndex = prediction.as1D().argMax().dataSync()[0];

        const predictedSign = this.staticClassNames[predictedIndex];
        const confidence = probabilities[predictedIndex];

        this._showPracticeResult(
          predictedSign,
          confidence,
          fb.dataset.signToPractice
        );
      });
    } else {
      fb.className = "alert alert-warning mt-4";
      fb.innerHTML = `I couldn't see your hands clearly. Please position them in the frame and try again.`;
    }
  }

  _startHandLoop(videoEl, canvasEl) {
    const ctx = canvasEl.getContext("2d");

    const onResults = (results) => {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
          drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 5,
          });
          drawLandmarks(ctx, landmarks, { color: "#FF0000", lineWidth: 2 });
        }
      }
      this.lastDetection = results;
    };

    this.mediaPipeHands.onResults(onResults);

    const pump = async () => {
      if (!this.isCapturing) return;
      await this.mediaPipeHands.send({ image: videoEl });
      this.animationFrameId = requestAnimationFrame(pump);
    };
    pump();
  }

  _toggleDynamicRecord() {
    if (this.isRecording) return; // Prevent starting a new recording while one is in progress

    const fb = document.getElementById("practice-feedback");
    const progressContainer = document.getElementById(
      "recording-progress-container"
    );
    const btn = document.getElementById("check-my-sign");

    this.isRecording = true;
    this.keypointSequence = []; // Reset sequence for new recording

    // Update UI to recording state
    fb.className = "alert alert-primary mt-4";
    fb.innerHTML = `<i class="fa-solid fa-video me-2"></i>Recording... Perform the sign now.`;
    if (progressContainer) progressContainer.classList.remove("d-none");

    // Temporarily disable the button to prevent multiple clicks
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Recording...`;

    // Re-enable the button after a short delay, in case the user wants to restart
    setTimeout(() => {
      if (!this.isRecording) {
        // Only re-enable if recording has already finished
        btn.disabled = false;
        btn.innerHTML = "Start Recording";
      }
    }, 1000);
  }

  async _predictDynamicSign() {
    if (!this.dynamicModel) {
      console.error("❌ Dynamic model not loaded yet.");
      return null;
    }

    const sequence = this.keypointSequence;
    const N = this.DYNAMIC_SEQUENCE_LENGTH; // This is 45

    if (!sequence || sequence.length < N) {
      console.warn(
        `⚠️ Not enough frames to make a prediction (need ${N}, got ${
          sequence ? sequence.length : 0
        })`
      );
      return null;
    }

    let inputTensor;
    try {
      const window = sequence.slice(-N);
      inputTensor = tf.tensor([window]); // Shape [1, 45, 258]

      // --- THIS IS THE CORRECTED LOGIC ---
      // 1. Get the exact name of the model's input layer.
      const inputName = this.dynamicModel.inputs[0].name;

      // 2. Pass the tensor in a named map, just like in the static model.
      const prediction = await this.dynamicModel.executeAsync({
        [inputName]: inputTensor,
      });
      // ------------------------------------

      const probs = await prediction.data();
      const predictedIndex = prediction.as1D().argMax().dataSync()[0];
      const confidence = probs[predictedIndex];
      const predictedWord = this.dynamicClassNames[predictedIndex] || "UNKNOWN";

      console.log("✅ Dynamic Prediction:", { predictedWord, confidence });

      // Clean up memory
      tf.dispose([inputTensor, prediction]);
      return { predictedWord, confidence };
    } catch (err) {
      console.error("❌ Dynamic prediction error:", err);
      if (inputTensor) {
        tf.dispose(inputTensor);
      }
      return null;
    }
  }

  // ---------- Helpers ----------

  _runStaticModel(inputTensor) {
    // This helper works for GraphModels, which is what we have now.
    // It assumes the input and output names from the Keras model.
    const inputName = this.staticModel.inputs[0].name;
    const outputName = this.staticModel.outputs[0].name;

    const inputs = {};
    inputs[inputName] = inputTensor;

    return this.staticModel.execute(inputs, outputName);
  }

  _showPracticeResult(predictedSign, confidence, expectedSign) {
    const el = document.getElementById("practice-feedback");
    const pct = (confidence * 100).toFixed(1);

    if (predictedSign?.toLowerCase() === expectedSign?.toLowerCase()) {
      el.className = "alert alert-success mt-4";
      el.innerHTML = `<strong>Great job!</strong> That looks correct.<br><small>Detected: "${predictedSign}" with ${pct}% confidence.</small>`;
    } else {
      el.className = "alert alert-danger mt-4";
      el.innerHTML = `<strong>Not quite.</strong> I detected "${predictedSign}" (${pct}%), but was expecting "${expectedSign}". Try again!`;
    }
  }

  _showDynamicFeedbackModal(result, expectedSign) {
    // --- MODIFICATION 1: DEFINE THE CONFIDENCE THRESHOLD ---
    // We will only show a firm correct/incorrect answer if confidence is 60% or higher.
    const CONFIDENCE_THRESHOLD = 0.3;

    const modalElement = document.getElementById("feedback-modal");
    if (!modalElement) return;

    const modal = new bootstrap.Modal(modalElement);
    const titleEl = modalElement.querySelector("#feedback-title");
    const messageEl = modalElement.querySelector("#feedback-message");
    const iconEl = modalElement.querySelector("#feedback-icon");
    const confidenceBar = modalElement.querySelector(
      "#feedback-confidence-bar"
    );

    const predictedSign = result.predictedWord;
    const confidence = result.confidence;
    const confidencePct = (confidence * 100).toFixed(1);
    const isCorrect =
      predictedSign?.toLowerCase() === expectedSign?.toLowerCase();

    // --- MODIFICATION 2: ADD A NEW CHECK FOR LOW CONFIDENCE ---
    // This new if/else if/else block handles all three possible outcomes.
    if (confidence < CONFIDENCE_THRESHOLD) {
      // Outcome 1: The model is NOT confident.
      titleEl.textContent = "Could you try that again?";
      messageEl.innerHTML = `I'm not confident enough in my prediction. Please try performing the sign again, ensuring you are clearly in the frame.`;
      iconEl.innerHTML = `
        <svg xmlns="http://www.w.org/2000/svg" class="text-warning" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path>
        </svg>`;
      confidenceBar.classList.remove("bg-success", "bg-danger");
      confidenceBar.classList.add("bg-warning");
    } else if (isCorrect) {
      // Outcome 2: The model is confident AND correct.
      titleEl.textContent = "Excellent!";
      messageEl.innerHTML = `You correctly signed <strong>"${expectedSign}"</strong>. Keep up the great work!`;
      iconEl.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="text-success" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path>
        </svg>`;
      confidenceBar.classList.remove("bg-warning", "bg-danger");
      confidenceBar.classList.add("bg-success");
    } else {
      // Outcome 3: The model is confident BUT incorrect.
      titleEl.textContent = "Almost There!";
      messageEl.innerHTML = `I detected <strong>"${predictedSign}"</strong>, but was expecting <strong>"${expectedSign}"</strong>. Let's try that again!`;
      iconEl.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="text-danger" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"></path>
        </svg>`;
      confidenceBar.classList.remove("bg-warning", "bg-success");
      confidenceBar.classList.add("bg-danger");
    }

    // This part of the function remains the same.
    confidenceBar.style.width = `${confidencePct}%`;
    confidenceBar.textContent = `${confidencePct}%`;

    modalElement.addEventListener(
      "hidden.bs.modal",
      () => {
        this._resetDynamicPracticeUI();
      },
      { once: true }
    );

    modal.show();
  }

  _resetDynamicPracticeUI() {
    const btn = document.getElementById("check-my-sign");
    const fb = document.getElementById("practice-feedback");

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "Start Recording";
    }
    if (fb) {
      fb.className = "alert alert-info mt-4";
      fb.innerHTML =
        'Enable your camera, click "Start Recording," and perform the sign as the progress bar fills.';
    }
  }

  renderLessonNavigation(currentLessonId) {
    const lessons = this.currentModule.lessons;
    const currentIndex = lessons.findIndex((l) => l.id === currentLessonId);

    const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
    const nextLesson =
      currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

    let finalButtonHTML = "";
    if (nextLesson) {
      finalButtonHTML = `
        <button class="btn btn-success" 
                id="complete-and-navigate-btn"
                data-next-lesson-id="${nextLesson.id}">
          Complete & Continue<i class="fa-solid fa-arrow-right ms-2"></i>
        </button>
      `;
    } else {
      finalButtonHTML = `
        <button class="btn btn-success" 
                id="finish-module-btn"
                data-module-id="${this.currentModule.id}">
          Finish Module<i class="fa-solid fa-check ms-2"></i>
        </button>
      `;
    }

    return `
      <hr class="my-4">
      <div class="d-flex justify-content-between align-items-center">
        <button class="btn btn-outline-secondary" 
                data-navigate-lesson-id="${prevLesson ? prevLesson.id : ""}" 
                ${!prevLesson ? "disabled" : ""}>
          <i class="fa-solid fa-arrow-left me-2"></i>Previous Lesson
        </button>

        ${finalButtonHTML}
      </div>
    `;
  }

  _renderLessonItem(lesson, isLocked) {
    const lockedClass = isLocked
      ? "locked-lesson opacity-50 pe-none"
      : "cursor-pointer";
    const lockIcon = isLocked
      ? '<i class="fas fa-lock me-2 text-muted"></i>'
      : "";
    // We only add the data-lesson-id attribute if the lesson is UNLOCKED.
    const lessonIdAttr = isLocked ? "" : `data-lesson-id="${lesson.id}"`;

    return `
      <div class="lesson-item border p-3 rounded bg-white hover-shadow ${lockedClass}" ${lessonIdAttr}>
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h5 class="fw-semibold text-navy mb-1">${lockIcon}${
      lesson.title
    }</h5>
            <p class="text-muted small mb-0">${lesson.description}</p>
          </div>
          <div class="text-end">
            <p class="text-muted small mb-1"><i class="fa-regular fa-clock me-1"></i>${
              lesson.duration
            }</p>
            <span class="badge bg-light text-muted text-capitalize">${lesson.type.replace(
              "-",
              " "
            )}</span>
          </div>
        </div>
      </div>
    `;
  }
}

window.learningManager = new LearningManager();
