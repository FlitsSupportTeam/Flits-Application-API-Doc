# Component Structure (JS Modules)

Vanilla ES modules — no components in the React sense. Below maps **files → responsibilities**.

## Entry

| File | Responsibility |
|------|----------------|
| `js/main.js` | Bootstrap, layout shell, feature init |
| `index.html` | Root mount `#app`, loads `main.js` |

## Parser & data

| File | Responsibility |
|------|----------------|
| `js/parser/postmanParser.js` | Fetch + parse collection, build doc model, search index |
| `js/data/docStore.js` | Singleton store, lookups, search, `FlitsDoc` global, `toAIExport` |
| `js/state/routeState.js` | `currentRoute` string |

## Rendering (`js/render/`)

| File | Responsibility |
|------|----------------|
| `pageView.js` | `renderPage`, overview/folder/API templates, `enhanceProseHeadings` |
| `codeBlocks.js` | Code samples + response tabs HTML, tab/lang interactions |
| `sidebar.js` | Nav tree HTML, `setSidebarActive`, `filterSidebar` |
| `navbar.js` | Top bar, breadcrumb, search box shell, scroll progress bar |
| `toc.js` | TOC aside shell (`#toc-list` empty), `setTocActive` |
| `contentHelpers.js` | `escapeHtml`, shared render helpers |

## TOC system (`js/toc/`)

| File | Responsibility |
|------|----------------|
| `index.js` | Public API exports |
| `constants.js` | Thresholds, selectors, page types |
| `tocCollector.js` | `collectTocEntries`, heading IDs, audit helpers |
| `tocRenderer.js` | TOC list HTML (buttons) |
| `tocController.js` | `initToc`, `cleanupToc`, `scrollToSection` |
| `tocEvents.js` | Click/keyboard on `#toc-list` |
| `scrollEngine.js` | `#page-scroll` scroll math + animation |
| `tocScrollspy.js` | Active section on scroll |

## Features (`js/features/`)

| File | Responsibility |
|------|----------------|
| `router.js` | `navigateToRoute`, hash parse, nav clicks, page interactions |
| `tocManager.js` | Re-export shim → `js/toc/index.js` |
| `tocScrollspy.js` | Deprecated re-export alias |
| `search.js` | Global search UI, keyboard nav, debounced query |
| `theme.js` | Light/dark toggle, `localStorage`, `data-theme` on `<html>` |
| `deepLink.js` | Initial hash navigation, copy link button |
| `scrollspy.js` | **Navbar** scroll progress bar only (not TOC) |
| `sidebarCollapse.js` | Folder chevron expand/collapse animations |

## Utilities (`js/utils/`)

| File | Responsibility |
|------|----------------|
| `markdown.js` | Markdown → HTML, `stripMarkdownForSearch` |
| `variables.js` | `{var}` → `{{var}}`, apply to doc/API |
| `slug.js` | `slugify`, `uniqueSlug` |
| `curl.js` | Generate cURL command string |
| `codeSamples.js` | JS/Python/PHP sample generators |
| `highlighter.js` | Lightweight syntax highlighting |
| `clipboard.js` | Copy + button feedback |
| `debounce.js` | Search input debounce |

## Styles (`css/`)

| File | Responsibility |
|------|----------------|
| `variables.css` | Design tokens, themes |
| `main.css` | App layout, sidebar, navbar, tables, code |
| `page.css` | Page view, hero, sections, samples |
| `toc.css` | Right rail TOC |

## Scripts (`scripts/`)

| File | Responsibility |
|------|----------------|
| `audit-toc.mjs` | Full-platform TOC validation (Node) |
| `test-toc-scroll.mjs` | Optional Playwright scroll test |

## Dependency graph (simplified)

```
main.js
 ├── postmanParser → docStore
 ├── render/* (navbar, sidebar, toc shell)
 └── features/*
      ├── router → pageView, tocManager, sidebar, navbar
      ├── search → router
      ├── theme, deepLink, scrollspy, sidebarCollapse
      └── tocManager → toc/*
```

## Conventions

- **Imports:** always `.js` extension in paths
- **Exports:** named exports preferred
- **Dynamic import:** used sparingly (`clipboard`, `docStore` in codeBlocks) to avoid cycles
- **HTML:** template strings, not JSX
- **IDs:** kebab-case slugs from Postman names

## Adding a new feature module

1. Place in `js/features/` if user-facing behavior
2. Place in `js/utils/` if pure helper
3. Init from `main.js` after layout mount
4. Use event delegation if DOM is replaced on navigation
5. Document in this file + `ARCHITECTURE.md`
