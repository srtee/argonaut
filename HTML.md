# HTML Reference

> Documents the DOM structure and elements that JavaScript interacts with.

---

## DOM Registry Pattern

The application uses a **centralized DOM Registry** (`lib/dom.js`) for DOM element management instead of decentralized module-level variables.

### Benefits
- **Single source of truth** - All DOM element references are in one place
- **Lazy lookup** - Elements are looked up once and cached
- **Validation** - Missing elements are logged as warnings on initialization
- **Debugging** - Clear error messages when required elements are missing

### API

```javascript
import { get, getMultiple, getRequired, has, initAll } from './dom.js';

// Get element by ID (returns null if not found)
const element = get('elementId');

// Get required element (throws if not found)
const element = getRequired('elementId');

// Get multiple elements at once
const { element1, element2 } = getMultiple('element1', 'element2');

// Check if element exists
const exists = has('elementId');

// Initialize all registered elements
initAll();
```

### Module Registration

Elements are registered by module in `lib/dom.js`:

- **UI Module**: Main sections, inputs, buttons, theme, onboarding
- **Auth Module**: GitHub authentication elements
- **Papers Module**: DOI input, papers list
- **GitHub Module**: Gist selectors and buttons

### Initialization Flow

1. `main.js` calls `dom.initAll()` on `DOMContentLoaded`
2. `initAll()` registers all elements from each module
3. Registry validates all elements exist in DOM
4. Warnings logged for missing elements
5. Individual modules access elements via `get()` or `getMultiple()`

---

## CSS Architecture: BEM Methodology

This project follows the **BEM (Block Element Modifier)** naming convention for CSS classes:

- **Block**: Standalone component (e.g., `.paper`, `.tag`, `.onboarding`)
- **Element**: Part of a block, separated by double underscore (e.g., `.paper__title`, `.tag__remove`)
- **Modifier**: Variation of a block/element, separated by double dash (e.g., `.paper--highlight`, `.tag--selected`)

### Benefits
- Predictable and maintainable CSS
- No specificity wars
- Reusable components
- Clear relationship between HTML and CSS

---

## Page Structure

The page uses semantic HTML with a main container (`#mainContent`) containing several sections that show/hide based on application state.

| Section | ID | Default Visible | Purpose |
|---------|----|-----------------|---------|
| Load JSON Collection | `#loadJsonSection` | Yes | Load papers from various sources |
| Save JSON Collection | `#saveJsonSection` | No | Save papers to various destinations |
| Papers List | `#papersSection` | No | Display loaded papers |
| Export & Reset | `#exportResetSection` | No | Export functions and reset button |
| GitHub Gist Sync | `#githubSection` | Yes | GitHub authentication and status |
| Add Paper by DOI | `#addDoiSection` | Yes | Quick DOI entry (always visible) |
| Onboarding Modal | `#onboardingModal` | Conditional | First-time user guide |

---

## DOM Registry Pattern

The application uses a centralized **DOM Registry** (`lib/dom.js`) for managing DOM element references. This provides a single source of truth for all DOM elements, eliminating duplication and providing validation.

### Registry API

| Function | Description |
|----------|-------------|
| `dom.get(id)` | Get element by ID (returns null if not found) |
| `dom.getRequired(id)` | Get element by ID (throws if not found) |
| `dom.getMultiple(...ids)` | Get multiple elements at once |
| `dom.has(id)` | Check if element exists |
| `dom.initAll()` | Initialize all registered elements |
| `dom.getStats()` | Get registry statistics |

### Module Registration

Elements are registered by module:

- **UI Module**: `loadJsonSection`, `saveJsonSection`, `papersSection`, `exportResetSection`, `papersList`, `fileInput`, `urlInput`, `loadUrlBtn`, `loadFromStorageBtn`, `loadNewBtn`, `saveToStorageBtn`, `exportJsonBtn`, `exportBibtexAllBtn`, `exportBibtexTaggedBtn`, `jsonFormatSelector`, `error`, `status`, `themeToggle`, `onboardingModal`, `closeOnboardingBtn`, `showOnboardingBtn`

- **Auth Module**: `githubSection`, `githubNotLoggedIn`, `githubLoggedIn`, `githubConnectBtn`, `githubLogoutBtn`, `githubUserAvatar`, `githubUserName`, `gistConnectedContent`, `saveGistConnectedContent`

- **Papers Module**: `papersList`, `loadJsonSection`, `saveJsonSection`, `exportResetSection`, `papersSection`, `doiInput`, `doiKeyInput`, `addDoiBtn`, `status`, `exportBibtexTaggedBtn`

