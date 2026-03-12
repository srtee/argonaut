# Argonaut Codebase Review

## Project Overview
Argonaut is a browser-based bibliography manager built with vanilla JavaScript (ES6+), CSS3, and HTML5. It uses esbuild for bundling and Playwright for E2E testing.

---

## Good Programming Patterns

### 1. DOM Registry Pattern (`lib/dom.js`)
Centralized DOM element management with a registry system. Modules register their elements, and the registry provides validation and access. This avoids scattered `document.getElementById()` calls throughout the codebase.

### 2. Immutable State Management (`lib/state.js`)
Clean store pattern with:
- Immutable state updates via spread operator
- Auto-persistence to sessionStorage
- Subscription system for state changes
- Proxy for backward compatibility with warnings for direct mutations

### 3. Client Module Pattern (`lib/clients/`)
Well-organized API abstraction layer with separate clients for:
- DOI.org
- Semantic Scholar
- Crossref
- GitHub
- Auth

Each client has focused responsibilities with consistent error handling patterns.

### 4. Clear Module Initialization
Modules follow `initDOM()` and `initEventListeners()` patterns, making initialization flow predictable and testable.

### 5. Production-Ready Build Setup
- esbuild bundling with content hashing for cache busting
- Target specification for browser compatibility
- Static file copying to dist

---

## Areas for Improvement

### 1. Large Monolithic Files
`papers.js` is 1015 lines (37KB) - the largest file. It handles DOI fetching, BibTeX parsing, pagination, rendering, and more. This should be split into smaller, focused modules:
- `papers/doi.js` - DOI handling
- `papers/bibtex.js` - BibTeX processing
- `papers/rendering.js` - DOM rendering
- `papers/pagination.js` - Pagination logic

### 2. Debug Code in Production
Excessive logging throughout the codebase:
- `lib/state.js:29-31` - Sample key logging on every persist
- `lib/state.js:44` - Storage load logging
- `lib/dom.js` - Registration logs throughout

These should be removed or made conditional (e.g., using a debug flag).

### 3. No TypeScript
The codebase would benefit significantly from TypeScript for:
- API client response types
- State shape validation
- Event handler types
- DOM element type safety

### 4. Inconsistent Error Handling
API clients have varying levels of error handling. Some operations lack:
- Retry logic for transient failures
- User-friendly error messages
- Graceful degradation

### 5. Test Coverage
While Playwright E2E tests exist, there are no unit tests for:
- Utility functions (`lib/utils.js`)
- State management (`lib/state.js`)
- API client logic

### 6. Global Variable in Papers Module
`papers.js` declares module-level variables (lines 10-26) that depend on `initDOM()` being called first. This creates implicit ordering dependencies.

---

## Recommendations

1. **Split `papers.js`** into smaller modules following the client pattern
2. **Add build flag** to strip debug logs in production
3. **Consider TypeScript** for type safety, especially in the clients/
4. **Add unit tests** for pure functions and utilities
5. **Standardize error handling** across API clients
6. **Document the initialization order** requirements explicitly

---

*Generated on: 2026-03-12*