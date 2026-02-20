// Load module - load papers from file/URL

import { showError, showStatus, hideStatus, hideError } from './notifications.js';

let papersList;
let fileInput;
let urlInput;
let loadJsonSection;
let saveJsonSection;
let exportResetSection;
let papersSection;

export function initLoadDOM() {
    papersList = document.getElementById('papersList');
    fileInput = document.getElementById('fileInput');
    urlInput = document.getElementById('urlInput');
    loadJsonSection = document.getElementById('loadJsonSection');
    saveJsonSection = document.getElementById('saveJsonSection');
    exportResetSection = document.getElementById('exportResetSection');
    papersSection = document.getElementById('papersSection');
}

/**
 * Load JSON from file
 */
export function loadFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                resolve(data);
            } catch (err) {
                reject(new Error('Invalid JSON file'));
            }
        };
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsText(file);
    });
}

/**
 * Load JSON from URL
 */
export async function loadFromUrl(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load: ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        throw new Error(`Error loading from URL: ${err.message}`);
    }
}

/**
 * Load default papers.json
 */
export async function loadDefault() {
    try {
        const response = await fetch('papers.json');
        if (!response.ok) {
            throw new Error('papers.json not found');
        }
        return await response.json();
    } catch (err) {
        throw new Error('Error loading default papers: ' + err.message);
    }
}

/**
 * Main load function
 */
export async function loadPapers(method) {
    hideError();
    hideStatus();
    if (papersList) {
        papersList.innerHTML = '<p class="loading">Loading papers...</p>';
    }

    try {
        let data;

        switch (method) {
            case 'file':
                if (!fileInput || !fileInput.files[0]) {
                    throw new Error('Please select a file');
                }
                showStatus('Loading papers from file...');
                data = await loadFromFile(fileInput.files[0]);
                break;
            case 'url':
                if (!urlInput) {
                    throw new Error('URL input not found');
                }
                const url = urlInput.value.trim();
                if (!url) {
                    throw new Error('Please enter a URL');
                }
                showStatus('Loading papers from URL...');
                data = await loadFromUrl(url);
                break;
            case 'default':
                data = await loadDefault();
                break;
            default:
                throw new Error('Invalid input method');
        }

        const { processPapers } = await import('../papers.js');
        const processedPapers = await processPapers(data);
        const { renderPapers } = await import('../papers.js');
        renderPapers(processedPapers);

        // Switch to papers view
        if (loadJsonSection) loadJsonSection.style.display = 'none';
        if (saveJsonSection) saveJsonSection.style.display = 'block';
        if (exportResetSection) exportResetSection.style.display = 'block';
        if (papersSection) papersSection.style.display = 'block';
        showStatus(`Loaded ${processedPapers.length} papers successfully`);
        setTimeout(hideStatus, 3000);

    } catch (err) {
        showError(err.message);
        if (papersList) {
            papersList.innerHTML = '';
        }
    }
}
