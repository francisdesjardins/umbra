import { createContext, use, useState, type ReactNode } from 'react';
import {
  createDialogManager,
  dialogManager,
  type DialogManager,
} from '../manager/dialog-manager.js';

// ── Context ─────────────────────────────────────────────────────────────────

/**
 * React context for the dialog manager instance.
 *
 * Defaults to the static `dialogManager` singleton so that production code
 * works without a provider. Wrap a subtree with `DialogManagerProvider` to
 * inject an isolated instance — intended for test stories.
 *
 * @internal Not part of the public API.
 */
const DialogManagerContext = createContext(dialogManager);

/**
 * The dialog manager instance this part of the tree is scoped to — the nearest
 * `DialogManagerProvider`'s, or the static `dialogManager` singleton when there is none.
 *
 * The imperative counterpart to {@link useDialogManager}: that one returns a *snapshot* and
 * re-renders on every open and close, this one returns the manager itself and never
 * re-renders. Use it when a component that owns no modal has to drive one — `open(id)` from a
 * toolbar, `lookup(id)` in a guard — and must not reach past a provider to the singleton to do
 * it. Inside a modal, prefer the `dialogManager` that `useModal` already returns.
 *
 * @example
 * function OpenSettingsButton() {
 *   const dialogs = useDialogManagerContext();
 *   return <button onClick={() => dialogs.open('settings')}>Settings</button>;
 * }
 */
export function useDialogManagerContext(): DialogManager {
  return use(DialogManagerContext);
}

// ── Provider ────────────────────────────────────────────────────────────────

/**
 * Provides an isolated `DialogManager` instance to descendant hooks.
 *
 * **Intended for test stories only.** Each provider creates a fresh instance
 * via `createDialogManager()`, ensuring that modal registrations, event
 * listeners, and snapshot state do not leak between tests.
 *
 * In production, no provider is needed — hooks automatically use the static
 * `dialogManager` singleton.
 *
 * @example
 * // In a test story (*.story.tsx):
 * function MyHarness() {
 *   return (
 *     <DialogManagerProvider>
 *       <ModalUnderTest />
 *     </DialogManagerProvider>
 *   );
 * }
 */
export function DialogManagerProvider({ children }: { readonly children: ReactNode }) {
  const [instance] = useState(createDialogManager);
  return <DialogManagerContext value={instance}>{children}</DialogManagerContext>;
}
