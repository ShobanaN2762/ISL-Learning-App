/**
 * ISL Learning Platform - Profile Manager
 * Handles user profile management, and settings.
 */

class ProfileManager {
  constructor() {
    this.isInitialized = false;
    this.currentUser = null;
    this.isDirty = false;
    this.baseURL = "/api/users";
  }

  init() {
    if (this.isInitialized) return;
    this.setupEventListeners();
    this.isInitialized = true;
  }

  setupEventListeners() {
    document.addEventListener("click", (e) => {
      const profileContainer = document.getElementById("profile-content");
      if (!profileContainer || !profileContainer.contains(e.target)) return;

      const handlers = {
        "edit-profile-btn": () => this.enableProfileEditing(),
        "save-profile-btn": () => this.saveProfile(),
        "cancel-profile-btn": () => this.cancelProfileEditing(),
        "change-password-btn": () => this.showPasswordChangeForm(),
        "save-password-btn": () => this.savePassword(),
        "cancel-password-btn": () => this.hidePasswordChangeForm(),
        // "export-data-btn": () => this.exportUserData(),
        "delete-account-btn": () => this.confirmDeleteAccount(),
        "confirm-delete-btn": () => this.deleteAccount(),
      };

      if (handlers[e.target.id]) {
        handlers[e.target.id]();
      }

      if (e.target.classList.contains("setting-toggle")) {
        this.toggleSetting(e.target);
      }
    });

    document.addEventListener("input", (e) => {
      const profileContainer = document.getElementById("profile-content");
      if (!profileContainer || !profileContainer.contains(e.target)) return;

      if (e.target.closest("#profile-form")) {
        this.isDirty = true;
        this.updateSaveButtonState();
      }
    });
  }

