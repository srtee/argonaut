console.log('=== Paper Viewer Script Loading ===');
// DOM Elements
console.log('Loading DOM elements...');
const inputSection = document.getElementById('inputSection');
const papersSection = document.getElementById('papersSection');
const exportSection = document.getElementById('exportSection');
const papersList = document.getElementById('papersList');
const fileInput = document.getElementById('fileInput');
const urlInput = document.getElementById('urlInput');
const loadUrlBtn = document.getElementById('loadUrlBtn');
const loadNewBtn = document.getElementById('loadNewBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const exportBibtexAllBtn = document.getElementById('exportBibtexAllBtn');
const exportBibtexTaggedBtn = document.getElementById('exportBibtexTaggedBtn');
const manageTagsBtn = document.getElementById('manageTagsBtn');
const editTagsModeBtn = document.getElementById('editTagsModeBtn');
const doiInput = document.getElementById('doiInput');
const doiKeyInput = document.getElementById('doiKeyInput');
const addDoiBtn = document.getElementById('addDoiBtn');
const error = document.getElementById('error');
const status = document.getElementById('status');

// Modal elements
const editTagsModal = document.getElementById('editTagsModal');
const manageTagsModal = document.getElementById('manageTagsModal');
const renameTagModal = document.getElementById('renameTagModal');
const toastContainer = document.getElementById('toastContainer');

// Edit Tags Modal elements
const editTagsPaperTitle = document.getElementById('editTagsPaperTitle');
const globalEditWarning = document.getElementById('globalEditWarning');
const currentTagsList = document.getElementById('currentTagsList');
const newTagInput = document.getElementById('newTagInput');
const addTagBtn = document.getElementById('addTagBtn');
const tagSuggestions = document.getElementById('tagSuggestions');

// Manage Tags Modal elements
const allTagsList = document.getElementById('allTagsList');
const mergeTagsBtn = document.getElementById('mergeTagsBtn');

// Rename Tag Modal elements
const renameTagInput = document.getElementById('renameTagInput');
const renameTagCount = document.getElementById('renameTagCount');

console.log('DOM elements loaded:', {
    inputSection, papersSection, exportSection, addDoiBtn, exportBibtexTaggedBtn, manageTagsBtn, editTagsModeBtn, themeToggle: document.getElementById('themeToggle')
});

// State
let papersData = {};
let selectedTags = new Set();
let processedPapersData = []; // Store processed papers for filtering
let editModeActive = false; // Global edit mode state
let currentEditingPaperKey = null; // Currently editing paper in modal
let lastGlobalTagChange = null; // Track last global change for undo
let undoTimeoutId = null; // Timeout for undo notification

// Toggle tag selection and filter papers
function toggleTag(tag) {
    if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
    } else {
        selectedTags.add(tag);
    }
    applyTagFilter();
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
    console.log('addPaperByDoi called');
    const input = doiInput.value.trim();
    const customKey = doiKeyInput.value.trim();

    if (!input) {
        showError('Please enter a DOI or URL');
        return;
    }

    // Extract DOI from input
    const doi = extractDOI(input);
    console.log('DOI extracted:', doi);
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

    // Add edit icon if there are tags
    const tagEditIcon = (paperData._tags && paperData._tags.length > 0) ?
        `<span class="tag-edit-icon" title="Click to edit tags" tabindex="0" role="button" aria-label="Edit tags">✎</span>` : '';

    const tagsSection = tags ? `<div class="tags-container">${tags}${tagEditIcon}</div>` : `<div class="tags-container">${tagEditIcon}</div>`;

    const alsoread = (paperData._alsoread || []).map(ref =>
        `<button type="button" class="alsoread-link" data-ref="${ref}" tabindex="0" aria-label="View paper: ${ref}">${ref}</button>`
    ).join('');

    const comments = paperData._comments ? `<p class="comments">${escapeHtml(paperData._comments)}</p>` : '';

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
        <h3 class="paper-title">${escapeHtml(bibInfo.title || key)}</h3>
        <p class="citation-line">${citationLine}</p>
        ${comments}
        ${tagsSection}
        ${alsoread ? `<div class="alsoread-container"><span class="alsoread-label">Also read:</span> ${alsoread}</div>` : ''}
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

    // Tag edit icon click handler (inline popover access)
    const editIconElement = card.querySelector('.tag-edit-icon');
    if (editIconElement) {
        const handleEditClick = () => {
            openEditTagsModal(key);
        };
        editIconElement.addEventListener('click', (e) => {
            e.stopPropagation();
            handleEditClick();
        });
        editIconElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                handleEditClick();
            }
        });
    }

    // Card click handler for edit mode
    card.addEventListener('click', (e) => {
        handlePaperCardClick(key, e);
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

// Export papers data as JSON
function exportJSON() {
    if (!papersData || Object.keys(papersData).length === 0) {
        showError('No papers to export');
        return;
    }

    try {
        const jsonStr = JSON.stringify(papersData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'papers.json';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showStatus('JSON exported successfully');
    } catch (err) {
        console.error('Error exporting JSON:', err);
        showError('Error exporting JSON: ' + err.message);
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

        const blob = new Blob([bibtexContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'papers.bib';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showStatus(`BibTeX exported successfully (${entries.length} entries)`);
    } catch (err) {
        console.error('Error exporting BibTeX:', err);
        showError('Error exporting BibTeX: ' + err.message);
    }
}

// Export papers with selected tags as BibTeX
async function exportBibTeXTagged() {
    console.log('exportBibTeXTagged called');
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

        console.log('Exporting tagged papers:', entries.length);

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

        const blob = new Blob([bibtexContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'papers-tagged.bib';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showStatus(`BibTeX exported successfully (${entries.length} entries with selected tags)`);
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

// Toggle global edit mode
function toggleEditMode() {
    editModeActive = !editModeActive;
    const editModeBtn = document.getElementById('editTagsModeBtn');
    const papersSection = document.getElementById('papersSection');

    if (editModeActive) {
        editModeBtn.textContent = 'Edit Tags Mode: On';
        editModeBtn.classList.add('active');
        papersSection.classList.add('edit-mode-active');
        showStatus('Edit mode active. Click any paper to edit tags.');
    } else {
        editModeBtn.textContent = 'Edit Tags Mode: Off';
        editModeBtn.classList.remove('active');
        papersSection.classList.remove('edit-mode-active');
        showStatus('Edit mode deactivated.');
    }

    setTimeout(hideStatus, 3000);
}

// Get all unique tags with their counts
function getAllTags() {
    const tagCounts = {};
    Object.values(papersData).forEach(paper => {
        const tags = paper._tags || [];
        tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });
    return tagCounts;
}

// Get most frequent tags (sorted by count, descending)
function getMostFrequentTags(limit = 5) {
    const tagCounts = getAllTags();
    return Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tag]) => tag);
}

// Add tag to paper (local only, no global effects)
function addTagToPaper(paperKey, tag) {
    if (!papersData[paperKey]) return false;
    if (!tag || tag.trim() === '') return false;

    const trimmedTag = tag.trim();
    const tags = papersData[paperKey]._tags || [];

    if (tags.includes(trimmedTag)) return false;

    tags.push(trimmedTag);
    papersData[paperKey]._tags = tags;
    return true;
}

// Remove tag from paper (local only, no global effects)
function removeTagFromPaper(paperKey, tag) {
    if (!papersData[paperKey]) return false;

    const tags = papersData[paperKey]._tags || [];
    const index = tags.indexOf(tag);

    if (index === -1) return false;

    tags.splice(index, 1);
    papersData[paperKey]._tags = tags;
    return true;
}

// Rename tag globally across all papers
function renameTagGlobally(oldName, newName) {
    if (!oldName || !newName || oldName.trim() === '' || newName.trim() === '') {
        return { success: false, message: 'Invalid tag names' };
    }

    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();

    if (trimmedOld === trimmedNew) {
        return { success: false, message: 'Tag names are the same' };
    }

    // Track affected papers for undo
    const beforeState = {};
    let affectedPapers = 0;

    Object.entries(papersData).forEach(([key, paper]) => {
        const tags = paper._tags || [];
        if (tags.includes(trimmedOld)) {
            beforeState[key] = [...tags];
            const index = tags.indexOf(trimmedOld);
            tags[index] = trimmedNew;
            papersData[key]._tags = tags;
            affectedPapers++;
        }
    });

    if (affectedPapers === 0) {
        return { success: false, message: 'Tag not found' };
    }

    // Record for undo
    recordGlobalChange('rename', {
        oldName: trimmedOld,
        newName: trimmedNew,
        beforeState
    }, null);

    return { success: true, message: `Renamed "${trimmedOld}" to "${trimmedNew}" in ${affectedPapers} paper(s)` };
}

// Delete tag globally from all papers
function deleteTagGlobally(tag) {
    if (!tag || tag.trim() === '') {
        return { success: false, message: 'Invalid tag name' };
    }

    const trimmedTag = tag.trim();

    // Track affected papers for undo
    const beforeState = {};
    let affectedPapers = 0;

    Object.entries(papersData).forEach(([key, paper]) => {
        const tags = paper._tags || [];
        if (tags.includes(trimmedTag)) {
            beforeState[key] = [...tags];
            papersData[key]._tags = tags.filter(t => t !== trimmedTag);
            affectedPapers++;
        }
    });

    if (affectedPapers === 0) {
        return { success: false, message: 'Tag not found' };
    }

    // Record for undo
    recordGlobalChange('delete', {
        tag: trimmedTag,
        beforeState
    }, null);

    return { success: true, message: `Deleted "${trimmedTag}" from ${affectedPapers} paper(s)` };
}

// Find duplicate tags (case-insensitive)
function findDuplicateTags() {
    const tagCounts = getAllTags();
    const tagGroups = {};

    Object.entries(tagCounts).forEach(([tag, count]) => {
        const normalized = tag.toLowerCase();
        if (!tagGroups[normalized]) {
            tagGroups[normalized] = [];
        }
        tagGroups[normalized].push({ name: tag, count });
    });

    // Return only groups with duplicates
    const duplicates = {};
    Object.entries(tagGroups).forEach(([normalized, tags]) => {
        if (tags.length > 1) {
            duplicates[normalized] = tags.sort((a, b) => b.count - a.count);
        }
    });

    return duplicates;
}

// Merge duplicate tags
function mergeDuplicateTags() {
    const duplicates = findDuplicateTags();
    const mergedTags = [];

    Object.entries(duplicates).forEach(([normalized, tags]) => {
        if (tags.length > 1) {
            // Use the most frequently used tag as the canonical name
            const canonicalTag = tags[0].name;
            const tagsToMerge = tags.slice(1).map(t => t.name);

            // Track before state for undo
            const beforeState = {};
            let affectedPapers = 0;

            Object.entries(papersData).forEach(([key, paper]) => {
                const tags = paper._tags || [];
                let modified = false;

                tagsToMerge.forEach(mergeTag => {
                    const index = tags.indexOf(mergeTag);
                    if (index !== -1) {
                        if (!beforeState[key]) beforeState[key] = [...tags];
                        tags[index] = canonicalTag;
                        modified = true;
                    }
                });

                if (modified) {
                    affectedPapers++;
                }
            });

            if (affectedPapers > 0) {
                mergedTags.push({
                    canonical: canonicalTag,
                    merged: tagsToMerge,
                    count: affectedPapers
                });

                // Record for undo
                recordGlobalChange('merge', {
                    canonicalTag,
                    tagsToMerge,
                    beforeState
                }, null);
            }
        }
    });

    return mergedTags;
}

// Record global change for undo
function recordGlobalChange(type, before, after) {
    lastGlobalTagChange = {
        type,
        timestamp: Date.now(),
        before,
        after
    };

    // Clear any existing undo timeout
    if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
    }

    // Auto-dismiss undo after 30 seconds
    undoTimeoutId = setTimeout(() => {
        lastGlobalTagChange = null;
        hideUndoToast();
    }, 30000);
}

// Undo last global change
function undoLastGlobalChange() {
    if (!lastGlobalTagChange) {
        return { success: false, message: 'Nothing to undo' };
    }

    const { type, before } = lastGlobalTagChange;

    switch (type) {
        case 'rename':
            // Revert rename: change newName back to oldName for affected papers
            Object.entries(before.beforeState).forEach(([key, tags]) => {
                papersData[key]._tags = tags;
            });
            lastGlobalTagChange = null;
            return { success: true, message: 'Undid tag rename' };

        case 'delete':
            // Restore deleted tag to affected papers
            const tagToRestore = before.tag;
            Object.entries(before.beforeState).forEach(([key, tags]) => {
                papersData[key]._tags = tags;
            });
            lastGlobalTagChange = null;
            return { success: true, message: `Restored "${tagToRestore}" tag` };

        case 'merge':
            // Revert merge: restore original tags
            Object.entries(before.beforeState).forEach(([key, tags]) => {
                papersData[key]._tags = tags;
            });
            lastGlobalTagChange = null;
            return { success: true, message: 'Undid tag merge' };

        default:
            return { success: false, message: 'Unknown change type' };
    }
}

// Show toast notification
function showToast(message, undoAction = null) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <span class="toast-message">${message}</span>
        <div class="toast-actions">
            ${undoAction ? `<button type="button" class="toast-btn undo-btn">Undo</button>` : ''}
            <button type="button" class="toast-btn dismiss-btn">&times;</button>
        </div>
    `;

    toastContainer.appendChild(toast);

    // Add event listeners
    const undoBtn = toast.querySelector('.undo-btn');
    const dismissBtn = toast.querySelector('.dismiss-btn');

    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            const result = undoAction();
            if (result.success) {
                showToast(result.message);
                applyTagFilter();
            } else {
                showError(result.message);
            }
            toast.remove();
        });
    }

    dismissBtn.addEventListener('click', () => {
        toast.remove();
        if (undoAction) {
            lastGlobalTagChange = null;
        }
    });

    // Auto-dismiss after 5 seconds (unless it's an undo toast)
    if (!undoAction) {
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
}

// Hide undo toast specifically
function hideUndoToast() {
    const toastContainer = document.getElementById('toastContainer');
    const undoToast = toastContainer.querySelector('.undo-btn');
    if (undoToast && undoToast.closest('.toast')) {
        undoToast.closest('.toast').remove();
    }
}

// Open edit tags modal for a specific paper
function openEditTagsModal(paperKey) {
    const paper = papersData[paperKey];
    if (!paper) return;

    currentEditingPaperKey = paperKey;
    const modal = document.getElementById('editTagsModal');
    const titleDisplay = document.getElementById('editTagsPaperTitle');
    const currentTagsList = document.getElementById('currentTagsList');
    const globalWarning = document.getElementById('globalEditWarning');
    const newTagInput = document.getElementById('newTagInput');

    // Set paper title
    const bibInfo = processedPapersData.find(p => p.key === paperKey)?.bibInfo;
    titleDisplay.textContent = bibInfo?.title || paperKey;

    // Show/hide global warning
    globalWarning.style.display = editModeActive ? 'flex' : 'none';

    // Render current tags
    renderCurrentTags(paperKey);

    // Render tag suggestions
    renderTagSuggestions();

    // Clear input
    newTagInput.value = '';

    // Show modal
    modal.style.display = 'flex';
    newTagInput.focus();
}

// Render current tags in the edit modal
function renderCurrentTags(paperKey) {
    const currentTagsList = document.getElementById('currentTagsList');
    const tags = papersData[paperKey]._tags || [];

    if (tags.length === 0) {
        currentTagsList.innerHTML = '<span style="color: var(--comments-color); font-style: italic; font-size: 13px;">No tags yet</span>';
        return;
    }

    currentTagsList.innerHTML = tags.map(tag => `
        <span class="editable-tag">
            <span class="tag-name" title="${editModeActive ? 'Click to rename globally' : 'Tag name'}">${escapeHtml(tag)}</span>
            <button type="button" class="remove-tag-btn" data-tag="${escapeHtml(tag)}" aria-label="Remove tag ${escapeHtml(tag)}">&times;</button>
        </span>
    `).join('');

    // Add event listeners
    currentTagsList.querySelectorAll('.remove-tag-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tag = e.target.dataset.tag;
            const tempTags = [...(papersData[paperKey]._tags || [])];
            removeTagFromPaper(paperKey, tag);
            renderCurrentTags(paperKey);
            renderTagSuggestions();
        });
    });

    currentTagsList.querySelectorAll('.tag-name').forEach(nameEl => {
        nameEl.addEventListener('click', () => {
            if (editModeActive) {
                const oldName = nameEl.textContent;
                const newName = prompt(`Rename tag "${oldName}" (affects ALL papers):`, oldName);
                if (newName && newName.trim() !== '' && newName.trim() !== oldName) {
                    const result = renameTagGlobally(oldName, newName);
                    if (result.success) {
                        showToast(result.message, undoLastGlobalChange);
                        renderCurrentTags(paperKey);
                        renderTagSuggestions();
                        applyTagFilter();
                    } else {
                        showError(result.message);
                    }
                }
            }
        });
    });
}

// Render tag suggestions
function renderTagSuggestions() {
    const suggestionsContainer = document.getElementById('tagSuggestions');
    const currentTags = papersData[currentEditingPaperKey]?._tags || [];
    const frequentTags = getMostFrequentTags(5);

    // Filter out tags already on the paper
    const availableTags = frequentTags.filter(tag => !currentTags.includes(tag));

    if (availableTags.length === 0) {
        suggestionsContainer.innerHTML = '';
        return;
    }

    suggestionsContainer.innerHTML = availableTags.map(tag => `
        <button type="button" class="tag-suggestion" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>
    `).join('');

    // Add event listeners
    suggestionsContainer.querySelectorAll('.tag-suggestion').forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.dataset.tag;
            addTagToPaper(currentEditingPaperKey, tag);
            renderCurrentTags(currentEditingPaperKey);
            renderTagSuggestions();
        });
    });
}

// Open manage tags modal
function openManageTagsModal() {
    const modal = document.getElementById('manageTagsModal');
    const allTagsList = document.getElementById('allTagsList');

    const tagCounts = getAllTags();
    const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1].localeCompare(a[1], undefined, { numeric: true, sensitivity: 'base' }))
        .sort((a, b) => b[1] - a[1]);

    if (sortedTags.length === 0) {
        allTagsList.innerHTML = '<p style="color: var(--comments-color); text-align: center;">No tags found</p>';
    } else {
        allTagsList.innerHTML = sortedTags.map(([tag, count]) => `
            <div class="tag-item">
                <div class="tag-item-info">
                    <span class="tag-item-name">${escapeHtml(tag)}</span>
                    <span class="tag-item-count">${count} paper${count !== 1 ? 's' : ''}</span>
                </div>
                <div class="tag-item-actions">
                    <button type="button" class="tag-action-btn secondary-btn rename-tag-btn" data-tag="${escapeHtml(tag)}">Rename</button>
                    <button type="button" class="tag-action-btn tag-delete-btn" data-tag="${escapeHtml(tag)}">Delete</button>
                </div>
            </div>
        `).join('');

        // Add event listeners
        allTagsList.querySelectorAll('.rename-tag-btn').forEach(btn => {
            btn.addEventListener('click', () => openRenameTagModal(btn.dataset.tag));
        });

        allTagsList.querySelectorAll('.tag-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tag = btn.dataset.tag;
                if (confirm(`Delete tag "${tag}" from all papers?`)) {
                    const result = deleteTagGlobally(tag);
                    if (result.success) {
                        showToast(result.message, undoLastGlobalChange);
                        openManageTagsModal(); // Refresh
                        applyTagFilter();
                    } else {
                        showError(result.message);
                    }
                }
            });
        });
    }

    modal.style.display = 'flex';
}

// Open rename tag modal
function openRenameTagModal(tag) {
    const modal = document.getElementById('renameTagModal');
    const input = document.getElementById('renameTagInput');
    const countDisplay = document.getElementById('renameTagCount');
    const tagCounts = getAllTags();

    input.value = tag;
    countDisplay.textContent = tagCounts[tag] || 0;
    input.dataset.oldTag = tag;

    modal.style.display = 'flex';
    input.focus();
    input.select();
}

// Close all modals
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.style.display = 'none';
    });
    currentEditingPaperKey = null;
}

// Update paper card click handler for edit mode
function handlePaperCardClick(paperKey, event) {
    // Check if click is on a tag or other interactive element
    if (event.target.closest('.tag') ||
        event.target.closest('.alsoread-link') ||
        event.target.closest('.abstract-toggle') ||
        event.target.closest('.tag-edit-icon')) {
        return;
    }

    if (editModeActive) {
        openEditTagsModal(paperKey);
    }
}

// Main load function
async function loadPapers(method) {
    hideError();
    hideStatus();
    papersList.innerHTML = '<p class="loading">Loading papers...</p>';

    try {
        let data;

        switch (method) {
            case 'file':
                if (!fileInput.files[0]) {
                    throw new Error('Please select a file');
                }
                data = await loadFromFile(fileInput.files[0]);
                break;
            case 'url':
                const url = urlInput.value.trim();
                if (!url) {
                    throw new Error('Please enter a URL');
                }
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
        inputSection.style.display = 'none';
        exportSection.style.display = 'block';
        papersSection.style.display = 'block';
        showStatus(`Loaded ${processedPapers.length} papers successfully`);

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
        document.querySelectorAll('.input-option').forEach(option => {
            option.classList.remove('active');
            option.querySelector('.input-option-content').style.display = 'none';
        });

        const selectedOption = document.querySelector(`.input-option[data-input="${e.target.value}"]`);
        selectedOption.classList.add('active');
        selectedOption.querySelector('.input-option-content').style.display = 'block';
    });
});

// Initialize input option state on page load (fix browser remembering radio selection)
function initInputOptions() {
    const selectedRadio = document.querySelector('input[name="inputMethod"]:checked');
    if (selectedRadio) {
        // Trigger change event to update UI state
        selectedRadio.dispatchEvent(new Event('change'));
    } else {
        // Default to "file" if nothing is selected
        const fileRadio = document.getElementById('inputMethodFile');
        if (fileRadio) {
            fileRadio.checked = true;
            fileRadio.dispatchEvent(new Event('change'));
        }
    }
}
initInputOptions();

// Initialize input option UI state on page load
const initializeInputOptions = () => {
    const selectedRadio = document.querySelector('input[name="inputMethod"]:checked');
    if (selectedRadio) {
        document.querySelectorAll('.input-option').forEach(option => {
            option.classList.remove('active');
            option.querySelector('.input-option-content').style.display = 'none';
        });
        const selectedOption = document.querySelector(`.input-option[data-input="${selectedRadio.value}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
            selectedOption.querySelector('.input-option-content').style.display = 'block';
        }
    }
};
initializeInputOptions();

// File input handler
fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) {
        loadPapers('file');
    }
});

