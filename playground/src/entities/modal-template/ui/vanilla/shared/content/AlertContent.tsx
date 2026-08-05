import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/shared/content/styles.module.css';

export type AlertSeverity = 'error' | 'warning' | 'info' | 'success';

export type AlertContentProps = {
  readonly title?: ReactNode | undefined;
  readonly children: ReactNode;
  readonly severity?: AlertSeverity | undefined;
};

export function AlertContent({ title, children, severity = 'info' }: AlertContentProps) {
  const className = [styles['alert'], severity === 'error' ? styles['alertError'] : '']
    .filter(Boolean)
    .join(' ');

  const renderIcon = () => {
    const common = {
      width: 16,
      height: 16,
      viewBox: '0 0 24 24',
      fill: 'currentColor',
      'aria-hidden': true,
    };

    if (severity === 'error') {
      // Material-style error (circle + exclamation)
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
      );
    }

    if (severity === 'warning') {
      return (
        <svg {...common}>
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
        </svg>
      );
    }

    if (severity === 'success') {
      return (
        <svg {...common}>
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      );
    }

    // info
    return (
      <svg {...common}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
      </svg>
    );
  };

  return (
    <div className={className} role="alert">
      <div className={styles['alertIcon']} aria-hidden>
        {renderIcon()}
      </div>
      <div>
        {title && <div className={styles['alertTitle']}>{title}</div>}
        <p className={styles['alertBody']}>{children}</p>
      </div>
    </div>
  );
}
