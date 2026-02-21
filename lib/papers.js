// DOI, BibTeX, processing, and rendering functions

import { state, store } from './state.js';
import { get, getMultiple } from './dom.js';
import { fetchBibTeX, fetchAbstractFromSemanticScholar, fetchAbstractFromCrossref, fetchPagesFromCrossref } from './clients/index.js';
import { getCachedPaper, cachePaper, updateCacheKey, removeCachedPaper, hasCachedPaper, getAllCachedPapers } from './bibCache.js';

// DOM Elements - via registry
let papersList;
let loadJsonSection;
let saveJsonSection;
let exportResetSection;
let papersSection;
let doiInput;
let doiKeyInput;
let addDoiBtn;
let status;
let exportBibtexTaggedBtn;

// Initialize all DOM elements - must be called after DOM is ready
export function initDOM() {
    const elements = getMultiple(
        'papersList',
        'loadJsonSection',
        'saveJsonSection',
        'exportResetSection',
        'papersSection',
        'doiInput',
        'doiKeyInput',
        'addDoiBtn',
        'status',
        'exportBibtexTaggedBtn'
    );

    papersList = elements.papersList;
    loadJsonSection = elements.loadJsonSection;
    saveJsonSection = elements.saveJsonSection;
    exportResetSection = elements.exportResetSection;
    papersSection = elements.papersSection;
    doiInput = elements.doiInput;
    doiKeyInput = elements.doiKeyInput;
    addDoiBtn = elements.addDoiBtn;
    status = elements.status;
    exportBibtexTaggedBtn = elements.exportBibtexTaggedBtn;

    console.log('[Papers] DOM elements initialized');
}

export { fetchAbstractFromSemanticScholar, fetchAbstractFromCrossref, fetchPagesFromCrossref };

/**
 * Fetch abstract - tries Semantic Scholar first, then Crossref
 */
export async function fetchAbstract(doi) {
    // Try Semantic Scholar first
    let abstract = await fetchAbstractFromSemanticScholar(doi);
    if (abstract) {
        return abstract;
    }

    // Fallback to Crossref
    abstract = await fetchAbstractFromCrossref(doi);
    return abstract;
}

/**
 * Add pages to BibTeX if they're not already present
 */
