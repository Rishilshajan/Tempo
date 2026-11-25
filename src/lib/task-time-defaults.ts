/**
 * TEMPO-005 - Pure new-task fixed-time prefills; no persistence or clock subscription.
 * Code map: src/components/code-map.md.
 */
import { zonedTimestamp } from "./validation/recurrence";
import { localDateKey } from "./validation/task";

/**
 * TEMPO-005-F21 - taskTimeDefaults
 * Purpose: Chooses the next future quarter-hour and a one-hour end in the task timezone.
 * Used by: useTaskFormState.
 * Trigger: A new form draft initializes its fixed-time fields.
 */
export function taskTimeDefaults(
  now: number,
  timezone: string,
  initialDate?: string,
  initialStartAt?: number,
) {
  let startAt = initialStartAt;
  if (startAt === undefined) {
    const today = localDateKey(new Date(now), timezone);
    if (initialDate && initialDate > today) {
      startAt = zonedTimestamp(initialDate, "09:00", timezone);
    } else {
      const minute = Number(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: timezone,
          minute: "2-digit",
        }).format(now),
      );
      startAt = Math.floor(now / 60000) * 60000 + (15 - minute % 15) * 60000;
    }
  }
  return { startAt, endAt: startAt + 3600000 };
}
