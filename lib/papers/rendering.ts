import { state } from '../state.js';
import { formatAuthors } from './bibtex.js';
import { removeCachedPaper } from '../bibCache.js';
import { PaperData, BibInfo, ProcessPapersOptions } from '../types.js';

function escapeHtmlStr(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function createPaperCard(doi: string, paperData: PaperData, bibInfo: BibInfo, abstract?: string): HTMLElement {
    const citationKey = paperData._key || doi;
    const escapedCitationKey = escapeHtmlStr(citationKey);

    const card = document.createElement('article');
    card.className = 'paper';
    card.dataset.key = escapedCitationKey;
    card.dataset.doi = doi;

    const tags = (paperData._tags || []).map(tag =>
        `<button type="button" class="tag" data-tag="${escapeHtmlStr(tag)}" aria-pressed="false" tabindex="0">${escapeHtmlStr(tag)}</button>`
    ).join('');

    const alsoread = (paperData._alsoread || []).map(ref =>
        `<button type="button" class="also-read__link" data-ref="${escapeHtmlStr(ref)}" tabindex="0" aria-label="View paper: ${escapeHtmlStr(ref)}">${escapeHtmlStr(ref)}</button>`
    ).join('');

    const comments = `<textarea class="comments" placeholder="Add your notes..." data-key="${escapedCitationKey}" data-doi="${escapeHtmlStr(doi)}" aria-label="Notes for this paper">${escapeHtmlStr(paperData._comments || '')}</textarea>`;

    const abstractContent = abstract ? `<div class="abstract__content">${escapeHtmlStr(abstract)}</div>` : '<p class="abstract__empty">No abstract available</p>';

    const citationParts: string[] = [];
    if (formatAuthors(bibInfo.author)) {
        citationParts.push(`<span class="citation__authors">${formatAuthors(bibInfo.author)}</span>`);
    }
    if (escapeHtmlStr(bibInfo.journal)) {
        citationParts.push(`<span class="citation__journal">${escapeHtmlStr(bibInfo.journal)}</span>`);
    }
    if (bibInfo.year) {
        citationParts.push(`<span class="citation__year">${bibInfo.year}</span>`);
    }
    if (bibInfo.volume) {
        citationParts.push(`<span class="citation__volume">Vol. ${bibInfo.volume}</span>`);
    }
    if (bibInfo.number) {
        citationParts.push(`<span class="citation__number">No. ${bibInfo.number}</span>`);
    }
    if (bibInfo.pages) {
        citationParts.push(`<span class="citation__pages">pp. ${bibInfo.pages}</span>`);
    }
    if (paperData._doi) {
        citationParts.push(`<a href="https://doi.org/${escapeHtmlStr(paperData._doi)}" target="_blank" rel="noopener noreferrer" class="citation__link">DOI: ${escapeHtmlStr(paperData._doi)}</a>`);
    }
    const citationLine = citationParts.join(' ');

    card.innerHTML = `
        <div class="paper__header">
            <h3 class="paper__title">
                <button class="key-edit-btn" aria-label="Edit paper key" type="button" data-key="${escapedCitationKey}" data-doi="${escapeHtmlStr(doi)}">
                    <svg class="key-edit-btn__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                    </svg>
                </button>
                <span class="paper__title-text">${escapeHtmlStr(bibInfo.title || citationKey)}</span>
            </h3>
            <div class="key-editor" data-key="${escapedCitationKey}" data-doi="${escapeHtmlStr(doi)}">
                <div class="key-editor__content">
                    <label class="key-editor__label">Current key:</label>
                    <span class="key-editor__current">${escapedCitationKey}</span>
                    <div class="key-editor__input-group">
                        <input type="text" class="key-editor__input" placeholder="New key..." aria-label="New paper key">
                        <button type="button" class="key-editor__save">Rename</button>
                    </div>
                    <button type="button" class="key-editor__delete">Delete Paper</button>
                </div>
            </div>
        </div>
        <p class="citation">${citationLine}</p>
        ${comments}
        <div class="tags">
            <button class="tag-edit-btn" aria-label="Edit tags" type="button" data-key="${escapedCitationKey}" data-doi="${escapeHtmlStr(doi)}">
                <svg class="tag-edit-btn__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
            </button>
            ${tags}
        </div>
        ${alsoread ? `<div class="also-read" role="group" aria-label="Also read papers"><span class="also-read__label">Also read:</span> ${alsoread}</div>` : ''}
        <button class="abstract-toggle" aria-expanded="false" aria-label="Toggle abstract" type="button">
            <svg class="abstract-toggle__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M6 9l6 6 6-6"/>
            </svg>
            Abstract
        </button>
        <div class="abstract" aria-hidden="true">
            ${abstractContent}
        </div>
    `;

    const keyEditBtn = card.querySelector('.key-edit-btn') as HTMLButtonElement;
    const keyEditor = card.querySelector('.key-editor') as HTMLElement;

    keyEditBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = keyEditor.classList.contains('key-editor--open');
        document.querySelectorAll('.key-editor--open').forEach(editor => {
            if (editor !== keyEditor) {
                editor.classList.remove('key-editor--open');
            }
        });
        keyEditor.classList.toggle('key-editor--open');
    });

    const keySaveBtn = keyEditor.querySelector('.key-editor__save') as HTMLButtonElement;
    const keyInput = keyEditor.querySelector('.key-editor__input') as HTMLInputElement;
    const keyDeleteBtn = keyEditor.querySelector('.key-editor__delete') as HTMLButtonElement;

    keySaveBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const newKey = keyInput.value.trim();
        if (!newKey) {
            const { showError } = await import('../ui/index.js');
            showError('Please enter a new key');
            return;
        }
        if (newKey === citationKey) {
            keyEditor.classList.remove('key-editor--open');
            return;
        }

        const existingKey = Object.values(state.papersData).find(p => p._key === newKey);
        if (existingKey) {
            const { showError } = await import('../ui/index.js');
            showError(`Key "${newKey}" already exists`);
            return;
        }

        state.papersData[doi]._key = newKey;

        Object.values(state.papersData).forEach(paper => {
            if (paper._alsoread) {
                paper._alsoread = paper._alsoread.map(ref => ref === citationKey ? newKey : ref);
            }
        });

        const escapedNewKey = escapeHtmlStr(newKey);
        card.dataset.key = escapedNewKey;
        keyEditBtn.dataset.key = escapedNewKey;
        keyEditor.dataset.key = escapedNewKey;
        keyEditor.querySelector('.key-editor__current')!.textContent = newKey;

        card.querySelector('.comments')!.dataset.key = escapedNewKey;
        card.querySelector('.tag-edit-btn')!.dataset.key = escapedNewKey;

        keyInput.value = '';
        keyEditor.classList.remove('key-editor--open');

        const { showStatus } = await import('../ui/index.js');
        showStatus(`Paper renamed to "${newKey}"`);
    });

    keyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            keySaveBtn.click();
        }
    });

    keyDeleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const paperTitle = bibInfo.title || citationKey;
        if (!confirm(`Are you sure you want to delete "${paperTitle}"?\n\nThis will remove the paper from your bibliography. This action cannot be undone.`)) {
            return;
        }

        delete state.papersData[doi];
        removeCachedPaper(doi);

        Object.values(state.papersData).forEach(paper => {
            if (paper._alsoread) {
                paper._alsoread = paper._alsoread.filter(ref => ref !== citationKey);
            }
        });

        card.remove();

        if (Object.keys(state.papersData).length === 0) {
            const { showLoadState } = await import('../ui/visibility.js');
            showLoadState();
        }

        const { showStatus } = await import('../ui/index.js');
        showStatus(`Paper "${paperTitle}" deleted`);
    });

    document.addEventListener('click', (e) => {
        if (!card.contains(e.target as Node) && keyEditor.classList.contains('key-editor--open')) {
            keyEditor.classList.remove('key-editor--open');
        }
    });

    const toggleBtn = card.querySelector('.abstract-toggle') as HTMLButtonElement;
    const abstractContainer = card.querySelector('.abstract') as HTMLElement;

    toggleBtn.addEventListener('click', () => {
        const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        toggleBtn.setAttribute('aria-expanded', String(!isExpanded));
        abstractContainer.classList.toggle('abstract--expanded');
        abstractContainer.setAttribute('aria-hidden', String(isExpanded));
        toggleBtn.querySelector('svg')!.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
    });

    card.querySelectorAll('.also-read__link').forEach(link => {
        const handleClick = () => {
            const refKey = (link as HTMLElement).dataset.ref;
            if (!refKey) return;
            const escapedRefKey = CSS.escape(refKey);
            const refCard = document.querySelector(`.paper[data-key="${escapedRefKey}"]`);
            if (refCard) {
                refCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                refCard.classList.add('paper--highlight');
                (refCard as HTMLElement).focus();
                setTimeout(() => refCard.classList.remove('paper--highlight'), 2000);
            } else {
                import('../ui/index.js').then(({ showError }) => {
                    showError(`Paper "${refKey}" not found in current view`);
                });
            }
        };
        link.addEventListener('click', handleClick);
        link.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
            }
        });
    });

    card.querySelectorAll('.tag').forEach(tag => {
        const handleClick = () => {
            const tagName = (tag as HTMLElement).dataset.tag;
            if (!tagName) return;
            import('../ui/index.js').then(({ toggleTag }) => {
                toggleTag(tagName);
            });
        };
        tag.addEventListener('click', handleClick);
        tag.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
            }
        });
    });

    return card;
}

export async function processPapers(data: Record<string, PaperData>, options: ProcessPapersOptions = {}): Promise<Record<string, PaperData>> {
    const { useCache = true } = options;

    const { store } = await import('../state.js');
    store.set({ papersData: data });
    const entries = Object.entries(data);

    const { showStatus } = await import('../ui/index.js');
    showStatus(`Processing ${entries.length} papers...`);

    let processed = 0;
    for (const [doi, paper] of entries) {
        processed++;
        showStatus(`Processing paper ${processed} of ${entries.length}...`);

        if (useCache) {
            const cached = await import('../bibCache.js').then(m => m.getCachedPaper(doi));
            if (cached) {
                continue;
            }
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    showStatus(`Loaded ${entries.length} papers`);
    return data;
}

export async function displayPapers(): Promise<void> {
    const { applyTagFilter } = await import('./index.js');
    applyTagFilter();
}

export async function renderPapers(): Promise<void> {
    const { applyTagFilter } = await import('./index.js');
    applyTagFilter();
}