// GitHub Gist CRUD operations

import { getSessionId } from './auth.js';
import { WORKER_BASE_URL } from './state.js';

// DOM Elements - declared as let, initialized in initDOM()
let loadGistSelector;
let saveGistSelector;
let loadFromGistCollectionBtn;
let saveToGistOptionBtn;
let gistNotConnected;
let gistConnectedContent;
let saveGistNotConnected;
let saveGistConnectedContent;
let jsonFormatSelector;

// Initialize all DOM elements - must be called after DOM is ready
export function initDOM() {
    loadGistSelector = document.getElementById('loadGistSelector');
    saveGistSelector = document.getElementById('saveGistSelector');
    loadFromGistCollectionBtn = document.getElementById('loadFromGistCollectionBtn');
    saveToGistOptionBtn = document.getElementById('saveToGistOptionBtn');
    gistNotConnected = document.getElementById('gistNotConnected');
    gistConnectedContent = document.getElementById('gistConnectedContent');
    saveGistNotConnected = document.getElementById('saveGistNotConnected');
    saveGistConnectedContent = document.getElementById('saveGistConnectedContent');
    jsonFormatSelector = document.getElementById('jsonFormatSelector');

    console.log('[GitHub] DOM elements initialized');
}

/**
 * List user's gists
 */
export async function listGists() {
    console.log('[GitHub API] Listing user gists');
    const sessionId = getSessionId();
    const headers = {};
    if (sessionId) {
        headers['Authorization'] = `Bearer ${sessionId}`;
    }

    const res = await fetch(`${WORKER_BASE_URL}/api/github/gists`, {
        headers,
        credentials: 'include'
    });
    if (!res.ok) {
        const error = await res.json();
        console.error('[GitHub API] Failed to list gists:', error);
        throw new Error(error.error || 'Failed to fetch gists');
    }
    const gists = await res.json();
    console.log('[GitHub API] Listed gists:', gists.length);
    return gists;
}

/**
 * Get specific gist content
 */
export async function getGist(gistId) {
    console.log('[GitHub API] Getting gist:', gistId);
    const sessionId = getSessionId();
    const headers = {};
    if (sessionId) {
        headers['Authorization'] = `Bearer ${sessionId}`;
    }

    const res = await fetch(`${WORKER_BASE_URL}/api/github/gists/${gistId}`, {
        headers,
        credentials: 'include'
    });
    if (!res.ok) {
        const error = await res.json();
        console.error('[GitHub API] Failed to get gist:', gistId, error);
        throw new Error(error.error || 'Failed to fetch gist');
    }
    const gist = await res.json();
    console.log('[GitHub API] Got gist:', gistId);
    return gist;
}

/**
 * Create new gist
 */
export async function createGist(files, description = 'Argonaut Papers') {
    console.log('[GitHub API] Creating new gist with description:', description);
    const sessionId = getSessionId();
    const headers = {
        'Content-Type': 'application/json'
    };
    if (sessionId) {
        headers['Authorization'] = `Bearer ${sessionId}`;
    }

    const res = await fetch(`${WORKER_BASE_URL}/api/github/gists`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ description, public: false, files }),
        credentials: 'include'
    });
    if (!res.ok) {
        const error = await res.json();
        console.error('[GitHub API] Failed to create gist:', error);
        throw new Error(error.error || 'Failed to create gist');
    }
    const gist = await res.json();
    console.log('[GitHub API] Created gist:', gist.id);
    return gist;
}

/**
 * Update existing gist
 */
