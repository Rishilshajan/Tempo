# Tempo frontend code map

Current implementation map for landing, authentication and the Today dashboard. Paths are relative to the Tasks project. Updated 2026-11-23.

## Conventions

- TEMPO-001: landing/public branding. TEMPO-002: authentication. TEMPO-003: Today and its reused task interfaces. TEMPO-004: My Tasks and shared board/calendar helpers. TEMPO-005: task creation and shared editing. TEMPO-006: domain creation, navigation and management.
- File headers describe ownership; function comments use stable IDs plus purpose, caller reference and trigger. Inline callbacks inherit the owning function description.
- TEMPO-003-F10 is retired (removed allocation interaction). Do not reuse it.
- Frontend source files in src/ must be strictly below 500 lines, including comments. Backend/generated files, dependencies and build output are outside this UI contract.

## Runtime and hook ownership

- Landing route checks the server session, renders SiteHeader and landing sections, and uses LandingSessionRedirect for restored authenticated sessions.
- AuthLayout reuses SiteHeader variant=auth. AuthPanel selects Clerk SignIn/SignUp. AuthTransition keeps Clerk mounted while progress replaces completed auth forms; dashboard/loading.tsx reuses AuthProgress.
- DashboardPage -> TodayWorkspace/ConnectedToday -> TodaySurface/useTodaySurface -> TodayDashboard/ConnectedDay/useDayData -> DayCommandCenter/useDayViewModel -> DayHeading, DayFocus, DayTaskPanel, DayTaskRow, DayTimeline.
- useDayData owns the existing day/subtask subscriptions and focus/plan/reschedule mutations. View-model and presentation sections do not start duplicate queries. ConnectedToday remains the workspace/domain data owner. WorkspaceSearch owns only its existing search query.
- CreateTaskSheet -> TaskForm -> useTaskFormState and submitTaskForm; basics, schedule, subtasks and recurrence sections receive that same draft model.
- MyTasksBoard -> useMyTasksBoard -> existing lane/card helpers. TaskDetailWorkspace -> useTaskDetailWorkspace -> existing details sections. These interfaces are shared by Today/My Tasks and were split without replacing their data operations.
- SiteHeader/Wordmark and dashboard branding now reuse TempoLogo and the same image asset. Button, TaskSelect, TaskStatusSelect, TaskRescheduleCalendar and ActionTooltip remain shared controls.

## Direct caller guide

| Owner | Calls/reuses |
| --- | --- |
| today-dashboard.tsx | ConnectedDay; compatibility exports for existing imports |
| connected-day.tsx | useDayData, DayCommandCenter, DayNavigation |
| day-command-center.tsx | useDayViewModel, DayHeading, DayFocus, DayTaskPanel, DayTimeline |
| day-task-panel.tsx | DayTaskRow for daily, review and completed tasks |
| day-task-row.tsx | TaskStatusSelect, TaskRescheduleCalendar, ActionTooltip, Button |
| today-surface.tsx | useTodaySurface, shell config, existing task/domain/settings interfaces |
| task-form.tsx | useTaskFormState, submitTaskForm, task-form-* sections |
| my-tasks-board.tsx | useMyTasksBoard, board-cards, existing calendar/list |
| task-detail-workspace.tsx | useTaskDetailWorkspace, existing subtasks/notes/threads/activity sections |

## TEMPO-001 - Landing

| File | Named functions / references |
| --- | --- |
| src/app/page.tsx | LandingPage (TEMPO-001-F01) |
| src/components/landing/landing-page.tsx | HeroSection (TEMPO-001-F05); DomainIllustration (TEMPO-001-F06); BenefitsSection (TEMPO-001-F07); HowItWorksSection (TEMPO-001-F08); LandingFooter (TEMPO-001-F09) |
| src/components/landing/mobile-navigation.tsx | MobileNavigation (TEMPO-001-F10) |
| src/components/landing/product-preview.tsx | PreviewTask (TEMPO-001-F11); ProductPreview (TEMPO-001-F12) |
| src/components/landing/site-header.tsx | Wordmark (TEMPO-001-F02); SignupLink (TEMPO-001-F03); SiteHeader (TEMPO-001-F04) |
| src/components/brand/tempo-logo.tsx | TempoLogo |

## TEMPO-002 - Authentication

