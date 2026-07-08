# TOC System (“On This Page”)

This is the most fragile and most refactored part of the project. Read carefully before changing behavior.

## Module layout (`js/toc/`)

| File | Role |
|------|------|
| **`rightTOC.js`** | **Authoritative** — collect entries, render anchors, scrollspy, `scrollToSection` |
| `index.js` | Re-exports from `rightTOC.js` |
| `tocCollector.js` | Shared collection helpers (audit script) |
| `tocRenderer.js` | Legacy HTML helper (anchors; superseded by `rightTOC._renderList`) |
| `tocEvents.js`, `scrollEngine.js`, `tocController.js` | Legacy — router uses `rightTOC` only |

Legacy shim: `js/features/tocManager.js` re-exports from `js/toc/index.js`.

## Scroll container (CRITICAL)

### Which element scrolls?

```html
<div class="page-scroll" id="page-scroll">   <!-- THIS SCROLLS -->
  <main id="content-root" class="page-viewport">...</main>
</div>
```

CSS (`css/main.css`):

- `.app-body` → `overflow: hidden`, `height: calc(100vh - topbar)`
- `.docs-layout .page-scroll` → `position: relative`, `overflow-y: auto`, `flex: 1`, `min-height: 0`

The **window does not scroll** the main content. `window.scrollTo()` has no visible effect on the doc body.

### Why `position: relative` on `#page-scroll` is required

`scrollEngine.js::getTargetScrollTop` walks the `offsetParent` chain to compute how far a section is from the top of the scroll container. If `#page-scroll` has `position: static` (the browser default), `offsetParent` skips it and the chain reaches `<body>`, triggering the `getBoundingClientRect` fallback. That fallback is correct but sensitive to active CSS transforms — specifically the `pageIn` `translateY` animation on `.page-view` shifts `getBoundingClientRect()` values by ~10px during the first 280ms. With `position: relative`, `#page-scroll` becomes the `offsetParent` for all content inside it, so the chain terminates there in one step using layout-stable `offsetTop` values, immune to descendant transforms.

**Do not remove `position: relative` from `.docs-layout .page-scroll`.**

### Smooth scroll + offset

- `#page-scroll` uses `scroll-behavior: smooth` (disabled under `prefers-reduced-motion`).
- Section targets use `scroll-margin-top: calc(var(--topbar-height) + var(--space-6))` in `page.css`.
- `scrollToSection()` uses `element.scrollIntoView()` (respects `scroll-margin-top`).

## TOC entry collection

### Page type: API (`data-page-type="api"`)

Collect **only** elements matching `[data-toc-section]` inside `.page-view`.

Structured sections in `pageView.js` / `codeBlocks.js`:

| ID | Title | When present |
|----|-------|--------------|
| `overview` | Overview | If `api.description` |
| `endpoint` | Endpoint | Always |
| `authorization` | Authorization | If `api.auth` |
| `headers` | Headers | If headers array |
| `path-parameters` | Path parameters | If path variables |
| `query-parameters` | Query parameters | If query params |
| `request-body` | Request body | If body raw |
| `code-samples` | Code samples | Always (from codeBlocks) |
| `responses` | Response examples | If non-example responses |

**Excluded:** Markdown headings inside `.prose--api-description` (API overview prose) to avoid duplicate TOC lines.

### Page type: folder / overview

Collect in **document order**:

1. Prose headings from `.page-body.prose` / `#overview-content` — **only through one level below the shallowest heading** (typically `h2` + `h3`; `h4+` stays in-page, not in TOC)
2. Structured `[data-toc-section]` blocks (e.g. Authentication on overview)

**Dedup:** If a prose heading title matches a structured section title (normalized lowercase), prose entry is skipped.

### Heading IDs

`preparePageHeadings()` / `assignProseHeadingIds()`:

- Reserves IDs already on `[data-toc-section]`
- Assigns `uniqueSlug(text, seenIds)` to prose headings without IDs

Postman folder docs often use `###` (h3) heavily — **must** include h3/h4 in selector (fixed in earlier refactor).

## TOC rendering

`rightTOC.js` outputs inside `#toc-nav` / `#toc-list`:

```html
<a class="toc__link" href="#section-id">Title</a>
```

