import { useRef, type RefObject } from 'react';
import { useIsOverflowing } from '@/shared/lib/use-overflow';

/** What {@link useScrollRegion} puts on the container: the stop, its role, and its name. */
export type ScrollRegionProps =
  | { readonly tabIndex: 0; readonly role: 'region'; readonly 'aria-label': string }
  | Record<string, never>;

/**
 * The keyboard half of a designated scroll container, applied only while it actually overflows.
 *
 * A scroller with no focusable child is keyboard-unreachable (WCAG 2.1.1). Chromium and Firefox
 * add the Tab stop themselves; WebKit does not — so the norm is to declare it: `tabindex="0"`,
 * `role="region"`, and a name that makes the stop announce as more than a block of text. The
 * explicit tabindex is also what makes the region a destination the library's focus scan can see.
 *
 * Userland on purpose: the scroller is the caller's markup, and an engine-granted stop carries no
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
