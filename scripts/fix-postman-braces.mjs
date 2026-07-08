#!/usr/bin/env node
/**
 * Convert single-brace Postman variables {var} → {{var}} in collection JSON.
 * Skips tokens already in {{var}} form and JSON object syntax.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const collectionPath = path.join(__dirname, '..', 'data', 'Flits App.postman_collection.json');

/** Postman variable: {name} where name is a valid identifier */
const SINGLE_VAR = /(?<!\{)\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g;

function countMatches(text) {
  return [...text.matchAll(SINGLE_VAR)].length;
}

function convert(text) {
  return text.replace(SINGLE_VAR, '{{$1}}');
}

const original = fs.readFileSync(collectionPath, 'utf8');
const beforeCount = countMatches(original);
const converted = convert(original);
const afterCount = countMatches(converted);

if (afterCount > 0) {
  const samples = [...converted.matchAll(SINGLE_VAR)].slice(0, 20).map((m) => m[0]);
  console.error('Remaining single-brace variables:', samples);
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(converted);
} catch (err) {
  console.error('Invalid JSON after conversion:', err.message);
  process.exit(1);
}

fs.writeFileSync(collectionPath, converted, 'utf8');

console.log('Collection:', collectionPath);
console.log('Variables converted:', beforeCount);
console.log('Remaining single-brace variables:', afterCount);
console.log('JSON valid:', !!parsed.info?.name);
console.log('Collection name:', parsed.info?.name);
