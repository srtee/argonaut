// GitHub Gist CRUD operations

import { listGists as clientListGists, getGist as clientGetGist, createGist as clientCreateGist, updateGist as clientUpdateGist } from './clients/index.js';
import { get, getMultiple } from './dom.js';
import { convertToDoiIndexed } from './utils.js';
import { showPapersState } from './ui/visibility.js';
// DOM Elements - via registry
let loadGistSelector;
let saveGistSelector;
let loadFromGistCollectionBtn;
let saveToGistOptionBtn;
let gistConnectedContent;
let saveGistConnectedContent;
let includeBibInfo;
let includeAbstracts;

// Initialize all DOM elements - must be called after DOM is ready
export function initDOM() {
    const elements = getMultiple(
        'loadGistSelector',
        'saveGistSelector',
        'loadFromGistCollectionBtn',
        'saveToGistOptionBtn',
        'gistConnectedContent',
        'saveGistConnectedContent',
        'includeBibInfo',
        'includeAbstracts'
    );

    loadGistSelector = elements.loadGistSelector;
    saveGistSelector = elements.saveGistSelector;
    loadFromGistCollectionBtn = elements.loadFromGistCollectionBtn;
    saveToGistOptionBtn = elements.saveToGistOptionBtn;
    gistConnectedContent = elements.gistConnectedContent;
    saveGistConnectedContent = elements.saveGistConnectedContent;
    includeBibInfo = elements.includeBibInfo;
    includeAbstracts = elements.includeAbstracts;

    // Add event listeners after elements are assigned
    if (loadFromGistCollectionBtn) {
        loadFromGistCollectionBtn.addEventListener('click', loadFromGistCollection);
    }
    if (saveToGistOptionBtn) {
        saveToGistOptionBtn.addEventListener('click', saveToGistCollection);
    }

    console.log('[GitHub] DOM elements initialized');
}

/**
 * List user's gists (uses client internally)
 */
export async function listGists() {
    return clientListGists();
}

/**
 * Get specific gist content (uses client internally)
 */
export async function getGist(gistId) {
    return clientGetGist(gistId);
}

/**
 * Create new gist (uses client internally)
 */
export async function createGist(files, description = 'Argonaut Papers') {
    return clientCreateGist(files, description);
}

/**
 * Update existing gist (uses client internally)
 */
export async function updateGist(gistId, files, description = 'Argonaut Papers') {
    return clientUpdateGist(gistId, files, description);
}

/**
 * Load gist options for the Load JSON Collection section
 */
export async function loadGistOptionsForLoadSelector() {
    console.log('[GitHub Gist] Loading gist options for load selector');
    try {
        const gists = await listGists();

        // Clear existing options
        if (loadGistSelector) {
            loadGistSelector.innerHTML = '';

            if (gists.length === 0) {
                console.log('[GitHub Gist] No gists found');
                loadGistSelector.innerHTML = '<option value="">No gists found</option>';
                return;
            }

            // Add options for each gist
            gists.forEach(gist => {
                const option = document.createElement('option');
                option.value = gist.id;
                // Use description or first filename as label
                const label = gist.description || Object.keys(gist.files)[0] || 'Unnamed gist';
                option.textContent = label;
                loadGistSelector.appendChild(option);
            });

            console.log('[GitHub Gist] Loaded', gists.length, 'gist options for load selector');
        }
    } catch (err) {
        console.error('[GitHub Gist] Error loading gists for load selector:', err);
        if (loadGistSelector) {
            loadGistSelector.innerHTML = '<option value="">Failed to load gists</option>';
        }
    }
}

/**
 * Load gist options for the Save JSON Collection section
 */
export async function loadGistOptionsForSaveSelector() {
    console.log('[GitHub Gist] Loading gist options for save selector');
    try {
        const gists = await listGists();

        // Clear existing options
        if (saveGistSelector) {
            saveGistSelector.innerHTML = '';

            // Add "(new gist)" as the first option
            const newGistOption = document.createElement('option');
            newGistOption.value = 'new';
            newGistOption.textContent = '(new gist)';
            saveGistSelector.appendChild(newGistOption);

            if (gists.length === 0) {
                console.log('[GitHub Gist] No existing gists found');
                return;
            }

            // Add options for each gist
            gists.forEach(gist => {
                const option = document.createElement('option');
                option.value = gist.id;
                // Use description or first filename as label
                const label = gist.description || Object.keys(gist.files)[0] || 'Unnamed gist';
                option.textContent = label;
                saveGistSelector.appendChild(option);
            });

            console.log('[GitHub Gist] Loaded', gists.length, 'gist options for save selector');
        }
    } catch (err) {
        console.error('[GitHub Gist] Error loading gists for save selector:', err);
        if (saveGistSelector) {
            saveGistSelector.innerHTML = '<option value="">Failed to load gists</option>';
        }
    }
}

/**
 * Load papers from selected gist in Load JSON Collection section
 */
