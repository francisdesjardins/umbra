import { expect, test } from '@playwright/test';
import { createSafeStorage } from '../safe-storage.js';
import type { StorageLike } from '../safe-storage.js';

// The three ways Web Storage fails, unreachable in either test project: Node has no `window`, and
// a browser's `localStorage` always works. Assertable here only because the probe is a parameter.

/** A storage that works, so the tests below differ from each other by one behaviour. */
function fakeStorage(initial: Record<string, string> = {}): StorageLike {
  const entries = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return entries.get(key) ?? null;
    },
    setItem(key, value) {
      entries.set(key, value);
    },
    removeItem(key) {
      entries.delete(key);
    },
  };
}

test.describe('a storage that is there', () => {
  test('reads, writes and removes reach it', () => {
    const storage = createSafeStorage(() => {
      return fakeStorage({ existing: 'value' });
    });

    expect(storage.read('existing')).toBe('value');
    storage.write('added', 'new');
    expect(storage.read('added')).toBe('new');
    storage.remove('added');
    expect(storage.read('added')).toBeNull();
  });

  test('a key that is not there reads as null, not undefined', () => {
    // It feeds a `=== null` check and a pattern match; `undefined` would pass one and not the other.
    const storage = createSafeStorage(() => {
      return fakeStorage();
    });

    expect(storage.read('absent')).toBeNull();
  });
});

test.describe('a storage that is not there', () => {
  test('a probe answering null leaves every operation a no-op', () => {
    // The server render, the worker, this test project.
    const storage = createSafeStorage(() => {
      return null;
    });

    expect(storage.read('anything')).toBeNull();
    expect(() => {
      storage.write('key', 'value');
      storage.remove('key');
    }).not.toThrow();
  });

  test('a probe that throws is a storage that is not there, not a crash', () => {
    // A sandboxed `<iframe>` or blocked storage: the property access itself raises `SecurityError`.
    const storage = createSafeStorage(() => {
      throw new Error('SecurityError: access denied');
    });

    expect(storage.read('anything')).toBeNull();
    expect(() => {
      storage.write('key', 'value');
      storage.remove('key');
    }).not.toThrow();
  });
});

test.describe('the probe happens once', () => {
  test('one probe serves every later operation', () => {
    let probes = 0;
    const storage = createSafeStorage(() => {
      probes += 1;
      return fakeStorage();
    });

    storage.read('a');
    storage.write('a', '1');
    storage.read('a');
    storage.remove('a');

    expect(probes).toBe(1);
  });

  test('a probe answering undefined is remembered as absent, and not asked again', () => {
    // `undefined` is what a `window` shim with no storage answers — jsdom, a WebView, a partial SSR
    // global — and must be remembered like any other "no", or it re-probes on every log call.
    let probes = 0;
    const storage = createSafeStorage(() => {
      probes += 1;
      return undefined;
    });

    storage.read('a');
    storage.read('a');
    storage.write('a', '1');

    expect(probes).toBe(1);
    expect(storage.read('a')).toBeNull();
  });

  test('a probe that threw is not retried either', () => {
    // Whatever made the access throw will keep throwing; a retry is an exception for no answer.
    let probes = 0;
    const storage = createSafeStorage(() => {
      probes += 1;
      throw new Error('denied');
    });

    storage.read('a');
    storage.write('a', '1');
    storage.remove('a');

    expect(probes).toBe(1);
  });
});

test.describe('a storage that is there and refuses anyway', () => {
  test('a read that throws answers null', () => {
    // A permission that changed between reads: the probe already succeeded, so nothing catches it.
    const storage = createSafeStorage(() => {
      return {
        ...fakeStorage(),
        getItem() {
          throw new Error('permission revoked');
        },
      };
    });

    expect(storage.read('anything')).toBeNull();
  });

  test('a write that throws is dropped, not raised', () => {
    // The quota case. `setLogLevel('*', true)` has already set the session override, so logging is
    // on — only its survival across a reload is lost, which is not worth an exception.
    const storage = createSafeStorage(() => {
      return {
        ...fakeStorage(),
        setItem() {
          throw new Error('QuotaExceededError');
        },
      };
    });

    expect(() => {
      storage.write('key', 'value');
    }).not.toThrow();
  });

  test('a remove that throws is dropped too', () => {
    const storage = createSafeStorage(() => {
      return {
        ...fakeStorage(),
        removeItem() {
          throw new Error('QuotaExceededError');
        },
      };
    });

    expect(() => {
      storage.remove('key');
    }).not.toThrow();
  });
});
