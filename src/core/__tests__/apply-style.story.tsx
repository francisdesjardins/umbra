import { useEffect, useRef, useState } from 'react';
import { applyStyle, type DialogStyle } from '../style.js';

// A target element and a queue of styles, one press at a time. `applyStyle` needs a real
// `CSSStyleDeclaration`: a computed style is the only witness that a property landed or cleared.
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
    appliedRef.current = applyStyle(target, { next, previous: appliedRef.current });
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

// The case the clearing half exists for: entrance and exit keyframes carrying different
// properties. Without the clear the dialog stays scaled down while fully opaque.
export function AsymmetricKeyframesHarness() {
  return <ApplyStyleStage steps={[{ opacity: 0, transform: 'scale(0.5)' }, { opacity: 1 }]} />;
}

/** An explicit `undefined` means "remove", not "write the string undefined". */
export function UndefinedClearsHarness() {
  return (
    <ApplyStyleStage steps={[{ opacity: 0.25 }, { opacity: undefined, position: 'absolute' }]} />
  );
}

// Name translation: camelCase to hyphenated, a vendor prefix getting its dash back, and a custom
// property passing through — `setProperty` ignores a name it does not know, so a wrong translation
// is invisible. `DialogStyle` maps `CSSStyleDeclaration`, so a computed key is how `--x` gets in.
const withCustomProperty = (
  style: DialogStyle,
  property: { readonly name: string; readonly value: string }
): DialogStyle => {
  return { ...style, [property.name]: property.value };
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
          { name: '--probe-token', value: '9px' }
        ),
      ]}
    />
  );
}
