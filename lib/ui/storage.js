// Storage module - data persistence

import { state, store } from '../state.js';
import { showError, showStatus } from './notifications.js';
import { get } from '../dom.js';
import { convertToDoiIndexed } from '../utils.js';

let papersList;
let jsonFormatSelector;

export function initStorageDOM() {
    papersList = get('papersList');
    jsonFormatSelector = get('jsonFormatSelector');
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
        // Get the format (full or light)
        const format = jsonFormatSelector ? jsonFormatSelector.value : 'full';
        let dataToSave = state.papersData;

        if (format === 'light') {
            dataToSave = {};
            for (const [doi, paper] of Object.entries(state.papersData)) {
                dataToSave[doi] = {
                    _key: paper._key,
                    _doi: paper._doi,
                    _comments: paper._comments || [],
                    _tags: paper._tags || [],
                    _alsoread: paper._alsoread || []
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

        // Convert to DOI-indexed format if needed
        const convertedData = convertToDoiIndexed(data);

        // Clear current data and load new data
        clearCurrentData();
        store.set({ papersData: convertedData });
        const { displayPapers } = await import('../papers.js');
        displayPapers();
        showStatus(`Loaded ${Object.keys(convertedData).length} papers from browser storage`);
    } catch (err) {
        console.error('Error loading from storage:', err);
        showError('Error loading from storage: ' + err.message);
    }
}
