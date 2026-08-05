import { useState, type ComponentProps, type ReactNode } from 'react';
import { useModal } from '../../../core/use-modal.js';
import { defineAction, useModalActions } from '../../use-modal-actions.js';
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

  const actions = useModalActions({
    cancel: defineAction({ hotkey: Key.Escape }),
    confirm: defineAction({ hotkey: Key.Enter }),
  });

  const { open, isOpen, Modal } = useModal({
    id: 'vanilla-aria',
    actions,
    render: () => {
      return (
        <div style={dialogStyle}>
          <CustomButton
            {...actions.confirm((close) => {
              close();
            })}
          >
            Confirm
          </CustomButton>
          <CustomButton
            {...actions.cancel((close) => {
              close();
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
      <span data-testid="is-open">{isOpen ? 'open' : 'closed'}</span>
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

  const actions = useModalActions({
    cancel: defineAction({ hotkey: Key.Escape }),
    confirm: defineAction({ hotkey: Key.Enter }),
  });

  const { open, isOpen, Modal } = useModal({
    id: 'broken-aria',
    actions,
    render: () => {
      return (
        <div style={dialogStyle}>
          <BrokenButton
            {...actions.confirm((close) => {
              close();
            })}
          >
            Confirm
          </BrokenButton>
          <BrokenButton
            {...actions.cancel((close) => {
              close();
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
      <span data-testid="is-open">{isOpen ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
