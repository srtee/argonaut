import { WORKER_BASE_URL } from '../state.js';
import { GitHubUser, SessionData } from '../types.js';

export function getSessionId(): string | null {
    return localStorage.getItem('github_session_id');
}

export function setSessionId(sessionId: string): void {
    localStorage.setItem('github_session_id', sessionId);
}

export function clearSessionId(): void {
    localStorage.removeItem('github_session_id');
}

function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const sessionId = getSessionId();
    if (sessionId) {
        headers['Authorization'] = `Bearer ${sessionId}`;
    }
    return headers;
}

export async function checkSession(): Promise<SessionData> {
    try {
        const response = await fetch(`${WORKER_BASE_URL}/session`, {
            headers: getAuthHeaders(),
            credentials: 'include',
        });

        if (!response.ok) {
            return { authenticated: false };
        }

        const data = await response.json() as SessionData;
        return data;
    } catch (err) {
        console.error('[AuthClient] Error checking session:', err);
        return { authenticated: false };
    }
}

export function initiateLogin(): void {
    window.location.href = `${WORKER_BASE_URL}/login`;
}

export async function logout(): Promise<void> {
    const sessionId = getSessionId();

    try {
        await fetch(`${WORKER_BASE_URL}/logout`, {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'include',
        });
    } catch (err) {
        console.error('[AuthClient] Error logging out:', err);
    }

    clearSessionId();
    localStorage.removeItem('github_selected_gist');
}