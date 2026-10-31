/** Consistent task timestamps: 26 Oct 2026, 09:12, in the task's timezone. */
export function taskTimestamp(timestamp: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(timestamp);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("day")} ${value("month").slice(0, 3)} ${value("year")}, ${value("hour")}:${value("minute")}`;
}
