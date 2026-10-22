// Captures the screenshot gallery and main-flow video used as release evidence.
// Usage: start `npm run preview`, then `node scripts/capture-evidence.mjs [outDir]`.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = process.argv[2] ?? 'evidence/raw';
mkdirSync(`${OUT}/shots`, { recursive: true });
mkdirSync(`${OUT}/video`, { recursive: true });

const ROUTES = [
  ['entry', '/'], ['dashboard-empty', '/#/dashboard'], ['curriculum', '/#/curriculum'], ['lesson', '/#/lesson/D02-L07'],
  ['practice-chooser', '/#/practice'], ['assessment-intro', '/#/assessment'], ['lab-index', '/#/lab'],
  ['lab-task-permissions', '/#/lab/task-permissions'], ['lab-trace-inspector', '/#/lab/trace-inspector'],
  ['lab-persistence-explorer', '/#/lab/persistence-explorer'], ['lab-evaluation-panel', '/#/lab/evaluation-panel'],
  ['mistakes-empty', '/#/mistakes'], ['progress-empty', '/#/progress'], ['glossary', '/#/glossary'], ['sources', '/#/sources'],
  ['settings', '/#/settings'], ['not-found', '/#/no-such-page'],
];
const VIEWPORTS = [['desktop', 1440, 900], ['mobile', 360, 780]];
const issues = [];

async function shot(page, name, full = false) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/shots/${name}.png`, fullPage: full });
}

async function watch(page, label) {
  page.on('pageerror', (e) => issues.push(`${label}: page error ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && issues.push(`${label}: console ${m.text()}`));
}

async function overflow(page, label) {
  const px = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (px > 0) issues.push(`${label}: horizontal overflow ${px}px`);
}

const browser = await chromium.launch();

for (const scheme of ['light', 'dark']) {
  for (const [vp, w, h] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
    const page = await ctx.newPage();
    await watch(page, `${scheme}/${vp}`);
    for (const [name, route] of ROUTES) {
      await page.goto(BASE + route);
      await page.getByRole('heading', { level: 1 }).first().waitFor();
      await overflow(page, `${scheme}/${vp}/${name}`);
      await shot(page, `${vp}-${scheme}-${name}`);
    }
    await ctx.close();
  }
}

// States: feedback, open self-review, assessment navigator and dialogs, populated pages, errors.
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await watch(page, 'states');
await page.goto(BASE + '/#/lesson/D02-L07');
await page.getByRole('button', { name: 'Practice this lesson' }).click();
await shot(page, 'state-practice-question');
await page.getByRole('radio').first().check();
await page.getByRole('button', { name: 'Submit answer' }).click();
await shot(page, 'state-practice-feedback', true);
for (let i = 0; i < 3; i++) {
  await page.getByRole('button', { name: /Next question/ }).click();
  if (i < 2) { await page.getByRole('radio').first().check(); await page.getByRole('button', { name: 'Submit answer' }).click(); }
}
await shot(page, 'state-open-question');
await page.getByLabel('Your answer').fill('The dispatcher must check the destination against the task allowlist; the model cannot be trusted to refuse.');
await page.getByRole('button', { name: 'Submit answer' }).click();
await shot(page, 'state-open-self-review', true);
await page.goto(BASE + '/#/mistakes'); await shot(page, 'state-mistakes-populated');
await page.goto(BASE + '/#/progress'); await shot(page, 'state-progress-populated', true);
await page.goto(BASE + '/#/dashboard'); await shot(page, 'state-dashboard-populated');
await page.goto(BASE + '/#/assessment');
await page.getByRole('button', { name: 'Start in coached mode' }).click();
await shot(page, 'state-assessment-in-progress');
await page.getByRole('button', { name: 'Review and finish' }).click();
await shot(page, 'state-assessment-finish-dialog');
await page.getByRole('button', { name: 'Finish and see results' }).click();
await shot(page, 'state-assessment-results', true);
await page.goto(BASE + '/#/settings');
await page.getByLabel('Import a progress file (.json, up to 5 MB)').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"nope":true}') });
await shot(page, 'state-import-rejected', true);
await page.getByRole('button', { name: 'Reset all progress…' }).click();
await shot(page, 'state-reset-dialog');
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Enter demonstration mode' }).click();
await page.goto(BASE + '/#/dashboard'); await shot(page, 'state-demo-mode-dashboard');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('rockto-academy:v1', '{"corrupt":'); });
await page.goto(BASE + '/#/dashboard'); await page.reload(); await shot(page, 'state-unreadable-storage');
await ctx.close();

// Narrow layout check at 320px.
const narrow = await browser.newContext({ viewport: { width: 320, height: 700 } });
const np = await narrow.newPage();
for (const [name, route] of [['lesson', '/#/lesson/D07-L10'], ['practice', '/#/practice'], ['settings', '/#/settings']]) {
  await np.goto(BASE + route); await np.getByRole('heading', { level: 1 }).first().waitFor();
  await overflow(np, `320/${name}`); await shot(np, `w320-${name}`);
}
await narrow.close();

// Video of the main flow: entry → lesson → practice → feedback → next → reload resume → assessment.
const vctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: `${OUT}/video`, size: { width: 1280, height: 800 } } });
const vp = await vctx.newPage();
await watch(vp, 'video');
const pause = (ms = 900) => vp.waitForTimeout(ms);
await vp.goto(BASE + '/'); await pause(1500);
await vp.getByRole('link', { name: 'Start learning' }).click(); await pause();
await vp.goto(BASE + '/#/lesson/D01-L05'); await pause();
await vp.mouse.wheel(0, 900); await pause(); await vp.mouse.wheel(0, 900); await pause();
await vp.getByLabel('Your notes').fill('Proposal ≠ execution. Check the dispatcher log.'); await pause();
await vp.getByRole('button', { name: 'Mark reading complete' }).first().click(); await pause();
await vp.getByRole('button', { name: 'Practice this lesson' }).click(); await pause();
await vp.getByRole('radio').nth(1).check(); await pause();
await vp.getByRole('button', { name: 'Submit answer' }).click(); await pause(1800);
await vp.getByRole('button', { name: /Next question/ }).click(); await pause();
await vp.reload(); await pause(1500);
await vp.goto(BASE + '/#/lab/task-permissions'); await pause(1500);
await vp.goto(BASE + '/#/assessment'); await pause();
await vp.getByRole('button', { name: 'Start in coached mode' }).click(); await pause();
await vp.getByRole('radio').first().check(); await pause();
await vp.getByRole('button', { name: 'Submit answer' }).click(); await pause(1800);
await vp.goto(BASE + '/#/progress'); await pause(1500);
await vp.getByRole('button', { name: /Switch to .* theme/ }).click(); await pause(1500);
await vctx.close();

await browser.close();
console.log(JSON.stringify({ issues }, null, 2));
