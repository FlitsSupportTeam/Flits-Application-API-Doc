#!/usr/bin/env node
/**
 * Full-platform TOC audit — folders, overview, all APIs.
 * Run: node scripts/audit-toc.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseHTML } from 'linkedom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const { parsePostmanCollection } = await import(
  new URL('../js/parser/postmanParser.js', import.meta.url)
);
const { renderPage, enhanceProseHeadings } = await import(
  new URL('../js/render/pageView.js', import.meta.url)
);
const {
  collectTocEntries,
  getExpectedApiSectionIds,
  countMarkdownHeadings,
} = await import(new URL('../js/toc/tocCollector.js', import.meta.url));
const { markdownToHtml } = await import(new URL('../js/utils/markdown.js', import.meta.url));

const collectionPath = path.join(root, 'data', 'Flits App.postman_collection.json');
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
const doc = parsePostmanCollection(collection);

const issues = [];
let passed = 0;
let pages = 0;

function auditPage(label, section) {
  pages++;
  const html = renderPage(section);
  const { document } = parseHTML(
    `<div id="content-root">${html}</div>`
  );
  const container = document.getElementById('content-root');
  enhanceProseHeadings(container);
  const entries = collectTocEntries(container);

  const ids = entries.map((e) => e.id);
  const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupIds.length) {
    issues.push({ label, type: 'duplicate-id', detail: [...new Set(dupIds)] });
  }

  if (section.type === 'api') {
    const expected = getExpectedApiSectionIds(section.data);
    const missing = expected.filter((id) => !ids.includes(id));
    const extra = ids.filter((id) => !expected.includes(id));
    if (missing.length) {
      issues.push({ label, type: 'api-missing-section', detail: missing });
    }
    if (extra.length) {
      issues.push({ label, type: 'api-extra-section', detail: extra });
    }
    if (!missing.length && !extra.length && !dupIds.length) passed++;
    else if (!missing.length && !dupIds.length) passed++;
    return { label, type: 'api', count: entries.length, ids };
  }

  if (section.type === 'folder' || section.type === 'overview') {
    const desc =
      section.type === 'overview'
        ? section.data.description
        : section.data.description;
    const md = countMarkdownHeadings(desc);
    const expectedMin = md.h2 + md.h3;
    const proseInHtml = (html.match(/class="md-h[234]"/g) || []).length;

    if (expectedMin > 0 && entries.length < expectedMin) {
      issues.push({
        label,
        type: 'doc-undercount',
        detail: { toc: entries.length, markdownHeadings: expectedMin, proseInHtml },
      });
    }
    if (entries.length === 0 && expectedMin > 0) {
      issues.push({ label, type: 'doc-empty-toc', detail: { expectedMin } });
    }
    if (entries.length > 0 && !dupIds.length) passed++;
    return { label, type: section.type, count: entries.length, md, ids: ids.slice(0, 8) };
  }

  return { label, count: entries.length };
}

// Mock docStore for overview render (uses docStore.doc)
globalThis.window = globalThis.window || {};
const { docStore } = await import(new URL('../js/data/docStore.js', import.meta.url));
docStore.setDoc(doc);

for (const section of doc.sections) {
  const label =
    section.type === 'api'
      ? `API: ${section.data.slug}`
      : section.type === 'folder'
        ? `Folder: ${section.data.slug}`
        : 'Overview';
  auditPage(label, section);
}

console.log('\n=== TOC Platform Audit ===\n');
console.log(`Pages scanned: ${pages}`);
console.log(`Passed checks: ${passed}`);
console.log(`Issues: ${issues.length}\n`);

if (issues.length) {
  for (const issue of issues) {
    console.log(`[${issue.type}] ${issue.label}`);
    console.log('  ', JSON.stringify(issue.detail));
  }
  process.exit(1);
}

console.log('All pages passed TOC audit.\n');

// Summary table
const folders = doc.sections.filter((s) => s.type === 'folder');
const apis = doc.sections.filter((s) => s.type === 'api');
console.log(`Folders: ${folders.length}, APIs: ${apis.length}, Overview: 1`);

for (const f of folders) {
  const { document } = parseHTML(
    `<div id="content-root">${renderPage({ type: 'folder', data: f.data })}</div>`
  );
  const c = document.getElementById('content-root');
  enhanceProseHeadings(c);
  const n = collectTocEntries(c).length;
  const md = countMarkdownHeadings(f.data.description);
  console.log(`  ${f.data.slug}: ${n} TOC items (md h2=${md.h2} h3=${md.h3} h4=${md.h4})`);
}
