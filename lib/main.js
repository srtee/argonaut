// Application entry point

import './state.js';
import * as auth from './auth.js';
import * as github from './github.js';
import * as papers from './papers.js';
import * as ui from './ui/index.js';
import { initAll as initDOMRegistry } from './dom.js';
import { loadFromUrlParam, loadPapers } from './ui/load.js';
import { store } from './state.js';

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize centralized DOM registry first
    initDOMRegistry();

    // Initialize each module's local DOM variables from registry
    ui.initDOM();
    auth.initDOM();
    github.initDOM();
    papers.initDOM();

    // Initialize event listeners
    ui.initEventListeners();
    papers.initEventListeners();
    auth.initEventListeners();

    ui.initTheme();
    ui.initInputOptions();
    ui.initSaveOptions();
    ui.initOnboarding();

    // Check for jsonurl parameter and load if present
    const loadedFromUrl = await loadFromUrlParam();

    // Get current state (may have been restored from sessionStorage)
    const currentState = store.get();

    // If no jsonurl param, try loading from storage or default
    if (!loadedFromUrl) {
        // Check sessionStorage (auto-restored by state.js) and localStorage
        const sessionPapers = currentState.papersData && Object.keys(currentState.papersData).length > 0;
        const storedData = localStorage.getItem('argonaut_papers');
        let localPaperCount = 0;
        if (storedData) {
            try {
                const data = JSON.parse(storedData);
                localPaperCount = data ? Object.keys(data).length : 0;
            } catch (e) {}
        }

        if (sessionPapers || localPaperCount > 0) {
            const paperCount = sessionPapers || localPaperCount;
            // Use setTimeout to ensure confirm() works properly after page load
            await new Promise(resolve => setTimeout(resolve, 100));
            const confirmed = confirm(`You have ${paperCount} paper(s) saved from your previous session. Would you like to restore them?`);
            // Clear OAuth state so auth.js doesn't override with old session data
            sessionStorage.removeItem('argonaut_oauth_state');
            if (confirmed) {
                // User wants to restore - if not from session, load from localStorage
                if (!sessionPapers && localPaperCount > 0) {
                    await loadPapers('storage');
                }
                // Otherwise papers are already loaded from sessionStorage
            } else {
                // User declined - clear data and load defaults
                const { clearCurrentData } = await import('./ui/storage.js');
                clearCurrentData();
                await loadPapers('default');
            }
        } else {
            await loadPapers('default');
        }
    }

    // Initialize GitHub auth (will not restore OAuth state since we cleared it)
    await auth.initGitHubAuth();
});
