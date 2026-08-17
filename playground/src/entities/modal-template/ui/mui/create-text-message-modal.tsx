import { MessageModal } from '@/entities/modal-template/ui/mui/message-modal';
import { AlertContent, Button } from '@/entities/modal-template/ui/mui/shared';
import type { CloseResult, UseModalReturn } from 'umbra/react';
import { useMessageModal } from 'umbra/react';
import type { ReactNode } from 'react';

// ── Handler types ─────────────────────────────────────────────────────────────

type ConfirmHandler = () => void | Promise<void>;
type CancelHandler = () => void;
type OnOpenCallback = () => void | Promise<void>;
type OnCloseCallback = (result: CloseResult) => void | Promise<void>;

// ── Internal config (built by the builder, stored in the definition) ──────────

type TextMessageModalConfig = {
  readonly title?: ReactNode | undefined;
  readonly ariaLabel?: string | undefined;
  readonly message?: ReactNode | undefined;
  readonly showConfirm: boolean;
  readonly showCancel: boolean;
  readonly confirmHandler?: ConfirmHandler | undefined;
  readonly cancelHandler?: CancelHandler | undefined;
  readonly prepare?: OnOpenCallback | undefined;
  readonly onClose?: OnCloseCallback | undefined;
};

// ── Public builder interface ──────────────────────────────────────────────────

/** Fluent builder passed to `createTextMessageModal`; every method returns `this`. */
export type TextMessageModalBuilder = {
  setTitle(title: ReactNode): TextMessageModalBuilder;
  /**
   * The accessible name for a modal with no title to point at. With a title the hook wires
   * `ariaLabelledBy` to it instead, since a name written twice drifts; this exists because
   * `setTitle` takes a `ReactNode`, which a titleless modal cannot derive a string name from.
   */
  setAriaLabel(label: string): TextMessageModalBuilder;
  setMessage(message: ReactNode): TextMessageModalBuilder;
  /** Adds a Confirm button. `handler` is optional — omit it to just close the modal. */
  confirm(handler?: ConfirmHandler): TextMessageModalBuilder;
  /** Adds a Cancel button. `handler` is optional — omit it to just close the modal. */
  cancel(handler?: CancelHandler): TextMessageModalBuilder;
  prepare(callback: OnOpenCallback): TextMessageModalBuilder;
  onClose(callback: OnCloseCallback): TextMessageModalBuilder;
};

// ── Definition (pure data, no hooks) ─────────────────────────────────────────

/** Opaque definition; pass to `useTextMessageModal` inside a component to instantiate it. */
export type TextMessageModalDefinition = {
  readonly _type: 'text-message-modal';
  readonly id: string;
  readonly _config: TextMessageModalConfig;
};

// ── Return type ───────────────────────────────────────────────────────────────

export type TextMessageModalReturn = {
  readonly open: UseModalReturn['open'];
  readonly Modal: ReactNode;
};

// ── Builder (closure-based) ───────────────────────────────────────────────────

function buildConfig(
  createModal: (builder: TextMessageModalBuilder) => TextMessageModalBuilder
): TextMessageModalConfig {
  let config: TextMessageModalConfig = { showConfirm: false, showCancel: false };

  const builder: TextMessageModalBuilder = {
    setTitle(title) {
      config = { ...config, title };
      return builder;
    },
    setAriaLabel(label) {
      config = { ...config, ariaLabel: label };
      return builder;
    },
    setMessage(message) {
      config = { ...config, message };
      return builder;
    },
    confirm(handler) {
      config = { ...config, confirmHandler: handler, showConfirm: true };
      return builder;
    },
    cancel(handler) {
      config = { ...config, cancelHandler: handler, showCancel: true };
      return builder;
    },
    prepare(callback) {
      config = { ...config, prepare: callback };
      return builder;
    },
    onClose(callback) {
      config = { ...config, onClose: callback };
      return builder;
    },
  };

  createModal(builder);
  return config;
}

// ── Factory (pure — safe at module level) ─────────────────────────────────────

/**
 * Creates a `TextMessageModal` definition from a builder chain, then pass it to
 * `useTextMessageModal`. Pure and hook-free, so it is safe at module level for imperative usage or
 * inside a component when handlers must close over reactive state.
 *
 * @example
 * const def = createTextMessageModal('confirm-delete', {
 *   createModal: (b) =>
 *     b.setTitle('Delete item')
 *      .setMessage('This action cannot be undone.')
 *      .confirm(async () => { await api.delete(id); })
 *      .cancel()
 *      .onClose(({ reason }) => setResult(reason)),
 * });
 */
export function createTextMessageModal(
  id: string,
  options: {
    readonly createModal: (builder: TextMessageModalBuilder) => TextMessageModalBuilder;
  }
): TextMessageModalDefinition {
  return {
    _type: 'text-message-modal',
    id,
    _config: buildConfig(options.createModal),
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Instantiates a `TextMessageModalDefinition` as a live modal. Call at the top level of a
 * component; the definition itself may live at module scope or inside the component.
 *
 * @example
 * const confirmDef = createTextMessageModal('confirm', {
 *   createModal: (b) => b.setTitle('Confirm').confirm().cancel(),
 * });
 *
 * function MyComponent() {
 *   const { Modal } = useTextMessageModal(confirmDef);
 *   return (
 *     <>
 *       {Modal}
 *       <button onClick={() => dialogManager.open('confirm')}>Open</button>
 *     </>
 *   );
 * }
 */
export function useTextMessageModal(
  definition: TextMessageModalDefinition
): TextMessageModalReturn {
  const { id, _config: config } = definition;
  const titleId = `${id}-title`;

  const modal = useMessageModal<void, 'cancel' | 'confirm'>({
    id,
    // An explicit label wins; otherwise the on-screen title is the name, referenced rather than
    // repeated. Passing both is a silent no-op — `aria-labelledby` beats `aria-label` everywhere.
    ...(config.ariaLabel !== undefined
      ? { ariaLabel: config.ariaLabel }
      : config.title !== undefined && { ariaLabelledBy: titleId }),
    prepare: config.prepare,
    onClose: config.onClose,
    render: ({ action, error }) => {
      return (
        <MessageModal.DefaultLayout>
          {config.title !== undefined && (
            <MessageModal.Header>
              <MessageModal.Title id={titleId}>{config.title}</MessageModal.Title>
            </MessageModal.Header>
          )}
          {(config.message !== undefined || error) && (
            <MessageModal.Content>
              {config.message}
              {error && (
                <AlertContent severity="error" sx={{ mt: config.message !== undefined ? 2 : 0 }}>
                  {error.message}
                </AlertContent>
              )}
            </MessageModal.Content>
          )}
          {(config.showCancel || config.showConfirm) && (
            <MessageModal.Footer>
              {config.showCancel && (
                <Button
                  variant="outlined"
                  size="small"
                  {...action('cancel', (close) => {
                    config.cancelHandler?.();
                    close();
                  })}
                >
                  Cancel
                </Button>
              )}
              {config.showConfirm && (
                <Button
                  variant="contained"
                  size="small"
                  {...action('confirm', async (close) => {
                    await config.confirmHandler?.();
                    close();
                  })}
                >
                  Confirm
                </Button>
              )}
            </MessageModal.Footer>
          )}
        </MessageModal.DefaultLayout>
      );
    },
  });

  return { open: modal.open, Modal: modal.Modal };
}
