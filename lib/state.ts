import { AppState, Store } from './types.js';

const STORAGE_KEY = 'appState';
export const WORKER_BASE_URL = 'https://argonaut-github-proxy.shernren.workers.dev';

const initialState: AppState = {
    papersData: {},
    selectedTags: new Set<string>(),
    currentEditingKey: null,
    currentEditingDoi: null,
    tentativeTags: [],
    tentativeTagsRemoved: [],
    focusMode: false
};

const listeners = new Set<(state: AppState) => void>();

const persist = (state: AppState): void => {
    try {
        const toSave = {
            ...state,
            selectedTags: Array.from(state.selectedTags)
        };
        if (toSave.papersData && Object.keys(toSave.papersData).length > 0) {
            const sample = Object.entries(toSave.papersData).slice(0, 2);
            console.log('[State] Sample _key:', sample.map(([k, v]) => ({ key: k, _key: v._key, title: v.title })));
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
        console.warn('Failed to persist state:', e);
    }
};

const loadFromStorage = (): Partial<AppState> => {
    try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            console.log('[State] Loaded from sessionStorage, keys:', Object.keys(parsed));
            return parsed;
        }
        return {};
    } catch (e) {
        console.warn('Failed to load state from storage:', e);
        return {};
    }
};

let _state: AppState = {
    ...initialState,
    ...loadFromStorage(),
    selectedTags: new Set((loadFromStorage().selectedTags as string[]) || [])
};

export const store: Store = {
    get: () => ({ ..._state }),

    set: (updates: Partial<AppState>) => {
        _state = { ..._state, ...updates };
        persist(_state);
        listeners.forEach(fn => fn(_state));
    },

    setSelectedTags: (tags: string[] | Set<string>) => {
        _state = { ..._state, selectedTags: new Set(tags) };
        persist(_state);
        listeners.forEach(fn => fn(_state));
    },

    subscribe: (fn: (state: AppState) => void) => {
        listeners.add(fn);
        fn(_state);
        return () => listeners.delete(fn);
    }
};

export const state = new Proxy<Record<string, unknown>>({}, {
    get(_, prop) {
        return _state[prop as keyof AppState];
    },
    set(_, prop, value) {
        console.warn(`Direct mutation of state.${String(prop)} is discouraged. Use store.set() instead.`);
        _state[prop as keyof AppState] = value as never;
        return true;
    }
});