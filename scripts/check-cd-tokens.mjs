import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const tenantTokensPath = path.join(root, 'css', 'tokens.css');
const appPath = path.join(root, 'js', 'app.js');
const dsRootCandidates = [
  process.env.SWISS_DESIGNSYSTEM_DIR,
  path.resolve(root, '..', 'designsystem'),
  'C:/Users/DavidRasner/Documents/GitHub/designsystem',
].filter(Boolean);
const dsTokensPath = dsRootCandidates
  .map(dir => path.join(dir, 'css', 'skins', 'default.postcss'))
  .find(file => fs.existsSync(file));

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function tokenValue(source, name) {
  const re = new RegExp(`${name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*:\\s*([^;]+);`, 'i');
  const match = source.match(re);
  return match ? match[1].trim().toLowerCase() : null;
}

function assertSameToken(tenantSource, dsSource, name, failures) {
  const tenant = tokenValue(tenantSource, name);
  const ds = tokenValue(dsSource, name);
  if (!tenant || !ds) {
    failures.push(`${name}: missing in ${!tenant ? 'tenant' : 'designsystem'}`);
    return;
  }
  if (tenant !== ds) {
    failures.push(`${name}: tenant ${tenant} != designsystem ${ds}`);
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

const failures = [];

if (!dsTokensPath) {
  failures.push(`Design system token file not found. Checked: ${dsRootCandidates.join(', ')}`);
} else {
  const tenantTokens = read(tenantTokensPath);
  const dsTokens = read(dsTokensPath);
  for (const family of ['primary', 'secondary']) {
    for (const step of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']) {
      assertSameToken(tenantTokens, dsTokens, `--color-${family}-${step}`, failures);
    }
  }
}

const hardcodedJsColors = hardcodedJsColorsOutsideFallbackBlock(read(appPath));
if (hardcodedJsColors.length) {
  failures.push(`Hardcoded JS colors outside CD_COLOR_FALLBACKS:\n${hardcodedJsColors.join('\n')}`);
}

if (failures.length) {
  console.error('CD token check failed:');
  failures.forEach(f => console.error(`- ${f}`));
  process.exit(1);
}

console.log('CD token check passed.');
