import { fuzzyRank, type FuzzyMatch } from '@/shared/lib/fuzzy-match';
import apiModel, { type ApiCategory, type ApiSymbol } from 'virtual:dialog-api';

export const CATEGORIES: readonly ApiCategory[] = apiModel;

export const SYMBOLS: readonly ApiSymbol[] = CATEGORIES.flatMap((category) => {
  return category.symbols;
});

/**
 * Where each symbol is rendered.
 *
 * Every cross-reference on the site — a `{@link}` in a doc comment, a type name inside a
 * printed signature — is a symbol name that has to become a route. This is the only place
 * that mapping exists, so a symbol moving between categories relinks the whole reference.
 */
const CATEGORY_BY_SYMBOL = new Map(
  SYMBOLS.map((symbol) => {
    return [symbol.name, symbol.category];
  })
);

export const categoryOf = (symbolName: string) => {
  return CATEGORY_BY_SYMBOL.get(symbolName);
};

/** The only place a reference URL is spelled. A symbol adds its anchor as the link's hash. */
export const categoryHref = (categoryId: string) => {
  return `/api/${categoryId}`;
};

/** The anchor a symbol answers to, everywhere on the site. */
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

/**
 * Fuzzy search over symbol names.
 *
 * Names only, deliberately: a summary-wide search on ninety symbols returns half of them for
 * a word like "modal", and a reference page is something you search by the name you half
 * remember. Typos are the matcher's job — see {@link fuzzyRank}.
 */
export const searchSymbols = (query: string): readonly SymbolHit[] => {
  if (query.trim() === '') {
    return [];
  }
  return fuzzyRank(query, SYMBOLS, (symbol) => {
    return symbol.name;
  }).map((entry) => {
    return { symbol: entry.item, match: entry.match };
  });
};
