import { expect, test } from '@playwright/test';
import { shallowEqual } from '../shallow-equal.js';

test.describe('shallowEqual', () => {
  test('primitives compare by Object.is', () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual('a', 'a')).toBe(true);
    expect(shallowEqual(1, 2)).toBe(false);
    expect(shallowEqual(null, null)).toBe(true);
    expect(shallowEqual(undefined, undefined)).toBe(true);
    expect(shallowEqual(null, undefined)).toBe(false);
    // Object.is semantics: NaN equals NaN, +0 !== -0
    expect(shallowEqual(Number.NaN, Number.NaN)).toBe(true);
    expect(shallowEqual(0, -0)).toBe(false);
  });

  test('same reference is equal', () => {
    const obj = { a: 1 };
    expect(shallowEqual(obj, obj)).toBe(true);
  });

  test('objects compare one level deep', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
  });

  test('differing key counts are unequal', () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  test('same key count, different keys are unequal', () => {
    expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  test('nested objects compare by reference (shallow)', () => {
    const nested = { x: 1 };
    expect(shallowEqual({ a: nested }, { a: nested })).toBe(true);
    // structurally equal but different references → not equal (shallow)
    expect(shallowEqual({ a: { x: 1 } }, { a: { x: 1 } })).toBe(false);
  });

  test('arrays compare element-wise by Object.is', () => {
    expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(shallowEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  test('object vs null/array of same shape are unequal', () => {
    expect(shallowEqual<unknown>({ a: 1 }, null)).toBe(false);
    expect(shallowEqual<unknown>({ 0: 'a', 1: 'b', length: 2 }, ['a', 'b'])).toBe(false);
  });

  test('Maps compare by entries', () => {
    expect(
      shallowEqual(
        new Map([
          ['a', 1],
          ['b', 2],
        ]),
        new Map([
          ['a', 1],
          ['b', 2],
        ])
      )
    ).toBe(true);
    expect(shallowEqual(new Map([['a', 1]]), new Map([['a', 2]]))).toBe(false);
    expect(shallowEqual(new Map([['a', 1]]), new Map([['b', 1]]))).toBe(false);
    expect(shallowEqual(new Map([['a', 1]]), new Map())).toBe(false);
  });

  test('Map values compare by Object.is (shallow)', () => {
    const v = { x: 1 };
    expect(shallowEqual(new Map([['k', v]]), new Map([['k', v]]))).toBe(true);
    expect(shallowEqual(new Map([['k', { x: 1 }]]), new Map([['k', { x: 1 }]]))).toBe(false);
  });

  test('Sets compare by membership', () => {
    expect(shallowEqual(new Set([1, 2, 3]), new Set([3, 2, 1]))).toBe(true);
    expect(shallowEqual(new Set([1, 2]), new Set([1, 2, 3]))).toBe(false);
    expect(shallowEqual(new Set([1, 2]), new Set([1, 3]))).toBe(false);
  });
});
