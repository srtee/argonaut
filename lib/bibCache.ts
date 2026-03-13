import { PaperData, BibInfo } from './types.js';

const CACHE_KEY = 'bibCache';
const MAX_CACHED_PAPERS = 10;

interface CachedPaperData {
    bibtex: string | null;
    bibInfo: BibInfo | null;
    abstract: string | null;
    cachedAt: number;
}

type Cache = Record<string, CachedPaperData>;

function getCache(): Cache {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : {} as Cache;
    } catch (e) {
        console.warn('[BibCache] Failed to load cache:', e);
        return {} as Cache;
    }
}

function saveCache(cache: Cache): void {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn('[BibCache] Failed to save cache:', e);
    }
}

export function getCachedPaper(doi: string): CachedPaperData | null {
    const cache = getCache();
    return cache[doi] || null;
}

export function getAllCachedPapers(): Cache {
    return getCache();
}

export function cachePaper(doi: string, data: { bibtex?: string | null; bibInfo?: BibInfo | null; abstract?: string | null }): void {
    const cache = getCache();

    cache[doi] = {
        bibtex: data.bibtex || null,
        bibInfo: data.bibInfo || null,
        abstract: data.abstract || null,
        cachedAt: Date.now()
    };

    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHED_PAPERS) {
        const sortedKeys = keys.sort((a, b) => {
            return (cache[a]?.cachedAt || 0) - (cache[b]?.cachedAt || 0);
        });
        const toRemove = sortedKeys.slice(0, keys.length - MAX_CACHED_PAPERS);
        toRemove.forEach(k => delete cache[k]);
    }

    saveCache(cache);
    console.log('[BibCache] Cached paper:', doi);
}

export function cachePapers(papersData: Record<string, PaperData>): void {
    const entries = Object.entries(papersData);
    const toCache = entries.slice(0, MAX_CACHED_PAPERS);

    const cache = getCache();

    toCache.forEach(([doi, paper]) => {
        cache[doi] = {
            bibtex: paper.bibtex || null,
            bibInfo: null,
            abstract: paper.abstract || null,
            cachedAt: Date.now()
        };
    });

    saveCache(cache);
    console.log('[BibCache] Cached', toCache.length, 'papers');
}

export function updateCacheKey(oldDoi: string, newDoi: string): void {
    console.log('[BibCache] DOI update not needed:', oldDoi, '->', newDoi);
}

export function removeCachedPaper(doi: string): void {
    const cache = getCache();
    delete cache[doi];
    saveCache(cache);
    console.log('[BibCache] Removed cached paper:', doi);
}

export function clearCache(): void {
    localStorage.removeItem(CACHE_KEY);
    console.log('[BibCache] Cache cleared');
}

export function hasCachedPaper(doi: string): boolean {
    const cache = getCache();
    return !!cache[doi];
}

export function getCacheStats(): { count: number; max: number; keys: string[] } {
    const cache = getCache();
    return {
        count: Object.keys(cache).length,
        max: MAX_CACHED_PAPERS,
        keys: Object.keys(cache)
    };
}