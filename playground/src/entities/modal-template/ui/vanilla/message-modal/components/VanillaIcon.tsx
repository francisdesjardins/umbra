import styles from '@/entities/modal-template/ui/vanilla/message-modal/styles.module.css';

type IconVariant = 'success' | 'error' | 'warning' | 'info';

type VanillaIconProps = {
  readonly variant: IconVariant;
};

const variantStyles: Record<IconVariant, string> = {
  success: styles['success'] ?? '',
  error: styles['error'] ?? '',
  warning: styles['warning'] ?? '',
  info: styles['info'] ?? '',
};

export function VanillaIcon({ variant }: VanillaIconProps) {
  const iconClassName = [styles['iconWrapper'], variantStyles[variant]].join(' ');

  return (
    <div className={iconClassName}>
      {variant === 'success' && (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      )}
      {variant === 'error' && (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
      )}
      {variant === 'warning' && (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
        </svg>
      )}
      {variant === 'info' && (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      )}
    </div>
  );
}
