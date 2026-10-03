/**
 * Tempo logger - thin wrapper over console with a consistent tag + markers.
 * Use for BOTH positive (success/event) and negative (warn/error) paths so
 * bugs are easy to trace in the browser console and server logs.
 *
 *   log.info("Splash mounted")
 *   log.success("Task created", task)
 *   log.warn("DB not wired yet")
 *   log.error("Create failed", err)
 */
type LogArgs = unknown[];

const TAG = "[Tempo]";

export const log = {
  info: (...args: LogArgs) => console.log(TAG, "ℹ️", ...args),
  success: (...args: LogArgs) => console.log(TAG, "✅", ...args),
  event: (...args: LogArgs) => console.log(TAG, "⚡", ...args),
  warn: (...args: LogArgs) => console.warn(TAG, "⚠️", ...args),
  error: (...args: LogArgs) => console.error(TAG, "❌", ...args),
};
