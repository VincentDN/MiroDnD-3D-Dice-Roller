import { test, expect } from '@playwright/test';

test('characters migrate, edit, reorder, transfer and roll across browser and desktop', async ({ page, context }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('rollparty:presets:v1', JSON.stringify({version:1, presets:[
    {id:'one',name:'Sword',expression:'1d20+5'}, {id:'two',name:'Perception',expression:'1d20+3'},
  ]})));
  await page.getByPlaceholder('Dungeon Master').fill('Action tester');
  await page.getByRole('button', {name:/Create a room/}).click();
  const bar = page.getByRole('region', {name:'Character actions'});
  await expect(bar.getByRole('button', {name:'Roll Sword',exact:true})).toBeVisible();
  const overlay = await context.newPage();
  overlay.on('pageerror', e => errors.push(e.message));
  await overlay.setViewportSize({width:680,height:760});
  await overlay.goto(page.url() + '&overlay=1&desktop=1');
  await bar.locator('summary').click();
  await bar.getByRole('button', {name:'Edit Sword',exact:true}).click();
  await bar.getByLabel('Action name',{exact:true}).fill('Longsword');
  await bar.getByLabel('Action dice',{exact:true}).fill('1d20+7');
  await bar.getByLabel('Reminder (optional)',{exact:true}).fill('Two hands');
  await bar.getByRole('button', {name:'Save changes',exact:true}).click();
  await bar.getByRole('button', {name:'Move Perception up',exact:true}).click();
  await expect(bar.locator('.saved-action').first()).toHaveText('Perception1d20+3');
  await expect(overlay.getByRole('button', {name:'Roll Longsword',exact:true})).toBeVisible();
  await bar.getByRole('button', {name:'Remove Perception',exact:true}).click();
  await bar.getByRole('button', {name:'Undo removal',exact:true}).click();
  await expect(bar.locator('.saved-action').first()).toHaveText('Perception1d20+3');
  const downloading = page.waitForEvent('download');
  await bar.getByRole('button', {name:'Export characters',exact:true}).click();
  const download = await downloading;
  const filename = await download.path();
  const before = await page.evaluate(() => localStorage.getItem('rollparty:actions:v1'));
  await bar.getByLabel('Import character file',{exact:true}).setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{bad')});
  await expect(bar.getByRole('alert')).toContainText('Import failed');
  expect(await page.evaluate(() => localStorage.getItem('rollparty:actions:v1'))).toBe(before);
  await bar.getByLabel('Character name',{exact:true}).fill('Wizard');
  await bar.getByRole('button', {name:'New character',exact:true}).click();
  await expect(bar.locator('.saved-action')).toHaveCount(0);
  await bar.getByLabel('Import character file',{exact:true}).setInputFiles(filename!);
  await expect(bar.getByRole('status')).toContainText('Characters imported');
  await expect(bar.getByLabel('Character',{exact:true}).locator('option')).toHaveCount(3);
  await expect(bar.getByRole('button', {name:'Roll Longsword',exact:true})).toHaveAttribute('title','Two hands');
  await overlay.getByRole('button', {name:'Roll Longsword',exact:true}).click();
  await expect(page.locator('.roll-entry').first()).toContainText('1d20+7');
  await expect(page.locator('.roll-entry').first()).toContainText('Longsword');
  await expect(page.locator('.roll-entry').first()).toContainText('Action tester');
  await page.reload();
  await expect(bar.getByRole('button', {name:'Roll Longsword',exact:true})).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('rollparty:presets:v1')!).presets[0].name)).toBe('Sword');
  await bar.locator('summary').click();
  await bar.getByRole('button',{name:'Delete character',exact:true}).click();
  await bar.getByRole('button',{name:'Keep character',exact:true}).click();
  await expect(bar.getByLabel('Character',{exact:true}).locator('option')).toHaveCount(3);
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/action-bar-${width}.png`,fullPage:true});
  }
  await overlay.getByRole('region',{name:'Character actions'}).locator('summary').click();
  await overlay.screenshot({path:'test-results/action-bar-desktop.png',fullPage:true});
  const controls = await overlay.locator('.desktop-roll-controls').boundingBox();
  const dice = await overlay.locator('.dice-panel').boundingBox();
  expect(dice!.y).toBeGreaterThanOrEqual(controls!.y + controls!.height);
  expect(errors).toEqual([]);
});