  /**
   * Loads and renders the entire profile page content.
   */
  loadProfileContent() {
    const container = document.getElementById("profile-content");
    if (!container) return;

    this.currentUser = AuthManager.getCurrentUser();
    if (!this.currentUser) {
      container.innerHTML = this.renderNotLoggedIn();
      return;
    }

    // --- MODIFIED LOGIC ---
    // This function will now correctly format and display the joinDate.
    container.innerHTML = `
      <div class="container my-4">
        <div class="card mb-4">
          <div class="card-body d-flex flex-column flex-md-row align-items-center gap-3">
            <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fs-3 fw-bold" style="width: 80px; height: 80px;">
              ${Utils.escapeHTML(this.currentUser.name.charAt(0))}
            </div>
            <div class="text-center text-md-start flex-grow-1">
              <h4 class="mb-0">${Utils.escapeHTML(this.currentUser.name)}</h4>
              <p class="text-muted mb-1">${Utils.escapeHTML(
                this.currentUser.email
              )}</p>
              <small class="text-muted"><i class="fas fa-calendar-alt me-1"></i>Joined ${Utils.formatFullDate(
                this.currentUser.joinDate
              )}</small>
            </div>
            <div class="ms-auto">
              <button id="edit-profile-btn" class="btn btn-warning">
                <i class="fas fa-edit me-2"></i>Edit Profile
              </button>
            </div>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card-body">${this.renderProfileForm()}</div>
        </div>

        <div class="card mb-4">
          <div class="card-body">${this.renderSecuritySection()}</div>
        </div>

       

        <div class="card mb-4">
          <div class="card-body">${this.renderDataManagementSection()}</div>
        </div>

        <div id="delete-modal" class="modal fade" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content text-center p-4">
              <div class="modal-body">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <h5 class="modal-title mb-2">Are you sure?</h5>
                <p class="mb-3">This action cannot be undone. All your progress and data will be permanently deleted.</p>
                <div class="d-flex justify-content-center gap-2">
                  <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                  <button id="confirm-delete-btn" class="btn btn-danger">Delete Account</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    // After rendering, load and apply the user's saved settings.
    // this.loadUserSettings();
  }

  /**
   * Renders a message for users who are not logged in.
   * @returns {string} HTML for the "not logged in" view.
   */
  renderNotLoggedIn() {
    return `
      <div class="text-center p-5 bg-white rounded shadow">
        <i class="fa-solid fa-user-lock fa-3x text-secondary mb-3"></i>
        <h3>Please Sign In</h3>
        <p class="text-muted">You need to be signed in to view your profile.</p>
        <button class="btn btn-primary" onclick="window.app.modules.auth.showAuthModal('login')">Sign In</button>
      </div>`;
  }

  /**
   * Renders the profile information form.
   * @returns {string} HTML for the profile form.
   */
  renderProfileForm() {
    const bio = this.currentUser.bio || "";
    return `
      <h5 class="mb-3">Profile Information</h5>
      <form id="profile-form">
        <div class="row mb-3">
          <div class="col-md-6">
            <label for="profile-name" class="form-label">Full Name</label>
            <input type="text" class="form-control" id="profile-name" value="${Utils.escapeHTML(
              this.currentUser.name
            )}" disabled>
          </div>
          <div class="col-md-6">
            <label for="profile-email" class="form-label">Email Address</label>
            <input type="email" class="form-control" id="profile-email" value="${Utils.escapeHTML(
              this.currentUser.email
            )}" readonly disabled>
          </div>
        </div>
        <div class="mb-3">
          <label for="profile-bio" class="form-label">Bio</label>
          <textarea class="form-control" id="profile-bio" rows="3" disabled>${Utils.escapeHTML(
            bio
          )}</textarea>
        </div>
        <div class="d-flex gap-2 form-actions d-none" id="profile-form-actions">
          <button type="button" id="save-profile-btn" class="btn btn-success" disabled>Save Changes</button>
          <button type="button" id="cancel-profile-btn" class="btn btn-light">Cancel</button>
        </div>
      </form>`;
  }

  /* Renders the account security section, including password change. */
  renderSecuritySection() {
    let lastChangedText = "Never";
    if (this.currentUser && this.currentUser.passwordLastUpdated) {
      // Use the new, more precise date formatting function
      lastChangedText = `On ${Utils.formatFullDate(
        this.currentUser.passwordLastUpdated
      )}`;
    }

    return `
      <h5 class="mb-3">Account Security</h5>
      <div class="d-flex justify-content-between align-items-center p-3 bg-light border rounded mb-2">
        <div>
          <strong>Password</strong>
          <p class="mb-0 text-muted small">Last changed: ${lastChangedText}</p>
        </div>
        <button id="change-password-btn" class="btn btn-outline-danger btn-sm">Change Password</button>
      </div>
      <div id="password-change-form" class="d-none mt-3">
        <form class="row g-2">
          <div class="col-md-6">
            <label for="new-password" class="form-label">New Password</label>
            <input type="password" id="new-password" class="form-control" required>
          </div>
          <div class="col-12 d-flex gap-2">
            <button type="button" id="save-password-btn" class="btn btn-danger">Save Password</button>
            <button type="button" id="cancel-password-btn" class="btn btn-secondary">Cancel</button>
          </div>
        </form>
      </div>`;
  }

  /**
   * Renders the data management section for export and deletion.
   * @returns {string} HTML for the data management section.
   */
  renderDataManagementSection() {
    return `
      <h5 class="mb-3">Data Management</h5>
      <div class="d-flex justify-content-between align-items-center p-3 bg-danger bg-opacity-10 border border-danger rounded">
        <div>
          <strong class="text-danger">Delete Account</strong>
          <p class="mb-0 text-danger small">Permanently delete your account and all data.</p>
        </div>
        <button id="delete-account-btn" class="btn btn-danger btn-sm">Delete</button>
      </div>`;
  }

  /**
   * Enables the form fields for editing profile information.
   */
  enableProfileEditing() {
    document.getElementById("profile-name").disabled = false;
    document.getElementById("profile-bio").disabled = false;
    document.getElementById("profile-form-actions").classList.remove("d-none");
    document.getElementById("edit-profile-btn").classList.add("d-none");
    this.isDirty = false; // Reset dirty state until user types
  }

  /**
   * Cancels the editing process and reverts any changes by reloading the content.
   */
  cancelProfileEditing() {
    this.loadProfileContent(); // The simplest way to cancel is to re-render everything.
  }

  /* Saves the updated profile information. */
  async saveProfile() {
    const saveBtn = document.getElementById("save-profile-btn");
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';

    const name = document.getElementById("profile-name").value.trim();
    const bio = document.getElementById("profile-bio").value.trim();

    if (!name) {
      window.app.showToast("Name cannot be empty.", "error");
      this.cancelProfileEditing();
      return;
    }

    // Prepare the data payload for the backend.
    const userData = {
      name: name,
      bio: bio,
      email: this.currentUser.email,
      password: null, // Send null so the backend knows not to update the password.
    };

    try {
      // Use a direct fetch call, NOT window.api
      const response = await fetch(`${this.baseURL}/${this.currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to save profile");
      }

      const updatedUserFromServer = await response.json();

      // Use the correct instance method from AuthManager
      window.app.modules.auth.setCurrentUser(updatedUserFromServer);

      // This calls the function from your auth.js to log the activity.
      if (typeof AuthManager.updateUserActivity === "function") {
        AuthManager.updateUserActivity("profile_updated");
      }

      window.app.showToast("Profile updated successfully!", "success");
      this.loadProfileContent();
      this.cancelProfileEditing();
    } catch (error) {
      window.app.showToast(`Error saving profile: ${error.message}`, "error");
      saveBtn.disabled = false;
      saveBtn.innerHTML = "Save Changes";
    }
  }

  /**
   * Enables or disables the 'Save Changes' button based on the isDirty flag.
   */
  updateSaveButtonState() {
    const saveBtn = document.getElementById("save-profile-btn");
    if (saveBtn) saveBtn.disabled = !this.isDirty;
  }

  /**
   * Shows the form for changing the password.
   */
  showPasswordChangeForm() {
    document.getElementById("password-change-form").classList.remove("d-none");
    document.getElementById("change-password-btn").classList.add("d-none");
  }

  /**
   * Hides the form for changing the password.
   */
  hidePasswordChangeForm() {
    document.getElementById("password-change-form").classList.add("d-none");
    document.getElementById("change-password-btn").classList.remove("d-none");
  }

  /* Simulates saving a new password. */
  async savePassword() {
    const newPassword = document.getElementById("new-password").value;
    const saveBtn = document.getElementById("save-password-btn");
    saveBtn.disabled = true;

    // The data payload for the backend updateUser endpoint.
    const userData = {
      name: this.currentUser.name,
      email: this.currentUser.email,
      password: newPassword,
      bio: this.currentUser.bio || "",
    };

    try {
      // Use a direct fetch call to the backend PUT endpoint.
      const response = await fetch(`${this.baseURL}/${this.currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      // If the response is not OK, the backend has rejected the password.
      if (!response.ok) {
        // Get the specific error message from the backend (e.g., "Password must include a number").
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update password");
      }

      const updatedUserFromServer = await response.json();

      // Update the user's session with the new data from the server.
      window.app.modules.auth.setCurrentUser(updatedUserFromServer);

      // This logs that the password was changed.
      if (typeof AuthManager.updateUserActivity === "function") {
        AuthManager.updateUserActivity("password_updated");
      }

      window.app.showToast("Password updated successfully!", "success");
      this.hidePasswordChangeForm();
      document.getElementById("new-password").value = "";
    } catch (error) {
      // The catch block will now receive and display the specific error from your Java service.
      window.app.showToast(error.message, "error");
    } finally {
      // Re-enable the save button whether the call succeeded or failed.
      saveBtn.disabled = false;
    }
  }

  /* Retrieves user settings from storage, providing defaults if none exist. */
  getUserSettings() {
    // Return saved settings or a default object.
    return (
      AuthManager.getUserData("user_settings") || {
        darkMode: document.documentElement.classList.contains("dark"),
        emailNotifications: true,
      }
    );
  }

  /* Shows the Bootstrap modal to confirm account deletion. */
  confirmDeleteAccount() {
    const modal = new bootstrap.Modal(document.getElementById("delete-modal"));
    modal.show();
  }

  /* Deletes the user account after confirmation. */
  async deleteAccount() {
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("delete-modal")
    );
    if (modal) modal.hide();

    try {
      // Use a direct fetch call
      const response = await fetch(`${this.baseURL}/${this.currentUser.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to delete account");
      }

      window.app.showToast("Account deleted successfully.", "success");
      // Log the user out after a short delay so they can see the message.
      setTimeout(() => window.app.modules.auth.logout(), 1500);
    } catch (error) {
      window.app.showToast(`Error deleting account: ${error.message}`, "error");
    }
  }
}
