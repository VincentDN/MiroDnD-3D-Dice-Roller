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
  const baseline = await (
    await page.request.get('/api/session', {
      headers: {
        'x-room-key': new URLSearchParams(
          new URL(page.url()).hash.slice(1),
        ).get('room')!,
      },
    })
  ).json();
  let holding = false;
  let before: { x: number; y: number } | undefined;
  await page.route('**/api/session*', async (route) => {
    if (holding && route.request().method() === 'GET') {
      await route.fulfill({ json: baseline });
      return;
    }
    if (
      route.request().method() !== 'POST' ||
      route.request().postDataJSON()?.action !== 'throw'
    ) {
      await route.continue();
      return;
    }
    holding = true;
    const response = await route.fetch();
    await page.waitForTimeout(2000);
    before = await center();
    await route.fulfill({ response });
    holding = false;
  });
  const box = (await canvas.boundingBox())!,
    pixels = box.height / Math.max(12, 9 / (box.width / box.height));
  const x = box.x + box.width / 2 - 1.875 * pixels,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(page.locator('.tray .dice-canvas')).toHaveCSS(
    'cursor',
    'grabbing',
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
    { x, y, dx: 144 },
  );
  await page.mouse.up();
  await expect(page.locator('.roll-entry')).toHaveCount(1);
  expect(before).toBeDefined();
  let previous = before!;
  let largestJump = 0;
  for (let i = 0; i < 24; i++) {
    const after = await center();
    expect(Number.isFinite(after.x)).toBe(true);
    largestJump = Math.max(
      largestJump,
      Math.hypot(after.x - previous.x, after.y - previous.y),
    );
    previous = after;
  }
  expect(largestJump).toBeLessThan(25);
  await expect(page.locator('.tray-result strong')).not.toHaveText('…', {
    timeout: 20000,
  });
});
