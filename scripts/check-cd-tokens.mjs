import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const tokensPath = path.join(root, 'css', 'tokens.css');
const stylesPath = path.join(root, 'css', 'styles.css');
const appPath = path.join(root, 'js', 'app.js');
const jsTemplatePaths = [
  path.join(root, 'js', 'app.js'),
  path.join(root, 'js', 'shell.js'),
  path.join(root, 'js', 'wizard.js'),
  path.join(root, 'js', 'lib.js'),
];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

// Verify each expected CD Bund color token is declared in css/tokens.css.
// The actual values aren't compared against the upstream `swiss/designsystem`
// — that comparison would require cloning a heavy sibling repo. Local
// presence is enough to catch accidental token removal.
function assertTokenDeclared(tokensSource, name, failures) {
  const re = new RegExp(`${name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*:\\s*[^;]+;`);
  if (!re.test(tokensSource)) {
    failures.push(`${name}: missing in css/tokens.css`);
  }
}

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

function hardcodedCssColors(stylesSource) {
  const source = stripCssComments(stylesSource);
  const hits = [];
  source.split(/\r?\n/).forEach((line, index) => {
    const matches = [
      ...line.matchAll(/#[0-9A-Fa-f]{3,8}\b/g),
      ...line.matchAll(/\b(?:rgb|rgba|hsl|hsla)\(/gi),
    ].map(match => match[0]);
    if (matches.length) hits.push(`${index + 1}: ${matches.join(', ')}`);
  });
  return hits;
}

function inlineStyleAttributes(file, source) {
  const cleaned = stripLineComments(source);
  const hits = [];
  cleaned.split(/\r?\n/).forEach((line, index) => {
    if (/\bstyle\s*=/.test(line)) hits.push(`${path.relative(root, file)}:${index + 1}`);
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

const hardcodedJsColors = hardcodedJsColorsOutsideFallbackBlock(read(appPath));
if (hardcodedJsColors.length) {
  failures.push(`Hardcoded JS colors outside CD_COLOR_FALLBACKS:\n${hardcodedJsColors.join('\n')}`);
}

const hardcodedCssColorHits = hardcodedCssColors(read(stylesPath));
if (hardcodedCssColorHits.length) {
  failures.push(`Hardcoded CSS colors outside css/tokens.css:\n${hardcodedCssColorHits.join('\n')}`);
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
