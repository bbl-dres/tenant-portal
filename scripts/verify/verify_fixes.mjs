// Visual verify: (1) language switcher chevron flush with content edge,
// (2) damage-workflow strings say "BBL Objektmanagement" (not "BBL-IM").
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8000/Documents/GitHub/tenant-portal';
const OUT  = 'c:/Users/DavidRasner/Documents/GitHub/tenant-portal/verify_out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const log = [];
const L = (s) => { console.log(s); log.push(s); };

L('=== STEP 1: Landing page chrome ===');
await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

// Take a close-up screenshot of the top-bar showing the language switcher
const topBar = await page.locator('.top-bar').first();
await topBar.screenshot({ path: `${OUT}/lang_01_closed.png` });
L(`  closed-state screenshot: ${OUT}/lang_01_closed.png`);

// Measure the right-edge alignment of the chevron vs the dropdown
const closedMetrics = await page.evaluate(() => {
  const switcher = document.querySelector('.language-switcher');
  const button = document.querySelector('.top-bar__lang');
  const chevron = button && button.querySelector('svg');
  const rs = switcher.getBoundingClientRect();
  const rb = button.getBoundingClientRect();
  const rc = chevron.getBoundingClientRect();
  const style = getComputedStyle(button);
  return {
    switcherRight: rs.right,
    buttonRight: rb.right,
    chevronRight: rc.right,
    chevronWidth: rc.width,
    buttonPaddingRight: style.paddingRight,
    buttonPaddingLeft: style.paddingLeft,
    deltaSwitcherToChevron: rs.right - rc.right,
    deltaButtonToChevron: rb.right - rc.right,
  };
});
L('  closed-state metrics:');
for (const [k, v] of Object.entries(closedMetrics)) L(`    ${k}: ${v}`);

// Open the dropdown and snapshot to compare chevron x with dropdown right edge
await page.locator('.top-bar__lang').click();
await page.waitForTimeout(250);
await topBar.screenshot({ path: `${OUT}/lang_02_open.png` });
L(`  open-state screenshot:   ${OUT}/lang_02_open.png`);

const openMetrics = await page.evaluate(() => {
  const switcher = document.querySelector('.language-switcher');
  const dropdown = document.querySelector('.language-switcher__dropdown');
  const chevron = document.querySelector('.top-bar__lang svg');
  const rs = switcher.getBoundingClientRect();
  const rd = dropdown.getBoundingClientRect();
  const rc = chevron.getBoundingClientRect();
  return {
    switcherRight: rs.right,
    dropdownRight: rd.right,
    chevronRight: rc.right,
    deltaDropdownToChevron: rd.right - rc.right,
    deltaSwitcherToDropdown: rs.right - rd.right,
  };
});
L('  open-state metrics:');
for (const [k, v] of Object.entries(openMetrics)) L(`    ${k}: ${v}`);

// Close dropdown again
await page.keyboard.press('Escape');
await page.waitForTimeout(150);

L('\n=== STEP 2: damage workflow text — /#/home ===');
await page.evaluate(() => window.t3lite.demoRole('LBO'));
await page.waitForTimeout(800);
await page.goto(`${BASE}/#/home`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const homeText = await page.locator('body').innerText();
const homeHasOld = homeText.includes('BBL-IM');
const homeHasNew = homeText.includes('BBL Objektmanagement');
L(`  /home  body contains 'BBL-IM' (should be false):           ${homeHasOld}`);
L(`  /home  body contains 'BBL Objektmanagement' (should true): ${homeHasNew}`);

// Find the "Schaden melden" card and capture it
const repairCard = page.locator('a[href="#/repair"].card--quick').first();
if (await repairCard.count() > 0) {
  await repairCard.screenshot({ path: `${OUT}/text_01_home_repair_card.png` });
  L(`  repair card screenshot: ${OUT}/text_01_home_repair_card.png`);
  const cardText = (await repairCard.innerText()).replace(/\s+/g, ' ');
  L(`  card text: ${cardText}`);
}

L('\n=== STEP 3: damage workflow text — /#/repair page ===');
await page.goto(`${BASE}/#/repair`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const repairText = await page.locator('body').innerText();
const repairHasOld = repairText.includes('BBL-IM');
const repairHasNew = repairText.includes('BBL Objektmanagement');
L(`  /repair body contains 'BBL-IM' (should be false):           ${repairHasOld}`);
L(`  /repair body contains 'BBL Objektmanagement' (should true): ${repairHasNew}`);

const intro = page.locator('.section-intro').first();
if (await intro.count() > 0) {
  const introText = (await intro.innerText()).replace(/\s+/g, ' ');
  L(`  intro text: ${introText}`);
}
await page.screenshot({ path: `${OUT}/text_02_repair_page.png`, fullPage: false });
L(`  /repair top-fold screenshot: ${OUT}/text_02_repair_page.png`);

await browser.close();

const allPass =
  closedMetrics.deltaButtonToChevron <= 1 &&  // chevron flush with right edge of button
  !homeHasOld && homeHasNew &&
  !repairHasOld && repairHasNew;

L('\n=== VERDICT ===');
L(allPass ? '  PASS' : '  FAIL');
L(`  chevron flush with button-right edge (≤1px gap): ${closedMetrics.deltaButtonToChevron <= 1} (delta=${closedMetrics.deltaButtonToChevron}px)`);
L(`  /home text fixed:    BBL-IM=${homeHasOld} BBL Objektmanagement=${homeHasNew}`);
L(`  /repair text fixed:  BBL-IM=${repairHasOld} BBL Objektmanagement=${repairHasNew}`);
