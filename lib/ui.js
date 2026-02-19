// UI concerns - theme, onboarding, tag editing, storage, export, file ops

import { state, store } from './state.js';
import { getSessionId } from './auth.js';
import { listGists } from './github.js';

// DOM Elements - Main sections
const loadJsonSection = document.getElementById('loadJsonSection');
const saveJsonSection = document.getElementById('saveJsonSection');
const papersSection = document.getElementById('papersSection');
const exportResetSection = document.getElementById('exportResetSection');
const papersList = document.getElementById('papersList');
const fileInput = document.getElementById('fileInput');
const urlInput = document.getElementById('urlInput');
const loadUrlBtn = document.getElementById('loadUrlBtn');
const loadFromStorageBtn = document.getElementById('loadFromStorageBtn');
const loadNewBtn = document.getElementById('loadNewBtn');
const saveToStorageBtn = document.getElementById('saveToStorageBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const exportBibtexAllBtn = document.getElementById('exportBibtexAllBtn');
const exportBibtexTaggedBtn = document.getElementById('exportBibtexTaggedBtn');
const error = document.getElementById('error');
const status = document.getElementById('status');

// Save JSON Collection Elements
const jsonFormatSelector = document.getElementById('jsonFormatSelector');
const saveMethodFile = document.getElementById('saveMethodFile');
const saveMethodStorage = document.getElementById('saveMethodStorage');
const saveMethodGist = document.getElementById('saveMethodGist');

// GitHub Load/Save Gist Elements
const gistNotConnected = document.getElementById('gistNotConnected');
const gistConnectedContent = document.getElementById('gistConnectedContent');
const saveGistNotConnected = document.getElementById('saveGistNotConnected');
const saveGistConnectedContent = document.getElementById('saveGistConnectedContent');

// Theme elements
const themeToggle = document.getElementById('themeToggle');
const sunIcon = document.querySelector('.sun-icon');
const moonIcon = document.querySelector('.moon-icon');
const THEME_KEY = 'theme';

// Onboarding elements
const onboardingModal = document.getElementById('onboardingModal');
const closeOnboardingBtn = document.getElementById('closeOnboardingBtn');
const onboardingBackBtn = document.getElementById('onboardingBackBtn');
const onboardingNextBtn = document.getElementById('onboardingNextBtn');
const onboardingCompleteBtn = document.getElementById('onboardingCompleteBtn');
const showOnboardingBtn = document.getElementById('showOnboardingBtn');
const onboardingSteps = document.querySelectorAll('.onboarding-step');
const onboardingDots = document.querySelectorAll('.onboarding-dot');
let currentStep = 0;
const totalSteps = 6;

// ========== Theme Functions ==========

/**
 * Update theme icons based on dark mode
 */
export function updateThemeIcons(isDark) {
    if (sunIcon) sunIcon.style.display = isDark ? 'block' : 'none';
    if (moonIcon) moonIcon.style.display = isDark ? 'none' : 'block';
}

/**
 * Get system color scheme preference
 */
export function getSystemPreference() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get stored theme from localStorage
 */
export function getStoredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark') return 'dark';
    if (stored === 'light') return 'light';
    return null;
}

/**
 * Set the theme
 */
export function setTheme(theme) {
    const isDark = theme === 'dark';
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem(THEME_KEY, theme);
    updateThemeIcons(isDark);
}

/**
 * Initialize theme on page load
 */
export function initTheme() {
    const storedTheme = getStoredTheme();
    if (storedTheme) {
        setTheme(storedTheme);
    } else {
        const isDark = getSystemPreference();
        // Set initial theme without saving to localStorage
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        updateThemeIcons(isDark);
    }
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
        setTheme(e.matches ? 'dark' : 'light');
    }
});

// Initialize theme on page load
initTheme();

// ========== Tag Functions ==========

/**
 * Toggle tag selection and filter papers
 */
export function toggleTag(tag) {
    const newTags = [...state.selectedTags];
    const index = newTags.indexOf(tag);
    if (index > -1) {
        newTags.splice(index, 1); // Remove
    } else {
        newTags.push(tag); // Add
    }
    store.setSelectedTags(newTags);
    import('./papers.js').then(({ applyTagFilter }) => {
        applyTagFilter();
        updateExportButtonStates();
    });
}

/**
 * Update disabled state of export buttons based on tag selection
 */
export function updateExportButtonStates() {
    if (exportBibtexTaggedBtn) {
        exportBibtexTaggedBtn.disabled = state.selectedTags.size === 0;
    }
}

// ========== Helper Functions ==========

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show error message
 */
