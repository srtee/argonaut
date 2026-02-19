# External API Reference

> Documentation for all external service integrations used by Argonaut.

---

## Overview

Argonaut integrates with several external services to provide paper metadata (BibTeX, abstracts), and GitHub for OAuth and Gist storage.

| Service | Primary Use | Authentication | Rate Limits | Data Returned |
|---------|-------------|----------------|-------------|---------------|
| **DOI.org** | Fetch BibTeX | None | Unknown | BibTeX string |
| **Semantic Scholar** | Fetch abstract | None | 5 req/sec (free) | Abstract text |
| **Crossref** | Fetch abstract/pages | None | Unknown | Abstract text, page numbers |
| **GitHub** (via Worker) | OAuth, Gist CRUD | Bearer token | GitHub limits | User info, gist data |
| **CloudFlare Worker** | GitHub proxy | Bearer token | Unknown | Proxies GitHub API |

---

## DOI.org API

### Endpoint

```
https://doi.org/{doi}
```

### Description

Returns BibTeX citation data for a given DOI.

### Usage

```javascript
async function fetchBibTeX(doi) {
    const response = await fetch(`https://doi.org/${encodeURIComponent(doi)}`, {
        headers: {
            'Accept': 'application/x-bibtex'
        }
    });
    return await response.text();
}
```

### Request

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `doi` | string | Yes | Digital Object Identifier (e.g., `10.1234/example.12345`) |

### Response

**Success (200):** BibTeX string

```bibtex
@article{smith2024example,
    title = {Example Paper Title},
    author = {Smith, John and Doe, Jane},
    journal = {Journal of Examples},
    volume = {42},
    number = {1},
    pages = {123--145},
    year = {2024},
    doi = {10.1234/example.12345}
}
```

**Error (404):** DOI not found

**Error (other):** Failed to fetch BibTeX

### Error Handling

In `lib/papers.js`:

```javascript
try {
    const response = await fetch(...);
    if (!response.ok) {
        throw new Error(`Failed to fetch BibTeX: ${response.status}`);
    }
    return await response.text();
} catch (err) {
    console.error('Error fetching BibTeX:', err);
    return null;  // Indicates failure
}
```

### Rate Limiting

No official rate limit documented. Argonaut adds 1 second delay between consecutive requests.

---

## Semantic Scholar API

### Endpoint

```
https://api.semanticscholar.org/graph/v1/paper/DOI:{doi}?fields=abstract
```

### Description

Fetches abstract text for a given DOI using Semantic Scholar's free API.

### Usage

```javascript
async function fetchAbstractFromSemanticScholar(doi) {
    const response = await fetch(
        `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=abstract`,
        {
            headers: {
                'Accept': 'application/json'
            }
        }
    );
    const data = await response.json();
    return data.abstract || null;
}
```

### Request

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `doi` | string | Yes | Digital Object Identifier |
| `fields` | string | Yes | Set to `abstract` to retrieve only abstract |

### Response

**Success (200):** JSON object

```json
{
    "abstract": "This is the paper abstract text...",
    "paperId": "some-id"
}
```

**No abstract:** Returns JSON without `abstract` field

**Error (404):** Paper not found

### Rate Limiting

- **Free tier:** 5 requests per second
- **No authentication required**

Argonaut does not implement rate limiting for this endpoint (fallback-only usage).

### Error Handling

Returns `null` on any error:

```javascript
try {
    const response = await fetch(...);
    if (!response.ok) return null;
    const data = await response.json();
    return data.abstract || null;
} catch (err) {
    console.error('Error fetching abstract:', err);
    return null;
}
```

---

## Crossref API

### Endpoints

```
Works metadata: https://api.crossref.org/works/{doi}
```

### Description

Fetches bibliographic metadata including abstracts and page numbers from Crossref.

### Usage (Abstract)

```javascript
async function fetchAbstractFromCrossref(doi) {
    const response = await fetch(
        `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
        {
            headers: {
                'Accept': 'application/json'
            }
        }
    );
    const data = await response.json();
    return data.message?.abstract || null;
}
```

### Usage (Pages)

```javascript
async function fetchPagesFromCrossref(doi) {
    const response = await fetch(
        `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
        {
            headers: {
                'Accept': 'application/json'
            }
        }
    );
    const data = await response.json();
    if (data.message) {
        return data.message.page || data.message['article-number'] || null;
    }
    return null;
}
```

### Response (Works Metadata)

**Success (200):** JSON object

```json
{
    "message": {
        "DOI": "10.1234/example.12345",
        "title": ["Example Paper Title"],
        "author": [{"given": "John", "family": "Smith"}],
        "page": "123-145",
        "article-number": "123",
        "abstract": "This is the paper abstract...",
        "volume": "42",
        "issue": "1",
        "published": {"date-parts": [[2024, 1, 1]]}
    }
}
```

**Error (404):** DOI not found

### Rate Limiting

No official rate limit documented. Used as fallback for abstract, primary source for page numbers.

### Error Handling

Returns `null` on any error.

---

## GitHub API (via CloudFlare Worker)

Argonaut uses a CloudFlare Worker (`WORKER_BASE_URL`) as a proxy for GitHub OAuth and API calls. This avoids exposing the GitHub client secret.

### Base URL

```
https://argonaut-github-proxy.shernren.workers.dev
```

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/login` | GET | Initiate OAuth flow (redirects to GitHub) |
| `/logout` | POST | Terminate session |
| `/session` | GET | Check authentication status |
| `/api/github/gists` | GET | List user's gists |
| `/api/github/gists` | POST | Create new gist |
| `/api/github/gists/{gistId}` | GET | Get specific gist |
| `/api/github/gists/{gistId}` | PATCH | Update gist |

