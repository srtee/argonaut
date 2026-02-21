# Storage Analysis & Plan

## Current Data Structure

Each paper entry contains:
- **Key** (paper name): ~20-50 bytes
- **_doi**: ~30-50 bytes
- **_comments**: ~50-200 bytes
- **_tags**: ~10-50 bytes (array)
- **_alsoread**: ~10-30 bytes (array)

**Estimated metadata size per paper: ~150-350 bytes** (average ~200 bytes)

## Storage Threshold Estimates

| Scale | Papers | Storage (metadata only) | Concern |
|-------|--------|------------------------|---------|
| Current | 3 | ~600 bytes | N/A |
| 1,000 | 1K | ~200 KB | Fine |
| 10,000 | 10K | ~2 MB | JSON parsing still okay |
| 50,000 | 50K | ~10 MB | Performance degradation starts |
| 100,000 | 100K | ~20 MB | **Recommend database/search index** |

## Recommendations

For **metadata only** (current JSON approach):
- **~10,000 papers** is the practical limit before you'd want to add search indexing
- **~50,000 papers** is when you'd definitely need a database or external search (like Lunr.js, Fuse.js, or SQLite)

For **PDF/data storage** per paper:
- Assume **1-10 MB per paper** (PDF + supplements)
- At 10,000 papers: **10-100 GB** — would need file system organization, not JSON file storage
- At 100,000 papers: **1 TB+** — cloud storage or dedicated file handling required

## Bottom Line

**Implement new storage strategies around 10,000-50,000 papers** depending on whether you're only storing metadata or also handling PDFs. The current JSON file approach works fine for the current scale of 3 papers.

---

# Cloud Storage Integration (Bring Your Own Storage)

## Target Providers

### Tier 1: High Priority (Easiest to Implement)

| Provider | API Complexity | Notes |
|----------|---------------|-------|
| **Local File System** | None | User selects folder via `<input type="file" webkitdirectory>` |
| **Google Drive** | Medium | Google Drive API v3, OAuth2 |
| **Dropbox** | Low-Medium | Dropbox API v2, OAuth2, good SDK |
| **OneDrive** | Medium | Microsoft Graph API, OAuth2 |

### Tier 2: Medium Effort

| Provider | API Complexity | Notes |
|----------|---------------|-------|
| **iCloud** | Medium-High | CloudKit, requires Apple Developer account |
| **Box** | Medium | Box API v2.0, OAuth2 |
| **Nextcloud** | Low-Medium | WebDAV interface (simple HTTP) |

### Tier 3: Lower Priority

| Provider | API Complexity | Notes |
|----------|---------------|-------|
| **AWS S3** | Medium | S3 API, requires IAM credentials |
| **Azure Blob** | Medium | Azure Storage SDK |
| **pCloud** | Low | Simple REST API |
| **Sync.com** | Low | End-to-end encrypted |

---

## Implementation Effort Estimates

### 1. Local File System (Easiest)
```html
<input type="file" webkitdirectory multiple />
```
- **Effort**: 1-2 days
- **Storage**: Links stored as `file:///path/to/paper.pdf` in paper entry
- **Limitation**: Only works on same machine

### 2. Dropbox (Recommended First Target)
- **Effort**: 3-5 days
- **Dependencies**: `dropbox` npm package (~50KB)
- **Flow**:
  1. OAuth2 authentication
  2. User selects folder in their Dropbox
  3. Store path relative to Dropbox root (e.g., `/Research/papers/2024/`)
  4. Use Dropbox API to fetch file blobs when needed

### 3. Google Drive
- **Effort**: 5-7 days
- **Dependencies**: `@googleapis/drive` (~200KB minified)
- **Considerations**:
  - Requires Google Cloud Console setup
  - More complex OAuth flow
  - Good for users with existing GSuite/Google Scholar workflows

### 4. OneDrive
- **Effort**: 5-7 days
- **Dependencies**: `@microsoft/microsoft-graph-client` (~100KB)
- **Considerations**: Good for academic institutions using Office 365

### 5. Nextcloud (Self-Hosted)
- **Effort**: 3-5 days
- **Dependencies**: None needed (standard WebDAV via `fetch`)
- **Flow**:
  1. User enters their Nextcloud URL + credentials (or OAuth)
  2. Browse via WebDAV
  3. Store paths as `/remote.php/dav/files/user/papers/`

---

## Data Model Changes

To support "bring your own storage," the paper entry schema needs a new field:

