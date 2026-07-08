# Routing System

## Model

Hash-based **client-side routing** without a router library.

- **Route** = documentation slug (matches sidebar `data-nav` and API/folder slug)
- **Anchor** = optional section ID within page (TOC target)

## URL patterns

| URL hash | Slug | Anchor |
|----------|------|--------|
| `#overview` | `overview` | none |
| `#flits-loyalty-app` | `flits-loyalty-app` | none |
| `#flits-loyalty-app--authentication` | `flits-loyalty-app` | `authentication` |

Parser (`js/features/router.js`):

```javascript
export function parseHash() {
  const raw = location.hash.slice(1) || 'overview';
  const sep = raw.indexOf('--');
  if (sep > -1) {
    return { slug: raw.slice(0, sep), anchor: raw.slice(sep + 2) };
  }
  return { slug: raw, anchor: null };
}
```

**Note:** Anchor IDs must not contain `--` (slug uses single `--` separator).

## Navigation API

### `navigateToRoute(slug, options)`

| Option | Default | Description |
|--------|---------|-------------|
| `anchor` | `null` | Section ID for TOC scroll after load |
| `updateHash` | `true` | `history.pushState` with hash |
| `animate` | `true` | Page enter animation |

**Flow:** See `RENDERING_FLOW.md` — cleanup TOC → set route → render → mount TOC → scroll.

### Triggers

1. Sidebar / breadcrumb links — `[data-nav="slug"]` click → `preventDefault` → `navigateToRoute(slug)`
2. `initDeepLink()` on boot — reads current hash
3. `hashchange` event — back/forward or external hash edit
4. `FlitsDoc.navigate(slug, anchor)` — programmatic
5. Search result selection — `navigateToRoute(result.slug)`

## Hashchange handler (important)

```javascript
window.addEventListener('hashchange', () => {
  const { slug, anchor } = parseHash();
  if (slug === currentRoute) {
    if (anchor) {
      requestAnimationFrame(() => scrollToSection(anchor, { smooth: false, updateHash: false }));
    }
    return; // same page — do NOT remount
  }
  navigateToRoute(slug, { anchor, updateHash: false });
});
```

**Why:** Remounting the same slug resets `#page-scroll` to 0 and destroys TOC listeners — broke TOC clicks when hash flickered.

## Current route state

`js/state/routeState.js`:

```javascript
export let currentRoute = 'overview';
export function setCurrentRoute(slug) {
  currentRoute = slug || 'overview';
}
```

Re-exported from `router.js` for TOC hash building.

## Slug generation (parse time)

`uniqueSlug(pathJoined, slugRegistry)` in `postmanParser.js`:

- Built from folder/API names along tree path
- Lowercase, hyphenated, deduplicated with numeric suffix
- Examples: `flits-loyalty-app`, `flits-wishlist-app-wishlist-core-add-to-wishlist`

Registry is global per parse — slugs stable for session.

## Section resolution

`docStore.getSectionBySlug(slug)`:

1. `overview` → overview data
2. Else find folder node in `navTree` by slug → folder section data
3. Else find API in `apis` array by slug
4. Else `null` → not found page

Folder **content** comes from `sections` array (`getFolderData`), not only nav tree node.

## Sidebar active state

`setSidebarActive(slug)` in `sidebar.js`:

- Highlights matching `.nav-tree__link` or `.nav-tree__folder-btn`
- `expandToSlug(slug)` opens ancestor folders for deep links

## Breadcrumbs

`updateBreadcrumb(slug)` in `navbar.js` walks API breadcrumbs or folder parents from `navTree`.

## Deep linking

`js/features/deepLink.js`:

- On load: `parseHash()` → `navigateToRoute(slug, { updateHash: false, animate: false })`
- Copy page link button sets `location.origin + pathname + #slug` (no anchor)

## History API

Uses `history.pushState(null, '', hash)` — does **not** fire `hashchange` in modern browsers when pushing from TOC scroll (good).

User back button fires `hashchange` → handled above.

## Scroll on navigation

| Case | Scroll behavior |
|------|-----------------|
| New route, no anchor | `#page-scroll.scrollTop = 0` |
| New route, with anchor | scroll 0, then `scrollToSection(anchor)` after layout |
| Same route, new anchor (hashchange) | `scrollToSection` only |

## Deprecated

- `scrollToAnchor(id, smooth)` — alias to `scrollToSection`

## Integration checklist for new routes

If adding non-Postman pages:

1. Add section to `docStore.getSectionBySlug`
2. Add case in `renderPage`
3. Add nav entry in sidebar render or manual link with `data-nav`
4. Ensure slug unique in search index if searchable
