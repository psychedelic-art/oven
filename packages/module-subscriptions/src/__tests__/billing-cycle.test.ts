import { describe, it, expect } from 'vitest';
import { computeBillingCycle } from '../engine/billing-cycle';

describe('engine/billing-cycle — computeBillingCycle', () => {
  it('formats January as "YYYY-01"', () => {
    expect(computeBillingCycle(new Date(Date.UTC(2026, 0, 1, 0, 0, 0)))).toBe(
      '2026-01'
    );
  });

  it('formats December as "YYYY-12"', () => {
    expect(computeBillingCycle(new Date(Date.UTC(2026, 11, 31, 23, 59, 59)))).toBe(
      '2026-12'
    );
  });

  it('zero-pads single-digit months', () => {
    for (let m = 0; m < 9; m++) {
      const cycle = computeBillingCycle(new Date(Date.UTC(2026, m, 15)));
      expect(cycle).toBe(`2026-0${m + 1}`);
    }
  });

  it('does not zero-pad two-digit months', () => {
    for (let m = 9; m < 12; m++) {
      const cycle = computeBillingCycle(new Date(Date.UTC(2026, m, 15)));
      expect(cycle).toBe(`2026-${m + 1}`);
    }
  });

  it('is stable across UTC midnight (the billing cycle never rolls over mid-day)', () => {
    const justBefore = new Date(Date.UTC(2026, 3, 30, 23, 59, 59, 999));
    const justAfter = new Date(Date.UTC(2026, 4, 1, 0, 0, 0, 0));
    expect(computeBillingCycle(justBefore)).toBe('2026-04');
    expect(computeBillingCycle(justAfter)).toBe('2026-05');
  });

  it('uses UTC, not the host timezone', () => {
    // 2026-05-01 00:30 UTC is still April in timezones east of UTC
    // (e.g., -04:00 places it at 2026-04-30 20:30). The billing
    // cycle must report May regardless, because the storage column
    // is UTC-encoded.
    const instant = new Date(Date.UTC(2026, 4, 1, 0, 30, 0));
    expect(computeBillingCycle(instant)).toBe('2026-05');
  });

  it('accepts omitted argument and returns a string of the expected shape', () => {
    const cycle = computeBillingCycle();
    expect(cycle).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it('returns a deterministic value for a fixed instant (no hidden state)', () => {
    const fixed = new Date(Date.UTC(2026, 5, 15, 12, 0, 0));
    const a = computeBillingCycle(fixed);
    const b = computeBillingCycle(fixed);
    expect(a).toBe(b);
    expect(a).toBe('2026-06');
  });

  it('handles year rollover correctly', () => {
    expect(computeBillingCycle(new Date(Date.UTC(2026, 11, 31, 23, 59, 59)))).toBe(
      '2026-12'
    );
    expect(computeBillingCycle(new Date(Date.UTC(2027, 0, 1, 0, 0, 0)))).toBe(
      '2027-01'
    );
  });

  it('handles leap day 2028-02-29', () => {
    expect(computeBillingCycle(new Date(Date.UTC(2028, 1, 29, 12, 0, 0)))).toBe(
      '2028-02'
    );
  });
});
