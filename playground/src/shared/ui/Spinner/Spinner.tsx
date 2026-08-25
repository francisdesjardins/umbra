import styles from '@/shared/ui/Spinner/Spinner.module.css';

/**
 * The shell's one busy indicator. It exists because the same fifteen lines were written five times
 * and every copy was inert: `<animateTransform>` sat as a sibling of the arc, under the `<svg>`,
 * where it animates a transform the root element does not take.
 *
 * Draws on `currentColor`, so a caller colours it by setting `color`. `aria-hidden` because the
 * control or region around it is what announces the state — a spinner that names itself competes
 * with the `role="status"` above it.
 *
 * The templates under `entities/dialog-template/` keep their own copy on purpose: they are lifted
 * into other people's projects and may not reach into `shared/`.
 */
export function Spinner({ size = 18 }: { readonly size?: number | undefined }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden style={{ width: size, height: size, flexShrink: 0 }}>
      <circle
        className={styles['arc']}
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="42 18"
      />
    </svg>
  );
}
