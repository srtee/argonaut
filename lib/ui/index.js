// UI concerns - theme, onboarding, tag editing, storage, export, file ops
// Main entry point - re-exports all functions from submodules for backward compatibility

import { state, store } from '../state.js';

// Re-export all functions from submodules
export * from './theme.js';
export * from './notifications.js';
export * from './storage.js';
export * from './export.js';
export * from './load.js';
export * from './inputOptions.js';
export * from './saveOptions.js';
export * from './tagEditor.js';
export * from './comments.js';
export * from './onboarding.js';

// Also export saveOptions under the expected name
export { updateSaveOptionUI, initSaveOptions } from './saveOptions.js';

// Import submodules for internal use
import { initThemeDOM, initThemeListener } from './theme.js';
import { initNotificationsDOM } from './notifications.js';
import { initStorageDOM, clearCurrentData, saveToStorage, loadFromStorage } from './storage.js';
import { initExportDOM, exportJSON, exportBibTeX, exportBibTeXTagged } from './export.js';
import { initLoadDOM, loadPapers } from './load.js';
import { initInputOptionsDOM, updateInputOptionUI, initInputOptions } from './inputOptions.js';
import { updateSaveOptionUI, initSaveOptions } from './saveOptions.js';
import { initTagEditorDOM, openTagDialog, updateExportButtonStates } from './tagEditor.js';
import { initOnboardingDOM, initOnboarding, hideOnboarding, nextStep, prevStep, goToStep, completeOnboarding, showOnboarding as showOnboardingFunc, initOnboardingListeners } from './onboarding.js';
import { hideStatus } from './notifications.js';

// DOM Elements - for internal use
let loadJsonSection;
let saveJsonSection;
let papersSection;
let exportResetSection;
let papersList;
let fileInput;
let urlInput;
let loadUrlBtn;
let loadFromStorageBtn;
let loadNewBtn;
let saveToStorageBtn;
let exportJsonBtn;
let exportBibtexAllBtn;
let exportBibtexTaggedBtn;

// Save JSON Collection Elements
let jsonFormatSelector;

// Onboarding elements
let closeOnboardingBtn;
let showOnboardingBtn;

// Initialize all DOM elements - must be called after DOM is ready
export function initDOM() {
    // Initialize submodule DOM elements
    initNotificationsDOM();
    initThemeDOM();
    initStorageDOM();
    initExportDOM();
    initLoadDOM();
    initInputOptionsDOM();
    initTagEditorDOM();
    initOnboardingDOM();

    // DOM Elements - Main sections (also needed by submodules)
    loadJsonSection = document.getElementById('loadJsonSection');
    saveJsonSection = document.getElementById('saveJsonSection');
    papersSection = document.getElementById('papersSection');
    exportResetSection = document.getElementById('exportResetSection');
    papersList = document.getElementById('papersList');
    fileInput = document.getElementById('fileInput');
    urlInput = document.getElementById('urlInput');
    loadUrlBtn = document.getElementById('loadUrlBtn');
    loadFromStorageBtn = document.getElementById('loadFromStorageBtn');
    loadNewBtn = document.getElementById('loadNewBtn');
    saveToStorageBtn = document.getElementById('saveToStorageBtn');
    exportJsonBtn = document.getElementById('exportJsonBtn');
    exportBibtexAllBtn = document.getElementById('exportBibtexAllBtn');
    exportBibtexTaggedBtn = document.getElementById('exportBibtexTaggedBtn');

    // Save JSON Collection Elements
    jsonFormatSelector = document.getElementById('jsonFormatSelector');

    // Onboarding elements
    closeOnboardingBtn = document.getElementById('closeOnboardingBtn');
    showOnboardingBtn = document.getElementById('showOnboardingBtn');

    // Set initial state for export buttons
    updateExportButtonStates();

    console.log('[UI] DOM elements initialized');
}

