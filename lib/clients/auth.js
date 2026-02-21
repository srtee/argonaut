/**
 * Auth Client - GitHub OAuth session management
 */

import { jsonRequest } from './httpClient.js';
import { WORKER_BASE_URL } from '../state.js';

/**
 * Get the session ID from localStorage
 * @returns {string|null} - The session ID or null
 */
export function getSessionId() {
    return localStorage.getItem('github_session_id');
}

/**
 * Set the session ID in localStorage
 * @param {string} sessionId - The session ID to store
 */
export function setSessionId(sessionId) {
    localStorage.setItem('github_session_id', sessionId);
}

/**
 * Clear the session ID from localStorage
 */
export function clearSessionId() {
    localStorage.removeItem('github_session_id');
}

/**
 * Get authorization headers with session token
 * @returns {object} - Headers object with Authorization header if session exists
 */
function getAuthHeaders() {
    const headers = {};
    const sessionId = getSessionId();
    if (sessionId) {
        headers['Authorization'] = `Bearer ${sessionId}`;
    }
    return headers;
}

/**
 * Check if user is authenticated
 * @returns {Promise<{authenticated: boolean, user?: object}>} - Session data
 */
export async function checkSession() {
    try {
        const response = await fetch(`${WORKER_BASE_URL}/session`, {
            headers: getAuthHeaders(),
            credentials: 'include',
        });

        if (!response.ok) {
            return { authenticated: false };
        }

        const data = await response.json();
        return data;
    } catch (err) {
        console.error('[AuthClient] Error checking session:', err);
        return { authenticated: false };
    }
}

/**
 * Initiate GitHub OAuth login flow
 * Redirects to the worker login endpoint
 */
export async function initiateLogin() {
    window.location.href = `${WORKER_BASE_URL}/login`;
}

/**
 * Logout from GitHub
 * @returns {Promise<void>}
 */
export async function logout() {
    const sessionId = getSessionId();

    try {
        await fetch(`${WORKER_BASE_URL}/logout`, {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'include',
        });
    } catch (err) {
        console.error('[AuthClient] Error logging out:', err);
    }

    clearSessionId();
    localStorage.removeItem('github_selected_gist');
}
