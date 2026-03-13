import { jsonRequest } from './httpClient.js';
import { getSessionId } from './auth.js';
import { WORKER_BASE_URL } from '../state.js';
import { GitHubGist } from '../types.js';

const GITHUB_API_BASE = `${WORKER_BASE_URL}/api/github/gists`;

function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const sessionId = getSessionId();
    if (sessionId) {
        headers['Authorization'] = `Bearer ${sessionId}`;
    }
    return headers;
}

interface GistFiles {
    [filename: string]: { content: string };
}

export async function listGists(): Promise<GitHubGist[]> {
    try {
        const gists = await jsonRequest<GitHubGist[]>(GITHUB_API_BASE, {
            headers: getAuthHeaders(),
        });
        return gists;
    } catch (err) {
        console.error('[GitHubClient] Error listing gists:', err);
        throw err;
    }
}

export async function getGist(gistId: string): Promise<GitHubGist> {
    try {
        const gist = await jsonRequest<GitHubGist>(`${GITHUB_API_BASE}/${gistId}`, {
            headers: getAuthHeaders(),
        });
        return gist;
    } catch (err) {
        console.error('[GitHubClient] Error getting gist:', err);
        throw err;
    }
}

export async function createGist(files: GistFiles, description = 'Argonaut Papers'): Promise<GitHubGist> {
    try {
        const gist = await jsonRequest<GitHubGist>(GITHUB_API_BASE, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: { description, public: false, files },
        });
        return gist;
    } catch (err) {
        console.error('[GitHubClient] Error creating gist:', err);
        throw err;
    }
}

export async function updateGist(gistId: string, files: GistFiles, description = 'Argonaut Papers'): Promise<GitHubGist> {
    try {
        const gist = await jsonRequest<GitHubGist>(`${GITHUB_API_BASE}/${gistId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: { description, files },
        });
        return gist;
    } catch (err) {
        console.error('[GitHubClient] Error updating gist:', err);
        throw err;
    }
}