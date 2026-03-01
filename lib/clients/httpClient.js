/**
 * Base HTTP client for making fetch requests with consistent headers and error handling
 */

const WORKER_BASE_URL = 'https://argonaut-github-proxy.shernren.workers.dev';

/**
 * Check if a URL is same-origin (internal API)
 */
function isInternalApi(url) {
    return url.startsWith(WORKER_BASE_URL);
}

/**
 * Make an HTTP request with common configuration
 * @param {string} url - The URL to request
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} - The fetch response
 */
export async function httpClient(url, options = {}) {
    console.log('[httpClient] Request:', url, 'options:', JSON.stringify({...options, credentials: options.credentials || 'default'}));
    const { body, ...restOptions } = options;

    // Only include credentials for internal API calls
    const shouldIncludeCredentials = isInternalApi(url);

    // For Crossref and DOI.org, omit credentials and set CORS mode
    const isCrossOriginApi = url.includes('api.crossref.org') || url.includes('doi.org');
    const credentials = isCrossOriginApi ? 'omit'
        : (shouldIncludeCredentials ? 'include' : 'same-origin');

    const defaultOptions = {
        credentials,
        mode: isCrossOriginApi ? 'cors' : undefined,
        ...restOptions,
    };

    // Handle headers - merge with defaults
    const headers = {
        ...options.headers,
    };
    defaultOptions.headers = headers;

    // Remove Content-Type if body is FormData (browser sets it automatically)
    if (body instanceof FormData) {
        delete defaultOptions.headers['Content-Type'];
    }

    // Add body to options
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

/**
 * Make a JSON request with error handling
 * @param {string} url - The URL to request
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - The parsed JSON response
 * @throws {Error} - If the response is not OK
 */
export async function jsonRequest(url, options = {}) {
    // Build headers - include Content-Type and Accept for JSON APIs
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Stringify body if it's an object
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
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
            // Response might not be JSON
        }
        throw new Error(errorMessage);
    }

    return response.json();
}

/**
 * Make a text request (e.g., for BibTeX)
 * @param {string} url - The URL to request
 * @param {object} options - Fetch options
 * @returns {Promise<string>} - The response text
 * @throws {Error} - If the response is not OK
 */
export async function textRequest(url, options = {}) {
    const response = await httpClient(url, {
        ...options,
        // Don't override Accept header if user provided one
        headers: options.headers || {},
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    return response.text();
}
