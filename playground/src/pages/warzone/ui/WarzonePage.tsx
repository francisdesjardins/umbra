import { useTheme } from '@/shared/lib/theme-context';
import { PageLayout } from '@/shared/ui/PageLayout';
import { UmbraMoon } from '@/shared/ui/PeekingMoon/UmbraMoon';
import styles from '@/pages/warzone/ui/WarzonePage.module.css';

/**
 * A deliberately empty page: build a flow against the core and take it apart again, never a demo —
 * a scratch surface that starts explaining itself has become one. Anything worth keeping moves to a
 * real route with a card and a `codeSamples` entry (`playground/CLAUDE.md`). `RootLayout` hides
 * the peeking mascot here as on `/`: a hider beside its full-size twin reads as a stray render.
 */
export const WarzonePage = () => {
  const { isDarkMode } = useTheme();

  return (
    <PageLayout
      title="Warzone"
      description="Scratch space. Nothing lives here on purpose — it is where a flow gets built against the core, tried, and taken apart again."
    >
      <div className={styles['stage']}>
        <div className={styles['artFrame']}>
          <div className={styles['artDisc']}>
            <UmbraMoon isDark={isDarkMode} breathing />
          </div>
        </div>

        <p className={styles['lede']}>This is a warzone.</p>

        <p className={styles['blurb']}>
          A placeholder, waiting for a flow to validate against the core — or for something worth
          showing. Expect it to be empty between visits.
        </p>
      </div>
    </PageLayout>
  );
};
