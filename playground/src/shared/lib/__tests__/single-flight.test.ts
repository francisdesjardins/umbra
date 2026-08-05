import { expect, test } from '@playwright/test';
import { createSingleFlight } from '../single-flight';

const tick = (ms: number) => {
  return new Promise<void>((r) => {
    return setTimeout(r, ms);
  });
};

test.describe('createSingleFlight — first mode (default)', () => {
  test('concurrent callers share a single in-flight task', async () => {
    const flight = createSingleFlight();
    let calls = 0;
    const task = async (): Promise<string> => {
      calls++;
      await tick(10);
      return 'x';
    };

    const [a, b] = [flight(task), flight(task)];
    expect(calls).toBe(1);
    expect(await a).toBe('x');
    expect(await b).toBe('x');
  });

  test('a fresh call runs the task again once the previous settled', async () => {
    const flight = createSingleFlight();
    let calls = 0;
    const task = async (): Promise<number> => {
      calls++;
      await tick(1);
      return calls;
    };

    await flight(task);
    await flight(task);
    expect(calls).toBe(2);
  });
});

test.describe('createSingleFlight — last mode', () => {
  test('a new call aborts the previous; all callers resolve to the latest result', async () => {
    const flight = createSingleFlight({ mode: 'last' });
    let firstSignal: AbortSignal | undefined;

    const p1 = flight(async (signal) => {
      firstSignal = signal;
      await tick(20);
      return 'a';
    });
    const p2 = flight(async () => {
      await tick(1);
      return 'b';
    });

    expect(firstSignal?.aborted).toBe(true);
    expect(await p1).toBe('b');
    expect(await p2).toBe('b');
  });
});
