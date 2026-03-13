export interface PaperData {
    _key: string;
    _doi?: string;
    _tags?: string[];
    _comments?: string;
    _alsoread?: string[];
    title?: string;
    author?: string;
    journal?: string;
    year?: string;
    month?: string;
    volume?: string;
    number?: string;
    pages?: string;
    abstract?: string;
}

export interface BibInfo {
    title: string;
    author: string;
    journal: string;
    year: string;
    month: string;
    volume: string;
    number: string;
    pages: string;
}

export interface AppState {
    papersData: Record<string, PaperData>;
    selectedTags: Set<string>;
    currentEditingKey: string | null;
    currentEditingDoi: string | null;
    tentativeTags: string[];
    tentativeTagsRemoved: string[];
    focusMode: boolean;
}

export interface Store {
    get: () => AppState;
    set: (updates: Partial<AppState>) => void;
    setSelectedTags: (tags: string[] | Set<string>) => void;
    subscribe: (fn: (state: AppState) => void) => () => void;
}

export interface HttpClientOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: string;
}

export interface HttpClientResponse {
    ok: boolean;
    status: number;
    text: () => Promise<string>;
    json: () => Promise<unknown>;
}

export interface DoiResponse {
    status: number;
    text: () => Promise<string>;
}

export interface SemanticScholarPaper {
    paperId: string;
    title: string;
    abstract: string | null;
    authors: { name: string }[];
    year: number | null;
    journal: string | null;
    volume: string | null;
    citationCount: number | null;
}

export interface SemanticScholarResponse {
    data: SemanticScholarPaper[];
}

export interface CrossrefWork {
    DOI: string;
    title?: string[];
    author?: { given?: string; family?: string }[];
    'container-title'?: string[];
    published?: { 'date-parts': number[][] };
    volume?: string;
    issue?: string;
    page?: string;
    abstract?: string;
    reference?: { DOI?: string }[];
}

export interface CrossrefResponse {
    status: string;
    message: {
        items: CrossrefWork[];
        'total-results': number;
    };
}

export interface GitHubUser {
    login: string;
    id: number;
    avatar_url: string;
    name: string;
}

export interface GitHubGist {
    id: string;
    description: string | null;
    files: Record<string, { filename: string; content: string }>;
    created_at: string;
    updated_at: string;
}

export interface GitHubGistResponse {
    id: string;
    description: string | null;
    files: Record<string, { filename: string; content: string }>;
    created_at: string;
    updated_at: string;
}

export interface ExportOptions {
    includeBibInfo: boolean;
    includeAbstracts: boolean;
}

export interface ProcessPapersOptions {
    useCache?: boolean;
}

export type LoadSource = 'default' | 'json' | 'url' | 'storage' | 'gist';

export interface SessionData {
    access_token?: string;
    user?: GitHubUser;
}