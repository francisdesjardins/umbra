/**
 * What a `closesWith` contract buys, against the real hooks rather than a restatement of their types.
 *
 * Every rejection is a `@ts-expect-error`, so this file fails **both** ways: a guarantee that breaks
 * errors here, and one that quietly becomes `any` leaves a directive unused, which is also an error.
 *
 * Run by `yarn type-check:registry`, which compiles the augmented world on its own.
 */

import { dialogManager } from '../src/manager/dialog-manager.js';
import { useDialog } from '../src/react/use-dialog.js';
import { useMessageModal } from '../src/react/templates/use-message-modal.js';
import type { CloseOf, DataOf, ReasonOf } from '../src/core/registry.js';

declare module '../src/core/registry.js' {
  interface ModalRegistry {
    'archive-room': {
      closesWith: {
        confirm: { room: string };
        cancel: void;
      };
    };
    /** Every reason payload-free — the shape that must still resolve to `void`, not `never`. */
    'shift-notice': { closesWith: { acknowledge: void; snooze: void } };
    /** The bare-union form: the same thing said shorter, for a modal where none carries one. */
    'shift-brief': { closesWith: 'acknowledge' | 'snooze' };
    'archive-iface': { closesWith: ArchiveCloses };
  }
}

/**
 * An `interface` because that is the subject: it has no index signature, so a contract read through
 * a `Record<…>` pattern answers `void` here while `ReasonOf` reads it correctly. As a `type` this is
 * `archive-room` again and `_InterfaceReadsTheSame` below passes while proving nothing.
 */
interface ArchiveCloses {
  confirm: { room: string };
  cancel: void;
}

// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- the two-signature identity trick needs a parameter the rule counts as used once
type Equals<A, B> =
  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- the two-signature identity trick needs a parameter the rule counts as used once
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;

// ── What the contract resolves to ────────────────────────────────────────────

export type _ReasonsAreTheKeys = Assert<Equals<ReasonOf<'archive-room'>, 'cancel' | 'confirm'>>;

/** `DataOf` is the flat model's opensWith: the union of what the reasons carry, `void` dropped. */
export type _DataIsTheUnionWithoutVoid = Assert<Equals<DataOf<'archive-room'>, { room: string }>>;

/** All-`void` reasons answer `void`, the same as a modal that declared no payload at all. */
export type _AllVoidIsVoid = Assert<Equals<DataOf<'shift-notice'>, void>>;

/** An `interface` reads the same as a type literal — it matches no `Record<…>` pattern. */
export type _InterfaceReadsTheSame = Assert<
  Equals<DataOf<'archive-iface'>, DataOf<'archive-room'>>
>;

/** The two forms are one contract: the bare union answers exactly what the all-`void` map does. */
export type _BriefReasons = Assert<Equals<ReasonOf<'shift-brief'>, 'acknowledge' | 'snooze'>>;
export type _BriefIsVoid = Assert<Equals<DataOf<'shift-brief'>, void>>;
export type _FormsAgree = Assert<Equals<ReasonOf<'shift-brief'>, ReasonOf<'shift-notice'>>>;

/** A payload-free reason keeps `data` present and optional, so the store's bare `{ reason }` fits. */
export const _bareReasonAssigns: CloseOf<'archive-room'> = { reason: 'cancel' };
export const _dismissAssigns: CloseOf<'archive-room'> = { reason: 'dismiss' };

// @ts-expect-error a reason that declares a payload is not inhabited without one
export const _confirmNeedsData: CloseOf<'archive-room'> = { reason: 'confirm' };

// @ts-expect-error and one that declares none cannot carry it
export const _cancelRejectsData: CloseOf<'archive-room'> = {
  reason: 'cancel',
  data: { room: 'a' },
};

// ── At the hook ──────────────────────────────────────────────────────────────

export function Hook() {
  return useDialog({
    id: 'archive-room',
    ariaLabel: 'Archive room',
    render: ({ action, handle }) => {
      handle.close('confirm', { room: '12' });
      handle.close('cancel');
      handle.close('dismiss');
      handle.close();

      // @ts-expect-error confirm declares a payload and must be given one
      handle.close('confirm');

      // @ts-expect-error cancel declares none
      handle.close('cancel', { room: '12' });

      // @ts-expect-error the payload is checked, not merely required
      handle.close('confirm', { room: 12 });

      // @ts-expect-error a reason belonging to no declaration
      handle.close('archive');

      action('cancel');
      action('confirm', (close) => {
        close({ room: '12' });
      });

      // @ts-expect-error a bare action on a payload reason would auto-close with nothing
      action('confirm');

      // @ts-expect-error and so would an options object without a handler
      action('confirm', { hotkey: 'Enter' });

      action('confirm', (close) => {
        // @ts-expect-error and its close is typed too
        close({ room: 12 });
      });

      return null;
    },
    onClose: (result) => {
      switch (result.reason) {
        case 'confirm': {
          const room: string = result.data.room;
          void room;

          // @ts-expect-error narrowed to the real payload, not `any`
          const wrong: number = result.data.room;
          void wrong;
          return;
        }
        case 'cancel': {
          // Reading it is how you find out there is nothing — the key is present and always absent.
          const nothing: undefined = result.data;
          return nothing;
        }
        case 'dismiss':
          return;
      }
    },
  });
}

/** The template hooks inherit it — the registered door is the same shape one layer up. */
export function Template() {
  return useMessageModal({
    id: 'archive-room',
    ariaLabel: 'Archive room',
    render: ({ handle }) => {
      handle.close('confirm', { room: '12' });
      // @ts-expect-error the contract reaches through the template
      handle.close('confirm');
      return null;
    },
  });
}

/** And `openAndWait` narrows the same way, through the tuple. */
export async function _awaited() {
  const [error, result] = await Hook().openAndWait();
  if (error !== null) {
    return;
  }
  if (result.reason === 'confirm') {
    const room: string = result.data.room;
    void room;
  }
}

/** The manager's imperative twin, typed by the same contract. */
export async function _manager() {
  const [error, result] = await dialogManager.openAndWait('archive-room');
  if (error !== null) {
    return;
  }
  if (result.reason === 'cancel') {
    const nothing: undefined = result.data;
    return nothing;
  }
}