| File | Named functions / references |
| --- | --- |
| src/app/(auth)/layout.tsx | AuthLayout (TEMPO-002-F01) |
| src/app/(auth)/login/[[...login]]/page.tsx | LoginPage (TEMPO-002-F02) |
| src/app/(auth)/signup/[[...signup]]/page.tsx | SignupPage (TEMPO-002-F03) |
| src/components/auth/auth-panel.tsx | AuthPanel (TEMPO-002-F04); AuthPanelContent (TEMPO-002-F11) |
| src/components/auth/auth-progress.tsx | AuthProgress (TEMPO-002-F09) |
| src/components/auth/auth-transition.tsx | AuthTransition (TEMPO-002-F10) |
| src/components/auth/landing-session-redirect.tsx | LandingSessionRedirect (TEMPO-002-F05) |
| src/components/auth/sign-out-button.tsx | TempoSignOutButton (TEMPO-002-F07) |
| src/components/auth/workspace-account.tsx | WorkspaceAccount (TEMPO-002-F06) |
| src/components/auth/workspace-connection.tsx | WorkspaceConnection (TEMPO-002-F08) |

## TEMPO-003 - Today dashboard

| File | Named functions / references |
| --- | --- |
| src/app/(protected)/dashboard/page.tsx | DashboardPage (TEMPO-003-F01) |
| src/app/(protected)/dashboard/loading.tsx | DashboardLoading (TEMPO-002-F12) |
| src/components/today/connected-day.tsx | ConnectedDay (TEMPO-003-F06) |
| src/components/today/day-command-center.tsx | DayCommandCenter (TEMPO-003-F09) |
| src/components/today/day-errors.ts | errorMessage (TEMPO-003-F08) |
| src/components/today/day-focus.tsx | DayFocus (TEMPO-003-F20) |
| src/components/today/day-heading.tsx | DayHeading (TEMPO-003-F19) |
| src/components/today/day-navigation.tsx | DayNavigation (TEMPO-003-F07) |
| src/components/today/day-task-panel.tsx | DayTaskPanel (TEMPO-003-F21) |
| src/components/today/day-task-row.tsx | DayTaskRow (TEMPO-003-F11) |
| src/components/today/day-timeline.tsx | DayTimeline (TEMPO-003-F12) |
| src/components/today/first-time-empty-state.tsx | FirstTimeEmptyState (TEMPO-003-F14) |
| src/components/today/today-dashboard.tsx | TodayDashboard (TEMPO-003-F05) |
| src/components/today/today-shell-config.tsx | Shared types/configuration or compatibility entry |
| src/components/today/today-surface.tsx | TodaySurface (TEMPO-003-F04) |
| src/components/today/today-types.ts | Shared types/configuration or compatibility entry |
| src/components/today/today-workspace.tsx | TodayWorkspace (TEMPO-003-F02); ConnectedToday (TEMPO-003-F03) |
| src/components/today/use-day-data.tsx | useDayData (TEMPO-003-F17) |
| src/components/today/use-day-view-model.tsx | useDayViewModel (TEMPO-003-F18) |
| src/components/today/use-today-surface.tsx | useTodaySurface (TEMPO-003-F22) |
| src/components/today/workspace-search.tsx | WorkspaceSearch (TEMPO-003-F13) |
| src/components/tasks/detail-shared.tsx | detailError; detailTime; DetailEmpty; ConfirmDelete; DetailRow (TEMPO-003-F40) |
| src/components/tasks/task-detail-workspace.tsx | TaskDetailWorkspace (TEMPO-003-F41) |
| src/components/tasks/use-task-detail-workspace.tsx | useTaskDetailWorkspace (TEMPO-003-F42) |

## TEMPO-004 - My Tasks

Updated 2026-11-24. This map describes the current implementation.

### Entry and ownership

DashboardPage -> TodayWorkspace/ConnectedToday -> TodaySurface -> MyTasksBoard -> useMyTasksBoard. TodaySurface selects My Tasks through the existing view/domain URL state. ConnectedToday owns the task/domain feeds and completion/progress callbacks. useMyTasksBoard owns local view/filter/collapse/drag state and the existing move/reschedule mutations. Presentation modules receive this data; no duplicate subscriptions were introduced.

Desktop exposes Kanban, List and Calendar. Mobile exposes List and Calendar; Kanban falls back to List. Month, Week and Day are calendar periods. The current Week implementation displays the weeks in the displayed month.

View controls sit beside My Tasks. Desktop Filters sits on the domain row; mobile uses an icon beside Calendar. Filter options expand after the domain row. Domain chips are horizontally scrollable. Active-filter chips clear individual values.

### Modules and exports

