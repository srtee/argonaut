// Comments module - comment auto-save

import { state } from '../state.js';

/**
 * Save comment to papersData
 */
export function saveComment(key, comment) {
    if (!state.papersData[key]) return;

    const paper = state.papersData[key];
    const oldComment = paper._comments || '';

    // Only save if the comment actually changed
    if (oldComment !== comment) {
        paper._comments = comment;

        // Update the paper reference in processedPapersData
        const processedEntry = state.processedPapersData.find(entry => entry.key === key);
        if (processedEntry) {
            processedEntry.paper = state.papersData[key];
        }

        console.log(`Comment saved for "${key}"`);
    }
}
