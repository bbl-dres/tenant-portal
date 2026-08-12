import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
// All design tokens live in exactly ONE file (design-review round 2,
// Phase B). Every other stylesheet must consume var(--…) only.
const tokensPath = path.join(root, 'css', 'foundations', 'tokens.css');
const cssRoot = path.join(root, 'css');
const jsTemplatePaths = [
  path.join(root, 'js', 'app.js'),
  path.join(root, 'js', 'shell.js'),
  path.join(root, 'js', 'wizard.js'),
  path.join(root, 'js', 'lib.js'),
];

// Pre-existing off-scale values, grandfathered at the Phase B split so the
// guard could land without visual changes. The 2026-08 CD re-audit cleared
// every entry (tokenised or deleted as dead CSS) — the list is now EMPTY
// and must stay that way: a new violation is not coverable without adding
// an entry here, which is the point: it shows up in review.
const GRANDFATHERED = [];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function walkCss(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walkCss(p, out);
    else if (name.endsWith('.css')) out.push(p);
  }
  return out;
}

// Verify each expected CD Bund color token is declared in the tokens file.
// The actual values aren't compared against the upstream `swiss/designsystem`
// — that comparison would require cloning a heavy sibling repo. Local
// presence is enough to catch accidental token removal.
function assertTokenDeclared(tokensSource, name, failures) {
  const re = new RegExp(`${name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*:\\s*[^;]+;`);
  if (!re.test(tokensSource)) {
    failures.push(`${name}: missing in css/foundations/tokens.css`);
  }
}

// Scans every JS template file, not only app.js — a rogue hex color in
// shell.js/wizard.js/lib.js is just as much a CD violation. The
// CD_COLOR_FALLBACKS escape hatch only exists in app.js; for the other
// files the block simply never matches.
function hardcodedJsColorsOutsideFallbackBlock(appSource) {
  const lines = appSource.split(/\r?\n/);
  let insideFallbacks = false;
  const hits = [];

  lines.forEach((line, index) => {
    if (line.includes('const CD_COLOR_FALLBACKS = {')) insideFallbacks = true;
    if (!insideFallbacks) {
      const matches = line.match(/(?<!&)#[0-9A-Fa-f]{3,8}\b/g);
      if (matches) hits.push(`${index + 1}: ${matches.join(', ')}`);
    }
    if (insideFallbacks && line.trim() === '};') insideFallbacks = false;
  });

  return hits;
}

function stripCssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

function stripLineComments(source) {
  return source
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');
}

function inlineStyleAttributes(file, source) {
  const cleaned = stripLineComments(source);
  const hits = [];
  cleaned.split(/\r?\n/).forEach((line, index) => {
    if (/\bstyle\s*=/.test(line)) hits.push(`${path.relative(root, file)}:${index + 1}`);
  });
  return hits;
}

// ── Per-stylesheet scans (everything under css/ except the tokens file) ──
// 1. Colour literals: any hex / rgb() / hsl() outside the tokens file.
// 2. Raw px font sizes: font-size with a px value (the type scale lives in
//    tokens as --text-*).
// 3. Off-scale spacing: margin/padding/gap declarations with px values of
//    3px or more (0/1px/2px pass — hairline borders and optical nudges are
//    not spacing-scale concerns; the scale itself is --space-*).
function scanStylesheet(file, source) {
  const rel = path.relative(cssRoot, file).split(path.sep).join('/');
  const hits = { colors: [], fonts: [], spacing: [] };
  const grandfathered = GRANDFATHERED.filter(g => g.file === rel).map(g => g.decl);
  const used = new Array(grandfathered.length).fill(false);
  const covered = (line) => {
    const t = line.trim();
    for (let i = 0; i < grandfathered.length; i++) {
      if (!used[i] && t.includes(grandfathered[i])) { used[i] = true; return true; }
    }
    return false;
  };
  stripCssComments(source).split(/\r?\n/).forEach((line, index) => {
    const loc = `${rel}:${index + 1}`;
    const colorMatches = [
      ...line.matchAll(/#[0-9A-Fa-f]{3,8}\b/g),
      ...line.matchAll(/\b(?:rgb|rgba|hsl|hsla)\(/gi),
    ].map(m => m[0]);
    if (colorMatches.length) hits.colors.push(`${loc}: ${colorMatches.join(', ')}`);
    if (/font-size\s*:[^;]*\dpx/.test(line) && !covered(line)) {
      hits.fonts.push(`${loc}: ${line.trim().slice(0, 80)}`);
    }
    const sp = line.match(/^\s*(?:margin|padding|gap|row-gap|column-gap)[^:]*:\s*([^;]+);/);
    if (sp && /(^|\s|\()([3-9]|\d\d+)px/.test(sp[1]) && !covered(line)) {
      hits.spacing.push(`${loc}: ${line.trim().slice(0, 80)}`);
    }
  });
  return hits;
}

const failures = [];

const tokensSource = read(tokensPath);
for (const family of ['primary', 'secondary']) {
  for (const step of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']) {
    assertTokenDeclared(tokensSource, `--color-${family}-${step}`, failures);
  }
}

const hardcodedJsColors = jsTemplatePaths.flatMap(file => {
  const rel = path.relative(root, file);
  return hardcodedJsColorsOutsideFallbackBlock(read(file)).map(hit => `${rel}:${hit}`);
});
if (hardcodedJsColors.length) {
  failures.push(`Hardcoded JS colors outside CD_COLOR_FALLBACKS:\n${hardcodedJsColors.join('\n')}`);
}

const allColors = [];
const allFonts = [];
const allSpacing = [];
for (const file of walkCss(cssRoot)) {
  if (path.resolve(file) === path.resolve(tokensPath)) continue;
  const hits = scanStylesheet(file, read(file));
  allColors.push(...hits.colors);
  allFonts.push(...hits.fonts);
  allSpacing.push(...hits.spacing);
}
if (allColors.length) {
  failures.push(`Hardcoded CSS colors outside css/foundations/tokens.css:\n${allColors.join('\n')}`);
}
if (allFonts.length) {
  failures.push(`Raw px font sizes outside css/foundations/tokens.css (type scale is --text-*):\n${allFonts.join('\n')}`);
}
if (allSpacing.length) {
  failures.push(`Off-scale spacing values (>2px literal; scale is --space-*):\n${allSpacing.join('\n')}`);
}

const inlineStyleHits = jsTemplatePaths.flatMap(file => inlineStyleAttributes(file, read(file)));
if (inlineStyleHits.length) {
  failures.push(`Inline style attributes in JS templates:\n${inlineStyleHits.join('\n')}`);
}

if (failures.length) {
  console.error('CD token check failed:');
  failures.forEach(f => console.error(`- ${f}`));
  process.exit(1);
}

console.log('CD token check passed.');
