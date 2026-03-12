import { state, store } from '../state.js';
import { get } from '../dom.js';
import { extractDOI, fetchBibTeX, fetchReferencesFromCrossref } from '../clients/index.js';
import { parseBibTeX, generateDefaultKey } from './bibtex.js';

export { extractDOI };

export async function fetchAbstract(doi) {
    const { fetchAbstractFromSemanticScholar, fetchAbstractFromCrossref } = await import('../clients/index.js');
    let abstract = await fetchAbstractFromSemanticScholar(doi);
    if (abstract) {
        return abstract;
    }
    abstract = await fetchAbstractFromCrossref(doi);
    return abstract;
}

export async function addPaperByDoi() {
    const doiInput = get('doiInput');
    const doiKeyInput = get('doiKeyInput');

    const input = doiInput.value.trim();
    const customKey = doiKeyInput.value.trim();

    if (!input) {
        const { showError } = await import('../ui/index.js');
        showError('Please enter a DOI or URL');
        return;
    }

    const doi = extractDOI(input);
    if (!doi) {
        const { showError } = await import('../ui/index.js');
        showError('Could not extract a valid DOI from the input. Please enter a valid DOI (e.g., 10.xxxx/xxxx) or a URL containing a DOI.');
        return;
    }

    try {
        const { showStatus, showError: showErr } = await import('../ui/index.js');
        showStatus(`Fetching paper: ${doi}...`);

        const bibtex = await fetchBibTeX(doi);
        if (!bibtex) {
            showErr('Failed to fetch BibTeX for this DOI');
            return;
        }

        const bibInfo = parseBibTeX(bibtex);
        const key = customKey || generateDefaultKey(bibInfo);

        if (state.papersData[doi]) {
            showErr(`Paper with DOI "${doi}" already exists.`);
            return;
        }

        const abstract = await fetchAbstract(doi);

        store.set({
            papersData: {
                ...state.papersData,
                [doi]: {
                    _key: key,
                    ...(bibInfo.title ? { title: bibInfo.title } : {}),
                    ...(bibInfo.author ? { author: bibInfo.author } : {}),
                    ...(bibInfo.journal ? { journal: bibInfo.journal } : {}),
                    ...(bibInfo.year ? { year: bibInfo.year } : {}),
                    ...(bibInfo.volume ? { volume: bibInfo.volume } : {}),
                    ...(bibInfo.number ? { number: bibInfo.number } : {}),
                    ...(bibInfo.pages ? { pages: bibInfo.pages } : {}),
                    ...(abstract ? { abstract } : {}),
                }
            }
        });

        const { applyTagFilter, goToPage } = await import('./index.js');
        applyTagFilter();

        const { showPapersState } = await import('../ui/visibility.js');
        if (Object.keys(state.papersData).length === 1) {
            showPapersState();
        }

        const fetchReferencesCheckbox = get('fetchReferencesCheckbox');

        if (fetchReferencesCheckbox && fetchReferencesCheckbox.checked) {
            showStatus(`Fetching references for "${key}"...`);

            const references = await fetchReferencesFromCrossref(doi);
            if (references && references.length > 0) {
                const referencesWithDoi = references.filter(ref => ref.DOI);
                showStatus(`Found ${referencesWithDoi.length} references, fetching...`);

                let addedCount = 0;
                for (const ref of referencesWithDoi) {
                    showStatus(`Fetching reference ${addedCount + 1} of ${referencesWithDoi.length}: ${ref.DOI}...`);

                    await new Promise(resolve => setTimeout(resolve, 200));

                    try {
                        const refBibtex = await fetchBibTeX(ref.DOI);
                        if (refBibtex) {
                            const refBibInfo = parseBibTeX(refBibtex);
                            const refKey = generateDefaultKey(refBibInfo);

                            if (state.papersData[ref.DOI]) {
                                console.log(`[Papers] Skipping duplicate reference: ${ref.DOI}`);
                                continue;
                            }

                            store.set({
                                papersData: {
                                    ...state.papersData,
                                    [ref.DOI]: {
                                        _key: refKey,
                                        _doi: ref.DOI,
                                        ...(refBibInfo.title && { title: refBibInfo.title }),
                                        ...(refBibInfo.author && { author: refBibInfo.author }),
                                        ...(refBibInfo.journal && { journal: refBibInfo.journal }),
                                        ...(refBibInfo.year && { year: refBibInfo.year }),
                                        ...(refBibInfo.volume && { volume: refBibInfo.volume }),
                                        ...(refBibInfo.number && { number: refBibInfo.number }),
                                        ...(refBibInfo.pages && { pages: refBibInfo.pages }),
                                    }
                                }
                            });

                            addedCount++;
                        }
                    } catch (refErr) {
                        console.error(`[Papers] Error fetching reference ${ref.DOI}:`, refErr);
                    }
                }

                applyTagFilter();
                showStatus(`Paper "${key}" and ${addedCount} reference(s) added successfully`);
            } else {
                showStatus(`Paper "${key}" added successfully (no references found)`);
            }
        } else {
            showStatus(`Paper "${key}" added successfully`);
        }

        setTimeout(() => {
            const escapedKey = CSS.escape(key);
            const newCard = document.querySelector(`.paper[data-key="${escapedKey}"]`);
            if (newCard) {
                newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                newCard.classList.add('paper--highlight');
                setTimeout(() => newCard.classList.remove('paper--highlight'), 2000);
            }
        }, 100);

    } catch (err) {
        console.error('Error adding paper:', err);
        const { showError } = await import('../ui/index.js');
        showError('Error adding paper: ' + err.message);
    }
}