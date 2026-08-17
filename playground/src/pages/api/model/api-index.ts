import { fuzzyRank, type FuzzyMatch } from '@/shared/lib/fuzzy-match';
import apiModel, { type ApiCategory, type ApiSymbol } from 'virtual:dialog-api';

export const CATEGORIES: readonly ApiCategory[] = apiModel;

export const SYMBOLS: readonly ApiSymbol[] = CATEGORIES.flatMap((category) => {
  return category.symbols;
});

/**
 * The only symbol-to-route mapping, keyed `specifier#name`: a symbol changing category relinks all
 * cross-references, and a bare name (three bindings export `useModal`) misses and renders as code.
 */
const BY_KEY = new Map(
  SYMBOLS.map((symbol) => {
    return [symbol.key, symbol];
  })
);

export const symbolFor = (key: string) => {
  return BY_KEY.get(key);
};

/** A symbol by specifier and name, for callers holding no key — the plugin owns the key format. */
export const symbolAt = (specifier: string, name: string) => {
  return SYMBOLS.find((symbol) => {
    return symbol.specifier === specifier && symbol.name === name;
  });
};

/** The only place a reference URL is spelled. A symbol adds its anchor as the link's hash. */
export const categoryHref = (categoryId: string) => {
  return `/api/${categoryId}`;
};

/** Bare name, not the key: one specifier per category makes it unique, and it stays guessable. */
export const symbolAnchor = (symbolName: string) => {
  return `api-${symbolName}`;
};

export const findCategory = (id: string) => {
  return CATEGORIES.find((category) => {
    return category.id === id;
  });
};

/** Entry-point specifiers in reading order — the core first, then the bindings over it. */
export const SPECIFIERS: readonly string[] = [
  ...new Set(
    CATEGORIES.map((category) => {
      return category.specifier;
    })
  ),
];

export const categoriesFor = (specifier: string) => {
  return CATEGORIES.filter((category) => {
    return category.specifier === specifier;
  });
};

/** The neighbours of a category, for the "next page" links at the end of one. */
export const neighboursOf = (id: string) => {
  const index = CATEGORIES.findIndex((category) => {
    return category.id === id;
  });
  return { previous: CATEGORIES[index - 1], next: CATEGORIES[index + 1] };
};

export type SymbolHit = { readonly symbol: ApiSymbol; readonly match: FuzzyMatch };

/** Names only: summaries return half of ninety for "modal"; {@link fuzzyRank} handles typos. */
export const searchSymbols = (query: string): readonly SymbolHit[] => {
  if (query.trim() === '') {
    return [];
  }
  return fuzzyRank(query, {
    items: SYMBOLS,
    key: (symbol) => {
      return symbol.name;
    },
  }).map((entry) => {
    return { symbol: entry.item, match: entry.match };
  });
};
