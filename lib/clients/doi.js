/**
 * DOI Client - Resolve DOIs to BibTeX
 */

import { textRequest } from './httpClient.js';

const DOI_BASE_URL = 'https://doi.org';

/**
 * Extract DOI from a string (DOI or URL)
 * @param {string} input - DOI string or URL containing DOI
 * @returns {string|null} - Extracted DOI or null if not found
 */
export function extractDOI(input) {
    const doiRegex = /(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i;
    const match = input.match(doiRegex);
    return match ? match[1] : null;
}

/**
 * Fetch BibTeX for a DOI
 * @param {string} doi - The DOI to resolve
 * @returns {Promise<string|null>} - The BibTeX string or null on error
 */
export async function fetchBibTeX(doi) {
    try {
        const bibtex = await textRequest(`${DOI_BASE_URL}/${encodeURIComponent(doi)}`, {
            headers: {
                'Accept': 'application/x-bibtex',
            },
        });
        return bibtex;
    } catch (err) {
        console.error('[DOIClient] Error fetching BibTeX:', err);
        return null;
    }
}
