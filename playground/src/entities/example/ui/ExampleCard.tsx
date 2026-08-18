import { dialogManager } from 'umbra/react';
import type { ReactNode } from 'react';
import { AppButton } from '@/shared/ui/AppButton';
import { PlayArrowIcon } from '@/shared/ui/icons';
import { SurfaceCard } from '@/shared/ui/SurfaceCard';
import { ViewCodeButton } from '@/shared/ui/ViewCodeButton/ViewCodeButton';

type ExampleCardProps = {
  readonly title: string;
  readonly description?: string | undefined;
  readonly codeKey?: string | undefined;
  readonly children?: ReactNode | undefined;
  readonly example?: ReactNode | undefined;
  readonly modalId?: string | undefined;
  readonly tryLabel?: string | undefined;
};

export const ExampleCard = ({
  title,
  description,
  codeKey,
  children,
  example,
  modalId,
  tryLabel = 'Try It',
}: ExampleCardProps) => {
  const tryButton = modalId ? (
    <AppButton
      variant="outlined"
      size="small"
      onClick={() => {
        dialogManager.open(modalId);
      }}
    >
      {/* Off-scale 18px: inline with the small button's label, not on the icon grid. */}
      <PlayArrowIcon style={{ width: 18, height: 18, marginLeft: -2 }} />
      {tryLabel}
    </AppButton>
  ) : null;

  const actions = tryButton ?? children;
  return (
    <SurfaceCard interactive>
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 'var(--app-space-6)' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--app-space-2)',
            marginBottom: 'var(--app-space-2)',
          }}
        >
          <h6
            style={{
              margin: 0,
              fontWeight: 600,
              // Off-scale: between --app-text-base and --app-text-lg.
              fontSize: '1.1rem',
              lineHeight: 1.6,
              letterSpacing: '-0.01em',
              flex: 1,
            }}
          >
            {title}
          </h6>
          {codeKey && <ViewCodeButton codeKey={codeKey} actions={actions} />}
        </div>
        {description && (
          <p
            style={{
              margin: '0 0 var(--app-space-6)',
              fontSize: 'var(--app-text-md)',
              lineHeight: 1.6,
              color: 'var(--app-text-secondary)',
              flex: 1,
            }}
          >
            {description}
          </p>
        )}
        {example ? (
          <div style={{ marginTop: 'auto' }}>{example}</div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--app-space-3)',
              marginTop: 'auto',
            }}
          >
            {children}
          </div>
        )}
      </div>
    </SurfaceCard>
  );
};
