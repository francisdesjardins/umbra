import { Box, Typography, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import type { DocPart } from 'virtual:dialog-api';
import { categoryHref, categoryOf } from '../model/api-index';
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
 * A cross-reference to another symbol.
 *
 * Symbols live on category pages, so this is a route + hash rather than a bare `#anchor` —
 * which also keeps it working under the hash history the file:// build uses.
 */
export const SymbolLink = ({
  name,
  children,
}: {
  readonly name: string;
  readonly children?: ReactNode;
}) => {
  const category = categoryOf(name);
  if (category === undefined) {
    return (
      <Box component="code" sx={CODE_SX}>
        {children ?? name}
      </Box>
    );
  }
  return (
    <RouterLink
      to={categoryHref(category)}
      hash={`api-${name}`}
      sx={{
        fontFamily: 'monospace',
        color: 'primary.main',
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
        textUnderlineOffset: 3,
        '&:hover': { textDecorationStyle: 'solid' },
      }}
    >
      {children ?? name}
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

/**
 * A JSDoc summary is markdown, and its inline code is where half the meaning sits.
 *
 * Backticks first: a `**` inside a code span is code, not emphasis.
 */
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
      // JSDoc uses blank lines as paragraph breaks; honouring them is most of what makes a
      // long `@remarks` readable rather than a wall.
      sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
    >
      {parts.map((part, index) => {
        return part.link !== undefined ? (
          <SymbolLink key={index} name={part.link}>
            {part.text}
          </SymbolLink>
        ) : (
          <InlineCode key={index} text={part.text} />
        );
      })}
    </Typography>
  );
};
