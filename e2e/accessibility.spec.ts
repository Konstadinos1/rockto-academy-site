import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ROUTES = ['/', '/#/dashboard', '/#/curriculum', '/#/lesson/D02-L07', '/#/practice', '/#/assessment', '/#/lab', '/#/lab/task-permissions', '/#/mistakes', '/#/progress', '/#/glossary', '/#/sources', '/#/settings'];

for (const [scheme, route] of (['light', 'dark'] as const).flatMap((sc) => ROUTES.map((r) => [sc, r] as const))) {
  test(`no WCAG A/AA axe violations on ${route} (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s) — ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
  });
}

for (const width of [320, 360, 1440]) {
  test(`no horizontal page scroll at ${width}px on a lesson`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/#/lesson/D07-L10');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('keyboard users can skip to content and start practice without a mouse', async ({ page }) => {
  await page.goto('/#/practice');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await skip.focus();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('main');

  const start = page.getByRole('button', { name: 'Start 5 questions' });
  for (let i = 0; i < 20 && !(await start.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(start).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Question 1 of 5')).toBeVisible();
  await page.getByRole('radio').first().focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio').first()).toBeChecked();
});

test('reduced motion preference disables transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/practice');
  const duration = await page.evaluate(() => getComputedStyle(document.querySelector('.btn') as Element).transitionDuration);
  expect(duration.split(',').every((d) => parseFloat(d) <= 0.01)).toBe(true);
});

for (const route of ['/#/lab/task-permissions', '/#/lab/evaluation-panel', '/#/settings', '/#/assessment', '/#/progress']) {
  test(`no horizontal page scroll at 320px on ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
}

test('confirmation dialogs open centred in the viewport', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Reset all progress…' }).click();
  const box = await page.getByRole('dialog', { name: 'Reset all progress?' }).boundingBox();
  const vp = page.viewportSize();
  if (!box || !vp) throw new Error('missing geometry');
  expect(Math.abs(box.x + box.width / 2 - vp.width / 2)).toBeLessThan(4);
  expect(Math.abs(box.y + box.height / 2 - vp.height / 2)).toBeLessThan(4);
});
