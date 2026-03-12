// Application entry point

import './state.js';
import * as auth from './auth.js';
import * as github from './github.js';
import * as papers from './papers/index.js';
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

    // If no jsonurl param, try loading from storage
    if (!loadedFromUrl) {
        // Check for saved papers in sessionStorage or localStorage
        const currentState = store.get();
        const sessionCount = currentState.papersData ? Object.keys(currentState.papersData).length : 0;

        const storedData = localStorage.getItem('argonaut_papers');
        let localCount = 0;
        if (storedData) {
            try {
                localCount = Object.keys(JSON.parse(storedData)).length;
            } catch (e) {}
        }

        const paperCount = sessionCount || localCount;

        if (paperCount > 0) {
            // Papers already loaded from sessionStorage by state.js, or load from localStorage
            if (!sessionCount && localCount > 0) {
                await loadPapers('storage');
            }

            // Now prompt user - if they click "Cancel", reset everything
            await new Promise(resolve => setTimeout(resolve, 100));
            const confirmed = confirm(`You have ${paperCount} paper(s) from your previous session. Click OK to keep them, or Cancel to reset.`);

            if (!confirmed) {
                // User clicked Cancel - reset all papers
                console.log('[Main] User cancelled, resetting papers');
                const { resetAll } = await import('./ui/index.js');
                await resetAll();
            }
        } else {
            await loadPapers('default');
        }
    }

    // Initialize GitHub auth
    await auth.initGitHubAuth();
});
