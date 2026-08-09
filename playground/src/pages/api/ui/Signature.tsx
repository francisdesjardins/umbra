import { Box, type SxProps, type Theme } from '@mui/material';
import type { DocPart } from 'virtual:dialog-api';
import { SymbolLink } from './DocText';

const PANEL_SX: SxProps<Theme> = {
  fontFamily: 'monospace',
  fontSize: '0.8125rem',
  lineHeight: 1.7,
  // Signatures wrap rather than scroll: a horizontal scrollbar hides the return type, which is
  // the half of the line a reader came for.
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  display: 'block',
  px: 1.75,
  py: 1.25,
  borderRadius: 1.5,
  border: 1,
  borderColor: 'divider',
  bgcolor: (theme: Theme) => {
    return theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'grey.50';
  },
};

/**
 * The declaration line, with every referenced export kept clickable.
 *
 * This is the one thing a reference page cannot paraphrase — and following `UseModalOptions`
 * from a signature to its own entry is the movement a reader makes most.
 */
export const Signature = ({ parts }: { readonly parts: readonly DocPart[] }) => {
  if (parts.length === 0) {
    return null;
  }
  return (
    <Box component="code" sx={PANEL_SX}>
      {parts.map((part, index) => {
        return part.link !== undefined ? (
          <SymbolLink key={index} symbolKey={part.link}>
            {part.text}
          </SymbolLink>
        ) : (
          <Box component="span" key={index} sx={{ color: 'text.primary' }}>
            {part.text}
          </Box>
        );
      })}
    </Box>
  );
};

/** The same panel, for a one-line `import { … } from '…'` at the top of a category. */
export const CodeLine = ({ children }: { readonly children: React.ReactNode }) => {
  return (
    <Box component="code" sx={PANEL_SX}>
      {children}
    </Box>
  );
};
