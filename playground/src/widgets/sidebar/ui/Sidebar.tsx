import {
  HubIcon,
  LocalFireDepartmentIcon,
  MenuBookIcon,
  PaletteIcon,
  PlayArrowIcon,
  ScienceIcon,
  SettingsIcon,
  TuneIcon,
  ViewSidebarIcon,
  WidgetsIcon,
} from '@/shared/ui/icons';
import styles from '@/widgets/sidebar/ui/Sidebar.module.css';
import { Link, useRouterState } from '@tanstack/react-router';
import type { ComponentType, SVGProps } from 'react';
import { useEffect } from 'react';

const SIDEBAR_WIDTH = 232;

type NavItem = {
  readonly path: string;
  readonly label: string;
  readonly icon: ComponentType<SVGProps<SVGSVGElement>>;
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

const NavGroups = ({
  currentPath,
  onNavigate,
}: {
  readonly currentPath: string;
  readonly onNavigate: (() => void) | undefined;
}) => {
  return (
    <div className={styles['nav']}>
      {NAV_GROUPS.map((group) => {
        return (
          <nav key={group.label} aria-label={group.label}>
            <span className={styles['groupLabel']}>{group.label}</span>
            <ul className={styles['list']}>
              {group.items.map((item) => {
                // `/api/…` has a page per category, so its entry stays lit on those too.
                const isActive =
                  currentPath === item.path || currentPath.startsWith(`${item.path}/`);
                const Icon = item.icon;

                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={onNavigate}
                      aria-current={isActive ? 'page' : undefined}
                      className={[styles['item'], isActive ? styles['itemSelected'] : '']
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <span className={styles['itemIcon']}>
                        <Icon />
                      </span>
                      {/* One weight throughout: 400→600 on select re-measures every glyph, so the
                          label re-spaces under the pointer mid-click. The fill already says which. */}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        );
      })}
    </div>
  );
};

export const Sidebar = ({ isMobile, mobileOpen, onClose }: SidebarProps) => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // The overlay answers Escape the way the modal drawer it replaces did.
  useEffect(() => {
    if (!isMobile || !mobileOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobile, mobileOpen, onClose]);

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          aria-label="Close navigation"
          tabIndex={mobileOpen ? 0 : -1}
          className={[styles['backdrop'], mobileOpen ? styles['backdropOpen'] : '']
            .filter(Boolean)
            .join(' ')}
          onClick={onClose}
        />
        <aside
          className={[
            styles['panel'],
            styles['panelMobile'],
            mobileOpen ? styles['panelMobileOpen'] : '',
          ]
            .filter(Boolean)
            .join(' ')}
          // `inert`, not `aria-hidden`: the closed panel still holds tabbable links, and hiding
          // it from readers while leaving it in the tab order is the worse half of the bug.
          inert={mobileOpen ? undefined : true}
        >
          <div className={styles['toolbarSpacer']} />
          <NavGroups currentPath={currentPath} onNavigate={onClose} />
        </aside>
      </>
    );
  }

  return (
    <aside className={styles['placeholder']}>
      <div className={styles['panel']}>
        <div className={styles['toolbarSpacer']} />
        <NavGroups currentPath={currentPath} onNavigate={undefined} />
      </div>
    </aside>
  );
};

export { SIDEBAR_WIDTH };
