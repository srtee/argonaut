type ElementMap = Record<string, HTMLElement | null>;

const registry = new Map<string, HTMLElement>();
const moduleElements = new Map<string, ElementMap>();

export function register(moduleName: string, elements: ElementMap): void {
    moduleElements.set(moduleName, elements);
    console.log(`[DOM Registry] Registered ${Object.keys(elements).length} elements for module: ${moduleName}`);
}

export function get(id: string): HTMLElement | null {
    return registry.get(id) || null;
}

export function getRequired(id: string): HTMLElement {
    const element = registry.get(id);
    if (!element) {
        throw new Error(`[DOM Registry] Required element not found: #${id}`);
    }
    return element;
}

export function getMultiple(...ids: string[]): ElementMap {
    const result: ElementMap = {};
    for (const id of ids) {
        result[id] = registry.get(id) || null;
    }
    return result;
}

export function has(id: string): boolean {
    return registry.has(id);
}

export function initAll(): void {
    console.log('[DOM Registry] Initializing all DOM elements...');

    registerUI();
    registerAuth();
    registerPapers();
    registerGitHub();

    validateRegistry();

    console.log('[DOM Registry] Initialization complete');
}

function registerUI(): void {
    register('ui', {
        loadJsonSection: document.getElementById('loadJsonSection'),
        saveJsonSection: document.getElementById('saveJsonSection'),
        papersSection: document.getElementById('papersSection'),
        exportResetSection: document.getElementById('exportResetSection'),
        papersList: document.getElementById('papersList'),
        fileInput: document.getElementById('fileInput'),
        urlInput: document.getElementById('urlInput'),
        loadUrlBtn: document.getElementById('loadUrlBtn'),
        loadFromStorageBtn: document.getElementById('loadFromStorageBtn'),
        loadNewBtn: document.getElementById('loadNewBtn'),
        saveToStorageBtn: document.getElementById('saveToStorageBtn'),
        exportJsonBtn: document.getElementById('exportJsonBtn'),
        exportBibtexAllBtn: document.getElementById('exportBibtexAllBtn'),
        exportBibtexTaggedBtn: document.getElementById('exportBibtexTaggedBtn'),
        includeBibInfo: document.getElementById('includeBibInfo'),
        includeAbstracts: document.getElementById('includeAbstracts'),
        error: document.getElementById('error'),
        status: document.getElementById('status'),
        themeToggle: document.getElementById('themeToggle'),
        onboardingModal: document.getElementById('onboardingModal'),
        closeOnboardingBtn: document.getElementById('closeOnboardingBtn'),
        showOnboardingBtn: document.getElementById('showOnboardingBtn'),
        onboardingNextBtn: document.getElementById('onboardingNextBtn'),
        onboardingBackBtn: document.getElementById('onboardingBackBtn'),
        onboardingCompleteBtn: document.getElementById('onboardingCompleteBtn'),
    });
}

function registerAuth(): void {
    register('auth', {
        githubSection: document.getElementById('githubSection'),
        githubNotLoggedIn: document.getElementById('githubNotLoggedIn'),
        githubLoggedIn: document.getElementById('githubLoggedIn'),
        githubConnectBtn: document.getElementById('githubConnectBtn'),
        githubLogoutBtn: document.getElementById('githubLogoutBtn'),
        githubUserAvatar: document.getElementById('githubUserAvatar'),
        githubUserName: document.getElementById('githubUserName'),
        gistConnectedContent: document.getElementById('gistConnectedContent'),
        saveGistConnectedContent: document.getElementById('saveGistConnectedContent'),
    });
}

function registerPapers(): void {
    register('papers', {
        papersList: document.getElementById('papersList'),
        loadJsonSection: document.getElementById('loadJsonSection'),
        saveJsonSection: document.getElementById('saveJsonSection'),
        exportResetSection: document.getElementById('exportResetSection'),
        papersSection: document.getElementById('papersSection'),
        doiInput: document.getElementById('doiInput'),
        doiKeyInput: document.getElementById('doiKeyInput'),
        addDoiBtn: document.getElementById('addDoiBtn'),
        fetchReferencesCheckbox: document.getElementById('fetchReferencesCheckbox'),
        paginationControls: document.getElementById('papersPagination'),
        paginationPrev: document.getElementById('paginationPrev'),
        paginationNext: document.getElementById('paginationNext'),
        paginationPageInput: document.getElementById('paginationPageInput'),
        paginationTotal: document.getElementById('paginationTotal'),
        focusModeToggle: document.getElementById('focusModeToggle'),
        status: document.getElementById('status'),
        exportBibtexTaggedBtn: document.getElementById('exportBibtexTaggedBtn'),
    });
}

function registerGitHub(): void {
    register('github', {
        loadGistSelector: document.getElementById('loadGistSelector'),
        saveGistSelector: document.getElementById('saveGistSelector'),
        loadFromGistCollectionBtn: document.getElementById('loadFromGistCollectionBtn'),
        saveToGistOptionBtn: document.getElementById('saveToGistOptionBtn'),
        gistConnectedContent: document.getElementById('gistConnectedContent'),
        saveGistConnectedContent: document.getElementById('saveGistConnectedContent'),
    });
}

function validateRegistry(): void {
    let missingCount = 0;

    for (const [moduleName, elements] of moduleElements) {
        for (const [name, element] of Object.entries(elements)) {
            if (!element) {
                console.warn(`[DOM Registry] Missing element: #${name} (module: ${moduleName})`);
                missingCount++;
            } else {
                registry.set(name, element);
            }
        }
    }

    if (missingCount > 0) {
        console.warn(`[DOM Registry] ${missingCount} element(s) missing from DOM`);
    }

    console.log(`[DOM Registry] ${registry.size} elements registered`);
}

export function getRegisteredIds(): string[] {
    return Array.from(registry.keys());
}

interface RegistryStats {
    total: number;
    byModule: Record<string, { found: number; total: number }>;
}

export function getStats(): RegistryStats {
    const stats: RegistryStats = {
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