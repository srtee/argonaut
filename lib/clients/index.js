/**
 * Client modules - API abstraction layer
 */

// Base HTTP client
export { httpClient, jsonRequest, textRequest } from './httpClient.js';

// DOI Client
export { fetchBibTeX, extractDOI } from './doi.js';

// Semantic Scholar Client
export { fetchAbstract as fetchAbstractFromSemanticScholar } from './semanticScholar.js';

// Crossref Client
export {
    fetchAbstract as fetchAbstractFromCrossref,
    fetchPages as fetchPagesFromCrossref,
    fetchReferences as fetchReferencesFromCrossref,
} from './crossref.js';

// Auth Client
export {
    getSessionId,
    setSessionId,
    clearSessionId,
    checkSession,
    initiateLogin,
    logout,
} from './auth.js';

// GitHub Client
export {
    listGists,
    getGist,
    createGist,
    updateGist,
} from './github.js';
