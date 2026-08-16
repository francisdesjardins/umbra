import { test, expect } from '@playwright/test';
import { fireAndForget } from '../fire-and-forget.js';

/** Wait one microtask tick so the fire-and-forget IIFE settles. */
const tick = () => {
  return new Promise<void>((r) => {
    return setTimeout(r, 0);
  });
};

test.describe('fireAndForget', () => {
  test('executes a synchronous fn', async () => {
    let called = false;
    fireAndForget(
      () => {
        called = true;
      },
      { onError: () => {} }
    );
    await tick();
    expect(called).toBe(true);
  });

  test('executes an async fn', async () => {
    let called = false;
    fireAndForget(
      async () => {
        await Promise.resolve();
        called = true;
      },
      { onError: () => {} }
    );
    await tick();
    expect(called).toBe(true);
  });

  test('calls onError with normalized Error when fn throws', async () => {
    const errors: Error[] = [];
    fireAndForget(
      () => {
        throw new Error('boom');
      },
      {
        onError: (error) => {
          errors.push(error);
        },
      }
    );
    await tick();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(Error);
    expect(errors[0]?.message).toBe('boom');
  });

  test('normalizes non-Error thrown values', async () => {
    const errors: Error[] = [];
    fireAndForget(
      () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- intentionally testing non-Error throw
        throw 'string error';
      },
      {
        onError: (error) => {
          errors.push(error);
        },
      }
    );
    await tick();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(Error);
    expect(errors[0]?.message).toBe('string error');
  });

  test('calls onError for async rejection', async () => {
    const errors: Error[] = [];
    fireAndForget(
      async () => {
        await Promise.resolve();
        throw new Error('async boom');
      },
      {
        onError: (error) => {
          errors.push(error);
        },
      }
    );
    // Async fn needs slightly more time to settle
    await new Promise<void>((r) => {
      return setTimeout(r, 10);
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(Error);
    expect(errors[0]?.message).toBe('async boom');
  });

  test('calls onSettled after success', async () => {
    let settled = false;
    fireAndForget(() => {}, {
      onError: () => {},
      onSettled: () => {
        settled = true;
      },
    });
    await tick();
    expect(settled).toBe(true);
  });

  test('calls onSettled after error', async () => {
    let settled = false;
    fireAndForget(
      () => {
        throw new Error('fail');
      },
      {
        onError: () => {},
        onSettled: () => {
          settled = true;
        },
      }
    );
    await tick();
    expect(settled).toBe(true);
  });

  test('does not call onSettled when omitted', async () => {
    // Verify no TypeError from calling undefined
    fireAndForget(() => {}, { onError: () => {} });
    await tick();
    // If we get here without an unhandled error, the test passes
  });
});
