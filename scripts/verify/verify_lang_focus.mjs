// Inspect the current focus + active styles of the language switcher,
// compare to CD Bund DS canonical values.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8000/Documents/GitHub/tenant-portal';
const OUT  = 'c:/Users/DavidRasner/Documents/GitHub/tenant-portal/verify_out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

// State A: BUTTON focused via keyboard (Tab until we reach it).
// To force :focus-visible reliably, we keyboard-focus the button.
await page.evaluate(() => {
  const btn = document.querySelector('.top-bar__lang');
  btn.focus();
  // Simulate a keyboard interaction so :focus-visible is forced.
  btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
});
await page.waitForTimeout(150);

const buttonFocusStyle = await page.evaluate(() => {
  const btn = document.querySelector('.top-bar__lang');
  const cs = getComputedStyle(btn);
  return {
    outlineColor: cs.outlineColor,
    outlineWidth: cs.outlineWidth,
    outlineStyle: cs.outlineStyle,
    outlineOffset: cs.outlineOffset,
    boxShadow: cs.boxShadow,
  };
});
console.log('=== A) Closed button — :focus styles (keyboard focused) ===');
for (const [k, v] of Object.entries(buttonFocusStyle)) console.log(`  ${k}: ${v}`);

const bbox = await page.locator('.top-bar__lang').boundingBox();
await page.screenshot({
  path: `${OUT}/lang_focus_01_button_keyboard.png`,
  clip: { x: Math.max(0, bbox.x - 12), y: Math.max(0, bbox.y - 12), width: bbox.width + 24, height: bbox.height + 24 },
});

// State B: open dropdown, focus the active OPTION
await page.locator('.top-bar__lang').click();
await page.waitForTimeout(200);
await page.evaluate(() => {
  const opt = document.querySelector('.language-switcher__option--active');
  opt.focus();
  opt.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
});
await page.waitForTimeout(150);

const optionFocusStyle = await page.evaluate(() => {
  const opt = document.querySelector('.language-switcher__option--active');
  const cs = getComputedStyle(opt);
  return {
    outlineColor: cs.outlineColor,
    outlineWidth: cs.outlineWidth,
    outlineStyle: cs.outlineStyle,
    outlineOffset: cs.outlineOffset,
    backgroundColor: cs.backgroundColor,
    color: cs.color,
    boxShadow: cs.boxShadow,
  };
});
console.log('\n=== B) Active option — :focus styles (keyboard focused) ===');
for (const [k, v] of Object.entries(optionFocusStyle)) console.log(`  ${k}: ${v}`);

// State C: HOVER state on inactive option
await page.evaluate(() => {
  const inactive = document.querySelectorAll('.language-switcher__option')[1];
  inactive.focus();
  inactive.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
});
await page.waitForTimeout(150);
const inactiveFocusStyle = await page.evaluate(() => {
  const opt = document.querySelectorAll('.language-switcher__option')[1];
  const cs = getComputedStyle(opt);
  return {
    outlineColor: cs.outlineColor,
    backgroundColor: cs.backgroundColor,
    color: cs.color,
  };
});
console.log('\n=== C) Inactive option — :focus styles (FR focused via keyboard) ===');
for (const [k, v] of Object.entries(inactiveFocusStyle)) console.log(`  ${k}: ${v}`);

// Token resolved values
const tokens = await page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  return {
    '--color-focus':              cs.getPropertyValue('--color-focus').trim(),
    '--color-focus-dark':         cs.getPropertyValue('--color-focus-dark').trim(),
    '--color-lang-active':        cs.getPropertyValue('--color-lang-active').trim(),
    '--color-lang-active-hover':  cs.getPropertyValue('--color-lang-active-hover').trim(),
    '--color-surface-dark':       cs.getPropertyValue('--color-surface-dark').trim(),
  };
});
console.log('\n=== D) Current token values (tenant-portal) ===');
for (const [k, v] of Object.entries(tokens)) console.log(`  ${k}: ${v}`);

console.log('\n=== E) CD Bund canonical values (from designsystem) ===');
console.log('  *:focus-visible              → ring-2 ring-purple-500 (#8655F6)');
console.log('  .top-bar *:focus-visible     → ring-2 ring-purple-300 (#C4B5FD)');
console.log('  intranet --color-primary-600 → #2563eb (tailwind blue-600)');
console.log('  intranet --color-primary-700 → #1d4ed8 (tailwind blue-700)');
console.log('  default  --color-primary-600 → #d8232a (Swiss red)');

// Take an "open + active option focused" screenshot bounded to the switcher
const dropdownBox = await page.locator('.language-switcher__dropdown').boundingBox();
const switcherBox = await page.locator('.language-switcher').boundingBox();
const x = Math.min(switcherBox.x, dropdownBox.x) - 16;
const y = Math.min(switcherBox.y, dropdownBox.y) - 16;
const right = Math.max(switcherBox.x + switcherBox.width, dropdownBox.x + dropdownBox.width) + 16;
const bottom = Math.max(switcherBox.y + switcherBox.height, dropdownBox.y + dropdownBox.height) + 16;
await page.screenshot({
  path: `${OUT}/lang_focus_02_option_keyboard.png`,
  clip: { x: Math.max(0, x), y: Math.max(0, y), width: right - x, height: bottom - y },
});
console.log(`\nScreenshots:`);
console.log(`  ${OUT}/lang_focus_01_button_keyboard.png`);
console.log(`  ${OUT}/lang_focus_02_option_keyboard.png`);

await browser.close();
