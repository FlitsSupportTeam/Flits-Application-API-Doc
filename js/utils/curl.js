/**
 * Generate cURL command from parsed request data.
 */
export function generateCurl(request) {
  if (!request) return '';

  const method = (request.method || 'GET').toUpperCase();
  const url = request.urlDisplay || request.urlRaw || '';
  const parts = [`curl --request ${method}`, `  --url '${escapeSingleQuotes(url)}'`];

  const headers = request.headers || [];
  headers.forEach((h) => {
    if (h.key && !h.disabled) {
      parts.push(`  --header '${escapeSingleQuotes(`${h.key}: ${h.value || ''}`)}'`);
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

  // ── Body ────────────────────────────────────────────────────────────────
  const isWrite = method !== 'GET' && method !== 'HEAD';
  const bodyParams = (request.bodyParams || []).filter((p) => p.key && !p.disabled);

  if (isWrite && request.bodyMode === 'formdata' && bodyParams.length) {
    // multipart/form-data — one --form per field (boundary set by curl)
    bodyParams.forEach((p) => {
      parts.push(`  --form '${escapeSingleQuotes(`${p.key}="${p.value ?? ''}"`)}'`);
    });
  } else if (isWrite && request.bodyMode === 'urlencoded' && bodyParams.length) {
    bodyParams.forEach((p) => {
      parts.push(`  --data-urlencode '${escapeSingleQuotes(`${p.key}=${p.value ?? ''}`)}'`);
    });
  } else if (isWrite && request.bodyRaw && request.bodyRaw.trim()) {
    parts.push(`  --data '${escapeSingleQuotes(request.bodyRaw.trim())}'`);
  }

  return parts.join(' \\\n');
}

function escapeSingleQuotes(str) {
  return String(str).replace(/'/g, "'\\''");
}
