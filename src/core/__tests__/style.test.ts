import { expect, test } from '@playwright/test';
import { applyStyle } from '../style.js';

// `applyStyle`, without an element. The interesting half is the *clearing*: a style object is
// recomputed per phase, so a property named only in the entrance keyframe has to be removed when
// the exit one omits it, or a dialog keeps a transform and reads as an animation bug layers away.

/** Records what was written and removed, in order. */
const spyTarget = () => {
  const calls: string[] = [];
  return {
    calls,
    style: {
      setProperty: (name: string, value: string) => {
        calls.push(`set ${name}=${value}`);
      },
      removeProperty: (name: string) => {
        calls.push(`remove ${name}`);
        return '';
      },
    },
  };
};

test.describe('applyStyle', () => {
  test('writes each property through, hyphenating as it goes', () => {
    const target = spyTarget();

    applyStyle(target, { next: { opacity: 1, maxHeight: '100dvh' } });

    expect(target.calls).toEqual(['set opacity=1', 'set max-height=100dvh']);
  });

  test('prefixes a vendor property with the dash CSS expects', () => {
    // `webkitLineClamp` hyphenates to `webkit-line-clamp`, which is not a property; the dash is.
    const target = spyTarget();

    applyStyle(target, { next: { webkitLineClamp: '2' } });

    expect(target.calls).toEqual(['set -webkit-line-clamp=2']);
  });

  test('removes what the previous style set and this one does not name', () => {
    // Not an `Object.assign`: the exit omits `transform`, so the dialog would leave scaled.
    const target = spyTarget();
    const entrance = applyStyle(target, { next: { opacity: 1, transform: 'scale(1)' } });
    target.calls.length = 0;

    applyStyle(target, { next: { opacity: 0 }, previous: entrance });

    expect(target.calls).toEqual(['remove transform', 'set opacity=0']);
  });

  test('keeps a property both styles name, without removing it first', () => {
    const target = spyTarget();
    const previous = applyStyle(target, { next: { opacity: 1 } });
    target.calls.length = 0;

    applyStyle(target, { next: { opacity: 0 }, previous });

    expect(target.calls).toEqual(['set opacity=0']);
  });

  test('an explicit `undefined` removes rather than writing the word', () => {
    // A caller can build `{ transform: undefined }`; `String(undefined)` would write the word.
    const target = spyTarget();

    applyStyle(target, { next: { opacity: 1, transform: undefined } });

    expect(target.calls).toEqual(['set opacity=1', 'remove transform']);
  });

  test('returns `next`, so a caller can thread it into the following call', () => {
    // The signature that lets a binding keep one variable: `applied = applyStyle(el, { next, previous: applied })`.
    const target = spyTarget();
    const next = { opacity: 1 };

    expect(applyStyle(target, { next })).toBe(next);
  });

  test('nothing to clear on the first application', () => {
    const target = spyTarget();

    applyStyle(target, { next: { opacity: 1 } });

    expect(target.calls).toEqual(['set opacity=1']);
  });

  test('a custom property goes through untouched, both writing and clearing', () => {
    // `--dialog-backdrop` is the documented styling lever, and `umbra/vanilla` is called from plain
    // JS. `DialogStyle` maps `CSSStyleDeclaration`'s keys, so an object *literal* carrying a custom
    // property is rejected while a `Record<string, string>` is assignable — what a caller assembling
    // a style at runtime holds.
    const target = spyTarget();
    const custom: Record<string, string> = { '--dialog-backdrop': 'rgba(0, 0, 0, 0.7)' };

    const applied = applyStyle(target, { next: custom });
    // Clearing reaches the same branch — the half that would strand a backdrop colour behind.
    applyStyle(target, { next: { opacity: 1 }, previous: applied });

    expect(target.calls).toEqual([
      'set --dialog-backdrop=rgba(0, 0, 0, 0.7)',
      'remove --dialog-backdrop',
      'set opacity=1',
    ]);
  });
});
