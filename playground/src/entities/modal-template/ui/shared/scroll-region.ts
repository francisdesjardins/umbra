import { useRef, type RefObject } from 'react';
import { useIsOverflowing } from '@/shared/lib/use-overflow';
import { focusRingRoom } from '@/entities/modal-template/ui/shared/tokens';

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
 *
 * It also hands back `regionSx`, because a scroll container clips at its padding box and the theme
 * draws focus 4px *outside* a control: a button flush to the edge keeps part of its ring and loses
 * the rest. Reserving that room belongs here for the same reason the Tab stop does — both follow
 * from the box clipping, and a container that took one and not the other is the defect.
 */
export function useScrollRegion<T extends HTMLElement>(
  label: string
): {
  readonly ref: RefObject<T | null>;
  readonly isOverflowing: boolean;
  readonly scrollbarWidth: number;
  readonly regionProps: ScrollRegionProps;
  readonly regionSx: typeof focusRingRoom;
} {
  const ref = useRef<T | null>(null);
  const { isOverflowing, scrollbarWidth } = useIsOverflowing(ref);
  return {
    ref,
    isOverflowing,
    scrollbarWidth,
    regionProps: isOverflowing ? { tabIndex: 0, role: 'region', 'aria-label': label } : {},
    // Unconditional, unlike `regionProps`: a control inside can be focused whether or not the
    // region currently scrolls, and the clip is there either way.
    regionSx: focusRingRoom,
  };
}
