import { expect, test } from '@playwright/test';
import { fuzzyMatch, fuzzyRank } from '../fuzzy-match';

const SYMBOLS = [
  'useDialog',
  'useDialogActions',
  'useMessageDialog',
  'useSlideDialog',
  'dialogManager',
  'createDialogManager',
  'createStore',
  'createStoreContext',
  'Key',
  'KeyValue',
  'shallowEqual',
  'DialogOutlet',
];

const best = (query: string) => {
  return fuzzyRank(query, {
    items: SYMBOLS,
    key: (name) => {
      return name;
    },
  })[0]?.item;
};

const names = (query: string) => {
  return fuzzyRank(query, {
    items: SYMBOLS,
    key: (name) => {
      return name;
    },
  }).map((entry) => {
    return entry.item;
  });
};

test.describe('fuzzyMatch', () => {
  test('matches an exact substring', () => {
    expect(fuzzyMatch('dialog', 'useDialog')).not.toBeNull();
  });

  test('matches a gapped subsequence', () => {
    expect(fuzzyMatch('usdialog', 'useDialog')).not.toBeNull();
  });

  test('matches camelCase initials', () => {
    expect(fuzzyMatch('cdm', 'createDialogManager')).not.toBeNull();
  });

  test('is case insensitive both ways', () => {
    expect(fuzzyMatch('USEDIALOG', 'useDialog')).not.toBeNull();
    expect(fuzzyMatch('key', 'Key')).not.toBeNull();
  });

  test('rejects letters the target does not contain', () => {
    expect(fuzzyMatch('zzz', 'useDialog')).toBeNull();
  });

  test('rejects an out-of-order query', () => {
    // `l` before `m` exists in neither order, and four characters buy one edit, not three.
    expect(fuzzyMatch('ldom', 'Key')).toBeNull();
  });

  test('an empty query matches everything with no highlight', () => {
    expect(fuzzyMatch('  ', 'useDialog')).toEqual({ score: 0, ranges: [] });
  });

  test('reports the matched ranges, merging consecutive hits', () => {
    const match = fuzzyMatch('dialog', 'useDialog');
    expect(match?.ranges).toEqual([[3, 9]]);
  });

  test('reports one range per run', () => {
    // u·s·e·D·i·a·l·o·g — `u` alone, then `e`,`D`,`i`,`a` as one unbroken run.
    const match = fuzzyMatch('uedia', 'useDialog');
    expect(match?.ranges).toEqual([
      [0, 1],
      [2, 6],
    ]);
  });

  test('scores a boundary hit above a mid-word hit', () => {
    const boundary = fuzzyMatch('m', 'createDialogManager')?.score ?? 0;
    const midWord = fuzzyMatch('m', 'formatHotkeyLabel')?.score ?? 0;
    expect(boundary).toBeGreaterThan(midWord);
  });
});

test.describe('fuzzyMatch — typos', () => {
  test('tolerates a transposition', () => {
    expect(fuzzyMatch('dialgo', 'useDialog')).not.toBeNull();
  });

  test('tolerates a wrong letter', () => {
    expect(fuzzyMatch('diulog', 'useDialog')).not.toBeNull();
  });

  test('does not report ranges it cannot honestly map', () => {
    expect(fuzzyMatch('dialgo', 'useDialog')?.ranges).toEqual([]);
  });

  test('spends at most one slip per four characters', () => {
    // Two wrong letters in five is a different word, not a typo.
    expect(fuzzyMatch('diaxy', 'useDialog')).toBeNull();
  });

  test('always scores below a real subsequence match', () => {
    const typo = fuzzyMatch('dialgo', 'useDialog')?.score ?? 0;
    const subsequence = fuzzyMatch('dialog', 'createDialogManager')?.score ?? 0;
    expect(typo).toBeLessThan(subsequence);
  });
});

test.describe('fuzzyRank', () => {
  test('ranks the exact name first', () => {
    expect(best('useDialog')).toBe('useDialog');
    expect(best('createStore')).toBe('createStore');
  });

  test('ranks a prefix above a mid-string match', () => {
    expect(names('key').indexOf('Key')).toBeLessThan(names('key').indexOf('KeyValue'));
  });

  test('prefers the shorter of two equally-matched names', () => {
    expect(best('createstore')).toBe('createStore');
  });

  test('finds a symbol from its initials', () => {
    expect(best('csc')).toBe('createStoreContext');
  });

  test('drops non-matches entirely', () => {
    expect(names('outlet')).toEqual(['DialogOutlet']);
  });

  test('returns nothing for a query that matches nothing', () => {
    expect(names('qqqq')).toEqual([]);
  });

  test('a typo still finds its symbol, just lower down', () => {
    expect(names('shallowequl')).toContain('shallowEqual');
  });
});
