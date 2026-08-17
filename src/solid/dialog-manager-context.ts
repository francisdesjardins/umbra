import { createComponent, createContext, useContext } from 'solid-js';
import type { JSX } from 'solid-js';
import {
  createDialogManager,
  dialogManager,
  type DialogManager,
} from '../manager/dialog-manager.js';

/**
 * Solid context for the dialog manager, defaulting to the singleton so production code works
 * without a provider.
 *
 * @internal Not part of the public API.
 */
const DialogManagerContext = createContext<DialogManager>(dialogManager);

/** `umbra/react`'s hook of the same name; {@link useDialogManager} is the live-snapshot one. */
export function useDialogManagerContext(): DialogManager {
  return useContext(DialogManagerContext);
}

/**
 * Provides an isolated `DialogManager` to descendant hooks, as `umbra/react`'s does and for the
 * same test-story reasons. Written with `createComponent` rather than JSX so the binding compiles
 * with nothing but TypeScript — see the note atop `use-modal.ts`.
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
