import { test, expect } from '@playwright/test';

test('style previews, inheritance and reveal preferences stay usable', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByPlaceholder('Dungeon Master').fill('Preview wizard');
  await page.getByRole('button', { name: /Create a room/ }).click();
  await page.getByText('Manage actions', { exact: true }).click();
  const editor = page.locator('.action-editor');
  const style = editor.locator('.appearance-editor').first();
  await style.getByText('Live preview and test roll', { exact: true }).click();
  for (const material of [
    'classic',
    'dark',
    'sparkly',
    'gradient',
    'metallic',
  ]) {
    await style
      .getByRole('combobox', { name: 'Style', exact: true })
      .selectOption(material);
    await expect(style.locator('canvas')).toBeVisible();
    await page.waitForTimeout(100);
    await style.screenshot({ path: `test-results/preview-${material}.png` });
  }
  for (const die of ['4', '6', '8', '10', '12', '20', '100']) {
    await style
      .getByRole('combobox', { name: 'Preview die', exact: true })
      .selectOption(die);
    await expect(style.locator('canvas')).toBeVisible();
  }
  await style.getByRole('button', { name: 'Test roll', exact: true }).click();
  await style.getByRole('button', { name: 'Suggest readable numbers' }).click();
  await editor.getByLabel('Save this style as').fill('Silver');
  await editor.getByRole('button', { name: 'Save reusable style' }).click();
  await style.getByRole('button', { name: 'Reset appearance' }).click();
  await expect(style.getByRole('checkbox')).toBeChecked();
  await editor
    .getByRole('combobox', { name: 'Copy appearance' })
    .selectOption({ label: 'Style: Silver' });
  await expect(
    style.getByRole('combobox', { name: 'Style', exact: true }),
  ).toHaveValue('metallic');
  await editor.getByLabel('Action name', { exact: true }).fill('Silver strike');
  await editor.getByLabel('Action dice', { exact: true }).fill('2d20kh1+3');
  await editor.getByRole('button', { name: 'Add action', exact: true }).click();
  await page.getByText('Manage actions', { exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const roll = page.getByRole('button', {
    name: 'Roll Silver strike',
    exact: true,
  });
  await roll.click();
  await expect(page.locator('.roll-reveal del')).toHaveCount(1);
  await expect(page.locator('.roll-reveal')).toHaveCSS(
    'animation-name',
    'none',
  );
  await expect(page.locator('.roll-reveal')).toHaveCSS(
    'pointer-events',
    'none',
  );
  await page.reload();
  await expect(roll).toBeVisible();
  await expect(page.locator('.roll-reveal')).toHaveCount(0);
  for (const mode of ['subtle', 'off']) {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page
      .getByRole('combobox', { name: 'Roll reveal', exact: true })
      .selectOption(mode);
    await page.getByLabel('Reduce decorative dice effects').check();
    await page.getByRole('button', { name: 'Close settings' }).click();
    await roll.click();
    if (mode === 'subtle')
      await expect(page.locator('.roll-reveal.subtle')).toContainText(
        'Preview wizard',
      );
    else {
      await expect(page.locator('.tray-result strong')).not.toHaveText('…');
      await expect(page.locator('.roll-reveal')).toHaveCount(0);
    }
  }
  expect(errors).toEqual([]);
});
