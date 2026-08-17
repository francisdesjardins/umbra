import { contrastRatio, parseCssColor, readableHsl } from '@/shared/lib/color-contrast';
import { expect, test } from '@playwright/test';

const ratio = (foreground: string, background: string) => {
  const fg = parseCssColor(foreground);
  const bg = parseCssColor(background);
  if (!fg || !bg) {
    throw new Error(`unparsed: ${foreground} / ${background}`);
  }
  return contrastRatio(fg, bg);
};

test.describe('parseCssColor', () => {
  test('reads the three notations the app actually writes', () => {
    expect(parseCssColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseCssColor('#d97706')).toEqual({ r: 217, g: 119, b: 6 });
    expect(parseCssColor('rgb(217, 119, 6)')).toEqual({ r: 217, g: 119, b: 6 });
    expect(parseCssColor('hsl(0, 0%, 100%)')).toEqual({ r: 255, g: 255, b: 255 });
  });

  test('answers null rather than a guess, so a caller can leave the value alone', () => {
    expect(parseCssColor('inherit')).toBeNull();
    expect(parseCssColor('var(--modal-bg)')).toBeNull();
    expect(parseCssColor('')).toBeNull();
  });
});

test.describe('contrastRatio', () => {
  test('anchors on the two ratios the spec fixes', () => {
    expect(ratio('#000000', '#ffffff')).toBeCloseTo(21, 2);
    expect(ratio('#ffffff', '#ffffff')).toBeCloseTo(1, 2);
  });

  test('is symmetric — order of the pair is not information', () => {
    expect(ratio('#d97706', '#ffffff')).toBeCloseTo(ratio('#ffffff', '#d97706'), 6);
  });

  // The finding this pass started from: the palette's amber cannot carry white text, worst in dark
  // mode. Pinned so a palette edit reintroducing it fails here, not on someone's laptop panel.
  test('reports the amber/white pair as the failure it is', () => {
    expect(ratio('#ffffff', '#d97706')).toBeLessThan(4.5);
    expect(ratio('#ffffff', '#f59e0b')).toBeLessThan(3);
    expect(ratio('#0f172a', '#d97706')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#0f172a', '#f59e0b')).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('readableHsl', () => {
  test('darkens toward a light background and lightens toward a dark one', () => {
    const onWhite = readableHsl('hsl(230, 4%, 64%)', { background: '#ffffff' });
    const onBlack = readableHsl('hsl(220, 10%, 40%)', { background: '#1a1a1a' });

    expect(ratio(onWhite, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(ratio(onBlack, '#1a1a1a')).toBeGreaterThanOrEqual(4.5);
  });

  test('keeps hue and saturation, because that is what makes a theme itself', () => {
    const adjusted = readableHsl('hsl(119, 34%, 47%)', { background: '#ffffff' });
    expect(adjusted.startsWith('hsl(119, 34%,')).toBe(true);
  });

  test('leaves a colour that already passes exactly as it was', () => {
    const passing = 'hsl(230, 8%, 24%)';
    expect(readableHsl(passing, { background: '#ffffff' })).toBe(passing);
  });

  test('leaves what it cannot parse alone rather than substituting a safe colour', () => {
    expect(readableHsl('inherit', { background: '#ffffff' })).toBe('inherit');
    expect(readableHsl('#a0a1a7', { background: '#ffffff' })).toBe('#a0a1a7');
  });

  test('honours a caller-supplied minimum', () => {
    const strict = readableHsl('hsl(230, 4%, 64%)', { background: '#ffffff', minimum: 7 });
    expect(ratio(strict, '#ffffff')).toBeGreaterThanOrEqual(7);
  });
});
