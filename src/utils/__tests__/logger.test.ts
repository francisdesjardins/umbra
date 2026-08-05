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
    const log = createLogger('modal');
    log('should not emit');
    expect(debugCalls).toHaveLength(0);
  });

  test('setLogLevel("*") enables all namespaces', () => {
    setLogLevel('*');
    createLogger('modal')('modal msg');
    createLogger('action')('action msg');
    createLogger('manager')('manager msg');
    expect(debugCalls).toHaveLength(3);
  });

  test('setLogLevel(namespace) enables exact namespace', () => {
    setLogLevel('modal');
    createLogger('modal')('enabled');
    expect(debugCalls).toHaveLength(1);
  });

  test('setLogLevel(namespace) enables sub-namespace via colon prefix match', () => {
    setLogLevel('modal');
    createLogger('modal:lifecycle')('sub-namespace');
    expect(debugCalls).toHaveLength(1);
  });

  test('setLogLevel(namespace) does not enable unrelated namespace', () => {
    setLogLevel('modal');
    createLogger('action')('should not fire');
    expect(debugCalls).toHaveLength(0);
  });

  test('setLogLevel comma-separated enables all listed namespaces', () => {
    setLogLevel('modal,action');
    createLogger('modal')('m');
    createLogger('action')('a');
    createLogger('manager')('should not fire');
    expect(debugCalls).toHaveLength(2);
  });

  test('setLogLevel accepts "dialog:" prefixed form', () => {
    setLogLevel('dialog:modal');
    createLogger('modal')('prefixed pattern');
    expect(debugCalls).toHaveLength(1);
  });

  test('setLogLevel(false) disables after being enabled', () => {
    setLogLevel('*');
    setLogLevel(false);
    createLogger('modal')('should not fire');
    expect(debugCalls).toHaveLength(0);
  });

  test('logger.warn routes to console.warn', () => {
    setLogLevel('*');
    createLogger('modal').warn('a warning');
    expect(warnCalls).toHaveLength(1);
    expect(debugCalls).toHaveLength(0);
  });

  test('logger.error routes to console.error', () => {
    setLogLevel('*');
    createLogger('modal').error('an error');
    expect(errorCalls).toHaveLength(1);
    expect(debugCalls).toHaveLength(0);
  });

  test('logger includes namespace prefix in the message', () => {
    setLogLevel('*');
    createLogger('modal')('open');
    // First argument is a format string containing the namespace
    const firstArg = debugCalls[0]?.[0];
    const formatStr = typeof firstArg === 'string' ? firstArg : JSON.stringify(firstArg ?? '');
    expect(formatStr).toContain('dialog:modal');
  });

  test('logger passes data object as additional argument when provided', () => {
    setLogLevel('*');
    createLogger('modal')('msg', { id: 'confirm' });
    // With data: 6 args — format, labelStyle, resetStyle, idStyle, resetStyle, data
    expect(debugCalls[0]).toHaveLength(6);
  });

  test('logger omits data argument when none provided', () => {
    setLogLevel('*');
    createLogger('modal')('msg');
    // Without data: 5 args — format, labelStyle, resetStyle, idStyle, resetStyle
    expect(debugCalls[0]).toHaveLength(5);
  });

  test('each emitted log carries a monotonic #id', () => {
    setLogLevel('*');
    const log = createLogger('modal');
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
