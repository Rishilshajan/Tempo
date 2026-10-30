/** Friendly display only; preserve IANA identifiers for all scheduling calculations. */
export function timeZoneLabel(timezone: string, at: number) {
  const part = (style: "long" | "longOffset") =>
    new Intl.DateTimeFormat("en", { timeZone: timezone, timeZoneName: style })
      .formatToParts(at)
      .find((value) => value.type === "timeZoneName")?.value;
  const name = part("long") ?? timezone;
  const offset = part("longOffset")?.replace("GMT", "UTC");
  return offset ? `${name} (${offset})` : name;
}
