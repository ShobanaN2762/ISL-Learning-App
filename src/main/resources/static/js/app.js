// Ensure DOM is fully loaded before initializing the app
document.addEventListener("DOMContentLoaded", () => {
  // Main App Controller Class
  class App {
    constructor() {
      // DOM element selectors (this is all correct)
      this.mainContent = document.getElementById("main-content");
      this.navbarLinks = document.querySelectorAll("#main-navbar .nav-link");
      this.authModal = document.getElementById("auth-modal");
      this.authModalClose = document.getElementById("auth-modal-close");
      this.authModalBody = document.getElementById("auth-modal-body");
      this.logoutButtons = document.querySelectorAll("#logout-btn");
      this.loadingScreen = document.getElementById("loading-screen");

      this.currentSection = "dashboard";
      this.modules = {};
    }

    // Main initializer
    init() {
      console.log("App initializing...");
      this.setupEventListeners();
      this.initializeModules();
    }

    // Register all app modules
    initializeModules() {
      // Instantiate all managers.
      this.modules.auth = new AuthManager();
      this.modules.sharedAIManager = new SharedAIManager();
      this.modules.dashboard = new DashboardManager();
      this.modules.learning = new LearningManager();
      this.modules.translator = new TranslatorManager();
      this.modules.profile = new ProfileManager();

      // Make them globally accessible
      Object.keys(this.modules).forEach((key) => {
        window[key] = this.modules[key];
      });

      // This uses your custom logic and the corrected arrow function.
      this.modules.auth.init(async (user) => {
        if (user) {
          this.handleAuthStateChange({ isAuthenticated: true, user });
          this.renderNavbar();

          // Load the heavy AI modules
          if (this.modules.sharedAIManager?.init) {
            await this.modules.sharedAIManager.init();
          }
          const otherModules = Object.values(this.modules).filter(
            (m) => m !== this.modules.auth && m !== this.modules.sharedAIManager
          );
          await Promise.all(
            otherModules.map((module) => module.init && module.init())
          );

          this.navigateToSection("dashboard");
        } else {
          this.handleAuthStateChange({ isAuthenticated: false, user: null });
          this.renderNavbar();
          this.navigateToSection("welcome");
        }

        this.hideLoadingScreen();
      });
    }

    // Renders the main navigation bar based on the current login state.
    renderNavbar() {
      const user = AuthManager.getCurrentUser();
      const navbarMenu = document.getElementById("navbarMenu");

      if (!navbarMenu) return;

      if (user) {
        // --- LOGGED-IN STATE ---
        navbarMenu.innerHTML = `
          <ul class="navbar-nav mx-auto mb-2 mb-lg-0 gap-lg-3">
            <li class.="nav-item">
              <a href="#" class="nav-link text-light" data-section="dashboard">Dashboard</a>
            </li>
            <li class="nav-item">
              <a href="#" class="nav-link text-light" data-section="learning">Learn</a>
            </li>
            <li class="nav-item">
              <a href="#" class="nav-link text-light" data-section="translator">Translate</a>
            </li>
            <li class="nav-item">
              <a href="#" class="nav-link text-light" data-section="profile">Profile</a>
            </li>
          </ul>
          <div class="d-flex align-items-center gap-3">
            <span class="navbar-text text-light small d-none d-lg-block">Welcome, ${
              user.name || "User"
            }</span>
            <button id="logout-btn" class="btn btn-coral btn-sm">Logout</button>
          </div>
        `;
      } else {
        // --- LOGGED-OUT STATE ---
        // This will be hidden on the welcome page, but ready for other potential public pages
        navbarMenu.innerHTML = ``;
      }
      this.updateNavigationUI(); // Re-apply active styles to links
    }

    // Event delegation for clicks, Escape key, and custom auth events
    setupEventListeners() {
      document.body.addEventListener("click", (e) => {
        const target = e.target;

        // Handle main navigation links
        const navSection = target.closest("[data-section]");
        if (navSection) {
          e.preventDefault();
          this.navigateToSection(navSection.dataset.section);
          this.closeMobileNav(); // Close nav menu on mobile
        }

        // Handle "Get Started" button
        if (
          target.id === "get-started-btn" ||
          target.closest("#get-started-btn") ||
          target.classList.contains("get-started-btn")
        ) {
          e.preventDefault();
          this.modules.auth?.showAuthModal?.("register");
        }

        // Login/Register buttons (both mobile + desktop)
        if (
          target.closest("#login-btn") ||
          target.closest("#mobile-login-btn")
        ) {
          this.modules.auth.showAuthModal("login");
        }
        if (
          target.closest("#register-btn") ||
          target.closest("#mobile-register-btn")
        ) {
          this.modules.auth.showAuthModal("register");
        }

        // Logout buttons
        if (
          target.closest("#logout-btn") ||
          target.closest("#mobile-logout-btn")
        ) {
          this.modules.auth.logout();
        }

        // Mobile nav toggle/close buttons
        if (target.closest("#nav-toggle")) this.openMobileNav();
        if (target.closest("#nav-close")) this.closeMobileNav();

        // Close auth modal
        if (
          target.closest("#auth-modal-close") ||
          (target.id === "auth-modal" && !target.closest("#auth-modal-content"))
        ) {
          this.modules.auth.hideAuthModal();
        }
      });

      // Close modal or nav on Esc key press
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.modules.auth.hideAuthModal();
          this.closeMobileNav();
        }
      });

      // React to login/logout status
      document.addEventListener("authStateChanged", (e) =>
        this.handleAuthStateChange(e.detail)
      );
    }

    //Reacts to login/logout events by re-rendering the navbar.
    handleAuthStateChange({ isAuthenticated, user }) {
      this.renderNavbar();
    }

    // Load section based on hash or user state
    handleInitialNavigation() {
      const hash = window.location.hash.slice(1);
      if (hash && this.isValidSection(hash) && AuthManager.isAuthenticated()) {
        this.navigateToSection(hash, false);
      } else if (AuthManager.isAuthenticated()) {
        this.navigateToSection("dashboard", false);
      } else {
        this.navigateToSection("welcome", false);
      }
    }

    // Navigate to a new section (dashboard, translator, etc.)
    navigateToSection(sectionName, updateHistory = true) {
      if (!this.isValidSection(sectionName)) return;

      if (this.requiresAuth(sectionName) && !AuthManager.isAuthenticated()) {
        this.navigateToSection("welcome");
        return;
      }

      this.currentSection = sectionName;

      // Update browser history
      if (updateHistory) {
        history.pushState(
          { section: sectionName },
          "",
          sectionName === "welcome" ? "/" : `#${sectionName}`
        );
      }

      this.updateSectionVisibility();
      this.updateNavigationUI();
      this.loadSectionContent(sectionName);
    }

    // Show only the current section, hide others
    updateSectionVisibility() {
      document
        .querySelectorAll(".section")
        .forEach((s) => s.classList.remove("active"));

      const activeSection = document.getElementById(
        `${this.currentSection}-section`
      );
      if (activeSection) activeSection.classList.add("active");

      const header = document.getElementById("header");
      if (header) {
        header.classList.toggle("d-none", this.currentSection === "welcome");
      }
    }

    // Highlight the active nav item (mobile + desktop)
    updateNavigationUI() {
      document
        .querySelectorAll(".nav-link, .mobile-nav-link")
        .forEach((link) => {
          const isActive = link.dataset.section === this.currentSection;
          link.classList.toggle("text-light-slate", !isActive);
          link.classList.toggle("text-coral-500", isActive);
          link.classList.toggle("fw-semibold", isActive);
        });
    }

    // Dynamically load section content using appropriate module method
    loadSectionContent(sectionName) {
      if (sectionName === "welcome") {
        this.loadWelcomeContent();
        return;
      }

      const moduleName = sectionName;
      const loaderFunction =
        sectionName === "dashboard"
          ? "loadDashboard"
          : `load${
              moduleName.charAt(0).toUpperCase() + moduleName.slice(1)
            }Content`;

      const module = this.modules[moduleName];
      if (module && typeof module[loaderFunction] === "function") {
        module[loaderFunction]();
      }
    }

    // Allowed navigation sections
    isValidSection(section) {
      return [
        "welcome",
        "dashboard",
        "learning",
        "translator",
        "profile",
      ].includes(section);
    }

    // Prevent access to private sections unless logged in
    requiresAuth(section) {
      return section !== "welcome";
    }

    // Mobile nav toggling
    openMobileNav() {
      const nav = document.getElementById("nav-menu");
      if (nav) nav.style.display = "block";
    }

    closeMobileNav() {
      const nav = document.getElementById("nav-menu");
      if (nav) nav.style.display = "none";
    }

    // Hide splash/loading screen once app is ready
    hideLoadingScreen() {
      const loadingScreen = document.getElementById("loading-screen");
      if (loadingScreen) {
        loadingScreen.classList.add("opacity-0");
        loadingScreen.style.pointerEvents = "none";
        setTimeout(() => {
          loadingScreen.style.display = "none";
          loadingScreen.remove();
        }, 500);
      }
    }

    // Content for the welcome page with call-to-action
    loadWelcomeContent() {
      const welcomeSection = document.getElementById("welcome-section");
      if (!welcomeSection) return;

      const content = `
        <section class="text-center bg-navy-900 py-5 d-flex align-items-center" style="min-height: 100vh;">
          <div class="container">
            <h1 class="display-4 text-white fw-bold">Unlock Communication with</h1>
            <h2 class="display-5 text-white fw-bold">Indian Sign Language</h2>
            <p class="lead mt-4">Your journey to mastering ISL starts here. Interactive lessons, real-time feedback, and a supportive community await.</p>
            <div class="mt-4">
              <button id="get-started-btn" class="btn btn-coral btn-lg get-started-btn text-white">
                Get Started <i class="fa-solid fa-arrow-right ms-2"></i>
              </button>
            </div>
          </div>
        </section>

        <section class="py-5 bg-light" id="features-section">
          <div class="container text-center">
            <h2 class="mb-3 fw-bold display-6 text-dark">
              Why <span class="text-coral">Signify</span>?
            </h2>
            <p class="mb-5 text-dark fs-6">
              Everything you need for a complete Indian Sign Language learning experience.
            </p>
            <div class="row g-4">
              ${[
                [
                  "fa-book-open",
                  "Interactive Lessons",
                  "Step-by-step modules from basics to advanced topics.",
                ],
                [
                  "fa-camera",
                  "Live Feedback",
                  "Use your webcam for real-time sign recognition.",
                ],
                [
                  "fa-language",
                  "AI Translator",
                  "Translate text or speech into ISL signs instantly.",
                ],
                [
                  "fa-chart-line",
                  "Progress Tracking",
                  "Monitor your learning milestones and achievements.",
                ],
              ]
                .map(
                  ([icon, title, desc]) => `
                <div class="col-md-6 col-lg-3">
                  <div class="card h-100 border-0 shadow-sm hover-animate">
                    <div class="card-body">
                      <div class="mb-3 text-coral">
                        <i class="fa-solid ${icon} fa-2x"></i>
                      </div>
                      <h5 class="fw-semibold mb-2">${title}</h5>
                      <p class="text-muted small">${desc}</p>
                    </div>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </section>
      `;

      welcomeSection.innerHTML = content;

      // Fallback listener for Get Started button
      const getStartedBtn = document.getElementById("get-started-btn");
      if (getStartedBtn) {
        getStartedBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.modules.auth?.showAuthModal?.("register");
        });
      }
    }

    // Toast notification system
    showToast(message, type = "info") {
      const toastContainer = document.getElementById("toast-container");
      if (!toastContainer) return;

      const toastId = `toast-${Date.now()}`;
      const bgClass =
        {
          success: "bg-success",
          error: "bg-danger",
          info: "bg-info",
          warning: "bg-warning",
        }[type] || "bg-info";

      const toast = document.createElement("div");
      toast.id = toastId;
      toast.className = `toast align-items-center text-white ${bgClass} border-0`;
      toast.setAttribute("role", "alert");
      toast.innerHTML = `
        <div class="d-flex">
          <div class="toast-body">${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      `;

      toastContainer.appendChild(toast);
      toast.classList.add("show");

      // Auto-remove after 5 seconds
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
      }, 5000);
    }

    /* Tracks user progress by fetching, updating, and saving to the backend. */
    async lessonCompleted(lesson) {
      const user = AuthManager.getCurrentUser();
      if (!user || !lesson) return; // Only track for logged-in users

      try {
        // Call the endpoint and send lessonId
        const response = await fetch(
          `http://localhost:8080/api/progress/complete-lesson/${user.id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lessonId: lesson.id }), // ✅ send lessonId
          }
        );

        if (!response.ok) {
          throw new Error("Server responded with an error.");
        }

        console.log(`Progress logged for lesson: ${lesson.title}`);

        // Also log this as a recent activity for the dashboard.
        AuthManager.updateUserActivity("lesson_completed", {
          lessonTitle: lesson.title,
          lessonId: lesson.id,
        });
      } catch (error) {
        console.error("Failed to log lesson completion:", error);
      }
    }

    async addStudyTime(minutes) {
      const user = AuthManager.getCurrentUser();
      if (!user || !minutes || minutes <= 0) return;

      try {
        const response = await fetch(
          `http://localhost:8080/api/progress/add-study-time/${user.id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // The backend expects a raw integer, so we send it directly
            body: JSON.stringify(minutes),
          }
        );

        if (!response.ok) {
          throw new Error(
            "Server responded with an error while updating study time."
          );
        }

        console.log(`Logged ${minutes} minutes of study time.`);
      } catch (error) {
        console.error("Failed to log study time:", error);
      }
    }

    async updateStudyStreak() {
      const user = AuthManager.getCurrentUser();
      if (!user) return;

      try {
        const response = await fetch(
          `http://localhost:8080/api/progress/update-streak/${user.id}`,
          {
            method: "POST",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Server responded with an error while updating streak."
          );
        }

        console.log("Study streak checked and updated.");
      } catch (error) {
        console.error("Failed to update study streak:", error);
      }
    }

    /* Notifies the backend to check if the user has unlocked any new achievements. */
    async checkAchievements() {
      const user = AuthManager.getCurrentUser();
      if (!user) return;
      try {
        const response = await fetch(
          `http://localhost:8080/api/achievements/check/${user.id}`,
          {
            method: "POST",
          }
        );
        if (!response.ok)
          throw new Error("Server error while checking achievements.");
        console.log("Achievement check triggered successfully.");
      } catch (error) {
        console.error("Failed to trigger achievement check:", error);
      }
    }
  }

  // Instantiate and initialize the app
  window.app = new App();
  window.app.init();

  // Automatically collapse navbar when a nav item or logout is clicked (for mobile UX)
  document.addEventListener("DOMContentLoaded", () => {
    const app = new App();
    app.init();
    window.app = app;
  });
});
