/**
 * Global Environment Variable Store
 *
 * Persists merchant-defined variables (base_url, flits_token, etc.) in
 * localStorage. Notifies subscribers whenever values change so all Try It
 * panels can refresh automatically.
 *
 * Variable priority (highest → lowest):
 *   1. API-specific value typed directly in a Try It field (data-user-modified)
 *   2. Global env value defined here
 *   3. Original Postman placeholder  {{varName}}
 */

const STORAGE_KEY = '_flits_env_v1';

/** Matches  {{varName}}  patterns in strings */
const VAR_RE = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

let _env  = {};
let _subs = [];

// ── Persistence ────────────────────────────────────────────────────────────

/** Load from localStorage into module state. Returns a copy of the env. */
export function loadEnv() {
  try { _env = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { _env = {}; }
  return { ..._env };
}

function _persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_env)); }
  catch {}
}

// ── Getters / setters ─────────────────────────────────────────────────────

export function getEnv() { return { ..._env }; }

/**
 * Set a single variable. Passing '' or null removes it.
 * Skips write + notify when the value hasn't changed.
 */
export function setVar(name, value) {
  if (value == null || value === '') {
    if (!(name in _env)) return;
    delete _env[name];
  } else {
    if (_env[name] === value) return;
    _env[name] = value;
  }
  _persist();
  _notify();
}

/** Remove all stored variables. */
export function clearAll() {
  if (Object.keys(_env).length === 0) return;
  _env = {};
  _persist();
  _notify();
}

// ── String interpolation ──────────────────────────────────────────────────

/**
 * Replace every  {{name}}  in `text` with its stored value.
 * Placeholders with no stored value are left as-is.
 */
export function applyEnv(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(VAR_RE, (match, name) => {
    const v = _env[name];
    return (v !== undefined && v !== '') ? v : match;
  });
}

// ── Variable discovery ────────────────────────────────────────────────────

/**
 * Scan the entire parsed doc for  {{varName}}  patterns and return a sorted,
 * deduplicated list of variable names. Never hardcodes names.
 */
export function discoverVariables(doc) {
  const found = new Set();

  const scan = (s) => {
    if (!s || typeof s !== 'string') return;
    for (const m of s.matchAll(new RegExp(VAR_RE.source, 'g'))) found.add(m[1]);
  };

  doc?.apis?.forEach(api => {
    scan(api.urlRaw);
    scan(api.urlDisplay);
    scan(api.bodyRaw);
    api.headers?.forEach(h    => { scan(h.key); scan(h.value); });
    api.queryParams?.forEach(q => { scan(q.key); scan(q.value); });
    api.pathVariables?.forEach(v => found.add(v.key));
  });

  return [...found].sort((a, b) => a.localeCompare(b));
}

// ── Pub/sub ───────────────────────────────────────────────────────────────

/**
 * Subscribe to env changes. Returns an unsubscribe function.
 * @param {(env: Record<string,string>) => void} cb
 */
export function onEnvChange(cb) {
  _subs.push(cb);
  return () => { _subs = _subs.filter(s => s !== cb); };
}

function _notify() {
  const snap = getEnv();
  _subs.forEach(cb => { try { cb(snap); } catch {} });
}
