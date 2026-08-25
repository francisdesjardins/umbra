import { expect, test } from '@playwright/test';
import { createLogger, setLogLevel } from '../logger.js';

const debugCalls: unknown[][] = [];
const warnCalls: unknown[][] = [];
const errorCalls: unknown[][] = [];

const originalDebug = console.debug;
const originalWarn = console.warn;
const originalError = console.error;

test.describe('createLogger / setLogLevel', () => {
  test.beforeEach(() => {
    debugCalls.length = 0;
    warnCalls.length = 0;
    errorCalls.length = 0;
    console.debug = (...args) => {
      debugCalls.push(args);
    };
    console.warn = (...args) => {
      warnCalls.push(args);
    };
    console.error = (...args) => {
      errorCalls.push(args);
    };
  });

  test.afterEach(() => {
    console.debug = originalDebug;
    console.warn = originalWarn;
    console.error = originalError;
    setLogLevel(false);
  });
  test('logger is silent when no pattern is set', () => {
    const log = createLogger('dialog');
    log('should not emit');
    expect(debugCalls).toHaveLength(0);
  });

  test('setLogLevel("*") enables all namespaces', () => {
    setLogLevel('*');
    createLogger('dialog')('dialog msg');
    createLogger('action')('action msg');
    createLogger('manager')('manager msg');
    expect(debugCalls).toHaveLength(3);
  });

  test('setLogLevel(namespace) enables exact namespace', () => {
    setLogLevel('dialog');
    createLogger('dialog')('enabled');
    expect(debugCalls).toHaveLength(1);
  });

  test('setLogLevel(namespace) enables sub-namespace via colon prefix match', () => {
    setLogLevel('dialog');
    createLogger('dialog:lifecycle')('sub-namespace');
    expect(debugCalls).toHaveLength(1);
  });

  test('setLogLevel(namespace) does not enable unrelated namespace', () => {
    setLogLevel('dialog');
    createLogger('action')('should not fire');
    expect(debugCalls).toHaveLength(0);
  });

  test('setLogLevel comma-separated enables all listed namespaces', () => {
    setLogLevel('dialog,action');
    createLogger('dialog')('m');
    createLogger('action')('a');
    createLogger('manager')('should not fire');
    expect(debugCalls).toHaveLength(2);
  });

  test('setLogLevel accepts "dialog:" prefixed form', () => {
    setLogLevel('dialog:dialog');
    createLogger('dialog')('prefixed pattern');
    expect(debugCalls).toHaveLength(1);
  });

  // The storage prefix and a namespace now share their first word, so a token starting `dialog:`
  // is ambiguous by construction: it may be the prefixed form of `lifecycle` or the namespace
  // `dialog:lifecycle` itself. Only the second exists, and stripping unconditionally matched
  // neither.
  test('a sub-namespace is reachable by its own name, prefix or not', () => {
    setLogLevel('dialog:lifecycle');
    createLogger('dialog:lifecycle')('by its own name');
    expect(debugCalls).toHaveLength(1);

    setLogLevel('dialog:dialog:lifecycle');
    createLogger('dialog:lifecycle')('by the prefixed form');
    expect(debugCalls).toHaveLength(2);
  });

  test('a sub-namespace pattern does not enable its siblings or its parent', () => {
    setLogLevel('dialog:lifecycle');
    createLogger('dialog:keydown')('should not fire');
    createLogger('dialog')('should not fire either');
    expect(debugCalls).toHaveLength(0);
  });

  test('setLogLevel(false) disables after being enabled', () => {
    setLogLevel('*');
    setLogLevel(false);
    createLogger('dialog')('should not fire');
    expect(debugCalls).toHaveLength(0);
  });

  test('logger.warn routes to console.warn', () => {
    setLogLevel('*');
    createLogger('dialog').warn('a warning');
    expect(warnCalls).toHaveLength(1);
    expect(debugCalls).toHaveLength(0);
  });

  test('logger.error routes to console.error', () => {
    setLogLevel('*');
    createLogger('dialog').error('an error');
    expect(errorCalls).toHaveLength(1);
    expect(debugCalls).toHaveLength(0);
  });

  test('logger includes namespace prefix in the message', () => {
    setLogLevel('*');
    createLogger('dialog')('open');
    const firstArg = debugCalls[0]?.[0];
    const formatStr = typeof firstArg === 'string' ? firstArg : JSON.stringify(firstArg ?? '');
    expect(formatStr).toContain('dialog:dialog');
  });

  test('logger passes data object as additional argument when provided', () => {
    setLogLevel('*');
    createLogger('dialog')('msg', { id: 'confirm' });
    // With data: 6 args — format, labelStyle, resetStyle, idStyle, resetStyle, data
    expect(debugCalls[0]).toHaveLength(6);
  });

  test('logger omits data argument when none provided', () => {
    setLogLevel('*');
    createLogger('dialog')('msg');
    // Without data: 5 args — format, labelStyle, resetStyle, idStyle, resetStyle
    expect(debugCalls[0]).toHaveLength(5);
  });

  test('each emitted log carries a monotonic #id', () => {
    setLogLevel('*');
    const log = createLogger('dialog');
    log('first');
    log('second');
    const firstFormat = String(debugCalls[0]?.[0]);
    const secondFormat = String(debugCalls[1]?.[0]);
    const firstId = /#(\d{4})/.exec(firstFormat)?.[1];
    const secondId = /#(\d{4})/.exec(secondFormat)?.[1];
    expect(firstId).toBeDefined();
    expect(secondId).toBeDefined();
    expect(Number(secondId)).toBe(Number(firstId) + 1);
  });
});

