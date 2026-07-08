# Shopify theme — Flits API Documentation (home page demo)

This folder is a **ready-to-upload package** for your Shopify theme.  
It shows **exactly which files go where** so the **store homepage** renders the full API docs (same as local `npx serve .`).

---

## Why assets are flat (no `flits-api-docs/` folder)

Shopify **does not allow subfolders** inside `assets/`.  
You upload **3 built files** at the root of `assets/`, not `assets/flits-api-docs/css/...`.

Run the build once on your PC (see Step 1 below).

---

## Demonstration — folder map

### On your computer (this repo)

```
apiDocCursor/
└── Shopify theme/                    ← COPY FROM HERE
    ├── README.md                     (this file)
    ├── layout/
    │   └── theme.flits-api-docs.liquid
    ├── sections/
    │   └── flits-api-docs.liquid
    ├── templates/
    │   ├── index.json                ← HOME PAGE = full docs
    │   └── page.flits-api-docs.json  ← optional extra page
    └── assets/                       ← run build first (Step 1)
        ├── flits-api-docs.js
        ├── flits-api-docs.css
        └── flits-api-docs.postman_collection.json
```

### On Shopify (duplicate theme → Edit code)

```
your-theme/
├── layout/
│   └── theme.flits-api-docs.liquid     ← upload from Shopify theme/layout/
├── sections/
│   └── flits-api-docs.liquid           ← upload from Shopify theme/sections/
├── templates/
│   ├── index.json                      ← upload from Shopify theme/templates/
│   │                                   ⚠ replaces existing homepage template
│   └── page.flits-api-docs.json        ← optional
└── assets/                             ← NO subfolders
    ├── flits-api-docs.js               ← upload from Shopify theme/assets/
    ├── flits-api-docs.css
    └── flits-api-docs.postman_collection.json
```

---

## Step 1 — Build assets (on your PC)

From project root:

```powershell
cd c:\Users\admin\Downloads\apiDocCursor
npm install -D esbuild
node scripts/build-shopify-theme.mjs
```

You should see:

```
Shopify theme/assets/flits-api-docs.js
Shopify theme/assets/flits-api-docs.css
Shopify theme/assets/flits-api-docs.postman_collection.json
```

---

## Step 2 — Upload to Shopify (duplicate theme first)

1. **Online Store → Themes → … → Duplicate** your live theme.
2. **Edit code** on the duplicate.

### A) Layout (1 file)

| Local | Shopify |
|-------|---------|
| `Shopify theme/layout/theme.flits-api-docs.liquid` | `layout/theme.flits-api-docs.liquid` |

### B) Section (1 file)

| Local | Shopify |
|-------|---------|
| `Shopify theme/sections/flits-api-docs.liquid` | `sections/flits-api-docs.liquid` |

### C) Templates (homepage)

| Local | Shopify |
|-------|---------|
| `Shopify theme/templates/index.json` | `templates/index.json` |

**Backup** your current `templates/index.json` before replacing (rename to `index.json.backup`).

`index.json` sets the **home page** (`/`) to use layout `theme.flits-api-docs` and section `flits-api-docs`.

Optional second page:

| `Shopify theme/templates/page.flits-api-docs.json` | `templates/page.flits-api-docs.json` |

Then create **Pages → API docs** and assign template `flits-api-docs` for `/pages/...` URL.

### D) Assets (3 files only — flat, no folders)

Upload into **Assets** (root level):

| Local file | Shopify Assets name |
|------------|---------------------|
| `Shopify theme/assets/flits-api-docs.js` | `flits-api-docs.js` |
| `Shopify theme/assets/flits-api-docs.css` | `flits-api-docs.css` |
| `Shopify theme/assets/flits-api-docs.postman_collection.json` | `flits-api-docs.postman_collection.json` |

Do **not** create a folder named `flits-api-docs` in Assets.

---

## Step 3 — Preview homepage

1. **Customize** the duplicate theme.
2. Open **Home page** preview, or visit `https://your-store.myshopify.com/?preview_theme_id=...`
3. You should see the full docs UI (sidebar, search, content).

---

## Step 4 — Publish

When satisfied, **Publish** the duplicate theme.

---

## Updating docs later

1. Edit `data/Flits App.postman_collection.json` in the main project.
2. Run `node scripts/build-shopify-theme.mjs` again.
3. Re-upload the 3 files in **Assets** (at least the `.json`, and `.js`/`.css` if JS/CSS changed).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| “Unable to load documentation” | Check Network tab: `flits-api-docs.postman_collection.json` must return 200. |
| Blank page | Confirm `flits-api-docs.js` uploaded and no JS errors in console. |
| Old theme header still visible | Layout hides common header selectors; your theme may need an extra CSS rule in the layout `<style>` block. |
| Folder error in Assets | Never create subfolders; only upload the 3 flat files. |

---

## What each file does

| File | Role |
|------|------|
| `theme.flits-api-docs.liquid` | Full HTML shell, loads CSS/JS, sets collection URL, hides theme header/footer |
| `flits-api-docs.liquid` | Provides `<div id="app">` (same as `index.html`) |
| `index.json` | Makes **homepage** use the docs layout |
| `flits-api-docs.js` | Bundled app (all `js/` modules) |
| `flits-api-docs.css` | Bundled styles |
| `flits-api-docs.postman_collection.json` | Postman source data |

---

## Custom Support: Ironman FLITS - 28-06-2026

`assets/flits-api-docs.js` - Added x-api-integration header support with dynamic `{{app_name}}` variable documentation. The header `x-api-integration: x-integration-app-name: {{app_name}}` is injected into every API endpoint at parse time inside the bundled JS (Loyalty APIs, Wishlist APIs, all documented endpoints). A corresponding description note is appended to every API overview. The `{{app_name}}` value is managed as a global environment variable via the Environment Variables panel (auto-discovered; no manual registration required).

## Custom Support Ironman FLITS - 08-07-2026

Mirrored the same customization made in the main project into this theme package (esbuild wasn't available in this environment to run `node scripts/build-shopify-theme.mjs`, so the bundled files were hand-edited to match, in the bundle's own existing code style):

1. Removed the standalone word "App" from user-visible display text — page title/meta description (`layout/theme.flits-api-docs.liquid`), the browser-tab title and breadcrumb label, and the Authentication section's "Loyalty"/"Wishlist" card headings (`assets/flits-api-docs.js`) — and refreshed `assets/flits-api-docs.postman_collection.json` to match the updated `data/Flits App.postman_collection.json` (collection/folder names and descriptions). File paths, script/API code, and identifiers were left unchanged, matching the main project.
2. Fixed the same two Try It ("live request") bugs found while auditing the API request-send flow in `assets/flits-api-docs.js`: (a) the body-send logic ignored the collection's `bodyMode` and always sent `multipart/form-data`, breaking urlencoded endpoints (Apply Loyalty Points, Apply Store Credit, Update Profile, Get Customer Available Spent Rule) even with correct input — now branches on a new `data-api-body-mode` panel attribute to send proper `application/x-www-form-urlencoded` when required; (b) the `x-integration-app-name` header was sent as the literal unresolved text `{{app_name}}` when `app_name` wasn't configured — now skipped when still unresolved at send time.

Customized files in this folder:

- `layout/theme.flits-api-docs.liquid`
- `assets/flits-api-docs.js`
- `assets/flits-api-docs.postman_collection.json`