- **GitHub Module**: `loadGistSelector`, `saveGistSelector`, `loadFromGistCollectionBtn`, `saveToGistOptionBtn`, `gistConnectedContent`, `saveGistConnectedContent`, `jsonFormatSelector`

### Initialization Flow

1. `main.js` calls `dom.initAll()` on DOMContentLoaded
2. Registry registers all elements from all modules
3. Validation runs to check for missing elements (warnings logged)
4. Individual module `initDOM()` functions get elements via `get()` or `getMultiple()`

---

## Critical Elements (Queried by JS)

### Main Sections

| ID | Module | Usage |
|----|--------|-------|
| `#loadJsonSection` | `ui.js` | Hidden after papers load |
| `#saveJsonSection` | `ui.js`, `github.js`, `papers.js` | Hidden until papers exist |
| `#exportResetSection` | `ui.js`, `papers.js` | Hidden until papers exist |
| `#papersSection` | `ui.js`, `github.js`, `papers.js` | Hidden until papers exist |
| `#githubSection` | `auth.js` | Always visible |

### Papers List

| ID | Module | Usage |
|----|--------|-------|
| `#papersList` | `ui.js`, `papers.js` | Container for dynamically created `.paper` elements |

### Load JSON Collection

| ID | Module | Usage |
|----|--------|-------|
| `#urlInput` | `ui.js` | User input for URL |
| `#loadUrlBtn` | `ui.js` | Triggers `loadPapers('url')` |
| `#fileInput` | `ui.js` | File upload change triggers `loadPapers('file')` |
| `#loadFromStorageBtn` | `ui.js` | Triggers `loadFromStorage()` |
| `#gistNotConnected` | `auth.js`, `github.js` | Hidden when authenticated |
| `#gistConnectedContent` | `auth.js`, `github.js` | Hidden when not authenticated |
| `#loadGistSelector` | `github.js` | Populated with user's gists |
| `#loadFromGistCollectionBtn` | `github.js` | Triggers `loadFromGistCollection()` |

### Save JSON Collection

| ID | Module | Usage |
|----|--------|-------|
| `#jsonFormatSelector` | `ui.js`, `github.js` | Select "full" or "light" format |
| `#saveGistNotConnected` | `auth.js`, `github.js` | Hidden when authenticated |
| `#saveGistConnectedContent` | `auth.js`, `github.js` | Hidden when not authenticated |
| `#saveGistSelector` | `github.js` | Populated with user's gists + "(new gist)" |
| `#saveToGistOptionBtn` | `github.js` | Triggers `saveToGistCollection()` |
| `#saveToStorageBtn` | `ui.js` | Triggers `saveToStorage()` |

### Export & Reset

| ID | Module | Usage |
|----|--------|-------|
| `#exportJsonBtn` | `ui.js` | Triggers `exportJSON()` |
| `#exportBibtexAllBtn` | `ui.js` | Triggers `exportBibTeX()` |
| `#exportBibtexTaggedBtn` | `ui.js` | Triggers `exportBibTeXTagged()` (disabled when no tags selected) |
| `#loadNewBtn` | `ui.js` | Resets all data with confirmation |

### Add Paper by DOI

| ID | Module | Usage |
|----|--------|-------|
| `#doiInput` | `papers.js` | User input, Enter key triggers `addPaperByDoi()` |
| `#doiKeyInput` | `papers.js` | Optional custom citation key |
| `#addDoiBtn` | `papers.js` | Triggers `addPaperByDoi()` |
| `#status` | `ui.js`, `papers.js`, `github.js` | Status notification display |

### GitHub Auth

| ID | Module | Usage |
|----|--------|-------|
| `#githubNotLoggedIn` | `auth.js` | Visible when not authenticated |
| `#githubLoggedIn` | `auth.js` | Hidden when not authenticated |
| `#githubUserAvatar` | `auth.js` | User avatar image source |
| `#githubUserName` | `auth.js` | User login name text |
| `#githubConnectBtn` | `auth.js` | Triggers `initiateLogin()` |
| `#githubLogoutBtn` | `auth.js` | Triggers `logout()` |

### Notifications

| ID | Module | Usage |
|----|--------|-------|
| `#error` | `ui.js` | Error notification (5s auto-hide) |
| `#status` | `ui.js` | Status notification |

### Theme Toggle

| ID | Module | Usage |
|----|--------|-------|
| `#themeToggle` | `ui.js` | Click toggles dark/light mode |
| `#themeIcon` | `ui.js` | SVG icon (sun/moon swapped via CSS) |

### Onboarding

