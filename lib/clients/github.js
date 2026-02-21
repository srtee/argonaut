/**
 * GitHub Client - Gist CRUD operations via worker proxy
 */

import { jsonRequest } from './httpClient.js';
import { getSessionId } from './auth.js';
import { WORKER_BASE_URL } from '../state.js';

const GITHUB_API_BASE = `${WORKER_BASE_URL}/api/github/gists`;

/**
 * Get authorization headers
 * @returns {object} - Headers object with Authorization header
 */
function getAuthHeaders() {
    const headers = {};
    const sessionId = getSessionId();
    if (sessionId) {
        headers['Authorization'] = `Bearer ${sessionId}`;
    }
    return headers;
}

/**
 * List user's gists
 * @returns {Promise<Array>} - Array of gist objects
 */
export async function listGists() {
    try {
        const gists = await jsonRequest(GITHUB_API_BASE, {
            headers: getAuthHeaders(),
        });
        return gists;
    } catch (err) {
        console.error('[GitHubClient] Error listing gists:', err);
        throw err;
    }
}

/**
 * Get specific gist
 * @param {string} gistId - The gist ID
 * @returns {Promise<object>} - Gist object
 */
export async function getGist(gistId) {
    try {
        const gist = await jsonRequest(`${GITHUB_API_BASE}/${gistId}`, {
            headers: getAuthHeaders(),
        });
        return gist;
    } catch (err) {
        console.error('[GitHubClient] Error getting gist:', err);
        throw err;
    }
}

/**
 * Create new gist
 * @param {object} files - Object with filename as key and {content} as value
 * @param {string} description - Gist description
 * @returns {Promise<object>} - Created gist object
 */
export async function createGist(files, description = 'Argonaut Papers') {
    try {
        const gist = await jsonRequest(GITHUB_API_BASE, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ description, public: false, files }),
        });
        return gist;
    } catch (err) {
        console.error('[GitHubClient] Error creating gist:', err);
        throw err;
    }
}

/**
 * Update existing gist
 * @param {string} gistId - The gist ID to update
 * @param {object} files - Object with filename as key and {content} as value
 * @param {string} description - Gist description
 * @returns {Promise<object>} - Updated gist object
 */
export async function updateGist(gistId, files, description = 'Argonaut Papers') {
    try {
        const gist = await jsonRequest(`${GITHUB_API_BASE}/${gistId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ description, files }),
        });
        return gist;
    } catch (err) {
        console.error('[GitHubClient] Error updating gist:', err);
        throw err;
    }
}
