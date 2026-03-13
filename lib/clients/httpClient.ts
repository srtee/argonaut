import { HttpClientOptions } from '../types.js';

const WORKER_BASE_URL = 'https://argonaut-github-proxy.shernren.workers.dev';

function isInternalApi(url: string): boolean {
    return url.startsWith(WORKER_BASE_URL);
}

export async function httpClient(url: string, options: HttpClientOptions = {}): Promise<Response> {
    console.log('[httpClient] Request:', url, 'options:', JSON.stringify({...options, credentials: options.credentials || 'default'}));
    const { body, ...restOptions } = options;

    const shouldIncludeCredentials = isInternalApi(url);

    const isCrossOriginApi = url.includes('api.crossref.org') || url.includes('doi.org');
    const credentials = isCrossOriginApi ? 'omit'
        : (shouldIncludeCredentials ? 'include' : 'same-origin');

    const defaultOptions: RequestInit = {
        credentials,
        mode: isCrossOriginApi ? 'cors' : undefined,
        ...restOptions,
    };

    const headers: Record<string, string> = {
        ...options.headers,
    };
    defaultOptions.headers = headers;

    if (body instanceof FormData) {
        delete defaultOptions.headers['Content-Type'];
    }

    if (body !== undefined) {
        defaultOptions.body = body;
    }

    console.log('[httpClient] Fetching:', url, 'options:', defaultOptions);
    try {
        const response = await fetch(url, defaultOptions);
        console.log('[httpClient] Response status:', response.status, 'ok:', response.ok);
        return response;
    } catch (err) {
        console.error('[httpClient] Fetch error:', err);
        throw err;
    }
}

export async function jsonRequest<T = unknown>(url: string, options: HttpClientOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const body = options.body && typeof options.body === 'object'
        ? JSON.stringify(options.body)
        : options.body;

    const response = await httpClient(url, {
        ...options,
        body,
        headers,
    });

    if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
            const errorData = await response.json() as { error?: string; message?: string };
            errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
            // Response might not be JSON
        }
        throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
}

export async function textRequest(url: string, options: HttpClientOptions = {}): Promise<string> {
    const response = await httpClient(url, {
        ...options,
        headers: options.headers || {},
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    return response.text();
}