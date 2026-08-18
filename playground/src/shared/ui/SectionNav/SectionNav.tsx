import styles from '@/shared/ui/SectionNav/SectionNav.module.css';
import { Link, useRouterState } from '@tanstack/react-router';

type SectionNavProps = {
  /** Section labels in page order. Each must match an `ExampleSection` title on the page. */
  readonly sections: readonly { readonly id: string; readonly label: string }[];
};

/**
 * Sticky jump bar for long pages — Test Stories runs to sixty-odd cards. The chips navigate through
 * the router rather than a bare `href="#id"`: under the hash-router build
 * (`yarn playground:build:file`, what ships to a static host) everything after `#` is the *route*,
 * so `#stacking` would replace `#/advanced` and land on the index page. Given both halves the
 * router emits `#/advanced` plus `#stacking` and scrolls — so API-reference links are `Link`s too.
 */
export const SectionNav = ({ sections }: SectionNavProps) => {
  const pathname = useRouterState({
    select: (state) => {
      return state.location.pathname;
    },
  });

  return (
    <nav aria-label="Jump to section" className={styles['nav']}>
      {sections.map((section) => {
        return (
          <Link key={section.id} to={pathname} hash={section.id} className={styles['chip']}>
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
};
