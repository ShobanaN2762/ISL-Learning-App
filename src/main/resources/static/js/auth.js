// AuthManager handles login, registration, session management, and logout
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isInitialized = false;
    this._boundAuthEventHandler = null;
  }

  // Called by app.js during init
  // init() {
  //   if (this.isInitialized) return;
  //   this.restoreSession(); // Try to load user from localStorage
  //   this.isInitialized = true;
  // }
  init(onStateChange) {
    if (this.isInitialized) return;

    // 1) Restore from localStorage synchronously
    try {
      const cached = JSON.parse(localStorage.getItem("isl_auth_token"));
      this.currentUser = cached || null;
    } catch {
      this.currentUser = null;
    }

    // 2) Immediately notify the app about the current state
    if (typeof onStateChange === "function") {
      onStateChange(this.currentUser);
    }

    // 3) Keep app and AuthManager in sync via our own custom event
    this._boundAuthEventHandler = (e) => {
      const user = e.detail?.user || null;
      this.currentUser = user;
      if (typeof onStateChange === "function") onStateChange(user);
    };
    document.addEventListener("authStateChanged", this._boundAuthEventHandler);

    this.isInitialized = true;
  }

  // Show Login or Register Modal
  showAuthModal(mode = "login") {
    const modal = document.getElementById("auth-modal");
    const modalBody = document.getElementById("auth-modal-body");
    const modalContent = document.getElementById("auth-modal-content");

    if (!modal || !modalBody || !modalContent) return;

    // Load form into modal body based on mode
    modalBody.innerHTML =
      mode === "login" ? this.getLoginForm() : this.getRegisterForm();

    // Show modal with animation
    modal.classList.remove("d-none");
    modal.style.display = "block";
    requestAnimationFrame(() => {
      modalContent.classList.remove("opacity-0", "scale-95");
    });

    // Attach form submission logic
    const form = modalBody.querySelector("form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (form.id === "login-form") this.handleLogin(form);
      if (form.id === "register-form") this.handleRegister(form);
    });

    // Enable switching between login/register inside modal
    const switchLink = modalBody.querySelector("[data-auth-switch]");
    if (switchLink) {
      switchLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.showAuthModal(e.target.dataset.authSwitch);
      });
    }
  }

  // Hide modal with animation
  hideAuthModal() {
    const modal = document.getElementById("auth-modal");
    const modalContent = document.getElementById("auth-modal-content");
    if (modal && modalContent) {
      modalContent.classList.add("opacity-0", "scale-95");
      setTimeout(() => {
        modal.classList.add("d-none");
        modal.style.display = "none";
      }, 300);
    }
  }

  // Handle login form submission
  async handleLogin(form) {
    const email = form.email.value.trim();
    const password = form.password.value;
    const submitBtn = form.querySelector('button[type="submit"]');

    // Basic validation
    if (!Utils.isValidEmail(email) || password.length < 6) {
      window.app.showToast("Please enter a valid email and password.", "error");
      return;
    }

    // Loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin me-2"></i>Signing in...';

    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        window.app.showToast("Invalid response from server", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Sign In";
        return;
      }

      // Reset loading state
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Sign In";

      if (!res.ok) {
        const message = data?.message || "Login failed";
        window.app.showToast(message, "error");
        return;
      }

      // Save user and update UI
      this.setCurrentUser(data);
      this.hideAuthModal();
      window.app.showToast(`Welcome back, ${data.name}!`, "success");

      // Trigger UI updates (navbar, name, etc.)
      window.app.handleAuthStateChange({ isAuthenticated: true, user: data });

      // Navigate to dashboard
      window.app.navigateToSection("dashboard");
    } catch (err) {
      console.error("Login error:", err);
      window.app.showToast("Server error during login", "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Sign In";
    }
  }

  // Handle register form submission
  async handleRegister(form) {
    // NEW
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;

    try {
      const response = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) throw new Error("Registration failed");

      const result = await response.json();
      window.app.showToast(
        "Registration successful! Please log in.",
        "success"
      );
      this.showAuthModal("login");
    } catch (err) {
      window.app.showToast("Error registering user. Try again.", "error");
    }
  }

  // Save user in memory and localStorage
  setCurrentUser(user) {
    this.currentUser = user;
    localStorage.setItem("isl_auth_token", JSON.stringify(user));
    document.dispatchEvent(
      new CustomEvent("authStateChanged", {
        detail: { isAuthenticated: !!user, user },
      })
    );
  }

  // Clear user session and UI on logout
  // Clear user session and UI on logout
  logout() {
    // First, get the current user's ID before we clear it
    const userId = this.currentUser ? this.currentUser.id : null;

    this.currentUser = null;

    // Remove the main authentication token
    localStorage.removeItem("isl_auth_token");

    // Remove the lesson-specific data
    localStorage.removeItem("completedLessons");

    // Dispatch event and update UI
    document.dispatchEvent(
      new CustomEvent("authStateChanged", {
        detail: { isAuthenticated: false, user: null },
      })
    );
    window.app.showToast("You have been logged out.", "info");
    window.app.navigateToSection("welcome");
  }

  // Restore session on page reload
  restoreSession() {
    try {
      const user = JSON.parse(localStorage.getItem("isl_auth_token"));
      if (user) this.setCurrentUser(user);
    } catch {
      this.currentUser = null;
    }
  }

  // --- UI Templates ---

  // Returns login form HTML
  getLoginForm() {
    return `
      <h2 class="h4 fw-bold text-center text-dark mb-2">Welcome Back!</h2>
      <p class="text-center text-muted mb-4">Sign in to continue your journey.</p>
      <form id="login-form" class="vstack gap-3">
        <div><input type="email" name="email" class="form-control" placeholder="Email Address" required></div>
        <div><input type="password" name="password" class="form-control" placeholder="Password" required></div>
        <button type="submit" class="btn btn-coral w-100 fw-semibold">Sign In</button>
        <div class="text-center small text-muted pt-2">
          Don’t have an account?
          <a href="#" data-auth-switch="register" class="text-coral text-decoration-underline">Create one</a>
        </div>
      </form>
    `;
  }

  // Returns register form HTML
  getRegisterForm() {
    return `
      <h2 class="h4 fw-bold text-center text-dark mb-2">Create Account</h2>
      <p class="text-center text-muted mb-4">Start learning ISL for free today.</p>
      <form id="register-form" class="vstack gap-3">
        <div><input type="text" name="name" class="form-control" placeholder="Full Name" required></div>
        <div><input type="email" name="email" class="form-control" placeholder="Email Address" required></div>
        <div><input type="password" name="password" class="form-control" placeholder="Password (min. 8 characters)" required minlength="8  "></div>
        <button type="submit" class="btn btn-coral w-100 fw-semibold">Create Account</button>
        <div class="text-center small text-muted pt-2">
          Already have an account?
          <a href="#" data-auth-switch="login" class="text-coral text-decoration-underline">Sign In</a>
        </div>
      </form>
    `;
  }

  // --- Static Methods: Accessible globally ---

  // Get current user (used by other modules)
  static getCurrentUser() {
    // 1) Prefer in-memory (fast when initialized)
    const inMemory = window.app?.modules?.auth?.currentUser;
    if (inMemory) return inMemory;

    // 2) Fall back to localStorage (works before init callback fires)
    try {
      const cached = JSON.parse(localStorage.getItem("isl_auth_token"));
      return cached || null;
    } catch {
      return null;
    }
  }

  static isAuthenticated() {
    return !!AuthManager.getCurrentUser();
  }

  // Get specific data for the current user from localStorage
  static getUserData(key) {
    const user = AuthManager.getCurrentUser();
    if (!user) return null;
    try {
      const data = JSON.parse(
        localStorage.getItem(`isl_user_${user.id}`) || "{}"
      );
      return data[key] || null;
    } catch {
      return null;
    }
  }

  // Save specific data to current user in localStorage
  static setUserData(key, value) {
    const user = AuthManager.getCurrentUser();
    if (!user) return false;
    try {
      const data = JSON.parse(
        localStorage.getItem(`isl_user_${user.id}`) || "{}"
      );
      data[key] = value;
      localStorage.setItem(`isl_user_${user.id}`, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  // Log a user activity (used for tracking history, badges, etc.)
  static updateUserActivity(action, data = {}) {
    const user = AuthManager.getCurrentUser();
    if (!user) return;

    const activity = {
      id: Utils.generateId(),
      action,
      data,
      timestamp: new Date().toISOString(),
      userId: user.id,
    };

    const activities = AuthManager.getUserData("recent_activities") || [];
    activities.unshift(activity); // Add newest first
    if (activities.length > 10) activities.pop(); // Keep only latest 10
    AuthManager.setUserData("recent_activities", activities);
  }

  static getCompletedLessons() {
    try {
      const lessons =
        JSON.parse(localStorage.getItem("completedLessons")) || [];
      return lessons;
    } catch (e) {
      console.error("Failed to load completed lessons:", e);
      return [];
    }
  }

  static saveCompletedLesson(lessonId) {
    try {
      const lessons = AuthManager.getCompletedLessons();
      if (!lessons.includes(lessonId)) {
        lessons.push(lessonId);
        localStorage.setItem("completedLessons", JSON.stringify(lessons));
      }
    } catch (e) {
      console.error("Failed to save lesson:", e);
    }
  }
}