// URL load button handler
loadUrlBtn.addEventListener('click', () => loadPapers('url'));

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

        papersSection.style.display = 'none';
        inputSection.style.display = 'block';
        papersList.innerHTML = '';
        fileInput.value = '';
        urlInput.value = 'https://gist.githubusercontent.com/srtee/04ee671f6f27d64de800f00eb9280a21/raw/papers.json';
        hideStatus();
    }
});

// Export JSON button
if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', exportJSON);
}

// Export BibTeX (all) button
console.log('exportBibtexAllBtn:', exportBibtexAllBtn);
if (exportBibtexAllBtn) {
    exportBibtexAllBtn.addEventListener('click', exportBibTeX);
}

// Export BibTeX (only tagged) button
console.log('exportBibtexTaggedBtn:', exportBibtexTaggedBtn);
if (exportBibtexTaggedBtn) {
    exportBibtexTaggedBtn.addEventListener('click', exportBibTeXTagged);
    console.log('Added exportBibtexTaggedBtn event listener');
}

// Add DOI button
console.log('Setting up addDoiBtn event listener, addDoiBtn:', addDoiBtn);
if (addDoiBtn) {
    console.log('Adding click listener to addDoiBtn');
    addDoiBtn.addEventListener('click', () => {
        console.log('addDoiBtn clicked!');
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
console.log('Setting up theme toggle...');
const themeToggle = document.getElementById('themeToggle');
const sunIcon = document.querySelector('.sun-icon');
const moonIcon = document.querySelector('.moon-icon');
const THEME_KEY = 'theme';
console.log('Theme elements:', { themeToggle, sunIcon, moonIcon });

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
    console.log('initTheme called');
    const storedTheme = getStoredTheme();
    if (storedTheme) {
        console.log('Using stored theme:', storedTheme);
        setTheme(storedTheme);
    } else {
        const isDark = getSystemPreference();
        console.log('Using system preference, isDark:', isDark);
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
    console.log('Adding themeToggle event listener');
    themeToggle.addEventListener('click', () => {
        console.log('themeToggle clicked');
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        console.log('Switching theme from', currentTheme, 'to', newTheme);
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

// Tag Management Event Listeners

// Edit Tags Mode toggle button
if (editTagsModeBtn) {
    editTagsModeBtn.addEventListener('click', toggleEditMode);
}

// Manage Tags button
if (manageTagsBtn) {
    manageTagsBtn.addEventListener('click', openManageTagsModal);
}

// Merge Tags button
document.addEventListener('click', (e) => {
    if (e.target.id === 'mergeTagsBtn') {
        const mergedTags = mergeDuplicateTags();
        if (mergedTags.length > 0) {
            const message = `Merged ${mergedTags.length} tag group(s): ` +
                mergedTags.map(t => `"${t.merged.join('", "')}" → "${t.canonical}"`).join(', ');
            showToast(message, undoLastGlobalChange);
            openManageTagsModal();
            applyTagFilter();
        } else {
            showStatus('No duplicate tags found (case-insensitive)');
            setTimeout(hideStatus, 3000);
        }
    }
});

// Modal close buttons (X in header)
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-close-btn')) {
        closeAllModals();
    }
});

// Modal backdrop click to close
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeAllModals();
    }
});

