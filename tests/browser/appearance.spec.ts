import { test, expect } from '@playwright/test';
test('action appearance, linked damage and reveal persist across browser and overlay', async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await page.goto('/');
  await page.getByPlaceholder('Dungeon Master').fill('Style mage');
  await page.getByRole('button', { name: /Create a room/ }).click();
  await page.getByText('Manage actions', { exact: true }).click();
  const editor = page.locator('.action-editor');
  await editor.getByLabel('Action name', { exact: true }).fill('Fire sword');
  await editor.getByLabel('Action dice', { exact: true }).fill('1d20+4');
  const style = editor.locator('.appearance-editor').first();
  await style.getByRole('combobox', { name: 'Style', exact: true }).selectOption('gradient');
  await style.getByLabel('Die color', { exact: true }).fill('#ff4400');
  await style.getByLabel('Number color', { exact: true }).fill('#ffffff');
  await editor
    .getByText('Linked damage groups (optional)', { exact: true })
    .click();
  await editor.getByRole('button', { name: 'Add damage group' }).click();
  await editor.getByLabel('Damage name', { exact: true }).fill('Fire damage');
  await editor.getByLabel('Damage dice', { exact: true }).fill('2d6+3');
  await editor.getByRole('button', { name: 'Add action', exact: true }).click();
  const observer = await context.newPage();
  await observer.goto(page.url() + '&overlay=1&desktop=1');
  const request = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/session') &&
      r.request().method() === 'POST' &&
      r.request().postDataJSON()?.action === 'roll',
  );
  await page
    .getByRole('button', { name: 'Roll Fire sword', exact: true })
    .click();
  const attack = await (await request).json();
  expect(attack.appearance.style).toBe('gradient');
  expect(attack.appearance.body).toBe('#ff4400');
  await expect(page.locator('.roll-reveal')).toContainText('Style mage', {
    timeout: 20000,
  });
  await expect(observer.locator('.roll-reveal')).toContainText('Style mage', {
    timeout: 20000,
  });
  await page.waitForTimeout(600);
  const damageResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/session') &&
      r.request().method() === 'POST' &&
      r.request().postDataJSON()?.linkedTo === attack.id,
  );
  await page
    .getByRole('button', { name: 'Critical damage', exact: true })
    .click();
  const damage = await (await damageResponse).json();
  expect(damage.expression).toBe('4d6+3');
  expect(damage.linkedTo).toBe(attack.id);
  expect(damage.appearance).toEqual(attack.appearance);
  await expect(page.locator('.tray-result strong')).toHaveText(
    String(damage.total),
    { timeout: 30000 },
  );
  await page.screenshot({
    path: 'test-results/dice-styles-desktop.png',
    fullPage: true,
  });
  await page.reload();
  await page.getByText('Manage actions', { exact: true }).click();
  await page
    .getByRole('button', { name: 'Edit Fire sword', exact: true })
    .click();
  await expect(
    page
      .locator('.action-editor')
      .getByLabel('Die color', { exact: true })
      .first(),
  ).toHaveValue('#ff4400');
  await page.setViewportSize({ width: 390, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/dice-styles-mobile.png',
    fullPage: true,
  });
});

