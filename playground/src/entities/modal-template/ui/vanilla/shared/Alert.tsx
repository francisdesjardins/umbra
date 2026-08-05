import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/shared/content/styles.module.css';

export type VanillaAlertProps = {
  readonly title?: ReactNode | undefined;
  readonly children: ReactNode;
  readonly severity?: 'info' | 'warning' | 'error' | 'success' | undefined;
};

export const Alert = ({ title, children, severity = 'info' }: VanillaAlertProps) => {
  const className = [styles['alert'], severity === 'error' ? styles['alertError'] : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} role="alert" aria-live="polite">
      {severity === 'error' && (
        <div className={styles['alertIcon']} aria-hidden>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </div>
      )}

      <div className={styles['alertContent']}>
        {title && <div className={styles['alertTitle']}>{title}</div>}
        <div className={styles['alertBody']}>{children}</div>
      </div>
    </div>
  );
};
