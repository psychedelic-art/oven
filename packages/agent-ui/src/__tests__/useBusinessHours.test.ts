import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBusinessHours } from '../hooks/useBusinessHours';
import type { BusinessSchedule } from '../types';

describe('useBusinessHours', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns isOpen=true when no schedule provided', () => {
    const { result } = renderHook(() => useBusinessHours());
    expect(result.current.isOpen).toBe(true);
  });

  it('returns isOpen=true during business hours', () => {
    // Set time to Wednesday 10:00
    vi.setSystemTime(new Date(2026, 3, 8, 10, 0)); // Wed Apr 8 2026 10:00
    const schedule: BusinessSchedule = {
      timezone: 'UTC',
      hours: [
        { day: 3, open: '09:00', close: '18:00', isOpen: true }, // Wednesday
      ],
    };
    const { result } = renderHook(() => useBusinessHours(schedule));
    expect(result.current.isOpen).toBe(true);
  });

  it('returns isOpen=false outside business hours', () => {
    // Set time to Wednesday 20:00
    vi.setSystemTime(new Date(2026, 3, 8, 20, 0)); // Wed Apr 8 2026 20:00
    const schedule: BusinessSchedule = {
      timezone: 'UTC',
      hours: [
        { day: 3, open: '09:00', close: '18:00', isOpen: true },
      ],
    };
    const { result } = renderHook(() => useBusinessHours(schedule));
    expect(result.current.isOpen).toBe(false);
  });

  it('returns isOpen=false on a day marked as closed', () => {
    // Sunday
    vi.setSystemTime(new Date(2026, 3, 5, 12, 0)); // Sun Apr 5 2026
    const schedule: BusinessSchedule = {
      timezone: 'UTC',
      hours: [
        { day: 0, open: '09:00', close: '18:00', isOpen: false }, // Sunday closed
      ],
    };
    const { result } = renderHook(() => useBusinessHours(schedule));
    expect(result.current.isOpen).toBe(false);
  });

  it('provides nextCloseTime when open', () => {
    vi.setSystemTime(new Date(2026, 3, 8, 10, 0));
    const schedule: BusinessSchedule = {
      timezone: 'UTC',
      hours: [
        { day: 3, open: '09:00', close: '18:00', isOpen: true },
      ],
    };
    const { result } = renderHook(() => useBusinessHours(schedule));
    expect(result.current.isOpen).toBe(true);
    expect(result.current.nextCloseTime).not.toBeNull();
    expect(result.current.nextCloseTime!.getHours()).toBe(18);
  });
});
