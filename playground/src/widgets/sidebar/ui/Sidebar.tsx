import PaletteIcon from '@mui/icons-material/Palette';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScienceIcon from '@mui/icons-material/Science';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import WidgetsIcon from '@mui/icons-material/Widgets';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import { Link, useRouterState } from '@tanstack/react-router';
import type { SvgIconComponent } from '@mui/icons-material';

const SIDEBAR_WIDTH = 232;

type NavItem = {
  readonly path: string;
  readonly label: string;
  readonly icon: SvgIconComponent;
};

type NavGroup = {
  readonly label: string;
  readonly items: readonly NavItem[];
};

/**
 * Grouped so the seven routes read as a path rather than a flat list: learn the core loop,
 * then the patterns built on it, then the copy-paste reference, then the test harnesses.
 */
const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Learn',
    items: [
      { path: '/getting-started', label: 'Getting Started', icon: PlayArrowIcon },
      { path: '/modal-actions', label: 'Modal Actions', icon: SettingsIcon },
    ],
  },
  {
    label: 'Patterns',
    items: [
      { path: '/slide-modal', label: 'Slide Modals', icon: ViewSidebarIcon },
      { path: '/advanced', label: 'Advanced', icon: TuneIcon },
    ],
  },
  {
    label: 'Reference',
    items: [
      { path: '/ui-integrations', label: 'UI Integrations', icon: PaletteIcon },
      { path: '/ui-templates', label: 'UI Templates', icon: WidgetsIcon },
      { path: '/api', label: 'API Reference', icon: MenuBookIcon },
    ],
  },
  {
    label: 'Testing',
    items: [{ path: '/stories', label: 'Test Harnesses', icon: ScienceIcon }],
  },
];

type SidebarProps = {
  readonly isMobile: boolean;
  readonly mobileOpen: boolean;
  readonly onClose: () => void;
};

const GroupLabel = ({ label }: { readonly label: string }) => {
  return (
    <Typography
      variant="caption"
      color="text.disabled"
      sx={{
        px: 2,
        display: 'block',
        mb: 0.5,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 600,
      }}
    >
      {label}
    </Typography>
  );
};

export const Sidebar = ({ isMobile, mobileOpen, onClose }: SidebarProps) => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? mobileOpen : undefined}
      onClose={isMobile ? onClose : undefined}
      ModalProps={isMobile ? { keepMounted: true } : undefined}
      sx={{
        ...(!isMobile && { width: SIDEBAR_WIDTH, flexShrink: 0 }),
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
        },
      }}
    >
      <Toolbar sx={{ height: 64 }} />
      <Box sx={{ overflow: 'auto', py: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {NAV_GROUPS.map((group) => {
          return (
            <Box key={group.label} component="nav" aria-label={group.label}>
              <GroupLabel label={group.label} />
              <List disablePadding>
                {group.items.map((item) => {
                  // The API reference has a page per category under `/api/…`, so its nav entry
                  // stays lit on those too. Every other route is a single page.
                  const isActive =
                    currentPath === item.path || currentPath.startsWith(`${item.path}/`);
                  const Icon = item.icon;

                  return (
                    <ListItemButton
                      key={item.path}
                      component={Link}
                      to={item.path}
                      selected={isActive}
                      onClick={isMobile ? onClose : undefined}
                      sx={{
                        mx: 1,
                        mb: 0.5,
                        borderRadius: 1,
                        '&.Mui-selected': {
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          '&:hover': { bgcolor: 'primary.dark' },
                          '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Icon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        slotProps={{
                          // One weight for every entry, on purpose. Switching the selected one from
                          // 400 to 600 re-measures every glyph in its label, so the text re-spaces
                          // at the moment the entry becomes current — the release of the click that
                          // selected it, which reads as the menu twitching under the pointer. The
                          // filled background already says which one you are on.
                          primary: { variant: 'body2' },
                        }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          );
        })}
      </Box>
    </Drawer>
  );
};

export { SIDEBAR_WIDTH };
