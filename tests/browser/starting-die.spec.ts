import {readFileSync} from 'node:fs';
const {version} = JSON.parse(readFileSync('package.json', 'utf8'));
import { test, expect } from '@playwright/test';

for (const desktop of [false, true]) {
  test(`starting d20 records a shared physical throw in ${desktop ? 'desktop overlay' : 'browser'}`, async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await expect(page.locator('.app-version')).toHaveText(`v${version}`);
    await page.getByPlaceholder('Dungeon Master').fill('First throw');
    await page.getByRole('button', { name: /Create a room/ }).click();
    await expect(
      page.getByRole('button', { name: 'Roll dice', exact: true }),
    ).toBeVisible();
    const observer = await context.newPage();
    await observer.goto(page.url());
    if (desktop) {
      await page.setViewportSize({ width: 680, height: 760 });
      await page.goto(page.url() + '&overlay=1&desktop=1');
    }
    await expect(page.locator('.app-version')).toHaveText(`v${version}`);
    await page.bringToFront();
    const canvas = page.locator(
      desktop ? '.dice-panel canvas' : '.tray canvas',
    );
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
    await expect(
      page.locator(desktop ? '.dice-panel .dice-canvas' : '.tray .dice-canvas'),
    ).toHaveCSS('cursor', 'grabbing');
    const response = page.waitForResponse(
      (res) =>
        res.url().endsWith('/api/session') &&
        res.request().method() === 'POST' &&
        res.request().postDataJSON().action === 'throw',
    );
    await page.evaluate(
      async ({ x, y, dx }) => {
        const canvas = document.querySelector(
          '.dice-panel canvas, .tray canvas',
        )!;
        for (let i = 1; i <= 12; i++) {
          canvas.dispatchEvent(
            new PointerEvent('pointermove', {
              bubbles: true,
              pointerId: 1,
              clientX: x + (dx * i) / 12,
              clientY: y - (60 * i) / 12,
            }),
          );
          await new Promise(requestAnimationFrame);
        }
        canvas.dispatchEvent(
          new PointerEvent('pointerup', {
            bubbles: true,
            pointerId: 1,
            clientX: x + dx,
            clientY: y - 60,
          }),
        );
      },
      { x, y, dx: 120 },
    );

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
    await expect(observer.locator('.tray-result strong')).toHaveText(
      String(roll.total),
      { timeout: 20000 },
    );
    await expect(
      page.locator(desktop ? '.desktop-result' : '.tray-result strong'),
    ).toContainText(desktop ? `= ${roll.total}` : String(roll.total), {
      timeout: 20000,
    });
    await page.screenshot({
      path: `test-results/starting-die-${desktop ? 'desktop' : 'browser'}.png`,
      fullPage: true,
    });
  });
}
