const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FILE = 'file://' + path.resolve(__dirname, 'index.html');
const OUT = '/tmp/piggy-screenshots';
fs.mkdirSync(OUT, { recursive: true });

let shotN = 0;
async function shot(page, name) {
  const f = `${OUT}/${String(++shotN).padStart(2,'0')}-${name}.png`;
  await page.screenshot({ path: f, fullPage: false });
  return f;
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // ── 1. Home screen — empty state ──
  await page.goto(FILE);
  await page.waitForTimeout(300);
  await shot(page, 'home-empty');
  const noKids = await page.locator('text=No kids set up yet').isVisible();
  console.log('1. Home empty state:', noKids ? '✅ shows "No kids"' : '❌ unexpected content');

  // ── 2. Onboard first kid via "Add a kid" ──
  await page.click('text=Add a kid');
  await page.waitForTimeout(200);
  await shot(page, 'onboard');
  await page.fill('#onboard-name', 'Evie');
  await page.fill('#onboard-emoji', '🦋');
  await page.fill('#onboard-age', '8');
  await page.fill('#onboard-allowance', '5');
  // percentages default to 50/40/10
  await page.click('#onboard-save-btn');
  await page.waitForTimeout(300);
  await shot(page, 'kid-view-evie');
  const jarsBar = await page.locator('.jars-bar').isVisible();
  const saveLabel = await page.locator('text=Save').first().isVisible();
  console.log('2. Kid view after onboard:', jarsBar && saveLabel ? '✅ jars bar visible' : '❌ jars bar missing');

  // ── 3. Add a wish ──
  await page.click('.fab');
  await page.waitForTimeout(400);
  await shot(page, 'add-wish-sheet');
  const sheetVisible = await page.locator('#add-wish-sheet.open').isVisible();
  console.log('3. Add wish sheet opens:', sheetVisible ? '✅' : '❌');
  await page.fill('#wish-name-input', 'LEGO Technic Set');
  await page.fill('#wish-cost-input', '29.99');
  await page.click('text=Save wish');
  await page.waitForTimeout(300);
  await shot(page, 'wish-added');
  const wishVisible = await page.locator('text=LEGO Technic Set').isVisible();
  console.log('4. Wish appears in list:', wishVisible ? '✅' : '❌');

  // ── 4. Wish card anatomy ──
  const ageBadge = await page.locator('.wish-age-badge').first().isVisible();
  const weeksEl = await page.locator('.wish-weeks').first().isVisible();
  const lockEl = await page.locator('.wish-lock').first().isVisible();
  console.log('5. Age badge visible:', ageBadge ? '✅' : '❌');
  console.log('6. Weeks-away label visible:', weeksEl ? '✅' : '❌');
  console.log('7. Lock icon visible (new wish <7 days):', lockEl ? '✅' : '❌');

  // ── 5. Tap wish card → detail view ──
  await page.click('.wish-name');
  await page.waitForTimeout(300);
  await shot(page, 'detail-view');
  const detailName = await page.locator('#detail-name').innerText();
  const quietLine = await page.locator('.detail-quiet').isVisible();
  console.log('8. Detail view name:', detailName === 'LEGO Technic Set' ? '✅ correct' : '❌ got: ' + detailName);
  console.log('9. Quiet "thing or experience?" line:', quietLine ? '✅' : '❌');
  await page.click('#screen-detail .back-btn');
  await page.waitForTimeout(200);

  // ── 6. Swipe right → Got It flow ──
  // Simulate swipe via mouse drag on the card
  const card = page.locator('.wish-card').first();
  const box = await card.boundingBox();
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  await shot(page, 'gotit-screen');
  const gotitHeader = await page.locator('text=Got it!').isVisible();
  const ownChoiceLocked = await page.locator('#choice-own-money.locked').isVisible();
  console.log('10. Got It screen shows:', gotitHeader ? '✅' : '❌ not showing');
  console.log('11. Own-money locked (new item):', ownChoiceLocked ? '✅' : '❌');

  // Select gift, confirm
  await page.click('#choice-gift');
  await page.waitForTimeout(100);
  await shot(page, 'gotit-gift-selected');
  const confirmEnabled = await page.locator('#gotit-confirm-btn:not([disabled])').isVisible();
  console.log('12. Confirm button enabled after gift selection:', confirmEnabled ? '✅' : '❌');
  await page.click('#gotit-confirm-btn');
  await page.waitForTimeout(300);
  await shot(page, 'confirmation-screen');
  const luckyYou = await page.locator('text=Lucky you.').isVisible();
  console.log('13. Confirmation "Lucky you.":', luckyYou ? '✅' : '❌');

  // ── 7. Back to kid, add another wish to test skip ──
  await page.click('text=Back to wishes');
  await page.waitForTimeout(200);
  await page.click('.fab');
  await page.waitForTimeout(300);
  await page.fill('#wish-name-input', 'Roller Skates');
  await page.fill('#wish-cost-input', '45.00');
  await page.click('text=Save wish');
  await page.waitForTimeout(300);

  // ── 8. Swipe left → Skip flow ──
  const card2 = page.locator('.wish-card').first();
  const box2 = await card2.boundingBox();
  const midX = box2.x + box2.width / 2;
  const midY = box2.y + box2.height / 2;
  await page.mouse.move(midX, midY);
  await page.mouse.down();
  // Move 200px to the left in steps
  await page.mouse.move(midX - 200, midY, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await shot(page, 'skip-screen');
  const skipHeader = await page.locator('#screen-skip .header-title').isVisible();
  const housel = await page.locator('text=Every no is a yes').isVisible();
  console.log('14. Skip screen shows:', skipHeader ? '✅' : '❌');
  console.log('15. Housel line visible:', housel ? '✅' : '❌');
  // Use evaluate to bypass Playwright's pointer interception check during CSS transition
  await page.evaluate(() => {
    document.querySelector('#screen-skip .btn-primary').click();
  });
  await page.waitForTimeout(300);
  await shot(page, 'after-skip-confirm');

  // ── 9. Back to home, test long-press for parent mode ──
  await page.evaluate(() => {
    document.querySelector('#screen-kid .back-btn').click();
  });
  await page.waitForTimeout(200);
  // Re-add second kid first so home has avatars
  // (Evie already exists; let's long-press her card)
  await shot(page, 'home-with-kid');
  const kidCard = page.locator('.kid-avatar-card').first();
  const kbox = await kidCard.boundingBox();

  // Simulate 1.6s hold
  await page.mouse.move(kbox.x + kbox.width/2, kbox.y + kbox.height/2);
  await page.mouse.down();
  await page.waitForTimeout(1600);
  await page.mouse.up();
  await page.waitForTimeout(300);
  await shot(page, 'parent-mode');
  const parentHeader = await page.locator('.parent-header-title').isVisible();
  console.log('16. Parent mode via long-press:', parentHeader ? '✅' : '❌');

  // ── 10. Parent update ──
  await shot(page, 'parent-update-tab');
  const updateForm = await page.locator('.update-form').isVisible();
  console.log('17. Parent update form visible:', updateForm ? '✅' : '❌');

  // Add allowance
  await page.fill('#p-amount', '5');
  await page.click('text=Apply update');
  await page.waitForTimeout(300);
  await shot(page, 'parent-after-allowance');
  // Check jar amounts updated
  const saveJar = await page.locator('.parent-jar-amount').first().innerText();
  console.log('18. Save jar updated after allowance:', saveJar !== '$0.00' ? `✅ ${saveJar}` : '❌ still $0.00');

  // ── 11. Probe: History tab ──
  await page.click('text=History');
  await page.waitForTimeout(200);
  await shot(page, 'parent-history');
  const ledgerItem = await page.locator('.ledger-item').first().isVisible();
  console.log('19. Ledger history shows entry:', ledgerItem ? '✅' : '❌');

  // ── 12. Probe: Trend tab ──
  await page.click('text=Trend');
  await page.waitForTimeout(400);
  await shot(page, 'parent-trend');
  const sparkCanvas = await page.locator('.sparkline-canvas').isVisible();
  console.log('20. Trend sparkline canvas:', sparkCanvas ? '✅' : '❌');

  // ── 13. Probe: Wish Lists tab ──
  await page.click('text=Wish Lists');
  await page.waitForTimeout(200);
  await shot(page, 'parent-wishes');
  const filterBar = await page.locator('.share-filter').isVisible();
  console.log('21. Wish list filter bar:', filterBar ? '✅' : '❌');

  // ── 14. Probe: add wish with no name ──
  await page.click('text=✕');
  await page.waitForTimeout(200);
  await page.click('text=🦋 Evie');
  await page.waitForTimeout(200);
  await page.click('.fab');
  await page.waitForTimeout(300);
  await page.click('text=Save wish'); // name is blank
  await page.waitForTimeout(200);
  const toast = await page.locator('.toast.show').isVisible();
  console.log('22. 🔍 Empty wish name → toast error:', toast ? '✅' : '❌');
  await shot(page, 'probe-empty-wish');

  await browser.close();
  console.log('\nScreenshots saved to', OUT);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