export function showError(message) {
    error.textContent = message;
    error.classList.add('visible');
    setTimeout(() => {
        error.classList.remove('visible');
    }, 5000);
}

/**
 * Show status message
 */
export function showStatus(message) {
    status.textContent = message;
    status.classList.add('visible');
}

/**
 * Hide status message
 */
export function hideStatus() {
    status.classList.remove('visible');
}

/**
 * Hide error message
 */
export function hideError() {
    error.classList.remove('visible');
}

// ========== File Save Functions ==========

/**
 * Save file using File System Access API with fallback
 */
export async function saveFileWithPicker(content, defaultFilename, mimeType) {
    // Check if File System Access API is supported
    if ('showSaveFilePicker' in window) {
        try {
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: defaultFilename,
                types: [{
                    description: getMimeTypeDescription(mimeType),
                    accept: { [mimeType]: getMimeTypeExtensions(mimeType) }
                }]
            });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            return true;
        } catch (err) {
            // User cancelled the dialog - not an error
            if (err.name === 'AbortError') {
                return false;
            }
            throw err;
        }
    } else {
        // Fallback for browsers without File System Access API
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFilename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    }
}

/**
 * Get file description based on MIME type
 */
export function getMimeTypeDescription(mimeType) {
    switch (mimeType) {
        case 'application/json':
            return 'JSON File';
        case 'text/plain':
        case 'text/x-bibtex':
            return 'BibTeX File';
        default:
            return 'File';
    }
}

/**
 * Get file extensions based on MIME type
 */
export function getMimeTypeExtensions(mimeType) {
    switch (mimeType) {
        case 'application/json':
            return ['.json'];
        case 'text/plain':
        case 'text/x-bibtex':
            return ['.bib', '.txt'];
        default:
            return ['.*'];
    }
}

// ========== Data Management Functions ==========

/**
 * Clear current papers data
 */
export function clearCurrentData() {
    store.set({
        papersData: {},
        selectedTags: new Set(),
        processedPapersData: []
    });
    papersList.innerHTML = '';
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
export function loadFromStorage() {
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
        import('./papers.js').then(({ displayPapers }) => {
            displayPapers();
        });
        showStatus(`Loaded ${Object.keys(data).length} papers from browser storage`);
    } catch (err) {
        console.error('Error loading from storage:', err);
        showError('Error loading from storage: ' + err.message);
    }
}

// ========== Export Functions ==========

/**
 * Export papers data as JSON
 */
export async function exportJSON() {
    if (!state.papersData || Object.keys(state.papersData).length === 0) {
        showError('No papers to export');
        return;
    }

    try {
        // Get the format (full or light)
        const format = jsonFormatSelector ? jsonFormatSelector.value : 'full';
        let dataToSave = state.papersData;
        let filename = 'papers.json';

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
            filename = 'papers-light.json';
        }

        const jsonStr = JSON.stringify(dataToSave, null, 2);
        const saved = await saveFileWithPicker(jsonStr, filename, 'application/json');
        if (saved) {
            showStatus('JSON exported successfully');
        }
    } catch (err) {
        console.error('Error exporting JSON:', err);
        showError('Error exporting JSON: ' + err.message);
    }
}

/**
 * Export papers data as JSON (light version)
 */
export async function exportJSONLight() {
    if (!state.papersData || Object.keys(state.papersData).length === 0) {
        showError('No papers to export');
        return;
    }

    try {
        const lightData = {};
        for (const [key, paper] of Object.entries(state.papersData)) {
            lightData[key] = {
                _doi: paper._doi,
                _comments: paper._comments,
                _tags: paper._tags,
                _alsoread: paper._alsoread
            };
        }
        const jsonStr = JSON.stringify(lightData, null, 2);
        const saved = await saveFileWithPicker(jsonStr, 'papers-light.json', 'application/json');
        if (saved) {
            showStatus('JSON (light) exported successfully');
        }
    } catch (err) {
        console.error('Error exporting JSON (light):', err);
        showError('Error exporting JSON (light): ' + err.message);
    }
}

/**
 * Export papers as BibTeX
 */
