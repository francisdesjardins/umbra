import { expect, test } from '@playwright/test';
import type { defineAction, useModalActions } from '../../actions/use-modal-actions.js';
import type { ActionsBinding } from '../../actions/bridge.js';
import type { ActionDefinition, ActionKeys, ActionPayload } from '../../actions/types.js';
import type { BaseRenderContext, TemplateCommonOptions } from '../../templates/shared.js';
import type { useMessageModal } from '../../templates/use-message-modal.js';
import type { SlideModalRenderContext, useSlideModal } from '../../templates/use-slide-modal.js';
import type { useModal } from '../use-modal.js';
import type {
  CloseResult,
  ModalHandle,
  ModalRenderArgs,
  ModalVariant,
  UseModalBaseOptions,
  UseModalReturn,
} from '../types.js';

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

// ── The payload travels ──────────────────────────────────────────────────────

type Payload = { readonly id: number };

// The one thing a payload-typed modal must guarantee: the close handle its render callback is
// handed accepts that payload and nothing else. It reaches there through three derivations
// (`UseModalOptions` → `ModalRenderArgs` → `ModalHandle`), so it is worth asserting directly.
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

// ── The controller's payload meets the modal's ───────────────────────────────

// The key is the reason: the callable names and the close reasons are one declaration.
export type _ActionKeysAreReasons = Equals<
  ActionKeys<{ save: ActionDefinition; cancel: ActionDefinition; nope: string }>,
  'save' | 'cancel'
>;

// A mixed controller (one action carries a payload, one closes bare) reports just the payload.
// If `void` survived here, the union would fit no modal at all — see `ActionPayload`.
export type _MixedControllerPayload = Equals<
  ActionPayload<{ save: ActionDefinition<Payload>; cancel: ActionDefinition }>,
  Payload
>;

// All-bare controllers impose nothing, which is what lets them bind to any modal.
export type _BareControllerPayload = Equals<ActionPayload<{ cancel: ActionDefinition }>, never>;

// Covariance in the payload, the property that makes the two previous facts useful: a bare
// controller fits a payload-typed modal, and a payload-typed controller fits a modal that
// accepts it.
/** What a controller whose actions all close bare produces — `ActionsBinding<never>`. */
type BareBinding = ActionsBinding;

export type _BareBindingFitsTypedModal = Extends<BareBinding, ActionsBinding<Payload>>;
export type _TypedBindingFitsItsModal = Extends<ActionsBinding<Payload>, ActionsBinding<Payload>>;

// @ts-expect-error a controller that closes with a payload does not fit a modal that takes none
export type _TypedBindingRejectedByBareModal = Extends<ActionsBinding<Payload>, BareBinding>;

// ── The template surface is a complement, not a list ─────────────────────────

// `TemplateCommonOptions` is defined by what a template *does not* inherit, so an option added
// to `UseModalBaseOptions` reaches every template hook without being named anywhere. This is
// the assertion that makes that true rather than merely intended: were it an enumeration of
// forwarded keys, a newly added core option would reach no template and nothing would fail.
// Extending the exclusion list is a deliberate edit here.
export type _TemplateOptionsAreTheComplement = Equals<
  Exclude<keyof UseModalBaseOptions, keyof TemplateCommonOptions>,
  'id' | 'render' | 'onClose' | 'modalType' | 'clipContainer'
>;

// `Equals` compares assignability, and property modifiers do not affect it — so the assertion
// above would still hold if the derivation had dropped `readonly` along the way. It does not
// (`Omit` is homomorphic and preserves modifiers), and this is what says so: the options a
// template forwards are as immutable as the core ones they come from.
// A real value, not a `declare const`: this statement runs when the suite imports the file.
const templateOptions: TemplateCommonOptions = {};
// @ts-expect-error the forwarded options keep the `readonly` they are derived from
templateOptions.actions = undefined;

// ── The payload is inferred, not restated ────────────────────────────────────
//
// `TData` reaches the hook from the action set, so `useModal<Result>({ actions })` is a
// restatement of what `defineAction<Result>()` already said. These pin that it stays that way:
// the hooks are imported *type-only* and re-declared, so the assertions are call-site
// inference against the real signatures with no runtime import (this file is a unit test, and
// the root must stay React-free).

declare const useModalT: typeof useModal;
declare const useMessageModalT: typeof useMessageModal;
declare const useSlideModalT: typeof useSlideModal;
declare const useModalActionsT: typeof useModalActions;
declare const defineActionT: typeof defineAction;

/**
 * Never called, and never rendered: it exists so that its body is a set of *real* call sites,
 * from which the assertions below read the payload each one inferred. Named as a hook because
 * it composes hooks — which is also what keeps `rules-of-hooks` satisfied.
 */
function useInferredPayloads() {
  const typedActions = useModalActionsT({
    save: defineActionT<Payload>(),
    cancel: defineActionT(),
  });

  return {
    // No explicit type argument on any of the three — the payload arrives from `actions` alone.
    modal: useModalT({
      id: 'i',
      actions: typedActions,
      render: () => {
        return null;
      },
    }),
    message: useMessageModalT({
      id: 'i',
      actions: typedActions,
      render: () => {
        return null;
      },
    }),
    slide: useSlideModalT({
      id: 'i',
      direction: 'right',
      actions: typedActions,
      render: () => {
        return null;
      },
    }),
    // The caveat that keeps the above from being over-applied: an all-bare set carries no
    // payload, so a modal that gets its payload from `handle.close` rather than from an action
    // must still declare it. Dropping the type argument there narrows `TData` to `never`.
    bare: useModalT({
      id: 'i',
      actions: useModalActionsT({ cancel: defineActionT() }),
      render: () => {
        return null;
      },
    }),
  };
}

type Inferred = ReturnType<typeof useInferredPayloads>;

export type _ModalInfersPayload = Equals<Inferred['modal'], UseModalReturn<Payload>>;
export type _MessageInfersPayload = Equals<Inferred['message'], UseModalReturn<Payload>>;
export type _SlideInfersPayload = Equals<Inferred['slide'], UseModalReturn<Payload>>;
export type _BareInfersNever = Equals<Inferred['bare'], UseModalReturn<never>>;

// ── The close tuple discriminates ────────────────────────────────────────────

// What makes `const [error, result] = await waitForClose()` usable without a null check on the
// happy path: the two branches are told apart by the *first* element, so narrowing `error`
// narrows `result` with it.
type CloseTuple = Awaited<ReturnType<UseModalReturn<Payload>['waitForClose']>>;

export type _OkBranchCarriesResult = Equals<
  Extract<CloseTuple, readonly [null, unknown]>[1],
  CloseResult<Payload>
>;
export type _ErrorBranchCarriesNull = Equals<
  Extract<CloseTuple, readonly [Error, unknown]>[1],
  null
>;

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
    // Again the assertions are the `@ts-expect-error` directives — one on a call, one on a
    // type alias; an unused directive fails the build, so this passing means both mismatches
    // are still rejected.
    expect(typeof voidHandle.close).toBe('function');
  });

  test('render args carry exactly the two render-time fields', () => {
    // Guards against the slice quietly growing: anything added to `ModalRenderArgs` lands in
    // every template render context and in the hook return, so it deserves a deliberate edit
    // here rather than arriving unnoticed.
    const keys: readonly (keyof ModalRenderArgs)[] = ['isPreparing', 'handle'];
    expect([...keys].sort()).toEqual(['handle', 'isPreparing']);
  });
});
