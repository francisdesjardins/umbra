// MFA 2 — "Billing", on the vanilla binding.
//
// It imports neither of the other two, and neither imports it. The only thing the three share is
// the module the import map points all of them at, which is why `requestOpen` can cross between
// them at all — and why it crosses a framework boundary without noticing.
//
// `umbra/vanilla` is the third *kind* of binding: a controller, not a renderer. The <dialog> below
// is written by hand in host.html and stays the page's; what the binding drives is its lifecycle —
// phases and animation, the dismiss key, the backdrop, focus, and the registration that makes it
// addressable by the other two. `bindAction` is the part with no counterpart in a hook binding:
// with nothing re-rendering, it attaches the handler *and* keeps the button's disabled and
// data-loading in step itself.
import { createOpenRequest, dialogManager } from 'umbra';
import { bindDialog } from 'umbra/vanilla';
import { createLog } from './log.js';

const LOG = 'mfa2-log';
const log = createLog(LOG);

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

    log('in', `${from} asked to charge ${amount === null ? 'nothing usable' : `${amount}$`}`);

    // `refuse` is the answer channel: returning would refuse too, but silently — and a caller
    // across an ownership boundary that never hears why cannot tell its user anything.
    if (amount === null) {
      log('no', 'refused — the payload carries no amount');
      request.refuse('no-amount');
      return;
    }
    if (amount > APPROVAL_LIMIT) {
      log('no', `refused — over the ${APPROVAL_LIMIT}$ limit`);
      request.refuse(`over-limit:${APPROVAL_LIMIT}`);
      // A refusal the customer is owed an explanation for. Billing does not own that
      // conversation, so it hands it on rather than growing a dialog of its own — the same
      // `requestOpen` door Checkout used to get here, one hop further, into a third framework
      // this file knows nothing about.
      log('out', 'asked support:ticket to pick it up');
      void dialogManager
        .requestOpenAndWait(
          'support:ticket',
          createOpenRequest({ amount, limit: APPROVAL_LIMIT }, { source: 'billing' })
        )
        .then(async (outcome) => {
          if (!outcome.accepted) {
            log('no', `support refused — ${outcome.reason}`);
            return;
          }
          const [, result] = await outcome.closed;
          log('yes', `support answered — "${result?.reason ?? 'inconnu'}"`);
        });
      return;
    }

    pending = { amount, from };
    document.getElementById('mfa2-amount').textContent = `${amount}$`;
    document.getElementById('mfa2-from').textContent = from;
    log('yes', 'accepted — opening billing:confirm');
    billing.open();
  },

  onClose: (result) => {
    log('note', `billing:confirm closed — "${result.reason}"`);
    pending = null;
  },
});

document.getElementById('mfa2-limit').textContent = `${APPROVAL_LIMIT}$`;

// The traffic runs both ways: Billing asks Checkout for a dialog it does not own either.
document.getElementById('mfa2-ask').addEventListener('click', () => {
  log('out', 'asked checkout:receipt to open');
  void dialogManager
    .requestOpenAndWait(
      'checkout:receipt',
      createOpenRequest({ ref: 'INV-204' }, { source: 'billing' })
    )
    .then(async (outcome) => {
      if (!outcome.accepted) {
        log('no', `checkout refused — ${outcome.reason}`);
        return;
      }
      const [, result] = await outcome.closed;
      log('yes', `checkout answered — "${result.reason}"`);
    });
});

// Approve and Decline are the dialog's *actions*, bound rather than rendered. `bindAction` gives
// each button the close path, the hotkey and the disabled/loading sync a hook binding would get
// from spreading `action(reason)` — on markup that was already on the page.
billing.bindAction(document.getElementById('mfa2-approve'), {
  reason: 'approved',
  hotkey: 'Enter',
  focusOnOpen: true,
  onAction: (close) => {
    log('note', `approved ${pending?.amount ?? 0}$`);
    // The answer travels back the way the request came: a payload, not just a word. `close(id,
    // reason)` on the manager cannot carry one — the registry is keyed by string and knows no
    // dialog's payload type — which is why a binding's own close is the door that can.
    close({
      transactionId: `TX-${String(1000 + Math.floor(Math.random() * 9000))}`,
      amount: pending?.amount ?? 0,
    });
  },
});

// "Decline" here is the *user* turning down a charge, and it is deliberately not the same word as
// `request.refuse` above — that one is this dialog refusing to open at all. Two acts, two verbs,
// and collapsing them would hide the difference the demo exists to show.
billing.bindAction(document.getElementById('mfa2-decline'), { reason: 'declined' });

// Anything on the page can watch the manager, because there is only one of it here.
dialogManager.subscribe((event) => {
  if (event.id !== 'billing:confirm') {
    log('bus', `${event.id} ${event.type}${event.reason ? ` — "${event.reason}"` : ''}`);
  }
});

log('note', 'ready — vanilla binding, owns "billing:confirm"');
