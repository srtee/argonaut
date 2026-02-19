// Application entry point

import './state.js';
import * as auth from './auth.js';
import * as github from './github.js';
import * as papers from './papers.js';
import * as ui from './ui.js';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all DOM elements first
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