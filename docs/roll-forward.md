# Automatic roll forward

Convex `tempo-roll-forward` runs every 15 minutes, even with every browser closed.
Each task uses its saved IANA timezone, so local midnight is processed within the
next polling interval. A daily UTC cron would not cover local midnight worldwide.

`rollForward:processBatch` is internal. Each transaction processes at most 100
open tasks via `by_status`; scheduled continuation pages use the same run timestamp.
The index remains stable when working dates change. Retries and overlapping runs
are safe: task update and activity insert commit together, and the new working date
and `lastRolledOn` make the same local day a no-op. Convex transaction conflicts
also protect simultaneous completion, deletion, rescheduling, and continuation.

Only dated unfinished tasks advance. Undated flexible work stays undated. Completed
tasks are excluded by the index; deleted tasks do not exist. Tempo currently has no
archived task state. Add an archive eligibility check before introducing archiving.
Fixed tasks wait until the last day occupied by their time block has ended. An
exact-midnight end belongs to the previous date. No new task or recurrence is
created by rollover.

`workDate` becomes the current local date. `originalWorkDate` is captured once;
`rollForwardCount` counts elapsed calendar days (including catch-up after downtime).
Original schedule/deadline, fixed timestamps, recurrence anchor, progress, notes,
threads, and subtasks remain unchanged. Expired fixed blocks are carried work, not
automatically booked into a new fixed slot. Reschedule explicitly chooses a new
schedule and clears the current automatic-roll marker. Continue Today suppresses
the carried lane for that day; next day the unfinished task is carried again.

Activity records use `rolled_forward`, with previous/new working dates and the
cumulative count in the description. Kanban/List show the original carried date
and count; the shared Today model recognizes persisted rollover dates.

Verification: `node scripts/check-roll-forward.mjs`, TypeScript, lint, Convex push.
The script checks timezone boundaries, catch-up, duplicate runs, protected tasks,
overnight blocks, exact midnight, continued work, and 205-record pagination using
the actual handler with an in-memory database. It does not mutate live fixtures.
An operator can invoke `npx convex run rollForward:processBatch '{}'` for catch-up;
the normal app cannot call this internal function. View cron runs and failures in
the linked Convex dashboard. Invalid legacy timezones are logged and skipped so
one malformed task cannot prevent other users' rollover.
