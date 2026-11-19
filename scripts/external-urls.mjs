#!/usr/bin/env node
/**
 * Supply-chain transparency check: scans the card and the demo for external
 * http(s) references. Known origins are allowed; anything new fails the build
 * so a third-party resource can never sneak in unnoticed.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ALLOWED = [
  'fonts.googleapis.com', // the optional Space Grotesk font (font: theme avoids it)
  'fonts.gstatic.com',    // served by Google Fonts itself
  'cdn.jsdelivr.net',     // MDI webfont, demo page only
  'github.com',           // repo links
  'hacs.xyz',
  'www.home-assistant.io',
  'www.w3.org' // SVG namespace identifier in the favicon data URI, not a network request
];

const targets = [];
for (const dir of ['dist', 'demo']) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (/\.(js|html)$/.test(f)) targets.push(join(dir, f));
  }
}

const re = /https?:\/\/[a-zA-Z0-9.-]+/g;
const found = new Map(); // origin -> Set of files
let bad = 0;

for (const file of targets) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(re)) {
    const origin = m[0].replace(/^https?:\/\//, '');
    if (!found.has(origin)) found.set(origin, new Set());
    found.get(origin).add(file);
    if (!ALLOWED.includes(origin)) bad++;
  }
}

console.log(`Scanned ${targets.length} files, found ${found.size} external origin(s):\n`);
for (const [origin, files] of [...found].sort()) {
  const ok = ALLOWED.includes(origin);
  console.log(`  ${ok ? '✓' : '✗'} ${origin}  (${[...files].join(', ')})`);
}

if (bad) {
  console.error(`\nFAIL: ${bad} not-allowlisted external origin(s). Add them to ALLOWED on purpose.`);
  process.exit(1);
}
console.log('\nOK: no unexpected third-party resources.');
