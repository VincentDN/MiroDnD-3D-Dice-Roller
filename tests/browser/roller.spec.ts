import { test, expect } from '@playwright/test';

test('briefing intro records practice physics and both trays fill their containers', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', {name: 'DnD Sundays 2026: Dungeons of Drakkenheim'})).toBeVisible();
  const practice = await page.locator('.lobby-dice canvas').boundingBox();
  // The idle d20 starts at x=-1.875 on a 12-unit-deep table. Move it
  // beyond the old central wall, then let real physics settle it.
  await page.mouse.move(practice!.x + practice!.width / 2 - 1.875 * practice!.height / 12, practice!.y + practice!.height / 2);
  await page.mouse.down();
  await page.mouse.move(practice!.x + practice!.width - 45, practice!.y + 50, {steps:40});
  await page.waitForTimeout(700);
  await page.mouse.up();
  await expect(page.getByRole('log')).toContainText('#1', {timeout:20000});
  await page.getByRole('button', {name: 'Roll d20', exact: true}).click();
  await expect(page.getByRole('log')).toContainText('#2', {timeout: 20000});
  const value = Number(await page.getByRole('log').locator('b').first().textContent());
  expect(value).toBeGreaterThanOrEqual(1); expect(value).toBeLessThanOrEqual(20);
  await page.screenshot({path:'test-results/briefing-intro.png',fullPage:true});
  await page.getByPlaceholder('Dungeon Master').fill('Briefing wizard');
  await page.getByRole('button', {name: /Create a room/}).click();
  await page.getByRole('button', {name: 'Roll dice', exact: true}).click();
  await expect(page.locator('.tray-label')).toHaveText('Last Roll: Briefing wizard');
  await expect(page.locator('.tray-result strong')).not.toHaveText('…', {timeout: 20000});
  for (const width of [1440, 390]) {
    await page.setViewportSize({width,height:900});
    const tray = await page.locator('.tray').boundingBox();
    const canvas = await page.locator('.tray canvas').boundingBox();
    expect(Math.abs(tray!.height - canvas!.height)).toBeLessThanOrEqual(2);
    expect(Math.abs(tray!.width - canvas!.width)).toBeLessThanOrEqual(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/briefing-table-${width}.png`,fullPage:true});
  }
});

test('browser and desktop overlay share a room, render dice and retain settings', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByPlaceholder('Dungeon Master').fill('Browser ranger');
  await page.getByRole('button', { name: /Create a room/ }).click();
  await expect(page.getByRole('button', { name: 'Roll dice' })).toBeVisible();
  const roomURL = page.url();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /Miro Light/ }).click();
  await page.getByRole('button', { name: 'Close settings' }).click();
  const overlay = await context.newPage();
  overlay.on('pageerror', (error) => errors.push(error.message));
  await overlay.setViewportSize({ width: 680, height: 760 });
  await overlay.goto(roomURL + '&overlay=1&desktop=1');
  await expect(overlay.locator('.desktop-roll-controls')).toBeVisible();
  await expect(overlay.locator('html')).toHaveAttribute('data-theme', 'miro-light');
  await overlay.getByRole('textbox', { name: 'Dice notation' }).fill('1d20');
  await overlay.getByRole('button', { name: 'Roll', exact: true }).click();
  await expect(overlay.locator('.taskbar-roll').first()).toContainText('Browser ranger');
  await expect(page.locator('.roll-entry').first()).toContainText('Browser ranger');
  await expect(overlay.locator('.dice-panel canvas')).toBeVisible();
  await expect(overlay.locator('.desktop-result')).toContainText('=', { timeout: 20000 });
  await expect(overlay.locator('.render-error')).toHaveCount(0);
  const controls = await overlay.locator('.desktop-roll-controls').boundingBox();
  const dice = await overlay.locator('.dice-panel').boundingBox();
  expect(dice!.y).toBeGreaterThanOrEqual(controls!.y + controls!.height);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /Drakkenheim/ }).click();
  await expect(overlay.locator('html')).toHaveAttribute('data-theme', 'drakkenheim');
  expect(errors).toEqual([]);
});
