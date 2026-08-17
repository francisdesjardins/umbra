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
 * A Solid application hosted in a `<div>` React owns, because the component-test runner is React's
 * and no Solid one tracks this Playwright version. What is under test is entirely Solid's: `render`
 * builds its own reactive graph and returns the disposer this effect cleans up with. Not a pattern
 * to copy into an app — a harness, bought so both bindings face the same browser and top layer.
 */
function SolidRoot({ app }: { readonly app: () => JSX.Element }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    return render(app, host);
  }, [app]);

  return <div ref={hostRef} data-testid="solid-root" />;
}

/**
 * The same root **inside a shadow root** — a widget keeping the host page's CSS out, and the case
 * where `adoptedStyleSheets` does not cross and `document.activeElement` answers with the host. Its
 * own component rather than a prop, because the mount target is the whole subject.
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

/** The Solid half of the reclaim floor — see the app for why an absent claim reaches it. */
export function SolidClaimlessReclaimHarness() {
  return <SolidRoot app={SolidClaimlessReclaimApp} />;
}

/** A `prepare` that throws, reported through `onError` — see the app for why Solid measures it too. */
export function SolidPrepareFailureHarness() {
  return <SolidRoot app={SolidPrepareFailureApp} />;
}
