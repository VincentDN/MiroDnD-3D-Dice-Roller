import { test, expect } from '@playwright/test';

// A real native folder picker can't be automated headlessly, so this fakes
// window.showDirectoryPicker with a minimal in-memory directory of two
// small audio files - enough to exercise the actual app wiring (track list,
// play/pause requests, shared sync, bookmarks, role-gated controls) without
// needing real mp3s or a real OS dialog.
async function mockMusicFolder(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    function fakeFile(name: string) {
      return {
        kind: 'file' as const,
        name,
        async getFile() {
          return new File([new Uint8Array(32)], name, { type: 'audio/mpeg' });
        },
        async queryPermission() {
          return 'granted';
        },
        async requestPermission() {
          return 'granted';
        },
      };
    }
    const files = [fakeFile('01 tavern.mp3'), fakeFile('02 battle.mp3')];
    const dir = {
      kind: 'directory' as const,
      name: 'session-music',
      async queryPermission() {
        return 'granted';
      },
      async requestPermission() {
        return 'granted';
      },
      async *values() {
        for (const f of files) yield f;
      },
    };
    (window as any).showDirectoryPicker = async () => dir;
  });
}

test('DM controls a shared track/bookmark; players only get volume/mute', async ({ page, browser }) => {
  await mockMusicFolder(page);
  await page.goto('/');
  await page.getByPlaceholder('Dungeon Master').fill('The Referee');
  await page.getByRole('radio', { name: 'DM', exact: true }).click();
  await page.getByRole('button', { name: /Create a room/ }).click();
  const bar = page.getByRole('region', { name: 'Table music' });
  await expect(bar).toBeVisible();
  await bar.getByRole('button', { name: 'Choose music folder' }).click();
  await expect(bar.getByRole('button', { name: '01 tavern' })).toBeVisible();

  const playerContext = await browser.newContext();
  const player = await playerContext.newPage();
  await player.goto(page.url());
  await player.getByPlaceholder('Dungeon Master').fill('Bard');
  await player.getByRole('radio', { name: 'Wizard', exact: true }).click();
  await player.getByRole('button', { name: /Join room/ }).click();
  const playerBar = player.getByRole('region', { name: 'Table music' });
  await expect(playerBar).toBeVisible();
  // Players never get transport/folder controls, only the volume/mute widget.
  await expect(playerBar.getByRole('button', { name: 'Choose music folder' })).toHaveCount(0);
  await expect(playerBar.getByRole('button', { name: /Previous track/ })).toHaveCount(0);
  await expect(playerBar.getByLabel('Music volume')).toBeVisible();

  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/session') && r.request().postDataJSON()?.action === 'music',
  );
  await bar.getByRole('button', { name: '01 tavern' }).click();
  await response;
  await expect(bar.locator('.music-now-playing')).toHaveText('01 tavern');
  await expect(playerBar.locator('.music-now-playing')).toHaveText('01 tavern', { timeout: 10000 });

  // Bookmark the current moment, then confirm it shows for the DM and syncs to the player.
  await bar.getByPlaceholder('Bookmark this moment').fill('Ambush!');
  await bar.getByRole('button', { name: 'Save' }).click();
  await expect(bar.getByRole('button', { name: 'Ambush!', exact: true })).toBeVisible();
  await expect(playerBar.getByText('Ambush!')).toBeVisible({ timeout: 10000 });
  // The player's bookmark chip has no jump/remove affordance of its own.
  await expect(playerBar.getByRole('button', { name: /Remove bookmark/ })).toHaveCount(0);

  // Mute is local-only: it must not trigger a network call.
  let musicCalls = 0;
  player.on('request', (r) => {
    if (r.url().endsWith('/api/session') && r.postDataJSON?.()?.action === 'music') musicCalls++;
  });
  await playerBar.getByRole('button', { name: 'Mute music' }).click();
  await player.waitForTimeout(300);
  expect(musicCalls).toBe(0);
  await playerContext.close();
});
