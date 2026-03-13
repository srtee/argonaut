import { jsonRequest } from './httpClient.js';
import { SemanticScholarResponse } from '../types.js';

const SEMANTIC_SCHOLAR_BASE_URL = 'https://api.semanticscholar.org/graph/v1/paper';

export async function fetchAbstract(doi: string): Promise<string | null> {
    try {
        const data = await jsonRequest<SemanticScholarResponse>(
            `${SEMANTIC_SCHOLAR_BASE_URL}/DOI:${encodeURIComponent(doi)}?fields=abstract`
        );

        if (data.data?.[0]?.abstract) {
            return data.data[0].abstract;
        }

        return null;
    } catch (err) {
        console.error('[SemanticScholarClient] Error fetching abstract:', err);
        return null;
    }
}