# TEMPO-003 - Today dashboard ownership

See [the current frontend code map](../code-map.md) for stable function IDs and caller references.

## Structure

- today-dashboard.tsx keeps the public entry/error boundary and compatibility exports.
- connected-day.tsx composes the live day. use-day-data.tsx owns its existing subscriptions, local clock, pagination and focus/plan/reschedule actions.
- day-command-center.tsx composes the shared daily view. use-day-view-model.tsx owns local filtering, summaries, greeting and presentation state.
- day-heading.tsx, day-focus.tsx, day-task-panel.tsx, day-task-row.tsx and day-timeline.tsx receive their existing data/actions. No new queries are introduced by the split.
- today-surface.tsx composes existing workspace views and overlays. use-today-surface.tsx owns its local navigation/editor state; today-shell-config.tsx owns the shared prop contract and client-only account widgets.
- today-workspace.tsx remains the existing domain/workspace data and task-action owner. WorkspaceSearch keeps its separate authenticated search query.

## Existing shared interfaces

Task creation/editing uses CreateTaskSheet -> TaskForm -> one useTaskFormState model. Field sections share that model; submitTaskForm preserves validation and submit behavior. MyTasksBoard uses one useMyTasksBoard state owner and existing board cards. TaskDetailWorkspace uses one useTaskDetailWorkspace owner and existing details sections.

## Behavior preserved

- Desktop keeps a viewport-bound frame, fixed focus/task controls and independently scrolling task body/timeline. Mobile retains natural flow, daily tabs and bottom navigation.
- Main focus persists per owner/date; completed focus remains visible. Task status, daily focus and Plan today are distinct actions.
- Fixed tasks retain scheduled timestamps; missed bookings are reviewed or explicitly rescheduled. Plan today does not silently move meetings or change deadlines.
- Historical completion reflects current completedAt; reopening clears that timestamp. Details retain activity history.
- Daily summary/domain scope, paginated partial-count indicator, subtasks, recurrence, notifications and ownership checks keep existing behavior.

## Size and validation contract

Every frontend source file under src/ must stay below 500 lines, including descriptions. app/globals.css remains the global entry and imports ordered global stylesheet parts. There are no new CSS Modules or third-party dependencies.

Run npm run typecheck, npm test and npm run build. The suite includes frontend size/data-boundary checks and offline rendering of the extracted daily/form/header sections. These do not claim a real signed-in browser journey.
