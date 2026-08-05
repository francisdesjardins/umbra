import { MessageModal } from '@/entities/modal-template/ui/mui/message-modal';
import { AlertContent, Button } from '@/entities/modal-template/ui/mui/shared';
import type { CloseResult, UseModalReturn } from 'umbra/react';
import { defineAction, useMessageModal, useModalActions } from 'umbra/react';
import type { ReactNode } from 'react';

// ── Handler types ─────────────────────────────────────────────────────────────

type ConfirmHandler = () => void | Promise<void>;
type CancelHandler = () => void;
type OnOpenCallback = () => void | Promise<void>;
type OnCloseCallback = (result: CloseResult) => void | Promise<void>;

// ── Internal config (built by the builder, stored in the definition) ──────────

type TextMessageModalConfig = {
  readonly title?: ReactNode | undefined;
  readonly message?: ReactNode | undefined;
  readonly showConfirm: boolean;
  readonly showCancel: boolean;
  readonly confirmHandler?: ConfirmHandler | undefined;
  readonly cancelHandler?: CancelHandler | undefined;
  readonly onOpen?: OnOpenCallback | undefined;
  readonly onClose?: OnCloseCallback | undefined;
};

// ── Public builder interface ──────────────────────────────────────────────────

/**
 * Fluent builder passed to the `createModal` factory in `createTextMessageModal`.
 * Chain methods to configure the modal declaratively — all methods return `this`.
 */
export type TextMessageModalBuilder = {
  setTitle(title: ReactNode): TextMessageModalBuilder;
  setMessage(message: ReactNode): TextMessageModalBuilder;
  /** Adds a Confirm button. `handler` is optional — omit it to just close the modal. */
  confirm(handler?: ConfirmHandler): TextMessageModalBuilder;
  /** Adds a Cancel button. `handler` is optional — omit it to just close the modal. */
  cancel(handler?: CancelHandler): TextMessageModalBuilder;
  onOpen(callback: OnOpenCallback): TextMessageModalBuilder;
  onClose(callback: OnCloseCallback): TextMessageModalBuilder;
};

// ── Definition (pure data, no hooks) ─────────────────────────────────────────

/**
 * Opaque definition created by `createTextMessageModal`.
 * Pass to `useTextMessageModal` inside a component to instantiate the modal.
 */
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
    onOpen(callback) {
      config = { ...config, onOpen: callback };
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
 * Creates a `TextMessageModal` definition from a builder chain.
 *
 * This is a **pure function** with no React hooks — safe to call at module level
 * for truly imperative usage, or inside a component when reactive handlers
 * (e.g. `onClose` closing over `setState`) are needed.
 *
 * Pass the returned definition to `useTextMessageModal` to instantiate the modal.
 *
 * @example
 * // Module level — static handlers, opened imperatively via dialogManager:
 * const confirmDeleteDef = createTextMessageModal('confirm-delete', {
 *   createModal: (b) =>
 *     b.setTitle('Delete item')
 *      .setMessage('This action cannot be undone.')
 *      .confirm(async () => { await api.delete(); })
 *      .cancel(),
 * });
 *
 * // Component level — reactive handlers (close over setState):
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
 * Instantiates a `TextMessageModalDefinition` as a live modal.
 *
 * Must be called at the top level of a React component. The definition can be
 * created at module scope (for static/imperative usage) or inside the component
 * (when handlers need to close over reactive state).
 *
 * @example
 * // Module-level definition (open via dialogManager from anywhere):
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
 *
 * // Component-level definition (reactive onClose):
 * function MyComponent() {
 *   const [result, setResult] = useState<string | null>(null);
 *   const def = createTextMessageModal('confirm', {
 *     createModal: (b) =>
 *       b.setTitle('Confirm').confirm().cancel()
 *        .onClose(({ reason }) => setResult(reason)),
 *   });
 *   const { open, Modal } = useTextMessageModal(def);
 *   return <>{Modal}<button onClick={open}>Open</button></>;
 * }
 */
export function useTextMessageModal(
  definition: TextMessageModalDefinition
): TextMessageModalReturn {
  const { id, _config: config } = definition;

  const actions = useModalActions({
    confirm: defineAction(),
    cancel: defineAction(),
  });

  const modal = useMessageModal({
    id,
    actions,
    onOpen: config.onOpen,
    onClose: config.onClose,
    render: () => {
      return (
        <MessageModal.DefaultLayout>
          {config.title !== undefined && (
            <MessageModal.Header>
              <MessageModal.Title>{config.title}</MessageModal.Title>
            </MessageModal.Header>
          )}
          {(config.message !== undefined || actions.error) && (
            <MessageModal.Content>
              {config.message}
              {actions.error && (
                <AlertContent severity="error" sx={{ mt: config.message !== undefined ? 2 : 0 }}>
                  {actions.error.message}
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
                  {...actions.cancel((close) => {
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
                  {...actions.confirm(async (close) => {
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