// Edit Tags Modal - Add tag button
if (addTagBtn && newTagInput) {
    addTagBtn.addEventListener('click', () => {
        const tag = newTagInput.value.trim();
        if (tag && currentEditingPaperKey) {
            if (addTagToPaper(currentEditingPaperKey, tag)) {
                newTagInput.value = '';
                renderCurrentTags(currentEditingPaperKey);
                renderTagSuggestions();
            } else {
                showError('Tag already exists on this paper');
            }
        }
    });

    newTagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTagBtn.click();
        }
    });
}

// Edit Tags Modal - Save button
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-save-btn') && e.target.closest('#editTagsModal')) {
        closeAllModals();
        applyTagFilter();
        showStatus('Tags saved');
        setTimeout(hideStatus, 2000);
    }
});

// Edit Tags Modal - Cancel button
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-cancel-btn')) {
        closeAllModals();
    }
});

// Manage Tags Modal - Close button (footer)
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-close-btn-footer')) {
        closeAllModals();
    }
});

// Rename Tag Modal - Save button
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-save-btn') && e.target.closest('#renameTagModal')) {
        const input = document.getElementById('renameTagInput');
        const oldTag = input.dataset.oldTag;
        const newTag = input.value.trim();

        if (newTag && newTag !== oldTag) {
            const result = renameTagGlobally(oldTag, newTag);
            if (result.success) {
                showToast(result.message, undoLastGlobalChange);
                closeAllModals();
                openManageTagsModal();
                applyTagFilter();
            } else {
                showError(result.message);
            }
        }
    }
});

// Rename Tag Modal - Enter key to save
renameTagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const oldTag = renameTagInput.dataset.oldTag;
            const newTag = renameTagInput.value.trim();

            if (newTag && newTag !== oldTag) {
                const result = renameTagGlobally(oldTag, newTag);
                if (result.success) {
                    showToast(result.message, undoLastGlobalChange);
                    closeAllModals();
                    openManageTagsModal();
                    applyTagFilter();
                } else {
                    showError(result.message);
                }
            }
        }
    });

// Keyboard shortcut: Ctrl/Cmd + E to toggle edit mode
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        toggleEditMode();
    }
});

// Keyboard shortcut: Esc to close modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAllModals();
    }
});

// Initialize theme on page load
console.log('Script fully loaded, initializing theme...');
initTheme();
console.log('Script initialization complete');
