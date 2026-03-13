export { httpClient, jsonRequest, textRequest } from './httpClient.js';

export { fetchBibTeX, extractDOI } from './doi.js';

export { fetchAbstract as fetchAbstractFromSemanticScholar } from './semanticScholar.js';

export {
    fetchAbstract as fetchAbstractFromCrossref,
    fetchPages as fetchPagesFromCrossref,
    fetchReferences as fetchReferencesFromCrossref,
} from './crossref.js';

export {
    getSessionId,
    setSessionId,
    clearSessionId,
    checkSession,
    initiateLogin,
    logout,
} from './auth.js';

export {
    listGists,
    getGist,
    createGist,
    updateGist,
} from './github.js';