| ID | Module | Usage |
|----|--------|-------|
| `#onboardingModal` | `ui.js` | Modal container |
| `#closeOnboardingBtn` | `ui.js` | Triggers `hideOnboarding()` |
| `#onboardingBackBtn` | `ui.js` | Triggers `prevStep()` |
| `#onboardingNextBtn` | `ui.js` | Triggers `nextStep()` |
| `#onboardingCompleteBtn` | `ui.js` | Triggers `completeOnboarding()` |
| `#showOnboardingBtn` | `ui.js` | Footer link, triggers `showOnboarding()` |
| `.onboarding__step` | `ui.js` | Content panels (6 steps, `data-step="0-5"`) |
| `.onboarding__dot` | `ui.js` | Navigation dots (6 dots, `data-step="0-5"`) |

---

## Data Attributes

| Attribute | Element | Stores | Usage |
|-----------|---------|--------|-------|
| `data-key` | `.paper`, `.tag`, `.tag-edit-btn`, textarea.comments | Paper citation key | Identifies which paper/element belongs to which paper |
| `data-tag` | `.tag`, `.tag-editor__item` | Tag name | For filtering and editing |
| `data-step` | `.onboarding__step`, `.onboarding__dot` | Step number (0-5) | For onboarding navigation |
| `data-input` | `.input-section__option` | Input method value | Maps radio button to content section |
| `data-save` | `.save-section__option` | Save method value | Maps radio button to content section |
| `data-theme` | `<html>` | "dark" or not set | Toggles dark mode CSS |

---

## Dynamic Content Structure

### Paper Card (`.paper`)

Created dynamically by `createPaperCard()` in `papers.js`:

```html
<article class="paper" data-key="Smith2024">
    <div class="paper__header">
        <h3 class="paper__title">Paper Title</h3>
    </div>
    <p class="citation">
        <span class="citation__authors">Authors</span>
        <span class="citation__journal">Journal</span>
        <span class="citation__year">Year</span>
        <a href="..." class="citation__link">DOI</a>
    </p>
    <textarea class="comments" data-key="Smith2024" aria-label="Notes for this paper">User notes</textarea>
    <div class="tags">
        <button class="tag-edit-btn" data-key="Smith2024" aria-label="Edit tags">
            <svg class="tag-edit-btn__icon">...</svg>
        </button>
        <button type="button" class="tag" data-tag="AI" aria-pressed="false" tabindex="0">AI</button>
        <button type="button" class="tag" data-tag="NLP" aria-pressed="false" tabindex="0">NLP</button>
    </div>
    <div class="also-read" role="group" aria-label="Also read papers">
        <span class="also-read__label">Also read:</span>
        <button type="button" class="also-read__link" data-ref="Other2023" tabindex="0">Other2023</button>
    </div>
    <button class="abstract-toggle" aria-expanded="false" aria-label="Toggle abstract" type="button">
        <svg class="abstract-toggle__icon">...</svg>
        Abstract
    </button>
    <div class="abstract" aria-hidden="true">
        <div class="abstract__content">Abstract text...</div>
    </div>
</article>
```

### Tag Editor (`.tag-editor`)

Created dynamically by `renderInlineTagEditor()` in `ui.js` when editing tags:

```html
<div class="tag-editor">
    <div class="tag-editor__add">
        <input type="text" class="tag-editor__input" placeholder="Add new tag..." aria-label="New tag name">
        <button type="button" class="tag-editor__add-btn">Add</button>
    </div>
    <div class="tag-editor__list" role="list" aria-label="Tags for this paper">
        <button type="button" class="tag-editor__item" data-tag="AI" aria-label="Remove tag: AI">AI <span class="tag-editor__remove">×</span></button>
        <button type="button" class="tag-editor__item tag-editor__item--removed" data-tag="OldTag" aria-label="Restore tag: OldTag">OldTag <span class="tag-editor__restore">+</span></button>
    </div>
    <div class="tag-editor__buttons">
        <button type="button" class="tag-editor__cancel">Cancel</button>
        <button type="button" class="tag-editor__save">Save Tag Changes</button>
    </div>
</div>
```

---

## Accessibility Features

### Skip Link
```html
<a href="#mainContent" class="skip-link" role="navigation">Skip to main content</a>
```
Allows keyboard users to skip header content.

### Live Regions
```html
<div id="error" class="error" role="alert" aria-live="assertive" aria-atomic="true"></div>
<div id="status" class="status" role="status" aria-live="polite"></div>
```
Error and status announcements for screen readers.

