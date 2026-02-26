// Section visibility controller - centralizes all section visibility logic

import { get } from '../dom.js';

let loadJsonSection;
let saveJsonSection;
let exportResetSection;
let papersSection;

/**
 * Initialize DOM elements for visibility control
 */
export function initVisibilityDOM() {
    loadJsonSection = get('loadJsonSection');
    saveJsonSection = get('saveJsonSection');
    exportResetSection = get('exportResetSection');
    papersSection = get('papersSection');
}

/**
 * Show loading state - when papers are being loaded
 */
export function showLoadingState() {
    if (loadJsonSection) loadJsonSection.style.display = 'none';
    if (saveJsonSection) saveJsonSection.style.display = 'none';
    if (exportResetSection) exportResetSection.style.display = 'none';
    if (papersSection) papersSection.style.display = 'none';
}

/**
 * Show papers view - when papers are loaded and displayed
 */
export function showPapersState() {
    if (loadJsonSection) loadJsonSection.style.display = 'none';
    if (saveJsonSection) saveJsonSection.style.display = 'block';
    if (exportResetSection) exportResetSection.style.display = 'block';
    if (papersSection) papersSection.style.display = 'block';
}

/**
 * Show load options - when no papers are loaded (initial/reset state)
 */
export function showLoadState() {
    if (loadJsonSection) loadJsonSection.style.display = 'block';
    if (saveJsonSection) saveJsonSection.style.display = 'none';
    if (exportResetSection) exportResetSection.style.display = 'none';
    if (papersSection) papersSection.style.display = 'none';
}

/**
 * Get current visibility state (for persistence)
 */
export function getVisibilityState() {
    return {
        saveJsonVisible: saveJsonSection?.style.display === 'block',
        exportResetVisible: exportResetSection?.style.display === 'block',
        papersVisible: papersSection?.style.display === 'block'
    };
}

/**
 * Restore visibility state (after auth)
 */
export function restoreVisibilityState(state) {
    if (state.saveJsonVisible && saveJsonSection) {
        saveJsonSection.style.display = 'block';
    }
    if (state.exportResetVisible && exportResetSection) {
        exportResetSection.style.display = 'block';
    }
    if (state.papersVisible && papersSection) {
        papersSection.style.display = 'block';
    }
    if (loadJsonSection) {
        loadJsonSection.style.display = 'none';
    }
}
