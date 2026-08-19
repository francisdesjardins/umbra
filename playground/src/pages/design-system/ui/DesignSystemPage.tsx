import { ExampleSection } from '@/entities/example';
import { useTheme } from '@/shared/lib/theme-context';
import { AppButton } from '@/shared/ui/AppButton';
import { CodeIcon, PlayArrowIcon } from '@/shared/ui/icons';
import { PageLayout } from '@/shared/ui/PageLayout';
import { SectionNav } from '@/shared/ui/SectionNav';
import { SurfaceCard } from '@/shared/ui/SurfaceCard';
import styles from '@/pages/design-system/ui/DesignSystemPage.module.css';
import { useEffect, useState } from 'react';

/**
 * Penumbra, rendered from Penumbra.
 *
 * Every value on this page is read out of `getComputedStyle(document.documentElement)` rather than
 * written here, so the page cannot drift from `tokens.system.css` / `tokens.skin.css` — a style
 * guide that restates its own tokens is a second source of truth and goes stale the first time one
 * of them changes. It re-reads on a theme flip, which is also how the swatches show the right pair.
 */

const SECTIONS = [
  { id: 'palette', label: 'Palette' },
  { id: 'semantic', label: 'Semantic' },
  { id: 'type', label: 'Type' },
  { id: 'space', label: 'Space & radii' },
  { id: 'motion', label: 'Motion' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'rules', label: 'Rules' },
];

/** Colour tokens, with what each one is *for* — the part a value cannot tell you. */
const PALETTE: ReadonlyArray<readonly [string, string]> = [
  ['--app-bg', 'The ground. A step under the paper in both schemes.'],
  ['--app-paper', 'Bars, rails, cards.'],
  ['--app-text', 'Body ink.'],
  ['--app-text-secondary', 'Supporting copy.'],
  ['--app-text-tertiary', 'Counts, hints, placeholders — still clears 4.5:1.'],
  ['--app-flame', 'A fill. Never text: 3.2:1 on the page.'],
  ['--app-accent', 'The amber you may write in.'],
  ['--app-primary-hover', 'A filled primary brightens; it never deepens.'],
  ['--app-flame-wash', 'The tint behind a selected or live surface.'],
  ['--app-divider', 'A layout hairline. Owes no contrast.'],
  ['--app-control-border', "A control's edge. 1.4.11 asks 3:1 of it."],
  ['--app-hover', 'The neutral overlay under a hover.'],
];

const SEMANTIC: ReadonlyArray<readonly [string, string]> = [
  ['--app-error', 'Destructive and failed states.'],
  ['--app-error-ink', 'What goes on the error fill.'],
  ['--app-ok', 'Succeeded.'],
  ['--app-ok-wash', 'The surface a success badge sits on.'],
  ['--app-info', 'Neutral notice.'],
  ['--app-info-wash', 'The surface an info banner sits on.'],
];

const TYPE_STEPS = [
  '--app-text-xs',
  '--app-text-sm',
  '--app-text-md',
  '--app-text-base',
  '--app-text-lg',
  '--app-text-xl',
  '--app-text-2xl',
  '--app-text-3xl',
];

const SPACE_STEPS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 14].map((n) => {
  return `--app-space-${String(n)}`;
});

const RADII = [
  '--app-radius-sm',
  '--app-radius',
  '--app-radius-md',
  '--app-radius-lg',
  '--app-radius-xl',
];

const EASINGS = ['--app-ease', '--app-ease-out', '--app-ease-in'];

