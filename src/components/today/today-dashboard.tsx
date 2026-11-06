"use client";

import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useUser } from "@clerk/nextjs";
import {
  useConvexAuth,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  History,
  Plus,
  Target,
  Timer,
  X,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DomainLabel,
  type DomainSummary,
} from "@/components/domains/domain-appearance";
import type {
  SetTaskCompleted,
  SetTaskProgress,
  TaskRecord,
} from "@/components/tasks/task-list";
import { TaskMetadataPills } from "@/components/tasks/task-metadata-pills";
import { PriorityLabel, TaskSelect } from "@/components/tasks/task-select";
import {
  TaskPill,
  TaskStatusSelect,
  taskTones,
  allocationTones,
} from "@/components/tasks/task-status";
import { localDateKey } from "@/lib/validation/task";
import { shiftDate } from "@/lib/validation/recurrence";
import {
  dayWindow,
  formatMinutes,
  isCarried,
  summarizeDay,
  type DayWindow,
} from "@/lib/today-model";
import { DayTimeline } from "./day-timeline";

export type TaskPrefill = { date: string; startAt?: number };
type Props = {
  domains: DomainSummary[];
  onCreateTask: (prefill: TaskPrefill) => void;
  onOpenTask: (task: TaskRecord) => void;
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
  onSelectedDateChange?: (date: string) => void;
};

class DayErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div
        role="alert"
        className="my-8 rounded-xl border border-border bg-card p-6 text-sm"
      >
        <p>We couldn’t load your day. Your tasks are still saved.</p>
        <Button
          className="mt-4 min-h-10"
          onClick={() => window.location.reload()}
        >
          Retry connection
        </Button>
      </div>
    ) : (
      this.props.children
    );
  }
}

export function TodayDashboard(props: Props) {
  return (
    <DayErrorBoundary>
      <ConnectedDay {...props} />
    </DayErrorBoundary>
  );
}

