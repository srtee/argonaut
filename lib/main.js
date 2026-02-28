// Application entry point

import './state.js';
import * as auth from './auth.js';
import * as github from './github.js';
import * as papers from './papers.js';
import * as ui from './ui/index.js';
import { initAll as initDOMRegistry } from './dom.js';
import { loadFromUrlParam, loadPapers } from './ui/load.js';

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

    // If no jsonurl param, try loading from storage or default
    if (!loadedFromUrl) {
        // Check localStorage for saved papers
        const storedData = localStorage.getItem('argonaut_papers');
        let paperCount = 0;
        if (storedData) {
            try {
                const data = JSON.parse(storedData);
                paperCount = data ? Object.keys(data).length : 0;
            } catch (e) {}
        }

        if (paperCount > 0) {
            // Use setTimeout to ensure confirm() works properly after page load
            await new Promise(resolve => setTimeout(resolve, 50));
            const confirmed = confirm(`You have ${paperCount} paper(s) saved from your previous session. Would you like to restore them?`);
            // Clear OAuth state so auth.js doesn't override with old session data
            sessionStorage.removeItem('argonaut_oauth_state');
            if (confirmed) {
                await loadPapers('storage');
            } else {
                await loadPapers('default');
            }
        } else {
            await loadPapers('default');
        }
    }

    // Initialize GitHub auth (will not restore OAuth state since we cleared it)
    await auth.initGitHubAuth();
});
