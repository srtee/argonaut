/**
 * CloudFlare Worker for GitHub OAuth2 with PKCE
 * Securely proxies requests between Argonaut and GitHub API
 *
 * Architecture:
 * - Browser → Worker → GitHub API
 * - Session-based auth with HTTP-only cookies
 * - Access tokens stored in KV (never exposed to browser)
 * - PKCE flow with client secret for enhanced security
 */

// KV namespace and secrets are accessed via env parameter in the fetch handler

// Scopes needed for Gist operations
const SCOPES = ['gist'];

/**
 * Helper: Generate cryptographically random string
 */
function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
        result += chars[randomValues[i] % chars.length];
    }
    return result;
}

/**
 * Helper: Generate session ID
 */
function generateSessionId() {
    return generateRandomString(32);
}

/**
 * Helper: SHA-256 hash for PKCE code challenge
 */
async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Helper: Validate GitHub webhook signature (future use)
 */
async function verifyGitHubSignature(payload, signature, secret) {
    if (!signature) return false;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = `sha256=${btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))}`;
    return signature === expectedSignature;
}

// Allowed origin for CORS (matches the Argonaut app)
const ALLOWED_ORIGIN = 'https://srtee.github.io';

// App URL for redirecting after OAuth callback
const APP_URL = 'https://srtee.github.io/argonaut';

/**
 * Handle CORS preflight requests
 */
function handleCORS(request) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
    };
    return new Response(null, { headers: corsHeaders });
}

/**
 * Get CORS headers
 */
function getCorsHeaders() {
    return {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

/**
 * JSON response helper
 */
function jsonResponse(data, status = 200, additionalHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...getCorsHeaders(),
            'Content-Type': 'application/json',
            ...additionalHeaders,
        },
    });
}

/**
 * Error response helper
 */
function errorResponse(message, status = 400) {
    return jsonResponse({ error: message }, status);
}

/**
 * Get session from Authorization header
 */
function getSessionId(request) {
    const authHeader = request.headers.get('Authorization');
    console.log('[Worker] Auth header:', authHeader ? authHeader.substring(0, 20) + '...' : 'null');
    if (!authHeader) return null;
    if (!authHeader.startsWith('Bearer ')) return null;
    return authHeader.substring(7);
}

/**
 * Initialize OAuth flow - redirect to GitHub
 */
async function handleLogin(env) {
    console.log('[Worker] Initiating OAuth login flow');
    // Generate state for CSRF protection
    const state = generateRandomString(32);

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateRandomString(128);
    const codeChallenge = await sha256(codeVerifier);

    // Store state and code verifier temporarily in KV (with 10 min TTL)
    const stateKey = `oauth_state:${state}`;
    await env.SESSIONS.put(stateKey, JSON.stringify({ codeVerifier }), { expirationTtl: 600 });

    // Construct GitHub OAuth URL
    const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        redirect_uri: env.REDIRECT_URI,
        scope: SCOPES.join(' '),
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });

    const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    console.log('[Worker] Redirecting to GitHub OAuth');

    // Redirect to GitHub
    return Response.redirect(githubAuthUrl, 302);
}

/**
 * Handle OAuth callback from GitHub
 */
async function handleCallback(request, env) {
    console.log('[Worker] Handling OAuth callback');
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
        console.error('[Worker] Missing code or state parameter in callback');
        return errorResponse('Missing code or state parameter', 400);
    }

    // Verify state and retrieve code verifier
    const stateKey = `oauth_state:${state}`;
    const stateData = await env.SESSIONS.get(stateKey);

    if (!stateData) {
        console.error('[Worker] Invalid or expired state:', state);
        return errorResponse('Invalid or expired state', 400);
    }

    await env.SESSIONS.delete(stateKey);

    let { codeVerifier } = JSON.parse(stateData);

    // Exchange code for access token (using PKCE + client secret for enhanced security)
    console.log('[Worker] Exchanging code for access token');
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code: code,
            code_verifier: codeVerifier,
            redirect_uri: env.REDIRECT_URI,
        }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
        console.error('[Worker] Token exchange failed:', tokenData);
        return errorResponse('Failed to exchange code for token', 400);
    }

    console.log('[Worker] Token exchange successful');
    const { access_token, scope } = tokenData;

    // Fetch user info from GitHub
    console.log('[Worker] Fetching user info from GitHub');
    const userResponse = await fetch('https://api.github.com/user', {
        headers: {
            'Authorization': `Bearer ${access_token}`,
            'User-Agent': 'Argonaut-Bibliography-Manager',
        },
    });

    if (!userResponse.ok) {
        console.error('[Worker] Failed to fetch user info:', userResponse.status);
        return errorResponse('Failed to fetch user info', 400);
    }

    const user = await userResponse.json();
    console.log('[Worker] User info fetched:', user.login);

    // Create new session
    const sessionId = generateSessionId();
    const sessionData = {
        accessToken: access_token,
        user: {
            login: user.login,
            avatar_url: user.avatar_url,
            id: user.id,
        },
        scopes: scope || SCOPES.join(','),
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour (token expiry)
    };

    // Store session in KV (30 days expiry)
    const sessionKey = `session:${sessionId}`;
    await env.SESSIONS.put(sessionKey, JSON.stringify(sessionData), { expirationTtl: 60 * 60 * 24 * 30 });
    console.log('[Worker] Created session:', sessionId);

    // Redirect back to app with sessionId in URL
    const redirectUrl = new URL(APP_URL);
    redirectUrl.searchParams.set('session_id', sessionId);
    redirectUrl.searchParams.set('auth', 'success');
    console.log('[Worker] Redirecting to app with sessionId');
    return Response.redirect(redirectUrl.toString(), 302);
}

