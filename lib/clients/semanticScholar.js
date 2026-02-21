/**
 * Semantic Scholar Client - Fetch paper abstracts
 */

import { jsonRequest } from './httpClient.js';

const SEMANTIC_SCHOLAR_BASE_URL = 'https://api.semanticscholar.org/graph/v1/paper';

/**
 * Fetch abstract from Semantic Scholar API
 * @param {string} doi - The DOI of the paper
 * @returns {Promise<string|null>} - The abstract or null if not found
 */
export async function fetchAbstract(doi) {
    try {
        const data = await jsonRequest(
            `${SEMANTIC_SCHOLAR_BASE_URL}/DOI:${encodeURIComponent(doi)}?fields=abstract`
        );

        if (data.abstract) {
            return data.abstract;
        }

        return null;
    } catch (err) {
        console.error('[SemanticScholarClient] Error fetching abstract:', err);
        return null;
    }
}
