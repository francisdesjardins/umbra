import { useEffect, useRef } from 'react';
import { render } from 'solid-js/web';
import type { JSX } from 'solid-js';
import {
  SolidBasicApp,
  SolidDeclarationApp,
  SolidMessageApp,
  SolidOutletApp,
  SolidSlideApp,
} from './solid-app.js';

/**
 * A Solid application, mounted inside a React component test.
 *
 * The component-test runner is React's, and there is no Solid one that tracks this Playwright
 * version — so rather than leave the second binding covered by nothing, the harness hosts a real
 * Solid root in a `<div>` React owns. What is under test is entirely Solid's: `render` creates
 * its own reactive graph, and the dispose function it returns is the React cleanup, so a test's
 * modals are torn down with its mount.
 *
 * This is not a mixed-framework pattern anyone should copy into an app. It is a test harness, and
 * the thing it buys is that the two bindings are asserted against the same browser, the same real
 * `<dialog>` and the same top layer.
 */
function SolidRoot({ app }: { readonly app: () => JSX.Element }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    // `render` hands back its own disposer — exactly the shape an effect cleanup wants.
    return render(app, host);
  }, [app]);

  return <div ref={hostRef} data-testid="solid-root" />;
}

export function SolidBasicHarness() {
  return <SolidRoot app={SolidBasicApp} />;
}

export function SolidDeclarationHarness() {
  return <SolidRoot app={SolidDeclarationApp} />;
}

export function SolidOutletHarness() {
  return <SolidRoot app={SolidOutletApp} />;
}

export function SolidSlideHarness() {
  return <SolidRoot app={SolidSlideApp} />;
}

export function SolidMessageHarness() {
  return <SolidRoot app={SolidMessageApp} />;
}
