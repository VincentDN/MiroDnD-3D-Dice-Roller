import { test, expect } from '@playwright/test';

test('queued reveals stay ordered and the maximum percentile pool renders', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByPlaceholder('Dungeon Master').fill('Queue mage');
  await page.getByRole('button', { name: /Create a room/ }).click();
  await page.evaluate(() => {
    const seen: { text: string; time: number }[] = [];
    (window as any).revealChecks = seen;
    new MutationObserver(() => {
      const el = document.querySelector('.roll-reveal');
      const text = el?.textContent || '';
      if (text && seen.at(-1)?.text !== text)
        seen.push({ text, time: performance.now() });
    }).observe(document.body, { childList: true, subtree: true });
  });
  const roller = page.locator('.roller');
  for (const label of ['First spell', 'Second spell']) {
    await roller.getByRole('textbox', { name: /Roll label/ }).fill(label);
    await roller
      .getByRole('button', { name: 'Roll dice', exact: true })
      .click();
    await page.waitForTimeout(600);
  }
  await expect(page.locator('.roll-reveal')).toContainText('Second spell', {
    timeout: 15000,
  });
  const seen = await page.evaluate(
    () => (window as any).revealChecks as { text: string; time: number }[],
  );
  expect(seen).toHaveLength(2);
  expect(seen[0].text).toContain('First spell');
  expect(seen[1].text).toContain('Second spell');
  expect(seen[1].time - seen[0].time).toBeGreaterThanOrEqual(2000);
  await roller.getByRole('textbox', { name: /Dice notation/ }).fill('40d100');
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/session') &&
      r.request().method() === 'POST' &&
      r.request().postDataJSON()?.action === 'roll',
  );
  await roller.getByRole('button', { name: 'Roll dice', exact: true }).click();
  const result = await (await response).json();
  expect(result.dice).toHaveLength(40);
  expect(result.physics.poses).toHaveLength(80);
  await expect(page.locator('.tray-result strong')).toHaveText(
    String(result.total),
    { timeout: 15000 },
  );
  await expect(page.locator('.tray canvas')).toBeVisible();
  expect(errors).toEqual([]);
});
