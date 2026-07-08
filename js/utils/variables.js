/**
 * Safe Postman variable normalization: {var} → {{var}}
 * Does not alter JSON structural braces (only {identifier} patterns).
 */

const VAR_PATTERN = /(?<!\{)\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g;

export function formatVariables(text) {
  if (text == null) return text;
  if (typeof text !== 'string') return text;
  return text.replace(VAR_PATTERN, '{{$1}}');
}

/** Apply to all string fields on an API record */
export function applyVariablesToApi(api) {
  if (!api) return api;
  const fields = [
    'urlRaw',
    'urlDisplay',
    'baseUrl',
    'description',
    'descriptionPlain',
    'bodyRaw',
    'curl',
  ];
  fields.forEach((key) => {
    if (typeof api[key] === 'string') api[key] = formatVariables(api[key]);
  });

  if (api.headers) {
    api.headers = api.headers.map((h) => ({
      ...h,
      value: formatVariables(h.value),
      description: formatVariables(h.description),
    }));
  }
  if (api.queryParams) {
    api.queryParams = api.queryParams.map((q) => ({
      ...q,
      value: formatVariables(q.value),
      description: formatVariables(q.description),
    }));
  }
  if (api.bodyParams) {
    api.bodyParams = api.bodyParams.map((p) => ({
      ...p,
      value: formatVariables(p.value),
      description: formatVariables(p.description),
    }));
  }
  if (api.responses) {
    api.responses = api.responses.map((r) => ({
      ...r,
      body: formatVariables(r.body),
      rawBody: formatVariables(r.rawBody),
      name: formatVariables(r.name),
    }));
  }
  if (api.auth?.value) {
    api.auth = { ...api.auth, value: formatVariables(api.auth.value) };
  }
  return api;
}

export function applyVariablesToDoc(doc) {
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
