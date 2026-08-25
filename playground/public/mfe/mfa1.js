// MFA 1 — "Checkout", a React microfrontend.
//
// The specifiers below are the package's real ones: `umbra` is the framework-free library,
// `umbra/react` is its React binding, and `react` is React. The host's import map points them at
// modules from one build, so everything underneath is shared — but they stay written apart,
// because that is what they are. No JSX and no build step, so `createElement` is what a browser
// can run as-is; the point being made is about *sharing a manager*, not about tooling.
//
// It owns `checkout:receipt` through the React binding, and it asks Billing — a microfrontend it
// never imports — to open a dialog it does not own.
import { createOpenRequest, dialogManager, Key } from 'umbra';
import { useDialog } from 'umbra/react';
import { createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createLog } from './log.js';

const LOG = 'mfa1-log';
const log = createLog(LOG);

/**
 * The two panel glyphs, drawn rather than imported — nothing here has a bundler to pull an icon
 * set through, and two paths are cheaper than a font.
 *
 * `ASK` is an arrow leaving: this panel asking another to open a dialog it does not own. `MINE`
 * is a window: opening the one it does own. The distinction is the demo's whole subject, so it is
 * the one thing the glyphs have to carry; *which* microfrontend is being asked lives in the
 * tooltip and in `aria-label`, because no icon can say "Billing".
 */
const ASK = ['M5 12h13', 'M12 5l7 7-7 7'];
const MINE = ['M4 5h16v14H4z', 'M4 9h16'];

/** React spells the SVG presentation attributes in camelCase; Solid's hyperscript does not. */
const icon = (paths) => {
  return h(
    'svg',
    {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': true,
    },
    ...paths.map((d) => {
      return h('path', { key: d, d });
    })
  );
};

/**
 * What Billing says when it approves. `unknown` on arrival, like every payload that crossed an
 * ownership boundary — the direction does not change the rule.
 *
 * @param {unknown} data
 * @returns {{transactionId: string, amount: number} | null}
 */
function asReceipt(data) {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const { transactionId, amount } = data;
  return typeof transactionId === 'string' && typeof amount === 'number'
    ? { transactionId, amount }
    : null;
}

function Checkout() {
  const [amount, setAmount] = useState(240);

  const receipt = useDialog({
    id: 'checkout:receipt',
    ariaLabel: 'Receipt',
    // Billing can ask this dialog to open too — the traffic runs both ways.
    onOpenRequest: (payload, request) => {
      const from = request.context?.source ?? 'anonymous';
      log('in', `${from} asked me to show a receipt`);
      log('yes', 'opening checkout:receipt');
      void receipt.open();
    },
    render: ({ action }) => {
      // Straight onto a bare <button>, whole. Every field an action hands out is a real DOM
      // prop — `aria-keyshortcuts` and `data-focus-on-open` included, which is what makes the
      // hotkey and the opening focus work here with no wrapper of any kind.
      const ok = action('ok', { hotkey: Key.Enter, focusOnOpen: true });
      return h(
        'div',
        // `checkout` is what tints this dialog with its owner's colour — the modal Billing can
        // ask for still looks like Checkout's, because Checkout is the one that renders it.
        { className: 'panel checkout' },
        h('div', { className: 'owner' }, "Checkout's dialog"),
        h('h3', null, 'Receipt'),
        h('p', null, `Order total: ${amount}$`),
        h('div', { className: 'row' }, h('button', ok, ok['data-loading'] ? 'Working…' : 'Done ⏎'))
      );
    },
    onClose: (result) => {
      log('note', `checkout:receipt closed — "${result.reason}"`);
    },
  });

  // Same skeleton as the plain-JS panel opposite — a field with its buttons beside it. The two
  // are written in different frameworks and share no components; only the host's stylesheet.
  return h(
    'div',
    { className: 'controls' },
    h(
      'div',
      { className: 'field-line' },
      h(
        'label',
        { className: 'field' },
        h('span', null, 'Amount ($)'),
        h('input', {
          type: 'number',
          value: amount,
          min: 0,
          step: 20,
          onChange: (event) => {
            return setAmount(Number(event.target.value));
          },
        })
      ),
      h(
        'div',
        { className: 'row' },
        h(
          'button',
          {
            className: 'iconbtn',
            'aria-label': 'Ask Billing',
            'data-tip': 'Ask Billing',
            onClick: () => {
              log('out', `asked billing:confirm to open — ${amount}$`);
              // The whole demo: a dialog owned by another microfrontend, asked to open — and the
              // answer coming back, which is what makes it a conversation rather than a shout.
              void dialogManager
                .requestOpenAndWait(
                  'billing:confirm',
                  createOpenRequest({ amount }, { source: 'checkout' })
                )
                .then(async (outcome) => {
                  if (!outcome.accepted) {
                    log('no', `billing refused — ${outcome.reason}`);
                    return;
                  }
                  const [, result] = await outcome.closed;
                  // Symmetric with Billing's own check: what came back crossed the same boundary,
                  // so it is `unknown` here until this side says otherwise.
                  const receipt = asReceipt(result?.data);
                  log(
                    'yes',
                    receipt === null
                      ? `billing answered — "${result?.reason ?? 'inconnu'}" (sans reçu)`
                      : `billing paid ${receipt.amount}$ — ${receipt.transactionId}`
                  );
                });
            },
          },
          icon(ASK)
        ),
        h(
          'button',
          {
            className: 'iconbtn',
            'aria-label': 'Open my receipt',
            'data-tip': 'Open my receipt',
            onClick: () => {
              void receipt.open();
            },
          },
          icon(MINE)
        )
      )
    ),
    receipt.Dialog
  );
}

createRoot(document.getElementById('mfa1-root')).render(h(Checkout));

// One manager on the page, so this hears Billing's dialog as well as its own.
dialogManager.subscribe((event) => {
  if (event.id !== 'checkout:receipt') {
    log('bus', `${event.id} ${event.type}${event.reason ? ` — "${event.reason}"` : ''}`);
  }
});

log('note', 'ready — React binding, owns "checkout:receipt"');
