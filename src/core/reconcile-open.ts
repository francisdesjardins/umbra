import type { ModalPhase } from './types.js';

/** What a controlled wrapper should do to put its dialog back where its prop says it belongs. */
export type OpenReconciliation = 'open' | 'close' | 'none';

/**
 * Decide whether a dialog driven by an `open` prop has to be opened, closed, or left alone.
 *
 * **Why the library ships this rather than leaving it to the caller.** `useModal` is imperative —
 * `open()` and `handle.close()` — while a great deal of component API is a boolean prop. Anyone
 * wrapping this library in a `<Panel open={…} />` writes the same reconciliation, and the shape of
 * it is not obvious in two ways that both produce visible defects.
 *
 * **Reconciled, not reacted to.** Comparing the prop against the dialog's real state, on every
 * pass, is what makes the prop authoritative: a dialog opened or closed from somewhere else —
 * `dialogManager.open(id)`, a teardown and remount, a restored stack — is put back, rather than
 * leaving a dialog on screen that its call site believes is closed and cannot close.
 *
 * **It decides on `phase`, never on `isVisible`, and the difference is a cut animation.**
 * `isVisible` is `phase !== 'closed'` by design: it stays true through the exit, which is what a
 * *renderer* wants and the opposite of what a *driver* wants. A dialog dismissed by the user
 * reports its close, the call site lowers the prop, and a reconciliation reading `isVisible` then
 * finds `open: false` against a dialog it thinks is still up — and closes one that was already
 * leaving, part-way through its exit. What the user sees is a panel that sometimes glides away and
 * sometimes jumps, depending on which door closed it, because a close driven by the prop *first*
 * never hits the case.
 *
 * `'opening'` counts as open even though nothing is on screen yet: it lasts a single frame, and
 * treating it as closed asks for a second open of a dialog that is already opening.
 *
 * @example
 * ```tsx
 * function Panel({ open }: { open: boolean }) {
 *   const modal = useModal<void, 'close'>({ id: 'panel', render: () => <p>…</p> });
 *   const { phase } = useLookup('panel');
 *
 *   useEffect(() => {
 *     const next = reconcileOpen(phase, open);
 *     if (next === 'open') {
 *       void modal.open();
 *     } else if (next === 'close') {
 *       modal.handle.close('close');
 *     }
 *   }, [phase, open, modal]);
 *
 *   return modal.Modal;
 * }
 * ```
 */
export function reconcileOpen(phase: ModalPhase, open: boolean): OpenReconciliation {
  // Already on its way out. When it lands the phase changes again, which is also how a call site
  // that raised the prop mid-exit gets its dialog back.
  if (phase === 'closing') {
    return 'none';
  }
  if (open === (phase === 'open' || phase === 'opening')) {
    return 'none';
  }
  return open ? 'open' : 'close';
}
