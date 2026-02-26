// Notifications module - status/error messages

import { get } from '../dom.js';

let error;
let status;

export function initNotificationsDOM() {
    error = get('error');
    status = get('status');
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
    error.classList.remove('error--fading');
    error.classList.add('error--visible');

    // Auto-hide after 8 seconds with fade-out
    setTimeout(() => {
        error.classList.add('error--fading');
        error.classList.remove('error--visible');
        // Remove fading class after animation completes (500ms)
        setTimeout(() => {
            error.classList.remove('error--fading');
        }, 500);
    }, 8000);
}

/**
 * Show status message
 */
export function showStatus(message) {
    status.textContent = message;
    status.classList.remove('status--fading');
    status.classList.add('status--visible');

    // Auto-hide after 8 seconds with fade-out
    setTimeout(() => {
        status.classList.add('status--fading');
        status.classList.remove('status--visible');
        // Remove fading class after animation completes (500ms)
        setTimeout(() => {
            status.classList.remove('status--fading');
        }, 500);
    }, 8000);
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
    error.classList.remove('error--fading');
}
