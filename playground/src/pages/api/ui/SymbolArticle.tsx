import { CodeBlock } from '@/shared/ui/CodeBlock/CodeBlock';
import { SurfaceCard } from '@/shared/ui/SurfaceCard';
import LinkIcon from '@mui/icons-material/Link';
import { Box, CardContent, Stack, Typography, type Theme } from '@mui/material';
import type { ApiSymbol } from 'virtual:dialog-api';
import { categoryHref, symbolAnchor } from '../model/api-index';
import { DocProse } from './DocText';
import { KindBadge } from './KindBadge';
import { MemberList, MemberListLabel } from './MemberList';
import { RouterLink } from './RouterLink';
import { Signature } from './Signature';

const Remarks = ({ symbol }: { readonly symbol: ApiSymbol }) => {
  if (symbol.remarks.length === 0) {
    return null;
  }
  return (
    <Box
      sx={{
        borderLeft: 3,
        borderColor: (theme: Theme) => {
          return theme.palette.divider;
        },
        pl: 2,
        py: 0.5,
      }}
    >
      <DocProse parts={symbol.remarks} variant="body2" color="text.secondary" />
    </Box>
  );
};

/**
 * One entry in the order a reader needs it: name, signature, summary, then detail. Members are
 * titled "Props" for a component, since typedoc's destructured parameter is the props object.
 */
export const SymbolArticle = ({ symbol }: { readonly symbol: ApiSymbol }) => {
  return (
    <Box id={symbolAnchor(symbol.name)} sx={{ scrollMarginTop: 88 }}>
      <SurfaceCard>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack sx={{ gap: 2 }}>
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
              <Typography
                variant="h6"
                component="h3"
                sx={{ fontFamily: 'monospace', fontWeight: 700, overflowWrap: 'anywhere' }}
              >
                {symbol.name}
              </Typography>
              <KindBadge kind={symbol.kind} />
              <RouterLink
                to={categoryHref(symbol.category)}
                hash={symbolAnchor(symbol.name)}
                aria-label={`Link to ${symbol.name}`}
                sx={{
                  display: 'flex',
                  color: 'text.disabled',
                  '&:hover': { color: 'accent.onSurface' },
                }}
              >
                <LinkIcon fontSize="small" />
              </RouterLink>
            </Stack>

            <Signature parts={symbol.signature} />

            <DocProse parts={symbol.summary} />
            <Remarks symbol={symbol} />

            <MemberList title="Type parameters" members={symbol.typeParams} />
            <MemberList title="Parameters" members={symbol.params} />
            <MemberList
              title={symbol.kind === 'function' ? 'Props' : 'Properties'}
              members={symbol.members}
            />

            {symbol.returns.length > 0 && (
              <Box>
                <MemberListLabel>Returns</MemberListLabel>
                <DocProse parts={symbol.returns} variant="body2" color="text.secondary" />
              </Box>
            )}

            {symbol.examples.map((example, index) => {
              return (
                <Box key={index}>
                  <MemberListLabel>
                    {symbol.examples.length > 1 ? `Example ${String(index + 1)}` : 'Example'}
                  </MemberListLabel>
                  {/* No height cap: a nested scrollbar hides the end of a twenty-line example. */}
                  <Box
                    sx={{
                      borderRadius: 1.5,
                      overflow: 'hidden',
                      border: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <CodeBlock code={example} language="tsx" wrap />
                  </Box>
                </Box>
              );
            })}

            {symbol.see.length > 0 && (
              <Box>
                <MemberListLabel>See also</MemberListLabel>
                {symbol.see.map((entry, index) => {
                  return (
                    <DocProse key={index} parts={entry} variant="body2" color="text.secondary" />
                  );
                })}
              </Box>
            )}
          </Stack>
        </CardContent>
      </SurfaceCard>
    </Box>
  );
};
