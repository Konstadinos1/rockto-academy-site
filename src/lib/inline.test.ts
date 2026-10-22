import { describe, expect, it } from 'vitest';
import { plainText, tokenizeInline } from './inline';

describe('inline markup', () => {
  it('tokenizes emphasis, code, lesson links and glossary terms', () => {
    expect(tokenizeInline('A **b** *c* `d` [[D01-L02|e]] {{rag|f}}')).toEqual([
      { type: 'text', value: 'A ' },
      { type: 'strong', value: 'b' },
      { type: 'text', value: ' ' },
      { type: 'em', value: 'c' },
      { type: 'text', value: ' ' },
      { type: 'code', value: 'd' },
      { type: 'text', value: ' ' },
      { type: 'lesson', id: 'D01-L02', label: 'e' },
      { type: 'text', value: ' ' },
      { type: 'term', id: 'rag', label: 'f' },
    ]);
  });

  it('keeps HTML and script text as plain text tokens', () => {
    const hostile = '<img src=x onerror=alert(1)><script>alert(2)</script>';
    expect(tokenizeInline(hostile)).toEqual([{ type: 'text', value: hostile }]);
  });

  it('does not treat lowercase or malformed ids as lesson links', () => {
    expect(tokenizeInline('[[javascript:alert(1)]]')).toEqual([{ type: 'text', value: '[[javascript:alert(1)]]' }]);
  });

  it('strips markup for plain text', () => {
    expect(plainText('**Bold** and [[D02-L01]]')).toBe('Bold and D02-L01');
  });
});
