// Comments module - comment auto-save

import { state } from '../state.js';

/**
 * Find DOI by citation key
 */
function findDoiByKey(key) {
    for (const [doi, paper] of Object.entries(state.papersData)) {
        if (paper._key === key) {
            return doi;
        }
    }
    return null;
}

/**
 * Save comment to papersData
 */
export function saveComment(key, comment) {
    // Find DOI by key
    const doi = findDoiByKey(key);
    if (!doi) return;

    const paper = state.papersData[doi];
    if (!paper) return;

    const oldComment = paper._comments || '';

    // Only save if the comment actually changed
    if (oldComment !== comment) {
        paper._comments = comment;
        console.log(`Comment saved for "${key}"`);
    }
}
