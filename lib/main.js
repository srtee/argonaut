// Application entry point

import './state.js';
import * as auth from './auth.js';
import * as github from './github.js';
import * as papers from './papers.js';
import * as ui from './ui/index.js';
import { initAll as initDOMRegistry } from './dom.js';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
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
});