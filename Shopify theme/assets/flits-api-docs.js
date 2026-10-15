var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// js/utils/slug.js
function slugify(text, fallback = "section") {
  if (!text || typeof text !== "string") return fallback;
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || fallback;
}
function uniqueSlug(base, existing) {
  let slug = slugify(base);
  let counter = 1;
  while (existing.has(slug)) {
    slug = `${slugify(base)}-${counter++}`;
  }
  existing.add(slug);
  return slug;
}
var init_slug = __esm({
  "js/utils/slug.js"() {
  }
});

// js/utils/variables.js
function formatVariables(text) {
  if (text == null) return text;
  if (typeof text !== "string") return text;
  return text.replace(VAR_PATTERN, "{{$1}}");
}
function applyVariablesToApi(api) {
  if (!api) return api;
  const fields = [
    "urlRaw",
    "urlDisplay",
    "baseUrl",
    "description",
    "descriptionPlain",
    "bodyRaw",
    "curl"
  ];
  fields.forEach((key) => {
    if (typeof api[key] === "string") api[key] = formatVariables(api[key]);
  });
  if (api.headers) {
    api.headers = api.headers.map((h) => ({
      ...h,
      value: formatVariables(h.value),
      description: formatVariables(h.description)
    }));
  }
  if (api.queryParams) {
    api.queryParams = api.queryParams.map((q) => ({
      ...q,
      value: formatVariables(q.value),
      description: formatVariables(q.description)
    }));
  }
  if (api.bodyParams) {
    api.bodyParams = api.bodyParams.map((p) => ({
      ...p,
      value: formatVariables(p.value),
      description: formatVariables(p.description)
    }));
  }
  if (api.responses) {
    api.responses = api.responses.map((r) => ({
      ...r,
      body: formatVariables(r.body),
      rawBody: formatVariables(r.rawBody),
      name: formatVariables(r.name)
    }));
  }
  if (api.auth?.value) {
    api.auth = { ...api.auth, value: formatVariables(api.auth.value) };
  }
  return api;
}
function applyVariablesToDoc(doc) {
  if (!doc) return doc;
  if (doc.overview?.description) {
    doc.overview.description = formatVariables(doc.overview.description);
    doc.overview.descriptionPlain = formatVariables(doc.overview.descriptionPlain);
  }
  if (doc.meta?.description) {
    doc.meta.description = formatVariables(doc.meta.description);
  }
  doc.sections?.forEach((section) => {
    if (section.data?.description) {
      section.data.description = formatVariables(section.data.description);
      if (section.data.descriptionPlain) {
        section.data.descriptionPlain = formatVariables(section.data.descriptionPlain);
      }
    }
  });
  doc.apis?.forEach(applyVariablesToApi);
  doc.searchIndex?.forEach((entry) => {
    if (entry.text) entry.text = formatVariables(entry.text);
    if (entry.url) entry.url = formatVariables(entry.url);
  });
  return doc;
}
var VAR_PATTERN;
var init_variables = __esm({
  "js/utils/variables.js"() {
    VAR_PATTERN = /(?<!\{)\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g;
  }
});

// js/utils/markdown.js
function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function stripMarkdownForSearch(md) {
  if (!md) return "";
  return md.replace(/```[\s\S]*?```/g, " ").replace(/`[^`]+`/g, " ").replace(/[#*_~\[\]()]/g, " ").replace(/\s+/g, " ").trim();
}
function markdownToHtml(markdown) {
  if (!markdown) return "";
  let text = formatVariables(String(markdown).replace(/\r\n/g, "\n"));
  const codeBlocks = [];
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const i2 = codeBlocks.length;
    const language = (lang || "text").trim() || "text";
    codeBlocks.push({ language, code: code.trimEnd() });
    return `@@CODEBLOCK_${i2}@@`;
  });
  const lines = text.split("\n");
  const out = [];
  let i = 0;
  let inUl = false;
  let inOl = false;
  let inTable = false;
  let tableRows = [];
  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };
  const flushTable = () => {
    if (!inTable || !tableRows.length) return;
    const [header, ...body] = tableRows;
    const alignRow = body[0]?.every((c) => /^:?-+:?$/.test(c.replace(/\s/g, ""))) ? body.shift() : null;
    void alignRow;
    out.push('<div class="md-table-wrap"><table class="md-table"><thead><tr>');
    header.forEach((cell) => out.push(`<th>${inlineFormat(cell.trim())}</th>`));
    out.push("</tr></thead><tbody>");
    body.forEach((row) => {
      out.push("<tr>");
      row.forEach((cell) => out.push(`<td>${inlineFormat(cell.trim())}</td>`));
      out.push("</tr>");
    });
    out.push("</tbody></table></div>");
    inTable = false;
    tableRows = [];
  };
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("@@CODEBLOCK_")) {
      closeLists();
      flushTable();
      const idx = parseInt(trimmed.match(/\d+/)?.[0], 10);
      const block = codeBlocks[idx];
      const lang = block?.language || "text";
      const escaped = escapeHtml(block?.code || "");
      out.push(
        `<div class="md-code-wrap"><pre class="code-block md-embedded" data-language="${lang}"><code>${escaped}</code></pre></div>`
      );
      i++;
      continue;
    }
    if (trimmed.includes("|") && trimmed.startsWith("|")) {
      closeLists();
      const cells = trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
      if (!inTable) inTable = true;
      tableRows.push(cells);
      i++;
      continue;
    } else if (inTable) {
      flushTable();
    }
    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeLists();
      const level = heading[1].length;
      out.push(`<h${level} class="md-h${level}">${inlineFormat(heading[2])}</h${level}>`);
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeLists();
      out.push('<hr class="md-hr" />');
      i++;
      continue;
    }
    const calloutStart = trimmed.match(/^>\s?\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);
    if (calloutStart) {
      closeLists();
      const kind = calloutStart[1].toLowerCase();
      const title = calloutStart[2].trim() || calloutStart[1];
      const body = [];
      i++;
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        body.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      const bodyHtml = body.filter((l) => l.trim()).map((l) => `<p class="md-callout__body">${inlineFormat(l)}</p>`).join("");
      out.push(
        `<blockquote class="md-quote md-callout md-callout--${kind}"><p class="md-callout__title">${inlineFormat(title)}</p>` + bodyHtml + `</blockquote>`
      );
      continue;
    }
    if (/^>\s?/.test(trimmed)) {
      closeLists();
      out.push(`<blockquote class="md-quote">${inlineFormat(trimmed.replace(/^>\s?/, ""))}</blockquote>`);
      i++;
      continue;
    }
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (!inUl) {
        closeLists();
        out.push('<ul class="md-ul">');
        inUl = true;
      }
      out.push(`<li>${inlineFormat(ulMatch[1])}</li>`);
      i++;
      continue;
    }
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!inOl) {
        closeLists();
        out.push('<ol class="md-ol">');
        inOl = true;
      }
      out.push(`<li>${inlineFormat(olMatch[1])}</li>`);
      i++;
      continue;
    }
    if (!trimmed) {
      closeLists();
      i++;
      continue;
    }
    closeLists();
    out.push(`<p class="md-p">${inlineFormat(trimmed)}</p>`);
    i++;
  }
  closeLists();
  flushTable();
  return out.join("\n");
}
function inlineFormat(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="md-link" rel="noopener">$1</a>');
  return s;
}
var init_markdown = __esm({
  "js/utils/markdown.js"() {
    init_variables();
  }
});

// js/utils/curl.js
function generateCurl(request) {
  if (!request) return "";
  const method = (request.method || "GET").toUpperCase();
  const url = request.urlDisplay || request.urlRaw || "";
  const parts = [`curl --request ${method}`, `  --url '${escapeSingleQuotes(url)}'`];
  const headers = request.headers || [];
  headers.forEach((h) => {
    if (h.key && !h.disabled) {
      parts.push(`  --header '${escapeSingleQuotes(`${h.key}: ${h.value || ""}`)}'`);
    }
  });
  if (request.authHeader) {
    const exists = headers.some(
      (h) => h.key?.toLowerCase() === request.authHeader.key.toLowerCase()
    );
    if (!exists) {
      parts.push(`  --header '${escapeSingleQuotes(`${request.authHeader.key}: ${request.authHeader.value}`)}'`);
    }
  }
  const isWrite = method !== "GET" && method !== "HEAD";
  const bodyParams = (request.bodyParams || []).filter((p) => p.key && !p.disabled);
  if (isWrite && request.bodyMode === "formdata" && bodyParams.length) {
    bodyParams.forEach((p) => {
      parts.push(`  --form '${escapeSingleQuotes(`${p.key}="${p.value ?? ""}"`)}'`);
    });
  } else if (isWrite && request.bodyMode === "urlencoded" && bodyParams.length) {
    bodyParams.forEach((p) => {
      parts.push(`  --data-urlencode '${escapeSingleQuotes(`${p.key}=${p.value ?? ""}`)}'`);
    });
  } else if (isWrite && request.bodyRaw && request.bodyRaw.trim()) {
    parts.push(`  --data '${escapeSingleQuotes(request.bodyRaw.trim())}'`);
  }
  return parts.join(" \\\n");
}
function escapeSingleQuotes(str) {
  return String(str).replace(/'/g, "'\\''");
}
var init_curl = __esm({
  "js/utils/curl.js"() {
  }
});

// js/utils/codeSamples.js
function buildCodeSamples(api) {
  return {
    curl: api.curl || generateCurl(api),
    javascript: generateJavaScript(api),
    python: generatePython(api),
    php: generatePhp(api)
  };
}
function getActiveHeaders(api) {
  return (api.headers || []).filter((h) => h.key && !h.disabled);
}
function activeBodyParams(api) {
  return (api.bodyParams || []).filter((p) => p.key && !p.disabled);
}
function isWriteMethod(api) {
  return !["GET", "HEAD"].includes((api.method || "GET").toUpperCase());
}
function formBodyKind(api) {
  if (!isWriteMethod(api) || !activeBodyParams(api).length) return null;
  if (api.bodyMode === "formdata") return "formdata";
  if (api.bodyMode === "urlencoded") return "urlencoded";
  return null;
}
function hasBody(api) {
  const method = (api.method || "GET").toUpperCase();
  return api.bodyRaw?.trim() && !["GET", "HEAD"].includes(method);
}
function jsString(str) {
  return JSON.stringify(str ?? "");
}
function phpString(str) {
  return `'${String(str ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}
function generateJavaScript(api) {
  const url = api.urlDisplay || api.urlRaw;
  const method = api.method || "GET";
  const headers = getActiveHeaders(api);
  const params = activeBodyParams(api);
  const kind = formBodyKind(api);
  const headerBlock = (fallback) => {
    const lines = headers.map((h) => `    ${jsString(h.key)}: ${jsString(h.value)}`).join(",\n");
    return lines || fallback;
  };
  if (kind === "formdata") {
    const appends = params.map((p) => `form.append(${jsString(p.key)}, ${jsString(p.value)});`).join("\n");
    return `const form = new FormData();
${appends}

const response = await fetch(${jsString(url)}, {
  method: ${jsString(method)},
  headers: {
${headerBlock("")}
  },
  body: form
});

const data = await response.json();
console.log(data);`;
  }
  if (kind === "urlencoded") {
    const appends = params.map((p) => `params.append(${jsString(p.key)}, ${jsString(p.value)});`).join("\n");
    return `const params = new URLSearchParams();
${appends}

const response = await fetch(${jsString(url)}, {
  method: ${jsString(method)},
  headers: {
${headerBlock("    'Content-Type': 'application/x-www-form-urlencoded'")}
  },
  body: params
});

const data = await response.json();
console.log(data);`;
  }
  const bodyLine = hasBody(api) ? `,
  body: ${jsString(api.bodyRaw.trim())}` : "";
  return `const response = await fetch(${jsString(url)}, {
  method: ${jsString(method)},
  headers: {
${headerBlock("    'Content-Type': 'application/json'")}
  }${bodyLine}
});

const data = await response.json();
console.log(data);`;
}
function generatePython(api) {
  const url = api.urlDisplay || api.urlRaw;
  const method = (api.method || "GET").toLowerCase();
  const headers = getActiveHeaders(api);
  const params = activeBodyParams(api);
  const kind = formBodyKind(api);
  const headerDict = headers.length ? `headers = {
${headers.map((h) => `    ${jsString(h.key)}: ${jsString(h.value)}`).join(",\n")}
}

` : "";
  const headersArg = headers.length ? ",\n    headers=headers" : "";
  if (kind === "formdata") {
    const files = params.map((p) => `    ${jsString(p.key)}: (None, ${jsString(p.value)}),`).join("\n");
    return `import requests

${headerDict}files = {
${files}
}

response = requests.${method}(
    ${jsString(url)},
    files=files${headersArg}
)

data = response.json()
print(data)`;
  }
  if (kind === "urlencoded") {
    const fields = params.map((p) => `    ${jsString(p.key)}: ${jsString(p.value)},`).join("\n");
    return `import requests

${headerDict}payload = {
${fields}
}

response = requests.${method}(
    ${jsString(url)},
    data=payload${headersArg}
)

data = response.json()
print(data)`;
  }
  const headerDictRaw = headers.length ? headerDict : "headers = {'Content-Type': 'application/json'}\n\n";
  let bodyPart;
  if (hasBody(api)) {
    bodyPart = `payload = ${jsString(api.bodyRaw.trim())}

response = requests.${method}(
    ${jsString(url)},
    headers=headers,
    data=payload
)`;
  } else {
    bodyPart = `response = requests.${method}(
    ${jsString(url)},
    headers=headers
)`;
  }
  return `import requests

${headerDictRaw}${bodyPart}

data = response.json()
print(data)`;
}
function generatePhp(api) {
  const url = api.urlDisplay || api.urlRaw;
  const method = api.method || "GET";
  const headers = getActiveHeaders(api);
  const params = activeBodyParams(api);
  const kind = formBodyKind(api);
  const headerLines = headers.map((h) => `    ${jsString(`${h.key}: ${h.value}`)},`).join("\n");
  const headerList = headerLines || (kind ? "" : "    'Content-Type: application/json',");
  const optPost = method.toUpperCase() !== "GET" ? `
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${method.toUpperCase()}');` : "";
  let bodyPart = "";
  if (kind === "formdata") {
    const fields = params.map((p) => `    ${phpString(p.key)} => ${phpString(p.value)},`).join("\n");
    bodyPart = `
curl_setopt($ch, CURLOPT_POSTFIELDS, [
${fields}
]);`;
  } else if (kind === "urlencoded") {
    const fields = params.map((p) => `    ${phpString(p.key)} => ${phpString(p.value)},`).join("\n");
    bodyPart = `
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
${fields}
]));`;
  } else if (hasBody(api)) {
    bodyPart = `
curl_setopt($ch, CURLOPT_POSTFIELDS, ${phpString(api.bodyRaw.trim())});`;
  }
  return `<?php
$url = ${jsString(url)};
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);${optPost}
curl_setopt($ch, CURLOPT_HTTPHEADER, [
${headerList}
]);${bodyPart}

$response = curl_exec($ch);
curl_close($ch);
$data = json_decode($response, true);
print_r($data);`;
}
var LANGUAGES;
var init_codeSamples = __esm({
  "js/utils/codeSamples.js"() {
    init_curl();
    LANGUAGES = [
      { id: "curl", label: "cURL" },
      { id: "javascript", label: "JavaScript" },
      { id: "python", label: "Python" },
      { id: "php", label: "PHP" }
    ];
  }
});

// js/utils/highlighter.js
function highlightCode(code, language = "text") {
  const escaped = escapeHtml2(code);
  if (language === "json" || looksLikeJson(code)) {
    return highlightJsonTokens(escaped);
  }
  if (language === "bash" || language === "shell" || language === "curl") {
    return highlightBash(escaped);
  }
  return escaped;
}
function looksLikeJson(code) {
  const t = String(code).trim();
  return t.startsWith("{") && t.endsWith("}") || t.startsWith("[") && t.endsWith("]");
}
function escapeHtml2(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function highlightJsonTokens(escaped) {
  return escaped.replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (match, str, colon, bool) => {
      if (colon) return `<span class="hl-key">${str}</span><span class="hl-punc">:</span>`;
      if (bool) return `<span class="hl-bool">${match}</span>`;
      if (str) return `<span class="hl-str">${str}</span>`;
      if (/^-?\d/.test(match)) return `<span class="hl-num">${match}</span>`;
      return match;
    }
  );
}
function highlightBash(escaped) {
  return escaped.replace(/^(curl\b.*)$/gm, '<span class="hl-cmd">$1</span>').replace(/(--[\w-]+)/g, '<span class="hl-flag">$1</span>').replace(/('[^']*')/g, '<span class="hl-str">$1</span>');
}
var init_highlighter = __esm({
  "js/utils/highlighter.js"() {
  }
});

// js/render/contentHelpers.js
function escapeHtml3(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var init_contentHelpers = __esm({
  "js/render/contentHelpers.js"() {
  }
});

// js/features/envStore.js
function loadEnv() {
  try {
    _env = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    _env = {};
  }
  return { ..._env };
}
function _persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_env));
  } catch {
  }
}
function getEnv() {
  return { ..._env };
}
function setVar(name, value) {
  if (value == null || value === "") {
    if (!(name in _env)) return;
    delete _env[name];
  } else {
    if (_env[name] === value) return;
    _env[name] = value;
  }
  _persist();
  _notify();
}
function clearAll() {
  if (Object.keys(_env).length === 0) return;
  _env = {};
  _persist();
  _notify();
}
function applyEnv(text) {
  if (!text || typeof text !== "string") return text;
  return text.replace(VAR_RE, (match, name) => {
    const v = _env[name];
    return v !== void 0 && v !== "" ? v : match;
  });
}
function discoverVariables(doc) {
  const found = /* @__PURE__ */ new Set();
  const scan = (s) => {
    if (!s || typeof s !== "string") return;
    for (const m of s.matchAll(new RegExp(VAR_RE.source, "g"))) found.add(m[1]);
  };
  doc?.apis?.forEach((api) => {
    scan(api.urlRaw);
    scan(api.urlDisplay);
    scan(api.bodyRaw);
    api.headers?.forEach((h) => {
      scan(h.key);
      scan(h.value);
    });
    api.queryParams?.forEach((q) => {
      scan(q.key);
      scan(q.value);
    });
    api.pathVariables?.forEach((v) => found.add(v.key));
  });
  return [...found].sort((a, b) => a.localeCompare(b));
}
function onEnvChange(cb) {
  _subs.push(cb);
  return () => {
    _subs = _subs.filter((s) => s !== cb);
  };
}
function _notify() {
  const snap = getEnv();
  _subs.forEach((cb) => {
    try {
      cb(snap);
    } catch {
    }
  });
}
var STORAGE_KEY, VAR_RE, _env, _subs;
var init_envStore = __esm({
  "js/features/envStore.js"() {
    STORAGE_KEY = "_flits_env_v1";
    VAR_RE = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
    _env = {};
    _subs = [];
  }
});

