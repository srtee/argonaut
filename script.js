const doiRowsContainer = document.getElementById('doiRowsContainer');
const addRowBtn = document.getElementById('addRowBtn');
const retrieveBtn = document.getElementById('retrieveBtn');
const output = document.getElementById('output');
const error = document.getElementById('error');
const status = document.getElementById('status');

let rowIdCounter = 0;

// Functions reused from original bibmydoi
function extractDOI(input) {
    // DOI regex pattern: 10.xxxx/yyyyyyy where xxxx is 4-9 digits and yyyyyyy can include various characters
    const doiRegex = /(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i;
    const match = input.match(doiRegex);
    return match ? match[1] : null;
}

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
        return null;
    }
}

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

    // Match field = "value" or field = {value}
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

// Add a new DOI input row
function addDoiRow() {
    const rowId = rowIdCounter++;
    const row = document.createElement('div');
    row.className = 'doi-row';
    row.id = `doi-row-${rowId}`;

    row.innerHTML = `
        <label for="doiInput-${rowId}" class="sr-only">Enter DOI</label>
        <input type="text" id="doiInput-${rowId}" name="doi" placeholder="Enter DOI or URL (e.g., 10.1000/xyz123 or https://example.com/10.1000/xyz123)" autocomplete="off">
        <button type="button" class="remove-row-btn" aria-label="Remove this DOI row">Remove</button>
    `;

    doiRowsContainer.appendChild(row);

    // Add event listener to the remove button
    const removeBtn = row.querySelector('.remove-row-btn');
    removeBtn.addEventListener('click', () => {
        removeDoiRow(rowId);
    });

    // Focus on the new input
    const newInput = row.querySelector('input');
    newInput.focus();
}

// Remove a DOI input row
function removeDoiRow(rowId) {
    const row = document.getElementById(`doi-row-${rowId}`);
    if (row) {
        row.remove();
    }
}

// Delay function for 2 seconds
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch BibTeX for a single DOI
async function fetchBibTeXForDOI(input, index, total) {
    const trimmedInput = input.trim();
    let result = {
        success: false,
        bibtex: '',
        error: '',
        doi: trimmedInput
    };

    if (!trimmedInput) {
        result.error = 'Empty input';
        return result;
    }

    const doi = extractDOI(trimmedInput);
    if (!doi) {
        result.error = 'No valid DOI found';
        return result;
    }

    updateStatus(`Fetching ${index + 1} of ${total}: ${doi}...`);

    try {
        const response = await fetch(`https://doi.org/${encodeURIComponent(doi)}`, {
            headers: {
                'Accept': 'application/x-bibtex'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch BibTeX: ${response.status}`);
        }

        let bibtex = await response.text();

        // Check if BibTeX has page numbers
        const parsed = parseBibTeX(bibtex);
        let pages = parsed.pages;

        if (!pages) {
            // Try Crossref API for page numbers
            console.log('No pages in BibTeX, fetching from Crossref...');
            pages = await fetchPagesFromCrossref(doi);
            console.log('Crossref returned pages:', pages);
        }

        if (pages) {
            bibtex = addPagesToBibTeX(bibtex, pages);
            console.log('Added pages to BibTeX');
        }

        result.success = true;
        result.bibtex = bibtex;
    } catch (err) {
        result.error = err.message;
    }

    return result;
}

// Main function to retrieve all citations
async function retrieveAllCitations() {
    error.textContent = '';
    error.classList.remove('visible');
    status.classList.remove('visible');
    output.value = '';

    const inputs = Array.from(document.querySelectorAll('.doi-row input'));
    const validInputs = inputs.filter(input => input.value.trim());

    if (validInputs.length === 0) {
        error.textContent = 'Please enter at least one DOI';
        error.classList.add('visible');
        return;
    }

    // Disable buttons during retrieval
    retrieveBtn.disabled = true;
    addRowBtn.disabled = true;
    document.querySelectorAll('.remove-row-btn').forEach(btn => btn.disabled = true);

    const results = [];

    for (let i = 0; i < validInputs.length; i++) {
        const input = validInputs[i].value.trim();
        const result = await fetchBibTeXForDOI(input, i, validInputs.length);
        results.push(result);

        // Wait 2 seconds before the next request (but not after the last one)
        if (i < validInputs.length - 1) {
            await delay(2000);
        }
    }

    // Display results
    let outputText = '';
    let hasErrors = false;

    results.forEach((result, index) => {
        if (result.success) {
            outputText += result.bibtex + '\n\n';
        } else {
            hasErrors = true;
            error.textContent = `${error.textContent ? error.textContent + '\n' : ''}DOI ${index + 1} (${result.doi}): ${result.error}`;
        }
    });

    output.value = outputText.trim();

    if (hasErrors) {
        error.classList.add('visible');
    }

    updateStatus(`Completed ${results.length} DOI(s). ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed.`);

    // Re-enable buttons
    retrieveBtn.disabled = false;
    addRowBtn.disabled = false;
    document.querySelectorAll('.remove-row-btn').forEach(btn => btn.disabled = false);
}

function updateStatus(message) {
    status.textContent = message;
    status.classList.add('visible');
}

// Event listeners
addRowBtn.addEventListener('click', addDoiRow);
retrieveBtn.addEventListener('click', retrieveAllCitations);

// Copy button functionality
const copyBtn = document.getElementById('copyBtn');
const copyText = document.querySelector('.copy-text');
let copyTimeout;

copyBtn.addEventListener('click', async () => {
    const bibtexText = output.value;

    if (!bibtexText) {
        return;
    }

    try {
        await navigator.clipboard.writeText(bibtexText);
        copyText.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        copyBtn.setAttribute('aria-label', 'Copied to clipboard');

        clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => {
            copyText.textContent = 'Copy';
            copyBtn.classList.remove('copied');
            copyBtn.setAttribute('aria-label', 'Copy BibTeX to clipboard');
        }, 2000);
    } catch (err) {
        copyText.textContent = 'Failed';
    }
});

// Dark mode toggle functionality (reused from original)
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
    return null; // No stored preference
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
        // Use system preference as default
        const isDark = getSystemPreference();
        setTheme(isDark ? 'dark' : 'light');
        // Don't save the initial system preference to localStorage
        // so changes to system preference are respected
        localStorage.removeItem(THEME_KEY);
    }
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
});

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only update if user hasn't manually set a preference
    if (!localStorage.getItem(THEME_KEY)) {
        setTheme(e.matches ? 'dark' : 'light');
    }
});

// Initialize theme on page load
initTheme();

// Initialize with 3 DOI rows
addDoiRow();
addDoiRow();
addDoiRow();