```json
{
  "TeeBernhardt2022": {
    "_doi": "10.1063/5.0086986",
    "_comments": "...",
    "_tags": [...],
    "_alsoread": [],
    "_pdfPath": "dropbox:///Research/papers/TeeBernhardt2022.pdf"
  }
}
```

**Path format proposals:**
- `file:///local/path/to/paper.pdf`
- `dropbox:///folder/paper.pdf`
- `gdrive:///file-id` (Google Drive file ID)
- `onedrive:///path/to/paper.pdf`
- `nextcloud:///remote.php/dav/...`

---

## Recommended Implementation Order

1. **Local file system** (1-2 days) — simplest path for immediate utility
2. **Dropbox** (3-5 days) — easiest cloud API, popular among academics
3. **Google Drive** (5-7 days) — widely used in academia
4. **Nextcloud** (3-5 days) — for self-hosted/institutional users

**Total effort to get 3 providers**: ~10-15 days

---

# Bring Your Own Storage (BYOS) - Cloud Integration

## Target Cloud Service Providers

### Tier 1: High Priority (Easiest to Implement)

| Provider | API Complexity | Notes |
|----------|---------------|-------|
| **Local File System** | None | User selects folder via `<input type="file" webkitdirectory>` |
| **Google Drive** | Medium | Google Drive API v3, OAuth2 |
| **Dropbox** | Low-Medium | Dropbox API v2, OAuth2, good SDK |
| **OneDrive** | Medium | Microsoft Graph API, OAuth2 |

### Tier 2: Medium Effort

| Provider | API Complexity | Notes |
|----------|---------------|-------|
| **iCloud** | Medium-High | CloudKit, requires Apple Developer account |
| **Box** | Medium | Box API v2.0, OAuth2 |
| **Nextcloud** | Low-Medium | WebDAV interface (simple HTTP) |

### Tier 3: Lower Priority

| Provider | API Complexity | Notes |
|----------|---------------|-------|
| **AWS S3** | Medium | S3 API, requires IAM credentials |
| **Azure Blob** | Medium | Azure Storage SDK |
| **pCloud** | Low | Simple REST API |
| **Sync.com** | Low | End-to-end encrypted |

---

## Implementation Effort Estimates

### 1. Local File System (Easiest)
```html
<input type="file" webkitdirectory multiple />
```
- **Effort**: 1-2 days
- **Storage**: Links stored as `file:///path/to/paper.pdf` in paper entry
- **Limitation**: Only works on same machine

### 2. Dropbox (Recommended First Target)
- **Effort**: 3-5 days
- **Dependencies**: `dropbox` npm package (~50KB)
- **Flow**:
  1. OAuth2 authentication
  2. User selects folder in their Dropbox
  3. Store path relative to Dropbox root (e.g., `/Research/papers/2024/`)
  4. Use Dropbox API to fetch file blobs when needed

### 3. Google Drive
- **Effort**: 5-7 days
- **Dependencies**: `@googleapis/drive` (~200KB minified)
- **Considerations**:
  - Requires Google Cloud Console setup
  - More complex OAuth flow
  - Good for users with existing GSuite/Google Scholar workflows

### 4. OneDrive
- **Effort**: 5-7 days
- **Dependencies**: `@microsoft/microsoft-graph-client` (~100KB)
- **Considerations**: Good for academic institutions using Office 365

### 5. Nextcloud (Self-Hosted)
- **Effort**: 3-5 days
- **Dependencies**: None needed (standard WebDAV via `fetch`)
- **Flow**:
  1. User enters their Nextcloud URL + credentials (or OAuth)
  2. Browse via WebDAV
  3. Store paths as `/remote.php/dav/files/user/papers/`

---

## Data Model Changes

To support "bring your own storage," the paper entry schema would need a new field:

```json
{
  "TeeBernhardt2022": {
    "_doi": "10.1063/5.0086986",
    "_comments": "...",
    "_tags": [...],
    "_alsoread": [],
    "_pdfPath": "dropbox:///Research/papers/TeeBernhardt2022.pdf"
  }
}
```

**Path format proposals:**
- `file:///local/path/to/paper.pdf`
- `dropbox:///folder/paper.pdf`
- `gdrive:///file-id` (Google Drive file ID)
- `onedrive:///path/to/paper.pdf`
- `nextcloud:///remote.php/dav/...`

---

## Recommended Implementation Order

1. **Local file system** (1-2 days) — simplest path for immediate utility
2. **Dropbox** (3-5 days) — easiest cloud API, popular among academics
3. **Google Drive** (5-7 days) — widely used in academia
4. **Nextcloud** (3-5 days) — for self-hosted/institutional users

**Total effort to get 3 providers**: ~10-15 days
