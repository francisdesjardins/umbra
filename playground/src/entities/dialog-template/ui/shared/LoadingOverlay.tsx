import type { ReactNode } from 'react';

export type LoadingOverlayProps = {
  readonly loading?: boolean | undefined;
  readonly spinner?: ReactNode | undefined;
  readonly children?: ReactNode | undefined;
  readonly 'aria-label'?: string | undefined;
};

export function LoadingOverlay({
  loading = false,
  spinner,
  children,
  'aria-label': ariaLabel,
}: LoadingOverlayProps) {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      {loading ? (
        <div
          role="status"
          aria-busy="true"
          aria-label={ariaLabel ?? 'Loading'}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.6)',
            pointerEvents: 'auto',
            zIndex: 5,
          }}
        >
          {spinner ?? (
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeOpacity="0.15"
                strokeWidth="4"
              />
              <path
                d="M22 12a10 10 0 00-10-10"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <animateTransform
                  attributeName="transform"
                  attributeType="XML"
                  type="rotate"
                  from="0 12 12"
                  to="360 12 12"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </path>
            </svg>
          )}
        </div>
      ) : null}
    </div>
  );
}
