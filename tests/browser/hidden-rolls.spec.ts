import { test, expect } from '@playwright/test';

test('a hidden roll is invisible to other players and revealed only by the DM or roller', async ({ page, browser }) => {
  test.setTimeout(60000);
  await page.goto('/');
  await page.getByPlaceholder('Dungeon Master').fill('Sneaky Pete');
  await page.getByRole('radio', { name: 'Monk', exact: true }).click();
  await page.getByRole('button', { name: /Create a room/ }).click();
  await page.getByRole('button', { name: 'Roll dice', exact: true }).waitFor();
  const roomUrl = page.url();

  const dmContext = await browser.newContext();
  const dm = await dmContext.newPage();
  await dm.goto(roomUrl);
  await dm.getByPlaceholder('Dungeon Master').fill('The GM');
  await dm.getByRole('radio', { name: 'DM', exact: true }).click();
  await dm.getByRole('button', { name: /Join room/ }).click();
  await dm.getByRole('button', { name: 'Roll dice', exact: true }).waitFor();

  const clericContext = await browser.newContext();
  const cleric = await clericContext.newPage();
  await cleric.goto(roomUrl);
  await cleric.getByPlaceholder('Dungeon Master').fill('Helpful Cleric');
  await cleric.getByRole('radio', { name: 'Cleric', exact: true }).click();
  await cleric.getByRole('button', { name: /Join room/ }).click();
  await cleric.getByRole('button', { name: 'Roll dice', exact: true }).waitFor();

  await page.getByRole('checkbox', { name: /Hide from party/ }).check();
  await page.locator('.roll-bottom input').fill('Sneak past the guard');
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/session') && r.request().postDataJSON()?.action === 'roll',
  );
  await page.getByRole('button', { name: 'Roll dice', exact: true }).click();
  await response;

  // The roller and the DM both see it, with a Hidden badge and a Reveal button.
  await expect(page.locator('.roll-entry', { hasText: 'Sneak past the guard' })).toBeVisible();
  await expect(page.locator('.roll-entry .hidden-roll-badge').first()).toBeVisible();
  await expect(dm.locator('.roll-entry', { hasText: 'Sneak past the guard' })).toBeVisible({ timeout: 10000 });
  await expect(dm.locator('.roll-entry').getByRole('button', { name: 'Reveal' })).toBeVisible();

  // Another player never receives it, at any point - not the entry, not a placeholder.
  await cleric.waitForTimeout(3000);
  await expect(cleric.locator('.roll-entry', { hasText: 'Sneak past the guard' })).toHaveCount(0);
  await expect(cleric.locator('.empty-log')).toBeVisible();

  // The DM reveals it - now the cleric receives it on their next poll.
  await dm.locator('.roll-entry').getByRole('button', { name: 'Reveal' }).click();
  await expect(cleric.locator('.roll-entry', { hasText: 'Sneak past the guard' })).toBeVisible({ timeout: 10000 });
  await expect(cleric.locator('.roll-entry .hidden-roll-badge')).toHaveCount(0);

  await dmContext.close();
  await clericContext.close();
});
