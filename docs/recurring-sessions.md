# Recurring sessions

A fixed schedule is one booked session. Recurrence's end date/count limits the series, not the length of that booking. Estimates are separate effort values. A flexible due date reserves no timeline space.

New recurring tasks create a taskSeries template and independent tasks, including their own subtasks and completion state. An internal job prepares sessions thirty days ahead; a six-hour cron extends the window. Work is batched (twenty sessions, twenty-five series per pass); indexed series/ordinal request IDs make retries idempotent. Completing a session never advances or shifts this cadence. Existing legacy recurrence remains supported until explicitly corrected or edited with the future scope.

Start and end are moved by local calendar date in the saved timezone. Overnight/multi-day offsets are retained. DST gaps shift forward; folds select the earlier matching time. If a gap would collapse the end before the start, the original elapsed length is retained. Timeline blocks are clipped to each day's actual boundaries. Allocation uses the booked portion for fixed sessions; flexible/carried work uses effort estimates.

Weekly rules accept selected weekdays. Monthly rules explicitly select last-day clamping or skipping missing dates. The count includes the first session; repeat-until is inclusive of session start dates. Overlapping repeated sessions require an explicit multi-day/overlap choice.

The editor defaults to this occurrence. This preserves the series template. Choosing this and future replaces open future sessions through bounded jobs, retaining the old rows for audit and leaving completed sessions untouched. New versions do not recreate matching completed sessions. Notes/threads on superseded records are retained, not copied to newly created sessions.

Existing long recurring bookings show a correction preview in Edit Task. Use this correction moves the old booking end date to Repeat ends, changes the booking end to the same/next day, and selects future scope. Nothing changes until Save changes. Intentional long sessions can stay as multi-day sessions.

Development backend: giddy-corgi-8. Production deployment is separate. Validate with scripts/check-session-series.mjs, check-task-validation.mjs, check-today-dashboard.mjs, and check-task-details.mjs, plus lint/typecheck/build.