// js/toc/constants.js
var PROSE_HEADING_SELECTOR, DOC_TOC_DEPTH_OFFSET, PAGE_VIEW_SELECTOR, TOC_SECTION_SELECTOR, EXCLUDED_PROSE_SELECTOR;
var init_constants = __esm({
  "js/toc/constants.js"() {
    PROSE_HEADING_SELECTOR = ".page-body.prose h2.md-h2, .page-body.prose h3.md-h3, .page-body.prose h4.md-h4, #overview-content h2.md-h2, #overview-content h3.md-h3, #overview-content h4.md-h4";
    DOC_TOC_DEPTH_OFFSET = 1;
    PAGE_VIEW_SELECTOR = ".page-view";
    TOC_SECTION_SELECTOR = "[data-toc-section]";
    EXCLUDED_PROSE_SELECTOR = ".prose--api-description";
  }
});

// js/toc/tocCollector.js
function assignProseHeadingIds(container) {
  const seenIds = reserveStructuredSectionIds(container);
  container.querySelectorAll(
    `.prose:not(${EXCLUDED_PROSE_SELECTOR}) .md-h2, .prose:not(${EXCLUDED_PROSE_SELECTOR}) .md-h3, .prose:not(${EXCLUDED_PROSE_SELECTOR}) .md-h4`
  ).forEach((el) => {
    if (!isTocCandidate(el)) return;
    if (el.id) {
      seenIds.add(el.id);
      return;
    }
    el.id = uniqueSlug(el.textContent || "section", seenIds);
  });
}
function reserveStructuredSectionIds(container) {
  const seenIds = /* @__PURE__ */ new Set();
  container.querySelectorAll(`${TOC_SECTION_SELECTOR}[id]`).forEach((el) => {
    if (el.id) seenIds.add(el.id);
  });
  return seenIds;
}
function getDocTocHeadingDepthRange(pageView) {
  let min = 6;
  pageView.querySelectorAll(PROSE_HEADING_SELECTOR).forEach((el) => {
    if (!isTocCandidate(el)) return;
    const level = parseInt(el.tagName?.match(/^H(\d)$/i)?.[1] || "2", 10);
    if (level < min) min = level;
  });
  if (min > 5) return { min: 2, max: 2 + DOC_TOC_DEPTH_OFFSET };
  return { min, max: min + DOC_TOC_DEPTH_OFFSET };
}
function isDocTocHeadingElement(heading, range) {
  const level = parseInt(heading.tagName?.match(/^H(\d)$/i)?.[1] || "2", 10);
  return level >= range.min && level <= range.max;
}
function isTocCandidate(el) {
  if (!el?.isConnected) return false;
  if (el.closest(EXCLUDED_PROSE_SELECTOR)) return false;
  if (el.closest("[hidden]")) return false;
  if (!el.closest(PAGE_VIEW_SELECTOR)) return false;
  if (typeof getComputedStyle !== "function") return true;
  const style = getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
}
var init_tocCollector = __esm({
  "js/toc/tocCollector.js"() {
    init_slug();
    init_constants();
  }
});

// js/render/pageView.js
function renderPage(section) {
  if (!section) return renderNotFound();
  switch (section.type) {
    case "overview":
      return renderOverviewPage(section.data, docStore.doc);
    case "folder":
      return renderFolderPage(section.data);
    case "api":
      return renderApiPage(section.data);
    default:
      return renderNotFound();
  }
}
function renderOverviewPage(overview, doc) {
  return `
    <article class="page-view page-view--overview" data-page-type="overview">
      <header class="page-hero">
        <h1 class="page-hero__title">${escapeHtml3(overview.name)}</h1>
        <p class="page-hero__lead">API reference for Flits Loyalty and Wishlist integrations.</p>
      </header>
      <div class="page-body prose" id="overview-content">
        ${markdownToHtml(overview.description)}
      </div>
      <section class="page-section" id="authentication" data-toc-section data-toc-level="2" data-toc-title="Authentication">
        ${renderAuthOverviewBlock(doc.collectionAuth)}
      </section>
    </article>
  `;
}
function renderFolderPage(folder) {
  return `
    <article class="page-view page-view--folder" data-page-type="folder">
      <header class="page-hero">
        <p class="page-hero__eyebrow">${escapeHtml3(folder.breadcrumbs.slice(0, -1).join(" \u203A ") || "Documentation")}</p>
        <h1 class="page-hero__title">${escapeHtml3(folder.name)}</h1>
        ${folder.apiCount ? `<p class="page-hero__meta"><span class="badge">${folder.apiCount} endpoints</span></p>` : ""}
      </header>
      <div class="page-body prose">
        ${folder.description ? markdownToHtml(folder.description) : '<p class="text-muted">No description provided for this section.</p>'}
      </div>
    </article>
  `;
}
function renderCopyLinkButton(api) {
  return `<button type="button" class="btn btn--ghost btn--sm page-hero__copy" data-copy-link="${escapeHtml3(api.slug)}" aria-label="Copy link to this API">Copy page link</button>`;
}
function renderApiTitleRow(api) {
  return `
    <div class="page-hero__title-row">
      <h1 class="page-hero__title">${escapeHtml3(api.name)}</h1>
      ${renderCopyLinkButton(api)}
    </div>
  `;
}
function renderApiMetaRow(api) {
  const method = (api.method || "GET").toLowerCase();
  return `
    <div class="page-hero__meta-row">
      <span class="method-badge method-${method}">${escapeHtml3(api.method)}</span>
      <code class="page-hero__url" data-env-template="${escapeHtml3(api.urlDisplay)}">${escapeHtml3(applyEnv(api.urlDisplay))}</code>
    </div>
  `;
}
function refreshEnvTemplates() {
  document.querySelectorAll("[data-env-template]").forEach((el) => {
    const resolved = applyEnv(el.dataset.envTemplate);
    if (el.textContent !== resolved) el.textContent = resolved;
  });
}
function renderApiHeader(api) {
  const eyebrow = api.breadcrumbs?.slice(0, -1).join(" \u203A ") || "";
  return `
    <header class="page-hero page-hero--api">
      ${eyebrow ? `<p class="page-hero__eyebrow">${escapeHtml3(eyebrow)}</p>` : ""}
      ${renderApiTitleRow(api)}
      ${renderApiMetaRow(api)}
    </header>
  `;
}
function renderApiPage(api) {
  return `
    <article class="page-view page-view--api" data-page-type="api" data-method="${api.method}">
      ${renderApiHeader(api)}

      ${api.description ? `<section class="page-section" id="overview" data-toc-section data-toc-level="2" data-toc-title="Overview">
        <h2 class="page-section__title">Overview</h2>
        <div class="prose prose--api-description">${markdownToHtml(api.description)}</div>
      </section>` : ""}

      <section class="page-section" id="endpoint" data-toc-section data-toc-level="2" data-toc-title="Endpoint">
        <h2 class="page-section__title">Endpoint</h2>
        <div class="endpoint-bar">
          <span class="method-badge method-${api.method.toLowerCase()}">${api.method}</span>
          <code class="endpoint-bar__url" data-env-template="${escapeHtml3(api.urlDisplay)}">${escapeHtml3(applyEnv(api.urlDisplay))}</code>
        </div>
        ${api.baseUrl ? `<p class="page-meta">Base URL: <code>${escapeHtml3(api.baseUrl)}</code></p>` : ""}
      </section>

      ${api.auth ? `<section class="page-section" id="authorization" data-toc-section data-toc-level="2" data-toc-title="Authorization">
        <h2 class="page-section__title">Authorization</h2>
        ${renderAuthBlock(api.auth)}
      </section>` : ""}

      ${api.headers?.length ? `<section class="page-section" id="headers" data-toc-section data-toc-level="2" data-toc-title="Headers">
        <h2 class="page-section__title">Headers</h2>
        ${renderParamsTable(api.headers)}
      </section>` : ""}

      ${api.pathVariables?.length ? `<section class="page-section" id="path-parameters" data-toc-section data-toc-level="2" data-toc-title="Path parameters">
        <h2 class="page-section__title">Path parameters</h2>
        ${renderParamsTable(
    api.pathVariables.map((v) => ({
      key: v.key,
      value: `{{${v.key}}}`,
      description: v.description
    }))
  )}
      </section>` : ""}

      ${api.queryParams?.length ? `<section class="page-section" id="query-parameters" data-toc-section data-toc-level="2" data-toc-title="Query parameters">
        <h2 class="page-section__title">Query parameters</h2>
        ${renderParamsTable(api.queryParams)}
      </section>` : ""}

      ${api.bodyParams?.length ? `<section class="page-section" id="request-body" data-toc-section data-toc-level="2" data-toc-title="Request body">
        <h2 class="page-section__title">Request body</h2>
        <p class="page-meta">Content-Type: <code>${escapeHtml3(_bodyContentType(api.bodyMode))}</code> \xB7 Mode: ${escapeHtml3(api.bodyMode)}</p>
        ${renderParamsTable(api.bodyParams)}
      </section>` : api.bodyRaw ? `<section class="page-section" id="request-body" data-toc-section data-toc-level="2" data-toc-title="Request body">
        <h2 class="page-section__title">Request body</h2>
        <p class="page-meta">Content-Type: <code>application/json</code> \xB7 Mode: ${escapeHtml3(api.bodyMode)}</p>
        <div class="sample-block">
          <pre class="code-block"><code>${highlightCode(api.bodyRaw, api.bodyLanguage || "json")}</code></pre>
        </div>
      </section>` : ""}

    </article>
  `;
}
function renderAuthBlock(auth) {
  if (auth.type === "bearer") {
    return `<p><span class="badge badge--auth">Bearer Token</span></p><pre class="code-inline-block"><code>${escapeHtml3(auth.value)}</code></pre>`;
  }
  return `<p class="text-muted">${escapeHtml3(auth.type || "See documentation")}</p>`;
}
function renderAuthOverviewBlock(collectionAuth) {
  if (!collectionAuth) return "";
  return `
    <h2 class="page-section__title">Authentication</h2>
    <div class="info-grid">
      <!-- Custom Support Ironman FLITS - 08-07-2026 START -->
      <div class="info-card">
        <h3>Loyalty</h3>
        <p>${escapeHtml3(collectionAuth.loyalty?.description || "")}</p>
        <code class="code-inline">token={{flits_token}}</code>
      </div>
      <div class="info-card">
        <h3>Wishlist</h3>
        <p>${escapeHtml3(collectionAuth.wishlist?.description || "")}</p>
      <!-- Custom Support Ironman FLITS - 08-07-2026 END -->
        <code class="code-inline">Authorization: Bearer {{jwt_token}}</code><br/>
        <code class="code-inline">merchant_id: {{merchant_id}}</code>
      </div>
    </div>
  `;
}
function renderParamsTable(params) {
  const rows = params.map(
    (p) => `
    <tr class="${p.disabled ? "is-disabled" : ""}">
      <td><code>${escapeHtml3(p.key)}</code></td>
      <td><code>${escapeHtml3(p.value || "")}</code></td>
      <td>${escapeHtml3(p.description || "\u2014")}</td>
    </tr>
  `
  ).join("");
  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Value</th><th>Description</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
function _bodyContentType(mode) {
  if (mode === "formdata") return "multipart/form-data";
  if (mode === "urlencoded") return "application/x-www-form-urlencoded";
  return "application/json";
}
function renderNotFound() {
  return `
    <article class="page-view page-view--error">
      <h1>Page not found</h1>
      <p class="text-muted">The documentation page you're looking for doesn't exist.</p>
      <a href="#overview" class="btn btn--primary" data-nav="overview">Back to Introduction</a>
    </article>
  `;
}
function enhanceProseHeadings(container) {
  assignProseHeadingIds(container);
  container.querySelectorAll(".md-embedded code").forEach((codeEl) => {
    const pre = codeEl.parentElement;
    const lang = pre?.dataset?.language || "text";
    codeEl.innerHTML = highlightCode(codeEl.textContent, lang);
  });
}
var init_pageView = __esm({
  "js/render/pageView.js"() {
    init_docStore();
    init_markdown();
    init_highlighter();
    init_contentHelpers();
    init_envStore();
    init_tocCollector();
  }
});

// js/features/sidebarCollapse.js
function initSidebarCollapse() {
  document.querySelectorAll(".nav-tree--nested").forEach((ul) => {
    collapseFolder(ul, false);
  });
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-toggle-folder]");
    if (!btn) return;
    e.preventDefault();
    toggleFolder(btn);
  });
  document.addEventListener("keydown", (e) => {
    const btn = e.target.closest("[data-toggle-folder]");
    if (!btn) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleFolder(btn);
    }
  });
}
function toggleFolder(btn) {
  const slug = btn.getAttribute("data-toggle-folder");
  const ul = document.getElementById(`folder-${slug}`);
  if (!ul) return;
  const expanded = btn.getAttribute("aria-expanded") === "true";
  if (expanded) collapseFolder(ul, true);
  else expandFolder(ul, true);
}
function expandFolder(ul, animate = true) {
  const folderItem = ul.closest(".nav-tree__item--folder");
  const btn = folderItem?.querySelector("[data-toggle-folder]");
  ul.classList.remove("is-collapsed");
  if (btn) btn.setAttribute("aria-expanded", "true");
  if (!animate) {
    ul.style.maxHeight = "none";
    return;
  }
  ul.style.maxHeight = `${ul.scrollHeight}px`;
  const onEnd = () => {
    if (btn?.getAttribute("aria-expanded") === "true") {
      ul.style.maxHeight = "none";
    }
    ul.removeEventListener("transitionend", onEnd);
  };
  ul.addEventListener("transitionend", onEnd);
}
function collapseFolder(ul, animate = true) {
  const folderItem = ul.closest(".nav-tree__item--folder");
  const btn = folderItem?.querySelector("[data-toggle-folder]");
  if (btn) btn.setAttribute("aria-expanded", "false");
  if (animate && ul.style.maxHeight === "none") {
    ul.style.maxHeight = `${ul.scrollHeight}px`;
    requestAnimationFrame(() => {
      ul.classList.add("is-collapsed");
      ul.style.maxHeight = "0px";
    });
  } else {
    ul.classList.add("is-collapsed");
    ul.style.maxHeight = "0px";
  }
}
function isExpandableFolder(navEl) {
  const slug = navEl?.getAttribute?.("data-toggle-folder");
  if (!slug) return false;
  const ul = document.getElementById(`folder-${slug}`);
  return !!ul && ul.querySelector(".nav-tree__item") != null;
}
function expandPathToElement(element) {
  let parent = element.closest(".nav-tree--nested");
  while (parent) {
    expandFolder(parent, true);
    parent = parent.parentElement?.closest(".nav-tree--nested");
  }
}
var init_sidebarCollapse = __esm({
  "js/features/sidebarCollapse.js"() {
  }
});

