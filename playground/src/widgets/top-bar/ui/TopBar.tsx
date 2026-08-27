import { EclipseMark } from '@/shared/ui/EclipseMark';
import { ThemeToggleButton } from '@/shared/ui/ThemeToggleButton';
import { AppIconButton } from '@/shared/ui/AppButton';
import { MenuIcon } from '@/shared/ui/icons';
import styles from '@/widgets/top-bar/ui/TopBar.module.css';
import { Link } from '@tanstack/react-router';

type TopBarProps = {
  readonly isMobile: boolean;
  readonly onMenuClick: () => void;
};

export const TopBar = ({ isMobile, onMenuClick }: TopBarProps) => {
  return (
    <header className={styles['appBar']}>
      <div className={styles['toolbar']}>
        {isMobile && (
          <AppIconButton
            className={styles['menuButton']}
            onClick={onMenuClick}
            aria-label="Open navigation"
          >
            <MenuIcon />
          </AppIconButton>
        )}
        {/* The brand is the way home — the landing page is the one route not in the sidebar. */}
        <Link to="/" aria-label="Umbra — home" className={styles['brand']}>
          {/* The flat mark, not the mascot and not a moon phase: the bar says what the product is,
              and says the same thing the browser tab does. `MoonPhase` keeps its real job as a
              heading ornament — a lunar phase is a different drawing from an eclipse. */}
          <EclipseMark size={26} />
          {/* Not an <h1>: the page's own title owns that, and two leave no unique document heading. */}
          <span className={[styles['wordmark'], 'umbra-wordmark'].join(' ')}>Umbra</span>
          <span className={styles['pill']}>Playground</span>
        </Link>

        <div className={styles['spacer']} />

        <ThemeToggleButton />
      </div>
    </header>
  );
};
