// Tag editor module - inline tag editing

import { state, store } from '../state.js';
import { showError, showStatus } from './notifications.js';

let exportBibtexTaggedBtn;

export function initTagEditorDOM() {
    exportBibtexTaggedBtn = document.getElementById('exportBibtexTaggedBtn');
}

/**
 * Update disabled state of export buttons based on tag selection
 */
export function updateExportButtonStates() {
    if (exportBibtexTaggedBtn) {
        exportBibtexTaggedBtn.disabled = state.selectedTags.size === 0;
    }
}

/**
 * Toggle tag selection and filter papers
 */
export function toggleTag(tag) {
    const newTags = [...state.selectedTags];
    const index = newTags.indexOf(tag);
    if (index > -1) {
        newTags.splice(index, 1); // Remove
    } else {
        newTags.push(tag); // Add
    }
    store.setSelectedTags(newTags);
    import('../papers.js').then(({ applyTagFilter }) => {
        applyTagFilter();
        updateExportButtonStates();
    });
}

/**
 * Check if there are unsaved changes
 */
export function hasUnsavedChanges() {
    const paper = state.papersData[state.currentEditingKey];
    if (!paper) return false;
    const originalTags = paper._tags || [];
    const finalTags = [...state.tentativeTags];
    // Check if tags have changed
    if (originalTags.length !== finalTags.length) return true;
    for (let i = 0; i < originalTags.length; i++) {
        if (originalTags[i] !== finalTags[i]) return true;
    }
    return false;
}

/**
 * Open inline tag editing
 */
export function openTagDialog(key) {
    console.log('openTagDialog called with key:', key);

    // Prevent editing multiple papers at once
    if (state.currentEditingKey !== null && state.currentEditingKey !== key) {
        if (hasUnsavedChanges() && !confirm('You have unsaved changes. Discard them?')) {
            return;
        }
        closeTagDialog();
    }

    store.set({ currentEditingKey: key });
    const paper = state.papersData[key];
    if (!paper) {
        console.error('Paper not found for key:', key);
        return;
    }

    // Reset state
    store.set({
        tentativeTags: [],
        tentativeTagsRemoved: []
    });

    // Initialize tags from paper
    const existingTags = paper._tags || [];
    existingTags.forEach(tag => {
        // Ensure tag is a string (not an object)
        const tagString = typeof tag === 'object' ? JSON.stringify(tag) : String(tag);
        state.tentativeTags.push(tagString);
    });

    // Find the card and tags container - try both selector patterns
    let card = document.querySelector(`.paper[data-key="${key}"]`);
    if (!card) {
        card = document.querySelector(`.paper-card[data-key="${key}"]`);
    }
    if (!card) {
        console.error('Card not found for key:', key);
        return;
    }

    // Try different selectors for tags container
    let tagsContainer = card.querySelector('.tags');
    if (!tagsContainer) {
        tagsContainer = card.querySelector('.tags-container');
    }
    if (!tagsContainer) {
        // Try finding tags element within the card
        tagsContainer = card.querySelector('[class*="tags"]');
    }
    if (!tagsContainer) {
        console.error('tags not found for key:', key);
        return;
    }

    // Add editing class for visual distinction
    tagsContainer.classList.add('tags--editing');

    // Store original content
    tagsContainer.dataset.originalContent = tagsContainer.innerHTML;

    // Render inline editing interface
    renderInlineTagEditor(tagsContainer);
}

/**
 * Render inline tag editor
 */
function renderInlineTagEditor(tagsContainer) {
    console.log('renderInlineTagEditor called');

    // Build tags HTML
    let tagsHtml = '';
    if (state.tentativeTags.length === 0 && state.tentativeTagsRemoved.length === 0) {
        tagsHtml = '<p class="tag-editor__empty">No tags yet. Add your first tag above!</p>';
    } else {
        // Render active tags
        state.tentativeTags.forEach(tag => {
            tagsHtml += `<button type="button" class="tag-editor__item" data-tag="${tag}" aria-label="Remove tag: ${tag}">${tag} <span class="tag-editor__remove">×</span></button>`;
        });
        // Render tentatively removed tags
        state.tentativeTagsRemoved.forEach(tag => {
            tagsHtml += `<button type="button" class="tag-editor__item tag-editor__item--removed" data-tag="${tag}" aria-label="Restore tag: ${tag}">${tag} <span class="tag-editor__restore">+</span></button>`;
        });
    }

    const html = `
        <div class="tag-editor">
            <div class="tag-editor__add">
                <input type="text" class="tag-editor__input" placeholder="Add new tag..." aria-label="New tag name">
                <button type="button" class="tag-editor__add-btn">Add</button>
            </div>
            <div class="tag-editor__list" role="list" aria-label="Tags for this paper">
                ${tagsHtml}
            </div>
            <div class="tag-editor__buttons">
                <button type="button" class="tag-editor__cancel">Cancel</button>
                <button type="button" class="tag-editor__save">Save Tag Changes</button>
            </div>
        </div>
    `;

    tagsContainer.innerHTML = html;

    // Focus the input
    const input = tagsContainer.querySelector('.tag-editor__input');
    if (input) {
        input.focus();
    }

    // Add event listeners for the inline editor
    setupInlineEditorListeners(tagsContainer);
}

/**
 * Setup event listeners for inline editor
 */
