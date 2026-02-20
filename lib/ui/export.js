// Export module - file export functions

import { state } from '../state.js';
import { showError, showStatus } from './notifications.js';

let jsonFormatSelector;
let status;

export function initExportDOM() {
    jsonFormatSelector = document.getElementById('jsonFormatSelector');
    status = document.getElementById('status');
}

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
        const { fetchBibTeX, fetchPagesFromCrossref, addPagesToBibTeX, parseBibTeX } = await import('../papers.js');

        showStatus('Fetching BibTeX entries...');

        const entries = Object.entries(state.papersData);
        let bibtexContent = '';

        for (let i = 0; i < entries.length; i++) {
            const [key, paper] = entries[i];
            if (status) {
                status.textContent = `Fetching BibTeX ${i + 1} of ${entries.length}: ${key}`;
            }
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
        const { fetchBibTeX, fetchPagesFromCrossref, addPagesToBibTeX, parseBibTeX } = await import('../papers.js');

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
            if (status) {
                status.textContent = `Fetching BibTeX ${i + 1} of ${entries.length}: ${key}`;
            }
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
