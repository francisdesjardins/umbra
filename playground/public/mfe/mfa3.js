// MFA 3 — "Support", a Solid microfrontend.
//
// The third framework on the page, and the reason it is here: `useModal` from `umbra/solid` is
// the same call, with the same options and the same return, as the one Checkout makes from
// `umbra/react` twenty lines away. Two bindings, one core — which is the claim the library makes
// about React being optional, made twice.
//
// No JSX and no build step (Solid's JSX *is* a build step), so `h` is what a browser can run
// as-is — the mirror of Checkout's `createElement`. What is not a compromise: the modal itself is
// the real binding, fine-grained reactivity included. `action(...)` returns props whose live
// fields are getters, and Solid's hyperscript detects them and tracks each one, so the button's
// `disabled` follows the running action without anything re-rendering.
import { useModal } from 'umbra/solid';
import { createOpenRequest, dialogManager } from 'umbra';
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import h from 'solid-js/h';
import { logTo } from './log.js';

const LOG = 'mfa3-log';

/**
 * The same two glyphs Checkout draws, and deliberately the same paths: an arrow leaving for a
 * dialog this panel does not own, a window for the one it does.
 *
 * Spelled with hyphenated SVG attributes rather than React's camelCase — hyperscript sets them on
 * the element as written, which is the one place the two panels' source has to differ.
 */
const ASK = ['M5 12h13', 'M12 5l7 7-7 7'];
const MINE = ['M4 5h16v14H4z', 'M4 9h16'];

const icon = (paths) => {
  return h(
    'svg',
    {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    },
    ...paths.map((d) => {
      return h('path', { d });
    })
  );
};

/**
 * What Billing sends when a charge is refused. `unknown` on arrival, like every payload that
 * crossed an ownership boundary.
 *
 * @param {unknown} payload
 * @returns {{amount: number, limit: number} | null}
 */
function asRefusal(payload) {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const { amount, limit } = payload;
  return typeof amount === 'number' && typeof limit === 'number' ? { amount, limit } : null;
}

function Support() {
  const [reference, setReference] = createSignal('INV-204');
  const [subject, setSubject] = createSignal(null);

  const ticket = useModal({
    id: 'support:ticket',
    ariaLabel: 'Support ticket',

    // Billing asks for this dialog when it turns a charge down: the customer is owed an
    // explanation, and Support is the microfrontend that owns saying so. Neither side imports
    // the other — they share the manager, and that is all.
    onOpenRequest: (payload, request) => {
      const from = request.context?.source ?? 'anonymous';
      const refusal = asRefusal(payload);
      if (refusal === null) {
        logTo(LOG, 'no', `refused — ${from} sent nothing I can open a ticket about`);
        request.refuse('no-refusal-details');
        return;
      }
      logTo(LOG, 'in', `${from} refused ${refusal.amount}$ (limit ${refusal.limit}$)`);
      setSubject(refusal);
      logTo(LOG, 'yes', 'accepted — opening support:ticket');
      void ticket.open();
    },

    render: ({ action }) => {
      // Straight onto a bare <button>, whole. Every field an action hands out is a real DOM
      // prop — `aria-keyshortcuts` and `data-focus-on-open` included — which is what makes the
      // hotkey and the opening focus work here with no wrapper of any kind.
      const escalate = action('escalated', { hotkey: 'Enter', focusOnOpen: true });
      const close = action('closed');
      const current = subject();

      return h(
        'div',
        // `support` is what tints this dialog with its owner's colour — the modal Billing asked
        // for still looks like Support's, because Support is the one that renders it.
        { class: 'panel support' },
        h('div', { class: 'owner' }, "Support's dialog"),
        h('h3', null, 'Open a ticket'),
        h(
          'p',
          null,
          current === null
            ? 'No charge attached to this ticket.'
            : `A ${current.amount}$ charge was refused over the ${current.limit}$ limit.`
        ),
        h(
          'div',
          { class: 'row' },
          h('button', close, 'Close it'),
          h('button', escalate, () => {
            return escalate['data-loading'] ? 'Working…' : 'Escalate ⏎';
          })
        )
      );
    },

    onClose: (result) => {
      logTo(LOG, 'note', `support:ticket closed — "${result.reason}"`);
      setSubject(null);
    },
  });

  // Same skeleton as the two panels beside it — a field with its buttons beside it. The three are
  // written in three different ways and share no components; only the host's stylesheet.
  return h(
    'div',
    { class: 'controls' },
    h(
      'div',
      { class: 'field-line' },
      h(
        'label',
        { class: 'field' },
        h('span', null, 'Order reference'),
        h('input', {
          type: 'text',
          get value() {
            return reference();
          },
          onInput: (event) => {
            return setReference(event.target.value);
          },
        })
      ),
      h(
        'div',
        { class: 'row' },
        h(
          'button',
          {
            class: 'iconbtn',
            'aria-label': 'Ask Checkout',
            'data-tip': 'Ask Checkout',
            onClick: () => {
              logTo(LOG, 'out', `asked checkout:receipt to open — ${reference()}`);
              // A support agent looking up a customer's receipt: a dialog owned by another
              // microfrontend, asked for by name, with the answer coming back.
              void dialogManager
                .requestOpenAndWait(
                  'checkout:receipt',
                  createOpenRequest({ ref: reference() }, { source: 'support' })
                )
                .then(async (outcome) => {
                  if (!outcome.accepted) {
                    logTo(LOG, 'no', `checkout refused — ${outcome.reason}`);
                    return;
                  }
                  const [, result] = await outcome.closed;
                  logTo(LOG, 'yes', `checkout answered — "${result?.reason ?? 'inconnu'}"`);
                });
            },
          },
          icon(ASK)
        ),
        h(
          'button',
          {
            class: 'iconbtn',
            'aria-label': 'Open my ticket',
            'data-tip': 'Open my ticket',
            onClick: () => {
              void ticket.open();
            },
          },
          icon(MINE)
        )
      )
    ),
    // The dialog itself. `Modal` is a real DOM node here rather than a description of one —
    // Solid owns its elements — so placing it is the same one word it is in React.
    ticket.Modal
  );
}

render(() => {
  return h(Support);
}, document.getElementById('mfa3-root'));

// One manager on the page, so this hears the other two microfrontends' dialogs as well as its own.
dialogManager.subscribe((event) => {
  if (event.id !== 'support:ticket') {
    logTo(LOG, 'bus', `${event.id} ${event.type}${event.reason ? ` — "${event.reason}"` : ''}`);
  }
});

logTo(LOG, 'note', 'ready — Solid binding, owns "support:ticket"');
