import styles from '@/pages/home/ui/HomePage.module.css';
import { useTheme } from '@/shared/lib/theme-context';
import { AppButton, appButtonClass } from '@/shared/ui/AppButton';
import { CodeBlock } from '@/shared/ui/CodeBlock/CodeBlock';
import { MoonPhase, type Phase } from '@/shared/ui/MoonPhase';
import { UmbraMoon } from '@/shared/ui/PeekingMoon/UmbraMoon';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Key, useMessageModal } from 'umbra/react';

const REPO = 'https://github.com/francisdesjardins/umbra';

const GETTING_IT = `git clone https://github.com/francisdesjardins/umbra.git
cd umbra && yarn install && yarn dev

# Or lift what you need out of src/ — plain TypeScript, MIT, no ceremony.
import { dialogManager } from 'umbra';   // the root: no framework needed
import { useModal } from 'umbra/react';  // the React binding
import { useModal } from 'umbra/solid';  // …or the Solid one, same surface
import { bindDialog } from 'umbra/vanilla'; // …or none: drive your own <dialog>`;

const HELLO = `// The first type argument is what this modal closes *with*; the second, the
// reasons it may close for. Both come back to \`onClose\`, both are exhaustive.
const modal = useModal<{ remember: boolean }, 'confirm' | 'cancel'>({
  id: 'hello',
  ariaLabel: 'Hello',
  // Every field an action returns is a DOM prop, so this spread fits a bare
  // <button>, MUI's, or your own. Running state rides as \`data-loading\`.
  render: ({ action }) => (
    <>
      <label>
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        Remember this
      </label>
      <button {...action('cancel', { focusOnOpen: true })}>Not now</button>
      <button
        {...action('confirm', {
          hotkey: Key.Enter,
          // A handler is what carries a payload out; without one an action just
          // closes with its own reason.
          onAction: (close) => close({ remember }),
        })}
      >
        Confirm
      </button>
    </>
  ),
  // reason: 'confirm' | 'cancel' | 'dismiss' — data: { remember: boolean } | undefined,
  // undefined being the honest answer for a dismissal nobody handed anything to.
  onClose: ({ reason, data }) => report(reason, data?.remember),
});`;

