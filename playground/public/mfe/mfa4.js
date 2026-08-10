// MFA 4 — "Audit", a web component. The vanilla binding again, but behind a shadow boundary.
//
// The other three prove the library is indifferent to the *framework*. This one asks a harder
// question: is it indifferent to the **tree**? A custom element with `attachShadow` puts its
// `<dialog>` in a document of its own, and a shadow root is not a styling choice — it changes what
// `document.activeElement` answers, what an event's `target` is by the time it leaves, and which
// stylesheets apply at all. Those are exactly the three things a dialog manager depends on.
//
// So this panel is the experiment: same `bindDialog` call as Billing's, same options, same
// actions — and every difference in behaviour is the boundary talking, not the binding.
import { createOpenRequest, dialogManager } from 'umbra';
import { bindDialog } from 'umbra/vanilla';
import { logTo } from './log.js';

const LOG = 'mfa4-log';

/**
 * The component's own styles.
 *
 * Written here rather than inherited, and that is the first thing the boundary costs: `host.html`
 * styles `.panel` for the other three, and none of it crosses. Custom properties *do* inherit, so
 * the colours are still the host's — a shadow root blocks rules, not inheritance.
 */
const STYLE = `
  :host { display: block; }
  /* Every number here is the host's, restated. The four panels are read side by side, so the one
     behind the boundary has to land its label, its field and its button row on the same lines the
     other three do — and it gets none of that for free. The uppercase label is the tell: it lived
     in a \`.field > span\` rule that stops at the shadow root, so Audit alone said "Account" in
     sentence case, one row out of step with three that shouted. */
  .controls { display: flex; flex-direction: column; gap: 10px; }
  .field { display: flex; flex-direction: column; gap: 4px; }
  .field > span {
    color: var(--muted); font-size: 11.5px;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .field input {
    font: inherit; padding: 6px 8px; border-radius: 6px;
    border: 1px solid var(--line); background: var(--panel); color: var(--ink);
  }
  .row { display: flex; gap: 8px; }
  .row > * { flex: 1; }
  button {
    font: inherit; padding: 6px 10px; border-radius: 6px; cursor: pointer;
    border: 1px solid var(--line); background: var(--panel); color: var(--ink);
  }
  button:disabled { opacity: 0.55; cursor: default; }
  dialog { padding: 0; border: none; background: transparent; }
  .panel {
    border: 1px solid var(--own); border-radius: 10px; padding: 14px; min-width: 240px;
    background: color-mix(in srgb, var(--own) 7%, var(--panel));
  }
  .owner { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--own); }
  h3 { margin: 4px 0 8px; font-size: 15px; }
  p { margin: 0 0 10px; }
  .error { margin: 10px 0 0; color: var(--no); font-size: 12px; }
`;

const MARKUP = `
  <div class="controls">
    <label class="field">
      <span>Account</span>
      <input id="account" type="text" value="ACME-77" />
    </label>
    <div class="row">
      <button id="ask">Ask Checkout</button>
      <button id="own">Open my review</button>
    </div>
  </div>

  <dialog id="dialog" aria-labelledby="title">
    <div class="panel">
      <div class="owner">Audit's dialog</div>
      <h3 id="title">Review this charge</h3>
      <p id="detail">Nothing under review.</p>
      <div class="row">
        <button id="dismiss">Not now</button>
        <button id="escalate">Escalate (fails)</button>
        <button id="flag">Flag it ⏎</button>
      </div>
      <p id="error" class="error" hidden></p>
    </div>
  </dialog>
`;