export async function updateGist(gistId, files, description = 'Argonaut Papers') {
    console.log('[GitHub API] Updating gist:', gistId);
    const sessionId = getSessionId();
    const headers = {
        'Content-Type': 'application/json'
    };
    if (sessionId) {
        headers['Authorization'] = `Bearer ${sessionId}`;
    }

    const res = await fetch(`${WORKER_BASE_URL}/api/github/gists/${gistId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ description, files }),
        credentials: 'include'
    });
    if (!res.ok) {
        const error = await res.json();
        console.error('[GitHub API] Failed to update gist:', gistId, error);
        throw new Error(error.error || 'Failed to update gist');
    }
    const gist = await res.json();
    console.log('[GitHub API] Updated gist:', gistId);
    return gist;
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
        const { showError } = await import('./ui.js');
        showError('Please select a gist to load from');
        return;
    }

    console.log('[GitHub Gist] Loading from gist:', gistId);
    loadFromGistCollectionBtn.classList.add('loading');
    const { showStatus } = await import('./ui.js');
    showStatus('Loading from Gist...');

    try {
        const gist = await getGist(gistId);

        // Find papers.json file in gist
        const papersFile = Object.values(gist.files).find(f => f.filename === 'papers.json');

        if (!papersFile) {
            console.log('[GitHub Gist] No papers.json found in gist');
            const { showError } = await import('./ui.js');
            showError('Selected gist does not contain a papers.json file');
            const { hideStatus } = await import('./ui.js');
            hideStatus();
            loadFromGistCollectionBtn.classList.remove('loading');
            return;
        }

        // Parse JSON
        const data = JSON.parse(papersFile.content);
        console.log('[GitHub Gist] Loaded', Object.keys(data).length, 'papers from gist');

        // Clear current data and load new data
        const { clearCurrentData } = await import('./ui.js');
        clearCurrentData();
        const { store } = await import('./state.js');
        store.set({ papersData: data });

        // Process and display papers
        const { processPapers } = await import('./papers.js');
        const processedPapers = await processPapers(data);
        const { renderPapers } = await import('./papers.js');
        renderPapers(processedPapers);

        // Switch to papers view
        loadJsonSection.style.display = 'none';
        saveJsonSection.style.display = 'block';
        exportResetSection.style.display = 'block';
        papersSection.style.display = 'block';

        showStatus(`Loaded ${Object.keys(data).length} papers from Gist`);
        setTimeout(hideStatus, 3000);
        console.log('[GitHub Gist] Successfully loaded papers from gist:', gistId);
    } catch (err) {
        console.error('[GitHub Gist] Error loading from gist:', err);
        const { showError } = await import('./ui.js');
        showError('Error loading from Gist: ' + err.message);
        const { hideStatus } = await import('./ui.js');
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
        const { showError } = await import('./ui.js');
        showError('Please select a gist to save to');
        return;
    }

    saveToGistOptionBtn.classList.add('loading');
    const { showStatus } = await import('./ui.js');
    showStatus('Saving to Gist...');

    try {
        const { state } = await import('./state.js');
        if (!state.papersData || Object.keys(state.papersData).length === 0) {
            console.log('[GitHub Gist] No papers to save');
            const { showError } = await import('./ui.js');
            showError('No papers to save');
            const { hideStatus } = await import('./ui.js');
            hideStatus();
            saveToGistOptionBtn.classList.remove('loading');
            return;
        }

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

        const jsonStr = JSON.stringify(dataToSave, null, 2);
        const files = { 'papers.json': { content: jsonStr } };
        console.log('[GitHub Gist] Saving', Object.keys(dataToSave).length, 'papers');

        if (gistId === 'new') {
            console.log('[GitHub Gist] Creating new gist');
            // Prompt user for gist name
            const gistName = prompt('Enter a name for your new gist:', 'Argonaut Papers');
            if (gistName === null) {
                // User cancelled
                const { hideStatus } = await import('./ui.js');
                hideStatus();
                saveToGistOptionBtn.classList.remove('loading');
                return;
            }
            const description = gistName.trim() || 'Argonaut Papers';
            const gist = await createGist(files, description);
            console.log('[GitHub Gist] Created gist:', gist.id);
            const { showStatus } = await import('./ui.js');
            showStatus('Created new Gist successfully');

            // Reload gist options for save selector
            await loadGistOptionsForSaveSelector();
        } else {
            console.log('[GitHub Gist] Updating existing gist:', gistId);
            await updateGist(gistId, files);
            console.log('[GitHub Gist] Updated gist:', gistId);
            const { showStatus } = await import('./ui.js');
            showStatus('Saved to Gist successfully');
        }

        setTimeout(async () => {
            const { hideStatus } = await import('./ui.js');
            hideStatus();
        }, 3000);
    } catch (err) {
        console.error('[GitHub Gist] Error saving to gist:', err);
        const { showError } = await import('./ui.js');
        showError('Error saving to Gist: ' + err.message);
        const { hideStatus } = await import('./ui.js');
        hideStatus();
    } finally {
        saveToGistOptionBtn.classList.remove('loading');
    }
}

// Event listeners
if (loadFromGistCollectionBtn) {
    loadFromGistCollectionBtn.addEventListener('click', loadFromGistCollection);
}

if (saveToGistOptionBtn) {
    saveToGistOptionBtn.addEventListener('click', saveToGistCollection);
}