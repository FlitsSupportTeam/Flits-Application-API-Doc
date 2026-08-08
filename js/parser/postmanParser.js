/**
 * Postman Collection v2.1 parser — transforms raw JSON into structured documentation data.
 */
import { uniqueSlug } from '../utils/slug.js';
import { stripMarkdownForSearch } from '../utils/markdown.js';
import { generateCurl } from '../utils/curl.js';
import { formatVariables, applyVariablesToApi, applyVariablesToDoc } from '../utils/variables.js';
import { buildCodeSamples } from '../utils/codeSamples.js';

const COLLECTION_PATH = './data/Flits App.postman_collection.json';

export { COLLECTION_PATH };

/** Local path or Shopify `asset_url` injected via `window.FLITS_DOC_CONFIG`. */
export function getCollectionPath() {
  const configured = globalThis.FLITS_DOC_CONFIG?.collectionUrl;
  return typeof configured === 'string' && configured.length > 0
    ? configured
    : COLLECTION_PATH;
}

export function parsePostmanCollection(collection) {
  if (!collection || !collection.info) {
    throw new Error('Invalid Postman collection: missing info block');
  }

  const slugRegistry = new Set();
  const apis = [];
  const sections = [];
  const navTree = [];

  const variables = (collection.variable || []).map((v) => ({
    key: v.key,
    value: v.value ?? '',
    type: v.type || 'string',
    description: v.description || '',
  }));

  const collectionAuth = extractCollectionAuth(collection);

  function walkItems(items, context) {
    const nodes = [];
    for (const item of items || []) {
      if (item.request) {
        const api = parseRequest(item, context, slugRegistry);
        apis.push(api);
        sections.push({ type: 'api', data: api });
        nodes.push({
          type: 'api',
          id: api.id,
          name: api.name,
          method: api.method,
          slug: api.slug,
          children: [],
        });
      } else if (item.item) {
        const folder = parseFolder(item, context, slugRegistry);
        sections.push({ type: 'folder', data: folder });
        const childContext = {
          breadcrumbs: [...context.breadcrumbs, folder.name],
          path: [...context.path, folder.slug],
          parentSlug: folder.slug,
        };
        const children = walkItems(item.item, childContext);
        folder.children = children.map((n) => n.id || n.slug);
        folder.apiCount = countApisInTree(children);
        navTree.push(...(context.depth === 0 ? [] : []));
        nodes.push({
          type: 'folder',
          id: folder.id,
          name: folder.name,
          slug: folder.slug,
          description: folder.descriptionPlain,
          apiCount: folder.apiCount,
          children,
        });
      }
    }
    return nodes;
  }

  const rootContext = {
    breadcrumbs: [],
    path: [],
    depth: 0,
    parentSlug: null,
  };

  const tree = walkItems(collection.item, rootContext);

  const overview = {
    type: 'overview',
    id: 'overview',
    slug: 'overview',
    name: collection.info.name || 'API Documentation',
    description: formatVariables(collection.info.description || ''),
    descriptionPlain: stripMarkdownForSearch(formatVariables(collection.info.description || '')),
  };

  sections.unshift({ type: 'overview', data: overview });

  const docModel = {
    meta: {
      name: collection.info.name,
      description: collection.info.description || '',
      schema: collection.info.schema,
      postmanId: collection.info._postman_id,
      parsedAt: new Date().toISOString(),
      apiCount: apis.length,
    },
    variables,
    collectionAuth,
    overview,
    navTree: tree,
    sections,
    apis,
  };

  applyVariablesToDoc(docModel);
  docModel.searchIndex = buildSearchIndex(docModel);
  return docModel;
}

function parseFolder(item, context, slugRegistry) {
  const slug = uniqueSlug(item.name, slugRegistry);
  const id = `folder-${slug}`;
  return {
    id,
    slug,
    name: item.name,
    description: formatVariables(item.description || ''),
    descriptionPlain: stripMarkdownForSearch(formatVariables(item.description || '')),
    breadcrumbs: [...context.breadcrumbs, item.name],
    path: [...context.path, slug],
    events: item.event || [],
    children: [],
    apiCount: 0,
  };
}