| File | Responsibility / callers |
| --- | --- |
| src/components/tasks/my-tasks-board.tsx | My Tasks composition and filter/view controls. Used by TodaySurface. |
| src/components/tasks/use-my-tasks-board.tsx | My Tasks state, clock, filters and drag mutations. Used by MyTasksBoard. |
| src/components/tasks/board-cards.tsx | Shared Kanban lanes, cards, list and calendar-agenda rows. Used by MyTasksBoard; MyTasksCalendar. |
| src/components/tasks/board-config.ts | Four lane definitions and the board prop contract. Used by MyTasksBoard; useMyTasksBoard; LaneColumn. |
| src/components/tasks/my-tasks-calendar.tsx | Month/week/day calendar and selected-day agenda. Used by MyTasksBoard. |
| src/components/tasks/task-metadata-pills.tsx | Shared domain, schedule, effort, subtask and thread badges. Used by BoardCard; CompactBoardRow; DayTaskRow. |
| src/components/tasks/task-status.tsx | Shared status controls and badge tone definitions. Used by BoardCard; CompactBoardRow; DayTaskRow; TaskList. |
| src/components/tasks/task-select.tsx | Shared select input, priority options and priority label. Used by MyTasksBoard; DayTaskPanel; task forms. |
| src/components/tasks/task-reschedule-calendar.tsx | Shared validated reschedule popover. Used by BoardCard; CompactBoardRow; DayTaskRow. |
| src/lib/kanban-model.ts | Pure lane classification, task-date and combined-filter rules. Used by useMyTasksBoard; MyTasksBoard; MyTasksCalendar. |
| src/lib/calendar-model.ts | Pure date-grid and selected-day task calculations. Used by MyTasksCalendar. |

### Functions and named callbacks

Every named function/helper below has the same source ID. Anonymous JSX, effect, memo and array callbacks inherit the owning function; they are not independently exported APIs. Types/imports have no runtime trigger.

