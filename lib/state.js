// Global state management

export const state = {
    papersData: {},
    selectedTags: new Set(),
    processedPapersData: [],
    currentEditingKey: null,
    tentativeTags: [],
    tentativeTagsRemoved: []
};

export const WORKER_BASE_URL = 'https://argonaut-github-proxy.shernren.workers.dev';