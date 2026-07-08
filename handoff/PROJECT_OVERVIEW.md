# Project Overview

## What this project is

**Flits API Documentation** is a static, premium-style API reference site generated from a **Postman Collection v2.1** JSON file. It targets the same UX quality bar as Klaviyo, Stripe, ReadMe, and GitBook documentation: clear navigation, single-page content per route, inline code samples, and a right-rail “On this page” table of contents.

<!-- Custom Support Ironman FLITS - 08-07-2026 START -->
The product documents the **Flits** APIs (Loyalty & Wishlist) for Shopify merchants and integrators.
<!-- Custom Support Ironman FLITS - 08-07-2026 END -->

## Technology stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Markup | HTML5 | No build step; deploy anywhere |
| Styling | CSS (custom properties) | Theme switching, no framework weight |
| Logic | Vanilla JS (ES modules) | Predictable, easy handoff, no React/Vue lock-in |
| Data | Postman JSON via `fetch()` | Single source of truth from API designers |
| Server | Any static host | Must serve over HTTP (not `file://`) |

**No bundler, no TypeScript, no framework.** Files are loaded directly as `type="module"` scripts.

## Primary goals

1. **Accurate** — Reflect Postman folders, requests, examples, and descriptions.
2. **Navigable** — Tree sidebar, search, breadcrumbs, deep links.
3. **Readable** — Typography, spacing, syntax highlighting, response tabs.
4. **Maintainable** — Update collection JSON → refresh site.
5. **AI-ready** — Structured `docStore`, search index, `toAIExport()` for future chatbot/RAG.

## Features implemented (current)

### Data & parsing

- Postman v2.1 collection parse (`js/parser/postmanParser.js`)
- Nested folders and API endpoints
- Collection variables, auth overview, saved responses
- `{var}` → `{{var}}` normalization (`js/utils/variables.js`)
- Search index built at parse time

### Layout & navigation

- Fixed top bar (logo, breadcrumb, search, theme toggle)
- Left nav sidebar with collapsible folders (default collapsed)
- Center column: **one page at a time** (overview, folder, or API)
- Right column: **“On this page”** TOC with hierarchy (h2/h3/h4)
- Hash-based routing (`#slug`, `#slug--section-id`)
- Mobile sidebar drawer + overlay

### API pages

- Method badge, URL, overview (markdown)
- Endpoint, authorization, headers, path/query params, request body
- Code samples: cURL, JavaScript, Python, PHP (language switcher)
- Response examples grouped by status code (tabs)
- Copy buttons for code and responses

### Folder & introduction pages

- Hero + markdown body from Postman folder/collection descriptions
- Full TOC from all markdown headings (h2–h4)
- Overview page adds Environment variables + Authentication sections

### TOC & scroll (recently stabilized)

- Centralized `js/toc/` package
- Scroll **only** `#page-scroll` (internal overflow container)
- Button-based TOC items (no anchor hash side effects)
- Scrollspy on `#page-scroll`
- Deep link anchors: `#flits-loyalty-app--overview`

### Other

- Dark/light theme (`localStorage`)
- Global search (`Ctrl+K` / `⌘K`)
- Scroll progress bar in navbar
- `window.FlitsDoc` global API
- `npm run audit:toc` — automated TOC validation for all pages

## What this is NOT

- Not a live API playground (no try-it server proxy in browser)
- Not a Shopify theme (static site; embed via iframe/CDN if needed)
- Not SSR/SSG (client-side render after JSON load)

## Developer experience goals

- Change Postman export → replace `data/Flits App.postman_collection.json` → reload
- Add APIs in Postman → appear in nav automatically
- Debug TOC with `npm run audit:toc`
- Extend AI via `FlitsDoc.toAIExport()` without touching UI

<!-- Custom Support Ironman FLITS - 08-07-2026 START -->
## Page inventory (Flits collection)
<!-- Custom Support Ironman FLITS - 08-07-2026 END -->

Approximate counts from last audit:

| Type | Count | Notes |
|------|-------|-------|
| Overview | 1 | `overview` slug |
| Top-level folders | 2 | Flits Loyalty, Flits Wishlist | <!-- Custom Support Ironman FLITS - 08-07-2026 START/END -->
| Nested folders | 4 | Often empty descriptions → empty TOC |
| Subfolders with docs | 2 | Wishlist Core, Analytics Events |
| API endpoints | 12 | Full structured TOC sections |
| **Total routes** | **21** | All covered by `scripts/audit-toc.mjs` |

## Related files outside `handoff/`

- `README.md` — Short project readme (update to point to `handoff/` for engineers)
- `README_HUMAN_FIRST.md` — Human quick start at project root
