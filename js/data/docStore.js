/**
 * Central documentation store — single source of truth for UI and future AI/chatbot.
 */

let _state = {
  loaded: false,
  loading: false,
  error: null,
  doc: null,
};

const listeners = new Set();

export const docStore = {
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
    if (slug === 'overview') return { type: 'overview', data: _state.doc?.overview };
    const folder = findFolderBySlug(_state.doc?.navTree, slug);
    if (folder) return { type: 'folder', data: getFolderData(slug) };
    const api = this.getApiBySlug(slug);
    if (api) return { type: 'api', data: api };
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
        responseCodes: [...new Set(api.responses.map((r) => r.code).filter(Boolean))],
      })),
      searchIndex: doc.searchIndex,
    };
  },
};

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(_state);
    } catch (e) {
      console.error('[docStore] listener error', e);
    }
  });
}

function findFolderBySlug(nodes, slug) {
  for (const n of nodes || []) {
    if (n.type === 'folder' && n.slug === slug) return n;
    const found = findFolderBySlug(n.children, slug);
    if (found) return found;
  }
  return null;
}

function getFolderData(slug) {
  const section = _state.doc?.sections?.find(
    (s) => s.type === 'folder' && s.data?.slug === slug
  );
  return section?.data ?? null;
}

function exposeGlobal(doc) {
  window.FlitsDoc = {
    version: '2.0.0',
    store: docStore,
    getDoc: () => doc,
    getApiById: (id) => docStore.getApiById(id),
    getApiBySlug: (slug) => docStore.getApiBySlug(slug),
    getAllApis: () => docStore.getAllApis(),
    search: (query, limit = 20) => searchDocs(query, limit),
    toAIExport: () => docStore.toAIExport(),
    navigate: (slug, anchor) => {
      import('../features/router.js').then(({ navigateToRoute }) => {
        navigateToRoute(slug, { anchor });
      });
    },
    scrollToSection: (sectionId, options) => {
      import('../toc/rightTOC.js').then(({ scrollToSection }) =>
        scrollToSection(sectionId, options)
      );
    },
  };
}

function searchDocs(query, limit) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const index = docStore.getSearchIndex();
  const scored = index
    .map((entry) => {
      const title = entry.title?.toLowerCase() || '';
      const text = entry.text?.toLowerCase() || '';
      const url = entry.url?.toLowerCase() || '';
      let score = 0;
      if (title === q) score += 100;
      else if (title.startsWith(q)) score += 50;
      else if (title.includes(q)) score += 30;
      if (entry.method?.toLowerCase() === q) score += 40;
      if (url.includes(q)) score += 25;
      if (text.includes(q)) score += 10;
      if (entry.subtitle?.toLowerCase().includes(q)) score += 15;
      return { entry, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored.map((x) => x.entry);
}
