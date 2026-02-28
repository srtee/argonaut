// Storage module - data persistence

import { state, store } from '../state.js';
import { showError, showStatus } from './notifications.js';
import { get } from '../dom.js';
import { convertToDoiIndexed } from '../utils.js';

let papersList;
let includeBibInfo;
let includeAbstracts;

export function initStorageDOM() {
    papersList = get('papersList');
    includeBibInfo = get('includeBibInfo');
    includeAbstracts = get('includeAbstracts');
}

/**
 * Clear current papers data
 */
export function clearCurrentData() {
    store.set({
        papersData: {},
        selectedTags: new Set()
    });
    if (papersList) {
        papersList.innerHTML = '';
    }
}

/**
 * Save papers data to browser storage
 */
export function saveToStorage() {
    if (!state.papersData || Object.keys(state.papersData).length === 0) {
        showError('No papers to save');
        return;
    }

    try {
        // Get checkbox states
        const withBibInfo = includeBibInfo ? includeBibInfo.checked : false;
        const withAbstracts = includeAbstracts ? includeAbstracts.checked : false;

        let dataToSave = {};
        for (const [doi, paper] of Object.entries(state.papersData)) {
            // Always include base metadata
            const paperData = {
                _key: paper._key,
                _comments: paper._comments || [],
                _tags: paper._tags || [],
                _alsoread: paper._alsoread || []
            };

            // Add bibliographic info if checkbox is checked
            if (withBibInfo) {
                if (paper.title) paperData.title = paper.title;
                if (paper.author) paperData.author = paper.author;
                if (paper.journal) paperData.journal = paper.journal;
                if (paper.year) paperData.year = paper.year;
                if (paper.volume) paperData.volume = paper.volume;
                if (paper.pages) paperData.pages = paper.pages;
                if (paper._doi) paperData.doi = paper._doi;
            }

            // Add abstract if checkbox is checked
            if (withAbstracts && paper.abstract) {
                paperData.abstract = paper.abstract;
            }

            dataToSave[doi] = paperData;
        }

        const jsonStr = JSON.stringify(dataToSave);
        localStorage.setItem('argonautPapers', jsonStr);
        showStatus('Papers saved to browser storage');
    } catch (err) {
        console.error('Error saving to storage:', err);
        showError('Error saving to storage: ' + err.message);
    }
}

/**
 * Load papers data from browser storage
 */
export function loadFromStorage() {
    try {
        const jsonStr = localStorage.getItem('argonautPapers');
        if (!jsonStr) {
            showError('No saved papers found');
            return null;
        }

        const data = JSON.parse(jsonStr);
        const papersData = convertToDoiIndexed(data);
        console.log('[Storage] Loaded', Object.keys(papersData).length, 'papers from storage');
        return papersData;
    } catch (err) {
        console.error('Error loading from storage:', err);
        showError('Error loading from storage: ' + err.message);
        return null;
    }
}

/**
 * Check if there are saved papers in browser storage
 */
export function hasStoredPapers() {
    return localStorage.getItem('argonautPapers') !== null;
}
