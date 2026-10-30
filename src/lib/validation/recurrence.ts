import { z } from "zod";

export const recurrenceSchema = z
  .object({
    frequency: z.enum(["daily", "weekdays", "weekly", "monthly", "custom"]),
    interval: z
      .number()
      .int("Use a whole-number repeat interval.")
      .min(1, "Repeat interval must be at least 1.")
      .max(365, "Repeat interval cannot exceed 365."),
    unit: z.enum(["day", "week", "month"]),
    end: z.discriminatedUnion("type", [
      z.object({ type: z.literal("never") }),
      z.object({
        type: z.literal("date"),
        date: z.iso.date("Choose a valid repeat end date."),
      }),
      z.object({
        type: z.literal("count"),
        count: z
          .number()
          .int("Use a whole number of occurrences.")
          .min(1, "Use at least 1 occurrence.")
          .max(1000, "Use 1,000 occurrences or fewer."),
      }),
    ]),
  })
  .superRefine((rule, ctx) => {
    const units = {
      daily: "day",
      weekdays: "day",
      weekly: "week",
      monthly: "month",
    };
    if (
      rule.frequency !== "custom" &&
      (rule.interval !== 1 || rule.unit !== units[rule.frequency])
    )
      ctx.addIssue({
        code: "custom",
        message: "Choose Custom for a different repeat interval.",
      });
  });

export type RecurrenceRule = z.infer<typeof recurrenceSchema>;

export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function dateDistance(first: string, second: string) {
  return Math.round(
    (Date.parse(`${second}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) /
      86400000,
  );
}

function weekdayAnchor(date: string) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 6 ? shiftDate(date, 2) : day === 0 ? shiftDate(date, 1) : date;
}

/** Weekday increments after the first eligible date, without scanning years. */
export function weekdayDistance(first: string, last: string) {
  const anchor = weekdayAnchor(first);
  const days = Math.max(0, dateDistance(anchor, last));
  const weekday = new Date(`${anchor}T12:00:00Z`).getUTCDay();
  const remainder = Array.from(
    { length: days % 7 },
    (_, index) => (weekday + index + 1) % 7,
  ).filter((day) => day >= 1 && day <= 5).length;
  return Math.floor(days / 7) * 5 + remainder;
}

/** Anchor-based calculation avoids Jan 31 → Feb 28 → Mar 28 drift. */
export function occurrenceDate(
  anchor: string,
  rule: RecurrenceRule,
  ordinal: number,
) {
  const offset = (ordinal - 1) * rule.interval;
  if (rule.frequency === "weekdays") {
    const first = weekdayAnchor(anchor);
    const weekday = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
    return shiftDate(first, offset + Math.floor((weekday + offset) / 5) * 2);
  }
  if (rule.unit !== "month")
    return shiftDate(anchor, offset * (rule.unit === "week" ? 7 : 1));
  const [year, month, day] = anchor.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1 + offset, 1, 12));
  const last = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0),
  ).getUTCDate();
  value.setUTCDate(Math.min(day, last));
  return value.toISOString().slice(0, 10);
}

export function recurrenceAllows(
  rule: RecurrenceRule,
  ordinal: number,
  date: string,
) {
  return (
    rule.end.type === "never" ||
    (rule.end.type === "count"
      ? ordinal <= rule.end.count
      : date <= rule.end.date)
  );
}

function wallParts(at: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (name: string) =>
    Number(parts.find((part) => part.type === name)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}
function wallEpoch(at: number, timezone: string) {
  const p = wallParts(at, timezone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/** Preserve local start time across DST; choose earlier folds, shift gaps forward. */
export function moveStartToDate(
  startAt: number,
  date: string,
  timezone: string,
) {
  const original = wallParts(startAt, timezone);
  return zonedTimestamp(
    date,
    `${original.hour}:${original.minute}:${original.second}`,
    timezone,
  );
}

export function zonedTimestamp(
  date: string,
  time: string,
  timezone: string,
  preferredAt?: number,
) {
  const [hour, minute, second = 0] = time.split(":").map(Number);
  const [year, month, day] = date.split("-").map(Number);
  if (preferredAt !== undefined) {
    const preferred = wallParts(preferredAt, timezone);
    if (
      preferred.year === year &&
      preferred.month === month &&
      preferred.day === day &&
      preferred.hour === hour &&
      preferred.minute === minute &&
      preferred.second === second
    )
      return preferredAt;
  }
  const target = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsets = new Set(
    [-36, 0, 36].map((hours) => {
      const sample = target + hours * 3600000;
      return wallEpoch(sample, timezone) - sample;
    }),
  );
  const candidates = [...offsets].map((offset) => target - offset);
  const exact = candidates
    .filter((at) => wallEpoch(at, timezone) === target)
    .sort((a, b) => a - b);
  if (exact.length) return exact[0];
  return (
    candidates
      .filter((at) => wallEpoch(at, timezone) > target)
      .sort((a, b) => wallEpoch(a, timezone) - wallEpoch(b, timezone))[0] ??
    Math.max(...candidates)
  );
}
