// Update Status cells in docs/design-review.md by finding id.
// Usage: node scripts/review/mark-findings.mjs <status> <commitOrReason> <ID> [ID…]
//   e.g. node scripts/review/mark-findings.mjs Fixed abc1234 TOK-001 TOK-002
// For "Fixed", the commit ref is appended to the comment cell.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , status, ref, ...ids] = process.argv;
if (!status || !ref || !ids.length) {
  console.error('usage: node scripts/review/mark-findings.mjs <status> <commitOrReason> <ID> [ID…]');
  process.exit(2);
}
const path = 'docs/design-review.md';
const src = readFileSync(path, 'utf8');
const lines = src.split('\n');
const done = new Set();
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^\| ([A-Z0-9]+-\d{3}) \|/);
  if (!m || !ids.includes(m[1])) continue;
  const cells = lines[i].split(' | ');
  if (cells.length < 6) continue;
  cells[4] = status;
  if (status === 'Fixed') {
    cells[5] = cells[5].replace(/ \|$/, '') + ` Fixed in ${ref}. |`;
  } else {
    cells[5] = cells[5].replace(/ \|$/, '') + ` ${ref}. |`;
  }
  lines[i] = cells.join(' | ');
  done.add(m[1]);
}
writeFileSync(path, lines.join('\n'));
const missing = ids.filter(id => !done.has(id));
console.log(`updated: ${[...done].join(', ') || 'none'}`);
if (missing.length) {
  console.error(`NOT FOUND: ${missing.join(', ')}`);
  process.exit(1);
}
