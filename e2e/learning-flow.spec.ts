import { expect, test } from '@playwright/test';
import { answerFirstOption, storedProgress } from './helpers';

test.describe('lesson and practice flow', () => {
  test('first run works without an account and opens a lesson from the entry page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Learn to secure AI');
    await page.getByRole('link', { name: 'Start learning' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('read a lesson, answer a question, see feedback, continue, and resume after reload', async ({ page }) => {
    await page.goto('/#/lesson/D01-L01');
    await page.getByRole('button', { name: 'Mark reading complete' }).first().click();
    await page.getByRole('button', { name: 'Practice this lesson' }).click();
    await expect(page.getByText('Question 1 of 5')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Submit answer' })).toBeVisible();
    await answerFirstOption(page);
    await expect(page.getByText(/First attempt recorded/)).toBeVisible();
    // A submitted answer is locked.
    await expect(page.getByRole('radio').first()).toBeDisabled();

    await page.getByRole('button', { name: /Next question/ }).click();
    await expect(page.getByText('Question 2 of 5')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Question 2 of 5')).toBeVisible();
    const progress = await storedProgress(page);
    expect((progress.attempts as unknown[]).length).toBe(1);
    expect(Object.keys(progress.completed as object)).toContain('D01-L01');
  });

  test('browser back returns to the lesson from practice', async ({ page }) => {
    await page.goto('/#/lesson/D02-L01');
    await page.getByRole('button', { name: 'Practice this lesson' }).click();
    await expect(page).toHaveURL(/#\/practice/);
    await page.goBack();
    await expect(page).toHaveURL(/#\/lesson\/D02-L01/);
  });

  test('a missed question appears in the mistake notebook', async ({ page }) => {
    await page.goto('/#/lesson/D01-L01');
    await page.getByRole('button', { name: 'Practice this lesson' }).click();
    for (let i = 0; i < 3; i++) {
      await answerFirstOption(page);
      if (i < 2) await page.getByRole('button', { name: /Next question/ }).click();
    }
    const progress = await storedProgress(page);
    const wrong = (progress.attempts as { result: { correct: boolean } }[]).filter((a) => !a.result.correct).length;
    await page.goto('/#/mistakes');
    if (wrong > 0) await expect(page.getByText(/D01-L01-Q/).first()).toBeVisible();
    else await expect(page.getByRole('heading', { name: 'Mistake notebook' })).toBeVisible();
  });

  test('hostile note text is stored and shown as plain text', async ({ page }) => {
    let dialogs = 0;
    page.on('dialog', async (d) => {
      dialogs++;
      await d.dismiss();
    });
    await page.goto('/#/lesson/D01-L02');
    const hostile = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    await page.getByLabel('Your notes').fill(hostile);
    await expect(page.getByText('Saved on this device.')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Your notes')).toHaveValue(hostile);
    expect(await page.locator('img[src="x"]').count()).toBe(0);
    expect(dialogs).toBe(0);
  });
});
