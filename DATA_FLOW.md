# Data Flow Reference

> Visual representation of how data moves through the Argonaut application.

---

## Data Entry Points

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA ENTRY POINTS                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌───────────┐  │
│  │   DOI Input     │  │   File Upload   │  │   URL Load      │  │  Storage  │  │
│  │   (add paper)   │  │   (load papers) │  │   (load papers) │  │  (load)   │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └─────┬─────┘  │
│           │                    │                    │                  │         │
│           ▼                    ▼                    ▼                  │         │
│    ┌──────────┐          ┌──────────┐          ┌──────────┐          │         │
│    │ extractDOI│          │loadFromFile│        │loadFromUrl│          │         │
│    └────┬─────┘          └────┬─────┘          └────┬─────┘          │         │
│         │                     │                     │                  │         │
└─────────┼─────────────────────┼─────────────────────┼──────────────────┼─────────┘
          │                     │                     │                  │
          ▼                     ▼                     ▼                  │
    ┌─────────────────────────────────────────────┐   │                  │
    │              Process Papers                  │   │                  │
    │         (fetchBibTeX, fetchAbstract)          │   │                  │
    └─────────────────┬───────────────────────────┘   │                  │
                      │                               │                  │
                      ▼                               │                  │
               ┌──────────────┐                       │                  │
               │  state.papers│◄──────────────────────┘                  │
               │    Data      │                                          │
               └──────┬───────┘                                          │
                      │                                                 │
                      ▼                                                 │
               ┌──────────────┐                                          │
               │  Render      │                                          │
               │  Papers      │                                          │
               └──────┬───────┘                                          │
                      │                                                 │
                      ▼                                                 │
               ┌──────────────┐                                          │
               │  Display     │                                          │
               │  to User     │                                          │
               └──────────────┘                                          │
```

---

## Adding a Paper by DOI (Detailed Flow)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        ADD PAPER BY DOI FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

User Input
    │
    ├── DOI or URL ──► extractDOI() ──► DOI string
    │                             │
    │                             └──► If null: showError("Invalid DOI")
    │
    └── Optional Key ──────────────────────────────► Custom key string

    │
    ▼
fetchBibTeX(doi)
    │
    ├── Success ──► BibTeX string
    │             │
    │             ▼
    │       parseBibTeX(bibTeX)
    │             │
    │             ▼
    │       bibInfo object { title, author, journal, year, ... }
    │
    └── Failure ──► showError("Failed to fetch BibTeX")
                 │
                 ▼
              Return (stop)

    │
    ▼
Generate or Use Custom Key
    │
    ├── If custom key provided ──► Use as-is
    │
    └── If not provided ──► generateDefaultKey(bibInfo)
                            │
                            ├── First author's last name + year
                            ├── Check for duplicates
                            └── Add letter suffix if needed (Smith2024a, Smith2024b, ...)
                            │
                            ▼
                        key string

    │
    ▼
Check for Existing Key
    │
    ├── If exists & custom key ──► confirm("Overwrite existing?") ──► If no: Return
    │
    └── If exists & auto-generated ──► showError("Paper already exists")
                                        │
                                        ▼
                                     Return (stop)

    │
    ▼
fetchAbstract(doi)
    │
    ├── Try: fetchAbstractFromSemanticScholar()
    │
    └── Fallback: fetchAbstractFromCrossref()
        │
        ▼
    abstract string or null

    │
    ▼
Update state
    │
    ├── state.papersData[key] = {
    │       _doi: doi,
    │       title: bibInfo.title,
    │       author: bibInfo.author,
    │       journal: bibInfo.journal,
    │       year: bibInfo.year,
    │       ...
    │   }
    │
    └── state.processedPapersData.push({
            key,
            paper: state.papersData[key],
            bibInfo: { ...bibInfo },
            abstract
        })

    │
    ▼
applyTagFilter()
    │
    └── Re-render papers with new paper included
        │
        ▼
    createPaperCard()
        │
        └── Append to DOM

    │
    ▼
UI Updates
    │
    ├── Show "save", "export", "papers" sections (if first paper)
    ├── Clear DOI inputs
    ├── showStatus("Paper {key} added successfully")
    └── Scroll and highlight new paper card
```

---

## Loading Papers from URL/File/Storage

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                       LOAD PAPERS FLOW                                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

loadPapers(method)
    │
    ├── method='file' ──► loadFromFile(file) ──► JSON.parse() ──► data object
    │
    ├── method='url' ──► loadFromUrl(url) ──► fetch() ──► JSON.parse() ──► data object
    │
    ├── method='storage' ──► loadFromStorage() ──► localStorage.getItem() ──► data object
    │
    └── method='gist' ──► loadFromGistCollection() ──► getGist() ──► JSON.parse() ──► data object
        │
        ▼
    data object { "PaperKey1": {...}, "PaperKey2": {...}, ... }

    │
    ▼
clearCurrentData()
    │
    ├── state.papersData = {}
    ├── state.selectedTags.clear()
    ├── state.processedPapersData = []
    └── papersList.innerHTML = ''

    │
    ▼