| Reference | Function / file | Purpose | Used by | Trigger |
| --- | --- | --- | --- | --- |
| TEMPO-004-F01 | MyTasksBoard - src/components/tasks/my-tasks-board.tsx | Composes domain filters, views, filter options and shared editors through callbacks. | TodaySurface | The caller renders, recomputes or handles its associated interaction. |
| TEMPO-004-F02 | useMyTasksBoard - src/components/tasks/use-my-tasks-board.tsx | Owns one board state model, clock, sensors and existing move/reschedule mutations. | MyTasksBoard | The caller renders, recomputes or handles its associated interaction. |
| TEMPO-004-F03 | update - src/components/tasks/use-my-tasks-board.tsx | Updates local filter or clock state in its owning hook. | useMyTasksBoard clock effect | Mount and every 60 seconds; cleared on unmount.
| TEMPO-004-F04 | update - src/components/tasks/use-my-tasks-board.tsx | Updates local filter or clock state in its owning hook. | MyTasksBoard domain/date/priority/deadline/sort controls | A filter control or active-filter chip changes.
| TEMPO-004-F05 | laneRows - src/components/tasks/use-my-tasks-board.tsx | Selects visible tasks for one workflow lane. | MyTasksBoard; drop | A lane renders or a drag operation computes neighbors.
| TEMPO-004-F06 | saveMove - src/components/tasks/use-my-tasks-board.tsx | Persists a guarded lane move and neighbor ordering. | drop; existing board move callbacks | A supported lane move is requested.
| TEMPO-004-F07 | drop - src/components/tasks/use-my-tasks-board.tsx | Resolves a drag target, guards invalid moves and delegates persistence. | useMyTasksBoard | DndContext emits onDragEnd. |
| TEMPO-004-F08 | LaneColumn - src/components/tasks/board-cards.tsx | Renders a collapsible drop target with lane count and empty state. | MyTasksBoard | Each visible Kanban/List lane renders.
| TEMPO-004-F09 | BoardCard - src/components/tasks/board-cards.tsx | Renders a draggable Kanban card or delegates to the compact row. | MyTasksBoard; DragOverlay | A lane task or drag preview renders.
| TEMPO-004-F10 | CompactBoardRow - src/components/tasks/board-cards.tsx | Renders the shared List and Calendar-agenda task row. | BoardCard; MyTasksBoard calendar renderTask | A List row or selected-day calendar card renders.
| TEMPO-004-F11 | shortBoardDate - src/components/tasks/board-cards.tsx | Formats a stored calendar date for a badge or filter label. | useMyTasksBoard active-filter labels | A custom or range filter label is computed.
| TEMPO-004-F12 | mobileBoardSnapshot - src/components/tasks/board-cards.tsx | Reads the mobile breakpoint for useSyncExternalStore. | useMyTasksBoard/useSyncExternalStore | React reads the responsive snapshot.
| TEMPO-004-F13 | subscribeMobileBoard - src/components/tasks/board-cards.tsx | Subscribes to responsive breakpoint changes and returns cleanup. | useMyTasksBoard/useSyncExternalStore | Subscription setup and breakpoint changes; returns cleanup.
| TEMPO-004-F14 | asDate - src/components/tasks/my-tasks-calendar.tsx | Converts a stored date string for calendar controls. | MyTasksCalendar; label | A date is selected, displayed or formatted.
| TEMPO-004-F15 | label - src/components/tasks/my-tasks-calendar.tsx | Formats a stored date for calendar labels. | MyTasksCalendar; CalendarTaskDay | A calendar heading, cell or date range renders.
| TEMPO-004-F16 | MyTasksCalendar - src/components/tasks/my-tasks-calendar.tsx | Composes date navigation, calendar periods and selected-day agenda. | MyTasksBoard | The caller renders, recomputes or handles its associated interaction. |
| TEMPO-004-F17 | choose - src/components/tasks/my-tasks-calendar.tsx | Selects a date, resets agenda scroll and optionally reveals it on mobile. | MyTasksCalendar | A date cell or Today action is selected. |
| TEMPO-004-F18 | move - src/components/tasks/my-tasks-calendar.tsx | Moves the displayed month or selected day for the current period. | MyTasksCalendar | Previous/next period is clicked. |
| TEMPO-004-F19 | CalendarTaskDay - src/components/tasks/my-tasks-calendar.tsx | Renders a date cell with task previews and overflow count. | Calendar via its DayButton override | A month date cell renders.
| TEMPO-004-F20 | TaskDomainPill - src/components/tasks/task-metadata-pills.tsx | Renders the domain name and appearance using existing shared branding. | TaskMetadataPills | The metadata group renders its domain badge.
| TEMPO-004-F21 | TaskMetadataPills - src/components/tasks/task-metadata-pills.tsx | Composes optional metadata badges in a consistent wrapping order. | BoardCard; CompactBoardRow; DayTaskRow | The caller renders, recomputes or handles its associated interaction. |
| TEMPO-004-F22 | shortBoardDate - src/components/tasks/task-metadata-pills.tsx | Formats a stored calendar date for a badge or filter label. | TaskMetadataPills | Flexible due-date or carried-date metadata renders.
| TEMPO-004-F23 | TaskPill - src/components/tasks/task-status.tsx | Applies the shared badge component and semantic tone. | BoardCard; CompactBoardRow; DayTaskRow; TaskList | The caller renders, recomputes or handles its associated interaction. |
| TEMPO-004-F24 | TaskStatusSelect - src/components/tasks/task-status.tsx | Provides the single Not started/In progress/Completed dropdown. | BoardCard; CompactBoardRow; DayTaskRow; TaskList | The caller renders, recomputes or handles its associated interaction. |
| TEMPO-004-F25 | change - src/components/tasks/task-status.tsx | Persists the selected task status with busy, error and recurrence handling. | TaskStatusSelect | The status dropdown selects a different value. |
| TEMPO-004-F26 | TaskSelect - src/components/tasks/task-select.tsx | Renders the shared accessible select control and options. | MyTasksBoard; DayTaskPanel; task forms | The caller renders, recomputes or handles its associated interaction. |
| TEMPO-004-F27 | PriorityLabel - src/components/tasks/task-select.tsx | Resolves the stored priority to its text label. | BoardCard; CompactBoardRow; DayTaskRow; TaskDetailWorkspace; task forms | A priority label renders.
| TEMPO-004-F28 | TaskRescheduleCalendar - src/components/tasks/task-reschedule-calendar.tsx | Composes date selection and validates a new schedule before persistence. | BoardCard; CompactBoardRow; DayTaskRow | The caller renders, recomputes or handles its associated interaction. |
| TEMPO-004-F29 | asDate - src/components/tasks/task-reschedule-calendar.tsx | Converts a stored date string for calendar controls. | TaskRescheduleCalendar | The owning function renders or invokes this named helper. |
| TEMPO-004-F30 | select - src/components/tasks/task-reschedule-calendar.tsx | Validates and saves a selected date while preserving fixed-task local times. | TaskRescheduleCalendar | The reschedule calendar selects a date. |
| TEMPO-004-F31 | clock - src/components/tasks/task-reschedule-calendar.tsx | Formats a fixed timestamp in the task timezone for rescheduling. | select | The owning function renders or invokes this named helper. |
| TEMPO-004-F32 | taskLane - src/lib/kanban-model.ts | Classifies current task state into a workflow lane. | useMyTasksBoard; MyTasksBoard; MyTasksCalendar | The caller renders, recomputes or handles its associated interaction. |
| TEMPO-004-F33 | taskDate - src/lib/kanban-model.ts | Resolves the relevant date for filtering and sorting. | filterTasks | Date filtering or scheduled-time sorting runs.
| TEMPO-004-F34 | filterTasks - src/lib/kanban-model.ts | Applies combined domain/date/priority/deadline filters and sorting. | useMyTasksBoard | Board input, clock or filters change.
| TEMPO-004-F35 | calendarWeek - src/lib/calendar-model.ts | Returns the seven date strings for a Monday-based week. | calendarMonthWeeks | The displayed month grid is constructed.
| TEMPO-004-F36 | calendarMonthWeeks - src/lib/calendar-model.ts | Builds the weeks intersecting the displayed month. | MyTasksCalendar | The displayed month changes or the calendar recomputes.
| TEMPO-004-F37 | calendarTasks - src/lib/calendar-model.ts | Selects and orders tasks belonging to a date in the active timezone. | MyTasksCalendar; CalendarTaskDay | The selected date, calendar period or task data changes.

