/**
 * Compile-time assertions for the modal registry, in the state the package ships: **empty**.
 *
 * The augmented half cannot live here — declaration merging is global, so a project's ids would
 * leak into every other type test in this project and the fallback under test would stop being
 * reachable. It is asserted in `registry-augmented.test-d.ts`, which is compiled on its own.
 */

import type { DataOf, ModalId, PayloadOf, ReasonOf } from '../registry.js';
import { dialogManager } from '../../manager/dialog-manager.js';
import { useModal } from '../../react/use-modal.js';

// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- the two-signature identity trick needs a parameter the rule counts as used once
type Equals<A, B> =
  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- the two-signature identity trick needs a parameter the rule counts as used once
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;

/** With nothing declared, every string is still an id. */
export const _idAcceptsAnyString: ModalId = String(1);

/** And the three derivations fall back rather than resolving to `never`. */
export type _ReasonFallsBack = Assert<Equals<ReasonOf<'anything'>, string>>;
export type _DataFallsBack = Assert<Equals<DataOf<'anything'>, void>>;
export type _PayloadFallsBack = Assert<Equals<PayloadOf<'anything'>, unknown>>;

/** Every door still takes a computed id, which is what an unopted-in project relies on. */
export function _doorsStayOpen(id: string) {
  dialogManager.open(id);
  dialogManager.close(id, 'whatever');
  dialogManager.lookup(id);
  // An unopted-in project asks with whatever it likes: `PayloadOf` is `unknown` here, and the
  // untyped envelope this option existed as is exactly what `unknown` still spells.
  dialogManager.requestOpen(id, { payload: { anything: true } });
}

/** And the hook keeps the signature the docs mandate: reasons declared at the call site. */
export function HookKeepsItsGenerics() {
  return useModal<{ name: string }, 'save' | 'cancel'>({
    id: 'some-modal',
    ariaLabel: 'Some modal',
    render: ({ handle }) => {
      handle.close('save', { name: 'x' });
      // @ts-expect-error the declared reasons are still enforced
      handle.close('nope');
      return null;
    },
  });
}