export async function exportBibTeX() {
    if (!state.papersData || Object.keys(state.papersData).length === 0) {
        showError('No papers to export');
        return;
    }

    try {
        const { fetchBibTeX, fetchPagesFromCrossref, addPagesToBibTeX, parseBibTeX } = await import('./papers.js');

        showStatus('Fetching BibTeX entries...');

        const entries = Object.entries(state.papersData);
        let bibtexContent = '';

        for (let i = 0; i < entries.length; i++) {
            const [key, paper] = entries[i];
            status.textContent = `Fetching BibTeX ${i + 1} of ${entries.length}: ${key}`;
            await new Promise(resolve => setTimeout(resolve, 0));

            if (paper._doi) {
                let bibtex = await fetchBibTeX(paper._doi);
                if (bibtex) {
                    // Check if BibTeX has page numbers
                    const parsed = parseBibTeX(bibtex);
                    let pages = parsed.pages;

                    if (!pages) {
                        // Try Crossref API for page numbers
                        pages = await fetchPagesFromCrossref(paper._doi);
                    }

                    if (pages) {
                        bibtex = addPagesToBibTeX(bibtex, pages);
                    }

                    bibtexContent += bibtex + '\n\n';
                } else {
                    // Fallback entry if BibTeX fetch fails
                    bibtexContent += `@misc{${key.replace(/\s+/g, '')},\n  title = {${key}},\n  doi = {${paper._doi}}\n}\n\n`;
                }
            } else {
                // Fallback entry for papers without DOI
                bibtexContent += `@misc{${key.replace(/\s+/g, '')},\n  title = {${key}}\n}\n\n`;
            }

            // Rate limiting
            if (i < entries.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const saved = await saveFileWithPicker(bibtexContent, 'papers.bib', 'text/x-bibtex');
        if (saved) {
            showStatus(`BibTeX exported successfully (${entries.length} entries)`);
        }
    } catch (err) {
        console.error('Error exporting BibTeX:', err);
        showError('Error exporting BibTeX: ' + err.message);
    }
}

/**
 * Export papers with selected tags as BibTeX
 */
export async function exportBibTeXTagged() {
    if (!state.papersData || Object.keys(state.papersData).length === 0) {
        showError('No papers to export');
        return;
    }

    if (state.selectedTags.size === 0) {
        showError('Please select at least one tag first');
        return;
    }

    try {
        const { fetchBibTeX, fetchPagesFromCrossref, addPagesToBibTeX, parseBibTeX } = await import('./papers.js');

        showStatus('Fetching BibTeX entries for tagged papers...');

        // Filter entries to only include papers with selected tags
        const entries = Object.entries(state.papersData).filter(([key, paper]) => {
            const paperTags = paper._tags || [];
            return paperTags.some(tag => state.selectedTags.has(tag));
        });

        if (entries.length === 0) {
            showError('No papers found with the selected tags');
            return;
        }

        let bibtexContent = '';

        for (let i = 0; i < entries.length; i++) {
            const [key, paper] = entries[i];
            status.textContent = `Fetching BibTeX ${i + 1} of ${entries.length}: ${key}`;
            await new Promise(resolve => setTimeout(resolve, 0));

            if (paper._doi) {
                let bibtex = await fetchBibTeX(paper._doi);
                if (bibtex) {
                    // Check if BibTeX has page numbers
                    const parsed = parseBibTeX(bibtex);
                    let pages = parsed.pages;

                    if (!pages) {
                        // Try Crossref API for page numbers
                        pages = await fetchPagesFromCrossref(paper._doi);
                    }

                    if (pages) {
                        bibtex = addPagesToBibTeX(bibtex, pages);
                    }

                    bibtexContent += bibtex + '\n\n';
                } else {
                    // Fallback entry if BibTeX fetch fails
                    bibtexContent += `@misc{${key.replace(/\s+/g, '')},\n  title = {${key}},\n  doi = {${paper._doi}}\n}\n\n`;
                }
            } else {
                // Fallback entry for papers without DOI
                bibtexContent += `@misc{${key.replace(/\s+/g, '')},\n  title = {${key}}\n}\n\n`;
            }

            // Rate limiting
            if (i < entries.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const saved = await saveFileWithPicker(bibtexContent, 'papers-tagged.bib', 'text/x-bibtex');
        if (saved) {
            showStatus(`BibTeX exported successfully (${entries.length} entries with selected tags)`);
        }
    } catch (err) {
        console.error('Error exporting BibTeX:', err);
        showError('Error exporting BibTeX: ' + err.message);
    }
}

// ========== Load Functions ==========

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
    hideStatus();
    papersList.innerHTML = '<p class="loading">Loading papers...</p>';

    try {
        let data;

        switch (method) {
            case 'file':
                if (!fileInput.files[0]) {
                    throw new Error('Please select a file');
                }
                showStatus('Loading papers from file...');
                data = await loadFromFile(fileInput.files[0]);
                break;
            case 'url':
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

        const { processPapers } = await import('./papers.js');
        const processedPapers = await processPapers(data);
        const { renderPapers } = await import('./papers.js');
        renderPapers(processedPapers);

        // Switch to papers view
        loadJsonSection.style.display = 'none';
        saveJsonSection.style.display = 'block';
        exportResetSection.style.display = 'block';
        papersSection.style.display = 'block';
        showStatus(`Loaded ${processedPapers.length} papers successfully`);
        setTimeout(hideStatus, 3000);

    } catch (err) {
        showError(err.message);
        papersList.innerHTML = '';
    }
}

// ========== Input Options ==========

/**
 * Update input option UI state
 */
export function updateInputOptionUI(selectedValue) {
    console.log('updateInputOptionUI: selectedValue =', selectedValue);

    // Hide all option contents and remove active class
    document.querySelectorAll('.input-option').forEach(option => {
        option.classList.remove('active');
        const content = option.querySelector('.input-option-content');
        if (content) {
            content.style.display = 'none';
        }
    });

    // Show the selected option
    const selectedOption = document.querySelector(`.input-option[data-input="${selectedValue}"]`);
    console.log('updateInputOptionUI: selectedOption =', selectedOption);

    if (selectedOption) {
        selectedOption.classList.add('active');
        const selectedContent = selectedOption.querySelector('.input-option-content');
        console.log('updateInputOptionUI: selectedContent =', selectedContent);
        if (selectedContent) {
            selectedContent.style.display = 'block';
        }

        // Load gist options if "gist" is selected and user is authenticated
        if (selectedValue === 'gist' && getSessionId()) {
            import('./github.js').then(({ loadGistOptionsForLoadSelector }) => {
                loadGistOptionsForLoadSelector();
            });
            import('./auth.js').then(({ updateGistVisibility }) => {
                updateGistVisibility();
            });
        }
    }
}

/**
 * Initialize input option state on page load
 */
export function initInputOptions() {
    const selectedRadio = document.querySelector('input[name="inputMethod"]:checked');
    console.log('initInputOptions: selectedRadio =', selectedRadio?.id);

    if (selectedRadio) {
        // Update UI state directly to ensure proper display
        updateInputOptionUI(selectedRadio.value);
    } else {
        // Default to "url" if nothing is selected
        const urlRadio = document.getElementById('inputMethodUrl');
        if (urlRadio) {
            urlRadio.checked = true;
            updateInputOptionUI('url');
        }
    }

    // Check for inputURL parameter and auto-load
    checkInputURLParameter();
}

/**
 * Check for inputURL parameter and auto-load
 */
function checkInputURLParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const inputURL = urlParams.get('inputURL');

    if (inputURL) {
        console.log('[URL Parameter] Found inputURL:', inputURL);
        // Update the URL input field
        if (urlInput) {
            urlInput.value = inputURL;
        }
        // Select the URL option
        const urlRadio = document.getElementById('inputMethodUrl');
        if (urlRadio) {
            urlRadio.checked = true;
            updateInputOptionUI('url');
        }
        // Auto-load the papers
        setTimeout(() => {
            loadPapers('url');
        }, 100);
        // Clean up URL parameter after loading
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Input option switching
document.querySelectorAll('input[name="inputMethod"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        updateInputOptionUI(e.target.value);
    });
});

// ========== Save Options ==========

/**
 * Update save option UI state
 */
export function updateSaveOptionUI(selectedValue) {
    console.log('updateSaveOptionUI: selectedValue =', selectedValue);

    // Hide all option contents and remove active class
    document.querySelectorAll('.save-option').forEach(option => {
        option.classList.remove('active');
        const content = option.querySelector('.save-option-content');
        if (content) {
            content.style.display = 'none';
        }
    });

    // Show the selected option
    const selectedOption = document.querySelector(`.save-option[data-save="${selectedValue}"]`);
    console.log('updateSaveOptionUI: selectedOption =', selectedOption);

    if (selectedOption) {
        selectedOption.classList.add('active');
        const selectedContent = selectedOption.querySelector('.save-option-content');
        console.log('updateSaveOptionUI: selectedContent =', selectedContent);
        if (selectedContent) {
            selectedContent.style.display = 'block';
        }

        // Load gist options if "gist" is selected and user is authenticated
        if (selectedValue === 'gist' && getSessionId()) {
            import('./github.js').then(({ loadGistOptionsForSaveSelector }) => {
                loadGistOptionsForSaveSelector();
            });
            import('./auth.js').then(({ updateSaveGistVisibility }) => {
                updateSaveGistVisibility();
            });
        }
    }
}

/**
 * Initialize save option state on page load
 */
export function initSaveOptions() {
    const selectedRadio = document.querySelector('input[name="saveMethod"]:checked');
    console.log('initSaveOptions: selectedRadio =', selectedRadio?.id);

    if (selectedRadio) {
        // Update UI state directly to ensure proper display
        updateSaveOptionUI(selectedRadio.value);
    } else {
        // Default to "file" if nothing is selected
        const fileRadio = document.getElementById('saveMethodFile');
        if (fileRadio) {
            fileRadio.checked = true;
            updateSaveOptionUI('file');
        }
    }
}

// Add event listeners for save method radio buttons
document.querySelectorAll('input[name="saveMethod"]').forEach(radio => {
    radio.addEventListener('change', () => updateSaveOptionUI(radio.value));
});

// Initialize options on page load
initInputOptions();
initSaveOptions();

// ========== Event Listeners ==========

// File input handler
fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) {
        loadPapers('file');
    }
});

