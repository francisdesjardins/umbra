import { test, expect } from '@playwright/test';
import { isNullish } from '../is-nullish.js';

test.describe('isNullish', () => {
  test('returns true for null', () => {
    expect(isNullish(null)).toBe(true);
  });

  test('returns true for undefined', () => {
    expect(isNullish(undefined)).toBe(true);
  });

  test('returns false for 0', () => {
    expect(isNullish(0)).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isNullish('')).toBe(false);
  });

  test('returns false for false', () => {
    expect(isNullish(false)).toBe(false);
  });

  test('returns false for NaN', () => {
    expect(isNullish(NaN)).toBe(false);
  });

  test('returns false for a number', () => {
    expect(isNullish(42)).toBe(false);
  });

  test('returns false for a string', () => {
    expect(isNullish('hello')).toBe(false);
  });

  test('returns false for an object', () => {
    expect(isNullish({})).toBe(false);
  });

  test('returns false for an array', () => {
    expect(isNullish([])).toBe(false);
  });
});
