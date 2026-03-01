/**
 * Bibliography Cache Module
 * Caches bibliographic data (BibTeX, abstracts, page numbers) for quick reload
 * Uses DOI as the reference key for each paper
 */

const CACHE_KEY = 'bibCache';
const MAX_CACHED_PAPERS = 10;

/**
 * Get the current cache
 */
function getCache() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : {};
    } catch (e) {
        console.warn('[BibCache] Failed to load cache:', e);
        return {};
    }
}

/**
 * Save the cache
 */
function saveCache(cache) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn('[BibCache] Failed to save cache:', e);
    }
}

/**
 * Get cached data for a specific DOI
 */
export function getCachedPaper(doi) {
    const cache = getCache();
    return cache[doi] || null;
}

/**
 * Get all cached papers
 */
export function getAllCachedPapers() {
    return getCache();
}

/**
 * Cache bibliographic data for a paper (using DOI as key)
 */
export function cachePaper(doi, data) {
    const cache = getCache();

    cache[doi] = {
        bibtex: data.bibtex || null,
        bibInfo: data.bibInfo || null,
        abstract: data.abstract || null,
        cachedAt: Date.now()
    };

    // Limit cache to MAX_CACHED_PAPERS entries
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHED_PAPERS) {
        // Remove oldest entries
        const sortedKeys = keys.sort((a, b) => {
            return (cache[a].cachedAt || 0) - (cache[b].cachedAt || 0);
        });
        const toRemove = sortedKeys.slice(0, keys.length - MAX_CACHED_PAPERS);
        toRemove.forEach(k => delete cache[k]);
    }

    saveCache(cache);
    console.log('[BibCache] Cached paper:', doi);
}

/**
 * Cache multiple papers (for batch processing)
 */
export function cachePapers(papersData) {
    const entries = Object.entries(papersData);
    const toCache = entries.slice(0, MAX_CACHED_PAPERS);

    const cache = getCache();

    toCache.forEach(([doi, paper]) => {
        cache[doi] = {
            bibtex: paper.bibtex || null,
            bibInfo: paper.bibInfo || null,
            abstract: paper.abstract || null,
            cachedAt: Date.now()
        };
    });

    saveCache(cache);
    console.log('[BibCache] Cached', toCache.length, 'papers');
}

/**
 * Update cache for a DOI (no-op since DOI is immutable)
 */
export function updateCacheKey(oldDoi, newDoi) {
    // DOI is immutable - no update needed
    console.log('[BibCache] DOI update not needed:', oldDoi, '->', newDoi);
}

/**
 * Remove a paper from cache
 */
export function removeCachedPaper(doi) {
    const cache = getCache();
    delete cache[doi];
    saveCache(cache);
    console.log('[BibCache] Removed cached paper:', doi);
}

/**
 * Clear all cached data
 */
export function clearCache() {
    localStorage.removeItem(CACHE_KEY);
    console.log('[BibCache] Cache cleared');
}

/**
 * Check if cache has data for a DOI
 */
export function hasCachedPaper(doi) {
    const cache = getCache();
    return !!cache[doi];
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
    const cache = getCache();
    return {
        count: Object.keys(cache).length,
        max: MAX_CACHED_PAPERS,
        keys: Object.keys(cache)
    };
}
