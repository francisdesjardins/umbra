import { useEffect, useRef, useState } from 'react';
import styles from '@/entities/dialog-template/ui/vanilla/shared/content/styles.module.css';

type OverflownTypographyProps = {
  /** A string, not a node — the full text doubles as the native `title` when truncated. */
  readonly children: string;
  readonly id?: string | undefined;
};

/**
 * Text that ellipsis-truncates when horizontal space runs out, exposing the full string as a
 * native `title` only while actually truncated. Needs a width-constrained parent; the `content`
 * slot of `PanelDialog.HeaderActionLayout` is one.
 *
 * The `title` attribute only surfaces on mouse hover — keyboard and touch users never see it.
 * That is the platform's ceiling without a tooltip implementation, which a vanilla template
 * refuses to ship; if the truncated text is load-bearing, put the full string somewhere always
 * readable instead of relying on this affordance.
 */
export function OverflownTypography({ children, id }: OverflownTypographyProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setIsOverflowing(el.scrollWidth > el.clientWidth);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <span
      id={id}
      ref={ref}
      className={styles['overflownText']}
      {...(isOverflowing && { title: children })}
    >
      {children}
    </span>
  );
}
