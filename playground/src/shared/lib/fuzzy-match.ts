/**
 * Small fuzzy matcher — the kind a symbol filter needs and nothing more.
 *
 * Two passes, in order of confidence:
 *
 * 1. **Subsequence.** `usmodal` matches `useModalActions`, scored by _where_ the letters land:
 *    a hit on a word boundary (`M` in `useModal`, after a `-`) or right after the previous hit
 *    is worth far more than one in the middle of a word, so `useModal` outranks
 *    `UseSlideModalOptions` for `usmodal` even though both contain the letters.
 * 2. **Edit distance.** A transposition (`modla`) or a wrong letter (`modul`) breaks the
 *    subsequence scan entirely, so a Damerau–Levenshtein pass with a free start (Sellers'
 *    variant, which is approximate _substring_ search rather than whole-string comparison)
 *    catches typos. It always scores below a real subsequence hit, so typos sort last.
 *
 * Ranges come from pass 1 only; a typo hit has no honest character mapping to highlight.
 */

/** Half-open `[start, end)` slices of the target that the query matched. */
export type FuzzyMatch = {
  readonly score: number;
  readonly ranges: readonly (readonly [number, number])[];
};

const START_BONUS = 12;
const BOUNDARY_BONUS = 8;
const CONSECUTIVE_BONUS = 6;
const HIT_SCORE = 2;
const GAP_PENALTY = 1;
/** A typo hit can never outrank a subsequence hit; this is the ceiling it works down from. */
const TYPO_CEILING = 4;

const isAlphanumeric = (char: string) => {
  return /[a-z0-9]/i.test(char);
};

/** Word starts as a reader sees them: string start, after a separator, and each camelCase hump. */
const isBoundary = (target: string, index: number) => {
  if (index === 0) {
    return true;
  }
  const previous = target[index - 1] ?? '';
  const current = target[index] ?? '';
  return (
    !isAlphanumeric(previous) ||
    (previous === previous.toLowerCase() && current !== current.toLowerCase())
  );
};

const subsequence = (query: string, target: string): FuzzyMatch | null => {
  const lowerQuery = query.toLowerCase();
  const lowerTarget = target.toLowerCase();
  const ranges: [number, number][] = [];
  let score = 0;
  let cursor = 0;
  let previousHit = -1;

  for (const char of lowerQuery) {
    const hit = lowerTarget.indexOf(char, cursor);
    if (hit === -1) {
      return null;
    }
    score += HIT_SCORE;
    if (hit === 0) {
      score += START_BONUS;
    } else if (isBoundary(target, hit)) {
      score += BOUNDARY_BONUS;
    }
    // `previousHit` starts at -1, so the guard matters: without it the first character is
    // "consecutive" with nothing, scores a bonus it did not earn, and is merged into a range
    // that does not exist yet — dropping it from the highlight.
    if (previousHit !== -1 && hit === previousHit + 1) {
      score += CONSECUTIVE_BONUS;
      const last = ranges.at(-1);
      if (last !== undefined) {
        last[1] = hit + 1;
      }
    } else {
      score -= Math.min(hit - cursor, 4) * GAP_PENALTY;
      ranges.push([hit, hit + 1]);
    }
    previousHit = hit;
    cursor = hit + 1;
  }

  // Shorter targets win ties: `Key` should beat `KeyValue` for `key`.
  return { score: score - target.length * 0.05, ranges };
};

/**
 * Best edit distance between the query and any substring of the target (Sellers' variant:
 * row zero is all zeroes, so the match may start anywhere for free).
 */
const approximateDistance = (query: string, target: string) => {
  const width = target.length + 1;
  let beforePrevious: number[] = [];
  let previous = Array.from({ length: width }, () => {
    return 0;
  });

  for (let i = 1; i <= query.length; i++) {
    const current = [i];
    for (let j = 1; j <= target.length; j++) {
      const substitution = (previous[j - 1] ?? 0) + (query[i - 1] === target[j - 1] ? 0 : 1);
      let cost = Math.min(substitution, (previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1);
      // Damerau: two swapped neighbours are one slip of the fingers, not two errors. Without
      // it `modla` costs as much as two wrong letters, and the budget would have to be doubled
      // — letting everything else in — to catch the commonest typo there is.
      if (i > 1 && j > 1 && query[i - 1] === target[j - 2] && query[i - 2] === target[j - 1]) {
        cost = Math.min(cost, (beforePrevious[j - 2] ?? 0) + 1);
      }
      current[j] = cost;
    }
    beforePrevious = previous;
    previous = current;
  }

  return Math.min(...previous);
};

/** `null` when the query does not match at all. */
export const fuzzyMatch = (query: string, target: string): FuzzyMatch | null => {
  const trimmed = query.trim();
  if (trimmed === '') {
    return { score: 0, ranges: [] };
  }

  const direct = subsequence(trimmed, target);
  if (direct !== null) {
    return direct;
  }

  // One slip per four characters, and never zero. Loosen this and a short query starts
  // matching half the list — `outlet` at two edits reaches names sharing nothing with it.
  const budget = Math.max(1, Math.floor(trimmed.length / 4));
  const distance = approximateDistance(trimmed.toLowerCase(), target.toLowerCase());
  return distance <= budget ? { score: TYPO_CEILING - distance, ranges: [] } : null;
};

/** Matching items, best first. Ties keep the caller's order, which is the authored one. */
export const fuzzyRank = <TItem>(
  query: string,
  items: readonly TItem[],
  key: (item: TItem) => string
): readonly { readonly item: TItem; readonly match: FuzzyMatch }[] => {
  return items
    .map((item) => {
      return { item, match: fuzzyMatch(query, key(item)) };
    })
    .filter((entry): entry is { item: TItem; match: FuzzyMatch } => {
      return entry.match !== null;
    })
    .sort((a, b) => {
      return b.match.score - a.match.score;
    });
};
