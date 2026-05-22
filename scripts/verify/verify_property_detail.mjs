import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE='http://localhost:8000/Documents/GitHub/tenant-portal';
const OUT='c:/Users/DavidRasner/Documents/GitHub/tenant-portal/verify_out';
mkdirSync(OUT, { recursive: true });
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:1440,height:900}, deviceScaleFactor:2});
const page=await ctx.newPage();
await page.goto(`${BASE}/#/`,{waitUntil:'networkidle'});
await page.evaluate(()=>window.t3lite.demoRole('LBO'));
await page.waitForTimeout(800);
await page.goto(`${BASE}/#/properties/T-2010-AA-01`,{waitUntil:'networkidle'});
await page.waitForTimeout(1500);
await page.screenshot({path:`${OUT}/property_detail_gray_sweep.png`, fullPage:true});
console.log(`saved ${OUT}/property_detail_gray_sweep.png`);
const bgs=await page.evaluate(()=>{
  const main=document.querySelectorAll('section.section');
  const ps=document.querySelectorAll('.property-section');
  return {
    section_count: main.length,
    section_bgs: Array.from(main).map(s=>getComputedStyle(s).backgroundColor),
    property_section_bg: ps[0]?getComputedStyle(ps[0]).backgroundColor:null,
    property_section_padding: ps[0]?getComputedStyle(ps[0]).padding:null,
    property_section_shadow: ps[0]?getComputedStyle(ps[0]).boxShadow:null,
    property_section_count: ps.length,
  };
});
console.log(JSON.stringify(bgs,null,2));
await browser.close();
