/* oxlint-disable no-console -- this module is the sanctioned console logger */
/**
 * Lightweight, zero-dependency debug logger for browser devtools.
 *
 * Designed for library authors: near-zero overhead when disabled, structured
 * data objects, and colored namespace labels in the console.
 *
 * Every emitted line is tagged with a monotonic `#0001` sequence id (shared
 * across all namespaces). Use it to anchor debugging: note the latest id, do
 * the thing you're investigating, then read every line above that id.
 *
 * ## Activation
 *
 * ```ts
 * // Via localStorage (persists across reloads):
 * localStorage.setItem('dialog:log', '*');      // all namespaces
 * localStorage.setItem('dialog:log', 'modal');  // only modal core
 * localStorage.setItem('dialog:log', 'modal,action'); // modal + action
 * localStorage.setItem('dialog:log', 'dialog:modal'); // prefixed form also works
 *
 * // Via programmatic API (session only, unless persist = true):
 * import { setLogLevel } from 'umbra';
 * setLogLevel('*');
 * setLogLevel('modal,action');
 * setLogLevel(false); // disable
 * ```
 *
 * ## Namespaces
 *
 * | Namespace             | Module                           |
 * |-----------------------|----------------------------------|
 * | `manager`             | DialogManager singleton          |
 * | `outlet`              | ModalOutlet registration         |
 * | `modal`               | useModal core                    |
 * | `modal:lifecycle`     | Open/close DOM lifecycle         |
 * | `modal:keydown`       | Dismiss-key handling             |
 * | `modal:click-outside` | Non-modal click-outside dismiss  |
 * | `action`              | Modal actions; hotkey registration & hits     |
 *
 * ## Privacy
 *
 * Logging is **opt-in, debug-only, and console-only** — nothing is persisted or
 * transmitted by this library. It never logs the `data` payload passed to
 * `close(data)` (only a `withData` flag), nor the close `result`, render
 * content, or store state. It **does** log `error.message` from your `prepare` /
 * `onClose` / action callbacks and the close `reason`, either of which can carry
 * user-supplied data if your code puts it there. Keep that in mind before
 * enabling logging in **production**, where a session-replay / RUM tool may
 * capture `console` output.
 */

import { createSafeStorage } from './safe-storage.js';

const storageKey = 'dialog:log';

// ── Namespace colors (visible in browser devtools) ──────────────────────────

/**
 * Namespace colours, painted as a **filled badge** rather than as coloured text.
 *
 * The devtools console has two backgrounds and the page cannot choose between them: the console
 * follows the *system* theme, not the theme a page picked or a user toggled in the app, and it can
 * be set independently of both in devtools' own settings. So a namespace colour has to be legible
 * on white and on `#1f1f1f` at once — and no colour is. The bar is 4.5:1 against a white console,
 * which caps a colour's relative luminance at 0.183, and 4.5:1 against a dark one, which floors it
 * at 0.237. The window is empty; the best any single value can do on both is about 4.06:1.
 *
 * Measured against that, ink alone cannot pass: `action` scores 2.16:1 on a light console and
 * `modal:click-outside` 2.30:1.
 *
 * A badge sidesteps it. The label's contrast is against the colour behind it, which this file
 * owns, so it reads the same on either console — which is what the `padding` and `border-radius`
 * below are for.
 */
const colors: Readonly<Record<string, string>> = {
  manager: '#4CAF50',
  modal: '#2196F3',
  'modal:lifecycle': '#03A9F4',
  'modal:keydown': '#009688',
  'modal:click-outside': '#00BCD4',
  action: '#FF9800',
  // Lifted a step off `#AB47BC`, which was the one hue the shared ink could not clear (4.36:1).
  outlet: '#BA68C8',
};

/** One ink for every badge — near-black, and ≥5:1 on all seven. */
const labelInk = '#10131a';

const labelStyle = (color: string) => {
  return `background:${color};color:${labelInk};font-weight:bold;padding:1px 4px;border-radius:2px`;
};
const resetStyle = 'color:inherit';
/**
 * The sequence id is the one thing left that is bare text on the console's own background, and
 * it cannot be a badge without turning every line into two of them. `#7e7e7e` is the exact
 * luminance where the two console themes are equally bad — 4.06:1 on both — which is the best a
 * single value can do, and better than the `#888` it replaces (3.54:1 on a light console).
 */
const idStyle = 'color:#7e7e7e;font-weight:normal';

// ── Sequence id ─────────────────────────────────────────────────────────────

// Monotonic counter shared across every logger instance, so ids are globally
// ordered across namespaces. Only advances on an emitted (matched) log, giving
// a dense sequence you can anchor to: note the latest `#id`, trigger an action,
// then read every line above that id.
let logSeq = 0;

function nextLogId(): string {
  logSeq += 1;
  return `#${logSeq.toString().padStart(4, '0')}`;
}

// ── Pattern matching ────────────────────────────────────────────────────────

// In-memory override set via `setLogLevel()`. Takes priority over localStorage.
// `undefined` means "not set, fall back to localStorage".
let sessionOverride: string | null | undefined;