// URL load button handler
loadUrlBtn.addEventListener('click', () => loadPapers('url'));

// Load from browser storage button handler
if (loadFromStorageBtn) {
    loadFromStorageBtn.addEventListener('click', loadFromStorage);
}

// Reset All button
loadNewBtn.addEventListener('click', () => {
    // Show confirmation dialog
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
        // Clear all data
        store.setSelectedTags([]);
        store.set({
            papersData: {},
            processedPapersData: []
        });

        // Hide papers and export sections, show load section
        papersSection.style.display = 'none';
        saveJsonSection.style.display = 'none';
        exportResetSection.style.display = 'none';
        loadJsonSection.style.display = 'block';
        papersList.innerHTML = '';
        fileInput.value = '';
        urlInput.value = 'https://gist.githubusercontent.com/srtee/04ee671f6f27d64de800f00eb9280a21/raw/papers.json';
        hideStatus();
    }
});

// Save to browser storage button
if (saveToStorageBtn) {
    saveToStorageBtn.addEventListener('click', saveToStorage);
}

// Export JSON button
if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', exportJSON);
}

// Export BibTeX (all) button
if (exportBibtexAllBtn) {
    exportBibtexAllBtn.addEventListener('click', exportBibTeX);
}

// Export BibTeX (only tagged) button
if (exportBibtexTaggedBtn) {
    exportBibtexTaggedBtn.addEventListener('click', exportBibTeXTagged);
}

