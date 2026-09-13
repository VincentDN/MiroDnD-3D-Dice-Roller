import { test, expect } from '@playwright/test';

for (const desktop of [false, true]) {
  test(`starting d20 records a shared physical throw in ${desktop ? 'desktop overlay' : 'browser'}`, async ({ page, context }) => {
    await page.goto('/');
    await expect(page.locator('.app-version')).toHaveText('v0.7.1');
    await page.getByPlaceholder('Dungeon Master').fill('First throw');
    await page.getByRole('button', { name: /Create a room/ }).click();
    await expect(page.getByRole('button', { name: 'Roll dice', exact: true })).toBeVisible();
    const observer = await context.newPage();
    await observer.goto(page.url());
    if (desktop) {
      await page.setViewportSize({ width: 680, height: 760 });
      await page.goto(page.url() + '&overlay=1&desktop=1');
    }
    await expect(page.locator('.app-version')).toHaveText('v0.7.1');
    const canvas = page.locator(desktop ? '.dice-panel canvas' : '.tray canvas');
    await expect(canvas).toBeVisible();
    const box = (await canvas.boundingBox())!;
    const scale = desktop ? 2 : 1.5;
    const pixels = box.height / Math.max(12, 9 / (box.width / box.height));
    const x = box.x + box.width / 2 - 1.25 * scale * pixels;
    const y = box.y + box.height / 2;
    // A click must not count as a roll; a deliberate release must.
    await page.mouse.click(x, y);
    await expect(observer.locator('.roll-entry')).toHaveCount(0);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await expect(page.locator(desktop ? '.dice-panel .dice-canvas' : '.tray .dice-canvas')).toHaveCSS('cursor', 'grabbing');
    await page.mouse.move(x + 90, y - 55, { steps: 12 });
    await page.waitForTimeout(60);
    const response = page.waitForResponse(res => res.url().endsWith('/api/session') &&
      res.request().method() === 'POST' && res.request().postDataJSON().action === 'throw');
    await page.mouse.up();
    const result = await response;
    expect(result.status()).toBe(200);
    const roll = await result.json();
    expect(roll.expression).toBe('1d20');
    expect(roll.physics.release).toHaveLength(1);
    expect(roll.physics.diceScale).toBe(scale);
    expect(roll.total).toBeGreaterThanOrEqual(1);
    expect(roll.total).toBeLessThanOrEqual(20);
    await expect(observer.locator('.roll-entry')).toHaveCount(1);
    await expect(observer.locator('.roll-entry')).toContainText('First throw');
    await expect(observer.locator('.roll-entry')).toContainText('Mouse throw');
    await expect(observer.locator('.tray-result strong')).toHaveText(String(roll.total), { timeout: 20000 });
    await expect(page.locator(desktop ? '.desktop-result' : '.tray-result strong'))
      .toContainText(desktop ? `= ${roll.total}` : String(roll.total), { timeout: 20000 });
    await page.screenshot({ path: `test-results/starting-die-${desktop ? 'desktop' : 'browser'}.png`, fullPage: true });
  });
}

