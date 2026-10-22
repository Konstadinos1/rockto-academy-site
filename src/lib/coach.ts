import { z } from 'zod';

// Optional server-side AI coach. The static course works without it. When VITE_COACH_URL is set
// at build time, open responses can be sent to that endpoint, which holds the API key and the
// rubric server-side. Its grade is an automated assessment with limitations, labelled as such.

const COACH_URL: string | undefined = import.meta.env.VITE_COACH_URL;
export const COACH_ENABLED = typeof COACH_URL === 'string' && COACH_URL.length > 0;
const COACH_TIMEOUT_MS = 30_000;

export const coachResultSchema = z.object({
  score: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  verdict: z.string().max(400),
  validPart: z.string().max(2000),
  gap: z.string().max(2000),
  improvedAnswer: z.string().max(4000),
  followUp: z.string().max(1000),
  model: z.string().max(100),
});
export type CoachResult = z.infer<typeof coachResultSchema>;

export async function requestCoachFeedback(questionId: string, response: string): Promise<CoachResult> {
  if (!COACH_ENABLED || !COACH_URL) throw new Error('The AI coach is not configured for this deployment.');
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), COACH_TIMEOUT_MS);
  try {
    const res = await fetch(COACH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ questionId, response }),
      signal: controller.signal,
    });
    if (res.status === 429) throw new Error('The coach is rate-limited right now. Try again later or use self-review.');
    if (!res.ok) throw new Error(`The coach returned an error (${res.status}).`);
    const parsed = coachResultSchema.safeParse(await res.json());
    if (!parsed.success) throw new Error('The coach returned a response in an unexpected format.');
    return parsed.data;
  } finally {
    window.clearTimeout(timer);
  }
}
