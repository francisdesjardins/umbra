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
 * The microfrontend demo, on a page of its own.
 *
 * It was one card on `/advanced`, which is where it stopped fitting: four panels inside a frame,
 * inside a card, inside a column that shares a page with five other sections. The frame is the
 * widest thing the playground has and it needs the whole column — and the demo makes a claim
 * (one manager across four bindings and a shadow boundary) that is the peer of stacking or
 * imperative control, not a footnote under them.
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
            description="Checkout is umbra/react and owns checkout:receipt. Support is umbra/solid — the same call, the same options, the same return — and owns support:ticket. Billing is umbra/vanilla, the controller binding, over a <dialog> written by hand in the host page. Audit is a web component whose dialog lives in a shadow root, which is a different DOM tree rather than a different framework. None of them imports another; each asks the others with requestOpenAndWait, and the owner decides."
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
        description="Four ways of writing the same modal, none of which imports another. Read Checkout and Support side by side: the useModal call is the same call. Then Billing, which does not render at all. Then Audit, which is not even in the same DOM tree."
      >
        <ExampleGrid columns={2}>
          <ExampleCard
            title="mfa1.js — Checkout, on the React binding"
            description="createElement rather than JSX, because nothing compiles this file. It imports umbra from umbra, useModal from umbra/react and react from react — the package's real specifiers, which the host resolves to modules out of one build so there comes to be one manager and one React rather than several. onOpenRequest lets the others raise its dialog; requestOpen sends the other way. Its Enter hotkey and its opening focus work on a bare <button> with no wrapper — the props carry aria-keyshortcuts and data-focus-on-open, which is all either mechanism needs."
            codeKey="mfe-checkout"
          />
          <ExampleCard
            title="mfa3.js — Support, on the Solid binding"
            description="Put this beside Checkout: the useModal call is the same one. Same options object, same render callback, same action factory spread onto a bare <button>, same typed close travelling back to whoever asked. What differs is underneath — nothing re-renders, and the live fields of an action's props are getters Solid subscribes to individually. h() rather than JSX for the same reason Checkout uses createElement: no build step runs on this page, and Solid's JSX is one."
            codeKey="mfe-support"
          />
          <ExampleCard
            title="mfa2.js — Billing, on the vanilla binding"
            description="The third kind of binding: a controller, not a renderer. The <dialog> is written by hand in host.html and stays the page's; umbra/vanilla drives its lifecycle and bindAction turns two existing buttons into actions — close path, hotkey, and the disabled/loading sync a hook binding gets from a spread. A payload that crossed an ownership boundary is unknown until this side says otherwise, so it validates before it opens, and over the limit it refuses and passes the conversation to Support, which it has never heard of."
            codeKey="mfe-billing"
          />
          <ExampleCard
            title="mfa4.js — Audit, a web component behind a shadow root"
            description="The other three prove the core is indifferent to the framework; this one asked whether it is indifferent to the tree — and the answer, twice, was no. A shadow root changes what document.activeElement reports and which stylesheets apply, so a dialog in a web component was getting the browser's backdrop instead of the library's, and a failed action handed focus to the dialog rather than back to the button. Both are fixed in the core, and its Escalate button still throws on purpose so the second one stays visible."
            codeKey="mfe-audit"
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