// Initialize all event listeners - must be called after DOM is ready
export function initEventListeners() {
    console.log('[UI] Initializing event listeners');

    // Initialize theme listener
    initThemeListener();

    // Input option switching
    document.querySelectorAll('input[name="inputMethod"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateInputOptionUI(e.target.value);
        });
    });

    // Save option switching
    document.querySelectorAll('input[name="saveMethod"]').forEach(radio => {
        radio.addEventListener('change', () => updateSaveOptionUI(radio.value));
    });

    // File input handler
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files[0]) {
                loadPapers('file');
            }
        });
    }

    // URL load button handler
    if (loadUrlBtn) {
        loadUrlBtn.addEventListener('click', () => loadPapers('url'));
    }

    // Load from browser storage button handler
    if (loadFromStorageBtn) {
        loadFromStorageBtn.addEventListener('click', loadFromStorage);
    }

    // Reset All button
    if (loadNewBtn) {
        loadNewBtn.addEventListener('click', () => {
            const confirmed = confirm(
                'Are you sure you want to reset all papers?\n\n' +
                'This will clear:\n' +
                '• All papers\n' +
                '• All comments\n' +
                '• All tags\n' +
                '• Any unsaved changes\n\n' +
                'This action cannot be undone.'
            );
            if (confirmed) {
                store.setSelectedTags([]);
                store.set({
                    papersData: {},
                    processedPapersData: []
                });
                if (papersSection) papersSection.style.display = 'none';
                if (saveJsonSection) saveJsonSection.style.display = 'none';
                if (exportResetSection) exportResetSection.style.display = 'none';
                if (loadJsonSection) loadJsonSection.style.display = 'block';
                if (papersList) papersList.innerHTML = '';
                if (fileInput) fileInput.value = '';
                if (urlInput) urlInput.value = 'https://gist.githubusercontent.com/srtee/04ee671f6f27d64de800f00eb9280a21/raw/papers.json';
                hideStatus();
            }
        });
    }

    // Save to browser storage button
    if (saveToStorageBtn) {
        saveToStorageBtn.addEventListener('click', saveToStorage);
    }

    // Export JSON button
    if (exportJsonBtn) {
        console.log('[UI] Export JSON button found, adding click handler');
        exportJsonBtn.addEventListener('click', () => {
            console.log('[UI] Export JSON button clicked');
            exportJSON();
        });
    }

    // Export BibTeX (all) button
    if (exportBibtexAllBtn) {
        exportBibtexAllBtn.addEventListener('click', exportBibTeX);
    }

    // Export BibTeX (only tagged) button
    if (exportBibtexTaggedBtn) {
        exportBibtexTaggedBtn.addEventListener('click', exportBibTeXTagged);
    }

    // Initialize onboarding listeners
    initOnboardingListeners(closeOnboardingBtn, showOnboardingBtn);

    // Papers list event listeners for inline tag editing
    if (papersList) {
        papersList.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.tag-edit-btn');
            if (editBtn) {
                e.stopPropagation();
                const key = editBtn.dataset.key;
                console.log('Edit button clicked, key:', key);
                openTagDialog(key);
            }
        });
    }

    // Escape key to close inline editor
    document.addEventListener('keydown', async (e) => {
        if (e.key === 'Escape' && state.currentEditingKey !== null) {
            const { hasUnsavedChanges, closeTagDialog } = await import('./tagEditor.js');
            if (hasUnsavedChanges()) {
                if (confirm('You have unsaved changes. Discard them?')) {
                    closeTagDialog();
                    import('../papers.js').then(({ applyTagFilter }) => {
                        applyTagFilter();
                    });
                }
            } else {
                closeTagDialog();
                import('../papers.js').then(({ applyTagFilter }) => {
                    applyTagFilter();
                });
            }
        }
    });

    // Click outside to close inline editor
    document.addEventListener('click', (e) => {
        if (state.currentEditingKey !== null) {
            const editor = document.querySelector('.tag-editor');
            if (editor && !editor.contains(e.target)) {
                import('./tagEditor.js').then(({ hasUnsavedChanges, closeTagDialog }) => {
                    if (hasUnsavedChanges()) {
                        if (confirm('You have unsaved changes. Discard them?')) {
                            closeTagDialog();
                            import('../papers.js').then(({ applyTagFilter }) => {
                                applyTagFilter();
                            });
                        }
                    } else {
                        closeTagDialog();
                        import('../papers.js').then(({ applyTagFilter }) => {
                            applyTagFilter();
                        });
                    }
                });
            }
        }
    });

    // Auto-save comment on blur (when clicking away)
    if (papersList) {
        papersList.addEventListener('blur', (e) => {
            if (e.target.classList.contains('comments')) {
                const key = e.target.dataset.key;
                const newComment = e.target.value;
                import('./comments.js').then(({ saveComment }) => {
                    saveComment(key, newComment);
                });
            }
        }, true);
    }

    console.log('[UI] Event listeners initialized');
}
