import { textRequest } from './httpClient.js';

const DOI_BASE_URL = 'https://doi.org';

export function extractDOI(input: string): string | null {
    const doiRegex = /(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i;
    const match = input.match(doiRegex);
    return match ? match[1] : null;
}

export async function fetchBibTeX(doi: string): Promise<string | null> {
    try {
        console.log('[DOIClient] Fetching BibTeX for DOI:', doi);
        const bibtex = await textRequest(`${DOI_BASE_URL}/${encodeURIComponent(doi)}`, {
            headers: {
                'Accept': 'application/x-bibtex',
            },
        });
        console.log('[DOIClient] Received BibTeX:', bibtex ? bibtex.substring(0, 200) + '...' : 'null');
        return bibtex;
    } catch (err) {
        console.error('[DOIClient] Error fetching BibTeX:', err);
        return null;
    }
}