# Tempo frontend code map

Current implementation map for landing, authentication and the Today dashboard. Paths are relative to the Tasks project. Updated 2026-11-23.

## Conventions

- TEMPO-001: landing/public branding. TEMPO-002: authentication. TEMPO-003: Today and its reused task interfaces.
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
| src/components/tasks/board-cards.tsx | LaneColumn (TEMPO-003-F34); BoardCard (TEMPO-003-F35); CompactBoardRow (TEMPO-003-F36); shortBoardDate (TEMPO-003-F37); mobileBoardSnapshot (TEMPO-003-F38); subscribeMobileBoard (TEMPO-003-F39) |
| src/components/tasks/board-config.ts | Shared types/configuration or compatibility entry |
| src/components/tasks/create-task-sheet.tsx | CreateTaskSheet (TEMPO-003-F31) |
| src/components/tasks/detail-shared.tsx | detailError; detailTime; DetailEmpty; ConfirmDelete; DetailRow (TEMPO-003-F40) |
| src/components/tasks/my-tasks-board.tsx | MyTasksBoard (TEMPO-003-F32) |
| src/components/tasks/submit-task-form.ts | submitTaskForm (TEMPO-003-F25) |
| src/components/tasks/task-detail-workspace.tsx | TaskDetailWorkspace (TEMPO-003-F41) |
| src/components/tasks/task-form-basics.tsx | TaskFormBasics (TEMPO-003-F26) |
| src/components/tasks/task-form-date-field.tsx | DateField (TEMPO-003-F30) |
| src/components/tasks/task-form-recurrence.tsx | TaskFormRecurrence (TEMPO-003-F29) |
| src/components/tasks/task-form-schedule.tsx | TaskFormSchedule (TEMPO-003-F27) |
| src/components/tasks/task-form-subtasks.tsx | TaskFormSubtasks (TEMPO-003-F28) |
| src/components/tasks/task-form-types.ts | Shared types/configuration or compatibility entry |
| src/components/tasks/task-form.tsx | TaskForm (TEMPO-003-F23) |
| src/components/tasks/use-my-tasks-board.tsx | useMyTasksBoard (TEMPO-003-F33) |
| src/components/tasks/use-task-detail-workspace.tsx | useTaskDetailWorkspace (TEMPO-003-F42) |
| src/components/tasks/use-task-form-state.tsx | useTaskFormState (TEMPO-003-F24) |

## Global styles

app/globals.css stays the single global entry point. Its ordered imports in app/styles/ preserve the original cascade: theme-* -> landing-* -> auth-* -> dashboard-*. No CSS Modules were added. The bundled shadcn-tailwind.css entry imports shadcn-* parts; the existing license remains in app/shadcn-tailwind.LICENSE.md. Numbered parts preserve their original order and keep each file below 500 lines.

## Verification

- scripts/check-ui-structure.mjs: checks every frontend TS/TSX/CSS file in src/ is below 500 lines and that Today presentation sections have no query/mutation hooks.
- npm test: existing auth, task handlers, focus, recurrence, calendar, Kanban, notifications and overlay-history coverage.
- npm run build and npm run typecheck: frontend/Convex compile checks. Browser visual verification is distinct from these offline checks.

Historical completion uses current completedAt, not immutable snapshots. Planning carried work preserves original deadlines. Backend schema and query behavior are unchanged by this structural cleanup.
