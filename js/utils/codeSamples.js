/**
 * Multi-language code sample generation for API developer panel.
 */
import { generateCurl } from './curl.js';

const LANGUAGES = [
  { id: 'curl', label: 'cURL' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'php', label: 'PHP' },
];

export { LANGUAGES };

export function buildCodeSamples(api) {
  return {
    curl: api.curl || generateCurl(api),
    javascript: generateJavaScript(api),
    python: generatePython(api),
    php: generatePhp(api),
  };
}

function getActiveHeaders(api) {
  return (api.headers || []).filter((h) => h.key && !h.disabled);
}

function activeBodyParams(api) {
  return (api.bodyParams || []).filter((p) => p.key && !p.disabled);
}

function isWriteMethod(api) {
  return !['GET', 'HEAD'].includes((api.method || 'GET').toUpperCase());
}

/** Form body kind for this API ('formdata' | 'urlencoded' | null). */
function formBodyKind(api) {
  if (!isWriteMethod(api) || !activeBodyParams(api).length) return null;
  if (api.bodyMode === 'formdata') return 'formdata';
  if (api.bodyMode === 'urlencoded') return 'urlencoded';
  return null;
}

function hasBody(api) {
  const method = (api.method || 'GET').toUpperCase();
  return api.bodyRaw?.trim() && !['GET', 'HEAD'].includes(method);
}

function jsString(str) {
  return JSON.stringify(str ?? '');
}

function phpString(str) {
  return `'${String(str ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

// ── JavaScript ──────────────────────────────────────────────────────────────
function generateJavaScript(api) {
  const url = api.urlDisplay || api.urlRaw;
  const method = api.method || 'GET';
  const headers = getActiveHeaders(api);
  const params = activeBodyParams(api);
  const kind = formBodyKind(api);

  const headerBlock = (fallback) => {
    const lines = headers.map((h) => `    ${jsString(h.key)}: ${jsString(h.value)}`).join(',\n');
    return lines || fallback;
  };

  if (kind === 'formdata') {
    const appends = params.map((p) => `form.append(${jsString(p.key)}, ${jsString(p.value)});`).join('\n');
    return `const form = new FormData();
${appends}

const response = await fetch(${jsString(url)}, {
  method: ${jsString(method)},
  headers: {
${headerBlock('')}
  },
  body: form
});

const data = await response.json();
console.log(data);`;
  }

  if (kind === 'urlencoded') {
    const appends = params.map((p) => `params.append(${jsString(p.key)}, ${jsString(p.value)});`).join('\n');
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

  const bodyLine = hasBody(api) ? `,\n  body: ${jsString(api.bodyRaw.trim())}` : '';
  return `const response = await fetch(${jsString(url)}, {
  method: ${jsString(method)},
  headers: {
${headerBlock("    'Content-Type': 'application/json'")}
  }${bodyLine}
});

const data = await response.json();
console.log(data);`;
}

// ── Python ──────────────────────────────────────────────────────────────────
function generatePython(api) {
  const url = api.urlDisplay || api.urlRaw;
  const method = (api.method || 'GET').toLowerCase();
  const headers = getActiveHeaders(api);
  const params = activeBodyParams(api);
  const kind = formBodyKind(api);

  const headerDict = headers.length
    ? `headers = {\n${headers.map((h) => `    ${jsString(h.key)}: ${jsString(h.value)}`).join(',\n')}\n}\n\n`
    : '';
  const headersArg = headers.length ? ',\n    headers=headers' : '';

  if (kind === 'formdata') {
    // (None, value) tuples force a multipart/form-data request
    const files = params.map((p) => `    ${jsString(p.key)}: (None, ${jsString(p.value)}),`).join('\n');
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

  if (kind === 'urlencoded') {
    const fields = params.map((p) => `    ${jsString(p.key)}: ${jsString(p.value)},`).join('\n');
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
    bodyPart = `payload = ${jsString(api.bodyRaw.trim())}\n\nresponse = requests.${method}(\n    ${jsString(url)},\n    headers=headers,\n    data=payload\n)`;
  } else {
    bodyPart = `response = requests.${method}(\n    ${jsString(url)},\n    headers=headers\n)`;
  }
  return `import requests

${headerDictRaw}${bodyPart}

data = response.json()
print(data)`;
}

// ── PHP ─────────────────────────────────────────────────────────────────────
function generatePhp(api) {
  const url = api.urlDisplay || api.urlRaw;
  const method = api.method || 'GET';
  const headers = getActiveHeaders(api);
  const params = activeBodyParams(api);
  const kind = formBodyKind(api);

  const headerLines = headers.map((h) => `    ${jsString(`${h.key}: ${h.value}`)},`).join('\n');
  const headerList = headerLines || (kind ? '' : "    'Content-Type: application/json',");

  const optPost =
    method.toUpperCase() !== 'GET'
      ? `\ncurl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${method.toUpperCase()}');`
      : '';

  let bodyPart = '';
  if (kind === 'formdata') {
    const fields = params.map((p) => `    ${phpString(p.key)} => ${phpString(p.value)},`).join('\n');
    bodyPart = `\ncurl_setopt($ch, CURLOPT_POSTFIELDS, [\n${fields}\n]);`;
  } else if (kind === 'urlencoded') {
    const fields = params.map((p) => `    ${phpString(p.key)} => ${phpString(p.value)},`).join('\n');
    bodyPart = `\ncurl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([\n${fields}\n]));`;
  } else if (hasBody(api)) {
    bodyPart = `\ncurl_setopt($ch, CURLOPT_POSTFIELDS, ${phpString(api.bodyRaw.trim())});`;
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
