import styles from '@/pages/api/ui/ApiRail.module.css';
import {
  CATEGORIES,
  SPECIFIERS,
  categoriesFor,
  categoryHref,
  symbolAnchor,
} from '../model/api-index';
import { KindBadge } from './KindBadge';
import { RouterLink } from './RouterLink';
import { SymbolSearch } from './SymbolSearch';

type ApiRailProps = {
  readonly activeCategory?: string | undefined;
  /** The symbol currently under the reader, from the page's scroll spy. */
  readonly activeSymbol?: string | null | undefined;
};

/**
 * The reference's table of contents: search, then the ten pages, with only the open one unfolded to
 * its symbols — ninety monospace names in one column is the flat list this page was split to avoid.
 */
export const ApiRail = ({ activeCategory, activeSymbol }: ApiRailProps) => {
  return (
    <nav aria-label="API reference" className={styles['rail']}>
      <SymbolSearch />

      {SPECIFIERS.map((specifier) => {
        return (
          <div key={specifier}>
            <span className={styles['specifier']}>{specifier}</span>

            <div className={styles['categories']}>
              {categoriesFor(specifier).map((category) => {
                const isActive = category.id === activeCategory;
                return (
                  <div key={category.id}>
                    <RouterLink
                      to={categoryHref(category.id)}
                      className={
                        isActive
                          ? `${styles['category']} ${styles['categoryActive']}`
                          : styles['category']
                      }
                    >
                      <span className={styles['categoryLabel']}>{category.label}</span>
                      <span className={styles['categoryCount']}>{category.symbols.length}</span>
                    </RouterLink>

                    {isActive && (
                      <div className={styles['symbols']}>
                        {category.symbols.map((symbol) => {
                          const isCurrent = symbol.name === activeSymbol;
                          return (
                            <RouterLink
                              key={symbol.name}
                              to={categoryHref(category.id)}
                              hash={symbolAnchor(symbol.name)}
                              className={
                                isCurrent
                                  ? `${styles['symbol']} ${styles['symbolCurrent']}`
                                  : styles['symbol']
                              }
                            >
                              <span className={styles['symbolName']}>{symbol.name}</span>
                              <KindBadge kind={symbol.kind} />
                            </RouterLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <span className={styles['footer']}>
        {String(
          CATEGORIES.reduce((total, category) => {
            return total + category.symbols.length;
          }, 0)
        )}{' '}
        exports, generated from the source.
      </span>
    </nav>
  );
};