### Contracts, shared UI and behavior

- board-config.ts exports columns (planned/progress/carried/completed) and Props. Props connects existing parent-owned data/actions; columns supplies lane labels, empty messages, icons and tones.
- kanban-model.ts exports Lane and BoardFilters; these contracts drive rendering and pure combined filtering.
- task-status.tsx exports taskTones and allocationTones; task-select.tsx exports priorities. These are shared configuration, evaluated at module load and consumed during render.
- Existing Button, Badge, Select, DatePicker, Calendar, Popover, DropdownMenu and ActionTooltip remain the shared primitives. No replacement component library or fetching layer was added.
- TaskMetadataPills is shared with Today (TEMPO-003). TaskStatusSelect and TaskRescheduleCalendar preserve existing validation, permissions and mutation paths. Calendar agenda reuses CompactBoardRow; List does not have a separate completion checkbox.
- Dragging to Rolled Forward is rejected; the carried lane is derived. Completion/reopening and rescheduling use existing backend guards. A plain status change is distinct from planning a task for today.
- Shared create/edit interfaces use TEMPO-005; task detail presentation retains its TEMPO-003 IDs and is referenced from TodaySurface. Landing/auth remain TEMPO-001/002. Former 003 IDs F32-F39 for the extracted board modules are superseded here; do not reuse those retired IDs.
- Global CSS stays in app/styles/dashboard-1.css through globals.css. Calendar/board selectors are feature scoped; shared badge primitives retain their own styling.

### Verification

All frontend TS/TSX/CSS files in src/ must stay strictly below 500 lines including comments. scripts/check-ui-structure.mjs enforces this plus query-free presentation sections. npm run typecheck, npm test and npm run build are the compile, regression and production gates. Live visual verification is a separate check.

The npm run lint command uses TypeScript unused-local/parameter diagnostics, the existing explicit-any check and frontend structure checks. ESLint is not installed or claimed by this command.

## TEMPO-005 - Task creation and shared editing

The existing right-side sheet is retained. CreateTaskSheet -> TaskForm -> one useTaskFormState draft -> Basics/Schedule/Subtasks/Recurrence. submitTaskForm validates and calls the parent-owned callback; it does not introduce a second task mutation. EditTaskSheet reuses this flow with existing update and domain-query adapters.

### Modules and exports

| File | Responsibility | Used by |
| --- | --- | --- |
| src/components/tasks/create-task-sheet.tsx | Create/edit sheet shell, focus target and saving dismissal guard | TodaySurface; EditTaskSheet |
| src/components/tasks/task-form.tsx | Shared form composition, scrolling body and action footer | CreateTaskSheet |
| src/components/tasks/use-task-form-state.tsx | Single draft-state owner and derived validation | TaskForm |
| src/components/tasks/submit-task-form.ts | Validated submission through parent-owned persistence | TaskForm.onSubmit |
| src/components/tasks/task-form-basics.tsx | Title, description, domain, priority and edit scope fields | TaskForm |
| src/components/tasks/task-form-schedule.tsx | Schedule, timezone and duration fields | TaskForm |
| src/components/tasks/task-form-subtasks.tsx | Subtask drafts, dates, ordering and limits | TaskForm |
| src/components/tasks/task-form-recurrence.tsx | Repeat cadence and termination fields | TaskForm |
| src/components/tasks/task-form-date-field.tsx | Shared date/time field adapter | TaskFormSchedule |
| src/components/tasks/task-form-types.ts | Shared Props and Step type contracts | CreateTaskSheet; useTaskFormState; submitTaskForm |
| src/components/tasks/edit-task-sheet.tsx | Edit adapter using the shared creation form | TaskDetailWorkspace |

Props defines the parent callback/prefill/availability contract; Step defines stable subtask draft keys. Both are types only. Existing Button, Input, Textarea, Select, Sheet, DatePicker, TimePicker and DropdownMenu primitives are reused. Shared TaskSelect/PriorityLabel retain TEMPO-004 IDs; validation and recurrence utilities remain shared dependencies.

