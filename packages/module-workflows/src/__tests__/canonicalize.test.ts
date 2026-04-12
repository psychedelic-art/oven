import { describe, it, expect } from 'vitest';
import { canonicalize, structurallyEqual } from '../canonicalize';

describe('canonicalize', () => {
  it('sorts object keys recursively', () => {
    const input = { z: 1, a: { c: 3, b: 2 } };
    const result = canonicalize(input) as Record<string, unknown>;
    expect(Object.keys(result)).toEqual(['a', 'z']);
    expect(Object.keys(result.a as Record<string, unknown>)).toEqual(['b', 'c']);
  });

  it('preserves arrays in order', () => {
    const input = [3, 1, 2];
    expect(canonicalize(input)).toEqual([3, 1, 2]);
  });

  it('trims whitespace from string values', () => {
    expect(canonicalize('  hello  ')).toBe('hello');
    expect(canonicalize('no trim')).toBe('no trim');
  });

  it('handles null and undefined', () => {
    expect(canonicalize(null)).toBeNull();
    expect(canonicalize(undefined)).toBeUndefined();
  });

  it('passes through numbers and booleans', () => {
    expect(canonicalize(42)).toBe(42);
    expect(canonicalize(true)).toBe(true);
  });

  it('recursively canonicalizes nested arrays of objects', () => {
    const input = [{ z: 1, a: 2 }, { b: 3 }];
    const result = canonicalize(input) as Record<string, unknown>[];
    expect(Object.keys(result[0])).toEqual(['a', 'z']);
  });
});

describe('structurallyEqual', () => {
  it('returns true for key-order differences', () => {
    const a = { name: 'test', version: 1, states: { s1: {}, s2: {} } };
    const b = { states: { s2: {}, s1: {} }, version: 1, name: 'test' };
    expect(structurallyEqual(a, b)).toBe(true);
  });

  it('returns true for whitespace-only string differences', () => {
    const a = { id: 'flow-1', description: '  hello  ' };
    const b = { id: 'flow-1', description: 'hello' };
    expect(structurallyEqual(a, b)).toBe(true);
  });

  it('returns false when a value actually differs', () => {
    const a = { name: 'test', version: 1 };
    const b = { name: 'test', version: 2 };
    expect(structurallyEqual(a, b)).toBe(false);
  });

  it('returns false when a key is added', () => {
    const a = { name: 'test' };
    const b = { name: 'test', extra: true };
    expect(structurallyEqual(a, b)).toBe(false);
  });

  it('returns false when a key is removed', () => {
    const a = { name: 'test', extra: true };
    const b = { name: 'test' };
    expect(structurallyEqual(a, b)).toBe(false);
  });

  it('detects nested value change through key-reordered objects', () => {
    const a = { states: { s1: { type: 'final' }, s2: { invoke: { src: 'a' } } } };
    const b = { states: { s2: { invoke: { src: 'b' } }, s1: { type: 'final' } } };
    expect(structurallyEqual(a, b)).toBe(false);
  });

  it('treats identical structures as equal', () => {
    const def = {
      id: 'wf-1',
      initial: 'start',
      states: {
        start: { invoke: { src: 'core.delay', onDone: 'end' } },
        end: { type: 'final' },
      },
    };
    expect(structurallyEqual(def, JSON.parse(JSON.stringify(def)))).toBe(true);
  });
});
