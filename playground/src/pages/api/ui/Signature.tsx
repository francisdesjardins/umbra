import styles from '@/pages/api/ui/Signature.module.css';
import type { DocPart } from 'virtual:dialog-api';
import { SymbolLink } from './DocText';

/**
 * The declaration line, unparaphrasable, with every export clickable — following a referenced type
 * to its own entry is the commonest move a reader makes.
 */
export const Signature = ({ parts }: { readonly parts: readonly DocPart[] }) => {
  if (parts.length === 0) {
    return null;
  }
  return (
    <code className={styles['panel']}>
      {parts.map((part, index) => {
        return part.link !== undefined ? (
          <SymbolLink key={index} symbolKey={part.link}>
            {part.text}
          </SymbolLink>
        ) : (
          <span key={index}>{part.text}</span>
        );
      })}
    </code>
  );
};

/** The same panel, for a one-line `import { … } from '…'` at the top of a category. */
export const CodeLine = ({ children }: { readonly children: React.ReactNode }) => {
  return <code className={styles['panel']}>{children}</code>;
};
