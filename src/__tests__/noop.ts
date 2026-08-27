/**
 * The callback a test supplies because the option has to be present, not because anything should
 * happen — `{ onKeyDown: noop }` rather than `{ onKeyDown: () => {} }`, which reads as a stub
 * somebody meant to fill in.
 *
 * **Shared, and only for the unit and component projects.** A step that attaches nothing returns
 * `undefined` and the caller checks, so exporting this from the root would ship something the
 * library does not run on.
 *
 * **Not where the identity is the subject.** Two separately-written empty functions are two values,
 * and a test asserting that a changed callback rebuilds a step is asserting exactly that; one
 * shared reference would quietly assert the opposite. Those sites keep an inline arrow.
 */
export function noop(): void {
  // Deliberately empty: see the doc above.
}
