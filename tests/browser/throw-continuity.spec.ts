import { test, expect } from '@playwright/test';

test('delayed acknowledgement does not rewind the locally thrown d20', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/');
  await page.getByPlaceholder('Dungeon Master').fill('Continuity');
  await page.getByRole('button', { name: /Create a room/ }).click();
  const canvas = page.locator('.tray canvas');
  await expect(canvas).toBeVisible();
  const center = () =>
    page.evaluate(
      () =>
        new Promise<{ x: number; y: number }>((resolve) =>
          requestAnimationFrame(() => {
            const c = document.querySelector(
              '.tray canvas',
            ) as HTMLCanvasElement;
            const gl = c.getContext('webgl2')!;
            const data = new Uint8Array(c.width * c.height * 4);
            gl.readPixels(
              0,
              0,
              c.width,
              c.height,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              data,
            );
            let x = 0,
              y = 0,
              n = 0;
            for (let i = 0; i < data.length; i += 4)
              if (
                data[i + 3] > 200 &&
                data[i] > data[i + 1] * 1.5 &&
                data[i + 2] > data[i + 1] * 1.3
              ) {
                x += (i / 4) % c.width;
                y += Math.floor(i / 4 / c.width);
                n++;
              }
            resolve({ x: x / n, y: y / n });
          }),
        ),
    );
  let before: { x: number; y: number } | undefined;
  await page.route('**/api/session', async (route) => {
    if (
      route.request().method() !== 'POST' ||
      route.request().postDataJSON()?.action !== 'throw'
    ) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    await page.waitForTimeout(2000);
    before = await center();
    await route.fulfill({ response });
  });
  const box = (await canvas.boundingBox())!,
    pixels = box.height / Math.max(12, 9 / (box.width / box.height));
  const x = box.x + box.width / 2 - 1.875 * pixels,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(page.locator('.tray .dice-canvas')).toHaveCSS('cursor', 'grabbing');
  await page.mouse.move(x + 150, y - 60, { steps: 12 });
  await page.waitForTimeout(60);
  await page.mouse.up();
  await expect(page.locator('.roll-entry')).toHaveCount(1);
  const after = await center();
  expect(before).toBeDefined();
  expect(Number.isFinite(after.x)).toBe(true);
  expect(Math.hypot(after.x - before!.x, after.y - before!.y)).toBeLessThan(25);
  await expect(page.locator('.tray-result strong')).not.toHaveText('…', {
    timeout: 20000,
  });
});