/** Reads the live custom properties, and again whenever the scheme flips. */
function useTokens(): (name: string) => string {
  const { isDarkMode } = useTheme();
  const [read, setRead] = useState<Record<string, string>>({});

  useEffect(() => {
    const computed = getComputedStyle(document.documentElement);
    const names = [
      ...PALETTE.map(([n]) => {
        return n;
      }),
      ...SEMANTIC.map(([n]) => {
        return n;
      }),
      ...TYPE_STEPS,
      ...SPACE_STEPS,
      ...RADII,
      ...EASINGS,
      '--app-quick',
      '--app-duration',
      '--app-slow',
      '--app-topbar-height',
      '--app-sidebar-width',
      '--app-measure',
      '--app-font-display',
      '--app-font-body',
      '--app-font-mono',
    ];
    const next: Record<string, string> = {};
    for (const name of names) {
      next[name] = computed.getPropertyValue(name).trim();
    }
    setRead(next);
  }, [isDarkMode]);

  return (name: string) => {
    return read[name] ?? '';
  };
}

function Swatch({ name, note, value }: { name: string; note: string; value: string }) {
  return (
    <div className={styles['swatch']}>
      <div className={styles['chip']} style={{ background: `var(${name})` }} />
      <div className={styles['meta']}>
        <div className={styles['name']}>{name}</div>
        <div className={styles['value']}>{value}</div>
        <div className={styles['note']}>{note}</div>
      </div>
    </div>
  );
}

