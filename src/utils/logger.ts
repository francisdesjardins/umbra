/* oxlint-disable no-console -- this module is the sanctioned console logger */
/**
 * Zero-dependency debug logger for browser devtools — near-zero overhead when disabled.
 *
 * Every line carries a monotonic `#0001` id, shared across namespaces: note the latest, do the
 * thing you are investigating, then read everything above it.
 *
 * ## Activation
 *
 * ```ts
 * localStorage.setItem('dialog:log', '*'); // persists; also 'modal', 'modal,action', 'dialog:modal'
 *
 * import { setLogLevel } from 'umbra';
 * setLogLevel('modal,action'); // session only unless persist = true; `false` disables
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
 * Opt-in, debug-only, console-only — nothing is persisted or transmitted. Never logged: the
 * `close(data)` payload (only a `withData` flag), the close result, render content, store state.
 * **Logged**: `error.message` from your `prepare` / `onClose` / action callbacks, and the close
 * `reason` — either can carry user data if your code puts it there. Weigh that before enabling it
 * in production, where a session-replay tool may capture `console`.
 */

import { createSafeStorage } from './safe-storage.js';

const storageKey = 'dialog:log';

// ── Namespace colors (visible in browser devtools) ──────────────────────────

/**
 * Namespace colours, painted as a **filled badge** rather than as coloured text.
 *
 * The console follows the *system* theme, not the page's, and can be set independently of both —
 * so ink has to clear 4.5:1 on white **and** on `#1f1f1f`. Nothing does: the first caps relative
 * luminance at 0.183 and the second floors it at 0.237, and the best any single value reaches on
 * both is about 4.06:1. Measured here, `action` scores 2.16:1 on a light console.
 *
 * A badge sidesteps it — the label's contrast is against the colour behind it, which this file
 * owns, so it reads the same either way. That is what the `padding` and `border-radius` are for.
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
