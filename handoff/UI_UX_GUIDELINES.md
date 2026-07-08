# UI / UX Guidelines

## Design inspiration

Target parity with **Klaviyo**, **Stripe**, **ReadMe**, **GitBook**:

- Calm neutral backgrounds, accent purple (`#635bff`)
- Clear typographic hierarchy
- Fixed chrome + scrolling content column
- Right-rail in-page TOC with active indicator
- Method-colored HTTP badges

## Typography

| Token | Value |
|-------|-------|
| `--font-sans` | Inter (+ system fallbacks) |
| `--font-mono` | JetBrains Mono for code/URLs |
| Body | 15px / 1.6 line height |
| Page title | ~2.25rem bold, tight letter-spacing |
| TOC items | 0.8125rem (0.75rem level-3, 0.6875rem level-4) |

Loaded via Google Fonts in `main.css`.

## Spacing & layout tokens

| Token | Typical use |
|-------|-------------|
| `--space-*` | 4px grid (1–16) |
| `--sidebar-width` | 280px |
| `--topbar-height` | 60px |
| `--content-max` | 720px (main column text width) |
| `--toc-width` | 200px |
| `--docs-gap` | 3rem between columns |

## Color system

- **Accent:** purple for links, active TOC, focus rings
- **Methods:** GET green, POST blue, PUT amber, PATCH violet, DELETE red
- **Surfaces:** `--bg`, `--bg-elevated`, `--bg-subtle`, `--bg-code`
- **Themes:** `[data-theme='light'|'dark']` on `<html>`

Toggle in `js/features/theme.js`, persisted `localStorage` key (see theme.js).

## Layout structure

```
┌──────────────────────────────────────────── topbar (fixed) ────┐
├──────────┬────────────────────────────────────┬───────────────┤
│ sidebar  │  #page-scroll (scrolls)            │  TOC aside    │
│ (fixed   │    #content-root                   │  (sticky)     │
│  width)  │                                    │               │
└──────────┴────────────────────────────────────┴───────────────┘
```

Flex chain uses `min-height: 0` on flex children so `#page-scroll` receives overflow scroll (critical fix documented in CHANGELOG).

## Sidebar behavior

- Folders **collapsed by default** (`sidebarCollapse.js`)
- Chevron toggles `max-height` animation on nested `ul`
- Filter input debounces to `filterSidebar` (hides non-matching nodes)
- Mobile: off-canvas drawer, `body.sidebar-open`, overlay click closes

## TOC behavior

- Sticky within viewport: `toc-aside__sticky` with `top: topbar + spacing`
- Active item: left border accent + subtle background (`toc__link.is-active`)
- Nested levels: extra left padding per h3/h4
- **Buttons** full-width, left-aligned (not underline links)
- Mobile: `body.toc-open` shows fixed TOC panel (CSS in `toc.css`)

## Page content

- Hero: eyebrow breadcrumbs, title, optional endpoint bar (API)
- Sections: `page-section` with `scroll-margin-top` for scroll offset
- Tables: `data-table` in `table-wrap` horizontal scroll
- Code: dark `code-block` on `--bg-code`

## Code samples UX

- Language dropdown in toolbar
- Copy button with brief “Copied” feedback
- Response tabs by status code with colored badges

## Responsive breakpoints

| Breakpoint | Behavior |
|------------|----------|
| ≤1100px | TOC aside hidden unless `toc-open` |
| ≤1024px | Breadcrumb hidden in topbar |
| ≤768px | Sidebar drawer, search box repositioned |

## Motion

- Page enter: ~280ms fade/slide (`page-view--enter`)
- Sidebar folder: max-height transition
- TOC link: color/border transitions
- `prefers-reduced-motion`: global CSS short-circuits animations
- TOC smooth scroll: custom rAF (~320ms) or instant

## Accessibility notes (current)

- `role="main"`, `aria-label` on TOC nav
- TOC uses `<button type="button">` (keyboard Enter/Space handled)
- Search: `aria-expanded` on results
- **Gaps:** see `FUTURE_IMPROVEMENTS.md` (skip links, focus management on route change)

## Do not break

- Scroll container must remain `#page-scroll`
- Sticky topbar height must match `getScrollOffset()` calculation
- 3-column balance: changing `--content-max` affects center only, not sidebar
