import { test, expect } from '@playwright/test';
import { normalizeError } from '../normalize-error.js';

test.describe('normalizeError', () => {
  test('passes Error instances through unchanged (same reference)', () => {
    const err = new Error('original');
    expect(normalizeError(err)).toBe(err);
  });

  test('preserves subclass instances (e.g. TypeError)', () => {
    const err = new TypeError('type error');
    expect(normalizeError(err)).toBe(err);
  });

  test('wraps a string in a new Error', () => {
    const result = normalizeError('oops');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('oops');
  });

  test('wraps a number via String() coercion', () => {
    const result = normalizeError(42);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('42');
  });

  test('wraps null with message "null"', () => {
    const result = normalizeError(null);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('null');
  });

  test('wraps undefined with message "undefined"', () => {
    const result = normalizeError(undefined);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('undefined');
  });

  test('wraps a plain object via String() coercion', () => {
    const result = normalizeError({ code: 'E001' });
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('[object Object]');
  });
});
