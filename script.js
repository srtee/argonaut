// DOM Elements
const inputSection = document.getElementById('inputSection');
const papersSection = document.getElementById('papersSection');
const papersList = document.getElementById('papersList');
const fileInput = document.getElementById('fileInput');
const urlInput = document.getElementById('urlInput');
const loadUrlBtn = document.getElementById('loadUrlBtn');
const loadNewBtn = document.getElementById('loadNewBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const exportBibtexBtn = document.getElementById('exportBibtexBtn');
const error = document.getElementById('error');
const status = document.getElementById('status');

// State
let papersData = {};

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

// Create paper card element
function createPaperCard(key, paperData, bibInfo, abstract) {
    const card = document.createElement('article');
    card.className = 'paper-card';
    card.dataset.key = key;

    const tags = (paperData._tags || []).map(tag =>
        `<span class="tag" data-tag="${tag}">${tag}</span>`
    ).join('');

    const alsoread = (paperData._alsoread || []).map(ref =>
        `<span class="alsoread-link" data-ref="${ref}">${ref}</span>`
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
        ${tags ? `<div class="tags-container">${tags}</div>` : ''}
        ${alsoread ? `<div class="alsoread-container"><span class="alsoread-label">Also read:</span> ${alsoread}</div>` : ''}
        <button class="abstract-toggle" aria-expanded="false" aria-label="Toggle abstract">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6"/>
            </svg>
            Abstract
        </button>
        <div class="abstract-container">
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
        toggleBtn.querySelector('svg').style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
    });

    // Also read link click handler
    card.querySelectorAll('.alsoread-link').forEach(link => {
        link.addEventListener('click', () => {
            const refKey = link.dataset.ref;
            const refCard = document.querySelector(`.paper-card[data-key="${refKey}"]`);
            if (refCard) {
                refCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                refCard.classList.add('highlight');
                setTimeout(() => refCard.classList.remove('highlight'), 2000);
            } else {
                showError(`Paper "${refKey}" not found in current view`);
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
    papersList.innerHTML = '';

    if (processedPapers.length === 0) {
        papersList.innerHTML = '<p class="no-papers">No papers found in the loaded data.</p>';
        return;
    }

    processedPapers.forEach(({ key, paper, bibInfo, abstract }) => {
        const card = createPaperCard(key, paper, bibInfo, abstract);
        papersList.appendChild(card);
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

// File input handler
fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) {
        loadPapers('file');
    }
});

// URL load button handler
loadUrlBtn.addEventListener('click', () => loadPapers('url'));

// Load new papers button
loadNewBtn.addEventListener('click', () => {
    papersSection.style.display = 'none';
    inputSection.style.display = 'block';
    papersList.innerHTML = '';
    fileInput.value = '';
    urlInput.value = 'https://gist.githubusercontent.com/srtee/04ee671f6f27d64de800f00eb9280a21/raw/papers.json';
});

// Export JSON button
if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', exportJSON);
}

// Export BibTeX button
if (exportBibtexBtn) {
    exportBibtexBtn.addEventListener('click', exportBibTeX);
}

// Dark mode toggle functionality
const themeToggle = document.getElementById('themeToggle');
const sunIcon = document.querySelector('.sun-icon');
const moonIcon = document.querySelector('.moon-icon');
const THEME_KEY = 'theme';

function updateThemeIcons(isDark) {
    if (isDark) {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    }
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
        setTheme(isDark ? 'dark' : 'light');
        localStorage.removeItem(THEME_KEY);
    }
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
        setTheme(e.matches ? 'dark' : 'light');
    }
});

// Initialize theme on page load
initTheme();