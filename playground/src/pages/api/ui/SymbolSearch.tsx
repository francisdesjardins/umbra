import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { type SxProps, type Theme } from '@mui/material/styles';
import { useState } from 'react';
import type { FuzzyMatch } from '@/shared/lib/fuzzy-match';
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
          <Box
            component="span"
            key={index}
            sx={piece.hit ? { color: 'accent.onSurface', fontWeight: 700 } : undefined}
          >
            {piece.text}
          </Box>
        );
      })}
    </>
  );
};

const RESULT_LIMIT = 14;

const ROW_SX: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  px: 1,
  py: 0.75,
  borderRadius: 1,
  textDecoration: 'none',
  color: 'text.primary',
  '&:hover': { bgcolor: 'action.hover' },
};

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
    <Stack sx={{ gap: 1 }}>
      <TextField
        size="small"
        fullWidth
        value={query}
        placeholder={placeholder ?? 'Search symbols…'}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="disabled" />
              </InputAdornment>
            ),
          },
        }}
      />

      {query.trim() !== '' && (
        <Stack sx={{ gap: 0.25 }}>
          {hits.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 0.5 }}>
              Nothing matches “{query}”.
            </Typography>
          )}
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
                sx={ROW_SX}
              >
                <Box
                  component="span"
                  sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', minWidth: 0, flex: 1 }}
                >
                  <Highlight text={hit.symbol.name} ranges={hit.match.ranges} />
                </Box>
                {/* Three bindings export `useModal`; without the specifier the rows are alike. */}
                <Box
                  component="span"
                  sx={{ fontFamily: 'monospace', fontSize: '0.6875rem', color: 'text.disabled' }}
                >
                  {hit.symbol.specifier}
                </Box>
                <KindBadge kind={hit.symbol.kind} />
              </RouterLink>
            );
          })}
          {hits.length > RESULT_LIMIT && (
            <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>
              +{String(hits.length - RESULT_LIMIT)} more
            </Typography>
          )}
        </Stack>
      )}
    </Stack>
  );
};
