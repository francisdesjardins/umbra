import { expect, test } from '@playwright/test';
import {
  asyncFulfilled,
  asyncIdle,
  asyncPending,
  asyncRejected,
  runAsync,
  type AsyncState,
} from '../async-state';

test.describe('async-state sentinels', () => {
  test('idle and pending are tagged unions', () => {
    expect(asyncIdle).toEqual({ status: 'idle' });
    expect(asyncPending).toEqual({ status: 'pending' });
  });

  test('asyncFulfilled carries the data', () => {
    expect(asyncFulfilled({ id: 1 })).toEqual({ status: 'fulfilled', data: { id: 1 } });
  });

  test('asyncRejected normalizes non-Error values', () => {
    const state = asyncRejected('nope');
    expect(state.status).toBe('rejected');
    expect(state.error).toBeInstanceOf(Error);
    expect(state.error.message).toBe('nope');
  });
});

test.describe('runAsync', () => {
  test('drives pending → fulfilled and returns the terminal state', async () => {
    const seen: Array<AsyncState<number>['status']> = [];
    const terminal = await runAsync(
      () => {
        return Promise.resolve(7);
      },
      (state) => {
        return seen.push(state.status);
      }
    );
    expect(seen).toEqual(['pending', 'fulfilled']);
    expect(terminal).toEqual({ status: 'fulfilled', data: 7 });
  });

  test('drives pending → rejected and returns the terminal state', async () => {
    const seen: Array<AsyncState<number>['status']> = [];
    const terminal = await runAsync(
      () => {
        return Promise.reject(new Error('down'));
      },
      (state) => {
        return seen.push(state.status);
      }
    );
    expect(seen).toEqual(['pending', 'rejected']);
    expect(terminal.status).toBe('rejected');
  });
});
