// This class is defined globally, making its static methods available to all other scripts.
class Utils {
  /* Format duration from minutes into "1h 30m" or "45m" */
  static formatDuration(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 0;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }

  /* Format a date string into "Today", "Yesterday", or "N days ago" */
  static formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString(); // fallback to localized format
  }

  /* Formats a date string into a clear, readable format like "Aug 19, 2025". */
  static formatFullDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const options = { year: "numeric", month: "short", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  }

  /* Debounce a function (limit how often it's triggered) */
  static debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /* Generate a unique identifier (base36) */
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  /* Validate email with regex pattern */
  static isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /* Escape user input to prevent XSS in innerHTML */
  static escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
}

// Make Utils globally accessible
window.Utils = Utils;