test.describe('persistence and namespace colours', () => {
  // Playwright hooks are per-describe: without its own capture this reads the last suite's buffer.
  test.beforeEach(() => {
    debugCalls.length = 0;
    console.debug = (...args) => {
      debugCalls.push(args);
    };
  });

  test.afterEach(() => {
    console.debug = originalDebug;
    setLogLevel(false);
  });

  test('setLogLevel persists through storage when asked, and survives its absence', () => {
    // Node has no window: `getStorage()` answers `null`, so the write is a no-op, not a throw.
    setLogLevel('dialog', true);
    createLogger('dialog')('enabled and persisted');
    expect(debugCalls).toHaveLength(1);

    setLogLevel(false, true);
    createLogger('dialog')('should not fire');
    expect(debugCalls).toHaveLength(1);
  });

  test('a sub-namespace inherits the nearest ancestor that has a colour', () => {
    // `resolveColor` drops one `:` segment at a time and stops at the first match. Both the near
    // and the deep walk, since asserting only the deep one would pass on a plain table lookup.
    setLogLevel('*');
    createLogger('dialog:lifecycle')('parent');
    createLogger('dialog:lifecycle:deep')('child');
    createLogger('action')('other family');
    createLogger('action:sub:deeper')('two levels below an entry that does not exist');

    const colourOf = (call: unknown[] | undefined) => {
      return String((call ?? [])[1]);
    };
    expect(debugCalls).toHaveLength(4);
    expect(colourOf(debugCalls[1])).toBe(colourOf(debugCalls[0]));
    expect(colourOf(debugCalls[3])).toBe(colourOf(debugCalls[2]));
    // And the two families stay distinct, so the assertion above is not "everything is one colour".
    expect(colourOf(debugCalls[0])).not.toBe(colourOf(debugCalls[2]));
  });

  test('a namespace nobody has a colour for still gets one', () => {
    setLogLevel('*');
    createLogger('nothing-like-this')('unknown namespace');

    expect(debugCalls).toHaveLength(1);
    expect(String(debugCalls[0]?.[1])).toContain('#B0B0B0');
  });
});

/**
 * The console theme is not the page's to pick, and no single ink colour reads on both backgrounds
 * (the two 4.5:1 bars leave an empty window between luminance 0.183 and 0.237). The badge removes
 * the dependency, so these assert the badge, not the palette — a new namespace picks any colour it
 * likes and fails here only if the label would not read on it.
 */
test.describe('namespace labels do not depend on the console theme', () => {
  test.beforeEach(() => {
    debugCalls.length = 0;
    console.debug = (...args) => {
      debugCalls.push(args);
    };
  });

  test.afterEach(() => {
    console.debug = originalDebug;
    setLogLevel(false);
  });

  const NAMESPACES = [
    'manager',
    'dialog',
    'dialog:lifecycle',
    'dialog:keydown',
    'dialog:click-outside',
    'action',
    'outlet',
    'nothing-like-this',
  ];

  const luminance = (hex: string): number => {
    const n = Number.parseInt(hex.slice(1), 16);
    const channel = (v: number) => {
      const x = v / 255;
      return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    };
    return (
      0.2126 * channel((n >> 16) & 255) +
      0.7152 * channel((n >> 8) & 255) +
      0.0722 * channel(n & 255)
    );
  };

  const contrast = (a: string, b: string): number => {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  for (const namespace of NAMESPACES) {
    test(`${namespace} paints its own background, and its ink reads on it`, () => {
      setLogLevel('*');
      createLogger(namespace)('measure me');

      const style = String(debugCalls[0]?.[1]);
      const background = /background:(#[0-9a-f]{6})/i.exec(style)?.[1];
      const ink = /(?:^|;)color:(#[0-9a-f]{6})/i.exec(style)?.[1];

      expect(background, style).toBeDefined();
      expect(ink, style).toBeDefined();
      expect(contrast(ink ?? '#000000', background ?? '#ffffff')).toBeGreaterThanOrEqual(4.5);
    });
  }
});
