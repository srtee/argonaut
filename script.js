// DOM Elements
const loadJsonSection = document.getElementById('loadJsonSection');
const papersSection = document.getElementById('papersSection');
const exportSection = document.getElementById('exportSection');
const papersList = document.getElementById('papersList');
const fileInput = document.getElementById('fileInput');
const urlInput = document.getElementById('urlInput');
const loadUrlBtn = document.getElementById('loadUrlBtn');
const loadFromStorageBtn = document.getElementById('loadFromStorageBtn');
const loadNewBtn = document.getElementById('loadNewBtn');
const saveToStorageBtn = document.getElementById('saveToStorageBtn');
const exportJsonLightBtn = document.getElementById('exportJsonLightBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const exportBibtexAllBtn = document.getElementById('exportBibtexAllBtn');
const exportBibtexTaggedBtn = document.getElementById('exportBibtexTaggedBtn');
const doiInput = document.getElementById('doiInput');
const doiKeyInput = document.getElementById('doiKeyInput');
const addDoiBtn = document.getElementById('addDoiBtn');
const error = document.getElementById('error');
const status = document.getElementById('status');

// GitHub OAuth Elements
const githubAuthStatus = document.getElementById('githubAuthStatus');
const githubConnectBtn = document.getElementById('githubConnectBtn');
const githubSyncControls = document.getElementById('githubSyncControls');
const githubUserInfo = document.getElementById('githubUserInfo');
const gistSelector = document.getElementById('gistSelector');
const loadFromGistBtn = document.getElementById('loadFromGistBtn');
const saveToGistBtn = document.getElementById('saveToGistBtn');
const githubDisconnectBtn = document.getElementById('githubDisconnectBtn');

// CloudFlare Worker OAuth Constants
const WORKER_BASE_URL = 'https://argonaut-headless-github-oauth.shernren.workers.dev';

// State
let papersData = {};
let selectedTags = new Set();
let processedPapersData = []; // Store processed papers for filtering

// Toggle tag selection and filter papers
function toggleTag(tag) {
    if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
    } else {
        selectedTags.add(tag);
    }
    applyTagFilter();
    updateExportButtonStates();
}

// Update disabled state of export buttons based on tag selection
function updateExportButtonStates() {
    if (exportBibtexTaggedBtn) {
        exportBibtexTaggedBtn.disabled = selectedTags.size === 0;
    }
}

