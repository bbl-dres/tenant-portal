import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const targets = [
  ...filesIn('js', file => file.endsWith('.js')),
  ...filesIn('scripts', file => file.endsWith('.mjs')),
  ...filesIn(path.join('scripts', 'verify'), file => file.endsWith('.mjs')),
];

let failed = false;

for (const file of targets) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    failed = true;
    const rel = path.relative(root, file);
    console.error(`Syntax check failed: ${rel}`);
    if (result.stdout) console.error(result.stdout.trim());
    if (result.stderr) console.error(result.stderr.trim());
  }
}

if (failed) {
  process.exit(1);
}

console.log(`JavaScript syntax check passed (${targets.length} files).`);

function filesIn(dir, predicate) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true })
    .filter(entry => entry.isFile() && predicate(entry.name))
    .map(entry => path.join(abs, entry.name));
}
