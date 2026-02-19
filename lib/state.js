// Global state management with immutability and auto-persistence

const STORAGE_KEY = 'appState';
const WORKER_BASE_URL = 'https://argonaut-github-proxy.shernren.workers.dev';

// Initial state definition
const initialState = {
    papersData: {},
    selectedTags: new Set(),
    processedPapersData: [],
    currentEditingKey: null,
    tentativeTags: [],
    tentativeTagsRemoved: []
};

// Change notification listeners
const listeners = new Set();

// Persist state to sessionStorage
const persist = (state) => {
    try {
        const toSave = {
            ...state,
            selectedTags: Array.from(state.selectedTags) // Set → Array for JSON
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
        console.warn('Failed to persist state:', e);
    }
};

// Restore state from sessionStorage
const loadFromStorage = () => {
    try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.warn('Failed to load state from storage:', e);
        return {};
    }
};

// Initialize state from storage
let _state = {
    ...initialState,
    ...loadFromStorage(),
    selectedTags: new Set(loadFromStorage().selectedTags || [])
};

// Store API
export const store = {
    /**
     * Get a copy of the current state (immutable)
     * @returns {Object} Copy of current state
     */
    get: () => ({ ..._state }),

    /**
     * Update state with partial updates (immutable)
     * @param {Object} updates - Key-value pairs to update
     */
    set: (updates) => {
        _state = { ..._state, ...updates };
        persist(_state);
        listeners.forEach(fn => fn(_state));
    },

    /**
     * Set selected tags (special handler for Set)
     * @param {string[]|Set} tags - Array or Set of tags
     */
    setSelectedTags: (tags) => {
        _state = { ..._state, selectedTags: new Set(tags) };
        persist(_state);
        listeners.forEach(fn => fn(_state));
    },

    /**
     * Subscribe to state changes
     * @param {Function} fn - Callback function receiving new state
     * @returns {Function} Unsubscribe function
     */
    subscribe: (fn) => {
        listeners.add(fn);
        // Immediately call with current state
        fn(_state);
        return () => listeners.delete(fn);
    }
};

// Backward compatibility: export `state` as a proxy
// Reads work, writes warn and redirect to store.set()
export const state = new Proxy({}, {
    get(_, prop) {
        return _state[prop];
    },
    set(_, prop, value) {
        console.warn(`Direct mutation of state.${prop} is discouraged. Use store.set() instead.`);
        _state[prop] = value;
        return true;
    }
});

// Export the worker base URL constant
export { WORKER_BASE_URL };