function parseRequest(item, context, slugRegistry) {
  const req = item.request;
  const method = (req.method || 'GET').toUpperCase();
  const slug = uniqueSlug(item.name, slugRegistry);
  const id = `api-${slug}`;

  const urlData = parseUrl(req.url);
  const headers = normalizeHeaders(req.header);

  // Custom Support Ironman FLITS - 28-06-2026
  // Inject x-integration-app-name header into every API endpoint for integration app name tracking.
  // {{app_name}} is a global dynamic variable managed via the Environment Variables panel.
  if (!headers.some((h) => h.key === 'x-integration-app-name')) {
    headers.push({
      key: 'x-integration-app-name',
      value: '{{app_name}}',
      description: 'Mention the name of the application for which you are integrating the Flits API. Examples: Mobile App, Shopify Storefront, Headless Storefront, Custom App, React Storefront, Flutter App. Set {{app_name}} via Environment Variables.',
      disabled: false,
    });
  }

  const queryParams = urlData.query;
  const pathVariables = extractPathVariables(urlData.path, urlData.raw);
  const body = parseBody(req.body);
  const auth = parseAuth(req.auth);
  const responses = parseResponses(item.response || [], method);

  const requestData = {
    method,
    urlRaw: urlData.raw,
    urlDisplay: urlData.display,
    baseUrl: urlData.baseUrl,
    path: urlData.path,
    headers,
    queryParams,
    pathVariables,
    bodyMode: body.mode,
    bodyRaw: body.raw,
    bodyLanguage: body.language,
    bodyParams: body.params || [],
    auth,
  };

  let api = {
    id,
    slug,
    name: item.name,
    method,
    description: req.description || item.description || '',
    descriptionPlain: stripMarkdownForSearch(req.description || item.description || ''),
    breadcrumbs: [...context.breadcrumbs, item.name],
    path: [...context.path, slug],
    ...requestData,
    responses,
    events: item.event || [],
    responseCount: responses.length,
  };

  // Custom Support Ironman FLITS - 28-06-2026
  // Append x-integration-app-name documentation note to every API description block.
  // Only added once; guard prevents duplication on any future re-parse.
  if (!api.description.includes('x-integration-app-name')) {
    const _integrationNote = '\n\n> **`x-integration-app-name`** — Mention the name of the application for which you are integrating the Flits API, using the global variable `{{app_name}}`. Set its value in **Environment Variables**. Examples: `Mobile App`, `Shopify Storefront`, `Headless Storefront`, `Custom App`, `React Storefront`, `Flutter App`.';
    api.description = api.description
      ? api.description + _integrationNote
      : _integrationNote.trim();
    api.descriptionPlain = (api.descriptionPlain ? api.descriptionPlain + ' ' : '') +
      'x-integration-app-name Mention the name of the application for which you are integrating the Flits API, using the global variable {{app_name}}. Set its value in Environment Variables. Examples: Mobile App, Shopify Storefront, Headless Storefront, Custom App, React Storefront, Flutter App.';
  }

  api.curl = generateCurl(api);
  applyVariablesToApi(api);
  api.codeSamples = buildCodeSamples(api);

  return api;
}

function parseUrl(url) {
  if (!url) return { raw: '', display: '', path: [], query: [], baseUrl: '' };
  const raw = typeof url === 'string' ? url : url.raw || '';
  const display = formatVariables(raw);

  let path = [];
  let query = [];
  let baseUrl = '';

  if (typeof url === 'object') {
    if (Array.isArray(url.path)) path = url.path;
    if (Array.isArray(url.query)) {
      query = url.query
        .filter((q) => q && q.key)
        .map((q) => ({
          key: q.key,
          value: q.value ?? '',
          description: q.description || '',
          disabled: q.disabled === true,
          // Data-driven: a query param flagged `locked` in the collection is
          // rendered read-only in Try It and always included in the request.
          locked: q.locked === true,
        }));
    }
    if (url.host) {
      const host = Array.isArray(url.host) ? url.host.join('.') : url.host;
      const protocol = url.protocol ? `${url.protocol}://` : '';
      baseUrl = protocol + host;
    }
  }

  if (!baseUrl && raw.startsWith('http')) {
    try {
      const u = new URL(raw.split('?')[0].replace(/\{[^}]+\}/g, 'placeholder'));
      baseUrl = `${u.protocol}//${u.host}`;
    } catch {
      /* ignore */
    }
  }

  return { raw, display, path, query, baseUrl };
}

function normalizeHeaders(headers = []) {
  return headers
    .filter((h) => h && h.key)
    .map((h) => ({
      key: h.key,
      value: h.value ?? '',
      description: h.description || '',
      disabled: h.disabled === true,
    }));
}

function parseBody(body) {
  if (!body) return { mode: 'none', raw: '', language: 'json', params: [] };
  const mode = body.mode || 'raw';
  let raw = '';
  let language = 'json';
  let params = [];

  // Structured key/value fields for editable form bodies (form-data / urlencoded).
  const mapParams = (arr) =>
    (arr || [])
      .filter((p) => p && p.key)
      .map((p) => ({
        key: p.key,
        value: p.value ?? '',
        type: p.type || 'text',
        description: p.description || '',
        placeholder: p.placeholder || '',
        disabled: p.disabled === true,
      }));

  if (mode === 'raw') {
    raw = body.raw || '';
    language = body.options?.raw?.language || guessLanguage(raw);
  } else if (mode === 'urlencoded' && body.urlencoded) {
    params = mapParams(body.urlencoded);
    raw = JSON.stringify(
      Object.fromEntries(
        body.urlencoded.map((p) => [p.key, p.value])
      ),
      null,
      2
    );
    language = 'json';
  } else if (mode === 'formdata' && body.formdata) {
    params = mapParams(body.formdata);
    raw = JSON.stringify(
      body.formdata.map((p) => ({ key: p.key, value: p.value, type: p.type })),
      null,
      2
    );
    language = 'json';
  }

  return { mode, raw, language, params };
}

