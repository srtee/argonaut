// Notifications module - status/error messages

let error;
let status;

export function initNotificationsDOM() {
    error = document.getElementById('error');
    status = document.getElementById('status');
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show error message
 */
export function showError(message) {
    error.textContent = message;
    error.classList.add('error--visible');
    setTimeout(() => {
        error.classList.remove('error--visible');
    }, 5000);
}

/**
 * Show status message
 */
export function showStatus(message) {
    status.textContent = message;
    status.classList.add('status--visible');
}

/**
 * Hide status message
 */
export function hideStatus() {
    status.classList.remove('status--visible');
}

/**
 * Hide error message
 */
export function hideError() {
    error.classList.remove('error--visible');
}
