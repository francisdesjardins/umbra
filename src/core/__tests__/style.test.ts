import { expect, test } from '@playwright/test';
import { applyStyle } from '../style.js';

/**
 * `applyStyle`, without an element.
 *
 * The interesting half of this function is not the writing — a renderer does that — it is the
 * *clearing*: a style object is recomputed per phase, so a property that appears only in the
 * entrance keyframe has to be removed when the exit one does not name it. Get that wrong and a
 * dialog keeps a transform it was meant to drop, which reads as an animation bug three layers
 * away from here.
 *
 * All of it is bookkeeping over two method calls, and `StyleTarget` is what lets it be asserted
 * as such. The component test beside this one covers what only a browser can answer: that the
 * computed style actually lands.
 */

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

    applyStyle(target, { opacity: 1, maxHeight: '100dvh' });

    expect(target.calls).toEqual(['set opacity=1', 'set max-height=100dvh']);
  });

  test('prefixes a vendor property with the dash CSS expects', () => {
    // `webkitLineClamp` hyphenates to `webkit-line-clamp`, which is not a property —
    // `-webkit-line-clamp` is. The leading dash is the whole of the special case.
    const target = spyTarget();

    applyStyle(target, { webkitLineClamp: '2' });

    expect(target.calls).toEqual(['set -webkit-line-clamp=2']);
  });

  test('removes what the previous style set and this one does not name', () => {
    // The reason this exists rather than an `Object.assign`: the exit keyframe does not mention
    // `transform`, so the entrance's has to go — otherwise the dialog leaves scaled.
    const target = spyTarget();
    const entrance = applyStyle(target, { opacity: 1, transform: 'scale(1)' });
    target.calls.length = 0;

    applyStyle(target, { opacity: 0 }, entrance);

    expect(target.calls).toEqual(['remove transform', 'set opacity=0']);
  });

  test('keeps a property both styles name, without removing it first', () => {
    const target = spyTarget();
    const previous = applyStyle(target, { opacity: 1 });
    target.calls.length = 0;

    applyStyle(target, { opacity: 0 }, previous);

    expect(target.calls).toEqual(['set opacity=0']);
  });

  test('an explicit `undefined` removes rather than writing the word', () => {
    // `exactOptionalPropertyTypes` lets a caller build `{ transform: undefined }` deliberately,
    // and `String(undefined)` would set the literal text "undefined" on the element.
    const target = spyTarget();

    applyStyle(target, { opacity: 1, transform: undefined });

    expect(target.calls).toEqual(['set opacity=1', 'remove transform']);
  });

  test('returns `next`, so a caller can thread it into the following call', () => {
    // The signature that lets a binding keep one variable: `applied = applyStyle(el, s, applied)`.
    const target = spyTarget();
    const next = { opacity: 1 };

    expect(applyStyle(target, next)).toBe(next);
  });

  test('nothing to clear on the first application', () => {
    const target = spyTarget();

    applyStyle(target, { opacity: 1 });

    expect(target.calls).toEqual(['set opacity=1']);
  });

  test('a custom property goes through untouched, both writing and clearing', () => {
    // `--dialog-backdrop` is the one styling lever the library documents, and `umbra/vanilla` is
    // used from plain JavaScript, where nothing narrows the object on the way in. A
    // `Record<string, string>` is that situation written in TypeScript: `DialogStyle` is a mapped
    // type over `CSSStyleDeclaration`'s keys, so a custom property is not one of them and an
    // object *literal* carrying one is rejected — but the record is assignable, and it is what a
    // caller assembling a style at runtime actually holds.
    //
    // The hyphenation must not touch it: `--dialog-backdrop` is already the name `setProperty`
    // wants, and the camelCase rule would leave it alone only by accident.
    const target = spyTarget();
    const custom: Record<string, string> = { '--dialog-backdrop': 'rgba(0, 0, 0, 0.7)' };

    const applied = applyStyle(target, custom);
    // And clearing reaches the same branch, which is the half that would strand a backdrop colour
    // on the element after the style that set it stopped naming it.
    applyStyle(target, { opacity: 1 }, applied);

    expect(target.calls).toEqual([
      'set --dialog-backdrop=rgba(0, 0, 0, 0.7)',
      'remove --dialog-backdrop',
      'set opacity=1',
    ]);
  });
});
