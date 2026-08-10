import { expect, test } from '@playwright/test';
import type { ActionFactory } from '../../actions/types.js';
import type { BaseRenderContext, TemplateCommonOptions } from '../../templates/shared.js';
import type { useMessageModal } from '../../react/templates/use-message-modal.js';
import type {
  SlideModalRenderContext,
  useSlideModal,
} from '../../react/templates/use-slide-modal.js';
import type { useModal } from '../../react/use-modal.js';
import type { CloseResult, ModalHandle, ModalRenderArgs, ModalVariant } from '../types.js';
// The React instantiations, not the core model they are built from: the hooks under assertion
// are React's, so the types they must agree with are the ones with `ReactNode` in them.
import type { UseModalBaseOptions, UseModalReturn } from '../../react/types.js';

/**
 * Compile-time assertions on the shape of the public type model.
 *
 * The interesting content of this file is its types, not its bodies: everything below is
 * checked by `yarn type-check` (which compiles `src/**`), and the runtime assertions exist so
 * the file is a test rather than a comment. A relationship that stops holding fails the build.
 *
 * Worth pinning because these relationships are *derivations*. `ModalRenderArgs` is defined
 * once and `UseModalReturn` / `BaseRenderContext` are expressed in terms of it, which is only
 * an improvement over restating them while the derivation is actually load-bearing. Someone
 * flattening one of them back into a literal object type would produce identical-looking code
 * that no longer keeps the three in sync — and nothing else in the suite would notice.
 */

// ── Assertion helpers ────────────────────────────────────────────────────────

/** Compile error unless `T` is assignable to `U`. */
type Extends<T extends U, U> = T;

/** Compile error unless `A` and `B` are mutually assignable, i.e. the same type. */
type Equals<A extends B, B extends C, C = A> = A;

// ── The render-time slice ────────────────────────────────────────────────────

// The hook's return contains everything the render callback is given. This is what lets
// `render` read live state without touching the value the hook is still producing.
export type _ReturnProvidesRenderArgs = Extends<UseModalReturn, ModalRenderArgs>;

// A template's render context *is* the core render args, not a parallel copy of them.
export type _BaseContextIsRenderArgs = Equals<BaseRenderContext, ModalRenderArgs>;

// Template contexts extend that base rather than redefining it, so a field added to
// `ModalRenderArgs` reaches every template.
export type _SlideContextExtendsBase = Extends<SlideModalRenderContext, BaseRenderContext>;

// The action factory is part of that slice — which is what makes actions declarable from
// inside `render` without anything being passed in.
export type _RenderArgsCarryTheFactory = Equals<
  ModalRenderArgs<Payload>['action'],
  ActionFactory<Payload>
>;

// ── The payload travels ──────────────────────────────────────────────────────

type Payload = { readonly id: number };

// The one thing a payload-typed modal must guarantee: the close handle its render callback is
// handed accepts that payload and nothing else.
export type _RenderHandleTakesPayload = Equals<
  Parameters<ModalRenderArgs<Payload>['handle']['close']>,
  [reason?: string | undefined, data?: Payload | undefined]
>;

// Templates are not a second, looser path to the same handle.
export type _SlideHandleTakesPayload = Equals<
  SlideModalRenderContext<Payload>['handle'],
  ModalHandle<Payload>
>;

// A modal that declares no payload rejects one. `void` makes `data` unusable rather than
// absent, which is the deliberate trade for a shape the checker can see through — so assert
// the *rejection*, which is the part users rely on.
const voidHandle: ModalHandle = { close: () => {} };
// @ts-expect-error a modal with no declared payload takes no payload
voidHandle.close('done', { id: 1 });

// ── Reasons are closed when you close them ───────────────────────────────────

// Declaring the reasons on the hook buys three things a `TReason` left at `string` cannot:
// a mistyped reason is rejected, `handle.close` is constrained rather than taking any string,
// and `switch (result.reason)` is exhaustive. `'dismiss'` is always in the union because the
// library itself produces it — on Escape, on a backdrop click, and on teardown.
type Reasons = 'save' | 'cancel';

export type _DismissIsAlwaysAvailable = Equals<
  CloseResult<Payload, Reasons>['reason'],
  'save' | 'cancel' | 'dismiss'
>;

declare const useModalT: typeof useModal;
declare const useMessageModalT: typeof useMessageModal;
declare const useSlideModalT: typeof useSlideModal;