processPapers(data)
    │
    ├── state.papersData = data
    │
    └── For each paper in data:
        │
        ├── fetchBibTeX(paper._doi) ──► BibTeX
        │                             │
        │                             └──► parseBibTeX() ──► bibInfo
        │
        ├── fetchPagesFromCrossref(paper._doi) ──► pages (if not in bibInfo)
        │                                         │
        │                                         └──► Update bibInfo.pages
        │
        └── fetchAbstract(paper._doi) ──► abstract
        │
        ▼
    processedPapers array [{ key, paper, bibInfo, abstract }, ...]

    │
    ▼
renderPapers(processedPapers)
    │
    ├── state.processedPapersData = processedPapers
    │
    └── applyTagFilter()
        │
        └── For each paper:
            │
            └── createPaperCard() ──► DOM element
                │
                └── Append to papersList

    │
    ▼
UI Updates
    │
    ├── Hide: loadJsonSection
    ├── Show: saveJsonSection, exportResetSection, papersSection
    └── showStatus("Loaded {count} papers successfully")
```

---

## Tag Filtering Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        TAG FILTERING FLOW                                           │
└─────────────────────────────────────────────────────────────────────────────────────┘

User clicks tag
    │
    ▼
toggleTag(tag)
    │
    ├── If tag in state.selectedTags: Remove it
    │
    └── If tag not in state.selectedTags: Add it
        │
        ▼
    state.selectedTags updated

    │
    ▼
applyTagFilter()
    │
    ├── Clear papersList
    │
    ├── Sort papers:
    │   │
    │   ├── Papers WITH selected tags ──► First (top)
    │   │
    │   └── Papers WITHOUT selected tags ──► Last (bottom, dimmed)
    │
    └── For each paper:
        │
        ├── createPaperCard() ──► DOM element
        │
        ├── If has selected tag: Add normal card
        │
        └── If no selected tags and some tags selected: Add card with .dimmed class
            │
            └── Append to papersList

    │
    ▼
updateTagVisuals()
    │
    ├── For each tag button:
    │   │
    │   ├── If no tags selected: Remove .selected and .deselected, aria-pressed="false"
    │   │
    │   ├── If tag in selectedTags: Add .selected, aria-pressed="true"
    │   │
    │   └── If tag not in selectedTags: Add .deselected, aria-pressed="false"
    │
    └── updateExportButtonStates()
        │
        └── If selectedTags.size > 0: Enable exportBibtexTaggedBtn
        │
        └── Else: Disable exportBibtexTaggedBtn
```

---

## GitHub OAuth Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                       GITHUB OAUTH FLOW                                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

User clicks "Connect"
    │
    ▼
initiateLogin()
    │
    ├── Save current state to sessionStorage (papers loaded, sections visible)
    │
    └── window.location.href = {WORKER_BASE_URL}/login

            │
            ▼
    ┌───────────────────┐
    │   GitHub OAuth    │
    │   ( redirects )   │
    └─────────┬─────────┘
              │
              │ session_id URL parameter
              │ auth=success URL parameter
              ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    Return to App with Callback                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

initGitHubAuth() on page load
    │
    ├── Check URL for session_id parameter
    │
    └── If present:
        │
        ├── setSessionId(session_id) ──► localStorage.setItem('github_session_id', sessionId)
        │
        ├── Clean URL (remove parameters)
        │
        ├── showStatus("Successfully connected to GitHub")
        │
        └── restorePapersState() ──► Restore section visibility from sessionStorage
                                    │
                                    └── Clear sessionStorage

    │
    ▼
loadGitHubAuth()
    │
    └── checkSession()
        │
        └── fetch({WORKER_BASE_URL}/session)
            │
            ├── Headers: Authorization: Bearer {sessionId}
            │
            ▼
        Response: { authenticated: true/false, user: { login, avatar_url } }

        │
        ├── If authenticated:
        │   │
        │   ├── updateGitHubUI(user)
        │   │   │
        │   │   ├── Show: githubLoggedIn, githubLogoutBtn
        │   │   ├── Hide: githubNotLoggedIn, githubConnectBtn
        │   │   ├── Set avatar and name
        │   │   ├── updateGistVisibility() ──► Show gistConnectedContent
        │   │   └── updateSaveGistVisibility() ──► Show saveGistConnectedContent
        │   │
        │   └── loadGistOptionsForLoadSelector()
        │       │
        │       └── listGists() ──► Populate loadGistSelector with user's gists
        │
        └── If not authenticated:
            │
            └── Show: githubNotLoggedIn, githubConnectBtn
                Hide: githubLoggedIn, githubLogoutBtn, gistConnectedContent, saveGistConnectedContent
