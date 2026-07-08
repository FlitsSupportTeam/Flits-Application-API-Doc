# AI Chatbot Preparation

The site is structured so a **Q&A assistant**, **RAG pipeline**, or **Claude tool** can consume documentation without scraping HTML.

## Design intent

1. **Structured data first** — parse Postman once into JSON-like model
2. **Plain text fields** — `descriptionPlain` for embeddings (markdown stripped)
3. **Stable identifiers** — `slug`, `id`, breadcrumbs for citations
4. **Global API** — `window.FlitsDoc` for runtime access in browser
5. **Export function** — `toAIExport()` for batch/offline pipelines

## docStore model (runtime)

After load, `docStore.doc` contains:

```javascript
{
  meta,           // collection metadata
  variables,      // collection variables
  collectionAuth,
  overview,
  navTree,        // hierarchical nav
  sections,       // typed sections
  apis,           // flat API array — primary for Q&A
  searchIndex,    // search entries
}
```

### API record shape (per endpoint)

Key fields for LLM context:

| Field | Use |
|-------|-----|
| `slug` | Deep link `#slug` |
| `name` | Human title |
| `method` | HTTP verb |
| `urlDisplay` | URL template with `{{vars}}` |
| `description` / `descriptionPlain` | Long-form docs |
| `breadcrumbs` | Context path |
| `headers`, `queryParams`, `pathVariables` | Parameter help |
| `bodyRaw` | Request body example |
| `responses` | Status + body examples |
| `codeSamples` | curl, javascript, python, php |
| `curl` | Quick copy command |

## Search index

Built in `buildSearchIndex()` during parse.

Each entry typically includes:

- `slug`, `title`, `subtitle`, `method`, `url`, `text`

`FlitsDoc.search(query, limit)` scores:

- Exact title match > prefix > contains
- Method match, URL match, body text match

**Suitable for:** instant search UI, keyword fallback for RAG, query routing (“which endpoint does X?”).

## toAIExport()

```javascript
const payload = FlitsDoc.toAIExport();
```

Returns:

```javascript
{
  meta,
  variables,
  auth: collectionAuth,
  endpoints: [ /* flattened */ ],
  searchIndex,
}
```

Each endpoint in export:

```javascript
{
  id, slug, name, method, url,
  description,      // plain text
  breadcrumbs,
  headers, queryParams,
  bodySummary,      // first 500 chars of body
  responseCodes,    // unique status codes
}
```

### Embedding pipeline (recommended)

1. **Chunk strategy:**
   - One chunk per API: title + method + URL + descriptionPlain + param summaries
   - Optional chunks per folder overview markdown
   - Optional chunks per response code body (truncated)

2. **Metadata per chunk:**
   - `slug`, `type: api|folder|overview`, `breadcrumbs`, `method`

3. **Citation URL format:**
   - `https://your-domain/docs#${slug}` or with anchor `#${slug}--${sectionId}`

4. **Refresh:** Re-export when collection JSON updates (`meta.parsedAt`).

## Vector search (future)

Not implemented. Suggested stack:

- Embed `descriptionPlain` + param keys
- Store in Pinecone / pgvector / Supabase
- Hybrid: vector + `FlitsDoc.search` keyword

## In-browser assistant (future)

Architecture sketch:

```
Chat UI (new component)
  → retrieve: FlitsDoc.search + optional vector API
  → prompt: system + top-k chunks + user question
  → answer with markdown + links navigate(slug, anchor)
```

Use existing navigation:

```javascript
FlitsDoc.navigate('flits-loyalty-app-get-balance', 'query-parameters');
FlitsDoc.scrollToSection('query-parameters');
```

## What not to send to models

- Full raw Postman JSON (noisy, large)
- HTML rendered output (harder to parse)
- Duplicate curl example responses marked `isExample`

## Security note for AI features

If chat runs client-side with merchant API keys, **never** exfiltrate secrets from browser. Docs only contain **template** variables (`{{jwt_token}}`).

## Files to read when building AI features

| File | Why |
|------|-----|
| `js/data/docStore.js` | `toAIExport`, search |
| `js/parser/postmanParser.js` | Index building, API shape |
| `js/utils/markdown.js` | `stripMarkdownForSearch` |
| `handoff/POSTMAN_PARSER.md` | Field provenance |

## Testing AI export

```javascript
// Browser console after load
const e = FlitsDoc.toAIExport();
console.log(e.endpoints.length, e.searchIndex.length);
```

<!-- Custom Support Ironman FLITS - 08-07-2026 START -->
Expected: ~12 endpoints for Flits collection, search index covering folders + APIs + overview.
<!-- Custom Support Ironman FLITS - 08-07-2026 END -->
