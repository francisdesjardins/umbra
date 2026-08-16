import { useEffect, useRef } from 'react';
import { render } from 'solid-js/web';
import type { JSX } from 'solid-js';
import {
  SolidBasicApp,
  SolidBusyApp,
  SolidContainedApp,
  SolidLabellingApp,
  SolidDeclarationApp,
  SolidDisposalApp,
  SolidLiveStateApp,
  SolidMessageApp,
  SolidNonModalOptionsApp,
  SolidFailedActionApp,
  SolidReconcileApp,
  SolidOpenOrderApp,
  SolidOutletApp,
  SolidOutletDisposalApp,
  SolidPortalApp,
  SolidClaimlessReclaimApp,
  SolidPrepareFailureApp,
  SolidStackPriorityApp,
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

/**
 * The same Solid root, mounted **inside a shadow root**.
 *
 * A separate component rather than a prop on `SolidRoot`, because the mount target is the whole
 * subject: a Solid app rendered into a shadow root is how a widget keeps the host page's CSS out,
 * and it is the case that breaks the two things a shadow boundary breaks — `adoptedStyleSheets`
 * does not cross it, and `document.activeElement` answers with the host.
 */
function SolidShadowRoot({ app }: { readonly app: () => JSX.Element }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    // Reused across a StrictMode remount — `attachShadow` throws on a host that already has one.
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    const mount = document.createElement('div');
    shadow.append(mount);
    const dispose = render(app, mount);
    return () => {
      dispose();
      mount.remove();
    };
  }, [app]);

  return <div ref={hostRef} data-testid="solid-shadow-host" />;
}

export function SolidShadowRootHarness() {
  return <SolidShadowRoot app={SolidBasicApp} />;
}

export function SolidBasicHarness() {
  return <SolidRoot app={SolidBasicApp} />;
}

export function SolidBusyHarness() {
  return <SolidRoot app={SolidBusyApp} />;
}

export function SolidLabellingHarness() {
  return <SolidRoot app={SolidLabellingApp} />;
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

export function SolidDisposalHarness() {
  return <SolidRoot app={SolidDisposalApp} />;
}

export function SolidOutletDisposalHarness() {
  return <SolidRoot app={SolidOutletDisposalApp} />;
}

export function SolidPortalHarness() {
  return <SolidRoot app={SolidPortalApp} />;
}

export function SolidContainedHarness() {
  return <SolidRoot app={SolidContainedApp} />;
}

export function SolidLiveStateHarness() {
  return <SolidRoot app={SolidLiveStateApp} />;
}

export function SolidStackPriorityHarness() {
  return <SolidRoot app={SolidStackPriorityApp} />;
}

export function SolidOpenOrderHarness() {
  return <SolidRoot app={SolidOpenOrderApp} />;
}

export function SolidNonModalOptionsHarness() {
  return <SolidRoot app={SolidNonModalOptionsApp} />;
}

export function SolidReconcileHarness() {
  return <SolidRoot app={SolidReconcileApp} />;
}

export function SolidFailedActionHarness() {
  return <SolidRoot app={SolidFailedActionApp} />;
}

/**
 * A modal that claims no opening focus, with a panel opening underneath it.
 *
 * The Solid half of the reclaim floor — see the app for why an absent claim is what puts it on
 * that path rather than on the marker above it.
 */
export function SolidClaimlessReclaimHarness() {
  return <SolidRoot app={SolidClaimlessReclaimApp} />;
}

/** A `prepare` that throws, reported through `onError` — see the app for why Solid measures it too. */
export function SolidPrepareFailureHarness() {
  return <SolidRoot app={SolidPrepareFailureApp} />;
}
