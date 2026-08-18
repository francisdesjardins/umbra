type ResultDisplayProps = {
  result: string | null;
};

export const ResultDisplay = ({ result }: ResultDisplayProps) => {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 4,
        // Token-derived, not written out: the border beside it is the flame, and a literal here
        // left a fuchsia wash inside an amber border the moment the palette moved.
        background: result
          ? 'var(--app-flame-wash)'
          : 'color-mix(in srgb, var(--app-text) 2%, transparent)',
        border: `1px solid ${result ? 'var(--app-flame)' : 'var(--app-divider)'}`,
        transition: 'background-color 200ms, border-color 200ms',
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: '"Fira Code", "Consolas", monospace',
          fontSize: '0.8125rem',
          lineHeight: 1.43,
        }}
      >
        <span style={{ color: 'var(--app-text-secondary)' }}>Result: </span>
        {result ?? (
          <span style={{ color: 'var(--app-text-tertiary)', fontStyle: 'italic' }}>waiting...</span>
        )}
      </p>
    </div>
  );
};
