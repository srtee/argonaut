# JavaScript Module Documentation

> This document describes the modular architecture of Argonaut's JavaScript codebase.

---

## Table of Contents

- [Module Overview](#module-overview)
- [Module: lib/state.js](#module-libstatejs)
- [Module: lib/auth.js](#module-libauthjs)
- [Module: lib/github.js](#module-libgithubjs)
- [Module: lib/papers.js](#module-libpapersjs)
- [Module: lib/ui.js](#module-libuijs)
- [Module: lib/main.js](#module-libmainjs)

---

## Module Overview

| Module | Purpose | Exports |
|--------|---------|---------|
| `lib/state.js` | Global state management with immutability and auto-persistence | `state`, `store`, `WORKER_BASE_URL` |
| `lib/auth.js` | GitHub OAuth session management | `getSessionId`, `setSessionId`, `clearSessionId`, `checkSession`, `initiateLogin`, `logout`, `updateGitHubUI`, `loadGitHubAuth`, `updateSaveGistVisibility`, `updateGistVisibility`, `initGitHubAuth`, `restorePapersState` |
| `lib/github.js` | GitHub Gist CRUD operations | `listGists`, `getGist`, `createGist`, `updateGist`, `loadGistOptionsForLoadSelector`, `loadGistOptionsForSaveSelector`, `loadFromGistCollection`, `saveToGistCollection` |
| `lib/papers.js` | DOI, BibTeX, processing, rendering | `extractDOI`, `fetchBibTeX`, `fetchAbstractFromSemanticScholar`, `fetchAbstractFromCrossref`, `fetchAbstract`, `fetchPagesFromCrossref`, `addPagesToBibTeX`, `parseBibTeX`, `formatAuthors`, `generateDefaultKey`, `addPaperByDoi`, `createPaperCard`, `processPapers`, `displayPapers`, `renderPapers`, `applyTagFilter`, `hasSelectedTag`, `updateTagVisuals` |
| `lib/ui.js` | UI concerns (theme, onboarding, storage, export) | `updateThemeIcons`, `getSystemPreference`, `getStoredTheme`, `setTheme`, `initTheme`, `toggleTag`, `updateExportButtonStates`, `escapeHtml`, `showError`, `showStatus`, `hideStatus`, `hideError`, `saveFileWithPicker`, `getMimeTypeDescription`, `getMimeTypeExtensions`, `clearCurrentData`, `saveToStorage`, `loadFromStorage`, `exportJSON`, `exportJSONLight`, `exportBibTeX`, `exportBibTeXTagged`, `loadFromFile`, `loadFromUrl`, `loadDefault`, `loadPapers`, `updateInputOptionUI`, `initInputOptions`, `updateSaveOptionUI`, `initSaveOptions`, `openTagDialog`, `closeTagDialog`, `saveComment`, `setCookie`, `getCookie`, `hasCompletedOnboarding`, `markOnboardingComplete`, `showOnboarding`, `hideOnboarding`, `updateOnboardingUI`, `nextStep`, `prevStep`, `goToStep`, `completeOnboarding`, `initOnboarding` |
| `lib/main.js` | Application entry point | (initializes all modules) |

---

## Module: lib/state.js

**Purpose**: Immutable state store with auto-persistence to sessionStorage.

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `store` | Object | Store API for immutable state mutations |
| `state` | Proxy | Read-only proxy for backward compatibility (warns on writes) |
| `WORKER_BASE_URL` | String | CloudFlare Worker base URL for GitHub OAuth proxy |

### Store API

| Method | Description | Auto-persist? |
|--------|-------------|---------------|
| `store.get()` | Get immutable copy of current state | No |
| `store.set(updates)` | Update state with partial updates (immutable) | Yes |
| `store.setSelectedTags(tags)` | Set selected tags (handles Set conversion) | Yes |
| `store.subscribe(fn)` | Subscribe to state changes, returns unsubscribe | No |

### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `state.papersData` | Object | Main data store for all papers |
| `state.selectedTags` | Set | Set of currently selected tags for filtering |
| `state.processedPapersData` | Array | Store processed papers with BibTeX/abstracts for filtering |
| `state.currentEditingKey` | String/null | Key of paper currently being edited |
| `state.tentativeTags` | Array | Tags being added/edited (not yet saved) |
| `state.tentativeTagsRemoved` | Array | Tags tentatively marked for removal |

### Usage

```javascript
import { store, state } from './state.js';

// Read state (works for both)
console.log(state.papersData); // Backward compatible
console.log(store.get().papersData); // New API

// Update state (use store API)
store.set({ papersData: newData });
store.setSelectedTags(['tag1', 'tag2']);

// Subscribe to changes
const unsubscribe = store.subscribe((newState) => {
    console.log('State changed:', newState);
});
unsubscribe(); // Stop listening
```

### Persistence

State is automatically persisted to `sessionStorage` on every mutation. On page load, state is restored from storage. The `selectedTags` Set is converted to/from Array for JSON serialization.

---

## Module: lib/auth.js

**Purpose**: GitHub OAuth session management and UI state.

### Imports

- `./state.js`: `state`, `WORKER_BASE_URL`
- `./github.js`: `loadGistOptionsForLoadSelector` (dynamic)
- `./ui.js`: `showStatus`, `hideStatus` (dynamic)

### Exports

| Function | Description | Dependencies |
|----------|-------------|--------------|
| `getSessionId()` | Get stored GitHub session ID | `localStorage` |
| `setSessionId(sessionId)` | Store GitHub session ID | `localStorage` |
| `clearSessionId()` | Remove GitHub session ID | `localStorage` |
| `checkSession()` | Validate GitHub auth status | `getSessionId()`, `WORKER_BASE_URL` |
| `initiateLogin()` | Start GitHub OAuth flow, save state | `WORKER_BASE_URL`, `sessionStorage`, `state.papersData` |
| `logout()` | Terminate GitHub session | `getSessionId()`, `WORKER_BASE_URL`, `clearSessionId()`, `updateGistVisibility()`, `updateSaveGistVisibility()` |
| `updateGitHubUI(user)` | Update UI based on GitHub user data | DOM elements |
| `loadGitHubAuth()` | Initialize GitHub auth on page load | `checkSession()`, `updateGitHubUI()`, `loadGistOptionsForLoadSelector()` |
| `updateSaveGistVisibility()` | Toggle gist save UI based on auth | `getSessionId()`, DOM elements |
| `updateGistVisibility()` | Toggle gist load UI based on auth | `getSessionId()`, DOM elements |
| `initGitHubAuth()` | Handle OAuth callback and load auth | `checkSession()`, `setSessionId()`, `loadGitHubAuth()`, `restorePapersState()` |
| `restorePapersState()` | Restore papers state after OAuth redirect | `sessionStorage`, DOM elements |

---

## Module: lib/github.js

**Purpose**: GitHub Gist CRUD operations and integration.

### Imports

- `./auth.js`: `getSessionId`
- `./state.js`: `WORKER_BASE_URL`
- `./ui.js`: `showStatus`, `hideStatus`, `showError`, `clearCurrentData` (dynamic)
- `./papers.js`: `processPapers`, `renderPapers` (dynamic)
- `./state.js`: `state` (dynamic)

### Exports

| Function | Description | Dependencies |
|----------|-------------|--------------|
| `listGists()` | Fetch user's GitHub gists | `getSessionId()`, `WORKER_BASE_URL` |
| `getGist(gistId)` | Fetch specific GitHub gist | `getSessionId()`, `WORKER_BASE_URL` |
| `createGist(files, description)` | Create new GitHub gist | `getSessionId()`, `WORKER_BASE_URL` |
| `updateGist(gistId, files, description)` | Update existing GitHub gist | `getSessionId()`, `WORKER_BASE_URL` |
| `loadGistOptionsForLoadSelector()` | Populate gist dropdown for loading | `listGists()`, DOM elements |
| `loadGistOptionsForSaveSelector()` | Populate gist dropdown for saving | `listGists()`, DOM elements |
| `loadFromGistCollection()` | Load papers from selected gist | `getGist()`, `clearCurrentData()`, `processPapers()`, `renderPapers()` |
| `saveToGistCollection()` | Save papers to selected/new gist | `state.papersData`, `createGist()`, `updateGist()`, `loadGistOptionsForSaveSelector()` |

---

## Module: lib/papers.js

**Purpose**: DOI fetching, BibTeX processing, and paper rendering.

### Imports

- `./state.js`: `state`
- `./ui.js`: `showError`, `showStatus`, `hideStatus`, `updateExportButtonStates`, `toggleTag` (dynamic)
- `./papers.js`: `applyTagFilter` (internal)

### Exports

| Function | Description | Dependencies |
|----------|-------------|--------------|
| `extractDOI(input)` | Extract DOI from input string using regex | None |
| `fetchBibTeX(doi)` | Fetch BibTeX from doi.org API | `fetch`, `encodeURIComponent` |
| `fetchAbstractFromSemanticScholar(doi)` | Fetch abstract from Semantic Scholar API | `fetch` |
| `fetchAbstractFromCrossref(doi)` | Fetch abstract from Crossref API | `fetch` |
| `fetchAbstract(doi)` | Try Semantic Scholar, fallback to Crossref | `fetchAbstractFromSemanticScholar()`, `fetchAbstractFromCrossref()` |
| `fetchPagesFromCrossref(doi)` | Fetch page numbers from Crossref API | `fetch` |
| `addPagesToBibTeX(bibtex, pages)` | Add/update pages field in BibTeX string | Regex patterns |
| `parseBibTeX(bibtex)` | Extract bibliographic fields from BibTeX | Regex patterns |
| `formatAuthors(authorString)` | Convert "Last, First" to "First Last" | None |
| `generateDefaultKey(bibInfo)` | Generate unique citation key (author+year) | `state.papersData`, `parseBibTeX()` |
| `addPaperByDoi()` | Add paper via DOI to collection | `extractDOI()`, `fetchBibTeX()`, `parseBibTeX()`, `generateDefaultKey()`, `fetchAbstract()`, `applyTagFilter()` |
| `createPaperCard(key, paperData, bibInfo, abstract)` | Create DOM element for paper display | `escapeHtml()`, `formatAuthors()` |
| `processPapers(data)` | Batch process papers (fetch BibTeX/abstracts) | `state.papersData`, `fetchBibTeX()`, `parseBibTeX()`, `fetchPagesFromCrossref()`, `fetchAbstract()` |
| `displayPapers()` | Process and render all papers | `state.papersData`, `processPapers()`, `renderPapers()` |
| `renderPapers(processedPapers)` | Render processed papers to DOM | `state.processedPapersData`, `applyTagFilter()` |
| `applyTagFilter()` | Filter and reorder papers by tags | `state.processedPapersData`, `hasSelectedTag()`, `createPaperCard()`, `updateTagVisuals()` |
| `hasSelectedTag(paper)` | Check if paper has any selected tag | `state.selectedTags`, `paper._tags` |
| `updateTagVisuals()` | Update visual state (selected/deselected) of all tags | `state.selectedTags`, DOM elements |

---

## Module: lib/ui.js

**Purpose**: UI concerns including theme, onboarding, tag editing, storage, export, and file operations.

### Imports

- `./state.js`: `state`
- `./auth.js`: `getSessionId`, `updateGistVisibility`, `updateSaveGistVisibility` (dynamic)
- `./github.js`: `listGists`, `loadGistOptionsForLoadSelector`, `loadGistOptionsForSaveSelector` (dynamic)
- `./papers.js`: `applyTagFilter`, `fetchBibTeX`, `fetchPagesFromCrossref`, `addPagesToBibTeX`, `parseBibTeX` (dynamic)

### Theme Functions

| Function | Description | Dependencies |
|----------|-------------|--------------|
| `updateThemeIcons(isDark)` | Toggle sun/moon icon visibility | `sunIcon`, `moonIcon` |
| `getSystemPreference()` | Get OS dark mode preference | `window.matchMedia` |
| `getStoredTheme()` | Get saved theme from localStorage | `localStorage` |
| `setTheme(theme)` | Set dark/light theme, save to localStorage | `updateThemeIcons()` |
| `initTheme()` | Initialize theme on page load | `getStoredTheme()`, `getSystemPreference()`, `setTheme()` |

### Tag Functions

| Function | Description | Dependencies |
|----------|-------------|--------------|
| `toggleTag(tag)` | Add/remove tag from selection, apply filter | `applyTagFilter()`, `updateExportButtonStates()` |
| `updateExportButtonStates()` | Disable/enable export buttons based on tag selection | `state.selectedTags` |

### UI Utilities

| Function | Description | Dependencies |
|----------|-------------|--------------|
| `escapeHtml(text)` | Sanitize HTML to prevent XSS | None |
| `showError(message)` | Show error notification (5s timeout) | `error` DOM element |
| `showStatus(message)` | Show status notification | `status` DOM element |
| `hideStatus()` | Hide status notification | `status` DOM element |
| `hideError()` | Hide error notification | `error` DOM element |

### File Operations

| Function | Description | Dependencies |
|----------|-------------|--------------|
| `saveFileWithPicker(content, defaultFilename, mimeType)` | Save file with native picker or fallback | `window.showSaveFilePicker`, Blob, URL.createObjectURL |
| `getMimeTypeDescription(mimeType)` | Get human-readable MIME type description | None |
| `getMimeTypeExtensions(mimeType)` | Get file extensions for MIME type | None |

### Data Management

| Function | Description | Dependencies |
|----------|-------------|--------------|
| `clearCurrentData()` | Reset all paper data and UI | `state`, DOM elements |
| `saveToStorage()` | Save papers to browser localStorage | `state.papersData`, `localStorage` |
| `loadFromStorage()` | Load papers from browser localStorage | `localStorage`, `clearCurrentData()`, `displayPapers()` |

### Export Functions

| Function | Description | Dependencies |
|----------|-------------|--------------|
| `exportJSON()` | Export all papers as JSON file | `state.papersData`, `saveFileWithPicker()` |
| `exportJSONLight()` | Export papers as lightweight JSON | `state.papersData`, `saveFileWithPicker()` |
| `exportBibTeX()` | Export all papers as BibTeX file | `state.papersData`, `fetchBibTeX()`, `parseBibTeX()`, `fetchPagesFromCrossref()`, `addPagesToBibTeX()`, `saveFileWithPicker()` |
| `exportBibTeXTagged()` | Export only tagged papers as BibTeX | `state.papersData`, `state.selectedTags`, `fetchBibTeX()`, `parseBibTeX()`, `fetchPagesFromCrossref()`, `addPagesToBibTeX()`, `saveFileWithPicker()` |

### Load Functions

| Function | Description | Dependencies |
|----------|-------------|--------------|
| `loadFromFile(file)` | Parse JSON from uploaded file | `FileReader`, `JSON.parse` |
| `loadFromUrl(url)` | Fetch and parse JSON from URL | `fetch` |
| `loadDefault()` | Load default papers.json | `fetch` |
| `loadPapers(method)` | Main entry point for loading papers | `loadFromFile()`, `loadFromUrl()`, `loadDefault()`, `processPapers()`, `renderPapers()` |

### Input/Save Options

| Function | Description | Dependencies |
|----------|-------------|--------------|
| `initInputOptions()` | Initialize load input radio states | `updateInputOptionUI()`, `checkInputURLParameter()` |
| `updateInputOptionUI(selectedValue)` | Switch load UI based on selected method | DOM elements, `loadGistOptionsForLoadSelector()`, `updateGistVisibility()` |
| `initSaveOptions()` | Initialize save input radio states | `updateSaveOptionUI()` |
| `updateSaveOptionUI(selectedValue)` | Switch save UI based on selected method | DOM elements, `loadGistOptionsForSaveSelector()`, `updateSaveGistVisibility()` |

### Inline Tag Editing

| Function | Description | Dependencies |
|----------|-------------|--------------|
| `openTagDialog(key)` | Open inline tag editor for paper | `state`, `renderInlineTagEditor()` |
| `closeTagDialog({ restoreContent })` | Cancel or close tag editor | `state`, DOM elements |
| `saveTagChanges()` | Persist tag changes to paper data | `state`, `closeTagDialog()`, `applyTagFilter()` |

### Comment Auto-Save

| Function | Description | Dependencies |
|----------|-------------|--------------|
| `saveComment(key, comment)` | Save comment changes to paper | `state.papersData`, `state.processedPapersData` |

### Onboarding

| Function | Description | Dependencies |
|----------|-------------|--------------|
| `setCookie(name, value, days)` | Set browser cookie with expiry | `document.cookie` |
| `getCookie(name)` | Retrieve browser cookie value | `document.cookie` |
| `hasCompletedOnboarding()` | Check if onboarding was completed | `getCookie()` |
| `markOnboardingComplete()` | Mark onboarding as completed | `setCookie()` |
| `showOnboarding()` | Display onboarding modal | `updateOnboardingUI()`, DOM elements |
| `hideOnboarding()` | Hide onboarding modal | DOM elements |
| `updateOnboardingUI()` | Update modal UI for current step | DOM elements |
| `nextStep()` | Navigate to next onboarding step | `currentStep`, `updateOnboardingUI()` |
| `prevStep()` | Navigate to previous onboarding step | `currentStep`, `updateOnboardingUI()` |
| `goToStep(step)` | Jump to specific onboarding step | `currentStep`, `updateOnboardingUI()` |
| `completeOnboarding()` | Finalize onboarding and dismiss | `markOnboardingComplete()`, `hideOnboarding()` |
| `initOnboarding()` | Display onboarding modal if first-time | `hasCompletedOnboarding()`, `showOnboarding()` |

---

## Module: lib/main.js

**Purpose**: Application entry point that initializes all modules on page load.

### Imports

- `./state.js`: imports state (side effect)
- `./auth.js`: `* as auth`
- `./github.js`: `* as github`
- `./papers.js`: `* as papers`
- `./ui.js`: `* as ui`

### Initialization

On `DOMContentLoaded`, initializes:
- Theme (`ui.initTheme()`)
- GitHub auth (`auth.initGitHubAuth()`)
- Input options (`ui.initInputOptions()`)
- Save options (`ui.initSaveOptions()`)
- Onboarding (`ui.initOnboarding()`)

---

## Module Dependency Graph

```
lib/main.js
  ├── lib/state.js (no imports)
  ├── lib/auth.js
  │   ├── lib/state.js
  │   └── lib/github.js (dynamic)
  ├── lib/github.js
  │   ├── lib/auth.js
  │   └── lib/state.js
  ├── lib/papers.js
  │   ├── lib/state.js
  │   └── lib/ui.js (dynamic)
  └── lib/ui.js
      ├── lib/state.js
      ├── lib/auth.js (dynamic)
      ├── lib/github.js (dynamic)
      └── lib/papers.js (dynamic)
```

---

## Key Dependency Chains

### Adding a Paper by DOI
```
addPaperByDoi() [papers.js]
  → extractDOI() [papers.js]
  → fetchBibTeX() [papers.js]
  → parseBibTeX() [papers.js]
  → generateDefaultKey() [papers.js]
  → fetchAbstract() [papers.js]
  → applyTagFilter() [papers.js]
```

### Loading Papers from File
```
loadPapers('file') [ui.js]
  → loadFromFile() [ui.js]
  → processPapers() [papers.js]
    → fetchBibTeX() [papers.js]
    → parseBibTeX() [papers.js]
    → fetchPagesFromCrossref() [papers.js]
    → fetchAbstract() [papers.js]
  → renderPapers() [papers.js]
    → applyTagFilter() [papers.js]
```

### GitHub OAuth Flow
```
initiateLogin() [auth.js]
  → [redirect] → initGitHubAuth() [auth.js]
    → checkSession() [auth.js]
    → updateGitHubUI() [auth.js]
    → loadGitHubAuth() [auth.js]
      → loadGistOptionsForLoadSelector() [github.js]
        → listGists() [github.js]
```

### Saving to Gist
```
saveToGistCollection() [github.js]
  → createGist() or updateGist() [github.js]
    → listGists() [github.js]
      → getSessionId() [auth.js]
  → loadGistOptionsForSaveSelector() [github.js]
```

### Exporting BibTeX
```
exportBibTeX() [ui.js]
  → fetchBibTeX() [papers.js]
  → parseBibTeX() [papers.js]
  → fetchPagesFromCrossref() [papers.js]
  → addPagesToBibTeX() [papers.js]
  → saveFileWithPicker() [ui.js]
```

---

## Refactoring Guidance

### Current Module Sizes (approximate)

| Module | Size | Assessment |
|--------|------|------------|
| `lib/ui.js` | 47 KB | Largest module, consider further splitting |
| `lib/papers.js` | 22 KB | Core domain logic, well-organized |
| `lib/github.js` | 14 KB | Well-defined CRUD operations, stable |
| `lib/auth.js` | 10 KB | Focused OAuth handling, stable |
| `lib/state.js` | 298 B | Minimal, good separation |
| `lib/main.js` | 403 B | Entry point, minimal and clear |

### Potential Improvements

#### Priority 1 - High Impact
- [ ] **Split `lib/ui.js` further** - Contains multiple concerns that could be separate:
  - Theme management (~15 functions)
  - Storage (localStorage/sessionStorage) (~3 functions)
  - Export functions (~4 functions)
  - Onboarding (~10 functions)
  - Tag editing (~6 functions)
  - File operations (~3 functions)
  - Input/Save options (~4 functions)
- [ ] **Add unit tests for `lib/papers.js`** - Contains many pure functions (`extractDOI`, `parseBibTeX`, `formatAuthors`, `addPagesToBibTeX`) that are easily testable
- [ ] **Consider dependency injection for external APIs** - Functions like `fetchBibTeX`, `fetchAbstract`, `fetchPagesFromCrossref` directly call `fetch`. Injecting a client would make testing easier

#### Priority 2 - Medium Impact
- [ ] **Document function signatures with JSDoc** - Add parameter types and return values to improve IDE support and developer experience
- [ ] **Centralize DOM element references** - Currently each module queries its own elements. Consider a dedicated `lib/dom.js` module
- [ ] **Add error boundary handling** - No centralized error handling for async operations (fetch failures, etc.)

#### Priority 3 - Low Impact
- [ ] **Add TypeScript definitions** - Could generate `.d.ts` files for better IDE support
- [ ] **Consider a state management library** - For larger apps, something like Zustand or Jotai could replace the manual state object
- [ ] **Extract constants** - Some magic strings/numbers (e.g., 5000ms error timeout, 1000ms rate limit) could be constants

### Architectural Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| **State centralized in `lib/state.js`** | Single source of truth, easier to track state changes, simplifies testing |
| **Dynamic imports for circular dependencies** | Avoids static circular dependency errors, minimal runtime overhead (~1-5ms) |
| **Theme in UI module** | Theme switching is UI concern, doesn't affect data model |
| **GitHub auth separate from Gist operations** | Auth is session management; Gist is data access - distinct responsibilities |
| **Onboarding in UI module** | Onboarding is a UI pattern, not domain logic |

### Known Issues / Technical Debt

1. **Inline tag editing state is complex** - Uses multiple state variables (`currentEditingKey`, `tentativeTags`, `tentativeTagsRemoved`). Could be simplified with a proper state machine.
2. **No loading states for async operations** - Some async functions (e.g., `processPapers`) have UI feedback via `showStatus`, but there's no standardized loading state management.
3. **DOM manipulation mixed with business logic** - Some functions (e.g., `createPaperCard`) build HTML strings directly. Consider template components or a virtual DOM approach for larger scale.

### Testing Recommendations

| Module | Test Priority | Key Functions to Test |
|--------|---------------|----------------------|
| `lib/state.js` | Low | Simple object, little to test |
| `lib/auth.js` | Medium | `checkSession`, `getSessionId`/`setSessionId`/`clearSessionId` |
| `lib/github.js` | Medium | Integration tests with mock `fetch` |
| `lib/papers.js` | **High** | `extractDOI`, `parseBibTeX`, `formatAuthors`, `addPagesToBibTeX`, `generateDefaultKey` |
| `lib/ui.js` | Low | Mostly DOM manipulation, requires integration tests |
| `lib/main.js` | Low | Simple initialization, integration test only |

---

## Refactoring Guidance

### Module Size Analysis

| Module | Size | Lines (approx) | Complexity | Priority for Refactoring |
|--------|------|---------------|------------|---------------------------|
| `lib/ui.js` | 47 KB | ~1,300 | High (many concerns) | High |
| `lib/papers.js` | 22 KB | ~800 | Medium (domain logic) | Low |
| `lib/github.js` | 14 KB | ~400 | Low (well-defined CRUD) | Low |
| `lib/auth.js` | 10 KB | ~300 | Low (focused OAuth) | Low |
| `lib/state.js` | 298 B | ~15 | Minimal | None |
| `lib/main.js` | 403 B | ~15 | Entry point only | None |

### Architectural Decisions (Rationale)

| Decision | Reasoning |
|----------|-----------|
| Centralized state in `lib/state.js` | Single source of truth, easier debugging, enables state persistence |
| Separated GitHub auth from Gist operations | Auth concerns (session management) separate from data operations |
| Papers logic in dedicated module | Domain logic isolated, easier to test independently |
| UI concerns grouped together | DOM manipulation and user interaction patterns are naturally coupled |
| Dynamic imports for circular dependencies | Avoids module initialization cycles, minimal performance impact |

### Known Issues / Technical Debt

| Area | Issue | Severity | Notes |
|------|-------|----------|-------|
| `lib/ui.js` | Too many concerns (theme, storage, export, onboarding, tags) | Medium | ~1,300 lines, hard to navigate |
| DOM elements | Queried at module load time, scattered across modules | Low | Could use a DOM registry pattern |
| Error handling | Inconsistent (some functions throw, others return null) | Low | Makes error propagation harder |
| API calls | External APIs not mockable (harder to test) | Medium | Could use dependency injection |
| Rate limiting | Hardcoded delays (1000ms) between API calls | Low | Works but not configurable |

### Future Refactoring Opportunities

#### Priority 1: Split `lib/ui.js`

The largest module (~1,300 lines) could be broken into:

```
lib/ui/
  ├── theme.js          (updateThemeIcons, getSystemPreference, etc.)
  ├── storage.js        (saveToStorage, loadFromStorage, clearCurrentData)
  ├── export.js         (exportJSON, exportBibTeX, saveFileWithPicker)
  ├── onboarding.js     (all onboarding-related functions)
  ├── notifications.js  (showError, showStatus, hideStatus, hideError)
  ├── tagEditor.js      (openTagDialog, closeTagDialog, saveTagChanges)
  ├── inputOptions.js   (initInputOptions, updateInputOptionUI)
  └── index.js          (re-exports for convenience)
```

#### Priority 2: Dependency Injection for External APIs

Make `fetchBibTeX`, `fetchAbstract`, etc. testable:

```js
// In lib/papers.js
export const apiClient = {
    fetchBibTeX: (doi) => fetch(`https://doi.org/${encodeURIComponent(doi)}`, ...),
    fetchAbstract: (doi) => /* ... */,
    // ...
};

// Tests can override apiClient methods
```

#### Priority 3: DOM Registry Pattern

Centralize DOM element queries:

```js
// lib/dom.js
export const dom = {
    loadJsonSection: document.getElementById('loadJsonSection'),
    papersList: document.getElementById('papersList'),
    // ...
};

// Other modules import dom instead of querying directly
```

#### Priority 4: Add JSDoc Type Documentation

Document function signatures for better IDE support:

```js
/**
 * Extract DOI from input string
 * @param {string} input - Input string containing DOI or URL
 * @returns {string|null} DOI if found, null otherwise
 */
export function extractDOI(input) { /* ... */ }
```

#### Priority 5: Event Bus for Decoupling

Replace tight coupling with event-based communication:

```js
// lib/events.js
export const events = new EventTarget();
export const EVENT_PAPER_ADDED = 'paper:added';
export const EVENT_TAGS_CHANGED = 'tags:changed';
```

### Testing Recommendations

| Module | Testability | Priority | Suggested Tests |
|--------|-------------|----------|-----------------|
| `lib/state.js` | High | Low | State immutability, initial values |
| `lib/papers.js` | High | High | `extractDOI()`, `parseBibTeX()`, `formatAuthors()`, `generateDefaultKey()` (all pure functions) |
| `lib/github.js` | Medium | Medium | Mock `fetch()` for API calls |
| `lib/auth.js` | Medium | Low | Mock `localStorage`, mock API responses |
| `lib/ui.js` | Low | Low | After splitting, test individual submodules |

### Migration Path for `lib/ui.js` Split

1. Create `lib/ui/theme.js` and move theme functions
2. Update imports in affected modules
3. Repeat for each submodule
4. Update `lib/main.js` to import from new structure
5. Delete original `lib/ui.js`

---

## Notes

- All modules use ES6 `import`/`export` syntax
- The entry point `lib/main.js` uses type="module" in HTML
- Dynamic imports are used to break circular dependencies where needed (~1-5ms overhead, negligible)
- State is centralized in `lib/state.js` and imported by other modules as needed
- DOM elements are referenced directly within the modules that use them most
- See "Refactoring Guidance" section above for future improvement opportunities