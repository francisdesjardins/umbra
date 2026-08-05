import { useRouterState } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { findCategory } from './api-index';

const ANCHOR_PREFIX = 'api-';

/**
 * Scroll to the symbol named in the URL.
 *
 * Cross-references are router links carrying a hash, so arriving at a category page is
 * routinely a request for one entry two thirds of the way down it.
 */
export const useHashScroll = () => {
  const hash = useRouterState({
    select: (state) => {
      return state.location.hash;
    },
  });

  useEffect(() => {
    if (hash === '') {
      return;
    }
    document.getElementById(hash)?.scrollIntoView({ block: 'start' });
  }, [hash]);
};

/**
 * Which symbol the reader is currently on, for the rail.
 *
 * The bottom margin keeps the answer to the top third of the viewport — without it every
 * short entry below the fold counts as "current" and the highlight runs ahead of the reader.
 */
export const useActiveSymbol = (categoryId: string) => {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const symbols = findCategory(categoryId)?.symbols ?? [];
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const name = entry.target.id.slice(ANCHOR_PREFIX.length);
          if (entry.isIntersecting) {
            visible.add(name);
          } else {
            visible.delete(name);
          }
        }
        const first = symbols.find((symbol) => {
          return visible.has(symbol.name);
        });
        if (first !== undefined) {
          setActive(first.name);
        }
      },
      { rootMargin: '-88px 0px -60% 0px' }
    );

    for (const symbol of symbols) {
      const element = document.getElementById(`${ANCHOR_PREFIX}${symbol.name}`);
      if (element !== null) {
        observer.observe(element);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [categoryId]);

  return active;
};
