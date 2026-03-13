import { jsonRequest } from './httpClient.js';
import { CrossrefResponse } from '../types.js';

const CROSSREF_BASE_URL = 'https://api.crossref.org/works';

export async function fetchAbstract(doi: string): Promise<string | null> {
    try {
        const url = `${CROSSREF_BASE_URL}/${encodeURIComponent(doi)}`;
        console.log('[CrossrefClient] fetchAbstract URL:', url);
        const data = await jsonRequest<CrossrefResponse>(url);

        console.log('[CrossrefClient] fetchAbstract response:', data.message);
        if (data.message?.abstract) {
            return data.message.abstract;
        }

        return null;
    } catch (err) {
        console.error('[CrossrefClient] Error fetching abstract:', err);
        return null;
    }
}

export async function fetchPages(doi: string): Promise<string | null> {
    console.log('[CrossrefClient] fetchPages called with doi:', doi, 'type:', typeof doi);
    try {
        const url = `${CROSSREF_BASE_URL}/${encodeURIComponent(doi)}`;
        console.log('[CrossrefClient] fetchPages URL:', url);
        const data = await jsonRequest<CrossrefResponse>(url);

        console.log('[CrossrefClient] fetchPages response:', data.message);
        if (data.message) {
            if (data.message.page) {
                return data.message.page;
            }
            if (data.message['article-number']) {
                return data.message['article-number'];
            }
        }

        return null;
    } catch (err) {
        console.error('[CrossrefClient] Error fetching pages:', err);
        console.error('[CrossrefClient] Error stack:', (err as Error).stack);
        return null;
    }
}

export async function fetchReferences(doi: string): Promise<CrossrefResponse['message']['reference'] | null> {
    try {
        const url = `${CROSSREF_BASE_URL}/${encodeURIComponent(doi)}`;
        console.log('[CrossrefClient] fetchReferences URL:', url);
        const data = await jsonRequest<CrossrefResponse>(url);

        console.log('[CrossrefClient] fetchReferences response:', data.message);
        if (data.message?.reference) {
            return data.message.reference;
        }

        return null;
    } catch (err) {
        console.error('[CrossrefClient] Error fetching references:', err);
        return null;
    }
}