// ========== Inline Tag Management ==========

/**
 * Check if there are unsaved changes
 */
function hasUnsavedChanges() {
    const paper = state.papersData[state.currentEditingKey];
    if (!paper) return false;
    const originalTags = paper._tags || [];
    const finalTags = [...state.tentativeTags];
    // Check if tags have changed
    if (originalTags.length !== finalTags.length) return true;
    for (let i = 0; i < originalTags.length; i++) {
        if (originalTags[i] !== finalTags[i]) return true;
    }
    return false;
}

/**
 * Open inline tag editing
 */
export function openTagDialog(key) {
    console.log('openTagDialog called with key:', key);

    // Prevent editing multiple papers at once
    if (state.currentEditingKey !== null && state.currentEditingKey !== key) {
        if (hasUnsavedChanges() && !confirm('You have unsaved changes. Discard them?')) {
            return;
        }
        closeTagDialog();
    }

    store.set({ currentEditingKey: key });
    const paper = state.papersData[key];
    if (!paper) {
        console.error('Paper not found for key:', key);
        return;
    }

    // Reset state
    store.set({
        tentativeTags: [],
        tentativeTagsRemoved: []
    });

    // Initialize tags from paper
    const existingTags = paper._tags || [];
    existingTags.forEach(tag => {
        // Ensure tag is a string (not an object)
        const tagString = typeof tag === 'object' ? JSON.stringify(tag) : String(tag);
        state.tentativeTags.push(tagString);
    });

    // Find the card and tags container
    const card = document.querySelector(`.paper-card[data-key="${key}"]`);
    if (!card) {
        console.error('Card not found for key:', key);
        return;
    }

    const tagsContainer = card.querySelector('.tags-container');
    if (!tagsContainer) {
        console.error('tags-container not found for key:', key);
        return;
    }

    // Add editing class for visual distinction
    tagsContainer.classList.add('editing');

    // Store original content
    tagsContainer.dataset.originalContent = tagsContainer.innerHTML;

    // Render inline editing interface
    renderInlineTagEditor(tagsContainer);
}

/**
 * Render inline tag editor
 */
