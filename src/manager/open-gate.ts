import { createLogger } from '../utils/logger.js';
import type { OpenRequestContext } from './dialog-manager.js';

const log = createLogger('manager');

/**
 * The open being gated — what a policy is told, and nothing it could ask for itself.
 *
 * **A union on `cause`, so `context` cannot exist where it would be a lie.** Only an ask carries a
 * caller's claims about itself; an instruct crossed no boundary and has nobody to quote. Spelled
 * the way `DialogVariant` spells its own exclusion — the inapplicable half stays present as
 * `never`, which is what lets a policy read `attempt.context` without narrowing first, while the
 * construction sites inside this library cannot pass one on the wrong door.
 *
 * **`cause` names the door, and a policy that counts should count one of them.** The words are the
 * manager's own: `open(id)` *instructs* and `requestOpen(id)` *asks*. An ask the gate admits
 * reaches the dialog's own `open()`, which arrives here a second time as an instruct — so a cap or
 * a rate limit reads `'instruct'`, the door every open passes through, and a rule about who is
 * calling reads `'ask'`, the only one that names a caller.
 *
 * **The open stack is deliberately absent.** `dialogManager.lookup()` already answers how many are
 * open and what is in front, and a gate is installed on a manager it can therefore close over.
 * Copying that in would be a second answer to keep in step with the first.
 */
export type OpenAttempt =
  | {
      /** The dialog being opened — registered or not, because the gate runs before the registry. */
      readonly id: string;
      /** `open()` or `openAndWait()`, on the manager or on the dialog itself. */
      readonly cause: 'instruct';
      /** Not applicable — nothing crossed a boundary to reach this door. */
      readonly context?: never;
    }
  | {
      /** The dialog being opened — registered or not, because the gate runs before the registry. */
      readonly id: string;
      /** `requestOpen()` or `requestOpenAndWait()`. */
      readonly cause: 'ask';
      /**
       * What the caller said about itself. Every field is a claim verified by nothing — see
       * {@link OpenRequestContext} for how far to trust it.
       */
      readonly context?: OpenRequestContext | undefined;
    };

/**
 * The policy consulted before any dialog opens — the whole of `dialogManager.gate`.
 *
 * **Refusal is explicit and acceptance is the default**, the rule `OpenRequestDispatch.refuse`
 * already states for the other direction: return a reason to refuse, return nothing to open. The
 * reason is not decoration — it is what the `refuse` event carries to an audit log and what
 * `requestOpenAndWait` hands back to a caller across a boundary, so write it for a reader.
 */
export type OpenGate = (attempt: OpenAttempt) => string | void;

/** The reason recorded for a gate that refuses without naming one. */
export const UNNAMED_REFUSAL = 'refused';

/**
 * Run a gate and normalise its answer: the refusal reason, or `undefined` to let the open proceed.
 *
 * **A gate that throws admits**, logged. One policy sits in front of every dialog in the app, so a
 * bug in it would otherwise take the whole surface down — and this is a policy layer over a UI,
 * not a security boundary, the same disclaimer {@link OpenRequestContext} carries. An empty string
 * is still a refusal: only `undefined` opens, so nothing a policy can return by accident is read
 * as consent.
 */
export function refusalFor(gate: OpenGate | undefined, attempt: OpenAttempt): string | undefined {
  if (!gate) {
    return undefined;
  }
  try {
    const refusal = gate(attempt);
    if (refusal === undefined) {
      return undefined;
    }
    return refusal === '' ? UNNAMED_REFUSAL : refusal;
  } catch (error) {
    log.error('Open gate threw — the open was admitted', { id: attempt.id, error });
    return undefined;
  }
}
