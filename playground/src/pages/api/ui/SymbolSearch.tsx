import styles from '@/pages/api/ui/SymbolSearch.module.css';
import type { FuzzyMatch } from '@/shared/lib/fuzzy-match';
import { SearchIcon } from '@/shared/ui/icons';
import { useState } from 'react';
import { categoryHref, searchSymbols, symbolAnchor } from '../model/api-index';
import { KindBadge } from './KindBadge';
import { RouterLink } from './RouterLink';

/** Only the letters the query actually landed on — a typo hit reports no ranges and stays plain. */
const Highlight = ({
  text,
  ranges,
}: {
  readonly text: string;
  readonly ranges: FuzzyMatch['ranges'];
}) => {
  const pieces: { readonly text: string; readonly hit: boolean }[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) {
      pieces.push({ text: text.slice(cursor, start), hit: false });
    }
    pieces.push({ text: text.slice(start, end), hit: true });
    cursor = end;
  }
  pieces.push({ text: text.slice(cursor), hit: false });

  return (
    <>
      {pieces.map((piece, index) => {
        return (
          <span key={index} className={piece.hit ? styles['hit'] : undefined}>
            {piece.text}
          </span>
        );
      })}
    </>
  );
};

const RESULT_LIMIT = 14;

type SymbolSearchProps = {
  readonly placeholder?: string | undefined;
  /** Called after a result is picked — lets a container close itself. */
  readonly onNavigate?: (() => void) | undefined;
};

/**
 * Fuzzy symbol search, typo-tolerant so `usemodl` still finds `useModal`. Computed inline on every
 * keystroke: ninety names is nothing, and the React Compiler rules out memoising anyway.
 */
export const SymbolSearch = ({ placeholder, onNavigate }: SymbolSearchProps) => {
  const [query, setQuery] = useState('');
  const hits = searchSymbols(query);

  return (
    <div className={styles['root']}>
      <div className={styles['field']}>
        <SearchIcon className={styles['fieldIcon']} />
        <input
          type="text"
          className={styles['input']}
          value={query}
          placeholder={placeholder ?? 'Search symbols…'}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
      </div>

      {query.trim() !== '' && (
        <div className={styles['results']}>
          {hits.length === 0 && <p className={styles['empty']}>Nothing matches “{query}”.</p>}
          {hits.slice(0, RESULT_LIMIT).map((hit) => {
            return (
              <RouterLink
                key={hit.symbol.key}
                to={categoryHref(hit.symbol.category)}
                hash={symbolAnchor(hit.symbol.name)}
                onClick={() => {
                  setQuery('');
                  onNavigate?.();
                }}
                className={styles['row']}
              >
                <span className={styles['rowName']}>
                  <Highlight text={hit.symbol.name} ranges={hit.match.ranges} />
                </span>
                {/* Three bindings export `useModal`; without the specifier the rows are alike. */}
                <span className={styles['rowSpecifier']}>{hit.symbol.specifier}</span>
                <KindBadge kind={hit.symbol.kind} />
              </RouterLink>
            );
          })}
          {hits.length > RESULT_LIMIT && (
            <span className={styles['more']}>+{String(hits.length - RESULT_LIMIT)} more</span>
          )}
        </div>
      )}
    </div>
  );
};
