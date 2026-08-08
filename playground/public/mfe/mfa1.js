// MFA 1 — "Checkout", a React microfrontend.
//
// The three specifiers below resolve to the same file — the host's import map says so — but they
// are written apart because that is what they are: the library exports no React, and `react`
// here is React. No JSX and no build step, so `createElement` is what a browser can run as-is;
// the point being made is about *sharing a manager*, not about tooling.
//
// It owns `checkout:receipt` through the React binding, and it asks Billing — a microfrontend it
// never imports — to open a dialog it does not own.
import { createOpenRequest, dialogManager, Key, useModal } from 'umbra';
import { createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { logTo } from './binding.js';

const LOG = 'mfa1-log';

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

  const receipt = useModal({
    id: 'checkout:receipt',
    ariaLabel: 'Receipt',
    // Billing can ask this dialog to open too — the traffic runs both ways.
    onOpenRequest: (payload, request) => {
      const from = request.context?.source ?? 'anonymous';
      logTo(LOG, 'in', `${from} asked me to show a receipt`);
      logTo(LOG, 'yes', 'opening checkout:receipt');
      void receipt.open();
    },
    render: ({ action }) => {
      // `loading` is the one prop a raw <button> cannot take — React warns on it. Every other
      // field of an action's props is a real DOM prop, `aria-keyshortcuts` and
      // `data-focus-on-open` included, which is what makes the hotkey and the opening focus
      // work here with no wrapper of any kind.
      const { loading, ...ok } = action('ok', { hotkey: Key.Enter, focusOnOpen: true });
      return h(
        'div',
        // `checkout` is what tints this dialog with its owner's colour — the modal Billing can
        // ask for still looks like Checkout's, because Checkout is the one that renders it.
        { className: 'panel checkout' },
        h('div', { className: 'owner' }, "Checkout's dialog"),
        h('h3', null, 'Receipt'),
        h('p', null, `Order total: ${amount}$`),
        h('div', { className: 'row' }, h('button', ok, loading ? 'Working…' : 'Done ⏎'))
      );
    },
    onClose: (result) => {
      logTo(LOG, 'note', `checkout:receipt closed — "${result.reason}"`);
    },
  });

  // Same skeleton as the plain-JS panel opposite — a field, then a button row. The two are
  // written in different frameworks and share no components; only the host's stylesheet.
  return h(
    'div',
    { className: 'controls' },
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
          onClick: () => {
            logTo(LOG, 'out', `asked billing:confirm to open — ${amount}$`);
            // The whole demo: a dialog owned by another microfrontend, asked to open — and the
            // answer coming back, which is what makes it a conversation rather than a shout.
            void dialogManager
              .requestOpenAndWait(
                'billing:confirm',
                createOpenRequest({ amount }, { source: 'checkout' })
              )
              .then(async (outcome) => {
                if (!outcome.accepted) {
                  logTo(LOG, 'no', `billing refused — ${outcome.reason}`);
                  return;
                }
                const [, result] = await outcome.closed;
                // Symmetric with Billing's own check: what came back crossed the same boundary,
                // so it is `unknown` here until this side says otherwise.
                const receipt = asReceipt(result?.data);
                logTo(
                  LOG,
                  'yes',
                  receipt === null
                    ? `billing answered — "${result?.reason ?? 'inconnu'}" (sans reçu)`
                    : `billing paid ${receipt.amount}$ — ${receipt.transactionId}`
                );
              });
          },
        },
        'Ask Billing to confirm'
      ),
      h(
        'button',
        {
          onClick: () => {
            void receipt.open();
          },
        },
        'Open my own receipt'
      )
    ),
    receipt.Modal
  );
}

createRoot(document.getElementById('mfa1-root')).render(h(Checkout));

// One manager on the page, so this hears Billing's dialog as well as its own.
dialogManager.subscribe((event) => {
  if (event.id !== 'checkout:receipt') {
    logTo(LOG, 'bus', `${event.id} ${event.type}${event.reason ? ` — "${event.reason}"` : ''}`);
  }
});

logTo(LOG, 'note', 'ready — React binding, owns "checkout:receipt"');
