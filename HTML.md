# HTML Reference

> Documents the DOM structure and elements that JavaScript interacts with.

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
| `#papersList` | `ui.js`, `papers.js` | Container for dynamically created `.paper-card` elements |

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
| `.onboarding-step` | `ui.js` | Content panels (6 steps, `data-step="0-5"`) |
| `.onboarding-dot` | `ui.js` | Navigation dots (6 dots, `data-step="0-5"`) |

---

## Data Attributes

| Attribute | Element | Stores | Usage |
|-----------|---------|--------|-------|
| `data-key` | `.paper-card`, `.tag`, `edit-tags-btn`, textarea.comments | Paper citation key | Identifies which paper/element belongs to which paper |
| `data-tag` | `.tag`, `.edit-tag-item` | Tag name | For filtering and editing |
| `data-step` | `.onboarding-step`, `.onboarding-dot` | Step number (0-5) | For onboarding navigation |
| `data-input` | `.input-option` | Input method value | Maps radio button to content section |
| `data-save` | `.save-option` | Save method value | Maps radio button to content section |
| `data-theme` | `<html>` | "dark" or not set | Toggles dark mode CSS |

---

## Dynamic Content Structure

### Paper Card (`.paper-card`)

Created dynamically by `createPaperCard()` in `papers.js`:

```html
<article class="paper-card" data-key="Smith2024">
    <div class="paper-header">
        <h3 class="paper-title">Paper Title</h3>
    </div>
    <p class="citation-line">Authors. Journal. Year. Vol. No. pp. <a href="...">DOI</a></p>
    <textarea class="comments" data-key="Smith2024" aria-label="Notes for this paper">User notes</textarea>
    <div class="tags-container">
        <button class="edit-tags-btn" data-key="Smith2024" aria-label="Edit tags">
            <svg>...</svg>
        </button>
        <button type="button" class="tag" data-tag="AI" aria-pressed="false" tabindex="0">AI</button>
        <button type="button" class="tag" data-tag="NLP" aria-pressed="false" tabindex="0">NLP</button>
    </div>
    <div class="alsoread-container" role="group" aria-label="Also read papers">
        <span class="alsoread-label">Also read:</span>
        <button type="button" class="alsoread-link" data-ref="Other2023" tabindex="0">Other2023</button>
    </div>
    <button class="abstract-toggle" aria-expanded="false" aria-label="Toggle abstract" type="button">
        <svg>...</svg>
        Abstract
    </button>
    <div class="abstract-container" aria-hidden="true">
        <div class="abstract-content">Abstract text...</div>
    </div>
</article>
```

### Tag Editor (`.edit-controls`)

Created dynamically by `renderInlineTagEditor()` in `ui.js` when editing tags:

```html
<div class="edit-controls">
    <div class="tag-add-container">
        <input type="text" class="tag-edit-input" placeholder="Add new tag..." aria-label="New tag name">
        <button type="button" class="add-edit-tag-btn">Add</button>
    </div>
    <div class="edit-tags-list" role="list" aria-label="Tags for this paper">
        <button type="button" class="edit-tag-item" data-tag="AI" aria-label="Remove tag: AI">AI <span class="tag-remove">×</span></button>
        <button type="button" class="edit-tag-item tentatively-removed" data-tag="OldTag" aria-label="Restore tag: OldTag">OldTag <span class="tag-restore">+</span></button>
    </div>
    <div class="edit-buttons">
        <button type="button" class="cancel-edit-tags-btn">Cancel</button>
        <button type="button" class="save-edit-tags-btn">Save Tag Changes</button>
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
| `role="list"` | `#papersList`, `.edit-tags-list` | Semantics for lists |
| `role="group"` | `.alsoread-container` | Groups related controls |
| `role="dialog"` | `#onboardingModal` | Modal semantics |
| `aria-pressed` | `.tag`, `.edit-tags-btn` | Toggle button state |
| `aria-expanded` | `.abstract-toggle` | Abstract visibility |
| `aria-hidden` | `.abstract-container`, `#onboardingModal` | Hide from screen readers when closed |
| `aria-label` | Icon-only buttons | Descriptive label for accessibility |
| `tabindex="0"` | `.tag`, `.edit-tag-item`, `.alsoread-link` | Make elements keyboard focusable |
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
| `click` | `#papersList` | `.edit-tags-btn` clicks | `ui.js` |
| `blur` (capture) | `#papersList` | `.comments` blur (auto-save) | `ui.js` |
| `keydown` (Escape) | `document` | Close tag editor | `ui.js` |
| `click` | `document` | Click outside tag editor | `ui.js` |
| `keydown` (Escape) | `document` | Close onboarding | `ui.js` |
| `click` | `document` (backdrop) | Close onboarding | `ui.js` |

---

## CSS Classes Used by JS

| Class | Added By | Purpose |
|-------|----------|---------|
| `.visible` | `showError()`, `showStatus()` | Show error/status notifications |
| `.active` | Onboarding, input/save options | Mark active step/option |
| `.editing` | `openTagDialog()` | Mark tags container as being edited |
| `.expanded` | Abstract toggle | Show abstract content |
| `.selected` | Tag filtering | Mark tag as selected |
| `.deselected` | Tag filtering | Mark tag as not selected |
| `.dimmed` | Tag filtering | Dim paper cards without selected tags |
| `.highlight` | Added paper focus | Flash effect on new paper |
| `.loading` | Gist operations | Show loading state on buttons |

---

## Visibility State Matrix

| Action | `#loadJsonSection` | `#saveJsonSection` | `#exportResetSection` | `#papersSection` | `#githubSection` | `#onboardingModal` |
|--------|--------------------|---------------------|----------------------|---------------------|-------------------|--------------------|
| Page load (no onboarding) | `block` | `none` | `none` | `none` | `block` | `none` |
| Page load (with onboarding) | `block` | `none` | `none` | `none` | `block` | `block` |
| Papers loaded | `none` | `block` | `block` | `block` | `block` | unchanged |
| Reset all | `block` | `none` | `none` | `none` | `block` | unchanged |
| Onboarding complete | unchanged | unchanged | unchanged | unchanged | unchanged | `none` |