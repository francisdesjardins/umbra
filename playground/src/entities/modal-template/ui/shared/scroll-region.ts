import { useRef, type RefObject } from 'react';
import { useIsOverflowing } from '@/shared/lib/use-overflow';

/** What {@link useScrollRegion} puts on the container: the stop, its role, and its name. */
export type ScrollRegionProps =
  | { readonly tabIndex: 0; readonly role: 'region'; readonly 'aria-label': string }
  | Record<string, never>;

/**
 * The keyboard half of a designated scroll container, applied only while it actually scrolls.
 *
 * A scrollable region with no focusable child is unreachable from the keyboard — arrow keys
 * scroll whatever holds focus, and nothing inside this can hold it. That is WCAG 2.1.1, and the
 * reason Chromium and Firefox now put such scrollers in the tab order on their own; WebKit does
 * not, so relying on the engines leaves the text unscrollable on one of the three. Declaring it
 * is the documented pattern — `tabindex="0"`, `role="region"`, an accessible name — and the name
 * is what turns the stop from an anonymous block of text into something a screen reader can
 * announce.
 *
 * Conditional on real overflow, so a panel whose content fits adds no stop at all — the stop
 * exists exactly when there is something to scroll to.
 *
 * Deliberately not the library's: the scroller is the caller's markup, and a selector cannot
 * name an engine-granted stop (it carries no attribute), so the core could neither apply nor
 * detect this. The explicit `tabindex` is also what plugs the pattern into the core's own focus
 * scan — the region becomes a legitimate destination for the Tab wrap, the recovery and the
 * reclaim floor, which an engine-implicit stop never would be.
 *
 * **Pair it with `focusOnOpen` when the region sits first.** A content area usually precedes the
 * footer in the DOM, so once it overflows it is the first focusable and `showModal()` opens the
 * dialog focused on the reading area rather than a control. The APG accepts either; if the
 * control is where your opening belongs, say so — `action('…', { focusOnOpen: true })` is the
 * lever, and the slide presets' command palette is the worked example.
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
