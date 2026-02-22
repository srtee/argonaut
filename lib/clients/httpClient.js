/**
 * Base HTTP client for making fetch requests with consistent headers and error handling
 */

const WORKER_BASE_URL = 'https://argonaut-github-proxy.shernren.workers.dev';

// Crossref API requires User-Agent with contact email
const CROSSREF_USER_AGENT = 'Argonaut/1.0 (https://argonaut.app; mailto:contact@argonaut.app)';

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

    const defaultOptions = {
        credentials: shouldIncludeCredentials ? 'include' : 'same-origin',
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
    // Add User-Agent for Crossref API (required by their etiquette)
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
    };
    if (url.includes('api.crossref.org')) {
        headers['User-Agent'] = CROSSREF_USER_AGENT;
    }

    const response = await httpClient(url, {
        ...options,
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