/**
 * Where a persisted pattern lives, with every way of failing to reach it already answered by
 * {@link createSafeStorage} — which is also what makes the probe happen once rather than on every
 * log call.
 *
 * The environment question is the part that belongs here: `localStorage` is a `Window` API, so ask
 * whether there is a window, and ask it in a way that never touches the getter. Touching it is the
 * thing that warns — Node exposes it as a getter that emits a process warning unless the process
 * was started with `--localstorage-file`, and a dialog manager has no business printing that in a
 * worker, an SSR render or a test run.
 */
const storage = createSafeStorage(() => {
  return typeof globalThis.window === 'undefined' ? null : globalThis.localStorage;
});

function getPattern(): string | null {
  // Read on every call on purpose: setting the key in devtools then takes effect without a reload.
  return sessionOverride === undefined ? storage.read(storageKey) : sessionOverride;
}

const namespacePrefix = 'dialog:';

/** Strip the `dialog:` prefix so both `'modal'` and `'dialog:modal'` work. */
function normalize(token: string): string {
  const t = token.trim();
  return t.startsWith(namespacePrefix) ? t.slice(namespacePrefix.length) : t;
}

function matches(namespace: string): boolean {
  const pattern = getPattern();
  if (!pattern) {
    return false;
  }
  if (pattern === '*') {
    return true;
  }
  return pattern.split(',').some((p) => {
    const n = normalize(p);
    return namespace === n || namespace.startsWith(n + ':');
  });
}

// ── Logger type ─────────────────────────────────────────────────────────────

/** The structured half of a log line, printed as the console's own last argument. */
export type LogData = Record<string, unknown>;

export type Logger = {
  /** Log a debug-level message with optional structured data. */
  (message: string, data?: LogData): void;
  /** Log a warning with optional structured data. */
  warn(message: string, data?: LogData): void;
  /** Log an error with optional structured data. */
  error(message: string, data?: LogData): void;
};

// ── Factory ─────────────────────────────────────────────────────────────────

/**
 * The badge colour for a namespace: its own, or the nearest ancestor's.
 *
 * Nearest rather than first: `modal:lifecycle:deep` takes `modal:lifecycle`'s colour, so a family
 * that has split its own hue out keeps it down the whole branch.
 */
function resolveColor(namespace: string): string {
  if (colors[namespace]) {
    return colors[namespace];
  }
  const idx = namespace.lastIndexOf(':');
  // The unknown-namespace fallback is a badge like the rest, so it takes the same ink: `#999`
  // reached only 4.36:1 against it where every named colour clears 5.
  return idx !== -1 ? resolveColor(namespace.slice(0, idx)) : '#B0B0B0';
}

/**
 * Create a namespaced logger instance.
 *
 * @param namespace - Logger namespace (e.g. `'modal'`, `'modal:lifecycle'`)
 * @returns A callable logger with `.warn()` and `.error()` methods
 *
 * @example
 * const log = createLogger('modal');
 * log('Open requested', { id: 'confirm' });
 * log.warn('Double open ignored', { id: 'confirm' });
 * log.error('onClose failed', { id: 'confirm', error: err.message });
 *
 * @internal
 */
export function createLogger(namespace: string): Logger {
  const color = resolveColor(namespace);
  const prefix = `dialog:${namespace}`;

  function emit(
    method: 'debug' | 'warn' | 'error',
    line: { readonly message: string; readonly data: LogData | undefined }
  ) {
    const { message, data } = line;
    if (!matches(namespace)) {
      return;
    }
    const id = nextLogId();
    if (data !== undefined) {
      console[method](
        `%c${prefix}%c %c${id}%c ${message}`,
        labelStyle(color),
        resetStyle,
        idStyle,
        resetStyle,
        data
      );
    } else {
      console[method](
        `%c${prefix}%c %c${id}%c ${message}`,
        labelStyle(color),
        resetStyle,
        idStyle,
        resetStyle
      );
    }
  }

  function log(message: string, data?: LogData): void {
    emit('debug', { message, data });
  }
  log.warn = (message: string, data?: LogData): void => {
    emit('warn', { message, data });
  };
  log.error = (message: string, data?: LogData): void => {
    emit('error', { message, data });
  };

  return log;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Programmatically enable or disable debug logging.
 *
 * @param pattern - Namespace filter (`'*'` for all, `'modal,action'` for specific),
 *                  or `false` to disable.
 * @param persist - If `true`, writes to `localStorage` so the setting survives
 *                  page reloads. Defaults to `false` (session only).
 *
 * @example
 * import { setLogLevel } from 'umbra';
 *
 * setLogLevel('*'); // enable all, session only
 * setLogLevel('modal', true); // enable modal logs, persisted
 * setLogLevel(false); // disable all
 */
export function setLogLevel(pattern: string | false, persist = false): void {
  if (pattern === false) {
    sessionOverride = null;
    if (persist) {
      storage.remove(storageKey);
    }
  } else {
    sessionOverride = pattern;
    if (persist) {
      storage.write(storageKey, pattern);
    }
  }
}
