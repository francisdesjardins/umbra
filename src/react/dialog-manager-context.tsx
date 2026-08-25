import { createContext, use, useState, type ReactNode } from 'react';
import {
  createDialogManager,
  dialogManager,
  type DialogManager,
} from '../manager/dialog-manager.js';

/**
 * React context for the dialog manager, defaulting to the singleton so production code works
 * without a provider.
 *
 * @internal Not part of the public API.
 */
const DialogManagerContext = createContext(dialogManager);

/**
 * The dialog manager this part of the tree is scoped to — the nearest `DialogManagerProvider`'s,
 * or the singleton. The imperative counterpart to {@link useDialogManager}: that one returns a
 * *snapshot* and re-renders on every open and close, this one never re-renders. Use it when a
 * component that owns no dialog has to drive one — `open(id)` from a toolbar, `lookup(id)` in a
 * guard — without reaching past a provider. Inside a dialog, prefer `useDialog`'s own.
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

/**
 * Provides an isolated `DialogManager` to descendant hooks. **For test stories only**: each creates
 * a fresh one via `createDialogManager()`, so registrations, listeners and snapshot state do not
 * leak between tests. Production needs no provider.
 *
 * @example
 * // In a test story (*.story.tsx):
 * function MyHarness() {
 *   return (
 *     <DialogManagerProvider>
 *       <DialogUnderTest />
 *     </DialogManagerProvider>
 *   );
 * }
 */
export function DialogManagerProvider({ children }: { readonly children: ReactNode }) {
  const [instance] = useState(createDialogManager);
  return <DialogManagerContext value={instance}>{children}</DialogManagerContext>;
}
