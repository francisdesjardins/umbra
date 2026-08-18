import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { type SxProps, type Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import type { DocPart } from 'virtual:dialog-api';
import { categoryHref, symbolAnchor, symbolFor } from '../model/api-index';
import { RouterLink } from './RouterLink';

const CODE_SX: SxProps<Theme> = {
  fontFamily: 'monospace',
  fontSize: '0.875em',
  px: 0.5,
  py: 0.125,
  borderRadius: 0.75,
  bgcolor: 'action.hover',
};

/**
 * A cross-reference by `specifier#name`. Route + hash, not a bare `#anchor`: symbols live on
 * category pages and the file:// build uses hash history. An unanswered key renders as inline code.
 */
export const SymbolLink = ({
  symbolKey,
  children,
}: {
  readonly symbolKey: string;
  readonly children?: ReactNode;
}) => {
  const symbol = symbolFor(symbolKey);
  if (symbol === undefined) {
    return (
      <Box component="code" sx={CODE_SX}>
        {children ?? symbolKey}
      </Box>
    );
  }
  return (
    <RouterLink
      to={categoryHref(symbol.category)}
      hash={symbolAnchor(symbol.name)}
      sx={{
        fontFamily: 'monospace',
        color: 'accent.onSurface',
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
        textUnderlineOffset: 3,
        '&:hover': { textDecorationStyle: 'solid' },
      }}
    >
      {children ?? symbol.name}
    </RouterLink>
  );
};

/** `**bold**` outside code — the emphasis the source writes when a paragraph has a subject. */
const Emphasis = ({ text: value }: { readonly text: string }) => {
  return (
    <>
      {value.split(/\*\*(.+?)\*\*/gs).map((chunk, index) => {
        return (
          <Box component="span" key={index} sx={index % 2 === 1 ? { fontWeight: 700 } : undefined}>
            {chunk}
          </Box>
        );
      })}
    </>
  );
};

/** A JSDoc summary is markdown; backticks split first, so `**` inside a code span stays code. */
export const InlineCode = ({ text: value }: { readonly text: string }) => {
  return (
    <>
      {value.split('`').map((chunk, index) => {
        return index % 2 === 1 ? (
          <Box component="code" key={index} sx={CODE_SX}>
            {chunk}
          </Box>
        ) : (
          <Emphasis key={index} text={chunk} />
        );
      })}
    </>
  );
};

type DocProseProps = {
  readonly parts: readonly DocPart[];
  readonly variant?: 'body1' | 'body2' | undefined;
  readonly color?: string | undefined;
};

/** Prose with `{@link}` targets turned into jumps, the way a JSDoc reader expects. */
export const DocProse = ({ parts, variant = 'body1', color }: DocProseProps) => {
  if (parts.length === 0) {
    return null;
  }
  return (
    <Typography
      component="div"
      variant={variant}
      color={color}
      // JSDoc uses blank lines as paragraph breaks; honouring them is what makes `@remarks` read.
      sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
    >
      {parts.map((part, index) => {
        return part.link !== undefined ? (
          <SymbolLink key={index} symbolKey={part.link}>
            {part.text}
          </SymbolLink>
        ) : (
          <InlineCode key={index} text={part.text} />
        );
      })}
    </Typography>
  );
};
