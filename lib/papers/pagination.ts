import { state } from '../state.js';
import { get } from '../dom.js';
import { createPaperCard } from './rendering.js';
import { PaperData } from '../types.js';

const PAPERS_PER_PAGE = 10;
let currentPage = 1;

export function goToPage(pageNum: number): void {
    const papersArray = Object.entries(state.papersData);
    const totalPages = Math.ceil(papersArray.length / PAPERS_PER_PAGE);

    if (pageNum < 1) pageNum = 1;
    if (pageNum > totalPages) pageNum = totalPages;

    currentPage = pageNum;
    applyTagFilter();

    const url = new URL(window.location);
    if (pageNum === 1) {
        url.searchParams.delete('page');
    } else {
        url.searchParams.set('page', pageNum.toString());
    }
    window.history.replaceState({}, '', url);
}

function updatePaginationControls(totalPages: number): void {
    const paginationPrev = get('paginationPrev') as HTMLButtonElement | null;
    const paginationNext = get('paginationNext') as HTMLButtonElement | null;
    const paginationPageInput = get('paginationPageInput') as HTMLInputElement | null;
    const paginationTotal = get('paginationTotal') as HTMLElement | null;

    if (!paginationPrev || !paginationNext || !paginationPageInput || !paginationTotal) return;

    if (totalPages <= 1) {
        paginationPrev.disabled = true;
        paginationNext.disabled = true;
        paginationPageInput.disabled = true;
        paginationPageInput.value = '1';
        paginationTotal.textContent = '1';
    } else {
        paginationPrev.disabled = currentPage <= 1;
        paginationNext.disabled = currentPage >= totalPages;
        paginationPageInput.disabled = false;
        paginationPageInput.value = currentPage.toString();
        paginationPageInput.max = totalPages.toString();
        paginationTotal.textContent = totalPages.toString();
    }
}

export function hasSelectedTag(paper: PaperData): boolean {
    const paperTags = paper._tags || [];
    if (state.selectedTags.size === 0) return true;
    return paperTags.some(tag => state.selectedTags.has(tag));
}

export function applyTagFilter(): void {
    const papersList = get('papersList') as HTMLElement | null;
    if (!papersList) return;
    
    papersList.innerHTML = '';

    const papersArray = Object.entries(state.papersData);
    if (papersArray.length === 0) {
        papersList.innerHTML = '<p class="no-papers">No papers found in the loaded data.</p>';
        updatePaginationControls(0);
        return;
    }

    const sortedPapers = [...papersArray].sort((a, b) => {
        const [doiA, paperA] = a;
        const [doiB, paperB] = b;
        const aHasSelectedTag = hasSelectedTag(paperA);
        const bHasSelectedTag = hasSelectedTag(paperB);

        if (aHasSelectedTag && !bHasSelectedTag) return -1;
        if (!aHasSelectedTag && bHasSelectedTag) return 1;
        return 0;
    });

    const totalPapers = sortedPapers.length;
    const totalPages = Math.max(1, Math.ceil(totalPapers / PAPERS_PER_PAGE));

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    if (currentPage < 1) {
        currentPage = 1;
    }

    const startIndex = (currentPage - 1) * PAPERS_PER_PAGE;
    const endIndex = startIndex + PAPERS_PER_PAGE;
    const pagePapers = sortedPapers.slice(startIndex, endIndex);

    pagePapers.forEach(([doi, paper]) => {
        const citationKey = paper._key || doi;
        const bibInfo = { title: paper.title || citationKey, author: '', journal: '', year: '', month: '', volume: '', number: '', pages: '', ...paper };
        const card = createPaperCard(doi, paper, bibInfo, paper.abstract);

        if (state.selectedTags.size > 0 && !hasSelectedTag(paper)) {
            card.classList.add('paper--dimmed');
        }

        const papersListEl = get('papersList') as HTMLElement | null;
        if (papersListEl) {
            papersListEl.appendChild(card);
        }
    });

    updatePaginationControls(totalPages);

    import('./tags.js').then(({ updateTagVisuals }) => {
        updateTagVisuals();
    });

    import('../ui/index.js').then(({ updateExportButtonStates }) => {
        updateExportButtonStates();
    });
}

export function initEventListeners(): void {
    const paginationPrev = get('paginationPrev') as HTMLButtonElement | null;
    const paginationNext = get('paginationNext') as HTMLButtonElement | null;
    const paginationPageInput = get('paginationPageInput') as HTMLInputElement | null;

    if (paginationPrev) {
        paginationPrev.addEventListener('click', () => {
            goToPage(currentPage - 1);
        });
    }

    if (paginationNext) {
        paginationNext.addEventListener('click', () => {
            goToPage(currentPage + 1);
        });
    }

    if (paginationPageInput) {
        paginationPageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const page = parseInt(paginationPageInput.value, 10);
                if (!isNaN(page)) {
                    goToPage(page);
                }
            }
        });

        paginationPageInput.addEventListener('change', (e) => {
            const page = parseInt((e.target as HTMLInputElement).value, 10);
            if (!isNaN(page)) {
                goToPage(page);
            }
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    if (pageParam) {
        const page = parseInt(pageParam, 10);
        if (!isNaN(page) && page > 1) {
            currentPage = page;
        }
    }
}