### Functions

Anonymous JSX/effect/array callbacks inherit the owning function description.

| Reference | Function / file | Purpose | Used by | Trigger |
| --- | --- | --- | --- | --- |
| TEMPO-005-F01 | CreateTaskSheet - src/components/tasks/create-task-sheet.tsx | Renders the shared sheet and guards dismissal while saving. | TodaySurface; EditTaskSheet | Create task is opened or an edit sheet is mounted. |
| TEMPO-005-F02 | TaskForm - src/components/tasks/task-form.tsx | Composes one draft model and delegates submission. | CreateTaskSheet | The sheet opens; remains mounted until close. |
| TEMPO-005-F03 | useTaskFormState - src/components/tasks/use-task-form-state.tsx | Owns draft fields, prefills, clock, errors and subtask actions. | TaskForm | The form mounts, a field changes or its clock refreshes. |
| TEMPO-005-F04 | timeOf - src/components/tasks/use-task-form-state.tsx | Formats a timestamp in the selected task timezone. | useTaskFormState; submitTaskForm | Time prefills or DST consistency checks run. |
| TEMPO-005-F05 | refresh - src/components/tasks/use-task-form-state.tsx | Refreshes the validation clock. | useTaskFormState effect | Every 30 seconds or window focus; effect cleans up. |
| TEMPO-005-F06 | timestamp - src/components/tasks/use-task-form-state.tsx | Validates date/time syntax and resolves timezone timestamps. | useTaskFormState | Draft schedule values are recomputed. |
| TEMPO-005-F07 | issuesForRepeat - src/components/tasks/use-task-form-state.tsx | Builds a candidate schedule and computes create/edit date issues. | useTaskFormState; TaskFormRecurrence | Date, recurrence, subtask or edit-scope state changes. |
| TEMPO-005-F08 | notifyValidation - src/components/tasks/use-task-form-state.tsx | Shows the existing validation toast. | submitTaskForm; TaskFormRecurrence | Validation rejects input. |
| TEMPO-005-F09 | changeValue - src/components/tasks/use-task-form-state.tsx | Builds a field setter that clears prior errors. | TaskFormSchedule; TaskFormRecurrence | A bound field changes. |
| TEMPO-005-F10 | changeDuration - src/components/tasks/use-task-form-state.tsx | Selects a preset/custom estimate and synchronizes duration fields. | TaskFormSchedule | The estimated-duration dropdown changes. |
| TEMPO-005-F11 | addStep - src/components/tasks/use-task-form-state.tsx | Appends a nonempty subtask draft up to the limit. | TaskFormSubtasks | Add or Enter is used on the subtask input. |
| TEMPO-005-F12 | updateSteps - src/components/tasks/use-task-form-state.tsx | Updates subtask draft state and clears prior errors. | TaskFormSubtasks; addStep; moveStep | Subtask text, date, order or membership changes. |
| TEMPO-005-F13 | moveStep - src/components/tasks/use-task-form-state.tsx | Reorders neighboring draft subtasks without persistence. | TaskFormSubtasks | A subtask move-up or move-down action is clicked. |
| TEMPO-005-F14 | submitTaskForm - src/components/tasks/submit-task-form.ts | Validates input, reuses an idempotency key and calls the parent save callback. | TaskForm.onSubmit | The user submits with the create/save action or Enter. |
| TEMPO-005-F15 | TaskFormBasics - src/components/tasks/task-form-basics.tsx | Renders basic fields and recurring-edit scope controls. | TaskForm | The shared form renders or its draft changes. |
| TEMPO-005-F16 | TaskFormSchedule - src/components/tasks/task-form-schedule.tsx | Renders flexible/fixed dates, times and estimated effort. | TaskForm | Schedule or estimate fields render/change. |
| TEMPO-005-F17 | TaskFormSubtasks - src/components/tasks/task-form-subtasks.tsx | Renders bounded subtask rows and add/reorder/remove controls. | TaskForm | Subtask drafts render or change. |
| TEMPO-005-F18 | TaskFormRecurrence - src/components/tasks/task-form-recurrence.tsx | Renders recurrence cadence, days and termination options. | TaskForm | Repeat selection or repeat settings change. |
| TEMPO-005-F19 | DateField - src/components/tasks/task-form-date-field.tsx | Adapts DatePicker or TimePicker with the current value and validity state. | TaskFormSchedule | A schedule date/time field renders. |
| TEMPO-005-F20 | EditTaskSheet - src/components/tasks/edit-task-sheet.tsx | Loads editable domains and adapts updateTask to the shared form. | TaskDetailWorkspace | The user opens task editing. |

### Implemented desktop/mobile refinements - 2026-11-24

