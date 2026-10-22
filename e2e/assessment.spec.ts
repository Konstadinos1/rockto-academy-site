import { expect, test } from '@playwright/test';
import { answerFirstOption } from './helpers';

test('assessment shows the unanswered count, saves, resumes and reports unanswered separately', async ({ page }) => {
  await page.goto('/#/assessment');
  await page.getByRole('button', { name: 'Start in coached mode' }).click();
  await expect(page.getByText(/0\s*answered · 50\s*unanswered/)).toBeVisible();

  // Item 1 is multiple choice in the authored order.
  await answerFirstOption(page);
  await expect(page.getByText(/1\s*answered · 49\s*unanswered/)).toBeVisible();

  await page.reload();
  await expect(page.getByText(/1\s*answered · 49\s*unanswered/)).toBeVisible();

  await page.getByRole('button', { name: 'Review and finish' }).click();
  const dialog = page.getByRole('dialog', { name: 'Finish the assessment?' });
  await expect(dialog).toContainText('49 questions are unanswered');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Review and finish' }).click();
  await dialog.getByRole('button', { name: 'Finish and see results' }).click();
  await expect(page.getByRole('heading', { name: /Results/ }).first()).toBeVisible();
  await expect(page.getByText(/unanswered \(not counted as wrong\)/)).toBeVisible();
});

test('exam mode withholds feedback until the end', async ({ page }) => {
  await page.goto('/#/assessment');
  await page.getByRole('button', { name: 'Start in exam mode' }).click();
  await page.getByRole('radio').first().check();
  await expect(page.getByRole('button', { name: 'Submit answer' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Feedback' })).toHaveCount(0);
  await page.getByRole('button', { name: /Next/ }).last().click();
  await page.getByRole('button', { name: /Previous/ }).first().click();
  await expect(page.getByRole('radio').first()).toBeChecked();
});
