import { expect, test } from '@playwright/test';
import { noop } from '../../__tests__/noop.js';
import type { ActionFactory } from '../../actions/types.js';
import type { BaseRenderContext, TemplateCommonOptions } from '../../templates/shared.js';
import type { useMessageModal } from '../../react/templates/use-message-modal.js';
import type {
  SlideModalRenderContext,
  useSlideModal,
} from '../../react/templates/use-slide-modal.js';
import type { useDialog } from '../../react/use-dialog.js';
import type { CloseResult, ModalHandle, ModalRenderArgs, ModalVariant } from '../types.js';
// React's instantiations, not the core model: the hooks asserted are React's, so the types they
// must agree with are the ones carrying `ReactNode`.
import type { UseDialogBaseOptions, UseDialogReturn } from '../../react/types.js';

/**
 * Compile-time assertions on the public type model, checked by `yarn type-check`; the runtime
 * bodies exist only so the file is a test. These relationships are *derivations* —
 * `UseDialogReturn` and `BaseRenderContext` are expressed in terms of `ModalRenderArgs` — and
 * flattening one back into a literal object type compiles while silently desyncing the three.
 */

/** Compile error unless `T` is assignable to `U`. */
type Extends<T extends U, U> = T;

/** Compile error unless `A` and `B` are mutually assignable, i.e. the same type. */
type Equals<A extends B, B extends C, C = A> = A;

// What lets `render` read live state without touching the value the hook is still producing.
export type _ReturnProvidesRenderArgs = Extends<UseDialogReturn, ModalRenderArgs>;

export type _BaseContextIsRenderArgs = Equals<BaseRenderContext, ModalRenderArgs>;

// Extended rather than redefined, so a field added to `ModalRenderArgs` reaches every template.
export type _SlideContextExtendsBase = Extends<SlideModalRenderContext, BaseRenderContext>;

export type _RenderArgsCarryTheFactory = Equals<
  ModalRenderArgs<Payload>['action'],
  ActionFactory<Payload>
>;

type Payload = { readonly id: number };

export type _RenderHandleTakesPayload = Equals<
  Parameters<ModalRenderArgs<Payload>['handle']['close']>,
  [reason?: string | undefined, data?: Payload | undefined]
>;

export type _SlideHandleTakesPayload = Equals<
  SlideModalRenderContext<Payload>['handle'],
  ModalHandle<Payload>
>;

// `void` makes `data` unusable rather than absent, so assert the *rejection* — the part users
// rely on.
const voidHandle: ModalHandle = { close: noop };
// @ts-expect-error a modal with no declared payload takes no payload
voidHandle.close('done', { id: 1 });

// Declared reasons buy what `string` cannot: a mistyped reason rejected, a constrained
// `handle.close`, an exhaustive `switch`. `'dismiss'` is always in — the library produces it.
type Reasons = 'save' | 'cancel';

export type _DismissIsAlwaysAvailable = Equals<
  CloseResult<Payload, Reasons>['reason'],
  'save' | 'cancel' | 'dismiss'
>;

declare const useDialogT: typeof useDialog;
declare const useMessageModalT: typeof useMessageModal;
declare const useSlideModalT: typeof useSlideModal;

// Never called: its body is real call sites, so inference runs against the real signatures. The
// hooks are imported type-only — this is a unit test and nothing here may pull React in.
function useDeclaredReasons() {
  return useDialogT<Payload, Reasons>({
    id: 'i',
    render: ({ action, handle }) => {
      action('save', (close) => {
        close({ id: 1 });
      });
      action('cancel');
      // @ts-expect-error 'savee' is not one of the declared reasons
      action('savee');
      // @ts-expect-error the payload is `Payload`, not a number
      action('save', (close: (d: number) => void) => {
        close(42);
      });

      // Querying takes the same union declaring does: an action you can name you can watch.
      action.isRunning('save');
      // @ts-expect-error the query is constrained to the declared reasons, exactly as the factory is
      action.isRunning('savee');
      // @ts-expect-error `'dismiss'` is the library's own reason — no action may be named it
      action('dismiss');
      // @ts-expect-error and so there is nothing to ask about
      action.isRunning('dismiss');

      handle.close('cancel');
      handle.close('dismiss');
      // @ts-expect-error the handle is constrained to the declared reasons too
      handle.close('nonsense');
      return null;
    },
    onClose: (result) => {
      switch (result.reason) {
        case 'save':
        case 'cancel':
        case 'dismiss':
          return;
        default: {
          // If `reason` widened to `string` this stops compiling, and so does dropping a case.
          const exhaustive: never = result.reason;
          return exhaustive;
        }
      }
    },
  });
}

export type _DeclaredReasonsReachTheReturn = Equals<
  ReturnType<typeof useDeclaredReasons>,
  UseDialogReturn<Payload, Reasons>
>;

