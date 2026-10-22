import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Inline } from './RichText';

function render(text: string): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Inline text={text} />
    </MemoryRouter>,
  );
}

describe('Inline renderer', () => {
  it('renders glossary links nested inside bold text', () => {
    const html = render('A **{{llm}}** predicts tokens.');
    expect(html).toContain('<strong><a');
    expect(html).toContain('href="/glossary?term=llm"');
    expect(html).not.toContain('{{');
  });

  it('renders lesson links with the lesson title when no label is given', () => {
    expect(render('See [[D01-L02]].')).toContain('D01-L02 Training, fine-tuning, inference');
  });

  it('escapes hostile markup instead of rendering it', () => {
    const html = render('<img src=x onerror=alert(1)> **<script>alert(2)</script>**');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;');
  });
});
