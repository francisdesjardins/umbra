import { PageLayout } from '@/shared/ui/PageLayout';
import { SurfaceCard } from '@/shared/ui/SurfaceCard';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Box, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useParams } from '@tanstack/react-router';
import type { ApiCategory } from 'virtual:dialog-api';
import { categoryHref, findCategory, neighboursOf } from '../model/api-index';
import { useActiveSymbol, useHashScroll } from '../model/use-api-scroll';
import { ApiLayout } from './ApiLayout';
import { RouterLink } from './RouterLink';
import { CodeLine } from './Signature';
import { SymbolArticle } from './SymbolArticle';

/** The line you would paste to use this page — values as an import, types as `import type`. */
const ImportLine = ({ category }: { readonly category: ApiCategory }) => {
  const values = category.symbols.filter((symbol) => {
    return symbol.kind !== 'type';
  });
  const named = values.length > 0 ? values : category.symbols;
  const shown = named.slice(0, 4).map((symbol) => {
    return symbol.name;
  });
  const rest = named.length - shown.length;

  return (
    <CodeLine>
      {values.length === 0 ? 'import type { ' : 'import { '}
      {shown.join(', ')}
      {rest > 0 ? `, /* +${String(rest)} */ ` : ' '}
      {`} from '${category.specifier}';`}
    </CodeLine>
  );
};

const CategoryStep = ({
  category,
  direction,
}: {
  readonly category: ApiCategory;
  readonly direction: 'previous' | 'next';
}) => {
  return (
    <RouterLink
      to={categoryHref(category.id)}
      sx={{ display: 'block', flex: '1 1 200px', minWidth: 0 }}
    >
      <SurfaceCard interactive>
        <CardContent>
          <Stack
            direction="row"
            sx={{
              gap: 1,
              alignItems: 'center',
              justifyContent: direction === 'next' ? 'flex-end' : 'flex-start',
            }}
          >
            {direction === 'previous' && <ArrowBackIcon fontSize="small" color="disabled" />}
            <Box sx={{ textAlign: direction === 'next' ? 'right' : 'left', minWidth: 0 }}>
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                {direction === 'previous' ? 'Previous' : 'Next'}
              </Typography>
              <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
                {category.label}
              </Typography>
            </Box>
            {direction === 'next' && <ArrowForwardIcon fontSize="small" color="disabled" />}
          </Stack>
        </CardContent>
      </SurfaceCard>
    </RouterLink>
  );
};

/** One chapter of the reference: everything you need for one job, in the order you need it. */
export const ApiCategoryPage = () => {
  const { category: categoryId } = useParams({ from: '/api/$category' });
  const category = findCategory(categoryId);
  const activeSymbol = useActiveSymbol(categoryId);
  useHashScroll();

  if (category === undefined) {
    return (
      <PageLayout
        title="Not in the reference"
        description={`No API page is called “${categoryId}”.`}
      >
        <ApiLayout>
          <RouterLink to="/api" sx={{ color: 'primary.main' }}>
            Back to the API reference
          </RouterLink>
        </ApiLayout>
      </PageLayout>
    );
  }

  const { previous, next } = neighboursOf(category.id);

  return (
    <PageLayout
      title={category.label}
      description={category.blurb}
      actions={
        <Chip
          size="small"
          variant="outlined"
          label={category.specifier}
          sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
        />
      }
    >
      <ApiLayout activeCategory={category.id} activeSymbol={activeSymbol}>
        <Stack sx={{ gap: 2.5 }}>
          <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
            <RouterLink to="/api" sx={{ color: 'primary.main', fontSize: '0.875rem' }}>
              API Reference
            </RouterLink>
            <Typography variant="body2" color="text.disabled">
              ›
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {category.label}
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ ml: 'auto' }}>
              {String(category.symbols.length)} exports
            </Typography>
          </Stack>

          <ImportLine category={category} />

          {category.symbols.map((symbol) => {
            return <SymbolArticle key={symbol.name} symbol={symbol} />;
          })}

          <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap', mt: 1 }}>
            {previous !== undefined && <CategoryStep category={previous} direction="previous" />}
            {next !== undefined && <CategoryStep category={next} direction="next" />}
          </Stack>
        </Stack>
      </ApiLayout>
    </PageLayout>
  );
};
