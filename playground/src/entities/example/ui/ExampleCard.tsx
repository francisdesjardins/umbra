import type { ReactNode } from 'react';
import { SurfaceCard } from '@/shared/ui/SurfaceCard';
import { ViewCodeButton } from '@/shared/ui/ViewCodeButton/ViewCodeButton';

type ExampleCardProps = {
  readonly title: string;
  readonly description?: string | undefined;
  readonly codeKey?: string | undefined;
  readonly children?: ReactNode | undefined;
  readonly example?: ReactNode | undefined;
};

export const ExampleCard = ({
  title,
  description,
  codeKey,
  children,
  example,
}: ExampleCardProps) => {
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
          {/* h3, under the section's h2 — a card title is a level of the page, not a sixth one.
              The body face is stated because the global heading rule reaches h3. */}
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--app-font-body)',
              fontWeight: 600,
              // Off-scale: between --app-text-base and --app-text-lg.
              fontSize: '1.1rem',
              lineHeight: 1.6,
              letterSpacing: '-0.01em',
              flex: 1,
            }}
          >
            {title}
          </h3>
          {codeKey && <ViewCodeButton codeKey={codeKey} />}
        </div>
        {description && (
          <p
            style={{
              margin: '0 0 var(--app-space-6)',
              // The same measure `PageLayout` holds its own prose to. A full-width card runs 98
              // characters to the line without it, which is past where the eye finds the next one.
              maxWidth: 'var(--app-measure)',
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
