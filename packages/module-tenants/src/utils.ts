/**
 * Compute whether the current time is within business hours for a given schedule and timezone.
 *
 * @param schedule - Per-day schedule: { monday: { open: "08:00", close: "18:00" }, ... }
 * @param timezone - IANA timezone string (e.g., "America/Bogota")
 * @returns true if the current time falls within the day's open/close window
 */
export function computeBusinessHours(
  schedule: Record<string, { open: string; close: string }> | null,
  timezone: string
): boolean {
  if (!schedule) return false;

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value?.toLowerCase();
  const hour = parts.find((p) => p.type === 'hour')?.value;
  const minute = parts.find((p) => p.type === 'minute')?.value;

  if (!weekday || !hour || !minute) return false;

  const currentTime = `${hour}:${minute}`;
  const daySchedule = schedule[weekday];
  if (!daySchedule) return false;

  return currentTime >= daySchedule.open && currentTime <= daySchedule.close;
}
