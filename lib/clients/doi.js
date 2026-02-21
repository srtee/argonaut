/**
 * DOI Client - Resolve DOIs to BibTeX
 */

import { httpClient } from './httpClient.js';

const DOI_BASE_URL = 'https://doi.org';

/**
 * Fetch BibTeX for a DOI
 * @param {string} doi - The DOI to resolve
 * @returns {Promise<string|null>} - The BibTeX string or null on error
 */
export async function fetchBibTeX(doi) {
    try {
        const response = await httpClient(`${DOI_BASE_URL}/${encodeURIComponent(doi)}`, {
            headers: {
                'Accept': 'application/x-bibtex',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch BibTeX: ${response.status}`);
        }

        return await response.text();
    } catch (err) {
        console.error('[DOIClient] Error fetching BibTeX:', err);
        return null;
    }
}
