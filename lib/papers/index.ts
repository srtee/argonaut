export { addPagesToBibTeX, parseBibTeX, formatAuthors, generateDefaultKey } from './bibtex.js';

export { fetchAbstract, addPaperByDoi, extractDOI } from './doi.js';

export { createPaperCard, processPapers, displayPapers, renderPapers } from './rendering.js';

export { goToPage, hasSelectedTag, applyTagFilter, initEventListeners as initPaginationEventListeners } from './pagination.js';

export { updateTagVisuals } from './tags.js';

import { get } from '../dom.js';

export function initDOM(): void {
    console.log('[Papers] DOM elements registered via dom.js registry');
}

export async function initEventListeners(): Promise<void> {
    console.log('[Papers] Initializing event listeners');

    const addDoiBtn = get('addDoiBtn') as HTMLButtonElement | null;
    const doiInput = get('doiInput') as HTMLInputElement | null;
    const focusModeToggle = get('focusModeToggle') as HTMLButtonElement | null;

    const { addPaperByDoi } = await import('./doi.js');

    if (addDoiBtn) {
        addDoiBtn.addEventListener('click', () => {
            addPaperByDoi();
        });
    }

    if (doiInput) {
        doiInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addPaperByDoi();
            }
        });
    }

    if (focusModeToggle) {
        const { toggleFocusMode } = await import('../ui/visibility.js');
        focusModeToggle.addEventListener('click', () => {
            const isFocusMode = toggleFocusMode();
            focusModeToggle.classList.toggle('focus-toggle--active', isFocusMode);
            focusModeToggle.setAttribute('aria-pressed', String(isFocusMode));
        });
    }

    const { initEventListeners: initPaginationEventListeners } = await import('./pagination.js');
    initPaginationEventListeners();

    console.log('[Papers] Event listeners initialized');
}