// GitHub OAuth session management

import { state } from './state.js';
import { WORKER_BASE_URL } from './state.js';

// DOM Elements - declared as let, initialized in initDOM()
let githubSection;
let githubNotLoggedIn;
let githubLoggedIn;
let githubConnectBtn;
let githubLogoutBtn;
let githubUserAvatar;
let githubUserName;

// For visibility toggles in Load and Save sections
let gistNotConnected;
let gistConnectedContent;
let saveGistNotConnected;
let saveGistConnectedContent;
let loadJsonSection;
let saveJsonSection;
let exportResetSection;
let papersSection;

// Initialize all DOM elements - must be called after DOM is ready
export function initDOM() {
    githubSection = document.getElementById('githubSection');
    githubNotLoggedIn = document.getElementById('githubNotLoggedIn');
    githubLoggedIn = document.getElementById('githubLoggedIn');
    githubConnectBtn = document.getElementById('githubConnectBtn');
    githubLogoutBtn = document.getElementById('githubLogoutBtn');
    githubUserAvatar = document.getElementById('githubUserAvatar');
    githubUserName = document.getElementById('githubUserName');

    gistNotConnected = document.getElementById('gistNotConnected');
    gistConnectedContent = document.getElementById('gistConnectedContent');
    saveGistNotConnected = document.getElementById('saveGistNotConnected');
    saveGistConnectedContent = document.getElementById('saveGistConnectedContent');
    loadJsonSection = document.getElementById('loadJsonSection');
    saveJsonSection = document.getElementById('saveJsonSection');
    exportResetSection = document.getElementById('exportResetSection');
    papersSection = document.getElementById('papersSection');

    console.log('[Auth] DOM elements initialized');
}

/**
 * Get the session ID from localStorage
 */
export function getSessionId() {
    return localStorage.getItem('github_session_id');
}

/**
 * Set the session ID in localStorage
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
 * Check if user is authenticated
 */
export async function checkSession() {
    console.log('[GitHub Auth] Checking session at:', `${WORKER_BASE_URL}/session`);
    const sessionId = getSessionId();
    console.log('[GitHub Auth] Session ID from storage:', sessionId ? sessionId.substring(0, 10) + '...' : 'null');

    try {
        const headers = {};
        if (sessionId) {
            headers['Authorization'] = `Bearer ${sessionId}`;
        }

        const res = await fetch(`${WORKER_BASE_URL}/session`, {
            headers,
            credentials: 'include'
        });
        console.log('[GitHub Auth] Request URL:', res.url);
        console.log('[GitHub Auth] Session response status:', res.status);
        if (!res.ok) {
            console.log('[GitHub Auth] Session response not OK');
            return { authenticated: false };
        }
        const data = await res.json();
        console.log('[GitHub Auth] Session data:', data);
        return data;
    } catch (err) {
        console.error('[GitHub Auth] Error checking session:', err);
        return { authenticated: false };
    }
}

/**
 * Initiate GitHub OAuth login flow
 */
export async function initiateLogin() {
    console.log('[GitHub Auth] Initiating login, redirecting to GitHub OAuth');

    // Save current state before redirect so papers persist after OAuth callback
    const stateToSave = {
        hasPapers: Object.keys(state.papersData).length > 0,
        saveJsonVisible: saveJsonSection?.style.display === 'block',
        exportResetVisible: exportResetSection?.style.display === 'block',
        papersVisible: papersSection?.style.display === 'block'
    };
    sessionStorage.setItem('argonaut_oauth_state', JSON.stringify(stateToSave));

    window.location.href = `${WORKER_BASE_URL}/login`;
}

/**
 * Logout from GitHub
 */
export async function logout() {
    console.log('[GitHub Auth] Initiating logout');
    const sessionId = getSessionId();

    try {
        const headers = {};
        if (sessionId) {
            headers['Authorization'] = `Bearer ${sessionId}`;
        }

        const res = await fetch(`${WORKER_BASE_URL}/logout`, {
            method: 'POST',
            headers,
            credentials: 'include'
        });
        console.log('[GitHub Auth] Logout response status:', res.status);
        clearSessionId();
        localStorage.removeItem('github_selected_gist');
        console.log('[GitHub Auth] User logged out successfully');
    } catch (err) {
        console.error('[GitHub Auth] Error logging out:', err);
        // Even if logout fails, clear local session
        clearSessionId();
        localStorage.removeItem('github_selected_gist');
    }
    // Update UI
    if (githubNotLoggedIn) githubNotLoggedIn.style.display = 'block';
    if (githubLoggedIn) githubLoggedIn.style.display = 'none';
    if (githubConnectBtn) githubConnectBtn.style.display = 'block';
    if (githubLogoutBtn) githubLogoutBtn.style.display = 'none';
    // Update gist loading section
    updateGistVisibility();
    // Update save gist section
    updateSaveGistVisibility();
    console.log('[GitHub Auth] UI updated to logged-out state');
}

