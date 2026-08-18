import { AppIconButton } from '@/shared/ui/AppButton';
import { DarkModeIcon, LightModeIcon } from '@/shared/ui/icons';
import styles from '@/shared/ui/ThemeToggleButton/ThemeToggleButton.module.css';
import { useTheme } from '@/shared/lib/theme-context';

export const ThemeToggleButton = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <AppIconButton
      onClick={toggleTheme}
      size="small"
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className={styles['toggle']}
    >
      {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
    </AppIconButton>
  );
};
