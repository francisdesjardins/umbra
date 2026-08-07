import { ExampleGrid, ExampleSection } from '@/entities/example';
import { PageLayout } from '@/shared/ui/PageLayout';
import { SurfaceCard } from '@/shared/ui/SurfaceCard';
import { Box, CardContent, Stack, Typography } from '@mui/material';
import type { ApiCategory } from 'virtual:dialog-api';
import {
  SPECIFIERS,
  SYMBOLS,
  categoriesFor,
  categoryHref,
  categoryOf,
  symbolAnchor,
} from '../model/api-index';
import { ApiLayout } from './ApiLayout';
import { KindBadge } from './KindBadge';
import { RouterLink } from './RouterLink';

/** Four entry points into the library, for a reader who has not decided what they need yet. */
const START_HERE = ['useModal', 'useSlideModal', 'dialogManager', 'createStore'];

const CategoryCard = ({ category }: { readonly category: ApiCategory }) => {
  return (
    <RouterLink to={categoryHref(category.id)} sx={{ display: 'block' }}>
      <SurfaceCard interactive>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
          <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1 }}>
            <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 700, flex: 1 }}>
              {category.label}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {String(category.symbols.length)}
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            {category.blurb}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {category.symbols.slice(0, 4).map((symbol) => {
              return (
                <Typography
                  key={symbol.name}
                  variant="caption"
                  color="text.disabled"
                  sx={{ fontFamily: 'monospace' }}
                >
                  {symbol.name}
                </Typography>
              );
            })}
            {category.symbols.length > 4 && (
              <Typography variant="caption" color="text.disabled">
                +{String(category.symbols.length - 4)}
              </Typography>
            )}
          </Box>
        </CardContent>
      </SurfaceCard>
    </RouterLink>
  );
};

const StartHere = () => {
  return (
    <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
      {START_HERE.map((name) => {
        const category = categoryOf(name);
        const symbol = SYMBOLS.find((entry) => {
          return entry.name === name;
        });
        if (category === undefined || symbol === undefined) {
          return null;
        }
        return (
          <RouterLink
            key={name}
            to={categoryHref(category)}
            hash={symbolAnchor(name)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1.25,
              py: 0.75,
              borderRadius: 1.5,
              border: 1,
              borderColor: 'divider',
              textDecoration: 'none',
              fontFamily: 'monospace',
              fontSize: '0.8125rem',
              color: 'text.primary',
              transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
            }}
          >
            {name}
            <KindBadge kind={symbol.kind} />
          </RouterLink>
        );
      })}
    </Stack>
  );
};

/**
 * The reference's front door.
 *
 * It answers three questions before any symbol does: what the package exports, where each
 * export lives, and what counts as public — which is simply everything on these pages.
 */
export const ApiIndexPage = () => {
  return (
    <PageLayout
      title="API Reference"
      description="Generated from the source by typedoc and rendered with this site's own components, so the reference and the examples read as one document. It regenerates whenever the library changes."
    >
      <ApiLayout>
        <Stack sx={{ gap: 4 }}>
          <Stack sx={{ gap: 1.5 }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.1em' }}>
              Start here
            </Typography>
            <StartHere />
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640 }}>
              These pages are the whole public surface: {String(SYMBOLS.length)} exports across{' '}
              {String(SPECIFIERS.length)} entry points. Anything internal is excluded from the
              generator, so if a name is not here it is not something the package promises — a type
              mentioned in a signature without a link is an internal shape you never have to name
              yourself.
            </Typography>
          </Stack>

          {SPECIFIERS.map((specifier) => {
            return (
              <ExampleSection
                key={specifier}
                title={specifier.endsWith('/react') ? 'React binding' : 'Core'}
                description={
                  specifier.endsWith('/react')
                    ? `${specifier} — hooks, the outlet and the React-flavoured store access. It re-exports the core, so a React app imports from this path only.`
                    : `${specifier} — the framework-agnostic core. Resolves and runs with React absent entirely.`
                }
              >
                <ExampleGrid columns={2}>
                  {categoriesFor(specifier).map((category) => {
                    return <CategoryCard key={category.id} category={category} />;
                  })}
                </ExampleGrid>
              </ExampleSection>
            );
          })}
        </Stack>
      </ApiLayout>
    </PageLayout>
  );
};
