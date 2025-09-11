/**
 * Shared AI Manager (Singleton)
 *
 * This module is responsible for loading all AI resources (TensorFlow.js models,
 * label maps, and MediaPipe) for the entire application.
 * It follows a singleton pattern to ensure that these heavy resources are
 * fetched and initialized only ONCE, preventing race conditions and duplicate loading
 * between different parts of the application like the learning module and the translator.
 */

class SharedAIManager {
  constructor() {
    if (SharedAIManager.instance) {
      return SharedAIManager.instance;
    }

    // --- Models and Labels ---
    this.models = { static: null, dynamic: null };
    this.labels = { static: [], dynamic: [] };
    this.mediaPipeHolistic = null;
    this.initialized = false;

    // --- The Key Change: A promise that resolves when loading is complete ---
    // Other modules will wait for this promise.

    SharedAIManager.instance = this;
  }

  /**
   * Private method to initialize all resources immediately.
   * This is called only once by the constructor.
   */
  async init() {
    if (this.initialized) {
      console.log("AIManager already initialized.");
      return;
    }
    console.log("--- 🧠 SharedAIManager: Starting initialization ---");
    try {
      await Promise.all([
        this.loadModel("/isl_static_model_tfjs/model.json", "static"),
        this.loadModel("/isl_dynamic_model_tfjs/model.json", "dynamic"),
        this.loadLabels("/label_mapping_static.json", "static"),
        this.loadLabels("/label_mapping_dynamic.json", "dynamic"),
        this._loadMediaPipe(),
      ]);
      this.initialized = true;
      console.log(
        "--- ✅ SharedAIManager: All resources initialized successfully! ---"
      );
    } catch (error) {
      console.error(
        "--- ❌ SharedAIManager: A critical error occurred during initialization ---",
        error
      );
      throw error;
    }
  }

  // --- Helper methods for loading ---

  async loadModel(url, type) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      console.log(`--- Raw content of ${type} model.json ---`);
      console.log(text.slice(0, 200)); // log first 200 chars
      const manifest = JSON.parse(text);

      console.log(`⏳ Loading ${type} model (format: ${manifest.format})...`);

      this.models[type] =
        manifest.format === "layers-model"
          ? await tf.loadLayersModel(url)
          : await tf.loadGraphModel(url);

      console.log(`✅ ${type} model loaded successfully`);
    } catch (err) {
      console.error(`❌ Failed to load ${type} model:`, err);
      throw err;
    }
  }

  async loadLabels(url, type) {
    console.log(`⏳ Loading ${type} labels...`);
    const response = await fetch(url);
    const labelMap = await response.json();
    this.labels[type] = Object.values(labelMap);
  }

  async _loadMediaPipe() {
    console.log("⏳ Initializing MediaPipe Holistic...");
    this.mediaPipeHolistic = new Holistic({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@medipe/holistic/${file}`,
    });
    this.mediaPipeHolistic.setOptions({
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  // --- Public Getters ---
  getModels(mode) {
    return this.models;
  }

  getLabels(mode) {
    return this.labels;
  }
}