// js/render/sidebar.js
var sidebar_exports = {};
__export(sidebar_exports, {
  filterSidebar: () => filterSidebar,
  renderSidebar: () => renderSidebar,
  setSidebarActive: () => setSidebarActive
});
function renderSidebar(container) {
  const doc = docStore.doc;
  if (!doc) return;
  const apiCount = doc.meta?.apiCount ?? doc.apis?.length ?? 0;
  container.innerHTML = `
    <aside class="sidebar" id="sidebar" aria-label="API navigation">
      <div class="sidebar__header">
        <div class="sidebar__search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>
          <input type="search" id="sidebar-filter" class="sidebar__filter" placeholder="Filter endpoints\u2026" aria-label="Filter sidebar" />
        </div>
        <span class="sidebar__count">${apiCount} endpoints</span>
      </div>
      <nav class="sidebar__nav" id="sidebar-nav">
        <ul class="nav-tree" role="tree">
          <li class="nav-tree__item nav-tree__item--overview" role="none">
            <a href="#overview" class="nav-tree__link nav-tree__link--overview" data-nav="overview" data-slug="overview" role="treeitem">
              <span class="nav-tree__label">Introduction</span>
            </a>
          </li>
          ${renderNavNodes(doc.navTree, 0)}
        </ul>
      </nav>
    </aside>
    <div class="sidebar-overlay" id="sidebar-overlay" hidden aria-hidden="true"></div>
  `;
}
function renderNavNodes(nodes, depth) {
  return (nodes || []).map((node) => {
    if (node.type === "folder") {
      const childHtml = renderNavNodes(node.children, depth + 1);
      return `
          <li class="nav-tree__item nav-tree__item--folder" role="none" data-folder-slug="${node.slug}">
            <a href="#${node.slug}"
               class="nav-tree__folder-btn"
               data-nav="${node.slug}"
               data-slug="${node.slug}"
               data-toggle-folder="${node.slug}"
               aria-expanded="false"
               aria-controls="folder-${node.slug}"
               role="treeitem">
              <span class="nav-tree__label">${escapeHtml4(node.name)}</span>
              ${node.apiCount ? `<span class="nav-tree__count">${node.apiCount}</span>` : ""}
              <svg class="nav-tree__chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </a>
            <ul class="nav-tree nav-tree--nested is-collapsed" id="folder-${node.slug}" role="group" style="--depth: ${depth + 1}; max-height: 0">
              ${childHtml}
            </ul>
          </li>
        `;
    }
    const methodLower = (node.method || "get").toLowerCase();
    return `
        <li class="nav-tree__item" role="none" data-api-name="${escapeHtml4(node.name).toLowerCase()}">
          <a href="#${node.slug}"
             class="nav-tree__link nav-tree__link--api"
             data-nav="${node.slug}"
             data-slug="${node.slug}"
             role="treeitem">
            <span class="nav-tree__label">${escapeHtml4(node.name)}</span>
            <span class="nav-tree__method-badge method-${methodLower}">${escapeHtml4(node.method || "GET")}</span>
          </a>
        </li>
      `;
  }).join("");
}
function setSidebarActive(slug) {
  document.querySelectorAll(".nav-tree__link, .nav-tree__folder-btn").forEach((el) => {
    el.classList.remove("is-active");
    el.removeAttribute("aria-current");
  });
  const link = document.querySelector(`[data-slug="${slug}"]`);
  if (link) {
    link.classList.add("is-active");
    link.setAttribute("aria-current", "page");
    expandPathToElement(link);
  }
}
function buildNavIndex() {
  const nav = document.getElementById("sidebar-nav");
  if (!nav) return { nav: null, entries: [] };
  const entries = [];
  nav.querySelectorAll(".nav-tree__item").forEach((li) => {
    const isFolder = li.classList.contains("nav-tree__item--folder");
    const labelEl = li.querySelector(
      ":scope > .nav-tree__folder-btn .nav-tree__label, :scope > .nav-tree__link .nav-tree__label"
    );
    const name = (labelEl?.textContent || "").trim().toLowerCase();
    const method = isFolder ? "" : (li.querySelector(":scope > .nav-tree__link .nav-tree__method-badge")?.textContent || "").trim().toLowerCase();
    const ul = isFolder ? li.querySelector(":scope > .nav-tree--nested") : null;
    const parents = [];
    let p = li.parentElement?.closest(".nav-tree__item--folder");
    while (p) {
      parents.push(p);
      p = p.parentElement?.closest(".nav-tree__item--folder");
    }
    entries.push({ li, isFolder, name, method, ul, parents });
  });
  return { nav, entries };
}
function getNavIndex() {
  const nav = document.getElementById("sidebar-nav");
  if (!_navIndex || _navIndexFor !== nav) {
    _navIndex = buildNavIndex();
    _navIndexFor = _navIndex.nav;
  }
  return _navIndex;
}
function snapshotExpanded(entries) {
  const set = /* @__PURE__ */ new Set();
  for (const e of entries) {
    if (e.isFolder && e.ul && !e.ul.classList.contains("is-collapsed")) set.add(e.ul);
  }
  return set;
}
function restoreNav(entries) {
  for (const e of entries) {
    e.li.hidden = false;
    e.li.classList.remove("is-filtered-out");
    if (e.isFolder && e.ul) {
      if (_origExpanded?.has(e.ul)) expandFolder(e.ul, false);
      else collapseFolder(e.ul, false);
    }
  }
  _filterActive = false;
  _origExpanded = null;
}
function filterSidebar(query) {
  const q = query.trim().toLowerCase();
  const { entries } = getNavIndex();
  if (!entries.length) return;
  if (!q) {
    if (_filterActive) restoreNav(entries);
    return;
  }
  if (!_filterActive) {
    _origExpanded = snapshotExpanded(entries);
    _filterActive = true;
  }
  const matchedFolders = /* @__PURE__ */ new Set();
  for (const e of entries) {
    e._self = e.name.includes(q) || e.method && e.method.includes(q);
    if (e._self && e.isFolder) matchedFolders.add(e.li);
  }
  const hasMatchingDescendant = /* @__PURE__ */ new Set();
  for (const e of entries) {
    if (!e._self) continue;
    for (const p of e.parents) hasMatchingDescendant.add(p);
  }
  for (const e of entries) {
    const ancestorMatch = e.parents.some((p) => matchedFolders.has(p));
    const descendantMatch = e.isFolder && hasMatchingDescendant.has(e.li);
    const visible = e._self || ancestorMatch || descendantMatch;
    e.li.hidden = !visible;
    e.li.classList.toggle("is-filtered-out", !visible);
    if (e.isFolder && e.ul) {
      if (visible) expandFolder(e.ul, false);
      else collapseFolder(e.ul, false);
    }
  }
}
function escapeHtml4(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
var _navIndex, _navIndexFor, _filterActive, _origExpanded;
var init_sidebar = __esm({
  "js/render/sidebar.js"() {
    init_docStore();
    init_sidebarCollapse();
    _navIndex = null;
    _navIndexFor = null;
    _filterActive = false;
    _origExpanded = null;
  }
});

// js/features/themeLogo.js
function getCurrentTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}
function updateThemeLogo() {
  const isDark = getCurrentTheme() === "dark";
  const light = document.getElementById("logo-light");
  const dark = document.getElementById("logo-dark");
  if (!light || !dark) return;
  light.setAttribute("aria-hidden", isDark ? "true" : "false");
  dark.setAttribute("aria-hidden", isDark ? "false" : "true");
}
function preloadLogos() {
  [LOGO_LIGHT_URL, LOGO_DARK_URL].forEach((src) => {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  });
}
function initializeThemeLogo() {
  preloadLogos();
  updateThemeLogo();
  if (observer) observer.disconnect();
  observer = new MutationObserver(updateThemeLogo);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"]
  });
}
var LOGO_LIGHT_URL, LOGO_DARK_URL, LOGO_WIDTH, LOGO_HEIGHT, observer;
var init_themeLogo = __esm({
  "js/features/themeLogo.js"() {
    LOGO_LIGHT_URL = "https://cdn.shopify.com/s/files/1/0666/1200/3110/files/flits_light_logo.png?v=1780500564";
    LOGO_DARK_URL = "https://cdn.shopify.com/s/files/1/0666/1200/3110/files/flits_dark_logo.png?v=1780500563";
    LOGO_WIDTH = 96;
    LOGO_HEIGHT = 28;
    observer = null;
  }
});

