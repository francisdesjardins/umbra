import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { IconButton, type SxProps } from '@mui/material';
import { useTheme } from '@/app/providers/ThemeProvider/ThemeContext';

export type ThemeToggleButtonProps = {
  readonly sx?: SxProps | undefined;
};

export const ThemeToggleButton = ({ sx }: ThemeToggleButtonProps) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <IconButton
      onClick={toggleTheme}
      size="small"
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      sx={sx}
    >
      {isDarkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
    </IconButton>
  );
};
