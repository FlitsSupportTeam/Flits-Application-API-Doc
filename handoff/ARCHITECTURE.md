# Architecture

## High-level diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│ index.html → js/main.js (bootstrap)                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ fetch(COLLECTION_PATH) → postmanParser.parsePostmanCollection()         │
│ → docStore.setDoc(docModel) → window.FlitsDoc                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
   render/navbar.js          render/sidebar.js          render/toc.js (shell)
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ features/router.js — navigateToRoute(slug)                              │
│   → render/pageView.js (HTML string)                                    │
│   → enhanceProseHeadings()                                              │
│   → toc/initToc() (TOC list + scrollspy + events)                       │
└─────────────────────────────────────────────────────────────────────────┘
```

## Architectural principles

### 1. Parse once, render many times

The Postman JSON is fetched and parsed **once** at startup. The result is an in-memory **doc model** stored in `docStore`. Navigation does not re-fetch or re-parse; it only re-renders HTML for the selected section.

### 2. SPA-like, not multi-page

There is a single `index.html`. Route changes replace `#content-root` innerHTML and rebuild the TOC. The URL hash drives which section is shown (`#api-slug` or `#api-slug--anchor`).

**Why:** Matches Stripe/Klaviyo docs UX; avoids loading 20+ HTML files; keeps shared chrome (nav, TOC shell) stable.

### 3. String-based rendering (no virtual DOM)

`renderPage(section)` returns HTML strings assigned via `root.innerHTML = ...`. There is no component framework.

**Implications:**

- Event listeners must be **rebound** after each navigation (or use delegation).
- TOC stores **live element references** in entries only until next `mountToc`; scrollspy re-inits each navigation.
- XSS risk is mitigated by `escapeHtml` in render helpers.

### 4. Separation: data / render / features / toc

| Layer | Responsibility |
|-------|----------------|
| `parser/` | JSON → doc model |
| `data/docStore.js` | Singleton state, lookup, search, AI export |
| `render/` | HTML generation (no routing logic) |
| `features/` | Router, search, theme, sidebar collapse, deep link |
| `toc/` | On This Page: collect, render, scroll, scrollspy |
| `utils/` | Markdown, curl, highlighter, slug, variables |
| `state/routeState.js` | Current route slug string |

### 5. Scroll container isolation

The layout intentionally scrolls **`#page-scroll`**, not the document body:

- `body` / `.app-body` use `overflow: hidden` and fixed viewport height.
- Center column content grows inside `#page-scroll` with `overflow-y: auto`.

**All TOC scroll math must use this element.** See `TOC_SYSTEM.md`.

## DOM lifecycle on navigation

```
navigateToRoute(slug)
  ├── cleanupToc()           // destroy scrollspy, unbind TOC list clicks
  ├── setCurrentRoute(slug)
  ├── history.pushState(hash) // optional
  ├── content-root.innerHTML = renderPage(section)
  ├── enhanceProseHeadings() // IDs on prose h2-h4, highlight code blocks
  ├── setSidebarActive, updateBreadcrumb
  ├── page-scroll.scrollTop = 0
  └── mountToc(root)         // prepare headings, collect entries, render list,
                             // bind buttons, init scrollspy
```

## State management

### docStore (`js/data/docStore.js`)

- `_state.doc` — full parsed model after load
- `getSectionBySlug(slug)` — returns `{ type, data }` for overview | folder | api
- `subscribe()` — listener pattern (lightly used)
- `toAIExport()` — flat endpoint list for embeddings

### routeState (`js/state/routeState.js`)

- `currentRoute` — string slug (e.g. `flits-loyalty-app-get-rules`)
- Updated in `navigateToRoute` before render
- Used by TOC scroll engine for hash format `#${currentRoute}--${sectionId}`

### No Redux, no global event bus

Features communicate via:

- Direct imports (`navigateToRoute`, `docStore`)
- DOM events (click delegation on `document`)
- `window.FlitsDoc` for external/debug use

## Global API (`window.FlitsDoc`)

Exposed after successful parse in `docStore.setDoc()`:

```javascript
FlitsDoc.version          // '2.0.0'
FlitsDoc.store            // docStore
FlitsDoc.search(query, limit)
FlitsDoc.getAllApis()
FlitsDoc.toAIExport()
FlitsDoc.navigate(slug, anchor)
FlitsDoc.scrollToSection(sectionId, options)
```

## CSS architecture

- `css/variables.css` — design tokens, light/dark themes via `[data-theme]`
- `css/main.css` — layout, sidebar, navbar, tables, code blocks
- `css/page.css` — page view, hero, sections, samples
- `css/toc.css` — right rail TOC

Imported from `main.css` via `@import`.

## Boot sequence (`js/main.js`)

1. Show loading spinner
2. `loadAndParseCollection(COLLECTION_PATH)`
3. `docStore.setDoc(doc)`
4. `mountLayout()` — inject app shell (navbar, sidebar, page-scroll, toc-root)
5. `initTheme`, `initSearch`, `initSidebarCollapse`, `initRouter`, `initPageInteractions`, `initDeepLink`, `initScrollspy`
6. `initDeepLink` reads hash and calls `navigateToRoute` (initial page)

## Deleted / deprecated paths

These were removed in earlier refactors; do not reintroduce without reason:

- `js/render/content.js` — old long-scroll content
- `js/render/rightPanel.js` — code was moved to center column
- `css/panel.css`
- `js/toc/tocScroll.js` — replaced by `js/toc/scrollEngine.js`

`js/features/tocManager.js` remains as a **re-export shim** to `js/toc/index.js`.

## Testing & audit tooling

| Script | Purpose |
|--------|---------|
| `scripts/audit-toc.mjs` | Node + linkedom: render every section, validate TOC IDs |
| `scripts/test-toc-scroll.mjs` | Playwright browser test (optional, needs playwright dep) |

## Deployment model

Static files only. Requirements:

- HTTP server (CORS N/A for same-origin fetch of JSON)
- Collection JSON at `./data/Flits App.postman_collection.json` relative to site root
- ES module support in target browsers