// js/render/navbar.js
function renderNavbar(container) {
  container.innerHTML = `
    <header class="topbar" role="banner">
      <div class="topbar__inner">
        <button type="button" class="topbar__menu-btn" id="sidebar-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="sidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <a href="#overview" class="topbar__brand" data-nav="overview" aria-label="Flits documentation home">
          <span class="topbar__logo">
            <img
              id="logo-light"
              class="topbar__logo-img topbar__logo-img--light"
              src="${LOGO_LIGHT_URL}"
              width="${LOGO_WIDTH}"
              height="${LOGO_HEIGHT}"
              alt="Flits"
              decoding="async"
              fetchpriority="high"
            />
            <img
              id="logo-dark"
              class="topbar__logo-img topbar__logo-img--dark"
              src="${LOGO_DARK_URL}"
              width="${LOGO_WIDTH}"
              height="${LOGO_HEIGHT}"
              alt="Flits"
              decoding="async"
              aria-hidden="true"
            />
          </span>
        </a>
        <nav class="topbar__breadcrumb" aria-label="Breadcrumb">
          <ol class="breadcrumb" id="breadcrumb"></ol>
        </nav>
        <div class="topbar__actions">
          <div class="search-box topbar__search" role="search">
            <svg class="search-box__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>
            <input type="search" id="global-search" class="search-box__input" placeholder="Search APIs\u2026 (Ctrl+K)" autocomplete="off" aria-label="Search documentation" aria-controls="search-results" aria-expanded="false" />
            <kbd class="search-box__kbd" aria-hidden="true">\u2318K</kbd>
            <div class="search-results" id="search-results" role="listbox" hidden></div>
          </div>

          <!-- Run in Postman -->
          <button type="button" class="dl-btn rip-btn" id="download-collection-btn"
                  aria-label="Run in Postman \u2014 import collection into Postman"
                  title="Run in Postman">
            <!-- Postman play icon (Postman orange) -->
            <svg class="dl-btn__icon rip-btn__icon" width="15" height="15" viewBox="0 0 24 24"
                 fill="none" aria-hidden="true">
              <path d="M5 3l14 9-14 9V3z"
                    fill="currentColor" stroke="currentColor"
                    stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
            <!-- Spinner (CSS: .is-loading) -->
            <svg class="dl-btn__spinner" width="15" height="15" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/>
            </svg>
            <span class="dl-btn__label">Run in Postman</span>
          </button>

          <button type="button" class="icon-btn" id="theme-toggle" aria-label="Toggle dark mode">
            <span class="theme-icon theme-icon--light" aria-hidden="true">\u2600</span>
            <span class="theme-icon theme-icon--dark" aria-hidden="true">\u263E</span>
          </button>
        </div>
      </div>
      <div class="scroll-progress" id="scroll-progress" aria-hidden="true"></div>
    </header>
  `;
}
function updateBreadcrumb(slug) {
  const el = document.getElementById("breadcrumb");
  if (!el) return;
  const crumbs = [{ label: "Flits", slug: "overview" }];
  const doc = docStore.doc;
  if (!doc) return;
  if (slug === "overview") {
    renderBreadcrumbHtml(el, crumbs);
    return;
  }
  const section = docStore.getSectionBySlug(slug);
  if (!section?.data) {
    renderBreadcrumbHtml(el, crumbs);
    return;
  }
  if (section.type === "api") {
    const parents = section.data.breadcrumbs?.slice(0, -1) || [];
    parents.forEach((name, i) => {
      const folderSlug = findFolderSlugForPath(doc.navTree, parents.slice(0, i + 1));
      crumbs.push({ label: name, slug: folderSlug || "overview" });
    });
    crumbs.push({ label: section.data.name, slug: section.data.slug, current: true });
  } else if (section.type === "folder") {
    const parents = section.data.breadcrumbs?.slice(0, -1) || [];
    parents.forEach((name, i) => {
      const folderSlug = findFolderSlugForPath(doc.navTree, parents.slice(0, i + 1));
      crumbs.push({ label: name, slug: folderSlug || "overview" });
    });
    crumbs.push({ label: section.data.name, slug: section.data.slug, current: true });
  }
  renderBreadcrumbHtml(el, crumbs);
}
function findFolderSlugForPath(tree, pathNames) {
  let nodes = tree;
  let slug = "overview";
  for (const name of pathNames) {
    const folder = nodes?.find((n) => n.type === "folder" && n.name === name);
    if (folder) {
      slug = folder.slug;
      nodes = folder.children;
    }
  }
  return slug;
}
function renderBreadcrumbHtml(el, crumbs) {
  el.innerHTML = crumbs.map((c, i) => {
    const isLast = i === crumbs.length - 1 || c.current;
    if (isLast) {
      return `<li class="breadcrumb__item breadcrumb__item--current" aria-current="page">${escapeHtml5(c.label)}</li>`;
    }
    return `<li class="breadcrumb__item"><a href="#${c.slug}" data-nav="${c.slug}">${escapeHtml5(c.label)}</a></li>`;
  }).join('<li class="breadcrumb__sep" aria-hidden="true">/</li>');
}
function escapeHtml5(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
var init_navbar = __esm({
  "js/render/navbar.js"() {
    init_docStore();
    init_themeLogo();
  }
});

// js/render/toc.js
function tocShellHtml() {
  return `
    <aside class="toc-aside" aria-label="On this page">
      <div class="toc-aside__sticky">
        <nav class="toc" id="toc-nav">
          <button type="button" class="toc__label" data-toc-collapse aria-expanded="true" aria-controls="toc-list">
            <span>On this page</span>
            <svg class="toc__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <ul class="toc__list" id="toc-list" role="list"></ul>
        </nav>
      </div>
    </aside>
  `;
}
function renderTocShell(container) {
  container.innerHTML = tocShellHtml();
}
function tocLinkSectionId(link) {
  const href = link.getAttribute("href");
  if (href?.startsWith("#")) return href.slice(1);
  return link.getAttribute("data-toc-link");
}
function setTocActive(anchorId) {
  document.querySelectorAll(".toc__link").forEach((link) => {
    const active = tocLinkSectionId(link) === anchorId;
    link.classList.toggle("is-active", active);
    if (active) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}
var init_toc = __esm({
  "js/render/toc.js"() {
  }
});

// js/state/routeState.js
function setCurrentRoute(slug) {
  currentRoute = slug || "overview";
}
var currentRoute;
var init_routeState = __esm({
  "js/state/routeState.js"() {
    currentRoute = "overview";
  }
});

// js/toc/rightTOC.js
var rightTOC_exports = {};
__export(rightTOC_exports, {
  bindTOCEvents: () => bindTOCEvents,
  buildRightTOC: () => buildRightTOC,
  cleanupTOC: () => cleanupTOC,
  initScrollSpy: () => initScrollSpy,
  scrollToSection: () => scrollToSection
});
function buildRightTOC(container, { initialActiveId } = {}) {
  cleanupTOC();
  const listEl = document.getElementById("toc-list");
  if (!listEl) return;
  _assignProseIds(container);
  const entries = _collectEntries(container);
  listEl.innerHTML = _renderList(entries);
  if (!entries.length) return;
  const onTocClick = (e) => {
    const link = e.target.closest("[data-toc-link]");
    if (!link || !listEl.contains(link)) return;
    e.preventDefault();
    const sectionId = link.getAttribute("data-toc-link");
    if (sectionId) scrollToSection(sectionId, { smooth: true, updateHash: true });
  };
  listEl.addEventListener("click", onTocClick);
  _tocClickCleanup = () => listEl.removeEventListener("click", onTocClick);
  const firstId = initialActiveId && entries.some((e) => e.id === initialActiveId) ? initialActiveId : entries[0].id;
  setTocActive(firstId);
  initScrollSpy(entries, firstId);
  _applyInitialCollapse();
}
function _applyInitialCollapse() {
  const aside = document.querySelector(".toc-aside");
  const btn = aside?.querySelector("[data-toc-collapse]");
  if (!aside || !btn) return;
  const mobile = window.matchMedia("(max-width: 1199px)").matches;
  aside.classList.toggle("is-collapsed", mobile);
  btn.setAttribute("aria-expanded", String(!mobile));
}
function _ensureBreakpointListener() {
  if (_breakpointBound || typeof window.matchMedia !== "function") return;
  _breakpointBound = true;
  const mql = window.matchMedia("(max-width: 1199px)");
  const onChange = () => {
    if (!_spyEntries) return;
    initScrollSpy(_spyEntries, _spyInitialId);
    _applyInitialCollapse();
  };
  if (mql.addEventListener) mql.addEventListener("change", onChange);
  else if (mql.addListener) mql.addListener(onChange);
}
function bindTOCEvents() {
}
function scrollToSection(sectionId, { smooth = true, updateHash = true } = {}) {
  const target = _findTarget(sectionId);
  if (!target) {
    console.warn("[TOC] scrollToSection \u2014 target not found:", sectionId);
    return false;
  }
  _suppressSpy(smooth ? SUPPRESS_SMOOTH : SUPPRESS_INSTANT);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior = smooth && !reducedMotion ? "smooth" : "auto";
  target.scrollIntoView({ behavior, block: "start" });
  if (updateHash && sectionId && currentRoute) {
    const hash = `#${currentRoute}--${sectionId}`;
    if (location.hash !== hash) history.pushState(null, "", hash);
  }
  setTocActive(sectionId);
  return true;
}
function initScrollSpy(entries, initialActiveId) {
  if (_spyCleanup) {
    _spyCleanup();
    _spyCleanup = null;
  }
  _spyEntries = entries;
  _spyInitialId = initialActiveId;
  _ensureBreakpointListener();
  const { el: scroller, isWindow } = _resolveScroller();
  if (!scroller || !entries.length) return;
  let ticking = false;
  const update = () => {
    if (Date.now() < _suppressUntil) return;
    const id = _resolveActive(entries, scroller, isWindow);
    if (id) setTocActive(id);
  };
  const schedule = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  };
  const scrollTarget = isWindow ? window : scroller;
  scrollTarget.addEventListener("scroll", schedule, { passive: true });
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
  if (ro) {
    ro.observe(isWindow ? document.documentElement : scroller);
    const content = document.getElementById("content-root");
    if (content) ro.observe(content);
  }
  _spyCleanup = () => {
    scrollTarget.removeEventListener("scroll", schedule);
    ro?.disconnect();
  };
  requestAnimationFrame(
    () => requestAnimationFrame(() => {
      if (scroller.scrollTop <= SCROLL_TOP_GUARD && initialActiveId) {
        setTocActive(initialActiveId);
      } else {
        update();
      }
    })
  );
}
function cleanupTOC() {
  if (_spyCleanup) {
    _spyCleanup();
    _spyCleanup = null;
  }
  if (_tocClickCleanup) {
    _tocClickCleanup();
    _tocClickCleanup = null;
  }
  _suppressUntil = 0;
}
function _resolveScroller() {
  const pageScroll = document.getElementById("page-scroll");
  if (pageScroll) {
    const oy = getComputedStyle(pageScroll).overflowY;
    if (oy === "auto" || oy === "scroll") {
      return { el: pageScroll, isWindow: false };
    }
  }
  return { el: document.scrollingElement || document.documentElement, isWindow: true };
}
function _topbarOffset() {
  const tb = document.querySelector(".topbar");
  return tb ? tb.getBoundingClientRect().height : 60;
}
function _suppressSpy(ms) {
  _suppressUntil = Date.now() + ms;
}
function _resolveActive(entries, scroller, isWindow) {
  const scrollTop = scroller.scrollTop;
  const maxScroll = scroller.scrollHeight - scroller.clientHeight;
  const refTop = isWindow ? _topbarOffset() : scroller.getBoundingClientRect().top;
  const triggerY = SCROLL_MARGIN_GAP + SPY_TRIGGER_PAD;
  if (scrollTop <= SCROLL_TOP_GUARD) return entries[0].id;
  if (maxScroll > SCROLL_BOT_MIN && scrollTop >= maxScroll - SCROLL_BOT_PAD) {
    return entries[entries.length - 1].id;
  }
  let activeId = entries[0].id;
  for (const entry of entries) {
    if (!entry.el?.isConnected) continue;
    const top = entry.el.getBoundingClientRect().top - refTop;
    if (top <= triggerY) activeId = entry.id;
    else break;
  }
  return activeId;
}
function _findTarget(sectionId) {
  if (!sectionId) return null;
  const pageView = document.getElementById("content-root")?.querySelector(PAGE_VIEW_SEL);
  if (!pageView) return null;
  const byId = document.getElementById(sectionId);
  if (byId && pageView.contains(byId)) return byId;
  const esc = (v) => String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return pageView.querySelector(`${TOC_SECTION_SEL}[id="${esc(sectionId)}"]`) || pageView.querySelector(`[id="${esc(sectionId)}"]`);
}
function _collectEntries(container) {
  const pageView = container?.querySelector(PAGE_VIEW_SEL);
  if (!pageView) return [];
  const type = pageView.dataset?.pageType;
  const seen = /* @__PURE__ */ new Set();
  if (type === "api") return _apiEntries(pageView, seen);
  if (type === "folder" || type === "overview") return _docEntries(pageView, seen);
  return [];
}
function _apiEntries(pageView, seen) {
  const entries = [];
  pageView.querySelectorAll(TOC_SECTION_SEL).forEach((el) => _pushSection(el, entries, seen));
  return entries;
}
function _docEntries(pageView, seen) {
  const sectionTitles = _buildTitleSet(pageView);
  const tocDepth = getDocTocHeadingDepthRange(pageView);
  const nodes = [
    ...pageView.querySelectorAll(`${PROSE_HEADING_SEL}, ${TOC_SECTION_SEL}`)
  ].filter(_isVisible);
  nodes.sort(_docOrder);
  const entries = [];
  for (const node of nodes) {
    if (node.hasAttribute("data-toc-section")) _pushSection(node, entries, seen);
    else if (isDocTocHeadingElement(node, tocDepth)) _pushHeading(node, entries, seen, sectionTitles);
  }
  return entries;
}
function _buildTitleSet(pageView) {
  const set = /* @__PURE__ */ new Set();
  pageView.querySelectorAll(TOC_SECTION_SEL).forEach((el) => {
    const t = el.getAttribute("data-toc-title") || el.querySelector(".page-section__title")?.textContent?.trim();
    if (t) set.add(t.trim().toLowerCase());
  });
  return set;
}
function _pushSection(el, entries, seen) {
  const id = el.id;
  const title = el.getAttribute("data-toc-title") || el.querySelector(".page-section__title")?.textContent?.trim();
  if (!id || !title || seen.has(id)) return;
  seen.add(id);
  entries.push({ id, title, level: el.getAttribute("data-toc-level") || "2", el });
}
function _pushHeading(heading, entries, seen, sectionTitles) {
  const title = heading.textContent?.trim();
  if (!title) return;
  if (sectionTitles?.has(title.toLowerCase())) return;
  let id = heading.id;
  if (!id) {
    id = uniqueSlug(title, seen);
    heading.id = id;
  } else {
    if (seen.has(id)) return;
    seen.add(id);
  }
  const level = heading.tagName?.match(/^H(\d)$/i)?.[1] || "2";
  entries.push({ id, title, level, el: heading });
}
function _isVisible(el) {
  if (!el?.isConnected) return false;
  if (el.closest(EXCLUDED_PROSE)) return false;
  if (el.closest("[hidden]")) return false;
  if (!el.closest(PAGE_VIEW_SEL)) return false;
  if (typeof getComputedStyle === "function") {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden") return false;
  }
  return true;
}
function _docOrder(a, b) {
  if (a === b) return 0;
  const pos = a.compareDocumentPosition(b);
  if (pos & 4) return -1;
  if (pos & 2) return 1;
  return 0;
}
function _assignProseIds(container) {
  const seen = /* @__PURE__ */ new Set();
  container.querySelectorAll(`${TOC_SECTION_SEL}[id]`).forEach((el) => {
    if (el.id) seen.add(el.id);
  });
  container.querySelectorAll(
    `.prose:not(${EXCLUDED_PROSE}) .md-h2, .prose:not(${EXCLUDED_PROSE}) .md-h3, .prose:not(${EXCLUDED_PROSE}) .md-h4`
  ).forEach((el) => {
    if (!_isVisible(el)) return;
    if (el.id) {
      seen.add(el.id);
      return;
    }
    el.id = uniqueSlug(el.textContent || "section", seen);
  });
}
function _renderList(entries) {
  if (!entries.length) {
    return `<li class="toc__item toc__item--muted"><span>No sections</span></li>`;
  }
  return entries.map(
    (e) => `
    <li class="toc__item toc__item--level-${e.level}">
      <a class="toc__link" href="#${_ea(currentRoute)}--${_ea(e.id)}" data-toc-link="${_ea(e.id)}">${_eh(e.title)}</a>
    </li>`
  ).join("");
}
function _eh(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function _ea(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var SCROLL_TOP_GUARD, SCROLL_BOT_MIN, SCROLL_BOT_PAD, SPY_TRIGGER_PAD, SCROLL_MARGIN_GAP, SUPPRESS_SMOOTH, SUPPRESS_INSTANT, PAGE_VIEW_SEL, TOC_SECTION_SEL, EXCLUDED_PROSE, PROSE_HEADING_SEL, _spyCleanup, _suppressUntil, _tocClickCleanup, _spyEntries, _spyInitialId, _breakpointBound;
var init_rightTOC = __esm({
  "js/toc/rightTOC.js"() {
    init_toc();
    init_routeState();
    init_slug();
    init_tocCollector();
    SCROLL_TOP_GUARD = 8;
    SCROLL_BOT_MIN = 48;
    SCROLL_BOT_PAD = 20;
    SPY_TRIGGER_PAD = 16;
    SCROLL_MARGIN_GAP = 28;
    SUPPRESS_SMOOTH = 600;
    SUPPRESS_INSTANT = 150;
    PAGE_VIEW_SEL = ".page-view";
    TOC_SECTION_SEL = "[data-toc-section]";
    EXCLUDED_PROSE = ".prose--api-description";
    PROSE_HEADING_SEL = ".page-body.prose h2.md-h2, .page-body.prose h3.md-h3, .page-body.prose h4.md-h4, #overview-content h2.md-h2, #overview-content h3.md-h3, #overview-content h4.md-h4";
    _spyCleanup = null;
    _suppressUntil = 0;
    _tocClickCleanup = null;
    _spyEntries = null;
    _spyInitialId = null;
    _breakpointBound = false;
  }
});

// js/utils/clipboard.js
var clipboard_exports = {};
__export(clipboard_exports, {
  copyToClipboard: () => copyToClipboard,
  showCopyFeedback: () => showCopyFeedback
});
async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  return ok;
}
function showCopyFeedback(button, successText = "Copied!", duration = 2e3) {
  const labelEl = button.querySelector(".copy-btn__label");
  const originalText = labelEl ? labelEl.textContent : button.textContent;
  const originalAria = button.getAttribute("aria-label");
  button.classList.add("is-copied");
  button.setAttribute("aria-label", successText);
  if (labelEl) {
    labelEl.textContent = successText;
  } else {
    button.textContent = successText;
  }
  setTimeout(() => {
    button.classList.remove("is-copied");
    if (originalAria) button.setAttribute("aria-label", originalAria);
    if (labelEl) {
      labelEl.textContent = originalText;
    } else {
      button.textContent = originalText;
    }
  }, duration);
}
var init_clipboard = __esm({
  "js/utils/clipboard.js"() {
  }
});

// js/render/devPanel.js
function _getToken() {
  try {
    return sessionStorage.getItem("_fdev_token") || "";
  } catch {
    return "";
  }
}
function _saveToken(t) {
  try {
    sessionStorage.setItem("_fdev_token", t);
  } catch {
  }
}
function mountDevPanel(api) {
  const tocRoot = document.getElementById("toc-root");
  const docsLayout = document.querySelector(".docs-layout");
  if (tocRoot) {
    tocRoot.querySelector(".dev-panel-section")?.remove();
    const wrapper = document.createElement("div");
    wrapper.className = "dev-panel-section";
    wrapper.innerHTML = _buildPanel(api);
    tocRoot.appendChild(wrapper);
    tocRoot.classList.add("toc-root--with-panel");
    const panel = wrapper.querySelector(".dev-panel");
    if (panel) {
      _applyEnvToPanel(panel);
      _syncParamsToUrl(panel);
    }
  }
  if (docsLayout) docsLayout.classList.add("docs-layout--api-panel");
}
function unmountDevPanel() {
  const tocRoot = document.getElementById("toc-root");
  const docsLayout = document.querySelector(".docs-layout");
  if (tocRoot) {
    tocRoot.querySelector(".dev-panel-section")?.remove();
    tocRoot.classList.remove("toc-root--with-panel");
  }
  if (docsLayout) docsLayout.classList.remove("docs-layout--api-panel");
}
function _applyEnvToPanel(panel) {
  const apply = (input) => {
    if (!input || !input.dataset.template) return;
    if (input.dataset.userModified) return;
    const resolved = applyEnv(input.dataset.template);
    if (input.value !== resolved) input.value = resolved;
  };
  apply(panel.querySelector("[data-tryit-url]"));
  panel.querySelectorAll('[data-tryit-params="headers"] .tryit__val').forEach(apply);
  panel.querySelectorAll('[data-tryit-params="query"]   .tryit__val').forEach(apply);
  panel.querySelectorAll('[data-tryit-params="body"] .tryit__bval').forEach(apply);
  apply(panel.querySelector("[data-tryit-body]"));
}
function refreshAllTryItPanels() {
  document.querySelectorAll(".dev-panel").forEach((panel) => {
    const tryItPane = panel.querySelector('[data-pane="tryit"]');
    if (!tryItPane || tryItPane.hidden) return;
    _applyEnvToPanel(panel);
    _syncParamsToUrl(panel);
  });
}
function _syncParamsToUrl(panel) {
  if (panel._syncing) return;
  const urlInput = panel.querySelector("[data-tryit-url]");
  if (!urlInput) return;
  const baseUrl = urlInput.value.split("?")[0];
  const pairs = [
    ...[...panel.querySelectorAll('[data-tryit-params="query"] .tryit__row')].map((r) => [
      r.querySelector(".tryit__key")?.value?.trim() || "",
      r.querySelector(".tryit__val")?.value?.trim() || ""
    ]).filter(([k]) => k),
    ..._lockedPairs(panel)
    // fixed params are always part of the URL
  ];
  panel._syncing = true;
  if (pairs.length) {
    const qs = pairs.map(([k, v]) => `${k}=${v}`).join("&");
    urlInput.value = `${baseUrl}?${qs}`;
  } else {
    urlInput.value = baseUrl;
  }
  panel._syncing = false;
}
function _syncUrlToParams(panel) {
  if (panel._syncing) return;
  const urlInput = panel.querySelector("[data-tryit-url]");
  const container = panel.querySelector('[data-tryit-params="query"]');
  if (!urlInput || !container) return;
  const qIdx = urlInput.value.indexOf("?");
  panel._syncing = true;
  if (qIdx === -1) {
    container.innerHTML = "";
  } else {
    let params;
    try {
      params = new URLSearchParams(urlInput.value.slice(qIdx + 1));
    } catch {
      panel._syncing = false;
      return;
    }
    const locked = _lockedKeySet(panel);
    container.innerHTML = "";
    for (const [k, v] of params.entries()) {
      if (locked.has(k)) continue;
      container.insertAdjacentHTML("beforeend", _row(k, v));
    }
  }
  panel._syncing = false;
}
function handleDevPanelInputSync(target) {
  const panel = target.closest(".dev-panel");
  if (!panel) return;
  if (target.hasAttribute("data-tryit-url")) {
    _syncUrlToParams(panel);
    return;
  }
  if (target.closest('[data-tryit-params="query"]') && (target.classList.contains("tryit__key") || target.classList.contains("tryit__val"))) {
    _syncParamsToUrl(panel);
  }
}
function handleDevPanelInteraction(target) {
  const panel = target.closest(".dev-panel");
  if (!panel) return;
  if (target.closest("[data-panel-tab]")) {
    _switchTab(target.closest("[data-panel-tab]"), panel);
    return;
  }
  if (target.hasAttribute("data-lang-select")) {
    _switchLang(target, panel);
    return;
  }
  if (target.hasAttribute("data-resp-select")) {
    _switchResp(target, panel);
    return;
  }
  const copyBtn = target.closest(".dev-panel__copy");
  if (copyBtn) {
    _copy(copyBtn, panel);
    return;
  }
  if (target.classList.contains("tryit__opt-cb")) {
    const field = target.closest(".tryit__field");
    const inp = field?.querySelector(".tryit__bval");
    if (inp) inp.disabled = !target.checked;
    return;
  }
  if (target.closest("[data-tryit-add]")) {
    _addParamRow(target.closest("[data-tryit-add]"));
    return;
  }
  if (target.closest("[data-tryit-del]")) {
    target.closest(".tryit__row")?.remove();
    _syncParamsToUrl(panel);
    return;
  }
  if (target.closest("[data-tryit-send]")) {
    _send(panel);
    return;
  }
  if (target.closest("[data-tryit-clear]")) {
    _clearResponse(panel);
    return;
  }
  if (target.closest("[data-tryit-toggle-pw]")) {
    const inp = panel.querySelector("[data-tryit-token]");
    if (inp) inp.type = inp.type === "password" ? "text" : "password";
    return;
  }
}
function _buildPanel(api) {
  const samples = api.codeSamples || { curl: api.curl || "" };
  const respList = _orderedResponses(api.responses);
  return `
    <aside class="dev-panel"
           aria-label="Developer panel"
           data-api-slug="${escapeHtml3(api.slug)}"
           data-api-method="${escapeHtml3((api.method || "GET").toUpperCase())}"
           data-api-body-mode="${escapeHtml3(api.bodyMode || "formdata")}">

      <div class="dev-panel__stack">

        <!-- \u2500\u2500 Tab bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
        <div class="dev-panel__tabbar" role="tablist">
          <button type="button" class="dev-panel__tab is-active"
                  data-panel-tab="code" role="tab" aria-selected="true">
            Code
          </button>
          <button type="button" class="dev-panel__tab"
                  data-panel-tab="tryit" role="tab" aria-selected="false">
            Try It
          </button>
        </div>

        <!-- \u2500\u2500 Code Samples pane \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
        <div class="dev-panel__pane" data-pane="code">
          ${_buildRequestCard(samples)}
          ${respList.length ? _buildResponseCard(respList) : ""}
        </div>

        <!-- \u2500\u2500 Try It pane \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
        <div class="dev-panel__pane" data-pane="tryit" hidden>
          ${_buildTryItPane(api)}
        </div>

      </div>
    </aside>`;
}
function _buildRequestCard(samples) {
  const firstLang = LANGUAGES[0].id;
  const hlLang = firstLang === "curl" ? "bash" : firstLang;
  const code = samples[firstLang] || samples.curl || "";
  const hl = highlightCode(code, hlLang);
  const options = LANGUAGES.map((l) => `<option value="${escapeHtml3(l.id)}">${escapeHtml3(l.label)}</option>`).join("");
  return `
    <div class="dev-panel__card">
      <div class="dev-panel__card-head">
        <span class="dev-panel__card-label">Request</span>
        <div class="dev-panel__controls">
          <div class="dev-panel__select-wrap">
            <select class="dev-panel__select dev-panel__select--lang"
                    data-lang-select aria-label="Select code language">
              ${options}
            </select>
          </div>
          <button type="button" class="dev-panel__copy"
                  data-copy-role="request" aria-label="Copy request code">
            <span class="copy-btn__label">Copy</span>
          </button>
        </div>
      </div>
      <div class="dev-panel__code-wrap" data-panel-code>
        <pre class="dev-panel__pre" data-language="${escapeHtml3(hlLang)}"><code>${hl}</code></pre>
      </div>
    </div>`;
}
function _buildResponseCard(list) {
  const firstCls = _respClass(String(list[0].code));
  const options = list.map(({ code, r }, i) => {
    const label = r.name || `${code}${r.status ? " " + r.status : ""}`;
    return `<option value="${i}" data-code="${escapeHtml3(String(code))}">${escapeHtml3(_truncate(label, 54))}</option>`;
  }).join("");
  const panels = list.map(({ code, r }, i) => {
    const hl = highlightCode(r.body || "", "json");
    const status = escapeHtml3(r.status || "");
    const name = escapeHtml3(_truncate(r.name || "", 56));
    const cls = _respClass(code);
    return `
      <div class="dev-panel__resp-panel${i === 0 ? " is-active" : ""}"
           data-resp-panel="${i}" ${i !== 0 ? "hidden" : ""}>
        ${status || name ? `
        <p class="dev-panel__resp-meta">
          <span class="dev-panel__resp-dot ${cls}"></span>
          ${status}${name ? ` \u2014 ${name}` : ""}
        </p>` : ""}
        <pre class="dev-panel__pre" data-language="json"><code>${hl}</code></pre>
      </div>`;
  }).join("");
  return `
    <div class="dev-panel__card">
      <div class="dev-panel__card-head">
        <span class="dev-panel__card-label">Response</span>
        <div class="dev-panel__controls">
          <div class="dev-panel__select-wrap">
            <select class="dev-panel__select dev-panel__select--resp ${firstCls}"
                    data-resp-select aria-label="Select response status">
              ${options}
            </select>
          </div>
          <button type="button" class="dev-panel__copy"
                  data-copy-role="response" aria-label="Copy response">
            <span class="copy-btn__label">Copy</span>
          </button>
        </div>
      </div>
      <div class="dev-panel__code-wrap" data-panel-response>${panels}</div>
    </div>`;
}
function _buildTryItPane(api) {
  const method = (api.method || "GET").toUpperCase();
  const methodLower = method.toLowerCase();
  const fullUrl = api.urlDisplay || api.urlRaw || "";
  const baseUrl = fullUrl.includes("?") ? fullUrl.split("?")[0] : fullUrl;
  const headers = (api.headers || []).filter((h) => h.key && !h.disabled);
  const qParams = (api.queryParams || []).filter((q) => q.key);
  const qEditable = qParams.filter((q) => !q.locked);
  const qLocked = qParams.filter((q) => q.locked);
  const noBodyMethod = ["GET", "HEAD"].includes(method);
  const bodyFields = (api.bodyParams || []).filter((p) => p.key && !p.disabled);
  const hasFormBody = bodyFields.length > 0 && !noBodyMethod;
  const hasRawBody = !hasFormBody && !!api.bodyRaw && !noBodyMethod;
  const savedToken = _getToken();
  return `
    <div class="tryit">

      <!-- URL bar \u2014 visual preview, rebuilt by _syncParamsToUrl -->
      <div class="tryit__url-bar">
        <span class="tryit__badge method-${methodLower}">${escapeHtml3(method)}</span>
        <input type="text" class="tryit__url"
               value="${escapeHtml3(baseUrl)}"
               data-tryit-url
               data-template="${escapeHtml3(baseUrl)}"
               spellcheck="false"
               aria-label="Request URL" />
      </div>

      <!-- Authorization -->
      <details class="tryit__section"${savedToken || api.auth ? " open" : ""}>
        <summary class="tryit__section-hd">
          <span class="tryit__section-name">Authorization</span>
          <span class="tryit__chip">${api.auth ? "Bearer" : "optional"}</span>
        </summary>
        <div class="tryit__section-bd">
          <label class="tryit__lbl">Bearer Token</label>
          <div class="tryit__token-wrap">
            <input type="password" class="tryit__input" data-tryit-token
                   value="${escapeHtml3(savedToken)}"
                   placeholder="Paste your token here\u2026"
                   autocomplete="off" />
            <button type="button" class="tryit__eye" data-tryit-toggle-pw
                    aria-label="Show/hide token">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>
      </details>

      <!-- Headers -->
      <details class="tryit__section"${headers.length ? " open" : ""}>
        <summary class="tryit__section-hd">
          <span class="tryit__section-name">Headers</span>
          ${headers.length ? `<span class="tryit__chip">${headers.length}</span>` : ""}
        </summary>
        <div class="tryit__section-bd">
          <div class="tryit__rows" data-tryit-params="headers">
            ${headers.map((h) => _row(h.key, h.value)).join("")}
          </div>
          <button type="button" class="tryit__add" data-tryit-add="headers">
            + Add header
          </button>
        </div>
      </details>

      <!-- Query Parameters -->
      <details class="tryit__section"${qParams.length ? " open" : ""}>
        <summary class="tryit__section-hd">
          <span class="tryit__section-name">Query Parameters</span>
          ${qParams.length ? `<span class="tryit__chip">${qParams.length}</span>` : ""}
        </summary>
        <div class="tryit__section-bd">
          <div class="tryit__rows" data-tryit-params="query">
            ${qEditable.map((p) => _row(p.key, p.value)).join("")}
          </div>
          <button type="button" class="tryit__add" data-tryit-add="query">
            + Add parameter
          </button>
          ${qLocked.length ? `
          <div class="tryit__locked" data-tryit-locked>
            <p class="tryit__locked-label">
              ${_svgLock()} Fixed \u2014 always sent, cannot be edited
            </p>
            ${qLocked.map((p) => _lockedRow(p.key, p.value)).join("")}
          </div>` : ""}
        </div>
      </details>

      ${hasFormBody ? `
      <!-- Body (form-data / urlencoded) \u2014 editable labelled fields -->
      <details class="tryit__section" open>
        <summary class="tryit__section-hd">
          <span class="tryit__section-name">Request Body</span>
          <span class="tryit__chip">${escapeHtml3(api.bodyMode === "urlencoded" ? "form-urlencoded" : "form-data")}</span>
        </summary>
        <div class="tryit__section-bd" data-tryit-params="body">
          ${bodyFields.map(_bodyField).join("")}
        </div>
      </details>` : hasRawBody ? `
      <!-- Body -->
      <details class="tryit__section" open>
        <summary class="tryit__section-hd">
          <span class="tryit__section-name">Request Body</span>
          <span class="tryit__chip">JSON</span>
        </summary>
        <div class="tryit__section-bd">
          <textarea class="tryit__body" data-tryit-body
                    data-template="${escapeHtml3(api.bodyRaw || "")}"
                    spellcheck="false">${escapeHtml3(api.bodyRaw || "")}</textarea>
        </div>
      </details>` : ""}

      <!-- Send -->
      <div class="tryit__actions">
        <button type="button" class="tryit__send" data-tryit-send>
          Send Request
        </button>
        <button type="button" class="tryit__clear" data-tryit-clear hidden>
          Clear
        </button>
      </div>

      <!-- Live Response (hidden until first send) -->
      <div class="tryit__response" data-tryit-response hidden>
        <div class="tryit__resp-bar">
          <span class="tryit__status" data-tryit-status></span>
          <span class="tryit__elapsed" data-tryit-elapsed></span>
          <button type="button" class="dev-panel__copy tryit__resp-copy"
                  data-copy-role="tryit" aria-label="Copy response">
            <span class="copy-btn__label">Copy</span>
          </button>
        </div>
        <pre class="dev-panel__pre tryit__resp-body"
             data-tryit-resp-body></pre>
      </div>

    </div>`;
}
function _row(key = "", value = "") {
  return `
    <div class="tryit__row">
      <input type="text" class="tryit__key"  value="${escapeHtml3(key)}"   placeholder="Key" />
      <input type="text" class="tryit__val"  value="${escapeHtml3(value)}" placeholder="Value"
             data-template="${escapeHtml3(value)}" />
      <button type="button" class="tryit__del" data-tryit-del aria-label="Remove">\xD7</button>
    </div>`;
}
function _bodyField(param) {
  const key = param.key || "";
  const val = param.value || "";
  const hint = param.description || "";
  const placeholder = param.placeholder || "";
  const cbId = `tryit-opt-${key.replace(/[^a-z0-9]/gi, "_")}`;
  return `
    <div class="tryit__field">
      <div class="tryit__field-head">
        <input type="checkbox" class="tryit__opt-cb"
               id="${escapeHtml3(cbId)}" data-bkey="${escapeHtml3(key)}" />
        <label class="tryit__lbl tryit__lbl--opt" for="${escapeHtml3(cbId)}">${escapeHtml3(key)}</label>
      </div>
      <input type="text" class="tryit__input tryit__bval"
             data-bkey="${escapeHtml3(key)}"
             value="${escapeHtml3(val)}"
             data-template="${escapeHtml3(val)}"
             placeholder="${escapeHtml3(placeholder)}"
             spellcheck="false" autocomplete="off"
             disabled />
      ${hint ? `<p class="tryit__hint">${escapeHtml3(hint)}</p>` : ""}
    </div>`;
}
function _lockedRow(key = "", value = "") {
  return `
    <div class="tryit__row tryit__row--locked"
         data-locked-key="${escapeHtml3(key)}" data-locked-value="${escapeHtml3(value)}">
      <input type="text" class="tryit__key" value="${escapeHtml3(key)}" readonly tabindex="-1"
             aria-label="Fixed parameter name" />
      <input type="text" class="tryit__val" value="${escapeHtml3(value)}" readonly tabindex="-1"
             aria-label="Fixed parameter value" />
      <span class="tryit__lock" title="Fixed parameter \u2014 cannot be edited">${_svgLock()}</span>
    </div>`;
}
function _svgLock() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>`;
}
function _lockedPairs(panel) {
  return [...panel.querySelectorAll("[data-tryit-locked] .tryit__row--locked")].map((r) => [r.getAttribute("data-locked-key") || "", r.getAttribute("data-locked-value") || ""]).filter(([k]) => k);
}
function _lockedKeySet(panel) {
  return new Set(_lockedPairs(panel).map(([k]) => k));
}
function _switchTab(tab, panel) {
  const target = tab.getAttribute("data-panel-tab");
  panel.querySelectorAll("[data-panel-tab]").forEach((t) => {
    const on = t === tab;
    t.classList.toggle("is-active", on);
    t.setAttribute("aria-selected", String(on));
  });
  panel.querySelectorAll(".dev-panel__pane").forEach((p) => {
    p.hidden = p.getAttribute("data-pane") !== target;
  });
  if (target === "tryit") {
    _applyEnvToPanel(panel);
    _syncParamsToUrl(panel);
  }
}
function _switchLang(select, panel) {
  const lang = select.value;
  const slug = panel.getAttribute("data-api-slug");
  const hlLang = lang === "curl" ? "bash" : lang;
  Promise.resolve().then(() => (init_docStore(), docStore_exports)).then(({ docStore: docStore2 }) => {
    const api = docStore2.getApiBySlug(slug);
    if (!api?.codeSamples) return;
    const code = api.codeSamples[lang] || "";
    const wrap = panel.querySelector("[data-panel-code]");
    if (!wrap) return;
    const codeEl = wrap.querySelector("code");
    const preEl = wrap.querySelector("pre");
    if (codeEl) codeEl.innerHTML = highlightCode(code, hlLang);
    if (preEl) preEl.setAttribute("data-language", hlLang);
  });
}
function _switchResp(select, panel) {
  const idx = select.value;
  const code = select.selectedOptions?.[0]?.dataset.code || "";
  select.className = select.className.replace(/\bresp-\w+/g, "").trim();
  select.classList.add(_respClass(code));
  panel.querySelectorAll(".dev-panel__resp-panel").forEach((p) => {
    const on = p.getAttribute("data-resp-panel") === idx;
    p.classList.toggle("is-active", on);
    p.hidden = !on;
  });
}
function _copy(btn, panel) {
  const role = btn.getAttribute("data-copy-role");
  let text = "";
  if (role === "request")
    text = panel.querySelector("[data-panel-code] code")?.textContent || "";
  else if (role === "response")
    text = panel.querySelector("[data-panel-response] .dev-panel__resp-panel.is-active code")?.textContent || "";
  else if (role === "tryit")
    text = panel.querySelector("[data-tryit-resp-body]")?.textContent || "";
  if (!text) return;
  Promise.resolve().then(() => (init_clipboard(), clipboard_exports)).then(({ copyToClipboard: copyToClipboard2, showCopyFeedback: showCopyFeedback2 }) => {
    copyToClipboard2(text).then(() => showCopyFeedback2(btn));
  });
}
function _addParamRow(btn) {
  const type = btn.getAttribute("data-tryit-add");
  const list = btn.closest(".tryit__section-bd")?.querySelector(`[data-tryit-params="${type}"]`);
  if (!list) return;
  list.insertAdjacentHTML("beforeend", _row());
  list.lastElementChild?.querySelector(".tryit__key")?.focus();
}
async function _send(panel) {
  const sendBtn = panel.querySelector("[data-tryit-send]");
  const responseEl = panel.querySelector("[data-tryit-response]");
  const rawUrl = (panel.querySelector("[data-tryit-url]")?.value || "").trim();
  if (!rawUrl) return;
  const baseUrl = rawUrl.split("?")[0];
  const token = (panel.querySelector("[data-tryit-token]")?.value || "").trim();
  _saveToken(token);
  const method = panel.getAttribute("data-api-method") || "GET";
  const headers = {};
  panel.querySelectorAll('[data-tryit-params="headers"] .tryit__row').forEach((r) => {
    const k = r.querySelector(".tryit__key")?.value?.trim();
    const v = r.querySelector(".tryit__val")?.value?.trim() || "";
    if (!k) return;
    if (/^\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}$/.test(v)) return;
    headers[k] = v;
  });
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const qPairs = [
    ...[...panel.querySelectorAll('[data-tryit-params="query"] .tryit__row')].map((r) => [
      r.querySelector(".tryit__key")?.value?.trim() || "",
      r.querySelector(".tryit__val")?.value?.trim() || ""
    ]).filter(([k]) => k),
    ..._lockedPairs(panel)
    // always send fixed params (e.g. filters)
  ];
  let finalUrl = baseUrl;
  if (qPairs.length) {
    const qs = qPairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
    finalUrl = `${baseUrl}?${qs}`;
  }
  const fetchOpts = { method, headers };
  const bodyFieldEls = [...panel.querySelectorAll('[data-tryit-params="body"] .tryit__bval')];
  if (bodyFieldEls.length && !["GET", "HEAD"].includes(method)) {
    const bodyMode = panel.getAttribute("data-api-body-mode") || "formdata";
    if (bodyMode === "urlencoded") {
      const params = new URLSearchParams();
      bodyFieldEls.forEach((inp) => {
        const field = inp.closest(".tryit__field");
        const cb = field?.querySelector(".tryit__opt-cb");
        if (cb && !cb.checked) return;
        const k = inp.getAttribute("data-bkey");
        if (k) params.append(k, inp.value);
      });
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      fetchOpts.body = params.toString();
    } else {
      const fd = new FormData();
      bodyFieldEls.forEach((inp) => {
        const field = inp.closest(".tryit__field");
        const cb = field?.querySelector(".tryit__opt-cb");
        if (cb && !cb.checked) return;
        const k = inp.getAttribute("data-bkey");
        if (k) fd.append(k, inp.value);
      });
      delete headers["Content-Type"];
      delete headers["content-type"];
      fetchOpts.body = fd;
    }
  } else {
    const bodyText = panel.querySelector("[data-tryit-body]")?.value?.trim() || null;
    if (bodyText && !["GET", "HEAD"].includes(method)) fetchOpts.body = bodyText;
  }
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending\u2026";
  }
  if (responseEl) responseEl.hidden = true;
  const t0 = performance.now();
  try {
    const resp = await fetch(finalUrl, fetchOpts);
    const elapsed = Math.round(performance.now() - t0);
    const body = await resp.text();
    _showResponse(panel, { ok: true, status: resp.status, statusText: resp.statusText, body, elapsed });
  } catch (err) {
    const elapsed = Math.round(performance.now() - t0);
    const isNetworkOrCors = err instanceof TypeError;
    const body = isNetworkOrCors ? `Could not reach the API from the browser.

This usually means the request was blocked by CORS (the API must allow requests from this documentation's domain) or the network is unavailable.

The cURL / code samples above run fine from a terminal or server \u2014 Try It is limited to APIs that permit cross-origin browser requests.

(${err.message || "Failed to fetch"})` : err.message || "Request failed";
    _showResponse(panel, { ok: false, body, elapsed });
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send Request";
    }
    panel.querySelector("[data-tryit-clear]").hidden = false;
  }
}
function _showResponse(panel, { ok, status, statusText, body, elapsed }) {
  const responseEl = panel.querySelector("[data-tryit-response]");
  const statusEl = panel.querySelector("[data-tryit-status]");
  const elapsedEl = panel.querySelector("[data-tryit-elapsed]");
  const bodyEl = panel.querySelector("[data-tryit-resp-body]");
  if (!responseEl) return;
  responseEl.hidden = false;
  if (elapsedEl) elapsedEl.textContent = `${elapsed}ms`;
  if (ok) {
    const cls = status >= 200 && status < 300 ? "resp-2xx" : status >= 400 && status < 500 ? "resp-4xx" : "resp-5xx";
    if (statusEl) {
      statusEl.textContent = `${status} ${statusText}`;
      statusEl.className = `tryit__status ${cls}`;
    }
    let display = body;
    try {
      display = JSON.stringify(JSON.parse(body), null, 2);
    } catch {
    }
    if (bodyEl) bodyEl.innerHTML = highlightCode(display, "json");
  } else {
    if (statusEl) {
      statusEl.textContent = "Error";
      statusEl.className = "tryit__status resp-5xx";
    }
    if (bodyEl) bodyEl.textContent = body;
  }
  responseEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function _clearResponse(panel) {
  const responseEl = panel.querySelector("[data-tryit-response]");
  const clearBtn = panel.querySelector("[data-tryit-clear]");
  if (responseEl) responseEl.hidden = true;
  if (clearBtn) clearBtn.hidden = true;
}
function _groupResponses(responses) {
  const map = /* @__PURE__ */ new Map();
  (responses || []).forEach((r) => {
    if (r.isExample && /curl/i.test(r.name || "")) return;
    const code = r.code || "other";
    if (!map.has(code)) map.set(code, []);
    map.get(code).push(r);
  });
  return new Map([...map.entries()].sort((a, b) => {
    const av = typeof a[0] === "number" ? a[0] : 999;
    const bv = typeof b[0] === "number" ? b[0] : 999;
    return av - bv;
  }));
}
function _orderedResponses(responses) {
  const flat = [];
  for (const [code, items] of _groupResponses(responses)) {
    for (const r of items) flat.push({ code, r });
  }
  return flat;
}
function _respClass(code) {
  const n = Number(code);
  if (n >= 200 && n < 300) return "resp-2xx";
  if (n >= 400 && n < 500) return "resp-4xx";
  if (n >= 500) return "resp-5xx";
  return "resp-other";
}
function _truncate(str, max) {
  const s = String(str);
  return s.length > max ? `${s.slice(0, max)}\u2026` : s;
}
var init_devPanel = __esm({
  "js/render/devPanel.js"() {
    init_codeSamples();
    init_highlighter();
    init_contentHelpers();
    init_envStore();
  }
});

// js/render/codeBlocks.js
function handleSampleBlockInteraction(target) {
  const select = target.closest(".sample-lang-select");
  if (select) {
    const lang = select.value;
    const slug = select.getAttribute("data-api-slug");
    Promise.resolve().then(() => (init_docStore(), docStore_exports)).then(({ docStore: docStore2 }) => {
      const api = docStore2.getApiBySlug(slug);
      if (!api?.codeSamples) return;
      const code = api.codeSamples[lang] || "";
      const container = select.closest(".sample-block")?.querySelector("[data-sample-container] code");
      if (container) {
        const hlLang = lang === "curl" ? "bash" : lang;
        container.innerHTML = highlightCode(code, hlLang);
      }
    });
    return;
  }
  const tab = target.closest("[data-sample-tab]");
  if (tab) {
    const group = tab.getAttribute("data-sample-tab");
    const value = tab.getAttribute("data-sample-value");
    const block = tab.closest(".sample-block--responses");
    block?.querySelectorAll(`[data-sample-tab="${group}"]`).forEach((t) => {
      t.classList.toggle("is-active", t === tab);
      t.setAttribute("aria-selected", String(t === tab));
    });
    block?.querySelectorAll(`[data-sample-panel="${group}"]`).forEach((p) => {
      const active = p.getAttribute("data-sample-value") === value;
      p.classList.toggle("is-active", active);
      p.hidden = !active;
    });
  }
}
var init_codeBlocks = __esm({
  "js/render/codeBlocks.js"() {
    init_codeSamples();
    init_highlighter();
    init_contentHelpers();
  }
});

// js/features/router.js
var router_exports = {};
__export(router_exports, {
  currentRoute: () => currentRoute,
  initPageInteractions: () => initPageInteractions,
  initRouter: () => initRouter,
  navigateToRoute: () => navigateToRoute,
  parseHash: () => parseHash,
  scrollToAnchor: () => scrollToAnchor
});
function initRouter() {
  window.addEventListener("hashchange", () => {
    const { slug, anchor } = parseHash();
    if (slug === currentRoute) {
      if (anchor) {
        requestAnimationFrame(
          () => scrollToSection(anchor, { smooth: false, updateHash: true })
        );
      }
      return;
    }
    navigateToRoute(slug, { anchor, updateHash: false });
  });
  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      e.preventDefault();
      navigateToRoute(nav.getAttribute("data-nav"));
    }
  });
}
function parseHash() {
  const raw = location.hash.slice(1);
  if (!raw) return { slug: currentRoute || "overview", anchor: null };
  const sep = raw.indexOf("--");
  if (sep > -1) {
    return {
      slug: raw.slice(0, sep) || "overview",
      anchor: raw.slice(sep + 2) || null
    };
  }
  if (_isInPageFragment(raw)) {
    return { slug: currentRoute || "overview", anchor: raw };
  }
  if (docStore.getSectionBySlug(raw)) {
    return { slug: raw, anchor: null };
  }
  return { slug: raw, anchor: null };
}
function _isInPageFragment(id) {
  if (!id) return false;
  const pageView = document.getElementById("content-root")?.querySelector(".page-view");
  if (!pageView) return false;
  const el = document.getElementById(id);
  return el != null && pageView.contains(el);
}
function navigateToRoute(slug, options = {}) {
  const { anchor = null, updateHash = true, animate = true } = options;
  if (!slug) slug = "overview";
  const root = document.getElementById("content-root");
  const scroller = document.getElementById("page-scroll");
  if (!root) return;
  cleanupTOC();
  setCurrentRoute(slug);
  if (updateHash) {
    const hash = anchor ? `#${slug}--${anchor}` : `#${slug}`;
    if (location.hash !== hash) history.pushState(null, "", hash);
  }
  const section = docStore.getSectionBySlug(slug);
  if (!section) {
    root.innerHTML = renderPage(null);
    unmountDevPanel();
    buildRightTOC(root);
    setSidebarActive(slug);
    updateBreadcrumb(slug);
    setPageTitle(null);
    return;
  }
  root.innerHTML = renderPage(section);
  enhanceProseHeadings(root);
  setSidebarActive(slug);
  updateBreadcrumb(slug);
  setPageTitle(section);
  if (scroller) scroller.scrollTop = 0;
  if (animate) {
    root.classList.add("page-view--enter");
    requestAnimationFrame(() => root.classList.remove("page-view--enter"));
  }
  if (section.type === "api") {
    buildRightTOC(root, { initialActiveId: anchor || void 0 });
    mountDevPanel(section.data);
    if (anchor) {
      requestAnimationFrame(
        () => requestAnimationFrame(
          () => scrollToSection(anchor, { smooth: false, updateHash: false })
        )
      );
    }
  } else {
    unmountDevPanel();
    buildRightTOC(root, { initialActiveId: anchor || void 0 });
    if (anchor) {
      requestAnimationFrame(
        () => requestAnimationFrame(
          () => scrollToSection(anchor, { smooth: false, updateHash: false })
        )
      );
    }
  }
}
function setPageTitle(section) {
  if (!section || section.type === "overview") {
    document.title = BASE_TITLE;
    return;
  }
  const name = section.data?.name;
  document.title = name ? `${name} \u2014 Flits API Docs` : BASE_TITLE;
}
function scrollToAnchor(id, smooth = true) {
  scrollToSection(id, { smooth, updateHash: true });
}
function initPageInteractions() {
  document.addEventListener("click", (e) => {
    handleDevPanelInteraction(e.target);
    if (e.target.closest(".sample-lang-select") || e.target.closest("[data-sample-tab]")) {
      handleSampleBlockInteraction(e.target);
    }
    const copyBtn = e.target.closest(".copy-btn");
    if (copyBtn && !copyBtn.classList.contains("dev-panel__copy")) {
      let codeEl;
      if (copyBtn.dataset.copyTarget === "response") {
        codeEl = copyBtn.closest(".sample-block--responses")?.querySelector(".sample-tab-panel:not([hidden]) code");
      } else if (copyBtn.dataset.copyTarget === "sample") {
        codeEl = copyBtn.closest(".sample-block")?.querySelector("[data-sample-container] code");
      } else {
        codeEl = copyBtn.closest(".sample-block, .code-panel")?.querySelector("code");
      }
      if (codeEl) {
        Promise.resolve().then(() => (init_clipboard(), clipboard_exports)).then(({ copyToClipboard: copyToClipboard2, showCopyFeedback: showCopyFeedback2 }) => {
          copyToClipboard2(codeEl.textContent).then(() => showCopyFeedback2(copyBtn));
        });
      }
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.classList?.contains("sample-lang-select")) {
      handleSampleBlockInteraction(e.target);
    }
    handleDevPanelInteraction(e.target);
  });
  document.addEventListener("input", (e) => {
    const input = e.target;
    if (!input.closest?.(".dev-panel")) return;
    if (input.hasAttribute("data-template")) {
      if (input.value !== "") {
        input.dataset.userModified = "1";
      } else {
        delete input.dataset.userModified;
      }
    }
    handleDevPanelInputSync(input);
  });
}
var BASE_TITLE;
var init_router = __esm({
  "js/features/router.js"() {
    init_docStore();
    init_pageView();
    init_sidebar();
    init_navbar();
    init_rightTOC();
    init_devPanel();
    init_codeBlocks();
    init_routeState();
    BASE_TITLE = "Flits \u2014 API Documentation";
  }
});

// js/data/docStore.js
var docStore_exports = {};
__export(docStore_exports, {
  docStore: () => docStore
});
function notify() {
  listeners.forEach((fn) => {
    try {
      fn(_state);
    } catch (e) {
      console.error("[docStore] listener error", e);
    }
  });
}
function findFolderBySlug(nodes, slug) {
  for (const n of nodes || []) {
    if (n.type === "folder" && n.slug === slug) return n;
    const found = findFolderBySlug(n.children, slug);
    if (found) return found;
  }
  return null;
}
function getFolderData(slug) {
  const section = _state.doc?.sections?.find(
    (s) => s.type === "folder" && s.data?.slug === slug
  );
  return section?.data ?? null;
}
function exposeGlobal(doc) {
  window.FlitsDoc = {
    version: "2.0.0",
    store: docStore,
    getDoc: () => doc,
    getApiById: (id) => docStore.getApiById(id),
    getApiBySlug: (slug) => docStore.getApiBySlug(slug),
    getAllApis: () => docStore.getAllApis(),
    search: (query, limit = 20) => searchDocs(query, limit),
    toAIExport: () => docStore.toAIExport(),
    navigate: (slug, anchor) => {
      Promise.resolve().then(() => (init_router(), router_exports)).then(({ navigateToRoute: navigateToRoute2 }) => {
        navigateToRoute2(slug, { anchor });
      });
    },
    scrollToSection: (sectionId, options) => {
      Promise.resolve().then(() => (init_rightTOC(), rightTOC_exports)).then(
        ({ scrollToSection: scrollToSection2 }) => scrollToSection2(sectionId, options)
      );
    }
  };
}
function searchDocs(query, limit) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const index = docStore.getSearchIndex();
  const scored = index.map((entry) => {
    const title = entry.title?.toLowerCase() || "";
    const text = entry.text?.toLowerCase() || "";
    const url = entry.url?.toLowerCase() || "";
    let score = 0;
    if (title === q) score += 100;
    else if (title.startsWith(q)) score += 50;
    else if (title.includes(q)) score += 30;
    if (entry.method?.toLowerCase() === q) score += 40;
    if (url.includes(q)) score += 25;
    if (text.includes(q)) score += 10;
    if (entry.subtitle?.toLowerCase().includes(q)) score += 15;
    return { entry, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  return scored.map((x) => x.entry);
}
var _state, listeners, docStore;
var init_docStore = __esm({
  "js/data/docStore.js"() {
    _state = {
      loaded: false,
      loading: false,
      error: null,
      doc: null
    };
    listeners = /* @__PURE__ */ new Set();
    docStore = {
      get state() {
        return _state;
      },
      get doc() {
        return _state.doc;
      },
      subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      setLoading() {
        _state = { ..._state, loading: true, error: null };
        notify();
      },
      setDoc(doc) {
        _state = { loaded: true, loading: false, error: null, doc };
        notify();
        exposeGlobal(doc);
      },
      setError(error) {
        _state = { loaded: false, loading: false, error: String(error), doc: null };
        notify();
      },
      getApiById(id) {
        return _state.doc?.apis?.find((a) => a.id === id) ?? null;
      },
      getApiBySlug(slug) {
        return _state.doc?.apis?.find((a) => a.slug === slug) ?? null;
      },
      getSectionBySlug(slug) {
        if (slug === "overview") return { type: "overview", data: _state.doc?.overview };
        const folder = findFolderBySlug(_state.doc?.navTree, slug);
        if (folder) return { type: "folder", data: getFolderData(slug) };
        const api = this.getApiBySlug(slug);
        if (api) return { type: "api", data: api };
        return null;
      },
      getAllApis() {
        return _state.doc?.apis ?? [];
      },
      getSearchIndex() {
        return _state.doc?.searchIndex ?? [];
      },
      getNavTree() {
        return _state.doc?.navTree ?? [];
      },
      getVariables() {
        return _state.doc?.variables ?? [];
      },
      /** Flat export for embeddings / AI pipelines */
      toAIExport() {
        const doc = _state.doc;
        if (!doc) return null;
        return {
          meta: doc.meta,
          variables: doc.variables,
          auth: doc.collectionAuth,
          endpoints: doc.apis.map((api) => ({
            id: api.id,
            slug: api.slug,
            name: api.name,
            method: api.method,
            url: api.urlDisplay,
            description: api.descriptionPlain,
            breadcrumbs: api.breadcrumbs,
            headers: api.headers,
            queryParams: api.queryParams,
            bodySummary: api.bodyRaw?.slice(0, 500),
            responseCodes: [...new Set(api.responses.map((r) => r.code).filter(Boolean))]
          })),
          searchIndex: doc.searchIndex
        };
      }
    };
  }
});

// js/parser/postmanParser.js
init_slug();
init_markdown();
init_curl();
init_variables();
init_codeSamples();
var COLLECTION_PATH = "./data/Flits App.postman_collection.json";
function getCollectionPath() {
  const configured = globalThis.FLITS_DOC_CONFIG?.collectionUrl;
  return typeof configured === "string" && configured.length > 0 ? configured : COLLECTION_PATH;
}
function parsePostmanCollection(collection) {
  if (!collection || !collection.info) {
    throw new Error("Invalid Postman collection: missing info block");
  }
  const slugRegistry = /* @__PURE__ */ new Set();
  const apis = [];
  const sections = [];
  const navTree = [];
  const variables = (collection.variable || []).map((v) => ({
    key: v.key,
    value: v.value ?? "",
    type: v.type || "string",
    description: v.description || ""
  }));
  const collectionAuth = extractCollectionAuth(collection);
  function walkItems(items, context) {
    const nodes = [];
    for (const item of items || []) {
      if (item.request) {
        const api = parseRequest(item, context, slugRegistry);
        apis.push(api);
        sections.push({ type: "api", data: api });
        nodes.push({
          type: "api",
          id: api.id,
          name: api.name,
          method: api.method,
          slug: api.slug,
          children: []
        });
      } else if (item.item) {
        const folder = parseFolder(item, context, slugRegistry);
        sections.push({ type: "folder", data: folder });
        const childContext = {
          breadcrumbs: [...context.breadcrumbs, folder.name],
          path: [...context.path, folder.slug],
          parentSlug: folder.slug
        };
        const children = walkItems(item.item, childContext);
        folder.children = children.map((n) => n.id || n.slug);
        folder.apiCount = countApisInTree(children);
        navTree.push(...context.depth === 0 ? [] : []);
        nodes.push({
          type: "folder",
          id: folder.id,
          name: folder.name,
          slug: folder.slug,
          description: folder.descriptionPlain,
          apiCount: folder.apiCount,
          children
        });
      }
    }
    return nodes;
  }
  const rootContext = {
    breadcrumbs: [],
    path: [],
    depth: 0,
    parentSlug: null
  };
  const tree = walkItems(collection.item, rootContext);
  const overview = {
    type: "overview",
    id: "overview",
    slug: "overview",
    name: collection.info.name || "API Documentation",
    description: formatVariables(collection.info.description || ""),
    descriptionPlain: stripMarkdownForSearch(formatVariables(collection.info.description || ""))
  };
  sections.unshift({ type: "overview", data: overview });
  const docModel = {
    meta: {
      name: collection.info.name,
      description: collection.info.description || "",
      schema: collection.info.schema,
      postmanId: collection.info._postman_id,
      parsedAt: (/* @__PURE__ */ new Date()).toISOString(),
      apiCount: apis.length
    },
    variables,
    collectionAuth,
    overview,
    navTree: tree,
    sections,
    apis
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
    description: formatVariables(item.description || ""),
    descriptionPlain: stripMarkdownForSearch(formatVariables(item.description || "")),
    breadcrumbs: [...context.breadcrumbs, item.name],
    path: [...context.path, slug],
    events: item.event || [],
    children: [],
    apiCount: 0
  };
}
function parseRequest(item, context, slugRegistry) {
  const req = item.request;
  const method = (req.method || "GET").toUpperCase();
  const slug = uniqueSlug(item.name, slugRegistry);
  const id = `api-${slug}`;
  const urlData = parseUrl(req.url);
  const headers = normalizeHeaders(req.header);
  if (!headers.some((h) => h.key === "x-integration-app-name")) {
    headers.push({
      key: "x-integration-app-name",
      value: "{{app_name}}",
      description: "Mention the name of the application for which you are integrating the Flits API. Examples: Mobile App, Shopify Storefront, Headless Storefront, Custom App, React Storefront, Flutter App. Set {{app_name}} via Environment Variables.",
      disabled: false
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
    auth
  };
  let api = {
    id,
    slug,
    name: item.name,
    method,
    description: req.description || item.description || "",
    descriptionPlain: stripMarkdownForSearch(req.description || item.description || ""),
    breadcrumbs: [...context.breadcrumbs, item.name],
    path: [...context.path, slug],
    ...requestData,
    responses,
    events: item.event || [],
    responseCount: responses.length
  };
  if (!api.description.includes("x-integration-app-name")) {
    const _integrationNote = "\n\n> **`x-integration-app-name`** \u2014 Mention the name of the application for which you are integrating the Flits API, using the global variable `{{app_name}}`. Set its value in **Environment Variables**. Examples: `Mobile App`, `Shopify Storefront`, `Headless Storefront`, `Custom App`, `React Storefront`, `Flutter App`.";
    api.description = api.description ? api.description + _integrationNote : _integrationNote.trim();
    api.descriptionPlain = (api.descriptionPlain ? api.descriptionPlain + " " : "") + "x-integration-app-name Mention the name of the application for which you are integrating the Flits API, using the global variable {{app_name}}. Set its value in Environment Variables. Examples: Mobile App, Shopify Storefront, Headless Storefront, Custom App, React Storefront, Flutter App.";
  }
  api.curl = generateCurl(api);
  applyVariablesToApi(api);
  api.codeSamples = buildCodeSamples(api);
  return api;
}
function parseUrl(url) {
  if (!url) return { raw: "", display: "", path: [], query: [], baseUrl: "" };
  const raw = typeof url === "string" ? url : url.raw || "";
  const display = formatVariables(raw);
  let path = [];
  let query = [];
  let baseUrl = "";
  if (typeof url === "object") {
    if (Array.isArray(url.path)) path = url.path;
    if (Array.isArray(url.query)) {
      query = url.query.filter((q) => q && q.key).map((q) => ({
        key: q.key,
        value: q.value ?? "",
        description: q.description || "",
        disabled: q.disabled === true,
        // Data-driven: a query param flagged `locked` in the collection is
        // rendered read-only in Try It and always included in the request.
        locked: q.locked === true
      }));
    }
    if (url.host) {
      const host = Array.isArray(url.host) ? url.host.join(".") : url.host;
      const protocol = url.protocol ? `${url.protocol}://` : "";
      baseUrl = protocol + host;
    }
  }
  if (!baseUrl && raw.startsWith("http")) {
    try {
      const u = new URL(raw.split("?")[0].replace(/\{[^}]+\}/g, "placeholder"));
      baseUrl = `${u.protocol}//${u.host}`;
    } catch {
    }
  }
  return { raw, display, path, query, baseUrl };
}
function normalizeHeaders(headers = []) {
  return headers.filter((h) => h && h.key).map((h) => ({
    key: h.key,
    value: h.value ?? "",
    description: h.description || "",
    disabled: h.disabled === true
  }));
}
function parseBody(body) {
  if (!body) return { mode: "none", raw: "", language: "json", params: [] };
  const mode = body.mode || "raw";
  let raw = "";
  let language = "json";
  let params = [];
  const mapParams = (arr) => (arr || []).filter((p) => p && p.key).map((p) => ({
    key: p.key,
    value: p.value ?? "",
    type: p.type || "text",
    description: p.description || "",
    placeholder: p.placeholder || "",
    disabled: p.disabled === true
  }));
  if (mode === "raw") {
    raw = body.raw || "";
    language = body.options?.raw?.language || guessLanguage(raw);
  } else if (mode === "urlencoded" && body.urlencoded) {
    params = mapParams(body.urlencoded);
    raw = JSON.stringify(
      Object.fromEntries(
        body.urlencoded.map((p) => [p.key, p.value])
      ),
      null,
      2
    );
    language = "json";
  } else if (mode === "formdata" && body.formdata) {
    params = mapParams(body.formdata);
    raw = JSON.stringify(
      body.formdata.map((p) => ({ key: p.key, value: p.value, type: p.type })),
      null,
      2
    );
    language = "json";
  }
  return { mode, raw, language, params };
}
function guessLanguage(raw) {
  const t = (raw || "").trim();
  if (t.startsWith("{") || t.startsWith("[")) return "json";
  if (t.includes("<?xml")) return "xml";
  return "text";
}
function parseAuth(auth) {
  if (!auth) return null;
  const type = auth.type;
  if (type === "bearer") {
    const token = auth.bearer?.find?.((b) => b.key === "token")?.value || auth.bearer?.token || "{{jwt_token}}";
    return { type: "bearer", label: "Bearer Token", value: `Bearer ${token}` };
  }
  if (type === "apikey") {
    const entries = auth.apikey || [];
    return {
      type: "apikey",
      label: "API Key",
      entries: entries.map((e) => ({ key: e.key, value: e.value, in: e.in }))
    };
  }
  return { type, raw: auth };
}
function extractCollectionAuth(collection) {
  const notes = [];
  const events = collection.event || [];
  events.forEach((e) => {
    if (e.listen === "prerequest" && e.script?.exec) {
      notes.push({
        type: "prerequest",
        summary: "Collection pre-request script injects auth headers for Wishlist endpoints.",
        script: Array.isArray(e.script.exec) ? e.script.exec.join("\n") : e.script.exec
      });
    }
  });
  return {
    loyalty: {
      type: "query",
      param: "token",
      variable: "flits_token",
      description: "Loyalty endpoints use flits_token as a query parameter."
    },
    wishlist: {
      type: "bearer",
      headers: ["Authorization", "merchant_id"],
      variable: "jwt_token",
      description: "Wishlist endpoints use Bearer JWT and merchant_id header."
    },
    scripts: notes
  };
}
function extractPathVariables(pathSegments, raw) {
  const vars = /* @__PURE__ */ new Set();
  const combined = [...pathSegments || [], raw || ""].join("/");
  const matches = combined.matchAll(/\{(\w+)\}|\{\{(\w+)\}\}/g);
  for (const m of matches) {
    vars.add(m[1] || m[2]);
  }
  return [...vars].map((key) => ({
    key,
    description: `Path variable: ${key}`
  }));
}
function parseResponses(responses, method) {
  const mapped = responses.map((r) => {
    const code = r.code || parseStatusFromName(r.name);
    const body = r.body || "";
    let formattedBody = body;
    try {
      if (body && (body.trim().startsWith("{") || body.trim().startsWith("["))) {
        formattedBody = JSON.stringify(JSON.parse(body), null, 2);
      }
    } catch {
      formattedBody = body;
    }
    return {
      name: r.name,
      status: r.status || "",
      code: code || 0,
      headers: normalizeHeaders(r.header),
      body: formattedBody,
      rawBody: body,
      language: r._postman_previewlanguage || "json",
      isExample: /curl/i.test(r.name)
    };
  }).sort((a, b) => {
    if (a.isExample && !b.isExample) return 1;
    if (!a.isExample && b.isExample) return -1;
    return (a.code || 999) - (b.code || 999);
  });
  const byCode = /* @__PURE__ */ new Map();
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
    if (n.type === "api") return sum + 1;
    return sum + countApisInTree(n.children || []);
  }, 0);
}
function buildSearchIndex(doc) {
  const index = [];
  index.push({
    id: doc.overview.id,
    type: "overview",
    title: doc.overview.name,
    subtitle: "Introduction",
    text: doc.overview.descriptionPlain,
    slug: doc.overview.slug,
    method: null,
    url: null
  });
  function walkNav(nodes, trail = []) {
    nodes.forEach((node) => {
      const path = [...trail, node.name];
      if (node.type === "folder") {
        index.push({
          id: node.id,
          type: "folder",
          title: node.name,
          subtitle: path.slice(0, -1).join(" \u203A ") || "Folder",
          text: node.description || "",
          slug: node.slug,
          method: null,
          url: null,
          breadcrumbs: path
        });
        walkNav(node.children || [], path);
      } else if (node.type === "api") {
        const api = doc.apis.find((a) => a.id === node.id);
        if (api) {
          index.push({
            id: api.id,
            type: "api",
            title: api.name,
            subtitle: path.slice(0, -1).join(" \u203A "),
            text: [api.descriptionPlain, api.urlDisplay, api.method].join(" "),
            slug: api.slug,
            method: api.method,
            url: api.urlDisplay,
            breadcrumbs: api.breadcrumbs
          });
        }
      }
    });
  }
  walkNav(doc.navTree);
  return index;
}
async function loadAndParseCollection(path) {
  const resolved = path ?? getCollectionPath();
  const response = await fetch(resolved);
  if (!response.ok) {
    throw new Error(`Failed to load collection (${response.status}): ${resolved}`);
  }
  const json = await response.json();
  return parsePostmanCollection(json);
}

// js/main.js
init_docStore();
init_navbar();
init_sidebar();
init_toc();

// js/features/theme.js
init_themeLogo();
var STORAGE_KEY2 = "flits-docs-theme";
function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY2);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  applyTheme(theme);
  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY2, next);
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem(STORAGE_KEY2)) {
      applyTheme(e.matches ? "dark" : "light");
    }
  });
}
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
  updateThemeLogo();
}