export async function loadFromGistCollection() {
    console.log('[GitHub Gist] Loading from gist collection');
    const gistId = loadGistSelector.value;

    if (!gistId || gistId === 'Loading gists...' || gistId === 'No gists found' || gistId === 'Failed to load gists') {
        console.log('[GitHub Gist] Invalid gist selected');
        const { showError } = await import('./ui/index.js');
        showError('Please select a gist to load from');
        return;
    }

    console.log('[GitHub Gist] Loading from gist:', gistId);
    loadFromGistCollectionBtn.classList.add('loading');
    const { showStatus, hideStatus } = await import('./ui/index.js');
    showStatus('Loading from Gist...');

    try {
        const gist = await getGist(gistId);

        // Find papers.json file in gist
        const papersFile = Object.values(gist.files).find(f => f.filename === 'papers.json');

        if (!papersFile) {
            console.log('[GitHub Gist] No papers.json found in gist');
            const { showError } = await import('./ui/index.js');
            showError('Selected gist does not contain a papers.json file');
            const { hideStatus } = await import('./ui/index.js');
            hideStatus();
            loadFromGistCollectionBtn.classList.remove('loading');
            return;
        }

        // Parse JSON
        const data = JSON.parse(papersFile.content);
        console.log('[GitHub Gist] Loaded', Object.keys(data).length, 'papers from gist');

        // Convert to DOI-indexed format if needed
        const convertedData = convertToDoiIndexed(data);

        // Clear current data and load new data
        const { clearCurrentData } = await import('./ui/index.js');
        clearCurrentData();
        const { store } = await import('./state.js');
        store.set({ papersData: convertedData });

        // Process and display papers
        const { processPapers } = await import('./papers.js');
        const processedPapers = await processPapers(data);
        const { renderPapers } = await import('./papers.js');
        renderPapers(processedPapers);

        // Switch to papers view using centralized visibility
        showPapersState();

        showStatus(`Loaded ${Object.keys(data).length} papers from Gist`);
        setTimeout(hideStatus, 3000);
        console.log('[GitHub Gist] Successfully loaded papers from gist:', gistId);
    } catch (err) {
        console.error('[GitHub Gist] Error loading from gist:', err);
        const { showError } = await import('./ui/index.js');
        showError('Error loading from Gist: ' + err.message);
        const { hideStatus } = await import('./ui/index.js');
        hideStatus();
    } finally {
        loadFromGistCollectionBtn.classList.remove('loading');
    }
}

/**
 * Save papers to gist from Save JSON Collection section
 */
export async function saveToGistCollection() {
    console.log('[GitHub Gist] Saving papers to gist from Save JSON Collection');
    const gistId = saveGistSelector.value;

    if (!gistId || gistId === 'Loading gists...' || gistId === 'No gists found' || gistId === 'Failed to load gists') {
        console.log('[GitHub Gist] Invalid gist selected');
        const { showError } = await import('./ui/index.js');
        showError('Please select a gist to save to');
        return;
    }

    saveToGistOptionBtn.classList.add('loading');
    const { showStatus } = await import('./ui/index.js');
    showStatus('Saving to Gist...');

    try {
        const { state } = await import('./state.js');
        if (!state.papersData || Object.keys(state.papersData).length === 0) {
            console.log('[GitHub Gist] No papers to save');
            const { showError } = await import('./ui/index.js');
            showError('No papers to save');
            const { hideStatus } = await import('./ui/index.js');
            hideStatus();
            saveToGistOptionBtn.classList.remove('loading');
            return;
        }

        // Get checkbox values
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

        // Pass raw data object - jsonRequest will stringify it
        const files = { 'papers.json': dataToSave };
        console.log('[GitHub Gist] Saving', Object.keys(dataToSave).length, 'papers');

        if (gistId === 'new') {
            console.log('[GitHub Gist] Creating new gist');
            // Prompt user for gist name
            const gistName = prompt('Enter a name for your new gist:', 'Argonaut Papers');
            if (gistName === null) {
                // User cancelled
                const { hideStatus } = await import('./ui/index.js');
                hideStatus();
                saveToGistOptionBtn.classList.remove('loading');
                return;
            }
            const description = gistName.trim() || 'Argonaut Papers';
            const gist = await createGist(files, description);
            console.log('[GitHub Gist] Created gist:', gist.id);
            const { showStatus } = await import('./ui/index.js');
            showStatus('Created new Gist successfully');

            // Reload gist options for save selector
            await loadGistOptionsForSaveSelector();
        } else {
            console.log('[GitHub Gist] Updating existing gist:', gistId);
            await updateGist(gistId, files);
            console.log('[GitHub Gist] Updated gist:', gistId);
            const { showStatus } = await import('./ui/index.js');
            showStatus('Saved to Gist successfully');
        }

        setTimeout(async () => {
            const { hideStatus } = await import('./ui/index.js');
            hideStatus();
        }, 3000);
    } catch (err) {
        console.error('[GitHub Gist] Error saving to gist:', err);
        const { showError } = await import('./ui/index.js');
        // Provide more helpful error messages for common issues
        let errorMessage = err.message;
        if (err.message === 'NetworkError when attempting to fetch resource.' || err.name === 'NetworkError') {
            errorMessage = 'Unable to connect to GitHub. Please check your internet connection and try again.';
        } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
            errorMessage = 'Your session has expired. Please log in again.';
        } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
            errorMessage = 'Access denied. Please check your GitHub permissions.';
        }
        showError('Error saving to Gist: ' + errorMessage);
        const { hideStatus } = await import('./ui/index.js');
        hideStatus();
    } finally {
        saveToGistOptionBtn.classList.remove('loading');
    }
}

// Event listeners - added inside initDOM() after elements are assigned