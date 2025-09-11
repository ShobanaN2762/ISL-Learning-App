class DashboardManager {
  constructor() {
    this.isInitialized = false;
    // --- NEW: Base URL for the backend API ---
    this.baseURL = "http://localhost:8080/api";
  }

  // Initializes the module (no heavy logic here)
  init() {
    if (this.isInitialized) return;

    // Listen for the global event dispatched from learning.js
    // When progress is updated, reload the entire dashboard to get fresh stats.
    window.addEventListener(
      "userProgressUpdated",
      this.loadDashboard.bind(this)
    );

    this.isInitialized = true;
  }

  // Loads content, renders stats and chart.
  async loadDashboard() {
    const container = document.getElementById("dashboard-content");
    if (!container) return;

    const user = AuthManager.getCurrentUser();
    if (!user) {
      container.innerHTML = this.renderNotLoggedIn();
      return;
    }

    // Show a loading state while fetching data
    container.innerHTML = `<div class="text-center p-5"><i class="fas fa-spinner fa-spin fa-2x"></i><p class="mt-2">Loading your dashboard...</p></div>`;

    try {
      // Fetch live progress stats from the backend API
      const stats = await this.calculateStats(user.id);

      // This part remains the same as your original file, now populated with live data
      container.innerHTML = `
        <div class="d-grid gap-4">
          <div class="rounded-4 shadow-lg p-4 p-md-5 text-white"
               style="background:linear-gradient(135deg,#172a45 0%,#304a6d 100%);">
            <div class="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3">
              <div>
                <h1 class="h3 fw-bold mb-1">Welcome back, ${Utils.escapeHTML(
                  user.name
                )}!</h1>
                <p class="mb-0 text-light opacity-75">Let’s continue your ISL journey.</p>
              </div>
              <i class="fa-solid fa-hands-asl-interpreting text-coral opacity-50 fs-1"></i>
            </div>
          </div>

          <div class="row justify-content-center g-4">
            ${this.renderStatsCards(stats)}
          </div>
          
          <div class="row g-4">
            <div class="col-12 col-lg-8">
              <div class="card border shadow-sm h-100">
                <div class="card-body">
                  <h2 class="h5 fw-semibold mb-3 text-navy">Recent Activity</h2>
                  ${this.renderRecentActivity()}
                </div>
              </div>
            </div>
            <div class="col-12 col-lg-4 d-grid gap-4">
              <div class="card border shadow-sm">
                <div class="card-body">
                  <h3 class="h6 fw-semibold mb-3 text-navy">Quick Actions</h3>
                  ${this.renderQuickActions()}
                </div>
              </div>
              <div class="card border shadow-sm">
                <div class="card-body">
                  <h3 class="h6 fw-semibold mb-3 text-navy">Achievements</h3>
                   ${await this.renderAchievements()}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
      container.innerHTML = `<div class="alert alert-danger">Could not load your progress. Please try again later.</div>`;
    }
  }

  renderNotLoggedIn() {
    return `
      <div class="text-center bg-white rounded-4 shadow-sm p-5">
        <i class="fa-solid fa-grip text-secondary opacity-25 fs-1 mb-3"></i>
        <h2 class="h4 fw-bold text-navy">Please Sign In</h2>
        <p class="text-muted mb-4">You need to sign in to view your dashboard.</p>
        <button class="btn btn-coral fw-semibold"
                onclick="window.app.modules.auth.showAuthModal('login')">
          Sign In
        </button>
      </div>
    `;
  }

  /**
   * Calculates the total number of lessons available across all modules.
   * @returns {number} The total count of lessons.
   */
  _calculateTotalLessons() {
    if (!window.learningModules) {
      console.warn("Learning modules data not found.");
      return 0;
    }
    // Use the reduce method to sum up the number of lessons in each module
    return window.learningModules.reduce(
      (total, module) => total + module.lessons.length,
      0
    );
  }

  /* Accepts stats object to build cards dynamically. This function receives the live stats. */
  renderStatsCards(stats) {
    // 1. Get the total number of lessons from our new helper function.
    const totalLessons = this._calculateTotalLessons();

    const statItems = [
      {
        label: "Lessons Completed",
        // 2. Format the value to show "completed / total".
        value: `${stats.lessonsCompleted} / ${totalLessons}`,
        icon: "fa-book-open",
        color: "bg-primary-subtle text-primary",
      },
      {
        label: "Study Streak",
        value: `${stats.studyStreak} Days`,
        icon: "fa-fire",
        color: "bg-warning-subtle text-warning",
      },
      {
        label: "Time Studied",
        value: `${stats.totalStudyTime}h`,
        icon: "fa-clock",
        color: "bg-info-subtle text-info",
      },
    ];

    // The rest of the function remains the same
    return statItems
      .map(
        (item) => `
        <div class="col-auto">
          <div class="card stat-card hover-animate shadow-sm p-3 d-flex align-items-center" style="min-width: 350px;">
            <div class="d-flex align-items-center gap-3">
              <div class="rounded-circle d-flex align-items-center justify-content-center ${item.color}" style="width: 48px; height: 48px;">
                <i class="fas ${item.icon} fs-5"></i>
              </div>
              <div>
                <div class="text-muted small fw-medium">${item.label}</div>
                <div class="h5 fw-bold text-navy mb-0">${item.value}</div>
              </div>
            </div>
          </div>
        </div>
      `
      )
      .join("");
  }

  // Recent Activity
  renderRecentActivity() {
    const activities = AuthManager.getUserData("recent_activities") || [];

    if (activities.length === 0) {
      return `<p class="text-center text-muted py-4 mb-0">No recent activity.</p>`;
    }

    return `
      <div class="vstack gap-3">
        ${activities
          .slice(0, 5)
          .map(
            (activity) => `
          <div class="d-flex align-items-start gap-3 p-3 rounded bg-light border shadow-sm">
            <div class="rounded-circle bg-coral bg-opacity-10 text-coral d-flex align-items-center justify-content-center" style="width:2.5rem;height:2.5rem;">
              <i class="fas ${this.getActivityIcon(activity.action)}"></i>
            </div>
            <div>
              <p class="fw-medium mb-0 text-navy">${this.getActivityTitle(
                activity
              )}</p>
              <p class="small text-muted mb-0">${Utils.formatDate(
                activity.timestamp
              )}</p>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  // Quick actions
  renderQuickActions() {
    return `
      <div class="vstack gap-2">
        <button type="button" class="btn btn-light border d-flex align-items-center justify-content-start gap-2"
                onclick="window.app.navigateToSection('learning')">
          <i class="fa-solid fa-book-open-reader text-coral"></i> Continue Learning
        </button>
        <button type="button" class="btn btn-light border d-flex align-items-center justify-content-start gap-2"
                onclick="window.app.navigateToSection('translator')">
          <i class="fa-solid fa-language text-coral"></i> Open Translator
        </button>
        <button type="button" class="btn btn-light border d-flex align-items-center justify-content-start gap-2"
                onclick="window.app.navigateToSection('profile')">
          <i class="fa-solid fa-user text-coral"></i> View Profile
        </button>
      </div>
    `;
  }

  // Achivements
  async renderAchievements() {
    const user = AuthManager.getCurrentUser();
    if (!user) return '<p class="text-muted">Log in to see achievements.</p>';

    try {
      const response = await fetch(
        `http://localhost:8080/api/achievements/${user.id}`
      );
      if (!response.ok) throw new Error("Could not load achievements.");

      const achievements = await response.json();

      if (achievements.length === 0) {
        return `<p class="text-center text-muted py-3 mb-0">No achievements unlocked yet. Keep learning!</p>`;
      }

      return `
            <div class="vstack gap-3">
                ${achievements
                  .map(
                    (ach) => `
                    <div class="d-flex align-items-center gap-3" title="${Utils.escapeHTML(
                      ach.description
                    )}">
                        <div class="rounded-circle bg-warning bg-opacity-25 text-warning d-flex align-items-center justify-content-center" style="width:2.5rem;height:2.5rem;">
                            <i class="fas ${Utils.escapeHTML(ach.icon)}"></i>
                        </div>
                        <p class="fw-medium mb-0 text-navy">${Utils.escapeHTML(
                          ach.name
                        )}</p>
                    </div>
                `
                  )
                  .join("")}
            </div>
        `;
    } catch (error) {
      console.error("Failed to render achievements:", error);
      return `<p class="text-danger small">Error loading achievements.</p>`;
    }
  }

  // Calculation related to cards
  async calculateStats(userId) {
    try {
      const response = await fetch(`${this.baseURL}/progress/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch progress: ${response.statusText}`);
      }

      const progress = await response.json();

      return {
        lessonsCompleted: progress.lessonsCompleted || 0,
        studyStreak: progress.studyStreak || 0,
        // Convert minutes from backend to hours for display
        totalStudyTime: progress.totalStudyTime
          ? (progress.totalStudyTime / 60).toFixed(1)
          : 0,
      };
    } catch (error) {
      console.error("Error in calculateStats:", error);
      // Return default stats in case of an error
      return { lessonsCompleted: 0, studyStreak: 0, totalStudyTime: 0 };
    }
  }

  getActivityIcon(action) {
    return "fa-check";
  }

  getActivityTitle(activity) {
    // Check if the action is 'lesson_completed'
    if (
      activity.action === "lesson_completed" &&
      activity.data &&
      activity.data.lessonTitle
    ) {
      // Use the lesson title that we saved in the activity data
      return `Lesson "${Utils.escapeHTML(
        activity.data.lessonTitle
      )}" completed.`;
    }

    // Fallback for any other type of activity (e.g., "profile_updated")
    return activity.action.replace("_", " ");
  }
}