function ConnectedDay(props: Props) {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const [clock, setClock] = useState<{ now: number; timezone: string } | null>(
    null,
  );
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const refresh = () =>
      setClock({
        now: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    const initial = setTimeout(refresh, 0);
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const today = clock ? localDateKey(new Date(clock.now), clock.timezone) : "";
  // Follow midnight automatically, while preserving a deliberately selected future day.
  const date = selected && selected > today ? selected : today;
  const onSelectedDateChange = props.onSelectedDateChange;
  useEffect(() => {
    if (date) onSelectedDateChange?.(date);
  }, [date, onSelectedDateChange]);
  const timezone = clock?.timezone;
  const args = useMemo(
    () => (isAuthenticated && timezone && date ? { date, timezone } : null),
    [isAuthenticated, timezone, date],
  );
  const backlog = usePaginatedQuery(
    api.dashboard.feed,
    args && date === today ? { ...args, kind: "open" } : "skip",
    { initialNumItems: 50 },
  );
  const scheduledSteps = usePaginatedQuery(
    api.dashboard.subtaskFeed,
    args ? { date, kind: "scheduled" } : "skip",
    { initialNumItems: 50 },
  );
  const dueSteps = usePaginatedQuery(
    api.dashboard.subtaskFeed,
    args ? { date, kind: "due" } : "skip",
    { initialNumItems: 50 },
  );
  const steps = [...scheduledSteps.results, ...dueSteps.results];
  const dated = usePaginatedQuery(
    api.dashboard.feed,
    args ? { ...args, kind: "dated" } : "skip",
    { initialNumItems: 50 },
  );
  const fixed = usePaginatedQuery(
    api.dashboard.feed,
    args ? { ...args, kind: "fixed" } : "skip",
    { initialNumItems: 50 },
  );
  const completed = usePaginatedQuery(
    api.dashboard.feed,
    args ? { ...args, kind: "completed" } : "skip",
    { initialNumItems: 50 },
  );
  const focus = useQuery(
    api.dashboard.focus,
    args ? { ...args, today } : "skip",
  );
  const setFocus = useMutation(api.dashboard.setFocus);
  const [focusSaving, setFocusSaving] = useState(false);
  useEffect(() => {
    if (args && date === today && backlog.status === "CanLoadMore")
      backlog.loadMore(50);
  }, [args, date, today, backlog]);
  useEffect(() => {
    if (args && dated.status === "CanLoadMore") dated.loadMore(50);
  }, [args, dated]);
  useEffect(() => {
    if (args && fixed.status === "CanLoadMore") fixed.loadMore(50);
  }, [args, fixed]);
  useEffect(() => {
    if (args && completed.status === "CanLoadMore") completed.loadMore(50);
  }, [args, completed]);
  const ready =
    !!args &&
    (date !== today || backlog.status === "Exhausted") &&
    [dated, fixed, completed].every((feed) => feed.status === "Exhausted") &&
    focus !== undefined;
  const day = clock && date ? dayWindow(date, clock.timezone, clock.now) : null;
  async function chooseFocus(id: string) {
    if (!args || focusSaving) return;
    setFocusSaving(true);
    try {
      await setFocus({
        ...args,
        taskId: id === "none" ? null : (id as Id<"tasks">),
      });
      toast.success(
        id === "none" ? "Focus cleared." : "Focus selected for this day.",
      );
    } catch (cause) {
      toast.error(
        errorMessage(cause, "Couldn’t update your focus. Please try again."),
      );
    } finally {
      setFocusSaving(false);
    }
  }
  return (
    <div className="min-w-0">
      {!ready || !day || !clock ? (
        <>
          <div className="mb-5 flex justify-end">
            <DayNavigation
              date={date}
              today={today}
              onDateChange={setSelected}
              onCreateTask={props.onCreateTask}
            />
          </div>
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-border bg-card px-5 py-14 text-center text-sm text-muted-foreground"
          >
            Loading the complete day…
          </div>
        </>
      ) : (
        <DayCommandCenter
          navigation={
            <DayNavigation
              date={date}
              today={today}
              onDateChange={setSelected}
              onCreateTask={props.onCreateTask}
            />
          }
          key={date}
          subtasks={
            (steps.length > 0 || scheduledSteps.status === "CanLoadMore" ||
              dueSteps.status === "CanLoadMore" || scheduledSteps.status === "LoadingMore" ||
              dueSteps.status === "LoadingMore") && (
              <section aria-labelledby="day-subtasks-heading" className="rounded-xl border border-border bg-card p-4">
                <h2 id="day-subtasks-heading" className="font-medium">Subtasks for this day</h2>
                <ul className="mt-2 divide-y divide-border">
                  {steps.map((step) => (
                    <li key={step.id}>
                      <Button variant="ghost" className="h-auto w-full flex-col items-start gap-1 whitespace-normal py-2 text-left" onClick={() => props.onOpenTask(step.parent)}>
                        <span className="break-words">{step.title}</span>
                        <span className="text-xs text-muted-foreground">{step.parent.title}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
                {(scheduledSteps.status === "CanLoadMore" || dueSteps.status === "CanLoadMore") && (
                  <Button variant="outline" size="sm" onClick={() => {
                    if (scheduledSteps.status === "CanLoadMore") scheduledSteps.loadMore(50);
                    if (dueSteps.status === "CanLoadMore") dueSteps.loadMore(50);
                  }}>Load more subtasks</Button>
                )}
              </section>
            )
          }
          {...props}
          tasks={[
            ...backlog.results,
            ...dated.results,
            ...fixed.results,
            ...completed.results,
          ]}
          day={day}
          now={clock.now}
          name={user?.firstName ?? undefined}
          focus={focus ?? null}
          focusSaving={focusSaving}
          onFocus={chooseFocus}
        />
      )}
    </div>
  );
}

export function DayNavigation({
  date,
  today,
  onDateChange,
  onCreateTask,
}: {
  date: string;
  today: string;
  onDateChange: (date: string | null) => void;
  onCreateTask: (prefill: TaskPrefill) => void;
}) {
  return (
    <div className="flex w-full max-w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
      <div className="grid w-full min-w-0 grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2 lg:flex lg:w-auto">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-10 w-7 lg:size-10"
          aria-label="Previous day"
          disabled={!date || date <= today}
          onClick={() => onDateChange(shiftDate(date, -1))}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <div className="min-w-0 flex-1 lg:max-w-[200px] lg:flex-none">
          <DatePicker
            value={date}
            onChange={(value) => {
              if (value && value >= today) onDateChange(value);
            }}
            ariaLabel="Dashboard date"
            minDate={today || undefined}
            maxDate="9999-12-31"
            required
            showTodayAction
            className="min-h-10 w-full !justify-center text-xs"
          />
        </div>
        <div className="flex min-w-0 items-center justify-end gap-0.5 lg:gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="min-h-10 w-7 lg:size-10"
            aria-label="Next day"
            disabled={!date || date === "9999-12-31"}
            onClick={() => onDateChange(shiftDate(date, 1))}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
      <Button
        className="min-h-10 w-full gap-2 text-xs lg:hidden"
        disabled={!date}
        onClick={() => onCreateTask({ date })}
      >
        <Plus aria-hidden="true" />
        Create Task
      </Button>
    </div>
  );
}

export function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof ConvexError && typeof cause.data === "string"
    ? cause.data
    : fallback;
}

export function DayCommandCenter({
  tasks,
  day,
  now,
  name,
  focus,
  focusSaving,
  onFocus,
  navigation,
  subtasks,
  ...props
}: Props & {
  tasks: TaskRecord[];
  day: DayWindow;
  now: number;
  name?: string;
  focus: TaskRecord | null;
  focusSaving: boolean;
  onFocus: (id: string) => void;
  navigation?: ReactNode;
  subtasks?: ReactNode;
}) {
  const summary = summarizeDay(tasks, day);
  const [domainFilter, setDomainFilter] = useState("all");
  const [group, setGroup] = useState("all");
  const prioritiesHeading = useRef<HTMLHeadingElement>(null);
  function showAllocationTasks(filter: "fixed" | "flexible" | "carried") {
    setGroup(filter);
    // Allocation covers the whole day, so a previous domain filter must not hide its tasks.
    setDomainFilter("all");
    requestAnimationFrame(() => {
      const heading = prioritiesHeading.current;
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    });
  }
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const today = day.date === day.today;
  const localHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: day.timezone,
    }).format(now),
  );
  const greeting =
    localHour < 12
      ? "Good morning"
      : localHour < 17
        ? "Good afternoon"
        : "Good evening";
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: day.timezone,
  }).format(day.start);
  const clockLabel = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: day.timezone,
  }).format(now);
  // Build the filter from all loaded task domains, including domains beyond the sidebar's first page.
  const taskDomains = new Map(
    summary.tasks.flatMap((task) =>
      task.domainId && task.domain
        ? [[task.domainId, task.domain] as const]
        : [],
    ),
  );
  const options = [
    { value: "all", label: "All domains" },
    { value: "uncategorized", label: "Uncategorized" },
    ...[...taskDomains]
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([id, domain]) => ({
        value: id,
        label: <DomainLabel {...domain} />,
      })),
  ];
  const effectiveDomainFilter = options.some(
    (option) => option.value === domainFilter,
  )
    ? domainFilter
    : "all";
  const listedTasks =
    group === "fixed"
      ? [...summary.fixed].sort((a, b) =>
          a.schedule.type === "fixed" && b.schedule.type === "fixed"
            ? a.schedule.startAt - b.schedule.startAt
            : 0,
        )
      : summary.active;
  const hasTaskFilters = summary.active.length > 0 || summary.fixed.length > 0;
  const noMatches =
    summary.tasks.length > 0 &&
    (effectiveDomainFilter !== "all" || group !== "all");
  const filtered = listedTasks.filter(
    (task) =>
      (effectiveDomainFilter === "all" ||
      effectiveDomainFilter === "uncategorized"
        ? effectiveDomainFilter === "all" || !task.domain
        : task.domainId === effectiveDomainFilter) &&
      (group === "all" ||
        group === "fixed" ||
        (group === "in_progress" && task.progress === "in_progress") ||
        (group === "carried" && isCarried(task, day)) ||
        (group === "flexible" && task.schedule.type === "flexible")),
  );
  const activeFocus =
    focus && summary.active.find((task) => task._id === focus._id);
  async function complete(task: TaskRecord) {
    if (pending.has(task._id)) return;
    setPending((previous) => new Set(previous).add(task._id));
    try {
      const next = await props.onSetCompleted(
        task._id,
        task.status !== "completed",
      );
      toast.success(
        typeof next === "string"
          ? "Task completed. Next recurring task created."
          : task.status === "completed"
            ? "Task reopened."
            : "Task completed.",
      );
    } catch (cause) {
      toast.error(
        errorMessage(cause, "Couldn’t update this task. Please try again."),
      );
    } finally {
      setPending((previous) => {
        const next = new Set(previous);
        next.delete(task._id);
        return next;
      });
    }
  }
  const total = summary.totalMinutes;
  return (
    <div className="min-w-0 space-y-4">
      <section
        aria-labelledby="day-heading"
        className="space-y-4 border-b border-border pb-5"
      >
        <div className="flex min-w-0 flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <h1
              id="day-heading"
              className="break-words text-xl font-semibold tracking-tight sm:text-2xl"
            >
              {today
                ? `${greeting}${name ? `, ${name}` : ""}.`
                : "Your day, ahead."}
            </h1>
            <p className="mt-2 text-xs text-muted-foreground">
              {dateLabel}
              {today ? ` · ${clockLabel}` : ""}
            </p>
          </div>
          {navigation && (
            <div className="w-full min-w-0 lg:ml-auto lg:w-auto lg:max-w-[55%]">
              {navigation}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:flex sm:flex-wrap">
          <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-summary-active px-2 py-1.5 font-medium text-white sm:px-3">
            <span className="size-1.5 shrink-0 rounded-full bg-current" />
            {summary.active.length} active
          </span>
          <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-summary-planned px-2 py-1.5 font-medium text-white sm:px-3">
            <Timer className="size-3.5 shrink-0" aria-hidden="true" />
            {formatMinutes(total)} planned
          </span>
          <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-summary-carried px-2 py-1.5 font-medium text-white sm:px-3">
            <History className="size-3.5 shrink-0" aria-hidden="true" />
            {summary.carried.length} carried
          </span>
          <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-summary-completed px-2 py-1.5 font-medium text-white sm:px-3">
            <CheckCheck className="size-3.5 shrink-0" aria-hidden="true" />
            {summary.completed.length} / {summary.tasks.length} done
            {summary.tasks.length
              ? ` · ${Math.round((summary.completed.length / summary.tasks.length) * 100)}%`
              : ""}
          </span>
        </div>
      </section>
      <section
        aria-labelledby="focus-heading"
        className="rounded-xl border border-border bg-card p-4 sm:p-5"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <h2
              id="focus-heading"
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary"
            >
              <Target className="size-4" aria-hidden="true" />
              Focus anchor
              {activeFocus?.schedule.type === "fixed" && (
                <span className="font-normal normal-case tracking-normal">
                  ·{" "}
                  {new Intl.DateTimeFormat(undefined, {
                    timeZone: day.timezone,
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(activeFocus.schedule.startAt)}
                </span>
              )}
            </h2>
            <p className="mt-2 break-words text-base font-semibold">
              {activeFocus ? activeFocus.title : "What matters most this day?"}
            </p>
            <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">
              {activeFocus
                ? activeFocus.description || "One clear anchor for your day."
                : "Choose an open task to keep it in view."}
            </p>
            {activeFocus?.domain && (
              <span className="mt-2 flex max-w-full items-center gap-2 text-xs">
                <DomainLabel {...activeFocus.domain} />
              </span>
            )}
            {activeFocus && (
              <span className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <PriorityLabel value={activeFocus.priority} />
              </span>
            )}
          </div>
          {activeFocus && (
            <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
              <Button
                className="min-h-10"
                onClick={() => props.onOpenTask(activeFocus)}
              >
                Open task
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-10"
                aria-label="Clear focus anchor"
                disabled={focusSaving}
                onClick={() => onFocus("none")}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
        {!activeFocus && (
          <div className="mt-4 max-w-lg">
            <TaskSelect
              label="Choose focus anchor"
              value="none"
              onChange={onFocus}
              disabled={focusSaving || !summary.active.length}
              options={[
                {
                  value: "none",
                  label: summary.active.length
                    ? "Select a task"
                    : "Create a task to choose an anchor",
                },
                ...summary.active.map((task) => ({
                  value: task._id,
                  label: <span className="truncate">{task.title}</span>,
                })),
              ]}
            />
          </div>
        )}
      </section>
      <div className="grid min-w-0 items-start gap-4">
        <div className="min-w-0">
          <section
            aria-labelledby="allocation-heading"
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="allocation-heading"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Timer className="size-4 text-primary" aria-hidden="true" />
                Day allocation
              </h2>
              <span className="text-xs text-muted-foreground">
                {formatMinutes(total)} planned
              </span>
            </div>
            <div
              role="img"
              aria-label={`Planned workload: ${formatMinutes(summary.allocation.fixed)} fixed, ${formatMinutes(summary.allocation.flexible)} flexible, ${formatMinutes(summary.allocation.carried)} carried`}
              className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted"
            >
              {total > 0 &&
                (
                  [
                    ["fixed", allocationTones.fixed],
                    ["flexible", allocationTones.flexible],
                    ["carried", allocationTones.carried],
                  ] as const
                ).map(([key, color]) => (
                  <span
                    key={key}
                    className={color}
                    style={{
                      width: `${(summary.allocation[key] / total) * 100}%`,
                    }}
                  />
                ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2 lg:flex lg:flex-wrap">
              {(["fixed", "flexible", "carried"] as const).map((filter) => (
                <Button
                  key={filter}
                  variant="ghost"
                  className={`h-auto min-h-8 w-full min-w-0 rounded-full px-1 py-1.5 text-[10px] sm:px-2.5 sm:text-[11px] lg:w-auto lg:px-3 hover:opacity-90 hover:text-white ${allocationTones[filter]} ${filter === "fixed" ? "hover:bg-sky-800" : filter === "flexible" ? "hover:bg-teal-800" : "hover:bg-violet-800"}`}
                  aria-label={`Show ${filter} tasks`}
                  aria-controls="day-priorities"
                  aria-pressed={group === filter}
                  onClick={() => showAllocationTasks(filter)}
                >
                  <span className="min-w-0 whitespace-normal text-center leading-tight">
                    {filter === "fixed"
                      ? "Fixed"
                      : filter === "flexible"
                        ? "Flexible"
                        : "Carried"}
                    {" · "}
                    {formatMinutes(summary.allocation[filter])}
                  </span>
                </Button>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              Fixed bookings count only the scheduled portion on this day.
              Flexible and carried work use estimates. Not tracked time.
              {summary.completed.length > 0
                ? " Includes the completed work shown here."
                : ""}
              {summary.allocation.unestimated
                ? ` ${summary.allocation.unestimated} ${summary.allocation.unestimated === 1 ? "task has" : "tasks have"} no estimate.`
                : ""}
            </p>
          </section>
        </div>
        <div className="min-w-0">
          <DayTimeline
            tasks={summary.fixed}
            day={day}
            now={now}
            onOpenTask={props.onOpenTask}
            onAdd={(startAt) => props.onCreateTask({ date: day.date, startAt })}
          />
        </div>
        {subtasks}
        <section
          id="day-priorities"
          aria-labelledby="priorities-heading"
          className="min-w-0 rounded-xl border border-border bg-card p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              ref={prioritiesHeading}
              tabIndex={-1}
              id="priorities-heading"
              className="scroll-mt-6 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary"
            >
              {today ? "Today’s" : "Day"}{" "}
              {group === "fixed"
                ? "fixed tasks"
                : group === "in_progress"
                  ? "tasks in progress"
                  : "priorities"}{" "}
              <span className="font-normal text-muted-foreground">
                ({filtered.length}
                {filtered.length !== listedTasks.length
                  ? ` of ${listedTasks.length}`
                  : ""}
                )
              </span>
            </h2>
            {hasTaskFilters && (
              <div className="w-full min-w-0 sm:w-44">
                <TaskSelect
                  label="Filter priorities by domain"
                  value={effectiveDomainFilter}
                  onChange={setDomainFilter}
                  options={options}
                />
              </div>
            )}
          </div>
          {hasTaskFilters && (
            <div
              className="my-3 flex max-w-full flex-nowrap gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible"
              aria-label="Priority task filters"
            >
              {[
                { id: "all", label: "All", tone: "neutral" },
                {
                  id: "in_progress",
                  label: `In progress (${summary.active.filter((task) => task.progress === "in_progress").length})`,
                  tone: "progress",
                },
                {
                  id: "fixed",
                  label: `Fixed (${summary.fixed.length})`,
                  tone: "fixed",
                },
                { id: "flexible", label: "Flexible", tone: "flexible" },
                {
                  id: "carried",
                  label: `Carried (${summary.carried.length})`,
                  tone: "carried",
                },
              ].map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`min-h-9 rounded-full px-3 text-xs ${group === item.id ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : taskTones[item.tone as keyof typeof taskTones]}`}
                  aria-pressed={group === item.id}
                  onClick={() => setGroup(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          )}
          {!filtered.length ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-3 py-7 text-center">
              <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
                <CheckCheck className="size-5" aria-hidden="true" />
              </span>
              <p className="text-sm font-medium">
                {noMatches
                  ? "No matching tasks"
                  : summary.completed.length
                    ? "All clear for this day"
                    : "No tasks for this day yet"}
              </p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                {noMatches
                  ? "Try another domain or task filter."
                  : summary.completed.length
                    ? "You’ve completed your priorities. Add a task when you’re ready."
                    : "Add your first task to start shaping your day."}
              </p>
              {!noMatches && (
                <Button
                  variant="secondary"
                  className="mt-4 min-h-10 gap-2 text-xs"
                  onClick={() => props.onCreateTask({ date: day.date })}
                >
                  <Plus aria-hidden="true" />
                  Create Task
                </Button>
              )}
              {noMatches && (
                <Button
                  variant="link"
                  className="mt-2 w-full"
                  onClick={() => {
                    setDomainFilter("all");
                    setGroup("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((task) => (
                <DayTaskRow
                  key={task._id}
                  task={task}
                  day={day}
                  now={now}
                  pending={pending.has(task._id)}
                  onComplete={() => complete(task)}
                  onOpen={() => props.onOpenTask(task)}
                  onSetCompleted={props.onSetCompleted}
                  onSetProgress={props.onSetProgress}
                />
              ))}
            </ul>
          )}
          {group !== "fixed" &&
            group !== "in_progress" &&
            !!summary.completed.length && (
              <details className="mt-5 border-t border-border pt-3">
                <summary className="min-h-9 cursor-pointer py-2 text-xs font-medium text-muted-foreground">
                  Completed ({summary.completed.length})
                </summary>
                <ul className="mt-2 space-y-2">
                  {summary.completed.map((task) => (
                    <DayTaskRow
                      key={task._id}
                      task={task}
                      day={day}
                      now={now}
                      pending={pending.has(task._id)}
                      onComplete={() => complete(task)}
                      onOpen={() => props.onOpenTask(task)}
                      onSetCompleted={props.onSetCompleted}
                      onSetProgress={props.onSetProgress}
                    />
                  ))}
                </ul>
              </details>
            )}
        </section>
      </div>
    </div>
  );
}

function DayTaskRow({
  task,
  day,
  now,
  pending,
  onComplete,
  onOpen,
  onSetCompleted,
  onSetProgress,
}: {
  task: TaskRecord;
  day: DayWindow;
  now: number;
  pending: boolean;
  onComplete: () => void;
  onOpen: () => void;
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
}) {
  const [statusSaving, setStatusSaving] = useState(false);
  const carried = isCarried(task, day);
  const schedule = task.schedule;
  const completed = task.status === "completed";
  const overdue =
    !completed &&
    (carried ||
      (schedule.type === "fixed" &&
        schedule.endAt <= now &&
        day.date === day.today));
  return (
    <li
      className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-primary/40"
      onClick={(event) => {
        if (
          !(event.target as HTMLElement).closest(
            "button, input, label, a, [role='menuitemradio'], [role='option']",
          )
        )
          onOpen();
      }}
    >
      <input
        type="checkbox"
        checked={completed}
        disabled={pending || statusSaving}
        onChange={onComplete}
        aria-label={(completed ? "Reopen " : "Complete ") + task.title}
        className="size-4 shrink-0 cursor-pointer accent-primary disabled:opacity-50"
      />
      <div className="min-w-0 flex-1 basis-40">
        <button
          type="button"
          onClick={onOpen}
          className={
            "w-full break-words text-left text-xs font-medium leading-5 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring " +
            (completed ? "line-through text-muted-foreground" : "")
          }
        >
          {task.title}
        </button>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
          <TaskMetadataPills task={task} carried={carried} onOpen={onOpen} />
          <TaskPill tone={schedule.type === "fixed" ? "fixed" : "flexible"}>
            {schedule.type === "fixed" ? "Fixed" : "Flexible"}
          </TaskPill>
          {overdue && !carried && <TaskPill tone="overdue">Overdue</TaskPill>}
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center justify-end gap-2 pl-6 sm:w-auto sm:pl-0">
        <TaskPill
          tone={
            task.priority === "urgent"
              ? "overdue"
              : task.priority === "high"
                ? "progress"
                : "neutral"
          }
        >
          <PriorityLabel value={task.priority} />
        </TaskPill>
        <TaskStatusSelect
          task={task}
          disabled={pending}
          onBusyChange={setStatusSaving}
          onSetCompleted={onSetCompleted}
          onSetProgress={onSetProgress}
        />
      </div>
    </li>
  );
}
