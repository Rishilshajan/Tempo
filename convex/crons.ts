import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
// Local midnight is different for each task. Catch up safely after any missed run.
crons.interval(
  "tempo-roll-forward",
  { minutes: 15 },
  internal.rollForward.processBatch,
  {},
);
crons.interval(
  "extend-recurring-sessions",
  { hours: 6 },
  internal.series.extend,
  {},
);
export default crons;
