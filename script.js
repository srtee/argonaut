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
const doiInput = document.getElementById('doiInput');
const doiKeyInput = document.getElementById('doiKeyInput');
const addDoiBtn = document.getElementById('addDoiBtn');
const error = document.getElementById('error');
const status = document.getElementById('status');
console.log('DOM elements loaded:', {
    inputSection, papersSection, exportSection, addDoiBtn, exportBibtexTaggedBtn, themeToggle: document.getElementById('themeToggle')
});

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
        <div class="paper-header">
            <h3 class="paper-title">${escapeHtml(bibInfo.title || key)}</h3>
            <button class="edit-tags-btn" aria-label="Edit tags" type="button" data-key="${key}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
            </button>
        </div>
        <p class="citation-line">${citationLine}</p>
        ${comments}
        ${tags ? `<div class="tags-container">${tags}</div>` : ''}
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

// Initialize theme on page load
console.log('Script fully loaded, initializing theme...');
initTheme();
console.log('Script initialization complete');

// ========== Tag Management Dialog ==========

// State for tag editing
let currentEditingKey = null;
let tentativeTags = []; // Array of tag strings (active tags)
let tentativeTagsRemoved = []; // Array of tag strings (tentatively removed tags)

// DOM Elements for tag dialog
const tagDialog = document.getElementById('tagDialog');
const tagDialogTitle = document.getElementById('tagDialogTitle');
const tagDialogPaperTitle = document.getElementById('tagDialogPaperTitle');
const tagList = document.getElementById('tagList');
const tagInput = document.getElementById('tagInput');
const addTagBtn = document.getElementById('addTagBtn');
const cancelTagChanges = document.getElementById('cancelTagChanges');
const saveTagChangesBtn = document.getElementById('saveTagChanges');
const tagDialogClose = document.querySelector('.tag-dialog-close');

console.log('Tag dialog elements found:', {
    tagDialog,
    tagDialogTitle,
    tagDialogPaperTitle,
    tagList,
    tagInput,
    addTagBtn,
    cancelTagChanges,
    saveTagChangesBtn,
    tagDialogClose
});

// Open tag dialog
function openTagDialog(key) {
    console.log('Opening tag dialog for key:', key);
    currentEditingKey = key;
    const paper = papersData[key];
    if (!paper) {
        console.error('Paper not found for key:', key);
        return;
    }

    console.log('Paper data:', paper);
    console.log('Existing tags:', paper._tags);

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

    console.log('Tentative tags after initialization:', tentativeTags);

    // Set dialog title
    if (tagDialogPaperTitle) {
        tagDialogPaperTitle.textContent = paper.title || key;
    } else {
        console.error('tagDialogPaperTitle element not found!');
    }

    // Render tags
    renderTagList();

    // Show dialog
    if (tagDialog) {
        tagDialog.style.display = 'flex';
    } else {
        console.error('tagDialog element not found!');
    }
    if (tagInput) {
        tagInput.value = '';
        tagInput.focus();
    } else {
        console.error('tagInput element not found!');
    }

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

// Close tag dialog
function closeTagDialog() {
    tagDialog.style.display = 'none';
    currentEditingKey = null;
    tentativeTags = [];
    tentativeTagsRemoved = [];
    document.body.style.overflow = '';
}

// Render tag list in dialog
function renderTagList() {
    console.log('Rendering tag list, tentativeTags.length:', tentativeTags.length, 'tentativeTagsRemoved.length:', tentativeTagsRemoved.length);
    console.log('tagList element:', tagList);

    if (!tagList) {
        console.error('tagList element not found!');
        return;
    }

    tagList.innerHTML = '';

    if (tentativeTags.length === 0 && tentativeTagsRemoved.length === 0) {
        tagList.innerHTML = '<p class="no-tags-message">No tags yet. Add your first tag above!</p>';
        console.log('No tags to render');
        return;
    }

    console.log('Rendering tentative tags:', tentativeTags);
    console.log('Rendering tentative tags removed:', tentativeTagsRemoved);

    // Render active tags (tentativeTags)
    tentativeTags.forEach(tag => {
        const tagItem = createTagItem(tag, false);
        console.log('Created tag item:', tagItem, 'textContent:', tagItem.textContent);
        console.log('Tag item styles:', window.getComputedStyle(tagItem));
        tagList.appendChild(tagItem);
    });

    // Render tentatively removed tags (tentativeTagsRemoved)
    tentativeTagsRemoved.forEach(tag => {
        const tagItem = createTagItem(tag, true);
        console.log('Created removed tag item:', tagItem, 'textContent:', tagItem.textContent);
        tagList.appendChild(tagItem);
    });

    console.log('Tag list HTML after render:', tagList.innerHTML);
    console.log('Tag list dimensions:', tagList.getBoundingClientRect());
    console.log('Tag list children:', tagList.children.length);
}

// Create a tag item element
function createTagItem(tag, isTentativelyRemoved) {
    const item = document.createElement('div');
    item.className = 'tag-item';
    if (isTentativelyRemoved) {
        item.classList.add('tentatively-removed');
    }
    item.textContent = tag;

    // Make the tag clickable to toggle removal
    item.addEventListener('click', () => {
        if (isTentativelyRemoved) {
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
        renderTagList();
    });

    item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            item.click();
        }
    });

    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', isTentativelyRemoved ? `Restore tag ${tag}` : `Remove tag ${tag}`);

    return item;
}

// Add a new tag
function addNewTag() {
    const tagName = tagInput.value.trim();
    if (!tagName) return;

    // Check if tag already exists in tentativeTags or tentativeTagsRemoved
    if (tentativeTags.includes(tagName) || tentativeTagsRemoved.includes(tagName)) {
        showError('Tag already exists');
        return;
    }

    // Add to tentativeTags (active tags)
    tentativeTags.push(tagName);

    // Clear input
    tagInput.value = '';

    // Re-render
    renderTagList();
    tagInput.focus();
}

// Save tag changes
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
        // Apply changes
        paper._tags = finalTags;

        // Re-render paper cards
        applyTagFilter();

        showStatus('Tags updated successfully');
    }

    closeTagDialog();
}

// Event listeners for tag dialog

// Pencil icon clicks (using event delegation)
papersList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-tags-btn');
    if (editBtn) {
        const key = editBtn.dataset.key;
        openTagDialog(key);
    }
});

// Close button
if (tagDialogClose) {
    tagDialogClose.addEventListener('click', closeTagDialog);
} else {
    console.error('tagDialogClose element not found!');
}

// Cancel button
if (cancelTagChanges) {
    cancelTagChanges.addEventListener('click', closeTagDialog);
} else {
    console.error('cancelTagChanges element not found!');
}

// Add tag button
if (addTagBtn) {
    addTagBtn.addEventListener('click', addNewTag);
} else {
    console.error('addTagBtn element not found!');
}

// Save button
if (saveTagChangesBtn) {
    saveTagChangesBtn.addEventListener('click', saveTagChanges);
} else {
    console.error('saveTagChangesBtn element not found!');
}

// Enter key in tag input
if (tagInput) {
    tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addNewTag();
        }
    });
} else {
    console.error('tagInput element not found!');
}

// Escape key to close dialog
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tagDialog && tagDialog.style.display === 'flex') {
        closeTagDialog();
    }
});

// Click on backdrop to close
if (tagDialog) {
    const backdrop = tagDialog.querySelector('.tag-dialog-backdrop');
    if (backdrop) {
        backdrop.addEventListener('click', closeTagDialog);
    } else {
        console.error('tag-dialog-backdrop element not found!');
    }
} else {
    console.error('tagDialog element not found!');
}
