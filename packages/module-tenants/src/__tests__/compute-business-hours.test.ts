import { describe, it, expect } from 'vitest';
import { computeBusinessHours } from '../utils';

type Schedule = Record<string, { open: string; close: string }>;

// Standard "Mon–Fri 08:00–18:00, Sat 09:00–13:00, Sun closed" schedule.
// Used as the common baseline by most cases below so the tests read clearly.
const weeklySchedule: Schedule = {
  monday: { open: '08:00', close: '18:00' },
  tuesday: { open: '08:00', close: '18:00' },
  wednesday: { open: '08:00', close: '18:00' },
  thursday: { open: '08:00', close: '18:00' },
  friday: { open: '08:00', close: '18:00' },
  saturday: { open: '09:00', close: '13:00' },
  // sunday intentionally omitted — closed
};

/**
 * Build a Date whose Intl weekday/hour/minute in UTC match the requested
 * weekday and HH:MM. Using `timeZone: 'UTC'` for the helper keeps the test
 * independent of the host's local timezone.
 *
 * 2026-04-06 is a Monday in UTC, so day offsets cleanly map to weekdays:
 *   +0 = Mon, +1 = Tue, ..., +5 = Sat, +6 = Sun.
 */
function utcInstant(dayOffsetFromMonday: number, hh: number, mm: number): Date {
  return new Date(Date.UTC(2026, 3, 6 + dayOffsetFromMonday, hh, mm, 0));
}

