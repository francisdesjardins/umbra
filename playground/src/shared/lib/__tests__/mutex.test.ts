import { expect, test } from '@playwright/test';
import { createMutex } from '../mutex';

const tick = (ms: number) => {
  return new Promise<void>((r) => {
    return setTimeout(r, ms);
  });
};

test.describe('createMutex', () => {
  test('serializes tasks — each runs only after the previous settles', async () => {
    const mutex = createMutex();
    const order: string[] = [];

    const a = mutex(async () => {
      await tick(20);
      order.push('a');
    });
    const b = mutex(async () => {
      await tick(1);
      order.push('b');
    });

    await Promise.all([a, b]);
    // Even though b is faster, it waits for a to finish first.
    expect(order).toEqual(['a', 'b']);
  });

  test('a rejected task does not break the chain', async () => {
    const mutex = createMutex();
    const order: string[] = [];

    const failing = mutex(async () => {
      await tick(5);
      throw new Error('boom');
    });
    const next = mutex(async () => {
      await Promise.resolve();
      order.push('after');
    });

    await expect(failing).rejects.toThrow('boom');
    await next;
    expect(order).toEqual(['after']);
  });

  test('returns the task result', async () => {
    const mutex = createMutex();
    expect(
      await mutex(() => {
        return Promise.resolve(42);
      })
    ).toBe(42);
  });
});
