# Known Issues & Limitations

Documented honestly for the next developer/AI agent. **Verify status** before treating as still open.

## TOC / scroll (recently fixed — regression risk)

| Issue | Status | Notes |
|-------|--------|-------|
| TOC click does nothing | **Fixed** (Jun 2026) | Root: `href="#"` + hashchange remount; window scroll vs `#page-scroll`. Use buttons + `scrollEngine.js`. **Do not revert to anchor links.** |
| Wrong active item on load (last section) | **Fixed** | Was `maxScroll <= 8` false positive; scrollspy now uses top/bottom guards |
| Folder TOC only first h2 | **Fixed** | Now collects h2–h4 |
| Same-route hashchange remounts page | **Fixed** | Router returns early when `slug === currentRoute` |
| `scroll-behavior: smooth` on scroller | **Fixed** (Jun 2026) | CSS smooth scroll fought JS RAF animation; broke instant scroll, drift-correction, scrollspy timing. Removed from `.page-scroll` in `page.css`. |
| `offsetParent` chain escaping scroller | **Fixed** (Jun 2026) | `#page-scroll` was `position: static` so `offsetTop` chain fell back to `getBoundingClientRect`, which is transform-sensitive. Added `position: relative` to `.docs-layout .page-scroll` in `main.css`. |

### Residual TOC edge cases

- **Stale `entry.el` after resize-only updates:** Entries hold element refs from mount time; if DOM were patched without remount, spy could break (current SPA full-replace avoids this).
- **offsetTop vs transformed ancestors:** Rare layout with CSS transforms may force getBoundingClientRect fallback path.
- **Very fast repeated TOC clicks:** May queue overlapping smooth scroll animations (cancelled on new click via `cancelSmoothScroll`).

## Routing & URLs

- **Anchor IDs must not contain `--`** — breaks `parseHash()`.
- **Empty hash** (`#`) parses as `overview` — same-route guard prevents remount but does not scroll.
- **No canonical URL without hash** — always hash-based; SEO limited for SPA.

## Content / parser

- **Nested folders without Postman description** show “No sections” in TOC (expected).
- **Markdown is custom subset** — unusual markdown may render oddly.
- **Postman scripts** (pre-request/test) not shown in UI.
- **Environment values** not resolved — display `{{var}}` templates only.

## Search

- Client-side only; no fuzzy index (simple scoring).
- Large collections may need performance work (not an issue at ~12 APIs).

## Mobile

- TOC requires `body.toc-open` toggle — **no visible TOC toggle button documented in UI** (may need hamburger for TOC — verify product).
- Fixed search box behavior at ≤768px (`search-open` body class) — may need UX polish.

## Accessibility

- No route-change focus management (screen reader may not announce new page).
- No skip-to-content link.
- Color contrast generally OK but not formally audited.

## Security

- `innerHTML` from parsed trusted Postman content — if collection JSON is attacker-controlled, XSS risk exists despite escaping in tables; markdown inline HTML not supported.

## Browser support

- ES modules required.
- `fetch` required.
- Tested primarily Chrome/Edge; Safari flex scroll generally OK with `min-height: 0`.

## Build / ops

- **Must use HTTP server** — `file://` fails collection fetch.
- Duplicate collection JSON at root vs `data/` — only `data/` path used by app.
- `node_modules` only needed for audit script (linkedom), not runtime site.

## Deprecated code paths

- `js/features/tocScrollspy.js` — misleading name; only re-exports. Do not add logic there.
- `scrollToAnchor` — use `scrollToSection`.

## How to verify fixes

```bash
npm run audit:toc
npm run serve
# Manual: Introduction → click Environment variables, Authentication
# Custom Support Ironman FLITS - 08-07-2026 START
# Manual: Flits Loyalty → click Overview, Authentication
# Custom Support Ironman FLITS - 08-07-2026 END
# Manual: any API → Query parameters, Code samples
```

Report new issues in this file with date and reproduction steps.
