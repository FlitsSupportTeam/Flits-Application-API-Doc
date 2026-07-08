# Postman Parser

## Source file

- **Path:** `data/Flits App.postman_collection.json`
- **Constant:** `COLLECTION_PATH` in `js/parser/postmanParser.js`
- **Format:** Postman Collection v2.1 (`info.schema`)

Duplicate copy may exist at project root (`Flits App.postman_collection.json`) — **canonical path for app is `data/`**.

## Load sequence

```javascript
export async function loadAndParseCollection(path) {
  const res = await fetch(path);
  const json = await res.json();
  return parsePostmanCollection(json);
}
```

Called from `main.js` on bootstrap. **Requires HTTP server.**

## Output: doc model

```javascript
{
  meta: { name, description, schema, postmanId, parsedAt, apiCount },
  variables: [{ key, value, type, description }],
  collectionAuth: { loyalty, wishlist },
  overview: { type, id, slug, name, description, descriptionPlain },
  navTree: [ /* folder | api nodes */ ],
  sections: [ { type, data }, ... ],  // flat list including overview, folders, apis
  apis: [ /* all API records */ ],
  searchIndex: [ /* built after parse */ ],
}
```

## Tree walk

`walkItems(items, context)` recursive over `collection.item`:

| Postman item | Result |
|--------------|--------|
| Has `request` | `parseRequest` → API node + `apis[]` + `sections[]` |
| Has `item` (folder) | `parseFolder` → folder node + recurse children |

**Context** carries `breadcrumbs`, `path` (slug segments), `depth`, `parentSlug`.

### Folder (`parseFolder`)

- Slug: `uniqueSlug(path.join('-'), registry)`
- `description` / `descriptionPlain` from folder `description` field (markdown)
- `apiCount` computed from child tree
- `children` = child node ids/slugs

### Request (`parseRequest`)

Builds API object:

| Field | Source |
|-------|--------|
| `method` | `request.method` |
| `urlRaw`, `urlDisplay`, `path`, `query`, `baseUrl` | `parseUrl(request.url)` |
| `headers` | `request.header` |
| `pathVariables` | extracted from `{{var}}` in path |
| `bodyRaw`, `bodyMode`, `bodyLanguage` | `parseBody(request.body)` |
| `auth` | `parseAuth(request.auth)` |
| `responses` | `item.response[]` via `parseResponses` |
| `description` | `request.description` or `item.description` |
| `curl` | `generateCurl(api)` |
| `codeSamples` | `buildCodeSamples(api)` — curl, JS, Python, PHP |

Then `applyVariablesToApi(api)` for `{{var}}` syntax.

## URL parsing

Handles string URL or object with `raw`, `host`, `path`, `query`.

Display URL uses `formatVariables` for consistent `{{token}}` style.

## Responses

- Groups example responses by HTTP status code
- Filters curl-only example names from response tabs in UI
- Preserves body text for highlighting (JSON as json)

## Collection auth extraction

`extractCollectionAuth(collection)` — parses collection-level scripts/descriptions for Loyalty (`flits_token`) vs Wishlist (JWT + `merchant_id`) patterns for overview page.

## Variables

From `collection.variable[]` → overview environment table.

`applyVariablesToDoc(doc)` runs on all descriptions and API fields.

## Search index

`buildSearchIndex(docModel)` (in parser file):

- Entries for overview, folders, each API
- Fields: `slug`, `title`, `subtitle`, `method`, `url`, `text` (plain description)
- Consumed by `docStore` search scoring

## Slug registry

`uniqueSlug` prevents collisions across deep paths. Once assigned, slug is stable for links and hashes.

## Code sample generation

`js/utils/codeSamples.js`:

- **cURL** — `generateCurl` in `curl.js`
- **JavaScript** — `fetch` template with headers/body
- **Python** — `requests` template
- **PHP** — cURL template

Samples use `urlDisplay` and active (non-disabled) headers.

## Syntax highlighting

Applied at render time in `enhanceProseHeadings` and code block render — `js/utils/highlighter.js` (regex-based, not Prism.js dependency).

## Updating the collection

1. Export from Postman as Collection v2.1
2. Replace `data/Flits App.postman_collection.json`
3. Reload site (full re-parse)

Optional: change `COLLECTION_PATH` for alternate filename.

## Parser limitations

- Does not execute Postman pre-request/test scripts
- Does not resolve environment at runtime (variables shown as templates)
- Markdown in descriptions is custom subset, not GFM-complete
- Folder `event` scripts stored but not displayed in UI

## Validation

After collection update, run:

```bash
npm run audit:toc
```

And manually spot-check new APIs in sidebar + TOC + code samples.
