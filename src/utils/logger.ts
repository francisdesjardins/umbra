/* oxlint-disable no-console -- this module is the sanctioned console logger */
/**
 * Zero-dependency debug logger for browser devtools — near-zero overhead when disabled. Every line
 * carries a monotonic `#0001` id shared across namespaces: note the latest, do the thing you are
 * investigating, then read everything above it.
 *
 * Enable with `localStorage.setItem('dialog:log', '*')` — also `'modal'`, `'modal,action'`,
 * `'dialog:modal'` — or {@link setLogLevel}. Namespaces: `manager` (the singleton), `outlet`
 * (ModalOutlet registration), `modal` (useModal core), `modal:lifecycle` (open/close DOM),
 * `modal:keydown` (dismiss key), `modal:click-outside`, `action` (actions, hotkeys).
 *
 * **Privacy**: opt-in, debug-only, console-only — nothing persisted or transmitted. Never logged:
 * the `close(data)` payload (only a `withData` flag), the close result, render content, store state.
 * **Logged**: `error.message` from your `prepare` / `onClose` / action callbacks and the close
 * `reason` — either can carry user data where a session-replay tool captures `console`.
 */

import { createSafeStorage } from './safe-storage.js';

const storageKey = 'dialog:log';

// ── Namespace colors (visible in browser devtools) ──────────────────────────

/**
 * Namespace colours, painted as a **filled badge** rather than coloured text: the console follows
 * the *system* theme, so ink would have to clear 4.5:1 on white **and** `#1f1f1f`, and the best any
 * single value reaches on both is ~4.06:1 (`action` scores 2.16:1 light). A badge's label contrasts
 * against a colour this file owns — hence the `padding` and `border-radius`.
 */
const colors: Readonly<Record<string, string>> = {
  manager: '#4CAF50',
  modal: '#2196F3',
  'modal:lifecycle': '#03A9F4',
  'modal:keydown': '#009688',
  'modal:click-outside': '#00BCD4',
  action: '#FF9800',
  // A step off `#AB47BC`, the one hue the shared ink cannot clear (4.36:1).
  outlet: '#BA68C8',
};

/** One ink for every badge — near-black, and ≥5:1 on all seven. */
const labelInk = '#10131a';

const labelStyle = (color: string) => {
  return `background:${color};color:${labelInk};font-weight:bold;padding:1px 4px;border-radius:2px`;
};
const resetStyle = 'color:inherit';
/**
 * The sequence id is bare text on the console's own background and cannot be a badge without two
 * per line; `#7e7e7e` is where both themes are equally bad (4.06:1), beating `#888`'s 3.54:1 light.
 */
const idStyle = 'color:#7e7e7e;font-weight:normal';

// ── Sequence id ─────────────────────────────────────────────────────────────

// Shared across every logger instance, so ids order globally across namespaces; only advances on
// an emitted log, which is what keeps the sequence dense enough to anchor to.
let logSeq = 0;

function nextLogId(): string {
  logSeq += 1;
  return `#${logSeq.toString().padStart(4, '0')}`;
}

// ── Pattern matching ────────────────────────────────────────────────────────

// In-memory override from `setLogLevel()`, outranking localStorage; `undefined` means unset.
let sessionOverride: string | null | undefined;

/**
 * Where a persisted pattern lives; the failures and the once-only probe are
 * {@link createSafeStorage}'s. The environment question belongs here: ask whether there is a window
 * without ever touching the getter, which is the thing that warns.
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
 * The badge colour for a namespace: its own, or the *nearest* ancestor's — so `modal:lifecycle:deep`
 * takes `modal:lifecycle`'s and a family that split its hue out keeps it down the whole branch.
 */
function resolveColor(namespace: string): string {
  if (colors[namespace]) {
    return colors[namespace];
  }
  const idx = namespace.lastIndexOf(':');
  // The unknown-namespace fallback is a badge too, so same ink: `#999` clears only 4.36:1 on it.
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
 * @param pattern - Namespace filter (`'*'` for all, `'modal,action'` for some), or `false` to disable.
 * @param persist - Write to `localStorage` so the setting survives reloads. Defaults to `false`.
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
