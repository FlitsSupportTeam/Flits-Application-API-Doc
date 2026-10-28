# Changelog

Major engineering milestones for handoff context. Not every commit — focus on architectural changes.

## Initial platform

- Postman Collection v2.1 parser and `docStore`
- Static site: HTML + CSS + ES modules (no framework)
- Left sidebar navigation from collection tree
- Markdown descriptions rendered to HTML
- Global search with keyboard shortcut
- Dark / light theme
- `window.FlitsDoc` global API + `toAIExport()`

## Layout: 3-column docs (Klaviyo-style)

- Center column: single active page (overview / folder / API)
- Right column: “On this page” TOC shell
- Removed separate right “code panel”; code samples moved **inline** in center column
- Flex layout with `min-height: 0` so `#page-scroll` is the scroll container (not window)

## Route-based SPA navigation

- Hash routes: `#slug` and `#slug--anchor`
- `navigateToRoute` replaces `#content-root` innerHTML per page
- Sidebar active state + breadcrumb updates
- Deep link on load via `initDeepLink`

## Postman variable normalization

- `{variable}` → `{{variable}}` across URLs, descriptions, headers, bodies
- `js/utils/variables.js` with safe regex (not JSON braces)

## API page content

- Structured sections: Overview, Endpoint, Auth, Headers, Params, Body
- Multi-language code samples: cURL, JavaScript, Python, PHP
- Response example tabs by HTTP status
- Copy buttons for code and responses
- Syntax highlighting (custom regex highlighter)

## Sidebar UX

- Folders collapsed by default
- Animated expand/collapse (`sidebarCollapse.js`)
- Filter endpoints input

## TOC generation — iteration 1

- API pages: `[data-toc-section]` blocks only
- Folder pages: initially **h2 only** (`.md-h2`) — later fixed

## TOC / scrollspy bugs — iteration 2 (fixed)

**Symptoms:** Last TOC item active on load; clicks did nothing.

**Causes:**

- `scrollTop >= maxScroll - 8` when `maxScroll === 0`
- `href="#"` → `hashchange` → full page remount → scroll reset
- `window.scrollTo` instead of `#page-scroll`
- IntersectionObserver unstable active state

**Fixes:**

- Scroll-position spy with top/bottom guards
- Router same-route hashchange guard

## TOC folder pages — iteration 3 (fixed)

<!-- Custom Support Ironman FLITS - 08-07-2026 START -->
**Symptom:** Only first section in TOC on folder docs (e.g. Flits Loyalty).
<!-- Custom Support Ironman FLITS - 08-07-2026 END -->

**Cause:** Postman descriptions use `###` (h3); collector only queried `.md-h2`.

**Fix:** Collect h2, h3, h4; nested TOC levels in CSS; dedupe prose vs structured section titles.

## TOC architecture refactor — iteration 4 (current)

**Package:** `js/toc/`

| Module | Purpose |
|--------|---------|
| `scrollEngine.js` | Mandatory `#page-scroll` scroll + rAF smooth |
| `tocCollector.js` | Page-type-aware entry collection |
| `tocEvents.js` | Button clicks (no anchors) |
| `tocController.js` | mount/cleanup/scroll orchestration |
| `tocScrollspy.js` | Spy on `#page-scroll` only |

- TOC items changed from `<a href="#">` to `<button type="button">`
- `cleanupToc()` on every navigation
- `npm run audit:toc` — 21 pages validated in Node

## Tooling

- `package.json` with `serve` and `audit:toc`
- `scripts/audit-toc.mjs` using linkedom
- `.gitignore` for node_modules

## Documentation

- `handoff/` engineering package (this changelog’s companion)
- `README_FIRST.md` for humans

---

When you make significant changes, append a dated section here with:

- What changed
- Why
- Files touched
- How to verify