function renderInlineTagEditor(tagsContainer) {
    console.log('renderInlineTagEditor called');

    // Build tags HTML
    let tagsHtml = '';
    if (state.tentativeTags.length === 0 && state.tentativeTagsRemoved.length === 0) {
        tagsHtml = '<p class="no-tags-message">No tags yet. Add your first tag above!</p>';
    } else {
        // Render active tags
        state.tentativeTags.forEach(tag => {
            tagsHtml += `<button type="button" class="edit-tag-item" data-tag="${tag}" aria-label="Remove tag: ${tag}">${tag} <span class="tag-remove">×</span></button>`;
        });
        // Render tentatively removed tags
        state.tentativeTagsRemoved.forEach(tag => {
            tagsHtml += `<button type="button" class="edit-tag-item tentatively-removed" data-tag="${tag}" aria-label="Restore tag: ${tag}">${tag} <span class="tag-restore">+</span></button>`;
        });
    }

    const html = `
        <div class="edit-controls">
            <div class="tag-add-container">
                <input type="text" class="tag-edit-input" placeholder="Add new tag..." aria-label="New tag name">
                <button type="button" class="add-edit-tag-btn">Add</button>
            </div>
            <div class="edit-tags-list" role="list" aria-label="Tags for this paper">
                ${tagsHtml}
            </div>
            <div class="edit-buttons">
                <button type="button" class="cancel-edit-tags-btn">Cancel</button>
                <button type="button" class="save-edit-tags-btn">Save Tag Changes</button>
            </div>
        </div>
    `;

    tagsContainer.innerHTML = html;

    // Focus the input
    const input = tagsContainer.querySelector('.tag-edit-input');
    if (input) {
        input.focus();
    }

    // Add event listeners for the inline editor
    setupInlineEditorListeners(tagsContainer);
}

/**
 * Setup event listeners for inline editor
 */
function setupInlineEditorListeners(tagsContainer) {
    console.log('setupInlineEditorListeners called');

    const input = tagsContainer.querySelector('.tag-edit-input');
    const addBtn = tagsContainer.querySelector('.add-edit-tag-btn');
    const cancelBtn = tagsContainer.querySelector('.cancel-edit-tags-btn');
    const saveBtn = tagsContainer.querySelector('.save-edit-tags-btn');

    console.log('Elements found:', { input, addBtn, cancelBtn, saveBtn });

    // Add tag button
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addInlineTag(tagsContainer);
        });
    } else {
        console.error('add-edit-tag-btn not found!');
    }

    // Enter key in input
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addInlineTag(tagsContainer);
            }
        });
    }

    // Cancel button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            // Check for unsaved changes before canceling
            if (hasUnsavedChanges()) {
                if (confirm('You have unsaved changes. Discard them?')) {
                    closeTagDialog();
                    import('./papers.js').then(({ applyTagFilter }) => {
                        applyTagFilter();
                    });
                }
            } else {
                closeTagDialog();
                import('./papers.js').then(({ applyTagFilter }) => {
                    applyTagFilter();
                });
            }
        });
    }

    // Save button
    if (saveBtn) {
        saveBtn.addEventListener('click', saveTagChanges);
    }

    // Tag item clicks (to toggle removal)
    tagsContainer.querySelectorAll('.edit-tag-item').forEach(tagItem => {
        tagItem.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent bubbling to document click handler
            const tag = tagItem.dataset.tag;
            const isRemoved = tagItem.classList.contains('tentatively-removed');

            if (isRemoved) {
                // Restore: move from removed back to active
                const index = state.tentativeTagsRemoved.indexOf(tag);
                if (index > -1) {
                    state.tentativeTagsRemoved.splice(index, 1);
                    state.tentativeTags.push(tag);
                }
            } else {
                // Remove: move from active to removed
                const index = state.tentativeTags.indexOf(tag);
                if (index > -1) {
                    state.tentativeTags.splice(index, 1);
                    state.tentativeTagsRemoved.push(tag);
                }
            }
            renderInlineTagEditor(tagsContainer);
        });
    });
}

/**
 * Add a tag in inline editor
 */
function addInlineTag(tagsContainer) {
    const input = tagsContainer.querySelector('.tag-edit-input');
    if (!input) return;

    const tagName = input.value.trim();
    if (!tagName) return;

    // Check if tag already exists
    if (state.tentativeTags.includes(tagName) || state.tentativeTagsRemoved.includes(tagName)) {
        showError('Tag already exists');
        return;
    }

    // Add to tentativeTags
    state.tentativeTags.push(tagName);

    // Clear input and re-render
    input.value = '';
    renderInlineTagEditor(tagsContainer);

    // Focus the input again
    const newInput = tagsContainer.querySelector('.tag-edit-input');
    if (newInput) newInput.focus();
}

