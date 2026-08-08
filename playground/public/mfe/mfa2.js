// MFA 2 — "Billing". It owns a dialog and decides who may open it.
//
// It never imports MFA 1, and MFA 1 never imports it. The only thing they share is the module the
// import map points both of them at, which is why `requestOpen` can cross between them at all.
import { createOpenRequest, dialogManager } from 'umbra';
import { bindDialog, logTo } from './binding.js';

const LOG = 'mfa2-log';

/** Above this, the request is refused. Shown on the panel, so the rule is not a hidden one. */
const APPROVAL_LIMIT = 500;

let pending = null;

const dialog = /** @type {HTMLDialogElement} */ (document.getElementById('mfa2-dialog'));

const billing = bindDialog({
  id: 'billing:confirm',
  dialog,

  // The whole point of `requestOpen`: the caller asks, this side decides. A payload that crossed
  // an ownership boundary is `unknown` until this function says otherwise.
  onOpenRequest: (payload, request) => {
    const from = request.context?.source ?? 'anonymous';
    const amount =
      typeof payload === 'object' && payload !== null && typeof payload.amount === 'number'
        ? payload.amount
        : null;

    logTo(
      LOG,
      'in',
      `${from} asked to charge ${amount === null ? 'nothing usable' : `${amount}$`}`
    );

    // `refuse` is the answer channel: returning would also decline, but silently — and a caller
    // across an ownership boundary that never hears why cannot tell its user anything.
    if (amount === null) {
      logTo(LOG, 'no', 'refused — the payload carries no amount');
      request.refuse('no-amount');
      return;
    }
    if (amount > APPROVAL_LIMIT) {
      logTo(LOG, 'no', `refused — over the ${APPROVAL_LIMIT}$ limit`);
      request.refuse(`over-limit:${APPROVAL_LIMIT}`);
      return;
    }

    pending = { amount, from };
    document.getElementById('mfa2-amount').textContent = `${amount}$`;
    document.getElementById('mfa2-from').textContent = from;
    logTo(LOG, 'yes', 'accepted — opening billing:confirm');
    billing.open();
  },

  onClose: (result) => {
    logTo(LOG, 'note', `billing:confirm closed — "${result.reason}"`);
    pending = null;
  },
});

document.getElementById('mfa2-limit').textContent = `${APPROVAL_LIMIT}$`;

// The traffic runs both ways: Billing asks Checkout for a dialog it does not own either.
document.getElementById('mfa2-ask').addEventListener('click', () => {
  logTo(LOG, 'out', 'asked checkout:receipt to open');
  void dialogManager
    .requestOpenAndWait(
      'checkout:receipt',
      createOpenRequest({ ref: 'INV-204' }, { source: 'billing' })
    )
    .then(async (outcome) => {
      if (!outcome.accepted) {
        logTo(LOG, 'no', `checkout refused — ${outcome.reason}`);
        return;
      }
      const [, result] = await outcome.closed;
      logTo(LOG, 'yes', `checkout answered — "${result.reason}"`);
    });
});

document.getElementById('mfa2-approve').addEventListener('click', () => {
  logTo(LOG, 'note', `approved ${pending?.amount ?? 0}$`);
  // The answer travels back the way the request came: a payload, not just a word. `close(id,
  // reason)` on the manager cannot carry one — the registry is keyed by string and knows no
  // modal's payload type — which is why a binding's own close is the door that can.
  billing.close('approved', {
    transactionId: `TX-${String(1000 + Math.floor(Math.random() * 9000))}`,
    amount: pending?.amount ?? 0,
  });
});
document.getElementById('mfa2-decline').addEventListener('click', () => {
  billing.close('declined');
});

// Anything on the page can watch the manager, because there is only one of it here.
dialogManager.subscribe((event) => {
  if (event.id !== 'billing:confirm') {
    logTo(LOG, 'bus', `${event.id} ${event.type}${event.reason ? ` — "${event.reason}"` : ''}`);
  }
});

logTo(LOG, 'note', 'ready — plain JS, owns "billing:confirm"');
