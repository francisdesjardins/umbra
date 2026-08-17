/**
 * Zero-dependency shallow structural equality: primitives by `Object.is`; objects (arrays,
 * Maps/Sets too) equal when they have the same keys/entries and each value is `Object.is`-equal.
 * One level deep only — nested objects compare by reference. Used as a selector `equals` in
 * `useStore` / `watch`, so a selector rebuilding the same fields does not re-render its consumers.
 *
 * @example
 * const view = useStore(store, { select: (s) => ({ id: s.id }), equals: shallowEqual });
 */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }

  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) {
      return false;
    }
    for (const [key, value] of a) {
      if (!b.has(key) || !Object.is(value, b.get(key))) {
        return false;
      }
    }
    return true;
  }

  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) {
      return false;
    }
    for (const value of a) {
      if (!b.has(value)) {
        return false;
      }
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) {
    return false;
  }
  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    ) {
      return false;
    }
  }
  return true;
}
