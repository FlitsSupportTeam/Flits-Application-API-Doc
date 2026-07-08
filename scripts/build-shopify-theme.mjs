#!/usr/bin/env node
/**
 * Builds flat Shopify theme assets (no subfolders — Shopify requirement).
 * Output: Shopify theme/assets/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outAssets = path.join(root, 'Shopify theme', 'assets');

// NOTE: css/chatAssistant.css is intentionally OMITTED — the AI chatbot is
// excluded from the Shopify build. (main.css's `@import './chatAssistant.css'`
// is stripped below too, so chatbot CSS never reaches the Shopify bundle.)
const cssFiles = [
  'css/variables.css',
  'css/page.css',
  'css/toc.css',
  'css/devPanel.css',
  'css/envPanel.css',
];

// esbuild plugin: replace the chatbot module with a no-op stub so none of its
// code is bundled into the Shopify JS. main.js still imports + calls
// initializeChatAssistant(), which the stub satisfies as a no-op.
const excludeChatbotPlugin = {
  name: 'exclude-chatbot',
  setup(build) {
    build.onLoad({ filter: /[\\/]chatAssistant\.js$/ }, () => ({
      contents: 'export function initializeChatAssistant() {}\n',
      loader: 'js',
    }));
  },
};

async function buildCss() {
  const fontImport =
    "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');\n";
  let main = fs.readFileSync(path.join(root, 'css/main.css'), 'utf8');
  main = main.replace(/^@import[^;]+;\s*/gm, '');
  const parts = [fontImport, ...cssFiles.map((f) => fs.readFileSync(path.join(root, f), 'utf8'))];
  parts.push(main);
  return parts.join('\n');
}

async function main() {
  fs.mkdirSync(outAssets, { recursive: true });

  await build({
    entryPoints: [path.join(root, 'js/main.js')],
    bundle: true,
    format: 'esm',
    outfile: path.join(outAssets, 'flits-api-docs.js'),
    sourcemap: false,
    target: ['es2020'],
    plugins: [excludeChatbotPlugin],
  });

  fs.writeFileSync(path.join(outAssets, 'flits-api-docs.css'), await buildCss());
  fs.copyFileSync(
    path.join(root, 'data/Flits App.postman_collection.json'),
    path.join(outAssets, 'flits-api-docs.postman_collection.json')
  );

  console.log('Built Shopify theme assets:');
  console.log('  Shopify theme/assets/flits-api-docs.js');
  console.log('  Shopify theme/assets/flits-api-docs.css');
  console.log('  Shopify theme/assets/flits-api-docs.postman_collection.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