function guessLanguage(raw) {
  const t = (raw || '').trim();
  if (t.startsWith('{') || t.startsWith('[')) return 'json';
  if (t.includes('<?xml')) return 'xml';
  return 'text';
}

function parseAuth(auth) {
  if (!auth) return null;
  const type = auth.type;
  if (type === 'bearer') {
    const token = auth.bearer?.find?.((b) => b.key === 'token')?.value
      || auth.bearer?.token
      || '{{jwt_token}}';
    return { type: 'bearer', label: 'Bearer Token', value: `Bearer ${token}` };
  }
  if (type === 'apikey') {
    const entries = auth.apikey || [];
    return {
      type: 'apikey',
      label: 'API Key',
      entries: entries.map((e) => ({ key: e.key, value: e.value, in: e.in })),
    };
  }
  return { type, raw: auth };
}

function extractCollectionAuth(collection) {
  const notes = [];
  const events = collection.event || [];
  events.forEach((e) => {
    if (e.listen === 'prerequest' && e.script?.exec) {
      notes.push({
        type: 'prerequest',
        summary: 'Collection pre-request script injects auth headers for Wishlist endpoints.',
        script: Array.isArray(e.script.exec) ? e.script.exec.join('\n') : e.script.exec,
      });
    }
  });
  return {
    loyalty: {
      type: 'query',
      param: 'token',
      variable: 'flits_token',
      description: 'Loyalty endpoints use flits_token as a query parameter.',
    },
    wishlist: {
      type: 'bearer',
      headers: ['Authorization', 'merchant_id'],
      variable: 'jwt_token',
      description: 'Wishlist endpoints use Bearer JWT and merchant_id header.',
    },
    scripts: notes,
  };
}

function extractPathVariables(pathSegments, raw) {
  const vars = new Set();
  const combined = [...(pathSegments || []), raw || ''].join('/');
  const matches = combined.matchAll(/\{(\w+)\}|\{\{(\w+)\}\}/g);
  for (const m of matches) {
    vars.add(m[1] || m[2]);
  }
  return [...vars].map((key) => ({
    key,
    description: `Path variable: ${key}`,
  }));
}

function parseResponses(responses, method) {
  const mapped = responses
    .map((r) => {
      const code = r.code || parseStatusFromName(r.name);
      const body = r.body || '';
      let formattedBody = body;
      try {
        if (body && (body.trim().startsWith('{') || body.trim().startsWith('['))) {
          formattedBody = JSON.stringify(JSON.parse(body), null, 2);
        }
      } catch {
        formattedBody = body;
      }
      return {
        name: r.name,
        status: r.status || '',
        code: code || 0,
        headers: normalizeHeaders(r.header),
        body: formattedBody,
        rawBody: body,
        language: r._postman_previewlanguage || 'json',
        isExample: /curl/i.test(r.name),
      };
    })
    .sort((a, b) => {
      if (a.isExample && !b.isExample) return 1;
      if (!a.isExample && b.isExample) return -1;
      return (a.code || 999) - (b.code || 999);
    });

  const byCode = new Map();
  mapped.forEach((r) => {
    const key = r.code || r.name;
    if (!byCode.has(key)) byCode.set(key, []);
    byCode.get(key).push(r);
  });

  return mapped;
}

function parseStatusFromName(name) {
  const m = String(name).match(/\b(\d{3})\b/);
  return m ? parseInt(m[1], 10) : 0;
}

function countApisInTree(nodes) {
  return nodes.reduce((sum, n) => {
    if (n.type === 'api') return sum + 1;
    return sum + countApisInTree(n.children || []);
  }, 0);
}

function buildSearchIndex(doc) {
  const index = [];

  index.push({
    id: doc.overview.id,
    type: 'overview',
    title: doc.overview.name,
    subtitle: 'Introduction',
    text: doc.overview.descriptionPlain,
    slug: doc.overview.slug,
    method: null,
    url: null,
  });

  function walkNav(nodes, trail = []) {
    nodes.forEach((node) => {
      const path = [...trail, node.name];
      if (node.type === 'folder') {
        index.push({
          id: node.id,
          type: 'folder',
          title: node.name,
          subtitle: path.slice(0, -1).join(' › ') || 'Folder',
          text: node.description || '',
          slug: node.slug,
          method: null,
          url: null,
          breadcrumbs: path,
        });
        walkNav(node.children || [], path);
      } else if (node.type === 'api') {
        const api = doc.apis.find((a) => a.id === node.id);
        if (api) {
          index.push({
            id: api.id,
            type: 'api',
            title: api.name,
            subtitle: path.slice(0, -1).join(' › '),
            text: [api.descriptionPlain, api.urlDisplay, api.method].join(' '),
            slug: api.slug,
            method: api.method,
            url: api.urlDisplay,
            breadcrumbs: api.breadcrumbs,
          });
        }
      }
    });
  }

  walkNav(doc.navTree);
  return index;
}

export async function loadAndParseCollection(path) {
  const resolved = path ?? getCollectionPath();
  const response = await fetch(resolved);
  if (!response.ok) {
    throw new Error(`Failed to load collection (${response.status}): ${resolved}`);
  }
  const json = await response.json();
  return parsePostmanCollection(json);
}
