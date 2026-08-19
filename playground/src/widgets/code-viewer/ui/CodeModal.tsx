import { Spinner } from '@/shared/ui/Spinner';
import { AppIconButton } from '@/shared/ui/AppButton';
import { CloseIcon, CodeIcon } from '@/shared/ui/icons';
import styles from '@/widgets/code-viewer/ui/CodeModal.module.css';
import type { ModalHandle } from 'umbra/react';
import type { ReactNode } from 'react';
import { CodeBlock } from '@/shared/ui/CodeBlock/CodeBlock';

/**
 * Highlighter language by suffix — `-styles` (CSS modules), `-html` (the microfrontend host);
 * everything else, plain `.js` included, is TSX. Renaming past a suffix picks the wrong grammar.
 */
const languageForCodeKey = (codeKey: string) => {
  if (codeKey.endsWith('-styles')) {
    return 'css';
  }
  return codeKey.endsWith('-html') ? 'markup' : 'tsx';
};

export const CodeModalContent = ({
  code,
  codeKey,
  exampleActions,
  handle,
  isLoading,
  title,
  titleId,
}: {
  code: string;
  codeKey: string;
  exampleActions: ReactNode;
  handle: ModalHandle;
  /** Still arriving — distinct from an empty `code`, which means the key names no sample. */
  isLoading: boolean;
  title: string;
  /** What the panel's `ariaLabelledBy` points at; the reference is in `model/useCodeModal.tsx`. */
  titleId: string;
}) => {
  return (
    <div className={styles['root']}>
      <div className={styles['header']}>
        <CodeIcon className={styles['headerIcon']} />
        <div className={styles['titleRow']}>
          <h2 id={titleId} className={styles['title']}>
            {title}
          </h2>
          <span className={styles['keyBadge']}>{codeKey}</span>
        </div>
        {exampleActions && <div className={styles['actions']}>{exampleActions}</div>}
        <AppIconButton
          size="small"
          aria-label="Close"
          onClick={() => {
            handle.close('close');
          }}
        >
          <CloseIcon />
        </AppIconButton>
      </div>

      <div className={styles['body']}>
        {code ? (
          <CodeBlock code={code} language={languageForCodeKey(codeKey)} />
        ) : (
          <div className={styles['emptyState']}>
            {/* No live region: this branch unmounts when the code arrives, so a region on it would
                be born with its text rather than updated, announcing nothing. The panel takes focus
                on open and is named by its heading. */}
            {isLoading && (
              <span style={{ display: 'inline-flex', color: 'var(--app-flame)' }}>
                <Spinner size={18} />
              </span>
            )}
            <span>{isLoading ? 'Loading source…' : 'No code available'}</span>
          </div>
        )}
      </div>
    </div>
  );
};