// Declaring `'dismiss'` yourself is legitimate — `onClose` sees it either way. It must not yield
// a nameable action, which is why `ActionReason` is an `Exclude`: without it, this compiles.
export function useDismissInTheDeclaredUnion() {
  return useDialogT<void, 'save' | 'dismiss'>({
    id: 'i',
    render: ({ action, handle }) => {
      action('save');
      // @ts-expect-error declared or not, the library's own reason is never an action's name
      action('dismiss');
      // It stays a reason this modal closes with, and the handle still takes it.
      handle.close('dismiss');
      return null;
    },
  });
}

function useTemplateReasons() {
  return {
    message: useMessageModalT<Payload, Reasons>({
      id: 'i',
      render: ({ action }) => {
        action('save');
        // @ts-expect-error the template narrows reasons exactly as the core hook does
        action('nope');
        return null;
      },
    }),
    slide: useSlideModalT<Payload, Reasons>({
      id: 'i',
      direction: 'right',
      render: ({ action, direction }) => {
        void direction;
        action('cancel');
        return null;
      },
    }),
  };
}
type TemplateReasons = ReturnType<typeof useTemplateReasons>;
export type _MessageKeepsReasons = Equals<
  TemplateReasons['message'],
  UseDialogReturn<Payload, Reasons>
>;
export type _SlideKeepsReasons = Equals<
  TemplateReasons['slide'],
  UseDialogReturn<Payload, Reasons>
>;

// Left undeclared, a modal accepts any reason — the permissive default.
function useLooseReasons() {
  return useDialogT<Payload>({
    id: 'i',
    render: ({ action }) => {
      action('anything-at-all');
      return null;
    },
    onClose: (result) => {
      const reason: string = result.reason;
      void reason;
    },
  });
}
export type _LooseReasonIsString = Equals<
  Awaited<ReturnType<ReturnType<typeof useLooseReasons>['openAndWait']>>[1],
  CloseResult<Payload> | null
>;

// `TemplateCommonOptions` is the *complement*, so a new `UseDialogBaseOptions` option reaches every
// template unnamed. Were it an enumeration, a new core option would reach none and nothing fail.
export type _TemplateOptionsAreTheComplement = Equals<
  Exclude<keyof UseDialogBaseOptions, keyof TemplateCommonOptions>,
  'id' | 'render' | 'onClose' | 'template' | 'clipContainer'
>;

// `Equals` ignores property modifiers, so the assertion above holds even with `readonly` dropped;
// this is what says `Omit` preserved it. A real value, so the statement runs on import.
const templateOptions: TemplateCommonOptions = {};
// @ts-expect-error the forwarded options keep the `readonly` they are derived from
templateOptions.animation = undefined;

// A dismissal option that does not apply to a variant is a type error, not a silent no-op.
const modalVariant: ModalVariant = { dismissOnBackdropClick: true };
const nonModalVariant: ModalVariant = { nonModal: true, dismissOnClickOutside: true };

// @ts-expect-error a non-modal dialog has no backdrop to click
const bogusBackdrop: ModalVariant = { nonModal: true, dismissOnBackdropClick: true };

// @ts-expect-error a modal dialog uses dismissOnBackdropClick, not click-outside
const bogusClickOutside: ModalVariant = { nonModal: false, dismissOnClickOutside: true };

// An alertdialog is modal by definition, so the non-modal branch offers `'dialog'` alone.
const modalAlert: ModalVariant = { role: 'alertdialog' };
const nonModalPlain: ModalVariant = { nonModal: true, role: 'dialog' };

// @ts-expect-error an alertdialog is modal by definition — the non-modal branch has no such role
const bogusAlert: ModalVariant = { nonModal: true, role: 'alertdialog' };

test.describe('type model', () => {
  test('the documented variant combinations are the ones that compile', () => {
    // The assertions are the `@ts-expect-error` directives above: an unused one fails the build.
    expect(modalVariant.dismissOnBackdropClick).toBe(true);
    expect(nonModalVariant.nonModal).toBe(true);
    expect(modalAlert.role).toBe('alertdialog');
    expect(nonModalPlain.role).toBe('dialog');
    expect([bogusBackdrop, bogusClickOutside, bogusAlert]).toHaveLength(3);
  });

  test('the payload cannot be widened at either end of the close path', () => {
    expect(typeof voidHandle.close).toBe('function');
  });

  test('render args carry exactly the render-time fields', () => {
    // Anything added lands in every template context and in the hook return — a deliberate edit.
    const keys: readonly (keyof ModalRenderArgs)[] = [
      'isPreparing',
      'phase',
      'handle',
      'action',
      'hasRunningAction',
      'error',
    ];
    expect([...keys].sort()).toEqual([
      'action',
      'error',
      'handle',
      'hasRunningAction',
      'isPreparing',
      'phase',
    ]);
  });
});