// js/main.js
init_router();

// js/features/deepLink.js
init_router();
init_clipboard();
function initDeepLink() {
  document.addEventListener("click", (e) => {
    const copyLink = e.target.closest("[data-copy-link]");
    if (!copyLink) return;
    e.preventDefault();
    const slug2 = copyLink.getAttribute("data-copy-link") || currentRouteFromHash();
    const url = `${location.origin}${location.pathname}#${slug2}`;
    copyToClipboard(url).then(() => showCopyFeedback(copyLink, "Link copied!")).catch((err) => console.warn("[FlitsDoc] Copy link failed:", err));
  });
  const { slug, anchor } = parseHash();
  navigateToRoute(slug, { anchor, updateHash: false, animate: false });
}
function currentRouteFromHash() {
  return parseHash().slug;
}

// js/features/scrollspy.js
function initScrollspy() {
  const scrollRoot = document.getElementById("page-scroll");
  if (!scrollRoot) return;
  const update = () => updateScrollProgress(scrollRoot);
  scrollRoot.addEventListener("scroll", update, { passive: true });
  update();
}
function updateScrollProgress(scrollRoot) {
  const bar = document.getElementById("scroll-progress");
  if (!bar) return;
  const { scrollTop, scrollHeight, clientHeight } = scrollRoot;
  const height = scrollHeight - clientHeight;
  const pct = height > 0 ? scrollTop / height * 100 : 0;
  bar.style.width = `${pct}%`;
}

