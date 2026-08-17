import { useRef, type RefObject } from 'react';
import { useIsOverflowing } from '@/shared/lib/use-overflow';

/** What {@link useScrollRegion} puts on the container: the stop, its role, and its name. */
export type ScrollRegionProps =
  | { readonly tabIndex: 0; readonly role: 'region'; readonly 'aria-label': string }
  | Record<string, never>;

/**
 * The keyboard half of a scroll container, applied only while it overflows. A scroller with no
 * focusable child is keyboard-unreachable (WCAG 2.1.1); Chromium and Firefox add the Tab stop but
 * WebKit does not, so it is declared — `tabindex="0"`, `role="region"` and a name, the explicit
 * tabindex also being what makes the region visible to the library's focus scan.
 *
 * Userland on purpose: the scroller is the caller's markup and an engine-granted stop carries no
 * attribute a selector could name. Pair with `focusOnOpen` when the region sits first in the DOM,
 * or an overflowing dialog opens focused on its reading area.
 */
export function useScrollRegion<T extends HTMLElement>(
  label: string
): {
  readonly ref: RefObject<T | null>;
  readonly isOverflowing: boolean;
  readonly scrollbarWidth: number;
  readonly regionProps: ScrollRegionProps;
} {
  const ref = useRef<T | null>(null);
  const { isOverflowing, scrollbarWidth } = useIsOverflowing(ref);
  return {
    ref,
    isOverflowing,
    scrollbarWidth,
    regionProps: isOverflowing ? { tabIndex: 0, role: 'region', 'aria-label': label } : {},
  };
}
