# ROCKTO Academy — AI Security Lab

A self-study course on securing AI systems: prompt injection, sensitive data leakage, training-data
poisoning, hallucination and evidence, retrieval, agents and MCP, adversarial ML, supply chain,
secure engineering, evaluation, and governance and incident response.

Every scenario uses **ROCKTO Inc.**, a fictional company. All people, systems, invoices, payroll
records, credentials and incidents are synthetic; email addresses and hosts use the reserved
`.example` domain (RFC 2606).

## What is in it

| | Count |
|---|---|
| Domains | 12 (D01–D12) |
| Lessons | 120 (10 per domain, 450–838 words each, mean 528) |
| Practice questions | 600 (per lesson: 3 multiple choice, 1 diagnosis, 1 control/evidence) |
| Comprehensive assessment | 50 original items: 30 MCQ / 20 open; 15 foundational / 25 applied / 10 advanced |
| Unscored exercises | 120 (one reflection or tabletop per lesson) |
| Glossary terms / sources | 93 / 72 |
| Labs | Task-permission comparison, trace inspector, persistence explorer, evaluation panel |

`npm run content:check` validates all of the above and writes `docs/content-coverage.json`.
The production build fails if any count, reference, ID or assessment distribution is wrong.

## Stack

Vite + React 19 + TypeScript (strict) + Zod, with hash routing so the build is a static site that
can be hosted anywhere (no server, no account). The repository's usual Next.js/Supabase stack was
deliberately not used: the course needs no backend, and a static build keeps learner data on the
device. Styling is hand-written CSS with design tokens for light and dark themes.

## Running it

```bash
npm ci
npm run dev            # http://localhost:5173
npm run build          # content check + typecheck + production build into dist/
npm test               # unit tests (vitest)
npm run test:e2e       # Playwright + axe against the production build (run `npm run build` first)
```

If Playwright cannot download a browser, set `CHROMIUM_PATH` to a local Chromium binary.

Evidence capture (screenshots in both themes at 1440/360/320 px, error and empty states, and a video
of the main flow) is scripted: `npm run preview` in one shell, then
`node scripts/capture-evidence.mjs evidence/raw`.

## Where progress is stored

Progress lives in the browser's `localStorage` on this device only (`rockto-academy:v1`). Nothing
is sent to a server. Specifically:

- Every load and import is parsed with Zod schemas; text is only ever rendered as text.
- Unreadable stored data is copied to `rockto-academy:v1:unreadable` and never silently overwritten.
- Export produces a versioned JSON envelope (`format: rockto-academy-progress`, `formatVersion: 1`).
  Import validates the file, shows a summary, requires confirmation, keeps a backup of the current
  progress and offers undo. Records for lessons or questions that do not exist are skipped and counted.
- Demonstration mode uses a separate key (`rockto-academy:demo:v1`) and a visible banner.
- Reset requires typing `RESET`.

## Grading, and what it does and does not mean

- **Multiple choice** is graded deterministically. Option order is shuffled per session by stable
  option IDs. First attempts are recorded separately from retries.
- **Open responses** use a 0–3 rubric. Without an AI coach, the learner compares their answer with
  the exemplar, ticks which rubric parts it covers, and confirms a score. This is labelled
  **self-reviewed**. Ungraded answers are shown as "not yet reviewed", never as incorrect.
- **AI-graded** appears only when an AI coach is configured (below), and is labelled as automated.
- **Human-reviewed** is a supported state, but this release has no reviewer workflow, so no answer
  is ever labelled human-reviewed.
- Domain states (Not assessed / Practiced / Demonstrated / Reviewed) use the thresholds published
  on the Progress page (`src/lib/metrics.ts`). They are course thresholds, not a certification.
- The answer key ships in the client bundle. The assessment is a self-check, not proctored.

## Optional AI coach

The course is complete without AI. To enable automated feedback on open responses, build with
`VITE_COACH_URL` pointing to an HTTPS endpoint you operate:

```
POST {VITE_COACH_URL}
{ "questionId": "D02-L07-Q4", "response": "learner text" }
→ 200 { "score": 0|1|2|3, "verdict", "validPart", "gap", "improvedAnswer", "followUp", "model" }
```

The endpoint holds the model API key and the rubric server-side; no key ever goes into the client.
Responses are schema-validated, and timeouts, 429s and malformed replies fall back to self-review.
**No coach server is included in this release**, so the deployed preview has the coach disabled.

## The D04 poisoning lab

`labs/poison_lab.py` is the small synthetic backdoor experiment quoted in lesson D04-L10.

```bash
python -m venv .venv && .venv/bin/pip install -r labs/requirements.txt
.venv/bin/python labs/poison_lab.py
.venv/bin/python -m pytest labs/tests
```

It runs locally on generated data only; the web app never executes learner code.

## Limitations

- Content is reviewed as of 20/10/2026 against the sources listed in the Source library. Framework
  versions, specifications and provider terms change; each source records when it was checked.
- Links were verified by automated request on the access date. Hosts that refused automated
  requests are labelled as such, not as verified.
- Progress is per-browser. Clearing site data deletes it unless exported.
- The labs are deterministic browser simulations of fixed synthetic data. They show where a control
  belongs; they do not prove that any production control works.