Levels: `toc__item--level-2|3|4` for indentation in `toc.css`.

## Click → scroll flow

```
User clicks <a href="#section-id">
  → Browser scrolls target in #page-scroll (scroll-margin-top)
  → location.hash becomes #section-id
  → hashchange: parseHash() treats fragment as in-page anchor (not route slug)
  → scrollToSection + pushState #route--section-id for shareable URLs
  → setTocActive(sectionId) via scrollspy on scroll
```

### scrollEngine algorithm

1. `getPageScroller()` → `#page-scroll`
2. `getTargetScrollTop(target, scroller, offset)` via `offsetTop` chain; falls back to `getBoundingClientRect` if offsetParent escapes scroller
3. Smooth: custom `requestAnimationFrame` ease (~320ms)
4. Hard fallback: `scroller.scrollTop = top` if drift > 8px
5. Respects `prefers-reduced-motion: reduce`

## Scrollspy (active section)

`tocScrollspy.js` listens on **`#page-scroll` scroll** (not window).

Logic (`resolveActiveSectionId`):

| Condition | Active entry |
|-----------|--------------|
| `scrollTop <= 8` | First TOC item |
| Near bottom (`maxScroll > 48` and within 20px of end) | Last item |
| Otherwise | Last item whose top crossed `offset + 16px` reading line |

`suppressScrollspy(ms)` after programmatic scroll prevents flicker (~1000ms smooth, ~200ms instant).

On mount: double `requestAnimationFrame` sync; if at top, keep `initialActiveId` (first item or hash anchor).

## Router integration

`router.js` calls:

- `cleanupToc()` before replacing content
- `mountToc(root, { initialActiveId: anchor })` after render
- `scrollToSection(anchor)` after double rAF if hash anchor present

### Hash format

```
#overview
#flits-loyalty-app
#flits-loyalty-app--authentication
```

Parsed by `parseHash()`:

1. Split on first `--` → `{ slug, anchor }`
2. If no `--`, check whether fragment id exists inside current `.page-view` → in-page anchor on `currentRoute`
3. Else if fragment is a known route slug → navigate to that page

### Hashchange guard (CRITICAL)

```javascript
if (slug === currentRoute) {
  if (anchor) scrollToSection(anchor, ...);
  return; // DO NOT navigateToRoute — would remount and reset scroll
}
```

Without this, incidental hash changes (e.g. from old anchor links) **wiped scroll position**.

## Historical bugs (do not reintroduce)

1. **`<button data-toc-link>` + `preventDefault` + custom RAF scroll** — fragile; replaced with `<a href="#id">` + `scrollIntoView` (Jun 2026).
2. **`href="#section"` without `parseHash` in-page detection** — `#overview` on an API page navigated to intro route instead of scrolling (fixed: `_isInPageFragment` in `router.js`).
3. **`href="#"` or remount on hashchange** → scroll reset to 0 → “click does nothing”.
4. **Only collecting `.md-h2`** on folder pages → single TOC item when docs use `###`.
5. **`window.scrollTo`** on a layout where window doesn't scroll.
6. **`scrollTop >= maxScroll - 8` when maxScroll === 0** → last item active on load.

## Audit tool

`npm run audit:toc` → `scripts/audit-toc.mjs`

- Renders all 21 sections in Node (linkedom)
- Validates API section IDs, duplicate IDs, folder heading counts

## Debugging checklist

1. Confirm `#page-scroll` exists and `scrollHeight > clientHeight`
2. Confirm target exists: `document.getElementById(id)` inside `.page-view`
3. Confirm TOC uses `<a href="#id">` and target `id` matches
4. Confirm `scroller.scrollTop` changes after click
5. Check console for `[FlitsDoc TOC] Section not found` warnings
6. Verify URL doesn't remount page (same slug in hashchange handler)

## Edge cases

| Case | Behavior |
|------|----------|
| Nested folder with no description | TOC shows “No sections” |
| Very long folder page | Many h3/h4 items; TOC aside scrolls independently |
| API without responses | No “Response examples” in TOC |
| Duplicate heading text in markdown | `uniqueSlug` adds `-2`, `-3` suffix |
| Mobile (`toc-open` body class) | TOC fixed overlay; same button handlers |
