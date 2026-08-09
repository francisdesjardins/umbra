import { createComponent, createContext, useContext } from 'solid-js';
import type { JSX } from 'solid-js';
import {
  createDialogManager,
  dialogManager,
  type DialogManager,
} from '../manager/dialog-manager.js';

/**
 * Solid context for the dialog manager instance.
 *
 * Defaults to the static `dialogManager` singleton so that production code works without a
 * provider. Wrap a subtree with `DialogManagerProvider` to inject an isolated instance —
 * intended for test stories.
 *
 * @internal Not part of the public API.
 */
const DialogManagerContext = createContext<DialogManager>(dialogManager);

/**
 * The dialog manager instance this part of the tree is scoped to — the nearest
 * `DialogManagerProvider`'s, or the static `dialogManager` singleton when there is none.
 *
 * The imperative counterpart to {@link useDialogManager}: that one returns a live *snapshot*,
 * this one returns the manager itself. Use it when a component that owns no modal has to drive
 * one — `open(id)` from a toolbar, `lookup(id)` in a guard — and must not reach past a provider
 * to the singleton to do it. Inside a modal, prefer the `dialogManager` that `useModal` already
 * returns.
 */
export function useDialogManagerContext(): DialogManager {
  return useContext(DialogManagerContext);
}

/**
 * Provides an isolated `DialogManager` instance to descendant hooks.
 *
 * **Intended for test stories only.** Each provider creates a fresh instance via
 * `createDialogManager()`, so modal registrations, event listeners and snapshot state do not
 * leak between tests. In production no provider is needed.
 *
 * Written with `createComponent` rather than JSX so the binding compiles with nothing but
 * TypeScript — see the note at the top of `use-modal.ts`.
 */
export function DialogManagerProvider(props: { readonly children: JSX.Element }): JSX.Element {
  const instance = createDialogManager();

  return createComponent(DialogManagerContext.Provider, {
    value: instance,
    get children() {
      return props.children;
    },
  });
}