// js/utils/debounce.js
function debounce(fn, wait = 200) {
  let timeoutId;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), wait);
  };
}

// js/features/search.js
init_router();
var activeIndex = -1;
var currentResults = [];
function initSearch() {
  const globalInput = document.getElementById("global-search");
  const sidebarFilter = document.getElementById("sidebar-filter");
  const resultsEl = document.getElementById("search-results");
  const runGlobalSearch = debounce((query) => {
    if (!window.FlitsDoc) return;
    currentResults = window.FlitsDoc.search(query, 12);
    activeIndex = -1;
    renderSearchResults(resultsEl, currentResults, query);
  }, 180);
  globalInput?.addEventListener("input", (e) => {
    runGlobalSearch(e.target.value);
    globalInput.setAttribute("aria-expanded", e.target.value.trim() ? "true" : "false");
  });
  globalInput?.addEventListener("keydown", (e) => handleSearchKeydown(e, resultsEl));
  globalInput?.addEventListener("focus", () => {
    if (globalInput.value.trim()) {
      runGlobalSearch(globalInput.value);
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-box")) {
      resultsEl?.setAttribute("hidden", "");
      globalInput?.setAttribute("aria-expanded", "false");
    }
  });
  resultsEl?.addEventListener("click", (e) => {
    const item = e.target.closest("[data-search-slug]");
    if (item) {
      selectSearchResult(item.getAttribute("data-search-slug"), globalInput, resultsEl);
    }
  });
  sidebarFilter?.addEventListener("input", (e) => {
    Promise.resolve().then(() => (init_sidebar(), sidebar_exports)).then(({ filterSidebar: filterSidebar2 }) => filterSidebar2(e.target.value));
  });
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      globalInput?.focus();
      globalInput?.select();
    }
    if (e.key === "Escape") {
      resultsEl?.setAttribute("hidden", "");
      globalInput?.blur();
    }
  });
}
function handleSearchKeydown(e, resultsEl) {
  if (!currentResults.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeIndex = Math.min(activeIndex + 1, currentResults.length - 1);
    highlightResult(resultsEl, activeIndex);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeIndex = Math.max(activeIndex - 1, 0);
    highlightResult(resultsEl, activeIndex);
  } else if (e.key === "Enter" && activeIndex >= 0) {
    e.preventDefault();
    selectSearchResult(currentResults[activeIndex].slug, e.target, resultsEl);
  }
}
function highlightResult(resultsEl, index) {
  resultsEl?.querySelectorAll(".search-results__item").forEach((el, i) => {
    el.classList.toggle("is-focused", i === index);
    if (i === index) el.scrollIntoView({ block: "nearest" });
  });
}
function selectSearchResult(slug, input, resultsEl) {
  navigateToRoute(slug);
  if (input) input.value = "";
  resultsEl?.setAttribute("hidden", "");
  input?.setAttribute("aria-expanded", "false");
  closeMobileSidebar();
}
function renderSearchResults(container, results, query) {
  if (!container) return;
  if (!query.trim()) {
    container.setAttribute("hidden", "");
    container.innerHTML = "";
    return;
  }
  if (!results.length) {
    container.removeAttribute("hidden");
    container.innerHTML = `<div class="search-results__empty">No results for "${escapeHtml6(query)}"</div>`;
    return;
  }
  container.removeAttribute("hidden");
  container.innerHTML = results.map((r, i) => {
    const methodBadge = r.method ? `<span class="method-badge method-${r.method.toLowerCase()}">${r.method}</span>` : "";
    return `
        <button type="button" class="search-results__item" role="option" data-search-slug="${r.slug}" data-index="${i}">
          <div class="search-results__row">
            ${methodBadge}
            <span class="search-results__title">${highlightMatch(r.title, query)}</span>
          </div>
          <span class="search-results__meta">${escapeHtml6(r.subtitle || "")}</span>
        </button>
      `;
  }).join("");
}
function highlightMatch(text, query) {
  const t = escapeHtml6(text || "");
  const q = escapeHtml6(query.trim());
  if (!q) return t;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return t.replace(re, "<mark>$1</mark>");
}
function escapeHtml6(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function closeMobileSidebar() {
  document.body.classList.remove("sidebar-open");
  document.getElementById("sidebar-toggle")?.setAttribute("aria-expanded", "false");
}

// js/main.js
init_sidebarCollapse();

// js/features/runInPostman.js
init_docStore();
init_envStore();
var POSTMAN_COLLECTION_UID = "";
var BTN_ID = "download-collection-btn";
var POPOVER_ID = "rip-popover";
function runInPostman() {
  const btn = document.getElementById(BTN_ID);
  if (POSTMAN_COLLECTION_UID) {
    _launchOfficialFork(POSTMAN_COLLECTION_UID);
    return;
  }
  _openPopover(btn, _absoluteCollectionUrl());
}
function _launchOfficialFork(uid) {
  const collectionRef = `entityId=${uid}&entityType=collection`;
  const forkUrl = `https://god.gw.postman.com/run-collection/${encodeURIComponent(uid)}?action=collection/fork&source=rip_website&collection-url=${encodeURIComponent(collectionRef)}`;
  window.open(forkUrl, "_blank", "noopener,noreferrer");
}
function _openPostmanApp() {
  const a = Object.assign(document.createElement("a"), {
    href: "postman://app",
    style: "display:none"
  });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 200);
}
function _openPopover(anchorBtn, collectionUrl) {
  _closePopover();
  const collectionName = docStore.doc?.meta?.name || "API";
  const pop = document.createElement("div");
  pop.id = POPOVER_ID;
  pop.className = "rip-popover";
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-label", "Run in Postman");
  pop.setAttribute("tabindex", "-1");
  pop.innerHTML = `
    <div class="rip-popover__header">
      ${_svgPostman()}
      <div class="rip-popover__header-text">
        <p class="rip-popover__title">Run in Postman</p>
        <p class="rip-popover__sub">Import the full <strong>${_he(collectionName)}</strong> collection in two steps.</p>
      </div>
    </div>

    <hr class="rip-popover__rule" aria-hidden="true">

    <ol class="rip-popover__flow">
      <li class="rip-popover__step">
        <span class="rip-popover__step-num">1</span>
        <div class="rip-popover__step-body">
          <p class="rip-popover__step-title">Open Postman, then choose <kbd>Import</kbd> &rarr; <kbd>Link</kbd></p>
          <button type="button" class="rip-popover__btn" id="rip-btn-open">
            ${_svgExternal()}<span>Open Postman app</span>
          </button>
        </div>
      </li>
      <li class="rip-popover__step">
        <span class="rip-popover__step-num">2</span>
        <div class="rip-popover__step-body">
          <p class="rip-popover__step-title">
            Paste this URL then click <kbd>Continue</kbd>
          </p>
          <div class="rip-popover__url-row">
            <code class="rip-popover__url-text">${_he(collectionUrl)}</code>
            <button type="button" class="rip-popover__copy-btn" id="rip-btn-copy"
                    aria-label="Copy collection URL">
              ${_svgCopy()}
            </button>
          </div>
        </div>
      </li>
    </ol>

    <hr class="rip-popover__rule rip-popover__rule--flush" aria-hidden="true">

    <div class="rip-popover__action-row">
      <button type="button" class="rip-popover__btn" id="rip-btn-download">
        ${_svgDownload()}<span>Download JSON instead</span>
      </button>
    </div>
  `;
  document.body.appendChild(pop);
  _positionPopover(pop, anchorBtn);
  pop.focus({ preventScroll: true });
  if (anchorBtn) anchorBtn.classList.add("is-open");
  _autoCopy(collectionUrl, pop);
  pop.querySelector("#rip-btn-open")?.addEventListener("click", () => {
    _openPostmanApp();
  });
  pop.querySelector("#rip-btn-copy")?.addEventListener("click", () => {
    _copyToClipboard(collectionUrl, pop.querySelector("#rip-btn-copy"));
  });
  pop.querySelector("#rip-btn-download")?.addEventListener("click", () => {
    _downloadCollection(collectionUrl);
    _closePopover(anchorBtn);
  });
  pop.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      _closePopover(anchorBtn);
      anchorBtn?.focus();
    }
  });
  const outsideHandler = (e) => {
    if (!pop.contains(e.target) && e.target !== anchorBtn) {
      _closePopover(anchorBtn);
      document.removeEventListener("click", outsideHandler);
    }
  };
  setTimeout(() => document.addEventListener("click", outsideHandler), 80);
}
function _closePopover(anchorBtn) {
  const btn = anchorBtn || document.getElementById(BTN_ID);
  btn?.classList.remove("is-open");
  document.getElementById(POPOVER_ID)?.remove();
}
function _positionPopover(pop, anchor) {
  if (!anchor) {
    pop.style.top = "72px";
    pop.style.right = "16px";
    return;
  }
  const rect = anchor.getBoundingClientRect();
  const viewW = window.innerWidth;
  const rightOffset = Math.max(viewW - rect.right, 8);
  pop.style.top = `${Math.round(rect.bottom + 8)}px`;
  pop.style.right = `${rightOffset}px`;
}
function _autoCopy(text, pop) {
  if (!navigator.clipboard?.writeText) return;
  navigator.clipboard.writeText(text).then(
    () => {
      const btn = pop.querySelector("#rip-btn-copy");
      if (btn) {
        btn.classList.add("is-copied");
        btn.innerHTML = _svgCheck();
        setTimeout(() => {
          btn.innerHTML = _svgCopy();
          btn.classList.remove("is-copied");
        }, 2e3);
      }
    },
    () => {
    }
  );
}
async function _copyToClipboard(text, btn) {
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(text);
    btn.innerHTML = _svgCheck();
    btn.classList.add("is-copied");
    setTimeout(() => {
      btn.innerHTML = _svgCopy();
      btn.classList.remove("is-copied");
    }, 2e3);
  } catch (_) {
  }
}
async function _downloadCollection(collectionUrl) {
  try {
    const res = await fetch(collectionUrl);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();
    _injectEnvVariables(json);
    const rawName = docStore.doc?.meta?.name || "api-collection";
    const baseName = rawName.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    _saveJson(json, baseName + ".postman_collection.json");
    setTimeout(() => {
      _saveJson(_buildEnvironment(rawName, json.variable), baseName + ".postman_environment.json");
    }, 300);
  } catch (err) {
    console.error("[RunInPostman] Download failed:", err);
  }
}
function _saveJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
    style: "display:none"
  });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1e3);
}
function _buildEnvironment(name, variables) {
  const id = globalThis.crypto?.randomUUID?.() || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : r & 3 | 8).toString(16);
  });
  return {
    id,
    name,
    values: (variables || []).map((v) => ({
      key: v.key,
      value: v.value ?? "",
      type: "default",
      enabled: true
    })),
    _postman_variable_scope: "environment",
    _postman_exported_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function _injectEnvVariables(json) {
  if (!json || typeof json !== "object") return;
  const env = getEnv();
  const vars = Array.isArray(json.variable) ? json.variable : [];
  const declared = new Set(vars.map((v) => v?.key));
  vars.forEach((v) => {
    const value = env[v?.key];
    if (value !== void 0 && value !== "") v.value = value;
  });
  discoverVariables(docStore.doc).forEach((key) => {
    if (declared.has(key)) return;
    vars.push({ key, value: env[key] ?? "", type: "string" });
  });
  json.variable = vars;
}
function _absoluteCollectionUrl() {
  const path = getCollectionPath();
  return /^https?:\/\//.test(path) ? path : new URL(path, window.location.href).href;
}
function _he(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function _svgPostman() {
  return `
    <svg class="rip-popover__postman-logo" width="32" height="32" viewBox="0 0 32 32"
         fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="currentColor" fill-opacity="0.1"
              stroke="currentColor" stroke-width="1.5"/>
      <path d="M12.5 10.5l9 5.5-9 5.5V10.5z" fill="currentColor"/>
    </svg>`;
}
function _svgExternal() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>`;
}
function _svgDownload() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>`;
}
function _svgCopy() {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>`;
}
function _svgCheck() {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`;
}

// js/main.js
init_themeLogo();

// js/features/chatAssistant.js
function initializeChatAssistant() {
}

// js/render/envPanel.js
init_envStore();
init_contentHelpers();
var BTN_ID2 = "env-panel-btn";
var POPUP_ID = "env-panel-popup";
var _knownVars = [];
var _popupOpen = false;
var _popupEl = null;
var _btnEl = null;
function initEnvPanel(doc) {
  _knownVars = discoverVariables(doc);
  loadEnv();
  _mount();
}
function refreshEnvPanel() {
  _updateButton();
  if (_popupOpen && _popupEl) _updatePopupInputs();
}
function _mount() {
  const contentWrap = document.querySelector(".content-wrap");
  if (!contentWrap) return;
  document.removeEventListener("mousedown", _onOutsideMousedown);
  document.removeEventListener("keydown", _onEscKey);
  _popupOpen = false;
  _popupEl = null;
  _btnEl = null;
  document.querySelector(".env-btn-bar")?.remove();
  document.getElementById(POPUP_ID)?.remove();
  const bar = document.createElement("div");
  bar.className = "env-btn-bar";
  bar.innerHTML = _buildButtonHtml();
  contentWrap.insertBefore(bar, contentWrap.firstElementChild);
  const popup = document.createElement("div");
  popup.id = POPUP_ID;
  popup.className = "env-popup";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-modal", "true");
  popup.setAttribute("aria-label", "Environment Variables");
  popup.hidden = true;
  popup.innerHTML = _buildPopupHtml(getEnv());
  document.body.appendChild(popup);
  _popupEl = popup;
  _btnEl = bar.querySelector(`#${BTN_ID2}`);
  _attachListeners(popup);
  document.addEventListener("mousedown", _onOutsideMousedown);
  document.addEventListener("keydown", _onEscKey);
}
function _buildButtonHtml() {
  return `
    <button type="button" id="${BTN_ID2}" class="env-btn"
            aria-haspopup="dialog" aria-expanded="false"
            title="Configure environment variables">
      ${_iconBraces()}
      <span class="env-btn__label">Environment Variables</span>
    </button>
  `;
}
function _buildPopupHtml(env) {
  const { total, setCount } = _counts(env);
  const hasVars = total > 0;
  return `
    <div class="env-popup__header">
      <div class="env-popup__header-left">
        ${_iconBraces()}
        <span class="env-popup__title">Environment Variables</span>
        <span class="env-popup__badge" data-env-popup-badge>${_badgeText(total, setCount)}</span>
      </div>
      <button type="button" class="env-popup__close" data-env-close
              aria-label="Close environment variables">
        ${_iconClose()}
      </button>
    </div>

    <div class="env-popup__search-wrap">
      <input type="text" class="env-popup__search" data-env-search
             placeholder="Search variables\u2026"
             aria-label="Filter environment variables"
             autocomplete="off" spellcheck="false" />
    </div>

    <div class="env-popup__body" id="env-popup-body" role="list">
      ${!hasVars ? `<p class="env-popup__empty">No &#123;&#123;variables&#125;&#125; found in the collection.</p>` : _knownVars.map((name) => _varRow(name, env[name] ?? "")).join("")}
    </div>

    <div class="env-popup__footer">
      <button type="button" class="env-popup__clear-all" data-env-clear-all
              ${setCount === 0 ? "disabled" : ""}>
        Clear All
      </button>
    </div>
  `;
}
function _varRow(name, value) {
  return `
    <div class="env-popup__var" data-env-row="${escapeHtml3(name)}" role="listitem">
      <label class="env-popup__var-name"
             title="${escapeHtml3(name)}"
             for="env-var-${escapeHtml3(name)}">${escapeHtml3(name)}</label>
      <div class="env-popup__var-input-wrap">
        <input type="text"
               class="env-popup__var-input"
               id="env-var-${escapeHtml3(name)}"
               data-env-var="${escapeHtml3(name)}"
               value="${escapeHtml3(value)}"
               placeholder="Enter value\u2026"
               autocomplete="off"
               spellcheck="false" />
        <button type="button"
                class="env-popup__var-clear${value ? "" : " u-hidden"}"
                data-env-var-clear="${escapeHtml3(name)}"
                aria-label="Clear ${escapeHtml3(name)}"
                tabindex="-1">\xD7</button>
      </div>
    </div>`;
}
function _attachListeners(popup) {
  _btnEl?.addEventListener("click", (e) => {
    e.stopPropagation();
    _popupOpen ? _closePopup() : _openPopup();
  });
  popup.querySelector("[data-env-close]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    _closePopup();
  });
  popup.querySelector("[data-env-clear-all]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    clearAll();
    popup.querySelectorAll(".env-popup__var-input").forEach((i) => {
      i.value = "";
    });
    popup.querySelectorAll("[data-env-var-clear]").forEach((b) => b.classList.add("u-hidden"));
    _updateMeta(popup);
  });
  popup.querySelector("[data-env-search]")?.addEventListener("input", (e) => {
    _filterVars(popup, e.target.value.trim().toLowerCase());
  });
  popup.addEventListener("click", (e) => {
    const clearBtn = e.target.closest("[data-env-var-clear]");
    if (!clearBtn) return;
    e.stopPropagation();
    const name = clearBtn.dataset.envVarClear;
    setVar(name, "");
    const inp = popup.querySelector(`[data-env-var="${CSS.escape(name)}"]`);
    if (inp) inp.value = "";
    clearBtn.classList.add("u-hidden");
    _updateMeta(popup);
  });
  popup.addEventListener("input", (e) => {
    const varInput = e.target.closest(".env-popup__var-input");
    if (!varInput) return;
    const name = varInput.dataset.envVar;
    if (!name) return;
    setVar(name, varInput.value);
    _refreshVarClearBtn(popup, name, varInput.value);
    _updateMeta(popup);
  });
}
function _onOutsideMousedown(e) {
  if (!_popupOpen || !_popupEl || !_btnEl) return;
  if (_popupEl.contains(e.target) || _btnEl.contains(e.target)) return;
  _closePopup();
}
function _onEscKey(e) {
  if (e.key === "Escape" && _popupOpen) {
    _closePopup();
    _btnEl?.focus();
  }
}
function _openPopup() {
  if (!_popupEl || !_btnEl) return;
  _positionPopup();
  _popupEl.hidden = false;
  _popupOpen = true;
  _btnEl.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => _popupEl?.querySelector("[data-env-search]")?.focus());
}
function _closePopup() {
  if (!_popupEl) return;
  _popupEl.hidden = true;
  _popupOpen = false;
  _btnEl?.setAttribute("aria-expanded", "false");
  const search = _popupEl.querySelector("[data-env-search]");
  if (search?.value) {
    search.value = "";
    _filterVars(_popupEl, "");
  }
}
function _positionPopup() {
  const rect = _btnEl.getBoundingClientRect();
  const popupW = 460;
  const gap = 6;
  _popupEl.style.top = `${rect.bottom + window.scrollY + gap}px`;
  let left = rect.right - popupW;
  if (left < 8) left = 8;
  if (left + popupW > window.innerWidth - 8) left = window.innerWidth - popupW - 8;
  _popupEl.style.left = `${left}px`;
  _popupEl.style.right = "auto";
}
function _updateButton() {
  const badge = document.querySelector(".env-btn-bar [data-env-badge]");
  if (!badge) return;
  const env = getEnv();
  const { total, setCount } = _counts(env);
  badge.textContent = _badgeText(total, setCount);
}
function _updatePopupInputs() {
  const env = getEnv();
  _popupEl.querySelectorAll(".env-popup__var-input").forEach((input) => {
    const name = input.dataset.envVar;
    if (!name) return;
    const newVal = env[name] ?? "";
    if (input.value !== newVal) input.value = newVal;
    _refreshVarClearBtn(_popupEl, name, newVal);
  });
}
function _filterVars(popup, query) {
  const q = (query || "").replace(/[{}]/g, "").trim();
  popup.querySelectorAll("[data-env-row]").forEach((row) => {
    const name = (row.dataset.envRow || "").toLowerCase();
    row.hidden = q ? !name.includes(q) : false;
  });
}
function _refreshVarClearBtn(popup, name, value) {
  const btn = popup.querySelector(`[data-env-var-clear="${CSS.escape(name)}"]`);
  if (btn) btn.classList.toggle("u-hidden", !value);
}
function _updateMeta(popup) {
  const env = getEnv();
  const { total, setCount } = _counts(env);
  const badge = popup.querySelector("[data-env-popup-badge]");
  if (badge) badge.textContent = _badgeText(total, setCount);
  const clearAllBtn = popup.querySelector("[data-env-clear-all]");
  if (clearAllBtn) clearAllBtn.disabled = setCount === 0;
  _updateButton();
}
function _counts(env) {
  const total = _knownVars.length;
  const setCount = Object.values(env).filter((v) => v !== "").length;
  return { total, setCount };
}
function _badgeText(total, setCount) {
  const varLabel = `${total} var${total !== 1 ? "s" : ""}`;
  return setCount > 0 ? `${varLabel} \xB7 ${setCount} set` : varLabel;
}
function _iconBraces() {
  return `<svg class="env-icon" width="14" height="14" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true" focusable="false" style="pointer-events:none">
    <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/>
    <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>
  </svg>`;
}
function _iconClose() {
  return `<svg width="14" height="14" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true" focusable="false" style="pointer-events:none">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`;
}

// js/main.js
init_envStore();
init_devPanel();
init_pageView();
var app = document.getElementById("app");
async function bootstrap() {
  showLoading();
  try {
    docStore.setLoading();
    const doc = await loadAndParseCollection();
    docStore.setDoc(doc);
    mountLayout();
    initTheme();
    initializeThemeLogo();
    initSearch();
    initSidebarCollapse();
    initRouter();
    initPageInteractions();
    initDeepLink();
    initScrollspy();
    initializeChatAssistant();
    initEnvPanel(doc);
    onEnvChange(() => {
      refreshEnvPanel();
      refreshAllTryItPanels();
      refreshEnvTemplates();
    });
    document.getElementById("download-collection-btn")?.addEventListener("click", runInPostman);
    initMobileMenu();
    initTocCollapse();
    initSkipLink();
  } catch (err) {
    console.error(err);
    showError(err);
  }
}
function showLoading() {
  app.innerHTML = `
    <div class="app-loading" role="status" aria-live="polite">
      <div class="app-loading__spinner" aria-hidden="true"></div>
      <p class="app-loading__text">Loading API documentation\u2026</p>
    </div>
  `;
}
function mountLayout() {
  app.innerHTML = `
    <div class="app-layout">
      <a class="skip-link" id="skip-to-content" href="#content-root">Skip to content</a>
      <div id="navbar-root"></div>
      <div class="app-body">
        <div id="sidebar-root"></div>
        <div class="content-wrap">
          <div class="docs-layout">
            <div class="page-scroll" id="page-scroll">
              <main id="content-root" class="page-viewport" role="main" tabindex="-1"></main>
            </div>
            <div id="toc-root"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  renderNavbar(document.getElementById("navbar-root"));
  renderSidebar(document.getElementById("sidebar-root"));
  renderTocShell(document.getElementById("toc-root"));
}
function initMobileMenu() {
  const toggle = document.getElementById("sidebar-toggle");
  const overlay = document.getElementById("sidebar-overlay");
  const isOpen = () => document.body.classList.contains("sidebar-open");
  const openDrawer = () => {
    document.body.classList.add("sidebar-open");
    toggle?.setAttribute("aria-expanded", "true");
  };
  const closeDrawer = (returnFocus = false) => {
    if (!isOpen()) return;
    document.body.classList.remove("sidebar-open");
    toggle?.setAttribute("aria-expanded", "false");
    if (returnFocus) toggle?.focus();
  };
  toggle?.addEventListener("click", () => {
    isOpen() ? closeDrawer() : openDrawer();
  });
  overlay?.addEventListener("click", () => closeDrawer());
  document.addEventListener("click", (e) => {
    const navItem = e.target.closest(".nav-tree__link, .nav-tree__folder-btn");
    if (!navItem || !isOpen()) return;
    if (isExpandableFolder(navItem)) return;
    closeDrawer();
  });
  document.addEventListener("click", (e) => {
    if (!isOpen()) return;
    const sidebar = document.getElementById("sidebar");
    if (sidebar?.contains(e.target)) return;
    if (toggle?.contains(e.target)) return;
    closeDrawer();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) closeDrawer(true);
  });
}
function initSkipLink() {
  const link = document.getElementById("skip-to-content");
  link?.addEventListener("click", (e) => {
    e.preventDefault();
    const main = document.getElementById("content-root");
    if (!main) return;
    main.focus({ preventScroll: false });
    main.scrollIntoView({ block: "start" });
  });
}
function initTocCollapse() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-toc-collapse]");
    if (!btn) return;
    const aside = btn.closest(".toc-aside");
    if (!aside) return;
    const collapsed = aside.classList.toggle("is-collapsed");
    btn.setAttribute("aria-expanded", String(!collapsed));
  });
}
function showError(err) {
  app.innerHTML = `
    <div class="app-error" role="alert">
      <h1>Unable to load documentation</h1>
      <p>${escapeHtml7(String(err.message || err))}</p>
      <button type="button" class="btn btn--primary" onclick="location.reload()">Retry</button>
    </div>
  `;
}
function escapeHtml7(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
bootstrap();
