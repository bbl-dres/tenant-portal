// Compare two design-review capture trees (see capture-baseline.mjs).
//
// Usage: node scripts/review/diff-baseline.mjs <baselineDir> <candidateDir>
//
// Walks every */*/w*.hashes.json under the baseline, aligns element records
// by document-order index against the candidate, and reports every element
// whose computed-style hash (main, ::before or ::after) differs — plus
// structural mismatches (different element count / tag / class), which
// usually mean the app itself changed rather than the CSS.
// Exit code 1 when any difference is found.
//
// --subset: walk the CANDIDATE side instead — for quick iteration runs that
// captured only a width subset; baseline captures without a candidate
// counterpart are then not treated as missing.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2).filter(a => a !== '--subset');
const subset = process.argv.includes('--subset');
const [baseDir, candDir] = args;
if (!baseDir || !candDir) {
  console.error('usage: node scripts/review/diff-baseline.mjs [--subset] <baselineDir> <candidateDir>');
  process.exit(2);
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (name.endsWith('.hashes.json')) yield p;
  }
}

const MAX_DETAIL = 40;
let filesCompared = 0;
let filesDiffering = 0;
let missing = 0;
const detail = [];

const walkRoot = subset ? candDir : baseDir;
for (const walkPath of walk(walkRoot)) {
  const rel = relative(walkRoot, walkPath);
  const basePath = join(baseDir, rel);
  const candPath = join(candDir, rel);
  const label = rel.split(sep).join('/');
  if (!existsSync(candPath) || !existsSync(basePath)) {
    missing++;
    detail.push(`MISSING in ${existsSync(basePath) ? 'candidate' : 'baseline'}: ${label}`);
    continue;
  }
  const a = JSON.parse(readFileSync(basePath, 'utf8'));
  const b = JSON.parse(readFileSync(candPath, 'utf8'));
  filesCompared++;
  const diffs = [];
  if (a.length !== b.length) {
    diffs.push(`element count ${a.length} → ${b.length} (structural: DOM changed, not just styles)`);
  }
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const ea = a[i];
    const eb = b[i];
    if (ea.t !== eb.t || ea.c !== eb.c) {
      diffs.push(`#${i} structure <${ea.t} class="${ea.c}"> → <${eb.t} class="${eb.c}">`);
      continue;
    }
    const parts = [];
    if (ea.h !== eb.h) parts.push('style');
    if (ea.hb !== eb.hb) parts.push('::before');
    if (ea.ha !== eb.ha) parts.push('::after');
    if (parts.length) diffs.push(`#${i} <${ea.t}${ea.c ? ` class="${ea.c}"` : ''}> differs: ${parts.join(', ')}`);
  }
  if (diffs.length) {
    filesDiffering++;
    detail.push(`\n${label} — ${diffs.length} difference(s):`);
    for (const d of diffs.slice(0, MAX_DETAIL)) detail.push(`  ${d}`);
    if (diffs.length > MAX_DETAIL) detail.push(`  … and ${diffs.length - MAX_DETAIL} more`);
  }
}

console.log(detail.join('\n'));
console.log(`\ndiff-baseline: ${filesCompared} capture(s) compared, ${filesDiffering} differing, ${missing} missing`);
process.exit(filesDiffering || missing ? 1 : 0);