class AuditPanel extends HTMLElement {
  connectedCallback() {
    // `open` rather than `closed`: a closed root would also hide the dialog from the probe that
    // measures this panel, and the point is to see what the library can and cannot reach — not
    // to make it unobservable.
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${STYLE}</style>${MARKUP}`;

    const $ = (id) => {
      return root.getElementById(id);
    };
    const detail = $('detail');
    let underReview = null;

    const audit = bindDialog({
      id: 'audit:review',
      dialog: $('dialog'),
      ariaLabelledBy: 'title',

      // Reached by id from the three panels beside it, none of which knows what a custom element
      // is. The registry is keyed by string, so a shadow root is not a boundary it can perceive —
      // which is the half of this experiment that was never in doubt.
      onOpenRequest: (payload, request) => {
        const from = request.context?.source ?? 'anonymous';
        const amount =
          typeof payload === 'object' && payload !== null && typeof payload.amount === 'number'
            ? payload.amount
            : null;

        if (amount === null) {
          logTo(LOG, 'no', `refused — ${from} sent no amount to audit`);
          request.refuse('no-amount');
          return;
        }

        logTo(LOG, 'in', `${from} sent ${amount}$ for review`);
        underReview = { amount, from };
        detail.textContent = `${from} put ${amount}$ through. Flag it?`;
        logTo(LOG, 'yes', 'accepted — opening audit:review');
        void audit.open();
      },

      onClose: (result) => {
        logTo(LOG, 'note', `audit:review closed — "${result.reason}"`);
        underReview = null;
        detail.textContent = 'Nothing under review.';
      },
    });

    // Same levers Billing pulls, on markup a shadow root away. `focusOnOpen` and `hotkey` are the
    // two that have to find their button through `document.activeElement` and a `querySelector`,
    // and the failing action below is the third: after it settles, the modal puts focus back on
    // whoever ran it — which means the library had to have *recorded* who that was, across the
    // boundary, at the one instant it could be read.
    audit.bindAction($('dismiss'), 'dismissed', { focusOnOpen: true });

    // Deliberately throws. An action that fails leaves the modal open with its error reported,
    // and the keyboard has to stay usable — the retry belongs under the hand of the button that
    // was just pressed.
    audit.bindAction($('escalate'), 'escalated', {
      onAction: async () => {
        await new Promise((resolve) => {
          return setTimeout(resolve, 200);
        });
        throw new Error('the audit service is unreachable');
      },
    });
    audit.bindAction($('flag'), 'flagged', {
      hotkey: 'Enter',
      onAction: async (close) => {
        await new Promise((resolve) => {
          return setTimeout(resolve, 400);
        });
        logTo(LOG, 'note', `flagged ${underReview?.amount ?? 0}$`);
        close();
      },
    });

    // Nothing re-renders here, so the error has to be pulled off the controller and written out —
    // the half a renderer does elsewhere, and the reason `subscribe`/`getSnapshot` are public.
    const errorLine = $('error');
    audit.subscribe(() => {
      const { error } = audit.getSnapshot();
      errorLine.hidden = error === null;
      errorLine.textContent = error?.message ?? '';
    });

    $('own').addEventListener('click', () => {
      detail.textContent = `Reviewing ${$('account').value} by hand.`;
      void audit.open();
    });

    $('ask').addEventListener('click', () => {
      logTo(LOG, 'out', 'asked checkout:receipt to open');
      void dialogManager
        .requestOpenAndWait(
          'checkout:receipt',
          createOpenRequest({ ref: $('account').value }, { source: 'audit' })
        )
        .then(async (outcome) => {
          if (!outcome.accepted) {
            logTo(LOG, 'no', `checkout refused — ${outcome.reason}`);
            return;
          }
          const [, result] = await outcome.closed;
          logTo(LOG, 'yes', `checkout answered — "${result?.reason ?? 'inconnu'}"`);
        });
    });

    logTo(LOG, 'note', 'ready — web component, shadow root, owns "audit:review"');
  }
}

customElements.define('audit-panel', AuditPanel);

dialogManager.subscribe((event) => {
  if (event.id !== 'audit:review') {
    logTo(LOG, 'bus', `${event.id} ${event.type}${event.reason ? ` — "${event.reason}"` : ''}`);
  }
});