export function DesignSystemPage() {
  const token = useTokens();

  return (
    <PageLayout
      title="Penumbra"
      description="The design system this playground is built in — read live from the token sheet, so what you see here is what the CSS holds rather than a copy of it. The eclipse the mascot draws: a dark body, a corona around it."
    >
      <SectionNav sections={SECTIONS} />

      <ExampleSection
        id="palette"
        title="Palette"
        description="Dark is the designed-for scheme; light is given the same care rather than derived by inversion. Components read tokens and never branch on the mode — the tokens do that."
      >
        <div className={styles['grid']}>
          {PALETTE.map(([name, note]) => {
            return <Swatch key={name} name={name} note={note} value={token(name)} />;
          })}
        </div>
      </ExampleSection>

      <ExampleSection
        id="semantic"
        title="Semantic"
        description="Each ink pairs with the tinted surface a badge or banner sits on. They exist so a component stops reaching for a literal — and with it, stops branching on mode."
      >
        <div className={styles['grid']}>
          {SEMANTIC.map(([name, note]) => {
            return <Swatch key={name} name={name} note={note} value={token(name)} />;
          })}
        </div>
      </ExampleSection>

      <ExampleSection
        id="type"
        title="Type"
        description="Three voices: the display serif on h1–h3 and the wordmark, the body sans everywhere else, the mono for code, eyebrows and columns of digits. The ramp is ~1.22 off a 15px body."
      >
        <SurfaceCard>
          <div style={{ padding: 'var(--app-space-5)' }}>
            <div className={styles['rows']}>
              {TYPE_STEPS.map((name) => {
                return (
                  <div className={styles['row']} key={name}>
                    <span className={styles['rowKey']}>{name}</span>
                    <span className={styles['rowValue']}>{token(name)}</span>
                    <span className={styles['specimen']} style={{ fontSize: `var(${name})` }}>
                      Open, render, close
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </SurfaceCard>
      </ExampleSection>

      <ExampleSection
        id="space"
        title="Space & radii"
        description="A component asks for a step, never a pixel count. An off-scale literal has to say why it is off-scale."
      >
        <SurfaceCard>
          <div style={{ padding: 'var(--app-space-5)' }}>
            <div className={styles['rows']}>
              {SPACE_STEPS.map((name) => {
                return (
                  <div className={styles['row']} key={name}>
                    <span className={styles['rowKey']}>{name}</span>
                    <span className={styles['rowValue']}>{token(name)}</span>
                    <span className={styles['bar']} style={{ width: `var(${name})` }} />
                  </div>
                );
              })}
              {RADII.map((name) => {
                return (
                  <div className={styles['row']} key={name}>
                    <span className={styles['rowKey']}>{name}</span>
                    <span className={styles['rowValue']}>{token(name)}</span>
                    <span
                      className={styles['radiusDemo']}
                      style={{ borderRadius: `var(${name})` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </SurfaceCard>
      </ExampleSection>

      <ExampleSection
        id="motion"
        title="Motion"
        description="Never a cubic-bezier literal in a component — and never a transition on colour, since a scheme flip switches backgrounds instantly and would interpolate the outgoing ink across them. Hover a track."
      >
        <SurfaceCard>
          <div style={{ padding: 'var(--app-space-5)' }}>
            <div className={styles['rows']}>
              {EASINGS.map((name) => {
                return (
                  <div className={styles['row']} key={name}>
                    <span className={styles['rowKey']}>{name}</span>
                    <span className={styles['rowValue']}>{token(name)}</span>
                    <span className={styles['track']} tabIndex={0}>
                      <span
                        className={styles['dot']}
                        style={{ transitionTimingFunction: `var(${name})` }}
                      />
                    </span>
                  </div>
                );
              })}
              {['--app-quick', '--app-duration', '--app-slow'].map((name) => {
                return (
                  <div className={styles['row']} key={name}>
                    <span className={styles['rowKey']}>{name}</span>
                    <span className={styles['rowValue']}>{token(name)}</span>
                    <span className={styles['track']} tabIndex={0}>
                      <span
                        className={styles['dot']}
                        style={{ transitionDuration: `var(${name})` }}
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </SurfaceCard>
      </ExampleSection>

      <ExampleSection
        id="recipes"
        title="Recipes"
        description="One recipe per thing. The buttons below are the shell's own; a dialog's interior uses the templates' buttons instead, on purpose."
      >
        <SurfaceCard>
          <div
            style={{
              padding: 'var(--app-space-5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--app-space-5)',
            }}
          >
            <div className={styles['recipeRow']}>
              <AppButton variant="contained">Contained</AppButton>
              <AppButton variant="outlined">Outlined</AppButton>
              <AppButton>Text</AppButton>
              <AppButton variant="contained" color="error">
                Destructive
              </AppButton>
              <AppButton variant="contained" disabled>
                Disabled
              </AppButton>
              <AppButton variant="contained" size="small">
                <CodeIcon width={15} height={15} />
                Small
              </AppButton>
            </div>

            <div className={styles['navSample']}>
              <div className={`${styles['navItem']} ${styles['navItemOn']}`}>
                <PlayArrowIcon width={17} height={17} />
                Selected — a lit edge
              </div>
              <div className={styles['navItem']}>
                <CodeIcon width={17} height={17} />
                Not selected
              </div>
            </div>
          </div>
        </SurfaceCard>
      </ExampleSection>

      <ExampleSection
        id="rules"
        title="Rules with teeth"
        description="Each of these was written down first and broken anyway, so each is a test in design-system-layering.test.ts — verified to fail when violated."
      >
        <SurfaceCard>
          <div style={{ padding: 'var(--app-space-5)' }}>
            <ul className={styles['rules']}>
              <li>
                <strong>No shell token inside the templates.</strong> They are copied into apps with
                no <code>--app-*</code> sheet, where <code>var(--app-ease)</code> makes a whole
                transition invalid and the dialog stops animating.
              </li>
              <li>
                <strong>
                  No colour or typeface in <code>tokens.system.css</code>.
                </strong>{' '}
                The moment one appears the base has stopped being portable.
              </li>
              <li>
                <strong>No Material easing, no MD2 metric.</strong> The transcribed constants are
                gone and stay gone.
              </li>
              <li>
                <strong>
                  No transition on <code>color</code>.
                </strong>{' '}
                Measured at 1.08:1 mid-flip.
              </li>
              <li>
                <strong>Colour is measured, not chosen.</strong> Eleven routes × both schemes, plus
                dialogs, through a real browser — and axe-core for ARIA, run with a dialog open as
                well as closed.
              </li>
            </ul>
          </div>
        </SurfaceCard>
      </ExampleSection>
    </PageLayout>
  );
}
