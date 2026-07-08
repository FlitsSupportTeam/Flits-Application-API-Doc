#!/usr/bin/env node
import fs from 'fs';
import { parseHTML } from 'linkedom';
import { parsePostmanCollection } from '../js/parser/postmanParser.js';
import { renderPage, enhanceProseHeadings } from '../js/render/pageView.js';
import { collectTocEntries } from '../js/toc/tocCollector.js';
import { docStore } from '../js/data/docStore.js';

globalThis.window = globalThis.window || {};

const doc = parsePostmanCollection(
  JSON.parse(fs.readFileSync(new URL('../data/Flits App.postman_collection.json', import.meta.url), 'utf8'))
);
docStore.setDoc(doc);

function tocFor(slug) {
  const html = renderPage(docStore.getSectionBySlug(slug));
  const { document } = parseHTML(`<div id="content-root">${html}</div>`);
  const root = document.getElementById('content-root');
  enhanceProseHeadings(root);
  return collectTocEntries(root).map((e) => e.title);
}

const loyalty = tocFor('flits-loyalty-app');
const bad = [
  '401 Unauthorized',
  '404 Not Found',
  '400 Bad Request',
  '500 Internal Server',
  'Could Not Load Examples',
];
const failures = [];

for (const b of bad) {
  if (loyalty.some((t) => t.includes(b))) failures.push(`loyalty: should not include "${b}"`);
}
if (!loyalty.some((t) => t.includes('Troubleshooting Guide'))) {
  failures.push('loyalty: missing Troubleshooting Guide');
}

const intro = tocFor('overview');
if (intro.some((t) => t === 'Flits Loyalty App' || t.includes('Flits Wishlist App'))) {
  failures.push('intro: nested h4 product lines should not be in TOC');
}
if (!intro.some((t) => t.includes("What's Inside"))) {
  failures.push("intro: missing What's Inside");
}

const apiSec = doc.sections.find((s) => s.type === 'api' && s.data.slug.includes('get-balance'));
const apiHtml = renderPage({ type: 'api', data: apiSec.data });
const { document: d2 } = parseHTML(`<div id="content-root">${apiHtml}</div>`);
enhanceProseHeadings(d2.getElementById('content-root'));
const apiIds = collectTocEntries(d2.getElementById('content-root')).map((e) => e.id);
if (!apiIds.includes('endpoint')) failures.push('api: missing endpoint section');

if (failures.length) {
  console.error('FAILED:\n', failures.join('\n'));
  console.error('loyalty TOC:', loyalty.join(' | '));
  console.error('intro TOC:', intro.join(' | '));
  process.exit(1);
}

console.log('Doc TOC depth check passed.');
console.log('Loyalty entries:', loyalty.length);
console.log('Intro entries:', intro.length);
console.log('API sections:', apiIds.join(', '));
