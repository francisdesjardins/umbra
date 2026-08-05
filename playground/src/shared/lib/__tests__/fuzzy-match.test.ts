import { expect, test } from '@playwright/test';
import { fuzzyMatch, fuzzyRank } from '../fuzzy-match';

const SYMBOLS = [
  'useModal',
  'useModalActions',
  'useMessageModal',
  'useSlideModal',
  'dialogManager',
  'createDialogManager',
  'createStore',
  'createStoreContext',
  'Key',
  'KeyValue',
  'shallowEqual',
  'ModalOutlet',
];

const best = (query: string) => {
  return fuzzyRank(query, SYMBOLS, (name) => {
    return name;
  })[0]?.item;
};

const names = (query: string) => {
  return fuzzyRank(query, SYMBOLS, (name) => {
    return name;
  }).map((entry) => {
    return entry.item;
  });
};

test.describe('fuzzyMatch', () => {
  test('matches an exact substring', () => {
    expect(fuzzyMatch('modal', 'useModal')).not.toBeNull();
  });

  test('matches a gapped subsequence', () => {
    expect(fuzzyMatch('usmodal', 'useModal')).not.toBeNull();
  });

  test('matches camelCase initials', () => {
    expect(fuzzyMatch('cdm', 'createDialogManager')).not.toBeNull();
  });

  test('is case insensitive both ways', () => {
    expect(fuzzyMatch('USEMODAL', 'useModal')).not.toBeNull();
    expect(fuzzyMatch('key', 'Key')).not.toBeNull();
  });

  test('rejects letters the target does not contain', () => {
    expect(fuzzyMatch('zzz', 'useModal')).toBeNull();
  });

  test('rejects an out-of-order query', () => {
    // `l` before `m` exists in neither order here, and the typo budget for four characters is
    // one edit — three substitutions is not a typo.
    expect(fuzzyMatch('ldom', 'Key')).toBeNull();
  });

  test('an empty query matches everything with no highlight', () => {
    expect(fuzzyMatch('  ', 'useModal')).toEqual({ score: 0, ranges: [] });
  });

  test('reports the matched ranges, merging consecutive hits', () => {
    const match = fuzzyMatch('modal', 'useModal');
    expect(match?.ranges).toEqual([[3, 8]]);
  });

  test('reports one range per run', () => {
    // u·s·e·M·o·d·a·l — `u` alone, then `e`,`M`,`o`,`d` as one unbroken run.
    const match = fuzzyMatch('uemod', 'useModal');
    expect(match?.ranges).toEqual([
      [0, 1],
      [2, 6],
    ]);
  });

  test('scores a boundary hit above a mid-word hit', () => {
    const boundary = fuzzyMatch('m', 'useModal')?.score ?? 0;
    const midWord = fuzzyMatch('m', 'formatHotkeyLabel')?.score ?? 0;
    expect(boundary).toBeGreaterThan(midWord);
  });
});

test.describe('fuzzyMatch — typos', () => {
  test('tolerates a transposition', () => {
    expect(fuzzyMatch('modla', 'useModal')).not.toBeNull();
  });

  test('tolerates a wrong letter', () => {
    expect(fuzzyMatch('modul', 'useModal')).not.toBeNull();
  });

  test('does not report ranges it cannot honestly map', () => {
    expect(fuzzyMatch('modla', 'useModal')?.ranges).toEqual([]);
  });

  test('spends at most one slip per four characters', () => {
    // Two wrong letters in five is a different word, not a typo.
    expect(fuzzyMatch('modxy', 'useModal')).toBeNull();
  });

  test('always scores below a real subsequence match', () => {
    const typo = fuzzyMatch('modla', 'useModal')?.score ?? 0;
    const subsequence = fuzzyMatch('modal', 'useSlideModal')?.score ?? 0;
    expect(typo).toBeLessThan(subsequence);
  });
});

test.describe('fuzzyRank', () => {
  test('ranks the exact name first', () => {
    expect(best('useModal')).toBe('useModal');
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
    expect(names('outlet')).toEqual(['ModalOutlet']);
  });

  test('returns nothing for a query that matches nothing', () => {
    expect(names('qqqq')).toEqual([]);
  });

  test('a typo still finds its symbol, just lower down', () => {
    expect(names('shallowequl')).toContain('shallowEqual');
  });
});
