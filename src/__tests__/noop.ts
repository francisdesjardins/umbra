/**
 * The callback a test supplies because the option has to be present, not because anything should
 * happen — `{ onKeyDown: noop }` rather than `{ onKeyDown: () => {} }`, which reads as a stub
 * somebody meant to fill in.
 *
 * **Shared, and only for the unit and component projects.** The library itself has no site for it:
 * a step that attaches nothing returns `undefined` and the caller checks, which is the contract
 * `attach*` states — so exporting this from the root would be shipping something the library does
 * not run on.
 *
 * **Not for a case where the identity is the subject.** Two separately-written empty functions are
 * two values, and a test asserting that a changed callback rebuilds a step is asserting exactly
 * that; one shared reference would make it compare equal and quietly assert the opposite. Those
 * sites keep an inline arrow and say why.
 */
export function noop(): void {
  // Deliberately empty: see the doc above.
}
