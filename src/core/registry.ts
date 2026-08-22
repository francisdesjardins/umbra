/**
 * The project-level modal registry: one place a consumer declares the modals their app has, so
 * that an id stops being a bare `string` at every door the manager offers.
 *
 * Nothing here is required. The interface ships empty, and while it is empty {@link ModalId}
 * accepts any string — every existing call site stays exactly as it was.
 *
 * **Declare as few or as many as you like.** An id the registry does not name still works, so a
 * project can adopt this one modal at a time and can host modals it does not own — a third-party
 * panel, a test harness. What a declared entry buys is its contract: `useModal` reads `data` and
 * `reason` off the id, and `close` accepts only the reasons that id declared.
 *
 * The trade is that a mistyped id is **not** an error, because an unknown id is a supported one.
 * The editor still completes the declared names, and the list is still the index — which is the
 * half that pays off when a bug report names a modal and you have to find who opens it.
 *
 * @example
 * declare module 'umbra' {
 *   interface ModalRegistry {
 *     'delete-account': { data: { id: string }; reason: 'confirm' | 'cancel' };
 *     'session-warning': { reason: 'extend' | 'sign-out' };
 *   }
 * }
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
