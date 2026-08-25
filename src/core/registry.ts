/**
 * The project-level modal registry: one place a consumer declares the modals their app has, so
 * that an id stops being a bare `string` at every door the manager offers.
 *
 * Nothing here is required. The interface ships empty, and while it is empty {@link ModalId}
 * accepts any string — every existing call site stays exactly as it was.
 *
 * **Declare as few or as many as you like.** An id the registry does not name still works, so a
 * project can adopt this one modal at a time and can host modals it does not own — a third-party
 * panel, a test harness. What a declared entry buys is its contract: `useDialog` reads the payload
 * and the reasons off the id, and `close` accepts only the reasons that id declared.
 *
 * The trade is that a mistyped id is **not** an error, because an unknown id is a supported one.
 * The editor still completes the declared names, and the list is still the index — which is the
 * half that pays off when a bug report names a modal and you have to find who opens it.
 *
 * @example
 * declare module 'umbra' {
 *   interface ModalRegistry {
 *     'delete-account': { closesWith: { confirm: { id: string }; cancel: void } };
 *     'session-warning': { reason: 'extend' | 'sign-out' };
 *   }
 * }
 */

import type { DismissReason } from './dismiss-reason.js';

/**
 * One entry: `closesWith` for the close, `opensWith` for the open. Both optional, and named apart because
 * they are two directions with two levels of trust — what the dialog hands back, and what a stranger
 * hands in.
 *
 * **Advisory, not enforced.** `ModalRegistry` is filled by declaration merging, so nothing can check
 * an augmentation against this; a key none of the types below reads is ignored.
 */
export type ModalContract = {
  /**
   * What this modal closes with — the reasons alone, or a payload per reason with `void` for one
   * that carries nothing:
   *
   * ```ts
   * 'session-warning': { closesWith: 'extend' | 'sign-out' };
   * 'delete-account': { closesWith: { confirm: { id: string }; cancel: void } };
   * ```
   *
   * Two forms rather than two keys, the way {@link PortalTarget} takes a boolean or a getter: a
   * second key would be a second spelling of one act, needing a precedence rule to disagree under.
   *
   * **A declared payload is required** — `close('confirm', data)` must be given it, and a bare
   * `action('confirm')` is rejected as a close with nothing — which is what lets a `case 'confirm'`
   * read `result.data` outright. A reason that sometimes closes empty declares `Data | undefined`.
   *
   * `'dismiss'` is reserved and payload-free, added by {@link CloseOf}; naming it here is ignored.
   */
  readonly closesWith?: string | Readonly<Record<string, unknown>>;
  /** What this modal is *opened* with, checked at the ask — see {@link PayloadOf}. */
  readonly opensWith?: unknown;
};

/** The interface a project augments. Empty as shipped — see the module doc for the shape. */
// oxlint-disable-next-line typescript/no-empty-object-type -- the emptiness is the mechanism: only an interface merges, and it starts with no keys because the modals are the project's to name
export interface ModalRegistry {}

/**
 * The id every door accepts: the declared names **and** any other string, so that declaring one
 * modal does not make every undeclared one an error.
 *
 * **`(string & {})` is what keeps both halves.** A plain `keyof ModalRegistry | string` collapses
 * to `string` and the editor stops completing the names; the branded member is ignored by that
 * reduction, so the union survives long enough to be suggested.
 */
// oxlint-disable-next-line typescript/no-redundant-type-constituents -- `never` only while nobody has augmented; it becomes the union of declared ids, which is the whole mechanism
export type ModalId = keyof ModalRegistry | (string & {});

/**
 * The declared close map, or `never` for an id that declares none — the one place the `closesWith` key
 * is read, so the types below cannot disagree about what a contract said.
 */
type ClosesWithOf<TId> = TId extends keyof ModalRegistry
  ? ModalRegistry[TId] extends { readonly closesWith: infer TCloses }
    ? TCloses
    : never
  : never;

/**
 * The reasons one id may close with, beside {@link DismissReason} which every modal has. `string`
 * for an id the registry does not name, or names without reasons.
 *
 * Both forms of `closesWith` answer here — the bare union as itself, the map through its keys.
 */
export type ReasonOf<TId> = TId extends keyof ModalRegistry
  ? ModalRegistry[TId] extends { readonly closesWith: infer TCloses }
    ? TCloses extends string
      ? TCloses
      : Exclude<keyof TCloses & string, DismissReason>
    : string
  : string;

/**
 * What one declared reason closes with — `void` when it carries nothing, which is what makes the
 * second argument of `close` required for the reasons that do and absent for the rest.
 */
