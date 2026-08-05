import type { CSSProperties, ReactNode } from 'react';

export type ContentTransitionProps = {
  /** Show the fallback instead of the children. */
  readonly pending: boolean;
  /** What to show while `pending` — React's word for it, and the same idea. */
  readonly fallback: ReactNode;
  readonly children: ReactNode;
  readonly duration?: number | undefined;
};

/**
 * Crossfade between a fallback and the real content using CSS opacity transitions.
 *
 * Both layers are placed in the same grid cell so they overlap naturally
 * without absolute positioning — avoids layout collapse and overflow issues.
 *
 * `pending` rather than `loading`: this component has no idea *why* the content is not ready,
 * and the modal's own flag it usually reads (`isPreparing`) is not about data either. It is
 * also not `transitioning` — that would name the animation, which runs when this flips, not
 * while it is true.
 */
export function ContentTransition({
  pending,
  fallback,
  children,
  duration = 250,
}: ContentTransitionProps) {
  const transition = `opacity ${String(duration)}ms ease`;

  const gridCell: CSSProperties = {
    gridArea: '1 / 1',
    transition,
  };

  return (
    <div style={{ display: 'grid' }}>
      <div
        style={{
          ...gridCell,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pending ? 1 : 0,
          pointerEvents: pending ? 'auto' : 'none',
        }}
      >
        {fallback}
      </div>
      <div
        style={{
          ...gridCell,
          opacity: pending ? 0 : 1,
          pointerEvents: pending ? 'none' : 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}
