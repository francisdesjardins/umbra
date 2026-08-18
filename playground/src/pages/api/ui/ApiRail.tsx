import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type SxProps, type Theme } from '@mui/material/styles';
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

const CATEGORY_SX: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 1,
  px: 1,
  py: 0.5,
  borderRadius: 1,
  textDecoration: 'none',
  color: 'text.secondary',
  fontSize: '0.875rem',
  '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
};

const SYMBOL_SX: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.75,
  pl: 1,
  py: 0.25,
  ml: 1,
  borderLeft: 2,
  borderColor: 'divider',
  textDecoration: 'none',
  fontFamily: 'monospace',
  fontSize: '0.75rem',
  color: 'text.secondary',
  '&:hover': { color: 'accent.onSurface', borderColor: 'accent.onSurface' },
};

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
    <Stack component="nav" aria-label="API reference" sx={{ gap: 2 }}>
      <SymbolSearch />

      {SPECIFIERS.map((specifier) => {
        return (
          <Box key={specifier}>
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{
                display: 'block',
                px: 1,
                mb: 0.5,
                fontFamily: 'monospace',
                fontSize: '0.6875rem',
              }}
            >
              {specifier}
            </Typography>

            <Stack sx={{ gap: 0.25 }}>
              {categoriesFor(specifier).map((category) => {
                const isActive = category.id === activeCategory;
                return (
                  <Box key={category.id}>
                    <RouterLink
                      to={categoryHref(category.id)}
                      sx={{
                        ...CATEGORY_SX,
                        ...(isActive && { color: 'accent.onSurface', fontWeight: 700 }),
                      }}
                    >
                      <Box component="span" sx={{ flex: 1 }}>
                        {category.label}
                      </Box>
                      <Box component="span" sx={{ fontSize: '0.6875rem', color: 'text.disabled' }}>
                        {category.symbols.length}
                      </Box>
                    </RouterLink>

                    {isActive && (
                      <Stack sx={{ gap: 0, mt: 0.5, mb: 1 }}>
                        {category.symbols.map((symbol) => {
                          const isCurrent = symbol.name === activeSymbol;
                          return (
                            <RouterLink
                              key={symbol.name}
                              to={categoryHref(category.id)}
                              hash={symbolAnchor(symbol.name)}
                              sx={{
                                ...SYMBOL_SX,
                                ...(isCurrent && {
                                  color: 'accent.onSurface',
                                  borderColor: 'accent.onSurface',
                                  fontWeight: 700,
                                }),
                              }}
                            >
                              <Box
                                component="span"
                                sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}
                              >
                                {symbol.name}
                              </Box>
                              <KindBadge kind={symbol.kind} />
                            </RouterLink>
                          );
                        })}
                      </Stack>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        );
      })}

      <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>
        {String(
          CATEGORIES.reduce((total, category) => {
            return total + category.symbols.length;
          }, 0)
        )}{' '}
        exports, generated from the source.
      </Typography>
    </Stack>
  );
};
