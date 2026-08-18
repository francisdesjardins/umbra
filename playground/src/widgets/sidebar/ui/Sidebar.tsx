import PaletteIcon from '@mui/icons-material/Palette';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScienceIcon from '@mui/icons-material/Science';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import WidgetsIcon from '@mui/icons-material/Widgets';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import HubIcon from '@mui/icons-material/Hub';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Link, useRouterState } from '@tanstack/react-router';
import type { ComponentType } from 'react';

const SIDEBAR_WIDTH = 232;

type NavItem = {
  readonly path: string;
  readonly label: string;
  // What an `@mui/icons-material/<Name>` module exports, named without the icons barrel — the one
  // specifier here is per-icon, so the whole 7000-module index stays out of the graph.
  readonly icon: ComponentType<SvgIconProps>;
};

type NavGroup = {
  readonly label: string;
  readonly items: readonly NavItem[];
};

/** Grouped so the routes read as a path: core loop, patterns on it, reference, harnesses. */
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
      { path: '/microfrontends', label: 'Microfrontends', icon: HubIcon },
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
    items: [
      { path: '/stories', label: 'Test Harnesses', icon: ScienceIcon },
      // Deliberately last and deliberately empty — a scratch surface, not a tenth demonstration.
      { path: '/warzone', label: 'Warzone', icon: LocalFireDepartmentIcon },
    ],
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
                  // `/api/…` has a page per category, so its entry stays lit on those too.
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
                          // Brighter, not deeper: `primary.dark` under this fill's dark ink is 2.5:1.
                          '&:hover': { bgcolor: 'primary.light' },
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
                          // One weight throughout: 400→600 on select re-measures every glyph, so the
                          // label re-spaces under the pointer mid-click. The fill already says which.
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
