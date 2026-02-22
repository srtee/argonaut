// GitHub OAuth session management

import { state, store } from './state.js';
import { get, getMultiple } from './dom.js';
import { checkSession as clientCheckSession, initiateLogin as clientInitiateLogin, logout as clientLogout, getSessionId, setSessionId, clearSessionId } from './clients/index.js';

/**
 * Re-export session functions from client
 */
export { getSessionId, setSessionId, clearSessionId };
let githubSection;
let githubNotLoggedIn;
let githubLoggedIn;
let githubConnectBtn;
let githubLogoutBtn;
let githubUserAvatar;
let githubUserName;

// For visibility toggles in Load and Save sections
let gistConnectedContent;
let saveGistConnectedContent;
let loadJsonSection;
let saveJsonSection;
let exportResetSection;
let papersSection;

// Initialize all DOM elements - must be called after DOM is ready
export function initDOM() {
    const elements = getMultiple(
        'githubSection',
        'githubNotLoggedIn',
        'githubLoggedIn',
        'githubConnectBtn',
        'githubLogoutBtn',
        'githubUserAvatar',
        'githubUserName',
        'gistConnectedContent',
        'saveGistConnectedContent',
        'loadJsonSection',
        'saveJsonSection',
        'exportResetSection',
        'papersSection'
    );

    githubSection = elements.githubSection;
    githubNotLoggedIn = elements.githubNotLoggedIn;
    githubLoggedIn = elements.githubLoggedIn;
    githubConnectBtn = elements.githubConnectBtn;
    githubLogoutBtn = elements.githubLogoutBtn;
    githubUserAvatar = elements.githubUserAvatar;
    githubUserName = elements.githubUserName;
    gistConnectedContent = elements.gistConnectedContent;
    saveGistConnectedContent = elements.saveGistConnectedContent;
    loadJsonSection = elements.loadJsonSection;
    saveJsonSection = elements.saveJsonSection;
    exportResetSection = elements.exportResetSection;
    papersSection = elements.papersSection;

    console.log('[Auth] DOM elements initialized');
}

/**
 * Check if user is authenticated (uses client internally)
 */
export async function checkSession() {
    return clientCheckSession();
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
        papersVisible: papersSection?.style.display === 'block',
        // Save actual papers data to restore after OAuth
        papersData: state.papersData,
        processedPapersData: state.processedPapersData,
        selectedTags: Array.from(state.selectedTags)
    };
    sessionStorage.setItem('argonaut_oauth_state', JSON.stringify(stateToSave));

    // Use the client to initiate login (redirects)
    clientInitiateLogin();
}

/**
 * Logout from GitHub
 */
export async function logout() {
    console.log('[GitHub Auth] Initiating logout');
    await clientLogout();

    // Update UI
    if (githubNotLoggedIn) githubNotLoggedIn.style.display = 'block';
    if (githubLoggedIn) githubLoggedIn.style.display = 'none';
    if (githubConnectBtn) githubConnectBtn.style.display = 'block';
    if (githubLogoutBtn) githubLogoutBtn.style.display = 'none';
    // Update gist loading section
    updateGistVisibility();
    // Update save gist section
    updateSaveGistVisibility();
    // Disable gist radio buttons and reset to other methods
    updateGistRadioState();
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
    // Enable gist radio buttons
    updateGistRadioState();
    console.log('[GitHub Auth] UI updated');
}

/**
 * Update save gist visibility based on GitHub auth state
 */
export function updateSaveGistVisibility() {
    const sessionId = getSessionId();

    if (sessionId) {
        // User is authenticated
        if (saveGistConnectedContent) saveGistConnectedContent.style.display = 'flex';
    } else {
        // User is not authenticated
        if (saveGistConnectedContent) saveGistConnectedContent.style.display = 'none';
    }
}

/**
 * Update gist radio buttons disabled state based on GitHub auth state
 */
