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
 * One entry, named for what {@link CloseResult} and {@link OpenRequest} already call them —
 * `reason`, `data` and `payload`, not a second spelling of any of them. All optional: a modal that
 * closes with no payload declares only its reasons, one whose reasons are open declares only its
 * payload, and `payload` is for the modals a project also opens *from* somewhere.
 *
 * **`data` is what it closes with and `payload` is what it opens with**, which is the same
 * distinction `OpenRequest` draws and for the same reason: two directions, two levels of trust,
 * and a shared word would confuse them.
 */
export type ModalContract = {
  readonly data?: unknown;
  readonly reason?: string;
  readonly payload?: unknown;
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
  ? ModalRegistry[TId] extends { readonly payload: infer TPayload }
    ? TPayload
    : unknown
  : unknown;

/**
 * Whether a project has opted in at all — the discriminator the hook overloads switch on, so that
 * an empty registry resolves to today's signature rather than to an uninhabitable one.
 */
export type RegisteredModalId = keyof ModalRegistry;