/** What the site says before it starts explaining: what this is, how to get it, and one live modal. */
export const HomePage = () => {
  const { isDarkMode } = useTheme();

  const [lastClose, setLastClose] = useState<string | null>(null);
  // The value the dialog produces, which is the whole reason a close carries a payload: `reason`
  // says which door, `data` says what came through it.
  const [remember, setRemember] = useState(false);

  const hello = useMessageModal<{ remember: boolean }, 'confirm' | 'cancel'>({
    id: 'home-hello',
    ariaLabelledBy: 'home-hello-title',
    onClose: (result) => {
      // Shows the panel's claim rather than asserting it: the reason is typed and exhaustive, and
      // only the branch that was handed a payload has one — `data` is optional for that reason.
      switch (result.reason) {
        case 'confirm':
          setLastClose(`confirm · data.remember === ${String(result.data?.remember ?? false)}`);
          return;
        case 'cancel':
          setLastClose('cancel · no data — nothing was confirmed');
          return;
        case 'dismiss':
          setLastClose('dismiss (Escape or the backdrop) · no data');
          return;
      }
    },
    render: ({ action }) => {
      return (
        // The library ships no UI: unstyled, a dialog is text on the backdrop. Consumers bring
        // this, front page included.
        <div className={styles['helloCard']}>
          <h6 id="home-hello-title" className={styles['helloTitle']}>
            This is the whole thing
          </h6>
          <p className={styles['helloBody']}>
            A native <code>&lt;dialog&gt;</code> in the top layer, animated by CSS you wrote, closed
            with a reason your <code>onClose</code> can switch on exhaustively. Focus starts on{' '}
            <em>Not now</em> because that action asked for it. <kbd>Enter</kbd> confirms,{' '}
            <kbd>Escape</kbd> dismisses.
          </p>
          <label className={styles['helloRemember']}>
            <input
              type="checkbox"
              className={styles['helloCheckbox']}
              checked={remember}
              onChange={(event) => {
                setRemember(event.target.checked);
              }}
            />
            Remember this choice
          </label>
          <div className={styles['helloFooter']}>
            <button
              className={appButtonClass({ size: 'small' })}
              {...action('cancel', { focusOnOpen: true })}
            >
              Not now
            </button>
            {/* No `onClick` of our own: after the spread it would replace the action's and the
                action would never run. The payload rides on `onAction`, which is the only door
                out — an action without one closes carrying its reason and nothing else. */}
            <button
              className={appButtonClass({ variant: 'contained', size: 'small' })}
              {...action('confirm', {
                hotkey: Key.Enter,
                onAction: (close) => {
                  close({ remember });
                },
              })}
            >
              Confirm
            </button>
          </div>
        </div>
      );
    },
  });

  return (
    <div className={styles['page']}>
      {/* Hero */}
      <div className={styles['hero']}>
        {/* The corona clipping arrangement is explained beside the classes in the CSS module. */}
        <div className={styles['heroArt']}>
          <div className={styles['heroArtDisc']}>
            <UmbraMoon isDark={isDarkMode} breathing />
          </div>
        </div>

        <div className={styles['heroText']}>
          <h1 className={styles['heroTitle']}>
            {/* Sized to the heading's two steps: the mark is part of the lockup, not a bullet. */}
            <span className={styles['markWide']}>
              <MoonPhase phase="first-quarter" size={40} />
            </span>
            <span className={styles['markNarrow']}>
              <MoonPhase phase="first-quarter" size={28} />
            </span>
            Umbra
          </h1>
          <p className={styles['heroSubtitle']}>Headless dialogs on the native top layer.</p>
          <p className={styles['heroBody']}>
            A dialog manager whose core is plain TypeScript — it resolves and runs with no framework
            installed at all. React and Solid ship as two bindings over it with the same surface —
            same hooks, same options, same typed close — and vanilla as a third that renders
            nothing: a controller for a &lt;dialog&gt; you wrote yourself. Zero UI components either
            way: the markup, the animation and the styling stay yours.
          </p>

          {lastClose ? <span className={styles['lastClose']}>onClose → {lastClose}</span> : null}

          <div className={styles['chipRow']}>
            <span className={styles['chip']}>0 runtime dependencies</span>
            <span className={styles['chip']}>native &lt;dialog&gt;</span>
            <span className={styles['chip']}>typed close payloads</span>
            <span className={styles['chip']}>React · Solid · vanilla</span>
            <span className={styles['chip']}>React Compiler ready</span>
            {/* "Measured" is the claim, not "accessible": the README's Accessibility chapter and
                the WCAG rows of the compatibility matrix cite the test behind each cell. */}
            <span className={styles['chip']}>WCAG 2.2 · measured</span>
          </div>

          <div className={styles['ctaRow']}>
            <AppButton
              variant="contained"
              onClick={async () => {
                // Cleared together, so each run starts from the same place and the readout below
                // is always about the open the visitor just watched.
                setLastClose(null);
                setRemember(false);
                await hello.open();
              }}
            >
              Open a modal
            </AppButton>
            {/* Real anchors wearing the button recipe: a button-with-navigate would drop new-tab
                and copy-link. */}
            <Link to="/getting-started" className={appButtonClass({ variant: 'outlined' })}>
              Get started
            </Link>
            <a href={REPO} target="_blank" rel="noreferrer" className={appButtonClass()}>
              GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Stacked, not side by side: at half width both snippets get a horizontal scrollbar. */}
      <div className={styles['snippets']}>
        <div className={styles['snippet']}>
          <p className={styles['overline']}>
            <MoonPhase phase="first-quarter" size={14} />
            Getting it
          </p>
          <CodeBlock code={GETTING_IT} language="bash" />
        </div>
        <div className={styles['snippet']}>
          <p className={styles['overline']}>
            <MoonPhase phase="last-quarter" size={14} />
            The whole API of a confirm dialog
          </p>
          <CodeBlock code={HELLO} language="tsx" />
        </div>
      </div>

      {/* Where to go next — the three things worth seeing first. */}
      <div className={styles['nextRow']}>
        {(
          [
            {
              to: '/getting-started',
              phase: 'full',
              title: 'Start here',
              body: 'Open, render, close — and the typed reason that comes back.',
            },
            {
              to: '/showcases',
              phase: 'first-quarter',
              title: 'Stacking and focus',
              body: 'One Escape closes one modal; a shared hotkey fires at one level only.',
            },
            {
              to: '/api',
              phase: 'last-quarter',
              title: 'API reference',
              body: 'Generated from the source, so it cannot drift from the code.',
            },
            // `satisfies`, so each `phase` narrows to its literal instead of widening to `string`.
          ] satisfies readonly { to: string; phase: Phase; title: string; body: string }[]
        ).map((card) => {
          return (
            <Link key={card.to} to={card.to} className={styles['nextCard']}>
              <p className={styles['nextTitle']}>
                <MoonPhase phase={card.phase} size={16} />
                {card.title}
              </p>
              <p className={styles['nextBody']}>{card.body}</p>
            </Link>
          );
        })}
      </div>

      {/* Decoration, marked as such, and carrying no `opacity`: over `text.secondary` that
          measured 4.3:1, and an ornament is not worth a contrast exception. `MoonPhase` rather
          than shade-block glyphs, which carry the sizing problem it exists to solve. */}
      <div aria-hidden="true" className={styles['moonRow']}>
        {(
          [
            'waxing-crescent',
            'first-quarter',
            'waxing-gibbous',
            'full',
            'waning-gibbous',
            'last-quarter',
            'waning-crescent',
          ] satisfies readonly Phase[]
        ).map((phase) => {
          return <MoonPhase key={phase} phase={phase} size={14} />;
        })}
      </div>

      {hello.Modal}
    </div>
  );
};