export function updateGistRadioState() {
    const sessionId = getSessionId();
    const inputGistRadio = document.getElementById('inputMethodGist');
    const saveGistRadio = document.getElementById('saveMethodGist');

    // Get parent labels
    const inputGistLabel = inputGistRadio?.closest('.input-section__label');
    const saveGistLabel = saveGistRadio?.closest('.save-section__option-label');

    if (!sessionId) {
        // Disable gist radio buttons when logged out
        if (inputGistRadio) {
            inputGistRadio.disabled = true;
            if (inputGistLabel) {
                inputGistLabel.style.color = 'var(--color-text-muted)';
                inputGistLabel.style.cursor = 'not-allowed';
            }
            // If gist was selected, switch to url
            if (inputGistRadio.checked) {
                const urlRadio = document.getElementById('inputMethodUrl');
                if (urlRadio) {
                    urlRadio.checked = true;
                    import('./ui/inputOptions.js').then(({ updateInputOptionUI }) => {
                        updateInputOptionUI('url');
                    });
                }
            }
        }
        if (saveGistRadio) {
            saveGistRadio.disabled = true;
            if (saveGistLabel) {
                saveGistLabel.style.color = 'var(--color-text-muted)';
                saveGistLabel.style.cursor = 'not-allowed';
            }
            // If gist was selected, switch to file
            if (saveGistRadio.checked) {
                const fileRadio = document.getElementById('saveMethodFile');
                if (fileRadio) {
                    fileRadio.checked = true;
                    import('./ui/saveOptions.js').then(({ updateSaveOptionUI }) => {
                        updateSaveOptionUI('file');
                    });
                }
            }
        }
    } else {
        // Enable gist radio buttons when logged in
        if (inputGistRadio) {
            inputGistRadio.disabled = false;
            if (inputGistLabel) {
                inputGistLabel.style.color = '';
                inputGistLabel.style.cursor = '';
            }
        }
        if (saveGistRadio) {
            saveGistRadio.disabled = false;
            if (saveGistLabel) {
                saveGistLabel.style.color = '';
                saveGistLabel.style.cursor = '';
            }
        }
    }
}

/**
 * Update gist visibility based on GitHub auth state
 */
export function updateGistVisibility() {
    const sessionId = getSessionId();

    if (sessionId) {
        // User is authenticated
        if (gistConnectedContent) gistConnectedContent.style.display = 'flex';
    } else {
        // User is not authenticated
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
        // Disable gist radio buttons on page load when logged out
        updateGistRadioState();
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
        const { showStatus } = await import('./ui/index.js');
        showStatus('Successfully connected to GitHub');
        const { hideStatus } = await import('./ui/index.js');
        setTimeout(hideStatus, 3000);

        // Restore papers state if it was saved before redirect
        await restorePapersState();
    } else {
        // Check if papers exist in main app state and display them
        // This handles the case where page was refreshed or OAuth state was lost
        if (state.papersData && Object.keys(state.papersData).length > 0) {
            const { displayPapers } = await import('./papers.js');
            await displayPapers();
        }
    }

    await loadGitHubAuth();
}

/**
 * Restore papers state after OAuth callback
 */
export async function restorePapersState() {
    // First check OAuth-specific state
    const savedState = sessionStorage.getItem('argonaut_oauth_state');

    if (savedState) {
        try {
            const saved = JSON.parse(savedState);

            if (saved.hasPapers) {
                // Restore the papers data and state
                if (saved.papersData) {
                    store.set({ papersData: saved.papersData });
                }
                if (saved.processedPapersData) {
                    store.set({ processedPapersData: saved.processedPapersData });
                }
                if (saved.selectedTags) {
                    store.setSelectedTags(saved.selectedTags);
                }

                // If papers were loaded, ensure the sections remain visible
                if (saved.saveJsonVisible) saveJsonSection.style.display = 'block';
                if (saved.exportResetVisible) exportResetSection.style.display = 'block';
                if (saved.papersVisible) papersSection.style.display = 'block';
                // Keep load section hidden since papers are loaded
                loadJsonSection.style.display = 'none';

                // Re-render the papers
                const { displayPapers } = await import('./papers.js');
                await displayPapers();
            }

            // Clear the saved state
            sessionStorage.removeItem('argonaut_oauth_state');
        } catch (err) {
            console.error('[GitHub Auth] Error restoring state:', err);
        }
    } else if (state.papersData && Object.keys(state.papersData).length > 0) {
        // Fallback: restore from main app state if OAuth state is missing
        const { displayPapers } = await import('./papers.js');
        await displayPapers();
    }
}

// Initialize event listeners - must be called after initDOM()
export function initEventListeners() {
    console.log('[Auth] Initializing event listeners');

    if (githubConnectBtn) {
        githubConnectBtn.addEventListener('click', initiateLogin);
    }
    if (githubLogoutBtn) {
        githubLogoutBtn.addEventListener('click', logout);
    }

    console.log('[Auth] Event listeners initialized');
}