/**
 * Never called, and never rendered: its body is a set of *real* call sites, so the assertions
 * are call-site inference against the real signatures. The hooks are imported type-only, since
 * this is a unit test and nothing here may pull React in at runtime.
 */
function useDeclaredReasons() {
  return useModalT<Payload, Reasons>({
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
          // If `reason` widened to `string`, this assignment stops compiling — which is the
          // whole assertion. Dropping any case above must break it too.
          const exhaustive: never = result.reason;
          return exhaustive;
        }
      }
    },
  });
}

export type _DeclaredReasonsReachTheReturn = Equals<
  ReturnType<typeof useDeclaredReasons>,
  UseModalReturn<Payload, Reasons>
>;

/**
 * Declaring `'dismiss'` in your own union is legitimate — it is a reason `onClose` sees whether
 * you declare it or not, and writing it out makes the `switch` read honestly. What it must not
 * do is hand back an action you can name, which is the whole reason `ActionReason` is an
 * `Exclude` rather than a comment: without it, this call site compiles.
 */
export function useDismissInTheDeclaredUnion() {
  return useModalT<void, 'save' | 'dismiss'>({
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

/** Templates inherit the same guarantee rather than re-deriving it. */
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
  UseModalReturn<Payload, Reasons>
>;
export type _SlideKeepsReasons = Equals<TemplateReasons['slide'], UseModalReturn<Payload, Reasons>>;

// Left undeclared, a modal accepts any reason — the permissive default, so a modal that closes
// only through `handle.close` needs no ceremony.
function useLooseReasons() {
  return useModalT<Payload>({
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

// ── The template surface is a complement, not a list ─────────────────────────

// `TemplateCommonOptions` is defined by what a template *does not* inherit, so an option added
// to `UseModalBaseOptions` reaches every template hook without being named anywhere. This is
// the assertion that makes that true rather than merely intended: were it an enumeration of
// forwarded keys, a newly added core option would reach no template and nothing would fail.
// Extending the exclusion list is a deliberate edit here.
export type _TemplateOptionsAreTheComplement = Equals<
  Exclude<keyof UseModalBaseOptions, keyof TemplateCommonOptions>,
  'id' | 'render' | 'onClose' | 'template' | 'clipContainer'
>;

// `Equals` compares assignability, and property modifiers do not affect it — so the assertion
// above would still hold if the derivation had dropped `readonly` along the way. It does not
// (`Omit` is homomorphic and preserves modifiers), and this is what says so.
// A real value, not a `declare const`: this statement runs when the suite imports the file.
const templateOptions: TemplateCommonOptions = {};
// @ts-expect-error the forwarded options keep the `readonly` they are derived from
templateOptions.animation = undefined;

// ── Variant exclusivity ──────────────────────────────────────────────────────

// The union's whole purpose: the dismissal option that does not apply to a variant is a type
// error rather than a prop that is silently ignored at runtime.
const modalVariant: ModalVariant = { dismissOnBackdropClick: true };
const nonModalVariant: ModalVariant = { nonModal: true, dismissOnClickOutside: true };

// @ts-expect-error a non-modal dialog has no backdrop to click
const bogusBackdrop: ModalVariant = { nonModal: true, dismissOnBackdropClick: true };

// @ts-expect-error a modal dialog uses dismissOnBackdropClick, not click-outside
const bogusClickOutside: ModalVariant = { nonModal: false, dismissOnClickOutside: true };

test.describe('type model', () => {
  test('the documented variant combinations are the ones that compile', () => {
    // The assertions are the two `@ts-expect-error` directives above: if either combination
    // became legal, `tsc` reports the unused directive and the build fails.
    expect(modalVariant.dismissOnBackdropClick).toBe(true);
    expect(nonModalVariant.nonModal).toBe(true);
    expect([bogusBackdrop, bogusClickOutside]).toHaveLength(2);
  });

  test('the payload cannot be widened at either end of the close path', () => {
    // Again the assertions are the `@ts-expect-error` directives — an unused one fails the
    // build, so this passing means every mismatch above is still rejected.
    expect(typeof voidHandle.close).toBe('function');
  });

  test('render args carry exactly the render-time fields', () => {
    // Guards against the slice quietly growing: anything added to `ModalRenderArgs` lands in
    // every template render context and in the hook return, so it deserves a deliberate edit
    // here rather than arriving unnoticed.
    const keys: readonly (keyof ModalRenderArgs)[] = [
      'isPreparing',
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
    ]);
  });
});
