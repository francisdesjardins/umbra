/**
 * The project-level modal registry: one place a consumer declares the modals their app has, so
 * that an id stops being a bare `string` at every door the manager offers.
 *
 * Nothing here is required. The interface ships empty, which resolves {@link ModalId} to `string`
 * and leaves every existing call site exactly as it was. A project opts in by augmenting it:
 *
 * @example
 * declare module 'umbra' {
 *   interface ModalRegistry {
 *     'delete-account': { data: { id: string }; reason: 'confirm' | 'cancel' };
 *     'session-warning': { reason: 'extend' | 'sign-out' };
 *   }
 * }
 *
 * **Declaring one modal declares them all.** Once the interface has a key, an id the registry does
 * not name is a type error everywhere — which is the point, and is why partial adoption is not a
 * supported state. A genuinely computed id says so at the call site with `as ModalId`.
 */

/**
 * One entry, named for what {@link CloseResult} already calls them — `reason` and `data`, not a
 * second spelling of either. Both optional: a modal that closes with no payload declares only its
 * reasons, and one whose reasons are open declares only its payload.
 */
export type ModalContract = {
  readonly data?: unknown;
  readonly reason?: string;
};

/** The interface a project augments. Empty as shipped — see the module doc for the shape. */
// oxlint-disable-next-line typescript/no-empty-object-type -- the emptiness is the mechanism: only an interface merges, and it starts with no keys because the modals are the project's to name
export interface ModalRegistry {}

/**
 * The id every door accepts: `string` until a project declares its modals, the union of their
 * names afterwards.
 *
 * **The brackets are load-bearing.** A naked `keyof ModalRegistry extends never` distributes over
 * `never` and evaluates to `never`, so the fallback is unreachable and every call site in every
 * project that has not opted in stops compiling.
 */
export type ModalId = [keyof ModalRegistry] extends [never] ? string : keyof ModalRegistry;

/**
 * The reasons one id may close with, beside {@link DismissReason} which every modal has. `string`
 * for an id the registry does not name, or names without reasons.
 */
export type ReasonOf<TId> = TId extends keyof ModalRegistry
  ? ModalRegistry[TId] extends { readonly reason: infer TReason extends string }
    ? TReason
    : string
  : string;

/** The payload one id closes with, or `void` when the registry names none for it. */
export type DataOf<TId> = TId extends keyof ModalRegistry
  ? ModalRegistry[TId] extends { readonly data: infer TData }
    ? TData
    : void
  : void;

/**
 * Whether a project has opted in at all — the discriminator the hook overloads switch on, so that
 * an empty registry resolves to today's signature rather than to an uninhabitable one.
 */
export type RegisteredModalId = keyof ModalRegistry;
