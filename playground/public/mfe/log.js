/**
 * The five things any side ever has to say, as glyphs. Three microfrontends writing into three
 * columns produce a transcript nobody can read unless the direction is in the line itself: who
 * asked, who was asked, and who decided.
 */
const MARKS = { out: '→', in: '←', yes: '✓', no: '✗', bus: '~', note: '·' };

/**
 * Append a line to a microfrontend's log panel, newest last.
 *
 * The only thing this file still holds. Driving a hand-written `<dialog>` from the manager used to
 * live here too, as forty lines of hand-rolled store — which was the demo's way of saying "a
 * binding is cheap". It ships now, as `umbra/vanilla`, so Billing imports it like anyone else
 * would: the argument is better made by a binding you can install than by one you must copy.
 *
 * @param {string} elementId
 * @param {'out'|'in'|'yes'|'no'|'bus'|'note'} kind
 * @param {string} message
 */
export function logTo(elementId, kind, message) {
  const box = document.getElementById(elementId);
  if (!box) {
    return;
  }
  const line = document.createElement('div');
  line.className = kind;
  line.textContent = `${MARKS[kind]} ${message}`;
  box.append(line);
  box.scrollTop = box.scrollHeight;
}