export type DataOfReason<TId, TReason> =
  ClosesWithOf<TId> extends string
    ? void
    : TReason extends keyof ClosesWithOf<TId>
      ? ClosesWithOf<TId>[TReason]
      : void;

/**
 * The payload one id closes with, across all of its reasons, or `void` when none carries one.
 *
 * **The union, with `void` excluded** — the `TData` of the flat internal model (the store, the
 * resolver queue, {@link CloseResult}), which is generic over one payload; {@link CloseOf} holds the
 * correlation. `CloseResult.data` is already optional, so a `void` member would be one every hop
 * carries and none can use.
 *
 * **Reading through `infer` and `keyof` is load-bearing twice over.** A `Record<string, …>` pattern
 * matches a type literal and not an `interface`, which has no index signature — the contract would
 * answer `void` there while {@link ReasonOf} read it correctly. And un-augmented this conditional
 * stays deferred, so the checker compares against the union of its branches: narrow that union and
 * the manager's facade silently stops implementing its own interface.
 */
export type DataOf<TId> = TId extends keyof ModalRegistry
  ? ModalRegistry[TId] extends { readonly closesWith: infer TClosesWith }
    ? TClosesWith extends string
      ? void
      : [Exclude<TClosesWith[keyof TClosesWith], void>] extends [never]
        ? void
        : Exclude<TClosesWith[keyof TClosesWith], void>
    : void
  : void;

/**
 * The reasons that close with nothing — what a door with no way to carry a payload may ask for.
 *
 * `dialogManager.close(id, reason)` is that door: the registry is keyed by string and the manager
 * holds no `TData`, so offering a reason whose contract requires one would be offering a close it
 * cannot make. A payload goes through the typed doors — `handle.close(reason, data)`, or an action.
 */
export type PayloadFreeReasonOf<TId> = {
  [TReason in ReasonOf<TId>]: DataOfReason<TId, TReason> extends void ? TReason : never;
}[ReasonOf<TId>];

/**
 * How one declared modal closed, as a union correlated by `reason` — so a `switch` on it narrows
 * `data` to what *that* reason carries, instead of leaving it optional on every branch.
 *
 * **A reason carrying nothing keeps `data` present and optional** (`data?: undefined`): the store
 * writes a bare `{ reason }`, which under `exactOptionalPropertyTypes` only the optional form
 * accepts, and dropping the key would make `result.data` a property-access error on the branches
 * where reading it is how you find out there is nothing.
 *
 * **Stated in the registered-id overloads and nowhere else.** A correlated union is opaque at a
 * generic boundary the way a conditional is — see {@link CloseResult}, a plain object for that
 * reason — so the internals never name it and never have to prove a value inhabits it.
 */
export type CloseOf<TId> =
  | {
      [TReason in ReasonOf<TId>]: DataOfReason<TId, TReason> extends void
        ? { readonly reason: TReason; readonly data?: undefined }
        : { readonly reason: TReason; readonly data: DataOfReason<TId, TReason> };
    }[ReasonOf<TId>]
  | { readonly reason: DismissReason; readonly data?: undefined };

/**
 * The payload one id is *opened* with — what {@link DataOf} is for the other direction, and what
 * closes the loop the registry had left half-open: `requestOpenAndWait` narrowed its result off
 * the id while its argument stayed `unknown`, in the same call.
 *
 * **`unknown` for an id the registry does not name**, rather than `void` the way `DataOf` falls
 * back: an undeclared close carries nothing until someone says otherwise, but an undeclared open
 * carries whatever crossed the boundary, and `void` would be a claim about a stranger's message.
 *
 * **A declaration is not a validation, and the distinction is the whole reason `OpenRequest` was
 * written untyped.** This types the call sites a project owns — the ask is checked against what the
 * modal said it takes — and it cannot check what arrives from outside the project, because nothing
 * at compile time can. A dialog genuinely reachable by strangers (a microfrontend bridge, a
 * `postMessage` relay) still parses before believing; what it gains here is a name to parse *to*.
 */
export type PayloadOf<TId> = TId extends keyof ModalRegistry
  ? ModalRegistry[TId] extends { readonly opensWith: infer TPayload }
    ? TPayload
    : unknown
  : unknown;

/**
 * Whether a project has opted in at all — the discriminator the hook overloads switch on, so that
 * an empty registry resolves to today's signature rather than to an uninhabitable one.
 */
export type RegisteredModalId = keyof ModalRegistry;
