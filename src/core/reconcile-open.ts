import type { DialogPhase } from './types.js';

/** What a controlled wrapper should do to put its dialog back where its prop says it belongs. */
export type OpenReconciliation = 'open' | 'close' | 'none';

/**
 * Decide whether a dialog driven by an `open` prop has to be opened, closed, or left alone.
 *
 * **Shipped rather than left to the caller** because `useDialog` is imperative and a great deal of
 * component API is a boolean prop, so everyone wrapping this in a `<Panel open={…} />` writes the
 * same thing — and it is wrong in two ways that both show on screen.
 *
 * **Reconciled, not reacted to.** Comparing the prop against the dialog's real state on every pass
 * is what makes the prop authoritative: a dialog opened or closed from somewhere else is put back,
 * rather than sitting on screen while its call site believes it closed and cannot close it.
 *
 * **It decides on `phase`, never on `isVisible`, and the difference is a cut animation.**
 * `isVisible` is `phase !== 'closed'`, so it stays true through the exit — right for a *renderer*,
 * backwards for a *driver*. A dialog the user dismissed reports its close, the call site lowers the
 * prop, and a reconciliation reading `isVisible` closes one that is already part-way out. The panel
 * then glides or jumps depending on which door closed it, since a prop-driven close never hits it.
 *
 * `'opening'` counts as open even though nothing is on screen yet: it lasts a single frame, and
 * treating it as closed asks for a second open of a dialog that is already opening.
 *
 * @example
 * ```tsx
 * function Panel({ open }: { open: boolean }) {
 *   const modal = useDialog<void, 'close'>({ id: 'panel', render: () => <p>…</p> });
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
export function reconcileOpen(phase: DialogPhase, open: boolean): OpenReconciliation {
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
