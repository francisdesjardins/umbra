import { useEffect, useRef, useState } from 'react';
import { applyStyle, type DialogStyle } from '../style.js';

/**
 * A target element and a queue of styles to write onto it, one press at a time.
 *
 * `applyStyle` needs a real `CSSStyleDeclaration` — a computed style is the only witness that
 * says whether a property was actually set, hyphenated correctly, or cleared — so it is exercised
 * here rather than in the unit project.
 */
function ApplyStyleStage({ steps }: { readonly steps: readonly DialogStyle[] }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const appliedRef = useRef<DialogStyle | undefined>(undefined);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const target = targetRef.current;
    const next = steps[step];
    if (!target || !next) {
      return;
    }
    appliedRef.current = applyStyle(target, next, appliedRef.current);
  }, [step, steps]);

  return (
    <>
      <button
        data-testid="advance"
        onClick={() => {
          setStep((current) => {
            return Math.min(current + 1, steps.length - 1);
          });
        }}
      >
        Apply next
      </button>
      <span data-testid="step">{step}</span>
      <div ref={targetRef} data-testid="target-el" />
    </>
  );
}

/**
 * The case the clearing half exists for: entrance and exit keyframes that do not carry the same
 * properties. Without the clear, `transform` written by the exit would survive into the entrance
 * and the dialog would stay scaled down while fully opaque.
 */
export function AsymmetricKeyframesHarness() {
  return <ApplyStyleStage steps={[{ opacity: 0, transform: 'scale(0.5)' }, { opacity: 1 }]} />;
}

/** An explicit `undefined` means "remove", not "write the string undefined". */
export function UndefinedClearsHarness() {
  return (
    <ApplyStyleStage steps={[{ opacity: 0.25 }, { opacity: undefined, position: 'absolute' }]} />
  );
}

/**
 * Name translation: camelCase to hyphenated, a vendor prefix getting its leading dash back, and
 * a custom property passing through untouched. `setProperty` silently ignores a name it does not
 * recognise, so a wrong translation is invisible until something reads the computed value.
 */
/**
 * Add a CSS custom property, which `DialogStyle`'s key set does not name — it is derived from
 * `CSSStyleDeclaration`, and `--anything` is not a member of that. A computed key carries it in
 * without an assertion, which is also how a caller would reach `--dialog-backdrop`.
 */
const withCustomProperty = (style: DialogStyle, name: string, value: string): DialogStyle => {
  return { ...style, [name]: value };
};

export function NameTranslationHarness() {
  return (
    <ApplyStyleStage
      steps={[
        withCustomProperty(
          {
            marginInlineStart: '7px',
            webkitMaskImage: 'linear-gradient(black, black)',
          },
          '--probe-token',
          '9px'
        ),
      ]}
    />
  );
}
