import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import { HostFrame } from '@/pages/microfrontends/examples/host-frame';
import { PageLayout } from '@/shared/ui/PageLayout';
import { SectionNav } from '@/shared/ui/SectionNav';

const SECTIONS = [
  { id: 'the-demo', label: 'The demo' },
  { id: 'the-distribution', label: 'The distribution' },
  { id: 'the-four-panels', label: 'The four panels' },
] as const;

/**
 * Its own page: the frame is the widest thing the playground renders, and one manager across four
 * bindings and a shadow boundary is a peer of stacking, not a card filed under it.
 */
export const MicrofrontendsPage = () => {
  return (
    <PageLayout
      title="Microfrontends"
      description="One manager, distributed to independently-deployed frontends. Everything below happens inside a frame — a separate document and a separate realm — whose only wiring is an import map: dialogManager is a module-level singleton, so resolving umbra to one shared module is what makes four microfrontends share a registry. Four copies would be four registries, and every request would find nothing."
    >
      <SectionNav sections={SECTIONS} />

      <ExampleSection
        id="the-demo"
        title="The demo"
        description="Ask across a boundary in any direction, then read the logs. Push Checkout past Billing's approval limit to watch one request cross React, plain JavaScript and Solid in a single trip: Billing refuses through request.refuse and hands the refusal on to Support, which it has never heard of."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="Four microfrontends, four ways of writing one, one manager"
            description="Checkout on umbra/react, Support on umbra/solid, Billing on umbra/vanilla over a hand-written <dialog>, and Audit as a web component behind a shadow root. None imports another: each asks with requestOpenAndWait, and the owner decides."
            codeKey="mfe-host-frame"
            example={<HostFrame />}
          />
        </ExampleGrid>
      </ExampleSection>

      <ExampleSection
        id="the-distribution"
        title="The distribution"
        description="No bundler runs on the page inside the frame. That is not a simplification — it is the only way to show what the import map does, since a build step that resolved umbra for all four would prove nothing."
      >
        <ExampleGrid columns={2}>
          <ExampleCard
            title="host.html — the distribution, all of it"
            description="An import map names the nine specifiers the four microfrontends write — umbra, its three bindings, React, Solid — four <script type=module> tags load them, and the browser resolves the rest. This is the file that decides whether the four share a manager."
            codeKey="mfe-host-html"
          />
          <ExampleCard
            title="The build behind the import map"
            description="One rolldown build with eight entries, not eight builds: code-splitting hoists everything the microfrontends have in common — the manager included — into a shared chunk each of them imports. That is the mechanism the demo rests on, and separate builds would quietly break it."
            codeKey="mfe-distribution"
          />
        </ExampleGrid>
      </ExampleSection>

      <ExampleSection
        id="the-four-panels"
        title="The four panels"
        description="Four ways of writing the same dialog, none of which imports another. Read Checkout and Support side by side: the useDialog call is the same call. Then Billing, which does not render at all. Then Audit, which is not even in the same DOM tree."
      >
        <ExampleGrid columns={2}>
          <ExampleCard
            title="mfa1.js — Checkout, on the React binding"
            description="createElement rather than JSX, because nothing compiles this file. It writes the same umbra/react specifier a bundled app would, and the import map resolves it to the same module the other three got — which is the whole trick."
            codeKey="mfe-checkout"
          />
          <ExampleCard
            title="mfa3.js — Support, on the Solid binding"
            description="Put this beside Checkout: the same useDialog call, the same options, the same typed close. What differs is Solid's — live values arrive as getters, so the render args are read rather than destructured. Billing asks it for a ticket without knowing it is Solid."
            codeKey="mfe-support"
          />
          <ExampleCard
            title="mfa2.js — Billing, on the vanilla binding"
            description="The third kind of binding: a controller, not a renderer. The <dialog> is hand-written in host.html and this file drives it — bindDialog for the lifecycle, bindAction for a button, with disabled and aria-busy kept in step. The binding a page with no framework reaches for."
            codeKey="mfe-billing"
          />
          <ExampleCard
            title="mfa4.js — Audit, a web component behind a shadow root"
            description="The other three prove the core does not care which framework; this one asked whether it cares which tree — and twice the answer was no. A shadow root changes what document.activeElement reports and which stylesheets apply, and both broke the core. Escalate throws on purpose: a failing action is how the focus restore gets exercised."
            codeKey="mfe-audit"
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
