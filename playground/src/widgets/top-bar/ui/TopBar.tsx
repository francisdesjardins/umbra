import { MoonPhase } from '@/shared/ui/MoonPhase';
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
          <div className={styles['badge']}>
            {/* The umbra is the total-shadow core of an eclipse — what a modal backdrop casts. Same
                badge geometry as the sibling stardust playground, so the two read as a set. 20px is
                what the theme toggle's small icon resolves to beside it, and both badges are 32px,
                so the two ends of the bar read as the same weight; a size, not a font size, so it
                holds in every font. */}
            <MoonPhase phase="first-quarter" size={20} />
          </div>
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
