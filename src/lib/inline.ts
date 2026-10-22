// Tokenizer for the course's inline markup. Produces plain tokens; the renderer turns them
// into React elements, so no string is ever injected as HTML.

export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'em'; value: string }
  | { type: 'code'; value: string }
  | { type: 'lesson'; id: string; label?: string }
  | { type: 'term'; id: string; label?: string };

const PATTERN = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|`([^`]+)`|\[\[([A-Z0-9-]+)(?:\|([^\]]+))?\]\]|\{\{([a-z0-9-]+)(?:\|([^}]+))?\}\}/g;

export function tokenizeInline(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let last = 0;
  for (const m of input.matchAll(PATTERN)) {
    const start = m.index ?? 0;
    if (start > last) tokens.push({ type: 'text', value: input.slice(last, start) });
    if (m[1] !== undefined) tokens.push({ type: 'strong', value: m[1] });
    else if (m[2] !== undefined) tokens.push({ type: 'em', value: m[2] });
    else if (m[3] !== undefined) tokens.push({ type: 'code', value: m[3] });
    else if (m[4] !== undefined) tokens.push({ type: 'lesson', id: m[4], label: m[5] });
    else if (m[6] !== undefined) tokens.push({ type: 'term', id: m[6], label: m[7] });
    last = start + m[0].length;
  }
  if (last < input.length) tokens.push({ type: 'text', value: input.slice(last) });
  return tokens;
}

/** Plain text with markup removed, for search indexes and accessible labels. */
export function plainText(input: string): string {
  return tokenizeInline(input)
    .map((t) => ('value' in t ? t.value : (t.label ?? t.id)))
    .join('');
}
