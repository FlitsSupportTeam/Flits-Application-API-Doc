# Rendering Flow

## Entry point

All visible page content flows through:

```javascript
import { renderPage, enhanceProseHeadings } from '../render/pageView.js';

root.innerHTML = renderPage(section);
enhanceProseHeadings(root);
```

Where `section` is `{ type: 'overview'|'folder'|'api', data: {...} }` from `docStore.getSectionBySlug(slug)`.

## Page types

### Overview (`type: 'overview'`)

**Slug:** `overview` (fixed)

**Template:** `renderOverviewPage(overview, doc)`

- Hero: collection name + lead text
- `#overview-content.prose` — `markdownToHtml(collection.info.description)`
- Structured sections:
  - `#environment-variables` — variables table from `doc.variables`
  - `#authentication` — Loyalty vs Wishlist auth cards from `doc.collectionAuth`

**TOC:** Prose headings (h2–h4) + structured sections at bottom.

### Folder (`type: 'folder'`)

**Slug:** from folder path in Postman (e.g. `flits-loyalty-app`)

**Template:** `renderFolderPage(folder)`

- Hero: breadcrumbs eyebrow, folder name, API count badge
- `.page-body.prose` — `markdownToHtml(folder.description)` or placeholder

**TOC:** All markdown headings in prose only (no `data-toc-section` unless added later).

**Note:** Nested folders like `Get Rules` often have **empty** Postman descriptions → empty TOC is expected.

### API (`type: 'api'`)

**Slug:** path-based unique slug (e.g. `flits-loyalty-app-get-rules-get-earn-redeem-rules`)

**Template:** `renderApiPage(api)`

Sections (conditional HTML):

1. Overview — markdown description in `.prose--api-description`
2. Endpoint — method + URL display
3. Authorization — if `api.auth`
4. Headers — table
5. Path parameters — table
6. Query parameters — table
7. Request body — code block
8. Code samples — `renderCodeSamplesSection(api)` from `codeBlocks.js`
9. Responses — `renderResponsesSection(api)` with status tabs

Each structured block:

```html
<section class="page-section" id="..." data-toc-section data-toc-level="2" data-toc-title="...">
  <h2 class="page-section__title">...</h2>
  ...
</section>
```

### Not found

`renderPage(null)` → error article with link back to `#overview`.

## Markdown pipeline

`js/utils/markdown.js` — `markdownToHtml(markdown)`

- Runs `formatVariables` first (`{x}` → `{{x}}`)
- Supports: headings h1–h6 → `.md-h1` … `.md-h6`, tables, fenced code, lists, blockquotes, hr
- Code fences become `<pre class="code-block md-embedded">` placeholders

**Not full CommonMark** — sufficient for Postman descriptions.

## Post-render enhancement

`enhanceProseHeadings(container)`:

1. `assignProseHeadingIds(container)` — TOC deep-link IDs (excludes `.prose--api-description`)
2. Syntax-highlight `.md-embedded code` via `highlightCode()`

Called **after** `innerHTML` assignment so DOM exists.

## Code blocks & samples

`js/render/codeBlocks.js`:

- **Code samples** — language `<select>`, single `<pre><code>`, copy button
- **Responses** — tab per status code; panels use `hidden` attribute
- Interaction via `handleSampleBlockInteraction` (delegated in `router.initPageInteractions`)

Language change re-fetches highlighted code from `docStore.getApiBySlug` (dynamic import).

## Layout shell (not re-rendered on route change)

Set once in `main.js` `mountLayout()`:

```
#navbar-root     → renderNavbar()
#sidebar-root    → renderSidebar()  // full tree from navTree
#toc-root        → renderTocShell() // empty #toc-list until mountToc
#page-scroll > #content-root  // replaced each navigation
```

## Animation

On navigation with `animate: true`:

- Adds `page-view--enter` class for one frame (fade/slide in `page.css`)

## Event rebinding after render

| Feature | Strategy |
|---------|----------|
| Sidebar nav | `document` click on `[data-nav]` |
| TOC | `#toc-list` click + keyboard; rebound in `mountToc` |
| Code copy / tabs | `document` delegation in `initPageInteractions` |
| Search | Persistent listeners on `#global-search` |
| Folder chevrons | `document` delegation in `sidebarCollapse.js` |

**No listeners on destroyed nodes** — TOC list is recreated; old listeners removed via `unbindTocListEvents`.

## TOC mount timing

```
navigateToRoute
  → innerHTML (content)
  → enhanceProseHeadings
  → scrollTop = 0 on #page-scroll
  → mountToc (needs DOM headings + sections)
  → optional scrollToSection(anchor) after 2× rAF
```

Order matters: TOC collector queries live DOM; must run after prose IDs assigned.

## HTML safety

- `escapeHtml` / `esc` in `contentHelpers.js` and `pageView.js`
- Markdown escapes before inline formatting
- User content is from trusted Postman export (still escaped in tables)

## Performance characteristics

- Full HTML string rebuild per navigation (acceptable for ~21 routes)
- No virtual list; long folder pages render all markdown at once
- Search index precomputed at parse time (fast filter)

## Extension points

To add a new API section:

1. Add conditional block in `renderApiPage` with `data-toc-section` + unique `id`
2. Update `getExpectedApiSectionIds` in `tocCollector.js` for audit
3. No TOC collector change if using standard `data-toc-section` pattern