function setupInlineEditorListeners(tagsContainer) {
    console.log('setupInlineEditorListeners called');

    const input = tagsContainer.querySelector('.tag-editor__input');
    const addBtn = tagsContainer.querySelector('.tag-editor__add-btn');
    const cancelBtn = tagsContainer.querySelector('.tag-editor__cancel');
    const saveBtn = tagsContainer.querySelector('.tag-editor__save');

    console.log('Elements found:', { input, addBtn, cancelBtn, saveBtn });

    // Add tag button
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addInlineTag(tagsContainer);
        });
    } else {
        console.error('tag-editor__add-btn not found!');
    }

    // Enter key in input
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addInlineTag(tagsContainer);
            }
        });
    }

    // Cancel button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            // Check for unsaved changes before canceling
            if (hasUnsavedChanges()) {
                if (confirm('You have unsaved changes. Discard them?')) {
                    closeTagDialog();
                    import('../papers.js').then(({ applyTagFilter }) => {
                        applyTagFilter();
                    });
                }
            } else {
                closeTagDialog();
                import('../papers.js').then(({ applyTagFilter }) => {
                    applyTagFilter();
                });
            }
        });
    }

    // Save button
    if (saveBtn) {
        saveBtn.addEventListener('click', saveTagChanges);
    }

    // Tag item clicks (to toggle removal)
    tagsContainer.querySelectorAll('.tag-editor__item').forEach(tagItem => {
        tagItem.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent bubbling to document click handler
            const tag = tagItem.dataset.tag;
            const isRemoved = tagItem.classList.contains('tag-editor__item--removed');

            if (isRemoved) {
                // Restore: move from removed back to active
                const index = state.tentativeTagsRemoved.indexOf(tag);
                if (index > -1) {
                    state.tentativeTagsRemoved.splice(index, 1);
                    state.tentativeTags.push(tag);
                }
            } else {
                // Remove: move from active to removed
                const index = state.tentativeTags.indexOf(tag);
                if (index > -1) {
                    state.tentativeTags.splice(index, 1);
                    state.tentativeTagsRemoved.push(tag);
                }
            }
            renderInlineTagEditor(tagsContainer);
        });
    });
}

/**
 * Add a tag in inline editor
 */
function addInlineTag(tagsContainer) {
    const input = tagsContainer.querySelector('.tag-editor__input');
    if (!input) return;

    const tagName = input.value.trim();
    if (!tagName) return;

    // Check if tag already exists
    if (state.tentativeTags.includes(tagName) || state.tentativeTagsRemoved.includes(tagName)) {
        showError('Tag already exists');
        return;
    }

    // Add to tentativeTags
    state.tentativeTags.push(tagName);

    // Clear input and re-render
    input.value = '';
    renderInlineTagEditor(tagsContainer);

    // Focus the input again
    const newInput = tagsContainer.querySelector('.tag-editor__input');
    if (newInput) newInput.focus();
}

/**
 * Close tag dialog (inline version)
 */
export function closeTagDialog({ restoreContent = true } = {}) {
    if (state.currentEditingKey === null) return;

    let card = document.querySelector(`.paper[data-key="${state.currentEditingKey}"]`);
    if (!card) {
        card = document.querySelector(`.paper-card[data-key="${state.currentEditingKey}"]`);
    }
    if (card) {
        const tagsContainer = card.querySelector('.tags-container');
        if (tagsContainer) {
            // Always remove editing class
            tagsContainer.classList.remove('editing');

            if (restoreContent && tagsContainer.dataset.originalContent) {
                // Restore original content
                tagsContainer.innerHTML = tagsContainer.dataset.originalContent;
                delete tagsContainer.dataset.originalContent;
            } else if (!restoreContent) {
                // Clear the editing UI and remove originalContent data
                delete tagsContainer.dataset.originalContent;
            }
        }
    }

    store.set({
        currentEditingKey: null,
        tentativeTags: [],
        tentativeTagsRemoved: []
    });
}

/**
 * Save tag changes (inline version)
 */
function saveTagChanges() {
    if (!state.currentEditingKey) return;

    const paper = state.papersData[state.currentEditingKey];

    // Final tags are just the active tags (tentativeTags)
    // Tags in tentativeTagsRemoved are not saved
    const finalTags = [...state.tentativeTags];

    // Calculate changes
    const originalTags = paper._tags || [];
    const tagsRemoved = originalTags.filter(t => !finalTags.includes(t));
    const tagsAdded = finalTags.filter(t => !originalTags.includes(t));

    // Build confirmation message
    let confirmMessage = `Save tag changes for "${paper.title || state.currentEditingKey}"?\n\n`;
    if (tagsAdded.length > 0) {
        confirmMessage += `Adding: ${tagsAdded.join(', ')}\n`;
    }
    if (tagsRemoved.length > 0) {
        confirmMessage += `Removing: ${tagsRemoved.join(', ')}\n`;
    }
    if (tagsAdded.length === 0 && tagsRemoved.length === 0) {
        confirmMessage += 'No changes to tags.';
    }
    confirmMessage += '\n\nThis action cannot be undone.';

    // Show confirmation
    if (confirm(confirmMessage)) {
        // Apply changes to papersData
        paper._tags = finalTags;

        // Update the paper reference in processedPapersData to ensure filtering works correctly
        const processedEntry = state.processedPapersData.find(entry => entry.key === state.currentEditingKey);
        if (processedEntry) {
            processedEntry.paper = state.papersData[state.currentEditingKey];
        }

        // Re-render paper cards
        import('../papers.js').then(({ applyTagFilter }) => {
            applyTagFilter();
        });

        showStatus('Tags updated successfully');
    }

    closeTagDialog({ restoreContent: false });
}
