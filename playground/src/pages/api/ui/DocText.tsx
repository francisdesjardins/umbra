import styles from '@/pages/api/ui/DocText.module.css';
import type { ReactNode } from 'react';
import type { DocPart } from 'virtual:dialog-api';
import { categoryHref, symbolAnchor, symbolFor } from '../model/api-index';
import { RouterLink } from './RouterLink';

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
    return <code className={styles['code']}>{children ?? symbolKey}</code>;
  }
  return (
    <RouterLink
      to={categoryHref(symbol.category)}
      hash={symbolAnchor(symbol.name)}
      className={styles['symbolLink']}
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
          <span key={index} style={index % 2 === 1 ? { fontWeight: 700 } : undefined}>
            {chunk}
          </span>
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
          <code key={index} className={styles['code']}>
            {chunk}
          </code>
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
  readonly color?: 'text.secondary' | undefined;
};

/** Prose with `{@link}` targets turned into jumps, the way a JSDoc reader expects. */
export const DocProse = ({ parts, variant = 'body1', color }: DocProseProps) => {
  if (parts.length === 0) {
    return null;
  }
  const classes = [
    styles['prose'],
    variant === 'body2' ? styles['body2'] : styles['body1'],
    color === 'text.secondary' ? styles['secondary'] : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes}>
      {parts.map((part, index) => {
        return part.link !== undefined ? (
          <SymbolLink key={index} symbolKey={part.link}>
            {part.text}
          </SymbolLink>
        ) : (
          <InlineCode key={index} text={part.text} />
        );
      })}
    </div>
  );
};
