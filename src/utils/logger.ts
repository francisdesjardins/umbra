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

const storageKey = 'dialog:log';

// ── Namespace colors (visible in browser devtools) ──────────────────────────

const colors: Readonly<Record<string, string>> = {
  manager: '#4CAF50',
  modal: '#2196F3',
  'modal:lifecycle': '#03A9F4',
  'modal:keydown': '#009688',
  'modal:click-outside': '#00BCD4',
  action: '#FF9800',
  outlet: '#AB47BC',
};

const labelStyle = (color: string) => {
  return `color:${color};font-weight:bold;padding:1px 4px;border-radius:2px`;
};
const resetStyle = 'color:inherit';
const idStyle = 'color:#888;font-weight:normal';

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
 * Whether this environment has a usable `localStorage`, probed once.
 *
 * `undefined` until asked; `null` once we know it has none — and caching *that* is the point.
 * Reading the pattern on every log call is deliberate (setting the key in devtools takes effect
 * without a reload), but the `globalThis.localStorage` property access is not free everywhere:
 * Node defines it as a getter that returns `undefined` and emits a process warning unless the
 * process was started with `--localstorage-file`. Nothing throws, so a `try`/`catch` cannot
 * quiet it — only not looking again can. A worker, an SSR render and the unit suite all land
 * here, and a dialog manager has no business printing warnings in any of them.
 */
let storage: Storage | null | undefined;

function getStorage(): Storage | null {
  if (storage !== undefined) {
    return storage;
  }

  // `localStorage` is a `Window` API, so the question is whether there is a window — asked in a
  // way that never touches the getter, because touching it is the thing that warns.
  if (typeof globalThis.window === 'undefined') {
    storage = null;
    return storage;
  }

  try {
    // Non-null once a window exists — and where it is not, the access throws rather than
    // answering `undefined`, which is what the catch is for.
    storage = globalThis.localStorage;
  } catch {
    // A browser can refuse outright — a sandboxed iframe, or storage blocked entirely.
    storage = null;
  }
  return storage;
}

function getPattern(): string | null {
  if (sessionOverride !== undefined) {
    return sessionOverride;
  }
  try {
    return getStorage()?.getItem(storageKey) ?? null;
  } catch {
    // Reading can still fail after the probe succeeded — storage quota or permission changes.
    return null;
  }
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

export type LogData = Record<string, unknown> | (() => Record<string, unknown>);

export type Logger = {
  /** Log a debug-level message with optional structured data (or a lazy thunk). */
  (message: string, data?: LogData): void;
  /** Log a warning with optional structured data (or a lazy thunk). */
  warn(message: string, data?: LogData): void;
  /** Log an error with optional structured data (or a lazy thunk). */
  error(message: string, data?: LogData): void;
};

// ── Factory ─────────────────────────────────────────────────────────────────

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
function resolveColor(namespace: string): string {
  if (colors[namespace]) {
    return colors[namespace];
  }
  const idx = namespace.lastIndexOf(':');
  return idx !== -1 ? resolveColor(namespace.slice(0, idx)) : '#999';
}

export function createLogger(namespace: string): Logger {
  const color = resolveColor(namespace);
  const prefix = `dialog:${namespace}`;

  function emit(method: 'debug' | 'warn' | 'error', message: string, data: LogData | undefined) {
    if (!matches(namespace)) {
      return;
    }
    const resolved = typeof data === 'function' ? data() : data;
    const id = nextLogId();
    if (resolved !== undefined) {
      console[method](
        `%c${prefix}%c %c${id}%c ${message}`,
        labelStyle(color),
        resetStyle,
        idStyle,
        resetStyle,
        resolved
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
    emit('debug', message, data);
  }
  log.warn = (message: string, data?: LogData): void => {
    emit('warn', message, data);
  };
  log.error = (message: string, data?: LogData): void => {
    emit('error', message, data);
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
      try {
        getStorage()?.removeItem(storageKey);
      } catch {
        /* Storage present but refusing the write. */
      }
    }
  } else {
    sessionOverride = pattern;
    if (persist) {
      try {
        getStorage()?.setItem(storageKey, pattern);
      } catch {
        /* Storage present but refusing the write — a full quota, or private mode. */
      }
    }
  }
}
