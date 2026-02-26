// Application entry point

import './state.js';
import * as auth from './auth.js';
import * as github from './github.js';
import * as papers from './papers.js';
import * as ui from './ui/index.js';
import { initAll as initDOMRegistry } from './dom.js';
import { loadFromUrlParam, loadPapers } from './ui/load.js';
import { state } from './state.js';
import { loadFromStorage } from './ui/storage.js';

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
    auth.initGitHubAuth();
    ui.initInputOptions();
    ui.initSaveOptions();
    ui.initOnboarding();

    // Check for jsonurl parameter and load if present
    const loadedFromUrl = await loadFromUrlParam();

    // If no jsonurl param, try loading from storage or default
    if (!loadedFromUrl) {
        // Try loading from browser storage
        const storedData = localStorage.getItem('argonaut_papers');
        if (storedData) {
            try {
                const data = JSON.parse(storedData);
                if (data && Object.keys(data).length > 0) {
                    console.log('[Main] Found papers in storage, loading...');
                    await loadPapers('storage');
                    return;
                }
            } catch (e) {
                console.log('[Main] No valid stored data found');
            }
        }

        // Load default papers
        console.log('[Main] Loading default papers');
        await loadPapers('default');
    }
});