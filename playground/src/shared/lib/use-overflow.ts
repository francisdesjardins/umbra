import { useEffect, useState, type RefObject } from 'react';

export type OverflowState = {
  readonly isOverflowing: boolean;
  /** Scrollbar width in pixels (0 when not overflowing or using overlay scrollbars). */
  readonly scrollbarWidth: number;
};

/**
 * Returns whether the given element is currently overflowing vertically,
 * along with the current scrollbar width in pixels.
 *
 * The implementation is deliberately light-weight and suitable for
 * message-modal/container use cases; it observes both the container itself
 * and the first child (typical when wrapping a `<Stack>` or similar) and
 * listens for scroll events. You can reuse this hook anywhere you need the
 * same boolean guard.  The caller is responsible for attaching the ref to a
 * scrollable element.
 */
export function useIsOverflowing<T extends HTMLElement = HTMLElement>(
  elRef: RefObject<T | null>
): OverflowState {
  const [state, setState] = useState<OverflowState>({
    isOverflowing: false,
    scrollbarWidth: 0,
  });

  useEffect(() => {
    const el = elRef.current;
    if (!el) {
      return;
    }

    const update = () => {
      const overflowing = el.scrollHeight > el.clientHeight;
      const sbWidth = overflowing ? el.offsetWidth - el.clientWidth : 0;
      setState((prev) => {
        if (prev.isOverflowing === overflowing && prev.scrollbarWidth === sbWidth) {
          return prev;
        }
        return { isOverflowing: overflowing, scrollbarWidth: sbWidth };
      });
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) {
      ro.observe(el.firstElementChild);
    }

    el.addEventListener('scroll', update);
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, [elRef]);

  return state;
}
