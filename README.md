# Flits API Documentation

Premium, dynamic API documentation generated from your Postman collection. Built with **HTML**, **CSS**, and **vanilla JavaScript (ES modules)** — no frameworks.

## Documentation for contributors & AI handoff

- **Humans:** [README_HUMAN_FIRST.md](./README_HUMAN_FIRST.md) — run locally, debug, update collection
- **Engineering / Claude AI:** [handoff/](./handoff/) — full architecture, TOC system, routing, parser, known issues, changelog

## Features

- Dynamic parsing of Postman Collection v2.1
- **3-column layout**: nav sidebar · single-page content · “On this page” TOC (Klaviyo-style)
- **Route-based navigation**: only the selected folder/API/intro is rendered (not one long page)
- Multi-language samples (cURL, JavaScript, Python, PHP) inline per API page
- Postman-style `{{variable}}` syntax everywhere
- Nested folder navigation — **collapsed by default** with smooth animations
- Full API docs: methods, URLs, auth, headers, query/path params, bodies, cURL, responses
- Global search with keyboard shortcuts (`Ctrl+K` / `⌘K`)
- Dark / light mode (saved in `localStorage`)
- Scrollspy, deep links (`#section-slug`), copy buttons
- Mobile-responsive sidebar drawer
- `window.FlitsDoc` global API for future AI chatbot / embeddings

## Project structure

See [handoff/FILE_STRUCTURE.md](./handoff/FILE_STRUCTURE.md) for the complete map. Summary:

```
apiDocCursor/
├── handoff/          ← engineering handoff docs (start here for AI)
├── index.html
├── css/
├── js/               ← parser, render, features, toc/
├── data/             ← Postman collection JSON
└── scripts/          ← audit:toc
```

## Run locally (Windows 10)

**You must use a local HTTP server.** Browsers block `fetch()` for JSON when opening `index.html` via `file://`.

### Option 1 — VS Code Live Server (recommended)

1. Install the **Live Server** extension in VS Code / Cursor.
2. Open the `apiDocCursor` folder.
3. Right-click `index.html` → **Open with Live Server**.
4. Docs open at `http://127.0.0.1:5500` (port may vary).

### Option 2 — Node.js `serve`

```powershell
cd c:\Users\admin\Downloads\apiDocCursor
npx --yes serve .
```

Open the URL shown in the terminal (usually `http://localhost:3000`).

```powershell
npm run audit:toc   # validate TOC for all documentation pages
```

### Option 3 — Python

```powershell
cd c:\Users\admin\Downloads\apiDocCursor
python -m http.server 8080
```

Open `http://localhost:8080`.

## Postman collection

1. Export your collection as **Collection v2.1** from Postman.
2. Place the JSON file at:

   `data/Flits App.postman_collection.json`

3. To use a different filename, edit `COLLECTION_PATH` in `js/parser/postmanParser.js`:

   ```js
   export const COLLECTION_PATH = './data/your-collection.json';
   ```

The parser loads the file via `fetch()` on startup and builds all navigation and content dynamically.

## Shopify integration

This site is static and can be embedded in Shopify:

- Upload the folder to **Shopify Files**, a CDN, or **Webflow Cloud / theme assets**.
- Serve under a path like `/pages/api-docs` or a subdomain.
- Ensure the collection JSON remains reachable at `./data/...` relative to `index.html`.
- For theme integration, use an **iframe** or copy built assets into your theme’s `assets/` folder and load `index.html` via App Proxy or a dedicated page template.

**CORS note:** Flits APIs are intended for server-to-server calls; do not call them directly from the browser on a storefront.

## AI chatbot (future)

After the docs load, use the global object:

```js
// Search
FlitsDoc.search('wishlist', 10);

// All endpoints (flat)
FlitsDoc.getAllApis();

// Export for embeddings / RAG
const payload = FlitsDoc.toAIExport();
```

`docStore` and `searchIndex` are structured for vector search and Q&A features later.

## License

Internal / merchant documentation — adjust as needed for your organization.

---

## Custom Support: Ironman FLITS - 28-06-2026

`js/parser/postmanParser.js` - Added x-api-integration header support with dynamic `{{app_name}}` variable documentation. The header `x-api-integration: x-integration-app-name: {{app_name}}` is injected into every API endpoint at parse time (Loyalty APIs, Wishlist APIs, all documented endpoints). A corresponding description note is appended to every API overview. The `{{app_name}}` value is managed as a global environment variable via the Environment Variables panel (auto-discovered; no manual registration required).

## Custom Support Ironman FLITS - 08-07-2026

Removed the standalone word "App" from user-visible display text (titles, headings, breadcrumbs, page metadata, and Postman collection names/descriptions rendered on the docs site). File paths, API/script code, identifiers, and third-party product names (e.g. "Postman app", Shopify "App Proxy") were left unchanged, as were all files inside `Shopify theme/`, per instructions.

`js/render/devPanel.js` - Fixed two Try It ("live request") bugs found while auditing the full API request-send flow, both of which could make a live call fail or return an unexpected response even when every environment variable was entered correctly:
1. `_send()` always built a multipart `FormData` body for any endpoint with body fields, ignoring the collection's documented `bodyMode`. Endpoints whose body is actually `urlencoded` (Apply Loyalty Points, Apply Store Credit, Update Profile, Get Customer Available Spent Rule) were sent as `multipart/form-data` instead of the required `application/x-www-form-urlencoded`, with the correct Content-Type header deleted. Fixed by reading the new `data-api-body-mode` attribute on the panel (sourced from `api.bodyMode`) and building a `URLSearchParams`-encoded body with the correct `Content-Type` when the mode is `urlencoded`; `formdata` endpoints (e.g. Add/Update Birthdate) and raw-JSON endpoints (e.g. all Wishlist endpoints) are unaffected.
2. The `x-integration-app-name` header (added to every endpoint on 28-06-2026) was sent to the live API as the literal, unresolved text `{{app_name}}` whenever the merchant hadn't set an `app_name` environment variable — silently sending garbage header data on every request. Fixed by skipping any header whose value is still an entirely-unresolved `{{var}}` placeholder at send time; headers that are only partially templated (e.g. `Authorization: Bearer {{jwt_token}}`) are unaffected and still sent as before.

Customized Files:

- index.html
- js/features/router.js
- js/render/navbar.js
- js/render/pageView.js
- js/render/devPanel.js
- data/Flits App.postman_collection.json
- handoff/KNOWN_ISSUES.md
- handoff/CHANGELOG.md
- handoff/PROJECT_OVERVIEW.md
- handoff/AI_CHATBOT_PREPARATION.md

**Update:** the "leave `Shopify theme/` unchanged" restriction above was later superseded by an explicit follow-up instruction to mirror these same customizations into that folder (hand-edited into the bundle's existing code style, since `esbuild` wasn't available in this environment to run `npm run build:shopify`). See `Shopify theme/README.md`'s own "Custom Support Ironman FLITS - 08-07-2026" section for the file list and details of that mirrored change.