/**
 * Update GitHub UI with user info
 */
export function updateGitHubUI(user) {
    console.log('[GitHub Auth] updateGitHubUI called with user:', user);
    githubNotLoggedIn.style.display = 'none';
    githubLoggedIn.style.display = 'flex';
    githubConnectBtn.style.display = 'none';
    githubLogoutBtn.style.display = 'inline-block';
    githubUserAvatar.src = user.avatar_url;
    githubUserAvatar.alt = user.login;
    githubUserName.textContent = user.login;
    // Update gist loading section
    updateGistVisibility();
    // Update save gist section
    updateSaveGistVisibility();
    console.log('[GitHub Auth] UI updated');
}

/**
 * Update save gist visibility based on GitHub auth state
 */
export function updateSaveGistVisibility() {
    const sessionId = getSessionId();

    if (sessionId) {
        // User is authenticated
        if (saveGistNotConnected) saveGistNotConnected.style.display = 'none';
        if (saveGistConnectedContent) saveGistConnectedContent.style.display = 'flex';
    } else {
        // User is not authenticated
        if (saveGistNotConnected) saveGistNotConnected.style.display = 'block';
        if (saveGistConnectedContent) saveGistConnectedContent.style.display = 'none';
    }
}

/**
 * Update gist visibility based on GitHub auth state
 */
export function updateGistVisibility() {
    const sessionId = getSessionId();

    if (sessionId) {
        // User is authenticated
        if (gistNotConnected) gistNotConnected.style.display = 'none';
        if (gistConnectedContent) gistConnectedContent.style.display = 'flex';
    } else {
        // User is not authenticated
        if (gistNotConnected) gistNotConnected.style.display = 'block';
        if (gistConnectedContent) gistConnectedContent.style.display = 'none';
    }
}

/**
 * Load GitHub auth status on page load
 */
export async function loadGitHubAuth() {
    console.log('[GitHub Auth] loadGitHubAuth called');
    const session = await checkSession();
    console.log('[GitHub Auth] Session result:', session);
    if (session.authenticated && session.user) {
        console.log('[GitHub Auth] User authenticated, updating UI');
        updateGitHubUI(session.user);
        const { loadGistOptionsForLoadSelector } = await import('./github.js');
        await loadGistOptionsForLoadSelector();
    } else {
        console.log('[GitHub Auth] User not authenticated or no user data');
    }
}

/**
 * Initialize GitHub auth on page load
 */
export async function initGitHubAuth() {
    console.log('[GitHub Auth] initGitHubAuth called');
    const urlParams = new URLSearchParams(window.location.search);
    console.log('[GitHub Auth] URL params:', Object.fromEntries(urlParams.entries()));

    // Check for OAuth callback with session_id
    const sessionId = urlParams.get('session_id');
    const authStatus = urlParams.get('auth');
    console.log('[GitHub Auth] Session ID from URL:', sessionId ? sessionId.substring(0, 10) + '...' : 'null');
    console.log('[GitHub Auth] Auth status from URL:', authStatus);

    if (sessionId && authStatus === 'success') {
        console.log('[GitHub Auth] OAuth callback received, storing session ID');
        setSessionId(sessionId);
        console.log('[GitHub Auth] Session ID stored:', getSessionId() ? getSessionId().substring(0, 10) + '...' : 'null');
        // Clean up URL parameters after callback
        window.history.replaceState({}, document.title, window.location.pathname);
        const { showStatus } = await import('./ui.js');
        showStatus('Successfully connected to GitHub');
        const { hideStatus } = await import('./ui.js');
        setTimeout(hideStatus, 3000);

        // Restore papers state if it was saved before redirect
        restorePapersState();
    }

    await loadGitHubAuth();
}

/**
 * Restore papers state after OAuth callback
 */
export function restorePapersState() {
    const savedState = sessionStorage.getItem('argonaut_oauth_state');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            console.log('[GitHub Auth] Restoring state:', state);

            if (state.hasPapers) {
                // If papers were loaded, ensure the sections remain visible
                if (state.saveJsonVisible) saveJsonSection.style.display = 'block';
                if (state.exportResetVisible) exportResetSection.style.display = 'block';
                if (state.papersVisible) papersSection.style.display = 'block';
                // Keep load section hidden since papers are loaded
                loadJsonSection.style.display = 'none';
            }

            // Clear the saved state
            sessionStorage.removeItem('argonaut_oauth_state');
        } catch (err) {
            console.error('[GitHub Auth] Error restoring state:', err);
        }
    }
}

// GitHub OAuth event listeners
if (githubConnectBtn) {
    githubConnectBtn.addEventListener('click', initiateLogin);
}
if (githubLogoutBtn) {
    githubLogoutBtn.addEventListener('click', logout);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGitHubAuth);
} else {
    initGitHubAuth();
}