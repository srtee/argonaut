/**
 * Base HTTP client for making fetch requests with consistent headers and error handling
 */

/**
 * Make an HTTP request with common configuration
 * @param {string} url - The URL to request
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} - The fetch response
 */
export async function httpClient(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Accept': 'application/json',
            ...options.headers,
        },
        credentials: 'include',
        ...options,
    };

    // Remove Content-Type if body is FormData (browser sets it automatically)
    if (body instanceof FormData) {
        delete defaultOptions.headers['Content-Type'];
    }

    const response = await fetch(url, defaultOptions);

    return response;
}

/**
 * Make a JSON request with error handling
 * @param {string} url - The URL to request
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - The parsed JSON response
 * @throws {Error} - If the response is not OK
 */
export async function jsonRequest(url, options = {}) {
    const response = await httpClient(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers,
        },
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
    const response = await httpClient(url, options);

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    return response.text();
}
