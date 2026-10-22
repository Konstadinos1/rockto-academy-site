import { expect, test } from '@playwright/test';
import { answerFirstOption, storedProgress } from './helpers';

test('export, reset with typed confirmation, then import restores progress', async ({ page }) => {
  await page.goto('/#/lesson/D03-L01');
  await page.getByRole('button', { name: 'Practice this lesson' }).click();
  await answerFirstOption(page);

  await page.goto('/#/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export progress (JSON)' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();

  await page.getByRole('button', { name: 'Reset all progress…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Reset all progress?' });
  const confirm = dialog.getByRole('button', { name: 'Delete my progress' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Type RESET to confirm').fill('reset');
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Type RESET to confirm').fill('RESET');
  await confirm.click();
  expect(((await storedProgress(page)).attempts as unknown[]).length).toBe(0);

  await page.getByLabel('Import a progress file (.json, up to 5 MB)').setInputFiles(path as string);
  await expect(page.getByText('Valid progress file')).toBeVisible();
  await page.getByRole('button', { name: 'Replace my progress with this file…' }).click();
  const replace = page.getByRole('dialog', { name: 'Replace your progress?' });
  await replace.getByRole('checkbox').check();
  await replace.getByRole('button', { name: 'Replace progress' }).click();
  expect(((await storedProgress(page)).attempts as unknown[]).length).toBe(1);
});

test('a malformed import is rejected and changes nothing', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByLabel('Import a progress file (.json, up to 5 MB)').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"rockto-academy-progress","progress":"<script>alert(1)</script>"}'),
  });
  await expect(page.getByRole('alert')).toContainText('Import rejected. Nothing was changed.');
});

test('theme toggle switches between light and dark and persists', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Light (reading)' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('export text can be pasted back when file downloads are unavailable', async ({ page }) => {
  await page.goto('/#/lesson/D04-L01');
  await page.getByRole('button', { name: 'Practice this lesson' }).click();
  await answerFirstOption(page);
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Export progress (JSON)' }).click();
  const exported = await page.getByLabel('If no file was saved, copy your export from here').inputValue();
  expect(JSON.parse(exported).format).toBe('rockto-academy-progress');

  await page.getByRole('button', { name: 'Reset all progress…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Reset all progress?' });
  await dialog.getByLabel('Type RESET to confirm').fill('RESET');
  await dialog.getByRole('button', { name: 'Delete my progress' }).click();

  await page.getByText('Or paste exported text instead of choosing a file').click();
  await page.getByLabel('Exported progress text').fill(exported);
  await page.getByRole('button', { name: 'Check pasted text' }).click();
  await expect(page.getByText('Valid progress file')).toBeVisible();
  await page.getByRole('button', { name: 'Replace my progress with this file…' }).click();
  const replace = page.getByRole('dialog', { name: 'Replace your progress?' });
  await replace.getByRole('checkbox').check();
  await replace.getByRole('button', { name: 'Replace progress' }).click();
  expect(((await storedProgress(page)).attempts as unknown[]).length).toBe(1);
});