describe('computeBusinessHours (R9.1 coverage)', () => {
  describe('inside the open window', () => {
    it('returns true mid-window on Monday', () => {
      expect(
        computeBusinessHours(weeklySchedule, 'UTC', utcInstant(0, 12, 0))
      ).toBe(true);
    });

    it('returns true mid-window on Tuesday', () => {
      expect(
        computeBusinessHours(weeklySchedule, 'UTC', utcInstant(1, 9, 30))
      ).toBe(true);
    });

    it('returns true mid-window on Wednesday', () => {
      expect(
        computeBusinessHours(weeklySchedule, 'UTC', utcInstant(2, 14, 45))
      ).toBe(true);
    });

    it('returns true mid-window on Thursday', () => {
      expect(
        computeBusinessHours(weeklySchedule, 'UTC', utcInstant(3, 17, 59))
      ).toBe(true);
    });

    it('returns true mid-window on Friday', () => {
      expect(
        computeBusinessHours(weeklySchedule, 'UTC', utcInstant(4, 8, 1))
      ).toBe(true);
    });

    it('returns true mid-window on Saturday (different hours)', () => {
      expect(
        computeBusinessHours(weeklySchedule, 'UTC', utcInstant(5, 11, 0))
      ).toBe(true);
    });
  });

  describe('boundary conditions', () => {
    it('returns true exactly at open (inclusive lower bound)', () => {
      expect(
        computeBusinessHours(weeklySchedule, 'UTC', utcInstant(0, 8, 0))
      ).toBe(true);
    });

    it('returns true exactly at close (inclusive upper bound)', () => {
      expect(
        computeBusinessHours(weeklySchedule, 'UTC', utcInstant(0, 18, 0))
      ).toBe(true);
    });

    it('returns false one minute before open', () => {
      expect(
        computeBusinessHours(weeklySchedule, 'UTC', utcInstant(0, 7, 59))
      ).toBe(false);
    });

    it('returns false one minute after close', () => {
      expect(
        computeBusinessHours(weeklySchedule, 'UTC', utcInstant(0, 18, 1))
      ).toBe(false);
    });
  });

  describe('closed states', () => {
    it('returns false before open on Monday (05:00)', () => {
      expect(
        computeBusinessHours(weeklySchedule, 'UTC', utcInstant(0, 5, 0))
      ).toBe(false);
    });

    it('returns false after close on Monday (22:00)', () => {
      expect(
        computeBusinessHours(weeklySchedule, 'UTC', utcInstant(0, 22, 0))
      ).toBe(false);
    });

    it('returns false for a weekday missing from the schedule (Sunday)', () => {
      expect(
        computeBusinessHours(weeklySchedule, 'UTC', utcInstant(6, 12, 0))
      ).toBe(false);
    });

    it('returns false when every day is missing from the schedule', () => {
      expect(
        computeBusinessHours({} as Schedule, 'UTC', utcInstant(0, 12, 0))
      ).toBe(false);
    });

    it('returns false when schedule has only Sunday and current day is Monday', () => {
      const sundayOnly: Schedule = {
        sunday: { open: '10:00', close: '14:00' },
      };
      expect(
        computeBusinessHours(sundayOnly, 'UTC', utcInstant(0, 12, 0))
      ).toBe(false);
    });
  });

  describe('null / undefined inputs', () => {
    it('returns false for a null schedule', () => {
      expect(computeBusinessHours(null, 'UTC', utcInstant(0, 12, 0))).toBe(
        false
      );
    });

    it('returns false for an undefined schedule', () => {
      expect(
        computeBusinessHours(undefined, 'UTC', utcInstant(0, 12, 0))
      ).toBe(false);
    });

    it('returns false for a null timezone', () => {
      expect(
        computeBusinessHours(weeklySchedule, null, utcInstant(0, 12, 0))
      ).toBe(false);
    });

    it('returns false for an undefined timezone', () => {
      expect(
        computeBusinessHours(weeklySchedule, undefined, utcInstant(0, 12, 0))
      ).toBe(false);
    });
  });

  describe('invalid timezone handling', () => {
    it('returns false for a garbage timezone string', () => {
      // Intl.DateTimeFormat throws a RangeError for unknown IANA zones.
      // The helper must catch at its Intl boundary and surface false.
      expect(
        computeBusinessHours(
          weeklySchedule,
          'Not/A_Real_Zone',
          utcInstant(0, 12, 0)
        )
      ).toBe(false);
    });

    it('returns false for an empty-string timezone', () => {
      expect(
        computeBusinessHours(weeklySchedule, '', utcInstant(0, 12, 0))
      ).toBe(false);
    });
  });

  describe('timezone awareness', () => {
    it('honours the tenant timezone (UTC 13:00 = Bogota 08:00 = open)', () => {
      // 2026-04-06 13:00 UTC converts to 2026-04-06 08:00 in America/Bogota
      // (UTC-5, no DST). That should be exactly at open.
      const schedule: Schedule = {
        monday: { open: '08:00', close: '18:00' },
      };
      expect(
        computeBusinessHours(schedule, 'America/Bogota', utcInstant(0, 13, 0))
      ).toBe(true);
    });

    it('honours the tenant timezone (UTC 12:59 = Bogota 07:59 = closed)', () => {
      const schedule: Schedule = {
        monday: { open: '08:00', close: '18:00' },
      };
      expect(
        computeBusinessHours(schedule, 'America/Bogota', utcInstant(0, 12, 59))
      ).toBe(false);
    });
  });

  describe('midnight and zero-padding', () => {
    it('treats "00:00" as a valid open time (full-day schedule)', () => {
      const allDay: Schedule = {
        monday: { open: '00:00', close: '23:59' },
      };
      expect(
        computeBusinessHours(allDay, 'UTC', utcInstant(0, 0, 0))
      ).toBe(true);
    });

    it('treats "23:59" as a valid close time (full-day schedule)', () => {
      const allDay: Schedule = {
        monday: { open: '00:00', close: '23:59' },
      };
      expect(
        computeBusinessHours(allDay, 'UTC', utcInstant(0, 23, 59))
      ).toBe(true);
    });

    it('rejects a time one minute before a "00:00" open (previous day)', () => {
      // 23:59 on Sunday when the schedule only opens Monday 00:00.
      const mondayOnly: Schedule = {
        monday: { open: '00:00', close: '23:59' },
      };
      expect(
        computeBusinessHours(mondayOnly, 'UTC', utcInstant(6, 23, 59))
      ).toBe(false);
    });

    it('normalises the hour "24" edge case to "00" for lexicographic safety', () => {
      // Some older Intl implementations emit "24" for midnight when
      // hour12: false. The helper normalises that to "00" so the
      // HH:MM string comparison stays correct. We cannot force the
      // runtime to emit "24", but we can assert that a schedule
      // starting at "00:00" accepts the midnight instant on every
      // supported runtime.
      const allDay: Schedule = {
        monday: { open: '00:00', close: '23:59' },
      };
      expect(
        computeBusinessHours(allDay, 'UTC', utcInstant(0, 0, 0))
      ).toBe(true);
    });
  });

  describe('default now parameter', () => {
    it('uses `new Date()` when `now` is omitted (smoke test)', () => {
      // Without a fixed instant, we can only assert the helper does
      // not throw and returns a boolean. This exercises the default-
      // parameter branch explicitly for coverage.
      const alwaysOpen: Schedule = {
        monday: { open: '00:00', close: '23:59' },
        tuesday: { open: '00:00', close: '23:59' },
        wednesday: { open: '00:00', close: '23:59' },
        thursday: { open: '00:00', close: '23:59' },
        friday: { open: '00:00', close: '23:59' },
        saturday: { open: '00:00', close: '23:59' },
        sunday: { open: '00:00', close: '23:59' },
      };
      const result = computeBusinessHours(alwaysOpen, 'UTC');
      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);
    });
  });
});