/**
 * Close tag dialog (inline version)
 */
export function closeTagDialog({ restoreContent = true } = {}) {
    if (!restoreContent) {
        // Skip restoring content - just clear state
        store.set({
            currentEditingKey: null,
            tentativeTags: [],
            tentativeTagsRemoved: []
        });
        return;
    }

    if (state.currentEditingKey === null) return;

    const card = document.querySelector(`.paper-card[data-key="${state.currentEditingKey}"]`);
    if (card) {
        const tagsContainer = card.querySelector('.tags-container');
        if (tagsContainer && tagsContainer.dataset.originalContent) {
            // Restore original content
            tagsContainer.innerHTML = tagsContainer.dataset.originalContent;
            tagsContainer.classList.remove('editing');
            delete tagsContainer.dataset.originalContent;
        }
    }

    store.set({
        currentEditingKey: null,
        tentativeTags: [],
        tentativeTagsRemoved: []
    });
}

/**
 * Save tag changes (inline version)
 */
function saveTagChanges() {
    if (!state.currentEditingKey) return;

    const paper = state.papersData[state.currentEditingKey];

    // Final tags are just the active tags (tentativeTags)
    // Tags in tentativeTagsRemoved are not saved
    const finalTags = [...state.tentativeTags];

    // Calculate changes
    const originalTags = paper._tags || [];
    const tagsRemoved = originalTags.filter(t => !finalTags.includes(t));
    const tagsAdded = finalTags.filter(t => !originalTags.includes(t));

    // Build confirmation message
    let confirmMessage = `Save tag changes for "${paper.title || state.currentEditingKey}"?\n\n`;
    if (tagsAdded.length > 0) {
        confirmMessage += `Adding: ${tagsAdded.join(', ')}\n`;
    }
    if (tagsRemoved.length > 0) {
        confirmMessage += `Removing: ${tagsRemoved.join(', ')}\n`;
    }
    if (tagsAdded.length === 0 && tagsRemoved.length === 0) {
        confirmMessage += 'No changes to tags.';
    }
    confirmMessage += '\n\nThis action cannot be undone.';

    // Show confirmation
    if (confirm(confirmMessage)) {
        // Apply changes to papersData
        paper._tags = finalTags;

        // Update the paper reference in processedPapersData to ensure filtering works correctly
        const processedEntry = state.processedPapersData.find(entry => entry.key === state.currentEditingKey);
        if (processedEntry) {
            processedEntry.paper = state.papersData[state.currentEditingKey];
        }

        // Re-render paper cards
        import('./papers.js');
        applyTagFilter();

        showStatus('Tags updated successfully');
    }

    closeTagDialog({ restoreContent: false });
}

// Event listeners for inline tag editing
papersList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-tags-btn');
    if (editBtn) {
        e.stopPropagation();
        const key = editBtn.dataset.key;
        console.log('Edit button clicked, key:', key);
        openTagDialog(key);
    }
});

// Escape key to close inline editor
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.currentEditingKey !== null) {
        if (hasUnsavedChanges()) {
            if (confirm('You have unsaved changes. Discard them?')) {
                closeTagDialog();
                import('./papers.js');
                applyTagFilter();
            }
        } else {
            closeTagDialog();
            import('./papers.js');
            applyTagFilter();
        }
    }
});

// Click outside to close inline editor
document.addEventListener('click', (e) => {
    console.log('document click handler, currentEditingKey:', state.currentEditingKey);
    if (state.currentEditingKey !== null) {
        const card = document.querySelector(`.paper-card[data-key="${state.currentEditingKey}"]`);
        if (card) {
            const tagsContainer = card.querySelector('.tags-container');
            console.log('click-outside check - card:', !!card, 'tagsContainer:', !!tagsContainer, 'insideTagsContainer:', tagsContainer?.contains(e.target), 'e.target:', e.target, 'isConnected:', e.target.isConnected);
            if (tagsContainer && !tagsContainer.contains(e.target)) {
                // Check if clicking inside the same card (but outside tags container)
                // Also check if the target is still in the DOM (DOM modification may have removed it)
                if (card.contains(e.target) && e.target.isConnected) {
                    // Clicking inside the same card is okay, don't close
                    console.log('click inside same card, not closing');
                    return;
                }
                // Clicking outside the card - close with confirmation
                console.log('click outside card, closing');
                if (hasUnsavedChanges()) {
                    if (confirm('You have unsaved changes. Discard them?')) {
                        closeTagDialog();
                        import('./papers.js');
                        applyTagFilter();
                    }
                } else {
                    closeTagDialog();
                    import('./papers.js');
                    applyTagFilter();
                }
            }
        }
    }
});