```

---

## Saving to Gist Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                       SAVE TO GIST FLOW                                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

User selects "To GitHub Gist" save option
    │
    ▼
updateSaveOptionUI('gist')
    │
    ├── getSessionId() ──► Check if authenticated
    │
    ├── If authenticated:
    │   │
    │   ├── Show: saveGistConnectedContent
    │   ├── Hide: saveGistNotConnected
    │   └── loadGistOptionsForSaveSelector()
    │       │
    │       └── listGists() ──► Populate saveGistSelector
    │           │
    │           ├── Add "(new gist)" as first option
    │           └── Add existing gists
    │
    └── If not authenticated:
        │
        └── Show: saveGistNotConnected
            Hide: saveGistConnectedContent

User clicks "Save to Gist"
    │
    ▼
saveToGistCollection()
    │
    ├── Check state.papersData exists and is not empty
    │
    ├── Get gistId from saveGistSelector
    │
    └── Check format (full/light) from jsonFormatSelector
        │
        ├── Full: Include all paper data
        └── Light: Only include _doi, _comments, _tags, _alsoread
        │
        ▼
    JSON.stringify(data) ──► papers.json content

    │
    ├── If gistId === 'new':
    │   │
    │   ├── prompt("Enter gist name:") ──► description
    │   │
    │   └── createGist({ 'papers.json': { content } }, description)
    │       │
    │       └── fetch({WORKER_BASE_URL}/api/github/gists, POST)
    │           │
    │           └── Returns: gist object with id
    │               │
    │               └── loadGistOptionsForSaveSelector() ──► Reload gist list
    │
    └── If gistId is existing gist:
        │
        └── updateGist(gistId, { 'papers.json': { content } }, description)
            │
            └── fetch({WORKER_BASE_URL}/api/github/gists/{gistId}, PATCH)

    │
    ▼
showStatus("Saved to Gist successfully")
```

---

## Export BibTeX Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                       EXPORT BIBTEX FLOW                                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

exportBibTeX() or exportBibTeXTagged()
    │
    ├── exportBibTeX() ──► All papers
    │
    └── exportBibTeXTagged() ──► Only papers with selected tags
        │
        └── Filter state.papersData by state.selectedTags

    │
    ▼
For each paper to export:
    │
    ├── fetchBibTeX(paper._doi) ──► BibTeX string
    │
    ├── parseBibTeX(bibTeX) ──► bibInfo
    │
    ├── fetchPagesFromCrossref(paper._doi) ──► pages (if not in bibInfo)
    │
    ├── If pages fetched: addPagesToBibTeX(bibTeX, pages)
    │
    └── Rate limiting: setTimeout(1000ms)

    │
    ▼
Concatenate all BibTeX entries with \n\n

    │
    ▼
saveFileWithPicker(bibtexContent, 'papers.bib', 'text/x-bibtex')
    │
    ├── Try: window.showSaveFilePicker() ──► Native file picker
    │
    └── Fallback: Create Blob ──► URL.createObjectURL() ──► Trigger download
```

---

## Comment Auto-Save Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                       COMMENT AUTO-SAVE FLOW                                         │
└─────────────────────────────────────────────────────────────────────────────────────┘

User types in comment textarea
    │
    │ (User clicks away / tabs out)
    │
    ▼
textarea.blur event (captured)
    │
    ▼
saveComment(key, newComment)
    │
    ├── Check if state.papersData[key] exists
    │
    ├── Get oldComment = state.papersData[key]._comments
    │
    ├── If oldComment !== newComment:
    │   │
    │   ├── state.papersData[key]._comments = newComment
    │   │
    │   └── Update state.processedPapersData entry for this key
    │
    └── Else: No change, do nothing
```

---

## State Mutation Summary

| Action | State Changes | Side Effects |
|--------|---------------|--------------|
| Add paper by DOI | `state.papersData[key] = {...}`, `state.processedPapersData.push(...)` | Render new card, show sections |
| Load papers | `state.papersData = data`, `state.processedPapersData = [...]` | Render all cards, show sections |
| Clear data | `state.papersData = {}`, `state.selectedTags.clear()`, `state.processedPapersData = []` | Clear DOM, hide sections |
| Toggle tag | `state.selectedTags.add/remove(tag)` | Re-render cards with filtering |
| Edit tags (save) | `state.papersData[key]._tags = [...]` | Re-render card with new tags |
| Edit comment | `state.papersData[key]._comments = string` | No UI update (just state) |
| GitHub login | `localStorage.setItem('github_session_id', sessionId)` | Update auth UI, load gists |
| GitHub logout | `localStorage.removeItem('github_session_id')` | Update auth UI, hide gists |

---

## External Data Sources

| Source | Data Type | Trigger | Destination |
|--------|-----------|---------|-------------|
| DOI.org API | BibTeX string | Add paper, export BibTeX | `state.papersData[key]`, export file |
| Semantic Scholar API | Abstract text | Add paper, load papers | `state.processedPapersData[].abstract` |
| Crossref API | Abstract text, pages | Add paper, load papers, export BibTeX | `state.processedPapersData[].abstract`, `state.papersData[key].pages` |
| File upload | JSON object | Load from file | `state.papersData` |
| URL fetch | JSON object | Load from URL | `state.papersData` |
| localStorage | JSON object | Load from storage | `state.papersData` |
| GitHub Gist API | JSON object (papers.json) | Load/save gist | `state.papersData` / GitHub Gist |