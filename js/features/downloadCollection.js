/**
 * Postman Collection download — three reusable primitives.
 *
 *   generateCollectionBlob()     Fetch the raw JSON and return a Blob.
 *   triggerCollectionDownload()  Inject a temp <a>, click it, revoke the URL.
 *   downloadPostmanCollection()  Orchestrate: loading state → blob → download.
 */

import { getCollectionPath } from '../parser/postmanParser.js';
import { docStore } from '../data/docStore.js';

// ── 1. Fetch and return a typed Blob ──────────────────────────────────────

export async function generateCollectionBlob() {
  const response = await fetch(getCollectionPath());
  if (!response.ok) {
    throw new Error(`Failed to fetch collection (${response.status} ${response.statusText})`);
  }
  const json = await response.json();          // validate: must be parseable JSON
  const text = JSON.stringify(json, null, 2);  // pretty-print
  return new Blob([text], { type: 'application/json' });
}

// ── 2. Trigger a browser file-download from a Blob ────────────────────────

export function triggerCollectionDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick so the browser has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── 3. Orchestrate: loading state → blob → download ───────────────────────

export async function downloadPostmanCollection() {
  const btn = document.getElementById('download-collection-btn');

  // Loading state
  _setButtonState(btn, 'loading');

  try {
    const blob     = await generateCollectionBlob();
    const rawName  = docStore.doc?.meta?.name || 'api-collection';
    const filename = _sanitizeFilename(rawName) + '.postman_collection.json';
    triggerCollectionDownload(blob, filename);
    _setButtonState(btn, 'success');
  } catch (err) {
    console.error('[DownloadCollection]', err);
    _setButtonState(btn, 'error');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function _sanitizeFilename(name) {
  return String(name)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function _setButtonState(btn, state) {
  if (!btn) return;

  // CSS drives icon/spinner visibility via these classes — no hidden attribute needed
  btn.disabled = state === 'loading';
  btn.classList.remove('is-loading', 'is-success', 'is-error');

  if (state === 'loading') {
    btn.classList.add('is-loading');
  } else if (state === 'success') {
    btn.classList.add('is-success');
    setTimeout(() => _setButtonState(btn, 'idle'), 2000);
  } else if (state === 'error') {
    btn.classList.add('is-error');
    setTimeout(() => _setButtonState(btn, 'idle'), 3000);
  }
}
