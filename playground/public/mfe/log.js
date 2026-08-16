/**
 * The five things any side ever has to say, as glyphs. Three microfrontends writing into three
 * columns produce a transcript nobody can read unless the direction is in the line itself: who
 * asked, who was asked, and who decided.
 */
const MARKS = { out: '→', in: '←', yes: '✓', no: '✗', bus: '~', note: '·' };

/**
 * A log function bound to one microfrontend's panel — its id is the only thing that varies.
 *
 * Bound once per script rather than passed on every line: four panels' worth of calls read as
 * `log('yes', '…')`, which is the shape a log line wants.
 *
 * Lines go at the top of the panel, newest **first**.
 *
 * Newest-last is the transcript order and it is the wrong one here: four panels fill at once, and
 * the line that explains what just happened was the one below the fold. So the box is a fixed
 * height that scrolls (`host.html`), and the interesting end of it is the end you are already
 * looking at. Scrolling is for the curious, not for keeping up.
 *
 * Nothing is scrolled into view on purpose. Prepending above the viewport would shove a reader's
 * place down the box; scroll anchoring holds it instead, so someone reading history keeps reading
 * history while the top of the list moves on without them.
 *
 * The only thing this file still holds. Driving a hand-written `<dialog>` from the manager used to
 * live here too, as forty lines of hand-rolled store — which was the demo's way of saying "a
 * binding is cheap". It ships now, as `umbra/vanilla`, so Billing imports it like anyone else
 * would: the argument is better made by a binding you can install than by one you must copy.
 *
 * @param {string} elementId
 * @returns {(kind: 'out'|'in'|'yes'|'no'|'bus'|'note', message: string) => void}
 */
export function createLog(elementId) {
  return (kind, message) => {
    const box = document.getElementById(elementId);
    if (!box) {
      return;
    }
    const line = document.createElement('div');
    line.className = kind;
    line.textContent = `${MARKS[kind]} ${message}`;
    box.prepend(line);
  };
}