The sheet design, scrolling body and fixed footer are retained. Custom Hours/Minutes appear only for Custom estimate. New fixed drafts use the next future quarter-hour and a one-hour elapsed duration, rolling dates across midnight; explicitly selected future dates start at 09:00, and edit/timeline values remain unchanged. Custom + Week preview includes selected weekdays, matching submission.

Validation is shown near schedule/repeat/subtask fields and submission focuses the first invalid control. DateField associates its local error with the field group and the actual DatePicker/TimePicker trigger. Subtask-date messages are shown and associated per row. Unsaved draft dismissal via Cancel, X, Escape or outside click requests confirmation; saving remains protected, and successful saves close directly. The draft is not persisted across page reloads. No broad desktop/mobile redesign or new fetching layer was introduced.

| File | Additional ownership |
| --- | --- |
| src/lib/task-time-defaults.ts | Pure default timestamp helper; called by useTaskFormState. |
| src/components/tasks/task-form-validation.ts | Pure issue-to-control mapping and scheduled first-error focus; called by submitTaskForm. |

| Reference | Function | Used by | Trigger |
| --- | --- | --- | --- |
| TEMPO-005-F21 | taskTimeDefaults | useTaskFormState | New draft initializes fixed-time defaults. |
| TEMPO-005-F24 | taskIssueSelector | focusTaskIssue | A validation issue is mapped to its associated control. |
| TEMPO-005-F25 | focusTaskIssue | submitTaskForm | A validation/save error is rendered, then the control is revealed and focused. |
| TEMPO-005-F30 | requestOpenChange | CreateTaskSheet header and TaskForm | Cancel, X or successful submit requests close; dirty dismissals ask confirmation. |

### Complexity and verification

Draft rendering/validation scales with loaded domains and subtasks: approximately O(d + s), with s capped at 30. Timezone conversion samples a fixed number of offsets. Submission maps/validates the bounded draft; persistence/network latency is separate and has not been measured. Current field changes rerender the parent draft, but no evidence here justifies a new fetching layer or broad memoization.

This migration supersedes the task-form TEMPO-003 IDs F23-F31; those IDs are retired. The implemented refinements above preserve existing validation and persistence paths. All frontend TS/TSX/CSS files remain subject to the strict under-500-lines check. Verification uses npm run lint, npm run typecheck, npm test and npm run build. check-task-validation.mjs covers future defaults/DST, first-error focus targeting and real schedule-section rendering for No estimate/preset/Custom.

## Global styles

app/globals.css stays the single global entry point. Its ordered imports in app/styles/ preserve the original cascade: theme-* -> landing-* -> auth-* -> dashboard-*. No CSS Modules were added. The bundled shadcn-tailwind.css entry imports shadcn-* parts; the existing license remains in app/shadcn-tailwind.LICENSE.md. Numbered parts preserve their original order and keep each file below 500 lines.

## Verification

- scripts/check-ui-structure.mjs: checks every frontend TS/TSX/CSS file in src/ is below 500 lines and that Today presentation sections have no query/mutation hooks.
- npm test: existing auth, task handlers, focus, recurrence, calendar, Kanban, notifications and overlay-history coverage.
- npm run build and npm run typecheck: frontend/Convex compile checks. Browser visual verification is distinct from these offline checks.

Historical completion uses current completedAt, not immutable snapshots. Planning carried work preserves original deadlines. Backend schema and query behavior are unchanged by this structural cleanup.

## Shared backend notification scheduling

This backend dependency serves Today, My Tasks and TEMPO-005 task creation/editing. It is recorded here in the single code map; it does not change their UI feature IDs.

| File / entry | Responsibility | Trigger |
| --- | --- | --- |
| convex/notificationScheduling.ts: syncTaskNotifications | Refreshes a versioned task schedule; invalidates obsolete callbacks. | Task create/edit/reschedule/status/subtask changes, recurrence generation and roll-forward. |
| convex/notificationScheduling.ts: syncOwnerNotifications | Refreshes daily work and queues a bounded owner rebuild. | Notification preference/device changes and account bootstrap. |
| convex/notificationScheduling.ts: syncOwnerDailyNotifications | Refreshes the owner daily notification schedule. | Owner setup and completed roll-forward batches. |
| convex/notificationScheduling.ts: wake | Checks current task/preferences and emits eligible reminders, then arms the next callback. | A task/owner schedule reaches its due time. |
| convex/notificationScheduling.ts: rebuildOwner / bootstrapOwners | Rebuilds open-task schedules in bounded pages; force mode repairs changes made while disabled. | Initial migration, preference changes, explicit rollout/re-enable repair. |
| convex/notificationScheduling.ts: reconcile / runMaintenance | Repairs indexed overdue schedules and invokes roll-forward maintenance. | Hourly cron, gated by TEMPO_BACKGROUND_JOBS_ENABLED. |
| convex/notificationPlan.ts | Computes task reminder thresholds and next daily wake without database reads. | Scheduled wake calculation. |
| convex/notificationDelivery.ts | Deduplicates inbox entries and schedules immediate/quiet-hour push delivery. | An eligible reminder is emitted. |
| convex/notificationPush.ts / notifications.ts: deliveryDevices | Rejects obsolete task generations/preferences and resolves eligible push devices. | A queued push executes; explicit test push retains its own path. |
| convex/schema.ts | Stores indexed notificationSchedules and account migration version. | Schedule mutations and indexed recovery. |
| scripts/check-notification-scheduling.mjs / check-notifications.mjs | Verifies timing, lifecycle guards, quiet hours, bootstrap, indexed recovery and disabled zero-read behavior. | npm test. |

