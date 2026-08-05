import type { HotkeyDef } from '../actions/types.js';
import { formatHotkeyLabel } from './hotkey-utils.js';

/**
 * Does an action own the dismiss key?
 *
 * When a modal's `dismissKey` is also declared as an action's hotkey, the action wins: pressing
 * it must run the handler, not silently dismiss. Both dismissal paths in `useDialogKeydown`
 * consult this — the dialog-level listener to stand down, and the non-modal window-level one to
 * redirect the key to the button instead.
 *
 * Separated from the hook because it is the part with the interesting edge (`dismissKey: false`
 * must never match, even against an action set that declares `false`-ish hotkeys) and the part
 * that a browser cannot usefully tell you about.
 */
export function dismissKeyIsOwnedByAction(
  dismissKey: HotkeyDef | false,
  actionHotkeys: readonly HotkeyDef[] | undefined
): boolean {
  // Key dismissal is disabled outright — there is no key for an action to collide with, so no
  // amount of action hotkeys makes this true.
  if (dismissKey === false) {
    return false;
  }

  // Compared as labels, not as raw strings: one hotkey has more than one spelling
  // (`'Shift+s'` is what `` `Shift+${Key.S}` `` produces, `'Shift+S'` is what you type), and
  // `matchesHotkey` treats them as the same key. String equality here would let the dismiss
  // path fire for a key an action already owns. `formatHotkeyLabel` is the same canonical form
  // that reaches the DOM as `aria-keyshortcuts`, so all three agree by construction.
  const dismissLabel = formatHotkeyLabel(dismissKey);
  return (
    actionHotkeys?.some((hotkey) => {
      return formatHotkeyLabel(hotkey) === dismissLabel;
    }) ?? false
  );
}