// ========== Comment Editing with Auto-Save ==========

/**
 * Save comment to papersData
 */
export function saveComment(key, comment) {
    if (!state.papersData[key]) return;

    const paper = state.papersData[key];
    const oldComment = paper._comments || '';

    // Only save if the comment actually changed
    if (oldComment !== comment) {
        paper._comments = comment;

        // Update the paper reference in processedPapersData
        const processedEntry = state.processedPapersData.find(entry => entry.key === key);
        if (processedEntry) {
            processedEntry.paper = state.papersData[key];
        }

        console.log(`Comment saved for "${key}"`);
    }
}

// Auto-save comment on blur (when clicking away)
papersList.addEventListener('blur', (e) => {
    if (e.target.classList.contains('comments')) {
        const key = e.target.dataset.key;
        const newComment = e.target.value;
        saveComment(key, newComment);
    }
}, true);

// ========== Onboarding ==========

/**
 * Set a cookie
 */
export function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Get a cookie
 */
export function getCookie(name) {
    const nameEQ = `${name}=`;
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1, cookie.length);
        }
        if (cookie.indexOf(nameEQ) === 0) {
            return cookie.substring(nameEQ.length, cookie.length);
        }
    }
    return null;
}

/**
 * Check if user has completed onboarding
 */
export function hasCompletedOnboarding() {
    return getCookie('argonaut_onboarding_complete') === 'true';
}

/**
 * Mark onboarding as complete
 */
export function markOnboardingComplete() {
    setCookie('argonaut_onboarding_complete', 'true', 365);
}

/**
 * Show onboarding modal
 */
export function showOnboarding() {
    currentStep = 0;
    updateOnboardingUI();
    onboardingModal.classList.add('active');
    onboardingModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

/**
 * Hide onboarding modal
 */
export function hideOnboarding() {
    onboardingModal.classList.remove('active');
    onboardingModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

/**
 * Update onboarding UI based on current step
 */
export function updateOnboardingUI() {
    // Update steps
    onboardingSteps.forEach((step, index) => {
        step.classList.toggle('active', index === currentStep);
    });

    // Update dots
    onboardingDots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentStep);
    });

    // Update buttons
    onboardingBackBtn.style.display = currentStep === 0 ? 'none' : 'block';
    onboardingNextBtn.style.display = currentStep === totalSteps - 1 ? 'none' : 'block';
    onboardingCompleteBtn.style.display = currentStep === totalSteps - 1 ? 'block' : 'none';

    // Focus the modal for accessibility
    if (currentStep === 0) {
        onboardingModal.focus();
    }
}

/**
 * Go to next step
 */
export function nextStep() {
    if (currentStep < totalSteps - 1) {
        currentStep++;
        updateOnboardingUI();
    }
}

/**
 * Go to previous step
 */
export function prevStep() {
    if (currentStep > 0) {
        currentStep--;
        updateOnboardingUI();
    }
}

/**
 * Go to specific step
 */
export function goToStep(step) {
    currentStep = step;
    updateOnboardingUI();
}

/**
 * Complete onboarding
 */
export function completeOnboarding() {
    markOnboardingComplete();
    hideOnboarding();
}

/**
 * Initialize onboarding on page load
 */
export function initOnboarding() {
    if (!hasCompletedOnboarding()) {
        // Delay showing onboarding to let the page load first
        setTimeout(() => {
            showOnboarding();
        }, 500);
    }
}

// Event listeners
if (closeOnboardingBtn) {
    closeOnboardingBtn.addEventListener('click', () => {
        hideOnboarding();
    });
}

if (onboardingNextBtn) {
    onboardingNextBtn.addEventListener('click', nextStep);
}

if (onboardingBackBtn) {
    onboardingBackBtn.addEventListener('click', prevStep);
}

if (onboardingCompleteBtn) {
    onboardingCompleteBtn.addEventListener('click', completeOnboarding);
}

if (showOnboardingBtn) {
    showOnboardingBtn.addEventListener('click', showOnboarding);
}

// Click on dots to go to specific step
onboardingDots.forEach(dot => {
    dot.addEventListener('click', () => {
        goToStep(parseInt(dot.dataset.step));
    });
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && onboardingModal.classList.contains('active')) {
        hideOnboarding();
    }
});

// Close modal on backdrop click
onboardingModal.addEventListener('click', (e) => {
    if (e.target === onboardingModal) {
        hideOnboarding();
    }
});