export function addPagesToBibTeX(bibtex, pages) {
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

/**
 * Parse BibTeX to extract bibliographic information
 */
export function parseBibTeX(bibtex) {
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

/**
 * Format authors for display
 */
export function formatAuthors(authorString) {
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

/**
 * Generate a default key from BibTeX info (first author + year, with duplicate numbering)
 */
export function generateDefaultKey(bibInfo) {
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
    const existingKeys = Object.keys(state.papersData);

    while (existingKeys.includes(key)) {
        key = keyBase + String.fromCharCode(96 + suffix);
        suffix++;
    }

    return key;
}

/**
 * Add a paper by DOI
 */
export async function addPaperByDoi() {
    const input = doiInput.value.trim();
    const customKey = doiKeyInput.value.trim();

    if (!input) {
        const { showError } = await import('./ui/index.js');
        showError('Please enter a DOI or URL');
        return;
    }

    // Extract DOI from input
    const doi = extractDOI(input);
    if (!doi) {
        const { showError } = await import('./ui/index.js');
        showError('Could not extract a valid DOI from the input. Please enter a valid DOI (e.g., 10.xxxx/xxxx) or a URL containing a DOI.');
        return;
    }

    try {
        const { showStatus } = await import('./ui/index.js');
        showStatus(`Fetching paper: ${doi}...`);

        // Fetch BibTeX
        const bibtex = await fetchBibTeX(doi);
        if (!bibtex) {
            const { showError } = await import('./ui/index.js');
            showError('Failed to fetch BibTeX for this DOI');
            return;
        }

        // Parse BibTeX
        const bibInfo = parseBibTeX(bibtex);

        // Generate or use custom key
        const key = customKey || generateDefaultKey(bibInfo);

        // Check if key already exists
        if (state.papersData[key] && !customKey) {
            const { showError } = await import('./ui/index.js');
            showError(`Paper "${key}" already exists. Please provide a custom key or use a different DOI.`);
            return;
        } else if (state.papersData[key] && customKey) {
            // User provided a custom key that already exists - warn and overwrite
            if (!confirm(`The key "${key}" already exists. Do you want to overwrite the existing entry?`)) {
                const { hideStatus } = await import('./ui/index.js');
                hideStatus();
                return;
            }
        }

        // Fetch abstract
        const abstract = await fetchAbstract(doi);

        // Add to state.papersData
        store.set({
            papersData: {
                ...state.papersData,
                [key]: {
                    _doi: doi,
                    ...(bibInfo.title && { title: bibInfo.title }),
                    ...(bibInfo.author && { author: bibInfo.author }),
                    ...(bibInfo.journal && { journal: bibInfo.journal }),
                    ...(bibInfo.year && { year: bibInfo.year }),
                    ...(bibInfo.volume && { volume: bibInfo.volume }),
                    ...(bibInfo.number && { number: bibInfo.number }),
                    ...(bibInfo.pages && { pages: bibInfo.pages }),
                }
            }
        });

        // Add to processedPapersData
        const processedEntry = {
            key,
            paper: {
                _doi: doi,
                ...(bibInfo.title && { title: bibInfo.title }),
                ...(bibInfo.author && { author: bibInfo.author }),
                ...(bibInfo.journal && { journal: bibInfo.journal }),
                ...(bibInfo.year && { year: bibInfo.year }),
                ...(bibInfo.volume && { volume: bibInfo.volume }),
                ...(bibInfo.number && { number: bibInfo.number }),
                ...(bibInfo.pages && { pages: bibInfo.pages }),
            },
            bibInfo: { title: bibInfo.title || key, ...bibInfo },
            abstract
        };
        store.set({
            processedPapersData: [...state.processedPapersData, processedEntry]
        });

        // Re-render papers
        applyTagFilter();

        // Show export and papers sections if this is the first paper
        if (Object.keys(state.papersData).length === 1) {
            loadJsonSection.style.display = 'none';
            saveJsonSection.style.display = 'block';
            exportResetSection.style.display = 'block';
            papersSection.style.display = 'block';
        }

        // Clear inputs
        doiInput.value = '';
        doiKeyInput.value = '';

        showStatus(`Paper "${key}" added successfully`);

        // Scroll to the new paper
        setTimeout(() => {
            const newCard = document.querySelector(`.paper[data-key="${key}"]`);
            if (newCard) {
                newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                newCard.classList.add('paper--highlight');
                setTimeout(() => newCard.classList.remove('paper--highlight'), 2000);
            }
        }, 100);

    } catch (err) {
        console.error('Error adding paper:', err);
        const { showError } = await import('./ui/index.js');
        showError('Error adding paper: ' + err.message);
    }
}

/**
 * Create paper card element
 */
export function createPaperCard(key, paperData, bibInfo, abstract) {
    const card = document.createElement('article');
    card.className = 'paper';
    card.dataset.key = key;

    // Import escapeHtml synchronously - it's needed immediately
    const escapeHtmlStr = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const tags = (paperData._tags || []).map(tag =>
        `<button type="button" class="tag" data-tag="${tag}" aria-pressed="false" tabindex="0">${tag}</button>`
    ).join('');

    const alsoread = (paperData._alsoread || []).map(ref =>
        `<button type="button" class="also-read__link" data-ref="${ref}" tabindex="0" aria-label="View paper: ${ref}">${ref}</button>`
    ).join('');

    const comments = `<textarea class="comments" placeholder="Add your notes..." data-key="${key}" aria-label="Notes for this paper">${paperData._comments || ''}</textarea>`;

    const abstractContent = abstract ? `<div class="abstract__content">${escapeHtmlStr(abstract)}</div>` : '<p class="abstract__empty">No abstract available</p>';

    // Build compact citation line
    const citationParts = [];
    if (formatAuthors(bibInfo.author)) {
        citationParts.push(`<span class="citation__authors">${formatAuthors(bibInfo.author)}</span>`);
    }
    if (escapeHtmlStr(bibInfo.journal)) {
        citationParts.push(`<span class="citation__journal">${escapeHtmlStr(bibInfo.journal)}</span>`);
    }
    if (bibInfo.year) {
        citationParts.push(`<span class="citation__year">${bibInfo.year}</span>`);
    }
    if (bibInfo.volume) {
        citationParts.push(`<span class="citation__volume">Vol. ${bibInfo.volume}</span>`);
    }
    if (bibInfo.number) {
        citationParts.push(`<span class="citation__number">No. ${bibInfo.number}</span>`);
    }
    if (bibInfo.pages) {
        citationParts.push(`<span class="citation__pages">pp. ${bibInfo.pages}</span>`);
    }
    if (paperData._doi) {
        citationParts.push(`<a href="https://doi.org/${paperData._doi}" target="_blank" rel="noopener noreferrer" class="citation__link">DOI: ${paperData._doi}</a>`);
    }
    const citationLine = citationParts.join(' ');

    card.innerHTML = `
        <div class="paper__header">
            <h3 class="paper__title">
                <button class="key-edit-btn" aria-label="Edit paper key" type="button" data-key="${key}">
                    <svg class="key-edit-btn__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                    </svg>
                </button>
                <span class="paper__title-text">${escapeHtmlStr(bibInfo.title || key)}</span>
            </h3>
            <div class="key-editor" data-key="${key}">
                <div class="key-editor__content">
                    <label class="key-editor__label">Current key:</label>
                    <span class="key-editor__current">${escapeHtmlStr(key)}</span>
                    <div class="key-editor__input-group">
                        <input type="text" class="key-editor__input" placeholder="New key..." aria-label="New paper key">
                        <button type="button" class="key-editor__save">Rename</button>
                    </div>
                    <button type="button" class="key-editor__delete">Delete Paper</button>
                </div>
            </div>
        </div>
        <p class="citation">${citationLine}</p>
        ${comments}
        <div class="tags">
            <button class="tag-edit-btn" aria-label="Edit tags" type="button" data-key="${key}">
                <svg class="tag-edit-btn__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
            </button>
            ${tags}
        </div>
        ${alsoread ? `<div class="also-read" role="group" aria-label="Also read papers"><span class="also-read__label">Also read:</span> ${alsoread}</div>` : ''}
        <button class="abstract-toggle" aria-expanded="false" aria-label="Toggle abstract" type="button">
            <svg class="abstract-toggle__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M6 9l6 6 6-6"/>
            </svg>
            Abstract
        </button>
        <div class="abstract" aria-hidden="true">
            ${abstractContent}
        </div>
    `;

    // Key editor toggle functionality
    const keyEditBtn = card.querySelector('.key-edit-btn');
    const keyEditor = card.querySelector('.key-editor');

    keyEditBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = keyEditor.classList.contains('key-editor--open');
        // Close all other key editors first
        document.querySelectorAll('.key-editor--open').forEach(editor => {
            if (editor !== keyEditor) {
                editor.classList.remove('key-editor--open');
            }
        });
        keyEditor.classList.toggle('key-editor--open');
    });

    // Key editor save button
    const keySaveBtn = keyEditor.querySelector('.key-editor__save');
    const keyInput = keyEditor.querySelector('.key-editor__input');
    const keyDeleteBtn = keyEditor.querySelector('.key-editor__delete');

    keySaveBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const newKey = keyInput.value.trim();
        if (!newKey) {
            const { showError } = await import('./ui/index.js');
            showError('Please enter a new key');
            return;
        }
        if (newKey === key) {
            keyEditor.classList.remove('key-editor--open');
            return;
        }
        if (state.papersData[newKey]) {
            const { showError } = await import('./ui/index.js');
            showError(`Key "${newKey}" already exists`);
            return;
        }

        // Rename the paper key
        const paperData = state.papersData[key];
        delete state.papersData[key];
        state.papersData[newKey] = paperData;

        // Update cache
        updateCacheKey(key, newKey);

        // Update processedPapersData
        const processedEntry = state.processedPapersData.find(entry => entry.key === key);
        if (processedEntry) {
            processedEntry.key = newKey;
            processedEntry.paper = paperData;
        }

        // Update also-read references in all papers
        Object.keys(state.papersData).forEach(pKey => {
            const paper = state.papersData[pKey];
            if (paper._alsoread) {
                paper._alsoread = paper._alsoread.map(ref => ref === key ? newKey : ref);
            }
        });

        // Update also-read in processed data
        state.processedPapersData.forEach(entry => {
            if (entry.paper._alsoread) {
                entry.paper._alsoread = entry.paper._alsoread.map(ref => ref === key ? newKey : ref);
            }
        });

        // Update card data-key attribute
        card.dataset.key = newKey;
        keyEditBtn.dataset.key = newKey;
        keyEditor.dataset.key = newKey;
        keyEditor.querySelector('.key-editor__current').textContent = newKey;

        // Update all elements that reference this key
        card.querySelector('.comments').dataset.key = newKey;
        card.querySelector('.tag-edit-btn').dataset.key = newKey;

        keyInput.value = '';
        keyEditor.classList.remove('key-editor--open');

        const { showStatus } = await import('./ui/index.js');
        showStatus(`Paper renamed to "${newKey}"`);
    });

    // Enter key in key input
    keyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            keySaveBtn.click();
        }
    });

    // Delete paper button
    keyDeleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const paperTitle = bibInfo.title || key;
        if (!confirm(`Are you sure you want to delete "${paperTitle}"?\n\nThis will remove the paper from your bibliography. This action cannot be undone.`)) {
            return;
        }

        // Remove from papersData
        delete state.papersData[key];

        // Remove from cache
        removeCachedPaper(key);

        // Remove from processedPapersData
        const processedIndex = state.processedPapersData.findIndex(entry => entry.key === key);
        if (processedIndex > -1) {
            state.processedPapersData.splice(processedIndex, 1);
        }

        // Remove also-read references in other papers
        Object.keys(state.papersData).forEach(pKey => {
            const paper = state.papersData[pKey];
            if (paper._alsoread) {
                paper._alsoread = paper._alsoread.filter(ref => ref !== key);
            }
        });

        // Remove from processed data
        state.processedPapersData.forEach(entry => {
            if (entry.paper._alsoread) {
                entry.paper._alsoread = entry.paper._alsoread.filter(ref => ref !== key);
            }
        });

        // Remove card from DOM
        card.remove();

        // Check if there are any papers left
        if (Object.keys(state.papersData).length === 0) {
            // Show load section again
            loadJsonSection.style.display = 'block';
            saveJsonSection.style.display = 'none';
            exportResetSection.style.display = 'none';
            papersSection.style.display = 'none';
        }

        const { showStatus } = await import('./ui/index.js');
        showStatus(`Paper "${paperTitle}" deleted`);
    });

    // Close key editor when clicking outside
    document.addEventListener('click', (e) => {
        if (!card.contains(e.target) && keyEditor.classList.contains('key-editor--open')) {
            keyEditor.classList.remove('key-editor--open');
        }
    });

    // Abstract toggle functionality
    const toggleBtn = card.querySelector('.abstract-toggle');
    const abstractContainer = card.querySelector('.abstract');

    toggleBtn.addEventListener('click', () => {
        const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        toggleBtn.setAttribute('aria-expanded', !isExpanded);
        abstractContainer.classList.toggle('abstract--expanded');
        abstractContainer.setAttribute('aria-hidden', isExpanded);
        toggleBtn.querySelector('svg').style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
    });

    // Also read link click handler
    card.querySelectorAll('.also-read__link').forEach(link => {
        const handleClick = () => {
            const refKey = link.dataset.ref;
            const refCard = document.querySelector(`.paper[data-key="${refKey}"]`);
            if (refCard) {
                refCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                refCard.classList.add('paper--highlight');
                refCard.focus();
                setTimeout(() => refCard.classList.remove('paper--highlight'), 2000);
            } else {
                import('./ui/index.js').then(({ showError }) => {
                    showError(`Paper "${refKey}" not found in current view`);
                });
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
            import('./ui/index.js').then(({ toggleTag }) => {
                toggleTag(tag.dataset.tag);
            });
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

/**
 * Process papers data - fetch BibTeX and abstracts
 */
export async function processPapers(data, options = {}) {
    const { useCache = true } = options;

    store.set({ papersData: data });
    const entries = Object.entries(data);

    const { showStatus } = await import('./ui/index.js');
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

        // Check cache first
        if (useCache) {
            const cached = getCachedPaper(key);
            if (cached) {
                console.log('[Papers] Using cached data for:', key);
                if (cached.bibInfo) {
                    result.bibInfo = cached.bibInfo;
                }
                if (cached.abstract) {
                    result.abstract = cached.abstract;
                }
                // Still fetch if we have DOI but no cache
                if (!paper._doi || (result.bibInfo && result.abstract)) {
                    processed.push(result);
                    continue;
                }
            }
        }

        // Fetch from API if not cached
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

            // Cache the fetched data
            if (useCache) {
                cachePaper(key, {
                    bibtex,
                    bibInfo: result.bibInfo,
                    abstract: result.abstract
                });
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

/**
 * Display papers (process and render)
 */
export async function displayPapers() {
    const processedPapers = await processPapers(state.papersData);
    renderPapers(processedPapers);

    // Hide load section, show papers and export sections
    loadJsonSection.style.display = 'none';
    papersSection.style.display = 'block';
    saveJsonSection.style.display = 'block';
    exportResetSection.style.display = 'block';
}

/**
 * Render papers
 */
export function renderPapers(processedPapers) {
    // Store processed papers for filtering
    store.set({ processedPapersData: processedPapers });
    applyTagFilter();
}

/**
 * Filter and reorder papers based on selected tags
 */
export function applyTagFilter() {
    papersList.innerHTML = '';

    if (state.processedPapersData.length === 0) {
        papersList.innerHTML = '<p class="no-papers">No papers found in the loaded data.</p>';
        return;
    }

    // Sort papers: matching papers first, non-matching last
    const sortedPapers = [...state.processedPapersData].sort((a, b) => {
        const aHasSelectedTag = hasSelectedTag(a.paper);
        const bHasSelectedTag = hasSelectedTag(b.paper);

        if (aHasSelectedTag && !bHasSelectedTag) return -1;
        if (!aHasSelectedTag && bHasSelectedTag) return 1;
        return 0;
    });

    sortedPapers.forEach(({ key, paper, bibInfo, abstract }) => {
        const card = createPaperCard(key, paper, bibInfo, abstract);

        // Add dimmed class if no selected tags
        if (state.selectedTags.size > 0 && !hasSelectedTag(paper)) {
            card.classList.add('paper--dimmed');
        }

        papersList.appendChild(card);
    });

    // Update tag visual states after rendering
    updateTagVisuals();

    // Update export button states
    import('./ui/index.js').then(({ updateExportButtonStates }) => {
        updateExportButtonStates();
    });
}

/**
 * Check if a paper has any selected tag
 */
export function hasSelectedTag(paper) {
    const paperTags = paper._tags || [];
    if (state.selectedTags.size === 0) return true; // No tags selected, all papers are "matching"
    return paperTags.some(tag => state.selectedTags.has(tag));
}

/**
 * Update visual state of all tags (selected/deselected)
 */
export function updateTagVisuals() {
    document.querySelectorAll('.tag').forEach(tagElement => {
        const tag = tagElement.dataset.tag;
        if (state.selectedTags.size === 0) {
            // No tags selected - remove all classes
            tagElement.classList.remove('tag--selected', 'tag--deselected');
            tagElement.setAttribute('aria-pressed', 'false');
        } else if (state.selectedTags.has(tag)) {
            tagElement.classList.add('tag--selected');
            tagElement.classList.remove('tag--deselected');
            tagElement.setAttribute('aria-pressed', 'true');
        } else {
            tagElement.classList.add('tag--deselected');
            tagElement.classList.remove('tag--selected');
            tagElement.setAttribute('aria-pressed', 'false');
        }
    });
}

// Initialize event listeners - must be called after initDOM()
export function initEventListeners() {
    console.log('[Papers] Initializing event listeners');

    // Add DOI button click handler
    if (addDoiBtn) {
        addDoiBtn.addEventListener('click', () => {
            addPaperByDoi();
        });
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

    console.log('[Papers] Event listeners initialized');
}