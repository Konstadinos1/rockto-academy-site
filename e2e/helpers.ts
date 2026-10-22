import { expect, type Page } from '@playwright/test';

/** Answers the current practice or assessment MCQ with the first displayed option and submits it. */
export async function answerFirstOption(page: Page): Promise<void> {
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.getByRole('region', { name: 'Feedback' })).toBeVisible();
}

export async function storedProgress(page: Page): Promise<Record<string, unknown>> {
  const raw = await page.evaluate(() => localStorage.getItem('rockto-academy:v1'));
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}
