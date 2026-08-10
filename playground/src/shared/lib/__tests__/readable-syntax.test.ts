import { contrastRatio, parseCssColor } from '@/shared/lib/color-contrast';
import { readableSyntaxStyle } from '@/shared/lib/readable-syntax';
import { expect, test } from '@playwright/test';
import type { CSSProperties } from 'react';

const ratioOn = (color: string, background: string) => {
  const fg = parseCssColor(color);
  const bg = parseCssColor(background);
  if (!fg || !bg) {
    throw new Error(`unparsed: ${color} / ${background}`);
  }
  return contrastRatio(fg, bg);
};

// The four `oneLight` entries the live audit reported as failing, at their real values.
const ONE_LIGHT: Record<string, CSSProperties> = {
  comment: { color: 'hsl(230, 4%, 64%)' },
  string: { color: 'hsl(119, 34%, 47%)' },
  tag: { color: 'hsl(5, 74%, 59%)' },
  function: { color: 'hsl(221, 87%, 60%)' },
  'pre[class*="language-"]': { color: 'hsl(230, 8%, 24%)', background: 'hsl(230, 1%, 98%)' },
};

test('raises every token colour to 4.5:1 against the surface it is painted on', () => {
  const fixed = readableSyntaxStyle(ONE_LIGHT, '#ffffff');

  for (const [selector, rules] of Object.entries(fixed)) {
    const { color } = rules;
    if (color === undefined) {
      continue;
    }
    expect(ratioOn(color, '#ffffff'), selector).toBeGreaterThanOrEqual(4.5);
  }
});

test('leaves rules without a colour untouched, background included', () => {
  const fixed = readableSyntaxStyle(ONE_LIGHT, '#ffffff');
  expect(fixed['pre[class*="language-"]']?.background).toBe('hsl(230, 1%, 98%)');
  expect(readableSyntaxStyle({ plain: { fontStyle: 'italic' } }, '#ffffff')).toEqual({
    plain: { fontStyle: 'italic' },
  });
});

test('does not mutate the theme it was handed — the module-level import is shared', () => {
  const before = ONE_LIGHT['comment']?.color;
  readableSyntaxStyle(ONE_LIGHT, '#ffffff');
  expect(ONE_LIGHT['comment']?.color).toBe(before);
});