### Authentication

All API requests (except `/login`) include a Bearer token header:

```javascript
const sessionId = getSessionId();  // From localStorage
const headers = {
    'Authorization': `Bearer ${sessionId}`,
    'Content-Type': 'application/json'  // For POST/PATCH
};
```

### Session Check

**Endpoint:** `GET /session`

**Response:**

```json
{
    "authenticated": true,
    "user": {
        "login": "username",
        "avatar_url": "https://github.com/user.png"
    }
}
```

```json
{
    "authenticated": false
}
```

### List Gists

**Endpoint:** `GET /api/github/gists`

**Response:**

```json
[
    {
        "id": "abc123",
        "description": "My Papers",
        "files": {
            "papers.json": {
                "filename": "papers.json"
            }
        }
    }
]
```

### Get Gist

**Endpoint:** `GET /api/github/gists/{gistId}`

**Response:**

```json
{
    "id": "abc123",
    "description": "My Papers",
    "files": {
        "papers.json": {
            "filename": "papers.json",
            "content": "{\"PaperKey1\": {...}}"
        }
    }
}
```

### Create Gist

**Endpoint:** `POST /api/github/gists`

**Body:**

```json
{
    "description": "Argonaut Papers",
    "public": false,
    "files": {
        "papers.json": {
            "content": "{\"PaperKey1\": {...}}"
        }
    }
}
```

**Response:** Created gist object (same as Get Gist response)

### Update Gist

**Endpoint:** `PATCH /api/github/gists/{gistId}`

**Body:** Same as Create Gist

**Response:** Updated gist object

### Error Handling

All GitHub API endpoints return JSON with an `error` field:

```json
{
    "error": "Gist not found"
}
```

```javascript
try {
    const res = await fetch(...);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch');
    }
    return await res.json();
} catch (err) {
    throw new Error(error.error || 'Failed to fetch gists');
}
```

### Rate Limiting

- Inherited from GitHub API limits (typically 5,000 requests/hour for authenticated users)
- The CloudFlare Worker does not add additional rate limiting

---

## API Call Sequences

### Adding a Paper by DOI

```
1. fetchBibTeX(doi)
   └─► GET https://doi.org/{doi}
       └─► Returns BibTeX string

2. fetchAbstract(doi)
   ├─► GET https://api.semanticscholar.org/graph/v1/paper/DOI:{doi}?fields=abstract
   │   └─► If success: Returns abstract
   │
   └─► GET https://api.crossref.org/works/{doi}
       └─► Returns abstract (fallback)
```

### Loading Papers and Exporting BibTeX

```
For each paper:
    1. fetchBibTeX(doi)
        └─► GET https://doi.org/{doi}
    2. fetchPagesFromCrossref(doi)
        └─► GET https://api.crossref.org/works/{doi}
    3. Rate limiting: Wait 1000ms
```

### GitHub Workflow

```
1. initiateLogin()
    └─► GET {WORKER_BASE_URL}/login
        └─► Redirects to GitHub OAuth

2. OAuth callback returns with session_id parameter

3. loadGitHubAuth()
    └─► GET {WORKER_BASE_URL}/session
        └─► Returns authentication status and user info

4. listGists()
    └─► GET {WORKER_BASE_URL}/api/github/gists
        └─► Returns list of gists

5. saveToGistCollection()
    ├─► If new: POST {WORKER_BASE_URL}/api/github/gists
    └─► If existing: PATCH {WORKER_BASE_URL}/api/github/gists/{id}
```

---

## Error States and Handling

| Error Type | Cause | User-facing Message | Recovery |
|------------|-------|---------------------|----------|
| Invalid DOI | `extractDOI()` returns null | "Could not extract a valid DOI..." | User re-enters DOI |
| BibTeX fetch failed | DOI.org returns error | "Failed to fetch BibTeX for this DOI" | User tries different DOI |
| Paper already exists | Key collision | "Paper already exists..." | User provides custom key |
| No abstract found | Both APIs return null | Abstract shows "No abstract available" | No action needed |
| Gist not found | Invalid gist ID | "Selected gist does not contain papers.json" | User selects different gist |
| Not connected to GitHub | No session ID | "Not connected to GitHub" | User clicks Connect |
| Rate limit exceeded | API rate limit | May show error or slow down | Wait and retry |

---

## Configuration

### Constants

| Constant | Value | Location |
|----------|-------|----------|
| `WORKER_BASE_URL` | `https://argonaut-github-proxy.shernren.workers.dev` | `lib/state.js` |

### LocalStorage Keys

| Key | Value | Purpose |
|-----|-------|---------|
| `github_session_id` | Session token string | GitHub authentication |
| `argonautPapers` | JSON string | Cached papers data |

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| **Client secrets** | GitHub client secret stored on CloudFlare Worker, never exposed to client |
| **Token exposure** | Session tokens stored in localStorage (no sensitive data) |
| **HTTPS only** | All external APIs use HTTPS |
| **Input sanitization** | `escapeHtml()` used on all user-generated content before rendering |
| **XSS prevention** | No use of `innerHTML` with untrusted input (except for paper data) |