import { expect, test } from '@playwright/test';
import { safeAwait } from '../safe-await';

test.describe('safeAwait', () => {
  test('resolves to [null, value] on success', async () => {
    const [error, value] = await safeAwait(Promise.resolve(42));
    expect(error).toBeNull();
    expect(value).toBe(42);
  });

  test('resolves to [Error, null] on rejection', async () => {
    const boom = new Error('boom');
    const [error, value] = await safeAwait(Promise.reject(boom));
    expect(error).toBe(boom);
    expect(value).toBeNull();
  });

  test('normalizes a non-Error rejection into an Error', async () => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- exercising non-Error normalization
    const [error, value] = await safeAwait(Promise.reject('nope'));
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('nope');
    expect(value).toBeNull();
  });
});