/**
 * Check session status
 */
async function handleSession(request, env) {
    console.log('[Worker] Checking session status');
    const sessionId = getSessionId(request);
    if (!sessionId) {
        console.log('[Worker] No session ID found');
        return jsonResponse({ authenticated: false });
    }

    const sessionKey = `session:${sessionId}`;
    const sessionData = await env.SESSIONS.get(sessionKey);

    if (!sessionData) {
        console.log('[Worker] Session not found:', sessionId);
        return jsonResponse({ authenticated: false });
    }

    const session = JSON.parse(sessionData);

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
        console.log('[Worker] Session expired:', sessionId);
        await env.SESSIONS.delete(sessionKey);
        return jsonResponse({ authenticated: false });
    }

    console.log('[Worker] Session valid for user:', session.user.login);
    return jsonResponse({
        authenticated: true,
        user: session.user,
    });
}

/**
 * Handle logout
 */
async function handleLogout(request, env) {
    console.log('[Worker] Handling logout');
    const sessionId = getSessionId(request);
    if (sessionId) {
        const sessionKey = `session:${sessionId}`;
        await env.SESSIONS.delete(sessionKey);
        console.log('[Worker] Deleted session:', sessionId);
    } else {
        console.log('[Worker] No session ID to delete');
    }

    return jsonResponse({ success: true });
}

/**
 * Proxy request to GitHub API
 */
async function proxyToGitHub(request, path, method = 'GET', body = null, env) {
    console.log('[Worker] Proxying to GitHub API:', method, path);
    const sessionId = getSessionId(request);
    if (!sessionId) {
        console.log('[Worker] No session ID in proxy request');
        return errorResponse('Not authenticated', 401);
    }

    const sessionKey = `session:${sessionId}`;
    const sessionData = await env.SESSIONS.get(sessionKey);

    if (!sessionData) {
        console.log('[Worker] Invalid session in proxy request:', sessionId);
        return errorResponse('Invalid session', 401);
    }

    const session = JSON.parse(sessionData);

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
        console.log('[Worker] Session expired in proxy request:', sessionId);
        await env.SESSIONS.delete(sessionKey);
        return errorResponse('Session expired', 401);
    }

    const githubUrl = `https://api.github.com${path}`;
    const headers = {
        'Authorization': `Bearer ${session.accessToken}`,
        'User-Agent': 'Argonaut-Bibliography-Manager',
        'Accept': 'application/vnd.github.v3+json',
    };

    if (body) {
        headers['Content-Type'] = 'application/json';
    }

    const fetchOptions = {
        method,
        headers,
    };

    if (body) {
        fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(githubUrl, fetchOptions);
    const responseText = await response.text();
    console.log('[Worker] GitHub API response status:', response.status);

    try {
        const responseData = JSON.parse(responseText);
        return jsonResponse(responseData, response.status);
    } catch (e) {
        return new Response(responseText, { status: response.status });
    }
}

/**
 * Handle API routes
 */
async function handleApiRequest(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // Match /api/github/gists routes
    const gistMatch = path.match(/^\/api\/github\/gists(\/(.+))?$/);

    if (!gistMatch) {
        return errorResponse('Not found', 404);
    }

    const gistId = gistMatch[2];

    switch (method) {
        case 'GET':
            if (gistId) {
                // Get specific gist
                return proxyToGitHub(request, `/gists/${gistId}`, 'GET', null, env);
            } else {
                // List user's gists
                return proxyToGitHub(request, '/gists?per_page=100', 'GET', null, env);
            }

        case 'POST':
            if (!gistId) {
                // Create new gist
                const body = await request.json();
                return proxyToGitHub(request, '/gists', 'POST', body, env);
            }
            return errorResponse('Method not allowed', 405);

        case 'PATCH':
            if (gistId) {
                // Update existing gist
                const body = await request.json();
                return proxyToGitHub(request, `/gists/${gistId}`, 'PATCH', body, env);
            }
            return errorResponse('Method not allowed', 405);

        default:
            return errorResponse('Method not allowed', 405);
    }
}

/**
 * Main request handler
 */
export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return handleCORS(request);
        }

        // Route handling
        const path = url.pathname;

        try {
            switch (path) {
                case '/login':
                    if (request.method !== 'GET') {
                        return errorResponse('Method not allowed', 405);
                    }
                    return handleLogin(env);

                case '/callback':
                    if (request.method !== 'GET') {
                        return errorResponse('Method not allowed', 405);
                    }
                    return handleCallback(request, env);

                case '/session':
                    if (request.method !== 'GET') {
                        return errorResponse('Method not allowed', 405);
                    }
                    return handleSession(request, env);

                case '/logout':
                    if (request.method !== 'POST') {
                        return errorResponse('Method not allowed', 405);
                    }
                    return handleLogout(request, env);

                default:
                    // Handle API routes
                    if (path.startsWith('/api/')) {
                        return handleApiRequest(request, env);
                    }

                    // Default response
                    return new Response('Argonaut OAuth2 Proxy Worker', {
                        status: 200,
                        headers: { 'Content-Type': 'text/plain' },
                    });
            }
        } catch (error) {
            console.error('Worker error:', error);
            return errorResponse('Internal server error', 500);
        }
    },
};