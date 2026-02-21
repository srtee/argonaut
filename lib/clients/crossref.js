/**
 * Crossref Client - Fetch paper metadata including abstracts and page numbers
 */

import { jsonRequest } from './httpClient.js';

const CROSSREF_BASE_URL = 'https://api.crossref.org/works';

/**
 * Fetch abstract from Crossref API
 * @param {string} doi - The DOI of the paper
 * @returns {Promise<string|null>} - The abstract or null if not found
 */
export async function fetchAbstract(doi) {
    try {
        const data = await jsonRequest(`${CROSSREF_BASE_URL}/${encodeURIComponent(doi)}`);

        if (data.message && data.message.abstract) {
            return data.message.abstract;
        }

        return null;
    } catch (err) {
        console.error('[CrossrefClient] Error fetching abstract:', err);
        return null;
    }
}

/**
 * Fetch page numbers from Crossref API
 * @param {string} doi - The DOI of the paper
 * @returns {Promise<string|null>} - The page numbers or article number, or null if not found
 */
export async function fetchPages(doi) {
    try {
        const data = await jsonRequest(`${CROSSREF_BASE_URL}/${encodeURIComponent(doi)}`);

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
        console.error('[CrossrefClient] Error fetching pages:', err);
        return null;
    }
}
