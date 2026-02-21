/**
 * DOM Registry - Centralized DOM element management
 *
 * Provides a single source of truth for all DOM element references.
 * Modules register their elements, and the registry validates and provides access.
 */

// Registry storage
const registry = new Map();

// Module registrations
const moduleElements = new Map();

/**
 * Register elements for a specific module
 * @param {string} moduleName - Name of the module (e.g., 'ui', 'auth', 'papers', 'github')
 * @param {Object} elements - Object mapping element IDs to their DOM references
 */
export function register(moduleName, elements) {
    moduleElements.set(moduleName, elements);
    console.log(`[DOM Registry] Registered ${Object.keys(elements).length} elements for module: ${moduleName}`);
}

/**
 * Get an element by ID
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} - The element or null if not found
 */
export function get(id) {
    return registry.get(id) || null;
}

/**
 * Get an element by ID, throwing if not found
 * @param {string} id - Element ID
 * @returns {HTMLElement} - The element
 * @throws {Error} - If element is not found
 */
export function getRequired(id) {
    const element = registry.get(id);
    if (!element) {
        throw new Error(`[DOM Registry] Required element not found: #${id}`);
    }
    return element;
}

/**
 * Get multiple elements at once
 * @param {...string} ids - Element IDs to retrieve
 * @returns {Object} - Object mapping IDs to elements (null for missing)
 */
export function getMultiple(...ids) {
    const result = {};
    for (const id of ids) {
        result[id] = registry.get(id) || null;
    }
    return result;
}

/**
 * Check if an element exists in the registry
 * @param {string} id - Element ID
 * @returns {boolean} - True if element exists
 */
export function has(id) {
    return registry.has(id);
}

/**
 * Initialize all registered elements
 * Calls all module registration functions and validates elements
 */
export function initAll() {
    console.log('[DOM Registry] Initializing all DOM elements...');

    // Register all module elements
    registerUI();
    registerAuth();
    registerPapers();
    registerGitHub();

    // Validate all required elements
    validateRegistry();

    console.log('[DOM Registry] Initialization complete');
}

/**
 * Register UI module elements
 */
function registerUI() {
    register('ui', {
        // Main sections
        loadJsonSection: document.getElementById('loadJsonSection'),
        saveJsonSection: document.getElementById('saveJsonSection'),
        papersSection: document.getElementById('papersSection'),
        exportResetSection: document.getElementById('exportResetSection'),
        papersList: document.getElementById('papersList'),

        // Load inputs
        fileInput: document.getElementById('fileInput'),
        urlInput: document.getElementById('urlInput'),
        loadUrlBtn: document.getElementById('loadUrlBtn'),
        loadFromStorageBtn: document.getElementById('loadFromStorageBtn'),
        loadNewBtn: document.getElementById('loadNewBtn'),

        // Save/Export
        saveToStorageBtn: document.getElementById('saveToStorageBtn'),
        exportJsonBtn: document.getElementById('exportJsonBtn'),
        exportBibtexAllBtn: document.getElementById('exportBibtexAllBtn'),
        exportBibtexTaggedBtn: document.getElementById('exportBibtexTaggedBtn'),

        // Format selector
        jsonFormatSelector: document.getElementById('jsonFormatSelector'),

        // Notifications
        error: document.getElementById('error'),
        status: document.getElementById('status'),

        // Theme
        themeToggle: document.getElementById('themeToggle'),

        // Onboarding
        onboardingModal: document.getElementById('onboardingModal'),
        closeOnboardingBtn: document.getElementById('closeOnboardingBtn'),
        showOnboardingBtn: document.getElementById('showOnboardingBtn'),
        onboardingNextBtn: document.getElementById('onboardingNextBtn'),
        onboardingBackBtn: document.getElementById('onboardingBackBtn'),
        onboardingCompleteBtn: document.getElementById('onboardingCompleteBtn'),
    });
}

/**
 * Register Auth module elements
 */
function registerAuth() {
    register('auth', {
        // GitHub auth
        githubSection: document.getElementById('githubSection'),
        githubNotLoggedIn: document.getElementById('githubNotLoggedIn'),
        githubLoggedIn: document.getElementById('githubLoggedIn'),
        githubConnectBtn: document.getElementById('githubConnectBtn'),
        githubLogoutBtn: document.getElementById('githubLogoutBtn'),
        githubUserAvatar: document.getElementById('githubUserAvatar'),
        githubUserName: document.getElementById('githubUserName'),

        // Visibility toggles (shared with other modules)
        gistConnectedContent: document.getElementById('gistConnectedContent'),
        saveGistConnectedContent: document.getElementById('saveGistConnectedContent'),
    });
}

/**
 * Register Papers module elements
 */
function registerPapers() {
    register('papers', {
        // Main sections (shared with ui)
        papersList: document.getElementById('papersList'),
        loadJsonSection: document.getElementById('loadJsonSection'),
        saveJsonSection: document.getElementById('saveJsonSection'),
        exportResetSection: document.getElementById('exportResetSection'),
        papersSection: document.getElementById('papersSection'),

        // DOI input
        doiInput: document.getElementById('doiInput'),
        doiKeyInput: document.getElementById('doiKeyInput'),
        addDoiBtn: document.getElementById('addDoiBtn'),

        // Status (shared with ui)
        status: document.getElementById('status'),

        // Export buttons
        exportBibtexTaggedBtn: document.getElementById('exportBibtexTaggedBtn'),
    });
}

/**
 * Register GitHub module elements
 */
function registerGitHub() {
    register('github', {
        // Gist selectors
        loadGistSelector: document.getElementById('loadGistSelector'),
        saveGistSelector: document.getElementById('saveGistSelector'),
        loadFromGistCollectionBtn: document.getElementById('loadFromGistCollectionBtn'),
        saveToGistOptionBtn: document.getElementById('saveToGistOptionBtn'),

        // Visibility toggles
        gistConnectedContent: document.getElementById('gistConnectedContent'),
        saveGistConnectedContent: document.getElementById('saveGistConnectedContent'),

        // Format selector (shared with ui)
        jsonFormatSelector: document.getElementById('jsonFormatSelector'),
    });
}

/**
 * Validate that all registered elements exist in the DOM
 * Logs warnings for missing elements
 */
function validateRegistry() {
    let missingCount = 0;

    for (const [moduleName, elements] of moduleElements) {
        for (const [name, element] of Object.entries(elements)) {
            if (!element) {
                console.warn(`[DOM Registry] Missing element: #${name} (module: ${moduleName})`);
                missingCount++;
            } else {
                // Add to registry
                registry.set(name, element);
            }
        }
    }

    if (missingCount > 0) {
        console.warn(`[DOM Registry] ${missingCount} element(s) missing from DOM`);
    }

    console.log(`[DOM Registry] ${registry.size} elements registered`);
}

/**
 * Get all registered element IDs
 * @returns {string[]} - Array of registered element IDs
 */
export function getRegisteredIds() {
    return Array.from(registry.keys());
}

/**
 * Get registry statistics
 * @returns {Object} - Statistics about registered elements
 */
export function getStats() {
    const stats = {
        total: registry.size,
        byModule: {}
    };

    for (const [moduleName, elements] of moduleElements) {
        const found = Object.values(elements).filter(e => e !== null).length;
        const total = Object.keys(elements).length;
        stats.byModule[moduleName] = { found, total };
    }

    return stats;
}
