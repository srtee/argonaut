// Storage module - data persistence

import { state, store } from '../state.js';
import { showError, showStatus } from './notifications.js';

let papersList;
let jsonFormatSelector;

export function initStorageDOM() {
    papersList = document.getElementById('papersList');
    jsonFormatSelector = document.getElementById('jsonFormatSelector');
}

/**
 * Clear current papers data
 */
export function clearCurrentData() {
    store.set({
        papersData: {},
        selectedTags: new Set(),
        processedPapersData: []
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
        // Get the format (full or light)
        const format = jsonFormatSelector ? jsonFormatSelector.value : 'full';
        let dataToSave = state.papersData;

        if (format === 'light') {
            dataToSave = {};
            for (const [key, paper] of Object.entries(state.papersData)) {
                dataToSave[key] = {
                    doi: paper.doi,
                    comments: paper.comments || [],
                    tags: paper.tags || [],
                    alsoreads: paper.alsoreads || []
                };
            }
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
export async function loadFromStorage() {
    try {
        const jsonStr = localStorage.getItem('argonautPapers');
        if (!jsonStr) {
            showError('No papers found in browser storage');
            return;
        }

        const data = JSON.parse(jsonStr);
        if (!data || Object.keys(data).length === 0) {
            showError('No papers found in browser storage');
            return;
        }

        // Clear current data and load new data
        clearCurrentData();
        store.set({ papersData: data });
        const { displayPapers } = await import('../papers.js');
        displayPapers();
        showStatus(`Loaded ${Object.keys(data).length} papers from browser storage`);
    } catch (err) {
        console.error('Error loading from storage:', err);
        showError('Error loading from storage: ' + err.message);
    }
}
