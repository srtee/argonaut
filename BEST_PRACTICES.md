# Best Practices

> A guide to avoiding common programming pitfalls in this codebase.

---

## DOM Element Management

### Don't: Query elements directly across modules

```javascript
// Bad - Hard to track when HTML changes
const gistSelector = document.getElementById('gistSelector');
const saveGistSelector = document.getElementById('saveGistSelector');
```

### Do: Use a DOM registry pattern

```javascript
// lib/dom.js - Single source of truth
export const dom = {
  gistSelector: () => document.getElementById('gistSelector'),
  saveGistSelector: () => document.getElementById('saveGistSelector'),
};

// Import and use elsewhere
import { dom } from './dom.js';
dom.gistSelector().innerHTML = ''; // Fails fast if element missing
```

**Why**: Centralized references fail fast during development when HTML structure changes. No more undefined element bugs.

---

## CSS Styling

### Don't: Use `!important` or fight specificity wars

```css
/* Bad - Specificity escalation */
.export-reset-buttons button {
    background: var(--input-bg) !important;
    font-size: 14px !important;
}
```

### Do: Use BEM naming and CSS custom properties

**BEM (Block Element Modifier)** is a naming convention that makes CSS predictable and maintainable:

- **Block**: Standalone component (`.paper`, `.tag`, `.onboarding`)
- **Element**: Part of a block, separated by `__` (`.paper__title`, `.tag__remove`)
- **Modifier**: Variation of block/element, separated by `--` (`.paper--highlight`, `.tag--selected`)

```css
/* Good - Predictable BEM structure */
.save-section { }              /* Block */
.save-section__option { }      /* Element */
.save-section__option--active { }  /* Modifier */
.save-section__btn {
    background: var(--btn-primary-bg);
    color: var(--btn-primary-color);
}

/* Component variants, no overrides needed */
.btn { }                  /* Base block */
.btn--primary { }         /* Primary modifier */
.btn--secondary { }       /* Secondary modifier */

/* Paper card example */
.paper { }                      /* Block */
.paper__header { }              /* Element */
.paper__title { }               /* Element */
.paper--highlight { }           /* Modifier */
.paper--dimmed { }              /* Modifier */

/* Tag example */
.tag { }                        /* Block */
.tag--selected { }              /* Modifier */
.tag--deselected { }            /* Modifier */
```

**Why**:
- Single-class selectors (low specificity, easy to override)
- Clear relationship between HTML and CSS
- No nesting required (flatter CSS)
- Theming via custom properties
- No `!important` needed

---


## Code Duplication

### Don't: Copy-paste code blocks

```html
<!-- Bad - Duplicate IDs break JavaScript -->
<div id="saveGistSelector">...</div>
<div id="saveGistSelector">...</div> <!-- Duplicate! -->
```

### Do: Write reusable functions

```javascript
// lib/github.js
async function populateGistSelector(selector, gists) {
    selector.innerHTML = '';
    gists.forEach(gist => {
        const option = document.createElement('option');
        option.value = gist.id;
        option.textContent = gist.description || 'Unnamed gist';
        selector.appendChild(option);
    });
}

// Reuse for both selectors
await populateGistSelector(dom.gistSelector(), gists);
await populateGistSelector(dom.saveGistSelector(), gists);
```

**Why**: Single function to maintain, behavior is consistent, reduces file size.

---

## API Integration

### Don't: Mix fetch calls with business logic

```javascript
// Bad - Hard to test, rate limits scattered
async function loadPapers() {
    await fetch('https://doi.org/...'); // No error handling
    await new Promise(r => setTimeout(r, 1000)); // Hardcoded delay
}
```

### Do: Abstract behind an API client

```javascript
// lib/api.js
export const api = {
    async fetchBibTeX(doi) {
        const response = await fetch(`https://doi.org/${encodeURIComponent(doi)}`, {
            headers: { Accept: 'application/x-bibtex' }
        });
        if (!response.ok) throw new Error(`Failed to fetch BibTeX: ${response.status}`);
        return response.text();
    },
    // All rate limiting, retries, error handling here
};

// lib/papers.js
async function loadPapers() {
    const bibtex = await api.fetchBibTeX(doi);
    // Business logic only
}
```

**Why**: Easy to test with mocks, consistent error handling, rate limiting in one place.

---

## File Size & Modularity

### Don't: Let files grow beyond ~500 lines

```javascript
// script.js was 2594 lines - unmaintainable
```

### Do: Split by concern

```
lib/
├── state.js    # Global state
├── auth.js     # OAuth session
├── github.js   # Gist CRUD
├── papers.js   # Domain logic
├── ui.js       # UI concerns
└── main.js     # Entry point
```

**Why**: Easier to navigate, test, and understand. Each module has a single responsibility.

---

## Dead Code

### Don't: Comment out code or leave unused functions

```javascript
// async function loadGistOptionsLegacy() { ... } // Don't do this
```

### Do: Delete it. Git has your back.

```bash
git rm unnecessary-file.js
git commit -m "Remove unused legacy code"
```

**Why**: Dead code confuses future maintainers. Git history preserves everything if needed.

---

## Asset Cache Busting

### Don't: Manually bump version strings

```html
<script src="script.js?v=1.6.1"></script>  <!-- Commit 1 -->
<script src="script.js?v=1.6.2"></script>  <!-- Commit 2 -->
<script src="script.js?v=1.6.3"></script>  <!-- Commit 3 -->
```

### Do: Use content hashes or build tools

```html
<!-- Build process generates: -->
<script src="script.abc123.js"></script>
```

**Why**: Automatic cache invalidation, no manual version tracking, no wasted commits.

---

## Summary Checklist

When adding new features:

- [ ] DOM elements referenced from `lib/dom.js` only
- [ ] CSS uses BEM naming, no `!important`
- [ ] No code duplicated - extract to reusable functions
- [ ] API calls go through `lib/api.js`
- [ ] Module size < 500 lines, split if larger
- [ ] Delete dead code instead of commenting
- [ ] Use build tool for cache busting, not manual version strings