// DOI extraction regex
function extractDOI(input) {
    const doiRegex = /(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i;
    const match = input.match(doiRegex);
    return match ? match[1] : null;
}

// Fetch BibTeX for a DOI
async function fetchBibTeX(doi) {
    try {
        const response = await fetch(`https://doi.org/${encodeURIComponent(doi)}`, {
            headers: {
                'Accept': 'application/x-bibtex'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch BibTeX: ${response.status}`);
        }

        return await response.text();
    } catch (err) {
        console.error('Error fetching BibTeX:', err);
        return null;
    }
}

// Fetch abstract from Semantic Scholar API
async function fetchAbstractFromSemanticScholar(doi) {
    try {
        const response = await fetch(
            `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=abstract`,
            {
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        if (data.abstract) {
            return data.abstract;
        }

        return null;
    } catch (err) {
        console.error('Error fetching abstract from Semantic Scholar:', err);
        return null;
    }
}

// Fetch abstract from Crossref API
async function fetchAbstractFromCrossref(doi) {
    try {
        const response = await fetch(
            `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
            {
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        if (data.message && data.message.abstract) {
            return data.message.abstract;
        }

        return null;
    } catch (err) {
        console.error('Error fetching abstract from Crossref:', err);
        return null;
    }
}

// Fetch abstract - tries Semantic Scholar first, then Crossref
async function fetchAbstract(doi) {
    // Try Semantic Scholar first
    let abstract = await fetchAbstractFromSemanticScholar(doi);
    if (abstract) {
        return abstract;
    }

    // Fallback to Crossref
    abstract = await fetchAbstractFromCrossref(doi);
    return abstract;
}

// Fetch page numbers from Crossref API
async function fetchPagesFromCrossref(doi) {
    try {
        const response = await fetch(
            `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
            {
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        if (data.message) {
            // Check for page field first
            if (data.message.page) {
                return data.message.page;
            }
            // Some journals use article-number instead of pages
            if (data.message['article-number']) {
                return data.message['article-number'];
            }
        }
        return null;
    } catch (err) {
        console.error('Error fetching pages from Crossref:', err);
        return null;
    }
}

// Add pages to BibTeX if they're not already present
function addPagesToBibTeX(bibtex, pages) {
    if (!pages) return bibtex;

    // Check if pages field already exists
    const pagesRegex = /pages\s*=\s*(?:\{([^}]*)\}|"([^"]*)")/i;
    const match = bibtex.match(pagesRegex);

    if (match) {
        // Update existing pages field
        const currentPages = match[1] || match[2];
        return bibtex.replace(match[0], `pages = {${pages}}`);
    } else {
        // Add pages field after the year field (common convention)
        const yearRegex = /year\s*=\s*(?:\{([^}]*)\}|"([^"]*)")/i;
        const yearMatch = bibtex.match(yearRegex);

        if (yearMatch) {
            return bibtex.replace(yearMatch[0], `${yearMatch[0]},\n  pages = {${pages}}`);
        } else {
            // If no year field, add pages after the first field
            const firstFieldRegex = /(\w+)\s*=\s*(?:\{([^}]*)\}|"([^"]*)")/;
            const firstMatch = bibtex.match(firstFieldRegex);

            if (firstMatch) {
                return bibtex.replace(firstMatch[0], `${firstMatch[0]},\n  pages = {${pages}}`);
            }
        }
    }

    return bibtex;
}

// Parse BibTeX to extract bibliographic information
function parseBibTeX(bibtex) {
    const result = {
        title: '',
        author: '',
        journal: '',
        year: '',
        month: '',
        volume: '',
        number: '',
        pages: ''
    };

    const fieldRegex = /(\w+)\s*=\s*(?:\{([^}]*)\}|"([^"]*)")/g;
    let match;

    while ((match = fieldRegex.exec(bibtex)) !== null) {
        const field = match[1].toLowerCase();
        const value = match[2] || match[3];

        if (result.hasOwnProperty(field)) {
            result[field] = value;
        }
    }

    return result;
}

// Format authors for display
function formatAuthors(authorString) {
    if (!authorString) return 'Unknown authors';

    // Split by "and" and clean up each author
    return authorString.split(/\s+and\s+/i).map(author => {
        // Convert "Last, First" to "First Last"
        const parts = author.split(',').map(p => p.trim()).filter(p => p);
        if (parts.length >= 2) {
            return `${parts[1]} ${parts[0]}`;
        }
        return author.trim();
    }).join(', ');
}

// Generate a default key from BibTeX info (first author + year, with duplicate numbering)
function generateDefaultKey(bibInfo) {
    const author = bibInfo.author || '';
    const year = bibInfo.year || '';

    // Get first author's last name
    const firstAuthor = author.split(/\s+and\s+/i)[0] || '';
    const lastName = firstAuthor.split(',')[0]?.trim() || 'Unknown';

    // Remove non-alphabetic characters from last name and capitalize first letter
    const cleanLastName = lastName.replace(/[^a-zA-Z]/g, '');
    const keyBase = cleanLastName.charAt(0).toUpperCase() + cleanLastName.slice(1).toLowerCase() + year;

    // Check for duplicates and add suffix if needed
    let key = keyBase;
    let suffix = 1;
    const existingKeys = Object.keys(papersData);

    while (existingKeys.includes(key)) {
        key = keyBase + String.fromCharCode(96 + suffix);
        suffix++;
    }

    return key;
}

// Add a paper by DOI
async function addPaperByDoi() {
    const input = doiInput.value.trim();
    const customKey = doiKeyInput.value.trim();

    if (!input) {
        showError('Please enter a DOI or URL');
        return;
    }

    // Extract DOI from input
    const doi = extractDOI(input);
    if (!doi) {
        showError('Could not extract a valid DOI from the input. Please enter a valid DOI (e.g., 10.xxxx/xxxx) or a URL containing a DOI.');
        return;
    }

    try {
        showStatus(`Fetching paper: ${doi}...`);

        // Fetch BibTeX
        const bibtex = await fetchBibTeX(doi);
        if (!bibtex) {
            showError('Failed to fetch BibTeX for this DOI');
            return;
        }

        // Parse BibTeX
        const bibInfo = parseBibTeX(bibtex);

        // Generate or use custom key
        const key = customKey || generateDefaultKey(bibInfo);

        // Check if key already exists
        if (papersData[key] && !customKey) {
            showError(`Paper "${key}" already exists. Please provide a custom key or use a different DOI.`);
            return;
        } else if (papersData[key] && customKey) {
            // User provided a custom key that already exists - warn and overwrite
            if (!confirm(`The key "${key}" already exists. Do you want to overwrite the existing entry?`)) {
                hideStatus();
                return;
            }
        }

        // Fetch abstract
        const abstract = await fetchAbstract(doi);

        // Add to papersData
        papersData[key] = {
            _doi: doi,
            ...(bibInfo.title && { title: bibInfo.title }),
            ...(bibInfo.author && { author: bibInfo.author }),
            ...(bibInfo.journal && { journal: bibInfo.journal }),
            ...(bibInfo.year && { year: bibInfo.year }),
            ...(bibInfo.volume && { volume: bibInfo.volume }),
            ...(bibInfo.number && { number: bibInfo.number }),
            ...(bibInfo.pages && { pages: bibInfo.pages }),
        };

        // Add to processedPapersData
        const processedEntry = {
            key,
            paper: papersData[key],
            bibInfo: { title: bibInfo.title || key, ...bibInfo },
            abstract
        };
        processedPapersData.push(processedEntry);

        // Re-render papers
        applyTagFilter();

        // Show export and papers sections if this is the first paper
        if (Object.keys(papersData).length === 1) {
            exportSection.style.display = 'block';
            papersSection.style.display = 'block';
        }

        // Clear inputs
        doiInput.value = '';
        doiKeyInput.value = '';

        showStatus(`Paper "${key}" added successfully`);

        // Scroll to the new paper
        setTimeout(() => {
            const newCard = document.querySelector(`.paper-card[data-key="${key}"]`);
            if (newCard) {
                newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                newCard.classList.add('highlight');
                setTimeout(() => newCard.classList.remove('highlight'), 2000);
            }
        }, 100);

    } catch (err) {
        console.error('Error adding paper:', err);
        showError('Error adding paper: ' + err.message);
    }
}

// Create paper card element
function createPaperCard(key, paperData, bibInfo, abstract) {
    const card = document.createElement('article');
    card.className = 'paper-card';
    card.dataset.key = key;

    const tags = (paperData._tags || []).map(tag =>
        `<button type="button" class="tag" data-tag="${tag}" aria-pressed="false" tabindex="0">${tag}</button>`
    ).join('');

    const alsoread = (paperData._alsoread || []).map(ref =>
        `<button type="button" class="alsoread-link" data-ref="${ref}" tabindex="0" aria-label="View paper: ${ref}">${ref}</button>`
    ).join('');

    const comments = `<textarea class="comments" placeholder="Add your notes..." data-key="${key}" aria-label="Notes for this paper">${paperData._comments || ''}</textarea>`;

    const abstractContent = abstract ? `<div class="abstract-content">${escapeHtml(abstract)}</div>` : '<p class="no-abstract">No abstract available</p>';

    // Build compact citation line
    const citationParts = [];
    if (formatAuthors(bibInfo.author)) {
        citationParts.push(`<span class="authors">${formatAuthors(bibInfo.author)}</span>`);
    }
    if (escapeHtml(bibInfo.journal)) {
        citationParts.push(`<span class="journal">${escapeHtml(bibInfo.journal)}</span>`);
    }
    if (bibInfo.year) {
        citationParts.push(`<span class="year">${bibInfo.year}</span>`);
    }
    if (bibInfo.volume) {
        citationParts.push(`<span class="volume">Vol. ${bibInfo.volume}</span>`);
    }
    if (bibInfo.number) {
        citationParts.push(`<span class="number">No. ${bibInfo.number}</span>`);
    }
    if (bibInfo.pages) {
        citationParts.push(`<span class="pages">pp. ${bibInfo.pages}</span>`);
    }
    if (paperData._doi) {
        citationParts.push(`<a href="https://doi.org/${paperData._doi}" target="_blank" rel="noopener noreferrer" class="doi-link">DOI: ${paperData._doi}</a>`);
    }
    const citationLine = citationParts.join(' ');

    card.innerHTML = `
        <div class="paper-header">
            <h3 class="paper-title">${escapeHtml(bibInfo.title || key)}</h3>
        </div>
        <p class="citation-line">${citationLine}</p>
        ${comments}
        <div class="tags-container">
            <button class="edit-tags-btn" aria-label="Edit tags" type="button" data-key="${key}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
            </button>
            ${tags}
        </div>
        ${alsoread ? `<div class="alsoread-container" role="group" aria-label="Also read papers" role="group" aria-label="Also read papers" role="group" aria-label="Also read papers"><span class="alsoread-label">Also read:</span> ${alsoread}</div>` : ''}
        <button class="abstract-toggle" aria-expanded="false" aria-label="Toggle abstract" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M6 9l6 6 6-6"/>
            </svg>
            Abstract
        </button>
        <div class="abstract-container" aria-hidden="true">
            ${abstractContent}
        </div>
    `;

    // Abstract toggle functionality
    const toggleBtn = card.querySelector('.abstract-toggle');
    const abstractContainer = card.querySelector('.abstract-container');

    toggleBtn.addEventListener('click', () => {
        const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        toggleBtn.setAttribute('aria-expanded', !isExpanded);
        abstractContainer.classList.toggle('expanded');
        abstractContainer.setAttribute('aria-hidden', isExpanded);
        toggleBtn.querySelector('svg').style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
    });

    // Also read link click handler
    card.querySelectorAll('.alsoread-link').forEach(link => {
        const handleClick = () => {
            const refKey = link.dataset.ref;
            const refCard = document.querySelector(`.paper-card[data-key="${refKey}"]`);
            if (refCard) {
                refCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                refCard.classList.add('highlight');
                refCard.focus();
                setTimeout(() => refCard.classList.remove('highlight'), 2000);
            } else {
                showError(`Paper "${refKey}" not found in current view`);
            }
        };
        link.addEventListener('click', handleClick);
        link.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
            }
        });
    });

    // Tag click handler
    card.querySelectorAll('.tag').forEach(tag => {
        const handleClick = () => {
            toggleTag(tag.dataset.tag);
        };
        tag.addEventListener('click', handleClick);
        tag.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
            }
        });
    });

    return card;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show error message
function showError(message) {
    error.textContent = message;
    error.classList.add('visible');
    setTimeout(() => {
        error.classList.remove('visible');
    }, 5000);
}

// Show status message
function showStatus(message) {
    status.textContent = message;
    status.classList.add('visible');
}

// Hide status message
function hideStatus() {
    status.classList.remove('visible');
}

// Helper function to save file using File System Access API with fallback
async function saveFileWithPicker(content, defaultFilename, mimeType) {
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

// Helper function to get file description based on MIME type
function getMimeTypeDescription(mimeType) {
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

// Helper function to get file extensions based on MIME type
function getMimeTypeExtensions(mimeType) {
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

// Clear current papers data
function clearCurrentData() {
    papersData = {};
    selectedTags.clear();
    processedPapersData = [];
    papersList.innerHTML = '';
}

// Save papers data to browser storage
function saveToStorage() {
    if (!papersData || Object.keys(papersData).length === 0) {
        showError('No papers to save');
        return;
    }

    try {
        const jsonStr = JSON.stringify(papersData);
        localStorage.setItem('argonautPapers', jsonStr);
        showStatus('Papers saved to browser storage');
    } catch (err) {
        console.error('Error saving to storage:', err);
        showError('Error saving to storage: ' + err.message);
    }
}

// Load papers data from browser storage
function loadFromStorage() {
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
        papersData = data;
        displayPapers();
        showStatus(`Loaded ${Object.keys(data).length} papers from browser storage`);
    } catch (err) {
        console.error('Error loading from storage:', err);
        showError('Error loading from storage: ' + err.message);
    }
}

// ========== CloudFlare Worker OAuth Functions ==========

// Login - redirect to the worker's /login endpoint
function loginToGitHub() {
    window.location.href = `${WORKER_BASE_URL}/login`;
}

// Check if user is authenticated
async function checkSession() {
    try {
        const res = await fetch(`${WORKER_BASE_URL}/session`, {
            credentials: 'include'  // Required for cookies
        });
        return await res.json();  // { authenticated: true/false, user: {...}, scopes: [...] }
    } catch (err) {
        console.error('Error checking session:', err);
        return { authenticated: false };
    }
}

// Logout
async function logoutFromGitHub() {
    try {
        await fetch(`${WORKER_BASE_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (err) {
        console.error('Error logging out:', err);
    }
}

// Make authenticated requests to GitHub API (proxy through worker)
async function getGitHubGists() {
    try {
        const res = await fetch(`${WORKER_BASE_URL}/api/github/gists`, {
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch gists');
        return await res.json();
    } catch (err) {
        console.error('Error fetching gists:', err);
        throw err;
    }
}

async function getGistContent(gistId) {
    try {
        const res = await fetch(`${WORKER_BASE_URL}/api/github/gists/${gistId}`, {
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch gist');
        return await res.json();
    } catch (err) {
        console.error('Error fetching gist:', err);
        throw err;
    }
}

async function updateGistContent(gistId, files, description = 'Argonaut Papers') {
    try {
        const res = await fetch(`${WORKER_BASE_URL}/api/github/gists/${gistId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ description, files })
        });
        if (!res.ok) throw new Error('Failed to update gist');
        return await res.json();
    } catch (err) {
        console.error('Error updating gist:', err);
        throw err;
    }
}

async function createGistContent(files, description = 'Argonaut Papers') {
    try {
        const res = await fetch(`${WORKER_BASE_URL}/api/github/gists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                description,
                public: false,
                files
            })
        });
        if (!res.ok) throw new Error('Failed to create gist');
        return await res.json();
    } catch (err) {
        console.error('Error creating gist:', err);
        throw err;
    }
}

// ========== GitHub UI Functions ==========

async function connectToGitHub() {
    try {
        githubConnectBtn.classList.add('loading');
        loginToGitHub();
    } catch (err) {
        console.error('Error connecting to GitHub:', err);
        showError('Error connecting to GitHub: ' + err.message);
        githubConnectBtn.classList.remove('loading');
    }
}

async function disconnectFromGitHub() {
    try {
        await logoutFromGitHub();
        localStorage.removeItem('github_selected_gist');

        githubAuthStatus.style.display = 'block';
        githubSyncControls.style.display = 'none';
        showStatus('Disconnected from GitHub');
    } catch (err) {
        console.error('Error disconnecting from GitHub:', err);
        showError('Error disconnecting from GitHub: ' + err.message);
    }
}

async function loadGitHubAuth() {
    try {
        const session = await checkSession();
        if (session.authenticated && session.user) {
            updateGitHubUI(session.user);
            await loadUserGists();
        }
    } catch (err) {
        console.error('Error loading GitHub auth:', err);
    }
}

function updateGitHubUI(user) {
    githubAuthStatus.style.display = 'none';
    githubSyncControls.style.display = 'block';

    githubUserInfo.innerHTML = `
        <img src="${user.avatar_url}" alt="${user.login}" class="github-user-avatar">
        <span class="github-user-name">${user.login}</span>
    `;
}

async function loadUserGists() {
    try {
        gistSelector.innerHTML = '<option value="">Loading gists...</option>';
        gistSelector.disabled = true;

        const gists = await getGitHubGists();

        if (gists.length === 0) {
            gistSelector.innerHTML = '<option value="">No gists found</option>';
        } else {
            gistSelector.innerHTML = '<option value="">Select a gist...</option>';
            gists.forEach(gist => {
                const option = document.createElement('option');
                option.value = gist.id;
                option.textContent = gist.description || gist.files[Object.keys(gist.files)[0]].filename;
                option.setAttribute('data-description', gist.description || '');
                option.setAttribute('data-filename', Object.keys(gist.files)[0]);
                gistSelector.appendChild(option);
            });

            // Restore selected gist if available
            const savedGistId = localStorage.getItem('github_selected_gist');
            if (savedGistId) {
                gistSelector.value = savedGistId;
            }
        }

        gistSelector.disabled = false;
    } catch (err) {
        console.error('Error loading gists:', err);
        showError('Error loading gists: ' + err.message);
        gistSelector.innerHTML = '<option value="">Failed to load gists</option>';
    }
}

async function loadFromGist() {
    const gistId = gistSelector.value;

    if (!gistId) {
        showError('Please select a gist');
        return;
    }

    try {
        loadFromGistBtn.classList.add('loading');
        showStatus('Loading from Gist...');

        const gist = await getGistContent(gistId);
        const filename = Object.keys(gist.files)[0];
        const content = gist.files[filename].content;

        // Check if the content is valid JSON
        let data;
        try {
            data = JSON.parse(content);
        } catch (err) {
            throw new Error('Gist does not contain valid papers data');
        }

        if (!data || Object.keys(data).length === 0) {
            throw new Error('Gist does not contain any papers');
        }

        // Load the data
        clearCurrentData();
        papersData = data;
        displayPapers();

        // Save selected gist
        localStorage.setItem('github_selected_gist', gistId);

        showStatus(`Loaded ${Object.keys(data).length} papers from Gist`);
    } catch (err) {
        console.error('Error loading from Gist:', err);
        showError('Error loading from Gist: ' + err.message);
    } finally {
        loadFromGistBtn.classList.remove('loading');
    }
}

async function saveToGist() {
    const gistId = gistSelector.value;

    if (!papersData || Object.keys(papersData).length === 0) {
        showError('No papers to save');
        return;
    }

    try {
        saveToGistBtn.classList.add('loading');
        showStatus('Saving to Gist...');

        const jsonStr = JSON.stringify(papersData, null, 2);
        const filename = 'papers.json';
        const files = {
            [filename]: {
                content: jsonStr
            }
        };

        if (gistId) {
            // Update existing gist
            await updateGistContent(gistId, files);
            showStatus('Updated existing Gist');
        } else {
            // Create new gist
            const gist = await createGistContent(files);
            gistSelector.innerHTML = '<option value="">Loading gists...</option>';
            await loadUserGists();
            gistSelector.value = gist.id;
            showStatus('Created new Gist');
        }

        // Save selected gist
        const newGistId = gistSelector.value;
        if (newGistId) {
            localStorage.setItem('github_selected_gist', newGistId);
        }
    } catch (err) {
        console.error('Error saving to Gist:', err);
        showError('Error saving to Gist: ' + err.message);
    } finally {
        saveToGistBtn.classList.remove('loading');
    }
}

// Export papers data as JSON
async function exportJSON() {
    if (!papersData || Object.keys(papersData).length === 0) {
        showError('No papers to export');
        return;
    }

    try {
        const jsonStr = JSON.stringify(papersData, null, 2);
        const saved = await saveFileWithPicker(jsonStr, 'papers.json', 'application/json');
        if (saved) {
            showStatus('JSON exported successfully');
        }
    } catch (err) {
        console.error('Error exporting JSON:', err);
        showError('Error exporting JSON: ' + err.message);
    }
}

// Export papers data as JSON (light version with only DOI, comments, tags, and alsoreads)
async function exportJSONLight() {
    if (!papersData || Object.keys(papersData).length === 0) {
        showError('No papers to export');
        return;
    }

    try {
        const lightData = {};
        for (const [key, paper] of Object.entries(papersData)) {
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

// Export papers as BibTeX
async function exportBibTeX() {
    if (!papersData || Object.keys(papersData).length === 0) {
        showError('No papers to export');
        return;
    }

    try {
        showStatus('Fetching BibTeX entries...');

        const entries = Object.entries(papersData);
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

// Export papers with selected tags as BibTeX
async function exportBibTeXTagged() {
    if (!papersData || Object.keys(papersData).length === 0) {
        showError('No papers to export');
        return;
    }

    if (selectedTags.size === 0) {
        showError('Please select at least one tag first');
        return;
    }

    try {
        showStatus('Fetching BibTeX entries for tagged papers...');

        // Filter entries to only include papers with selected tags
        const entries = Object.entries(papersData).filter(([key, paper]) => {
            const paperTags = paper._tags || [];
            return paperTags.some(tag => selectedTags.has(tag));
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

// Load JSON from file
function loadFromFile(file) {
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

// Load JSON from URL
async function loadFromUrl(url) {
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

// Load default papers.json
async function loadDefault() {
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

// Process papers data - fetch BibTeX and abstracts
async function processPapers(data) {
    papersData = data;
    const entries = Object.entries(data);

    showStatus(`Processing ${entries.length} papers...`);

    // Force UI update before starting the loop
    await new Promise(resolve => setTimeout(resolve, 0));

    const processed = [];

    for (let i = 0; i < entries.length; i++) {
        const [key, paper] = entries[i];
        status.textContent = `Fetching ${i + 1} of ${entries.length}: ${key}`;
        // Force UI update before async operations
        await new Promise(resolve => setTimeout(resolve, 0));

        const result = {
            key,
            paper,
            bibInfo: { title: key },
            abstract: null
        };

        if (paper._doi) {
            const bibtex = await fetchBibTeX(paper._doi);
            if (bibtex) {
                result.bibInfo = parseBibTeX(bibtex);
                // Check if BibTeX has page numbers
                let pages = result.bibInfo.pages;
                if (!pages) {
                    // Try Crossref API for page numbers
                    pages = await fetchPagesFromCrossref(paper._doi);
                    if (pages) {
                        result.bibInfo.pages = pages;
                    }
                }
            }

            const abstract = await fetchAbstract(paper._doi);
            if (abstract) {
                result.abstract = abstract;
            }
        }

        processed.push(result);

        // Rate limiting - delay between requests
        if (i < entries.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return processed;
}

// Display papers (process and render)
async function displayPapers() {
    const processedPapers = await processPapers(papersData);
    renderPapers(processedPapers);

    // Hide load section, show papers and export sections
    loadJsonSection.style.display = 'none';
    papersSection.style.display = 'block';
    exportSection.style.display = 'block';
}

// Render papers
function renderPapers(processedPapers) {
    // Store processed papers for filtering
    processedPapersData = processedPapers;
    applyTagFilter();
}

// Filter and reorder papers based on selected tags
function applyTagFilter() {
    papersList.innerHTML = '';

    if (processedPapersData.length === 0) {
        papersList.innerHTML = '<p class="no-papers">No papers found in the loaded data.</p>';
        return;
    }

    // Sort papers: matching papers first, non-matching last
    const sortedPapers = [...processedPapersData].sort((a, b) => {
        const aHasSelectedTag = hasSelectedTag(a.paper);
        const bHasSelectedTag = hasSelectedTag(b.paper);

        if (aHasSelectedTag && !bHasSelectedTag) return -1;
        if (!aHasSelectedTag && bHasSelectedTag) return 1;
        return 0;
    });

    sortedPapers.forEach(({ key, paper, bibInfo, abstract }) => {
        const card = createPaperCard(key, paper, bibInfo, abstract);

        // Add dimmed class if no selected tags
        if (selectedTags.size > 0 && !hasSelectedTag(paper)) {
            card.classList.add('dimmed');
        }

        papersList.appendChild(card);
    });

    // Update tag visual states after rendering
    updateTagVisuals();

    // Update export button states
    updateExportButtonStates();
}

// Check if a paper has any selected tag
function hasSelectedTag(paper) {
    const paperTags = paper._tags || [];
    if (selectedTags.size === 0) return true; // No tags selected, all papers are "matching"
    return paperTags.some(tag => selectedTags.has(tag));
}

// Update visual state of all tags (selected/deselected)
function updateTagVisuals() {
    document.querySelectorAll('.tag').forEach(tagElement => {
        const tag = tagElement.dataset.tag;
        if (selectedTags.size === 0) {
            // No tags selected - remove all classes
            tagElement.classList.remove('selected', 'deselected');
            tagElement.setAttribute('aria-pressed', 'false');
        } else if (selectedTags.has(tag)) {
            tagElement.classList.add('selected');
            tagElement.classList.remove('deselected');
            tagElement.setAttribute('aria-pressed', 'true');
        } else {
            tagElement.classList.add('deselected');
            tagElement.classList.remove('selected');
            tagElement.setAttribute('aria-pressed', 'false');
        }
    });
}

// Update export button states based on tag selection
function updateExportButtonStates() {
    if (exportBibtexTaggedBtn) {
        exportBibtexTaggedBtn.disabled = selectedTags.size === 0;
    }
}

// Main load function
async function loadPapers(method) {
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

        const processedPapers = await processPapers(data);
        renderPapers(processedPapers);

        // Switch to papers view
        loadJsonSection.style.display = 'none';
        exportSection.style.display = 'block';
        papersSection.style.display = 'block';
        showStatus(`Loaded ${processedPapers.length} papers successfully`);
        setTimeout(hideStatus, 3000);

    } catch (err) {
        showError(err.message);
        papersList.innerHTML = '';
    }
}

function hideError() {
    error.classList.remove('visible');
}

// Input option switching
document.querySelectorAll('input[name="inputMethod"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        updateInputOptionUI(e.target.value);
    });
});

// Initialize input option state on page load (fix browser remembering radio selection)
function initInputOptions() {
    const selectedRadio = document.querySelector('input[name="inputMethod"]:checked');
    console.log('initInputOptions: selectedRadio =', selectedRadio?.id);

    if (selectedRadio) {
        // Update UI state directly to ensure proper display
        updateInputOptionUI(selectedRadio.value);
    } else {
        // Default to "file" if nothing is selected
        const fileRadio = document.getElementById('inputMethodFile');
        if (fileRadio) {
            fileRadio.checked = true;
            updateInputOptionUI('file');
        }
    }
}

// Update input option UI state
function updateInputOptionUI(selectedValue) {
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
    }
}
initInputOptions();

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
        selectedTags.clear();
        papersData = {};
        processedPapersData = [];

        // Hide papers and export sections, show load section
        papersSection.style.display = 'none';
        exportSection.style.display = 'none';
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

// GitHub OAuth event listeners
if (githubConnectBtn) {
    githubConnectBtn.addEventListener('click', connectToGitHub);
}
if (githubDisconnectBtn) {
    githubDisconnectBtn.addEventListener('click', disconnectFromGitHub);
}
if (loadFromGistBtn) {
    loadFromGistBtn.addEventListener('click', loadFromGist);
}
if (saveToGistBtn) {
    saveToGistBtn.addEventListener('click', saveToGist);
}

// Load saved GitHub auth on page load (checks session via worker)
loadGitHubAuth();

// Export JSON button
if (exportJsonLightBtn) {
    exportJsonLightBtn.addEventListener('click', exportJSONLight);
}
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

// Add DOI button
if (addDoiBtn) {
    addDoiBtn.addEventListener('click', () => {
        addPaperByDoi();
    });
} else {
    console.error('addDoiBtn not found!');
}

// Allow Enter key to submit DOI
if (doiInput) {
    doiInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addPaperByDoi();
        }
    });
}

// Dark mode toggle functionality
const themeToggle = document.getElementById('themeToggle');
const sunIcon = document.querySelector('.sun-icon');
const moonIcon = document.querySelector('.moon-icon');
const THEME_KEY = 'theme';

function updateThemeIcons(isDark) {
    if (sunIcon) sunIcon.style.display = isDark ? 'block' : 'none';
    if (moonIcon) moonIcon.style.display = isDark ? 'none' : 'block';
}

function getSystemPreference() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getStoredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark') return 'dark';
    if (stored === 'light') return 'light';
    return null;
}

function setTheme(theme) {
    const isDark = theme === 'dark';
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem(THEME_KEY, theme);
    updateThemeIcons(isDark);
}

function initTheme() {
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
} else {
    console.error('themeToggle not found!');
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
        setTheme(e.matches ? 'dark' : 'light');
    }
});

// Initialize theme on page load
initTheme();

// ========== Inline Tag Management ==========

// State for tag editing
let currentEditingKey = null;
let tentativeTags = [];
let tentativeTagsRemoved = [];

// Check if there are unsaved changes
function hasUnsavedChanges() {
    const paper = papersData[currentEditingKey];
    if (!paper) return false;
    const originalTags = paper._tags || [];
    const finalTags = [...tentativeTags];
    // Check if tags have changed
    if (originalTags.length !== finalTags.length) return true;
    for (let i = 0; i < originalTags.length; i++) {
        if (originalTags[i] !== finalTags[i]) return true;
    }
    return false;
}

// Open inline tag editing
function openTagDialog(key) {
    console.log('openTagDialog called with key:', key);

    // Prevent editing multiple papers at once
    if (currentEditingKey !== null && currentEditingKey !== key) {
        if (hasUnsavedChanges() && !confirm('You have unsaved changes. Discard them?')) {
            return;
        }
        closeTagDialog();
    }

    currentEditingKey = key;
    const paper = papersData[key];
    if (!paper) {
        console.error('Paper not found for key:', key);
        return;
    }


    // Reset state
    tentativeTags = [];
    tentativeTagsRemoved = [];

    // Initialize tags from paper
    const existingTags = paper._tags || [];
    existingTags.forEach(tag => {
        // Ensure tag is a string (not an object)
        const tagString = typeof tag === 'object' ? JSON.stringify(tag) : String(tag);
        tentativeTags.push(tagString);
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

// Render inline tag editor
function renderInlineTagEditor(tagsContainer) {
    console.log('renderInlineTagEditor called');

    // Build tags HTML
    let tagsHtml = '';
    if (tentativeTags.length === 0 && tentativeTagsRemoved.length === 0) {
        tagsHtml = '<p class="no-tags-message">No tags yet. Add your first tag above!</p>';
    } else {
        // Render active tags
        tentativeTags.forEach(tag => {
            tagsHtml += `<button type="button" class="edit-tag-item" data-tag="${tag}" aria-label="Remove tag: ${tag}">${tag} <span class="tag-remove">×</span></button>`;
        });
        // Render tentatively removed tags
        tentativeTagsRemoved.forEach(tag => {
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

    // Verify elements were created

    // Focus the input
    const input = tagsContainer.querySelector('.tag-edit-input');
    if (input) {
        input.focus();
    }

    // Add event listeners for the inline editor
    setupInlineEditorListeners(tagsContainer);
}

// Setup event listeners for inline editor
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
                    closeTagDialog();  // Restore original content by default
                    applyTagFilter();  // Re-render to restore event listeners
                }
            } else {
                closeTagDialog();  // Restore original content by default
                applyTagFilter();  // Re-render to restore event listeners
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
                const index = tentativeTagsRemoved.indexOf(tag);
                if (index > -1) {
                    tentativeTagsRemoved.splice(index, 1);
                    tentativeTags.push(tag);
                }
            } else {
                // Remove: move from active to removed
                const index = tentativeTags.indexOf(tag);
                if (index > -1) {
                    tentativeTags.splice(index, 1);
                    tentativeTagsRemoved.push(tag);
                }
            }
            renderInlineTagEditor(tagsContainer);
        });
    });
}

// Add a tag in inline editor
function addInlineTag(tagsContainer) {
    const input = tagsContainer.querySelector('.tag-edit-input');
    if (!input) return;

    const tagName = input.value.trim();
    if (!tagName) return;

    // Check if tag already exists
    if (tentativeTags.includes(tagName) || tentativeTagsRemoved.includes(tagName)) {
        showError('Tag already exists');
        return;
    }

    // Add to tentativeTags
    tentativeTags.push(tagName);

    // Clear input and re-render
    input.value = '';
    renderInlineTagEditor(tagsContainer);

    // Focus the input again
    const newInput = tagsContainer.querySelector('.tag-edit-input');
    if (newInput) newInput.focus();
}

// Close tag dialog (inline version)
function closeTagDialog({ restoreContent = true } = {}) {
    if (!restoreContent) {
        // Skip restoring content - just clear state
        currentEditingKey = null;
        tentativeTags = [];
        tentativeTagsRemoved = [];
        return;
    }

    if (currentEditingKey === null) return;

    const card = document.querySelector(`.paper-card[data-key="${currentEditingKey}"]`);
    if (card) {
        const tagsContainer = card.querySelector('.tags-container');
        if (tagsContainer && tagsContainer.dataset.originalContent) {
            // Restore original content
            tagsContainer.innerHTML = tagsContainer.dataset.originalContent;
            tagsContainer.classList.remove('editing');
            delete tagsContainer.dataset.originalContent;
        }
    }

    currentEditingKey = null;
    tentativeTags = [];
    tentativeTagsRemoved = [];
}

// Save tag changes (inline version)
function saveTagChanges() {
    if (!currentEditingKey) return;

    const paper = papersData[currentEditingKey];

    // Final tags are just the active tags (tentativeTags)
    // Tags in tentativeTagsRemoved are not saved
    const finalTags = [...tentativeTags];

    // Calculate changes
    const originalTags = paper._tags || [];
    const tagsRemoved = originalTags.filter(t => !finalTags.includes(t));
    const tagsAdded = finalTags.filter(t => !originalTags.includes(t));

    // Build confirmation message
    let confirmMessage = `Save tag changes for "${paper.title || currentEditingKey}"?\n\n`;
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
        const processedEntry = processedPapersData.find(entry => entry.key === currentEditingKey);
        if (processedEntry) {
            processedEntry.paper = papersData[currentEditingKey];
        }

        // Re-render paper cards
        applyTagFilter();

        showStatus('Tags updated successfully');
    }

    closeTagDialog({ restoreContent: false });
}

// Event listeners for inline tag editing

// Pencil icon clicks (using event delegation)
papersList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-tags-btn');
    if (editBtn) {
        e.stopPropagation(); // Prevent bubbling to document click handler
        const key = editBtn.dataset.key;
        console.log('Edit button clicked, key:', key);
        openTagDialog(key);
    }
});

// Escape key to close inline editor
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentEditingKey !== null) {
        if (hasUnsavedChanges()) {
            if (confirm('You have unsaved changes. Discard them?')) {
                closeTagDialog();
                applyTagFilter();  // Re-render to restore event listeners
            }
        } else {
            closeTagDialog();
            applyTagFilter();  // Re-render to restore event listeners
        }
    }
});

// Click outside to close inline editor
document.addEventListener('click', (e) => {
    console.log('document click handler, currentEditingKey:', currentEditingKey);
    if (currentEditingKey !== null) {
        const card = document.querySelector(`.paper-card[data-key="${currentEditingKey}"]`);
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
                        applyTagFilter();  // Re-render to restore event listeners
                    }
                } else {
                    closeTagDialog();
                    applyTagFilter();  // Re-render to restore event listeners
                }
            }
        }
    }
});

// ========== Comment Editing with Auto-Save ==========

// Auto-save comment on blur (when clicking away)
papersList.addEventListener('blur', (e) => {
    if (e.target.classList.contains('comments')) {
        const key = e.target.dataset.key;
        const newComment = e.target.value;
        saveComment(key, newComment);
    }
}, true); // Use capture phase to ensure we catch blur events

// Save comment to papersData
function saveComment(key, comment) {
    if (!papersData[key]) return;

    const paper = papersData[key];
    const oldComment = paper._comments || '';

    // Only save if the comment actually changed
    if (oldComment !== comment) {
        paper._comments = comment;

        // Update the paper reference in processedPapersData
        const processedEntry = processedPapersData.find(entry => entry.key === key);
        if (processedEntry) {
            processedEntry.paper = papersData[key];
        }

        console.log(`Comment saved for "${key}"`);
    }
}
