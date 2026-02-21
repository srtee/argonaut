/**
 * DOI Client - Resolve DOIs to BibTeX
 */

import { textRequest } from './httpClient.js';

const DOI_BASE_URL = 'https://doi.org';

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