Mutation integrations live in convex/tasks.ts, taskDetails.ts, taskRecurrence.ts, series.ts and rollForward.ts. Rollout instructions and the one-time forced bootstrap are in DEPLOY.md. Historical usage totals do not reset after optimization; compare equal post-deployment measurement windows.

## TEMPO-006 - Domains

Navigation selects tasks; Settings owns management. Desktop and mobile share All domains, domain links and Create domain. Mobile navigation is Today / My Tasks / Domains / Settings. A selected domain opens its filtered My Tasks view. Deleting keeps tasks in Uncategorized.

| ID | Function / file | Purpose and trigger |
| --- | --- | --- |
| TEMPO-006-F01 | DomainNavigation — src/components/domains/domain-navigation.tsx | Renders selectable domains, selected feedback, long-name titles and empty state; runs when the chooser renders or a domain is selected. |
| TEMPO-006-F02 | CreateDomainSheet — src/components/domains/create-domain-sheet.tsx | Owns create/edit overlay and saving/discard guards; triggered by Create domain or Settings Edit. |
| TEMPO-006-F03 | requestClose — same file | Requests dirty confirmation for X/Cancel; Escape/outside dismissal uses the same guard. Successful save closes directly. |
| TEMPO-006-F04 | DomainForm / submit — same file | Edits name/purpose/appearance and validates/persists once; triggered by input changes and form submit. Failed saves retain the draft. |
| TEMPO-006-F05 | DomainSettings / move — src/components/domains/domain-settings.tsx | Shows management rows and persists drag/keyboard order; requires all pages loaded before reorder. Load more exposes remaining domains. |
| TEMPO-006-F06 | DomainRow — same file | Renders drag handle, domain details and Settings-only Edit/Delete controls. |
| TEMPO-006-F07 | DeleteDomainDialog / remove — src/components/domains/delete-domain-dialog.tsx | Confirms deletion, guards duplicate submission and preserves errors; triggered by Settings Delete then confirmation. |
| TEMPO-006-F08 | DomainLabel / DomainBadge — src/components/domains/domain-appearance.tsx | Shared icon/color/name presentation and live preview; runs on render. |
| TEMPO-006-F09 | selectDomain / openCreateDomain / editDomain — src/components/today/use-today-surface.tsx | Routes selection, starts an empty draft or loads an existing domain from Settings. |
| TEMPO-006-F10 | TodaySurface / domainMenu — src/components/today/today-surface.tsx | Shares chooser contents between desktop and mobile, with responsive popover ownership and paginated loading. |
| TEMPO-006-F11 | mobileNavigation — src/components/today/today-shell-config.tsx | Defines the four mobile navigation entries consumed by TodaySurface. |
| TEMPO-006-F12 | mobileSnapshot / subscribeViewport — src/components/today/today-surface.tsx | Reads and subscribes to the 1024px breakpoint so only the visible navigation owns the open chooser; runs on hydration and viewport resize, with subscription cleanup. |
| TEMPO-006-F13 | PopoverContent — src/components/ui/popover.tsx | Shared popup primitive; optional positionerClassName centers the mobile domain chooser above the safe-area-aware bottom navigation. Desktop retains anchor positioning. |

Latest layout refinement: both domain menus use compact outer padding and section gaps; mobile rows retain 40px minimum height, desktop domain rows use 32px. Mobile menu is centered across the viewport rather than aligned to the Domains tab.

Shared dependencies: src/lib/validation/domain.ts validates inputs; convex/domains.ts owns authenticated list/create/update/remove/reorder operations. Backend behavior is unchanged. Existing scripts/check-domain-validation.mjs and check-domain-settings.mjs verify validation, owner isolation, ordering and task-preserving deletion. All affected frontend source files remain below 500 lines.
