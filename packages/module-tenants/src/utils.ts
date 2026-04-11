/**
 * Compute whether a given instant is within business hours for a tenant
 * schedule and timezone.
 *
 * @param schedule - Per-day schedule: { monday: { open: "08:00", close: "18:00" }, ... }.
 *                   Days absent from the map are treated as closed.
 * @param timezone - IANA timezone string (e.g., "America/Bogota"). An invalid
 *                   timezone causes `Intl.DateTimeFormat` to throw — the helper
 *                   catches at its boundary and returns `false`.
 * @param now      - Optional instant to test. Defaults to `new Date()`. Accepted
 *                   as a parameter so unit tests can pin a deterministic instant
 *                   without mocking the global `Date`.
 * @returns true if `now` falls within `[open, close]` (inclusive) for the
 *          weekday (in `timezone`) in the schedule.
 */
export function computeBusinessHours(
  schedule: Record<string, { open: string; close: string }> | null | undefined,
  timezone: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!schedule) return false;
  if (!timezone) return false;

  let parts: Intl.DateTimeFormatPart[];
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    parts = formatter.formatToParts(now);
  } catch {
    // Invalid IANA timezone string. Treat as closed.
    return false;
  }

  const weekday = parts.find((p) => p.type === 'weekday')?.value?.toLowerCase();
  const hourRaw = parts.find((p) => p.type === 'hour')?.value;
  const minute = parts.find((p) => p.type === 'minute')?.value;

  if (!weekday || !hourRaw || !minute) return false;

  // Some Intl implementations return "24" at midnight under hour12=false.
  // Normalise to "00" so lexicographic comparison with "HH:MM" open/close
  // strings works across all runtimes.
  const hour = hourRaw === '24' ? '00' : hourRaw;

  const currentTime = `${hour}:${minute}`;
  const daySchedule = schedule[weekday];
  if (!daySchedule) return false;

  return currentTime >= daySchedule.open && currentTime <= daySchedule.close;
}
