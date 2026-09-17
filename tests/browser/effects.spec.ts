import { test, expect } from '@playwright/test';

test('advantage and named effects transform what is actually rolled, persist or consume correctly, and never touch damage', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/');
  await page.getByPlaceholder('Dungeon Master').fill('Cleric of Bless');
  await page.getByRole('radio', { name: 'Cleric', exact: true }).click();
  await page.getByRole('button', { name: /Create a room/ }).click();
  await page.getByRole('button', { name: 'Roll dice', exact: true }).waitFor();

  await page.getByRole('radio', { name: 'Advantage', exact: true }).click();
  await page.locator('.effect-chip', { hasText: 'Bless' }).getByRole('button').first().click();
  await expect(page.locator('.effects-preview code')).toHaveText('2d20kh1+1d4');

  const attackResponse = page.waitForResponse(
    (r) => r.url().endsWith('/api/session') && r.request().postDataJSON()?.action === 'roll',
  );
  await page.getByRole('button', { name: 'Roll dice', exact: true }).click();
  expect((await (await attackResponse).request().postDataJSON()).expression).toBe('2d20kh1+1d4');
  await page.waitForTimeout(2000);

  // Bless is persistent - it stays active after a successful roll.
  await expect(page.locator('.effect-chip', { hasText: 'Bless' })).toHaveClass(/active/);

  // Guidance is one-use - it turns itself off after the roll that spent it.
  await page.getByRole('radio', { name: 'Normal', exact: true }).click();
  await page.locator('.effect-chip', { hasText: 'Guidance' }).getByRole('button').first().click();
  await page.waitForTimeout(600);
  const guidanceResponse = page.waitForResponse(
    (r) => r.url().endsWith('/api/session') && r.request().postDataJSON()?.action === 'roll',
  );
  await page.getByRole('button', { name: 'Roll dice', exact: true }).click();
  await guidanceResponse;
  await expect(page.locator('.effect-chip', { hasText: 'Guidance' })).not.toHaveClass(/active/);

  // Effects apply to a saved action's primary roll but never its linked damage.
  const bar = page.getByRole('region', { name: 'Character actions' });
  await bar.locator('summary').filter({ hasText: /^Manage actions$/ }).click();
  await bar.getByLabel('Action name', { exact: true }).fill('Test Attack');
  await bar.getByLabel('Action dice', { exact: true }).fill('1d20+3');
  await bar.getByText('Linked damage groups (optional)').click();
  await bar.getByRole('button', { name: 'Add damage group', exact: true }).click();
  await bar.getByRole('button', { name: 'Add action', exact: true }).click();
  await page.waitForTimeout(600);

  const attackRollResponse = page.waitForResponse(
    (r) => r.url().endsWith('/api/session') && r.request().postDataJSON()?.action === 'roll',
  );
  await bar.getByRole('button', { name: 'Roll Test Attack', exact: true }).click();
  expect((await (await attackRollResponse).request().postDataJSON()).expression).toBe('1d20+3+1d4');
  await page.waitForTimeout(2000);

  const damageResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/session') &&
      r.request().postDataJSON()?.action === 'roll' &&
      !!r.request().postDataJSON()?.linkedTo,
  );
  await page.locator('.linked-damage').getByRole('button', { name: 'Damage', exact: true }).click();
  // The raw damage expression, never with Bless's +1d4 appended.
  expect((await (await damageResponse).request().postDataJSON()).expression).toBe('1d6');
});
