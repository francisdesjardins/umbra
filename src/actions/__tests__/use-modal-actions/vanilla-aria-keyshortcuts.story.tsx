import { useState, type ComponentProps, type ReactNode } from 'react';
import { useModal } from '../../../core/use-modal.js';
import { Key } from '../../../utils/keys.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

// ── Custom button wrapper (mirrors VanillaButton pattern) ────────────────
// Accepts typed props instead of spreading ActionButtonProps directly.
// Must forward aria-keyshortcuts for hotkey dispatch to work.
//
// `onClick` is typed from React's own button props rather than as `() => void`: it is handed
// straight to a `<button>`, which calls it with an event, and an action's click handler needs
// that event. A wrapper that declares `() => void` here is describing something it does not do.

type CustomButtonProps = {
  readonly children: ReactNode;
  readonly onClick?: ComponentProps<'button'>['onClick'] | undefined;
  readonly disabled?: boolean | undefined;
  readonly loading?: boolean | undefined;
  readonly 'aria-keyshortcuts'?: string | undefined;
};

function CustomButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  'aria-keyshortcuts': ariaKeyshortcuts,
}: CustomButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      {...(ariaKeyshortcuts !== undefined && { 'aria-keyshortcuts': ariaKeyshortcuts })}
    >
      {children}
    </button>
  );
}

// ── Wrapper that forwards aria-keyshortcuts (correct) ────────────────

export function VanillaAriaKeyshortcutsHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isVisible, Modal } = useModal<void, 'cancel' | 'confirm'>({
    id: 'vanilla-aria',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <CustomButton
            {...action('confirm', {
              hotkey: Key.Enter,
              onAction: (close) => {
                close();
              },
            })}
          >
            Confirm
          </CustomButton>
          <CustomButton
            {...action('cancel', {
              hotkey: Key.Escape,
              onAction: (close) => {
                close();
              },
            })}
          >
            Cancel
          </CustomButton>
        </div>
      );
    },
    onClose: (result) => {
      setLastReason(result.reason);
    },
  });

  return (
    <div>
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open
      </button>
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}

// ── Wrapper that drops aria-keyshortcuts (broken pattern) ────────────────

type BrokenButtonProps = {
  readonly children: ReactNode;
  readonly onClick?: ComponentProps<'button'>['onClick'] | undefined;
  readonly disabled?: boolean | undefined;
  readonly loading?: boolean | undefined;
  readonly 'aria-keyshortcuts'?: string | undefined;
};

function BrokenButton({ children, onClick, disabled = false, loading = false }: BrokenButtonProps) {
  // Intentionally does NOT forward aria-keyshortcuts
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading}>
      {children}
    </button>
  );
}

export function BrokenAriaKeyshortcutsHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isVisible, Modal } = useModal<void, 'cancel' | 'confirm'>({
    id: 'broken-aria',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <BrokenButton
            {...action('confirm', {
              hotkey: Key.Enter,
              onAction: (close) => {
                close();
              },
            })}
          >
            Confirm
          </BrokenButton>
          <BrokenButton
            {...action('cancel', {
              hotkey: Key.Escape,
              onAction: (close) => {
                close();
              },
            })}
          >
            Cancel
          </BrokenButton>
        </div>
      );
    },
    onClose: (result) => {
      setLastReason(result.reason);
    },
  });

  return (
    <div>
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open
      </button>
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
