import { expect, test } from '@playwright/test';

import { sliceExport } from '../slice-export';

const MODULE = [
  "import { thing } from './thing.js';",
  '',
  '/** A helper nobody exports. */',
  'function helper() {',
  '  return 1;',
  '}',
  '',
  '/**',
  ' * The first one, with two doc lines.',
  ' */',
  'export function First() {',
  '  // An indented `export` inside a string must not end the slice.',
  '  return `export const decoy = 1;`;',
  '}',
  '',
  '// A line comment attached to the declaration.',
  'export const Second = () => {',
  '  return 2;',
  '};',
  '',
  'export function Last() {',
  '  return 3;',
  '}',
  '',
].join('\n');

test.describe('sliceExport', () => {
  test('cuts from the doc comment to the line before the next export', () => {
    expect(sliceExport(MODULE, 'First')).toBe(
      [
        '/**',
        ' * The first one, with two doc lines.',
        ' */',
        'export function First() {',
        '  // An indented `export` inside a string must not end the slice.',
        '  return `export const decoy = 1;`;',
        '}',
      ].join('\n')
    );
  });

  test('keeps a line comment above the declaration, and stops before the next doc block', () => {
    expect(sliceExport(MODULE, 'Second')).toBe(
      [
        '// A line comment attached to the declaration.',
        'export const Second = () => {',
        '  return 2;',
        '};',
      ].join('\n')
    );
  });

  test('the last export runs to the end, without its trailing blank lines', () => {
    expect(sliceExport(MODULE, 'Last')).toBe(
      ['export function Last() {', '  return 3;', '}'].join('\n')
    );
  });

  test('a name that is declared but not exported is not found', () => {
    expect(() => {
      return sliceExport(MODULE, 'helper');
    }).toThrow(/nothing exported as helper/u);
  });

  test('a prefix of a real export does not match it', () => {
    expect(() => {
      return sliceExport(MODULE, 'Firs');
    }).toThrow(/nothing exported as Firs/u);
  });
});
