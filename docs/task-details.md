# Task details drawer

Implemented against the supplied task-details specification and four reference images.

## Interface

- Desktop: 540px right-side drawer, dimmed/blurred workspace, persistent overview and footer.
- Mobile: full-screen drawer, one row of four accessible tabs, independent content scrolling, safe-area padding. A scoped rule removes the scroll-lock gutter only while this mobile drawer is open.
- Overview: title first, close/menu at top right, followed by labeled rows for creation time, status, priority, domain, schedule/deadline and estimate, then a compact Markdown description. Edit opens the existing Create Task sheet in edit mode with all values prefilled, saving to the same task.
- Footer: complete/reopen, direct calendar rescheduling, and more actions. Choosing a date preserves fixed-task local times and overnight day offsets, or updates a flexible task’s date. Roll-forward information is contextual; opening the drawer does not move or duplicate tasks.
- Subtasks: compact bordered rows matching the Create/Edit Task form, with inline titles, shared date pickers and an options menu for editing, reordering and removal. The new-step composer contains just the title and add button; dates can be set on saved rows. Completion circles and activity records remain available. Copy task ID has been removed from both task menus.
- Description: three-line preview with an overflow-only Read more control, expanding in place with Read less.
- Thread: create, connect an existing task, join an existing thread, open related tasks, and unlink without deleting either entity. Linked cards read current task data.
- Activity: compact timeline cards with the timestamp above the event text, newest first, using `DD MMM YYYY, HH:mm` in the task timezone (24-hour clock).
- Notes: inline title and description editor inside the tab, with Save/Cancel, Markdown preview, general/research/decision/progress/output categories, timestamps, expand, edit, and delete. Add and edit do not open a modal.

All task views continue opening the existing `TaskDetailSheet`. The isolated in-memory dashboard preview keeps its sample-only adapter and shares the scheduling form; it does not send fake IDs to Convex.

## Storage and relationships

| Table         | Relationship                                    | Indexes                                |
| ------------- | ----------------------------------------------- | -------------------------------------- |
| `subtasks`    | `parentTaskId → tasks`                          | parent + position; parent + request ID |
| `notes`       | `taskId → tasks`                                | task; task + request ID                |
| `threads`     | owned thread metadata                           | owner; owner + request ID              |
| `threadTasks` | `threadId → threads`, `taskId → tasks`          | thread + task; task                    |
| `activity`    | `taskId → tasks` with typed metadata references | task + timestamp                       |

Tasks retain their existing scheduling, recurrence, status and ownership model. Optional `updatedAt`, `notesCount`, `threadCount`, and `subtasksNormalized` support the drawer. Counters are maintained transactionally; subtask completion is calculated, not manually stored.

The legacy embedded subtask field remains as an empty compatibility field after normalization. `toTaskView` reconstructs the existing task DTO from canonical subtask rows, keeping Today, My Tasks, domain views and recurrence compatible. Recurring occurrences copy and reset canonical subtasks, including relative due/scheduled dates.

The resumable internal migration processed **14 existing tasks** on the development deployment, preserving step order, due dates and completion timestamps. Legacy step IDs remain recognized for in-flight older clients. A separate idempotent activity migration added **14 known creation records** from Convex’s actual task creation timestamps; recorded subtask completion timestamps are also preserved where available. Other history and unknown actors are not guessed.

## Backend functions

`taskDetails` exposes authenticated metadata editing; subtask add/update/delete/move; note save/delete/list; thread create/link/unlink/list; linked-task pagination; and activity pagination. `migrateSubtasks` is internal-only.

Every public operation checks the authenticated owner of the parent task. Thread operations check ownership at both ends of the relationship. Note/subtask updates verify their actual parent. Creates and link operations are idempotent, and no-op updates do not add duplicate audit events. Shared Zod schemas validate content and durations; the server also checks new subtask dates in the task timezone.

Existing task creation, completion/reopening, status and rescheduling mutations write actual audit events. Activity has no public writer or editor. Metadata uses document references for relationships and structured before/after values for changes.

Notes/activity/linked-task reads are capped at 30 records per page. Tasks retain the existing 30-subtask limit; a task can join up to 20 threads. Note content is limited to 20,000 characters. Markdown uses `react-markdown` and `remark-gfm`, excludes raw HTML and remote image loading, and preserves safe links/code/tables/lists.

The tracked sample-data cleanup now removes normalized child rows in bounded batches, preserves real tasks/thread relationships, and does not delete a parent while children remain. **The existing sample task batch has not been deleted.**

## Validation

- Full-project ESLint, TypeScript and production Webpack build passed.
- `scripts/check-task-details.mjs`: actual handlers in isolation for ownership, Zod validation, CRUD, pagination, idempotency, migration, thread relationships and audit correctness.
- Existing task-handler, validation, recurrence and Today-dashboard checks passed, including weekday repeats, DST, cross-midnight schedules and completion/reopen behavior.
- `scripts/check-verification-data.mjs`: bounded child cleanup, exact manifest matching, no orphaned records, and preservation of real records/relationships.
- Browser: desktop drawer and 375×667 mobile layout, four tabs in one row, persistent footer, Markdown preview, blank-note validation toast, shared status dropdown closing on selection, selected-tab preservation, and live activity recording.
- A sample task was temporarily changed to In progress and restored to Not started. Both actual changes appear in its activity log; its final status is unchanged.

## Current limits

- Earlier changes without stored evidence are not reconstructed. The existing roll-forward mechanism is derived by Today queries, so it remains contextual information rather than an invented stored event.
- Fixed tasks currently store a start/end interval; flexible tasks store an optional deadline. This update preserves that distinction instead of introducing a separate fixed-task deadline model.
- Archive and external-calendar synchronization are not implemented in the current task model, so the drawer does not display fabricated archive/sync actions or indicators.
- Task/thread selectors paginate and filter the loaded results, with an explicit Load more action.
- Historical task dates may remain unchanged during an edit; selecting a new past date is rejected. Full-form edits preserve subtask document IDs, completed/scheduled timestamps, notes and thread links, and reject stale subtask membership/order snapshots.
