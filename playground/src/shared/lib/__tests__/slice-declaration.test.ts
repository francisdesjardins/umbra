import { expect, test } from '@playwright/test';

import { sliceDeclaration, sliceDeclarations } from '../slice-declaration';

const MODULE = [
  "import { thing } from './thing.js';",
  '',
  '/** A helper nobody exports — a card’s subject often is one. */',
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

test.describe('sliceDeclaration', () => {
  test('cuts from the doc comment to the line before the next declaration', () => {
    expect(sliceDeclaration(MODULE, 'First')).toBe(
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
    expect(sliceDeclaration(MODULE, 'Second')).toBe(
      [
        '// A line comment attached to the declaration.',
        'export const Second = () => {',
        '  return 2;',
        '};',
      ].join('\n')
    );
  });

  test('the last declaration runs to the end, without its trailing blank lines', () => {
    expect(sliceDeclaration(MODULE, 'Last')).toBe(
      ['export function Last() {', '  return 3;', '}'].join('\n')
    );
  });

  test('reaches a declaration that is not exported', () => {
    expect(sliceDeclaration(MODULE, 'helper')).toBe(
      [
        '/** A helper nobody exports — a card’s subject often is one. */',
        'function helper() {',
        '  return 1;',
        '}',
      ].join('\n')
    );
  });

  test('a name nothing declares is not found', () => {
    expect(() => {
      return sliceDeclaration(MODULE, 'Absent');
    }).toThrow(/nothing declared as Absent/u);
  });

  test('a prefix of a real declaration does not match it', () => {
    expect(() => {
      return sliceDeclaration(MODULE, 'Firs');
    }).toThrow(/nothing declared as Firs/u);
  });
});

test.describe('sliceDeclarations', () => {
  test('joins the slices in the order asked, not the order declared', () => {
    expect(sliceDeclarations(MODULE, ['Last', 'helper'])).toBe(
      [sliceDeclaration(MODULE, 'Last'), '', sliceDeclaration(MODULE, 'helper')].join('\n')
    );
  });
});