### ARIA Attributes
| Attribute | Element | Purpose |
|-----------|---------|---------|
| `role="list"` | `#papersList`, `.tag-editor__list` | Semantics for lists |
| `role="group"` | `.also-read` | Groups related controls |
| `role="dialog"` | `#onboardingModal` | Modal semantics |
| `aria-pressed` | `.tag`, `.tag-edit-btn` | Toggle button state |
| `aria-expanded` | `.abstract-toggle` | Abstract visibility |
| `aria-hidden` | `.abstract`, `#onboardingModal` | Hide from screen readers when closed |
| `aria-label` | Icon-only buttons | Descriptive label for accessibility |
| `tabindex="0"` | `.tag`, `.tag-editor__item`, `.also-read__link` | Make elements keyboard focusable |
| `aria-labelledby` | Sections | Associate heading with section |

---

## Event Listeners (Declarative)

The following listeners are attached at module load time:

| Event | Target | Handler | Module |
|-------|--------|---------|--------|
| `click` | `#themeToggle` | Toggle theme | `ui.js` |
| `click` | `#githubConnectBtn` | Initiate OAuth | `auth.js` |
| `click` | `#githubLogoutBtn` | Logout | `auth.js` |
| `click` | `#loadUrlBtn` | Load from URL | `ui.js` |
| `change` | `#fileInput` | Load from file | `ui.js` |
| `click` | `#loadFromStorageBtn` | Load from storage | `ui.js` |
| `click` | `#loadFromGistCollectionBtn` | Load from gist | `github.js` |
| `click` | `#saveToStorageBtn` | Save to storage | `ui.js` |
| `click` | `#saveToGistOptionBtn` | Save to gist | `github.js` |
| `click` | `#exportJsonBtn` | Export JSON | `ui.js` |
| `click` | `#exportBibtexAllBtn` | Export BibTeX | `ui.js` |
| `click` | `#exportBibtexTaggedBtn` | Export tagged BibTeX | `ui.js` |
| `click` | `#loadNewBtn` | Reset all | `ui.js` |
| `click` | `#addDoiBtn` | Add paper | `papers.js` |
| `keydown` (Enter) | `#doiInput` | Add paper | `papers.js` |
| `change` | `input[name="inputMethod"]` | Switch input UI | `ui.js` |
| `change` | `input[name="saveMethod"]` | Switch save UI | `ui.js` |

### Event Delegation

| Event | Delegated Target | Handler | Module |
|-------|------------------|---------|--------|
| `click` | `#papersList` | `.tag-edit-btn` clicks | `ui.js` |
| `blur` (capture) | `#papersList` | `.comments` blur (auto-save) | `ui.js` |
| `keydown` (Escape) | `document` | Close tag editor | `ui.js` |
| `click` | `document` | Click outside tag editor | `ui.js` |
| `keydown` (Escape) | `document` | Close onboarding | `ui.js` |
| `click` | `document` (backdrop) | Close onboarding | `ui.js` |

---

## CSS Classes Used by JS (BEM Format)

| Class | Added By | Purpose |
|-------|----------|---------|
| `.error--visible` | `showError()` | Show error notification |
| `.status--visible` | `showStatus()` | Show status notification |
| `.onboarding--active` | Onboarding modal | Show onboarding modal |
| `.onboarding__step--active` | Onboarding navigation | Mark active step |
| `.onboarding__dot--active` | Onboarding navigation | Mark active dot |
| `.input-section__option--active` | Input option toggle | Mark selected input option |
| `.save-section__option--active` | Save option toggle | Mark selected save option |
| `.tags--editing` | `openTagDialog()` | Mark tags container as being edited |
| `.abstract--expanded` | Abstract toggle | Show abstract content |
| `.tag--selected` | Tag filtering | Mark tag as selected |
| `.tag--deselected` | Tag filtering | Mark tag as not selected |
| `.paper--dimmed` | Tag filtering | Dim paper cards without selected tags |
| `.paper--highlight` | Added paper focus | Flash effect on new paper |
| `.btn--loading` | Gist operations | Show loading state on buttons |

---

## Visibility State Matrix

| Action | `#loadJsonSection` | `#saveJsonSection` | `#exportResetSection` | `#papersSection` | `#githubSection` | `#onboardingModal` |
|--------|--------------------|---------------------|----------------------|---------------------|-------------------|--------------------|
| Page load (no onboarding) | `block` | `none` | `none` | `none` | `block` | `none` |
| Page load (with onboarding) | `block` | `none` | `none` | `none` | `block` | `flex` |
| Papers loaded | `none` | `block` | `block` | `block` | `block` | unchanged |
| Reset all | `block` | `none` | `none` | `none` | `block` | unchanged |
| Onboarding complete | unchanged | unchanged | unchanged | unchanged | unchanged | `none` |