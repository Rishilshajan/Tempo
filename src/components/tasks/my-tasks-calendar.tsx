"use client";

import {
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from "lucide-react";
import { toast } from "sonner";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { DayTimeline } from "@/components/today/day-timeline";
import { domainColors } from "@/components/domains/domain-appearance";
import { calendarTasks, calendarMonthWeeks } from "@/lib/calendar-model";
import {
  dayWindow,
  formatMinutes,
  plannedMinutes,
  isCarried,
} from "@/lib/today-model";
import { localDateKey } from "@/lib/validation/task";
import { shiftDate } from "@/lib/validation/recurrence";
import type { TaskRecord } from "./task-list";

type Period = "month" | "week" | "day";
const asDate = (value: string) => new Date(`${value}T12:00:00`);
const label = (value: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", options).format(asDate(value));

export function MyTasksCalendar({
  tasks,
  now,
  isMobile,
  renderTask,
  onOpen,
  onCreate,
}: {
  tasks: TaskRecord[];
  now: number;
  isMobile: boolean;
  renderTask: (task: TaskRecord) => ReactNode;
  onOpen: (task: TaskRecord) => void;
  onCreate: (date: string, startAt?: number) => void;
}) {
  const [timezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const today = localDateKey(new Date(now), timezone);
  const [date, setDate] = useState(today);
  const [period, setPeriod] = useState<Period>("month");
  const [month, setMonth] = useState(() => asDate(today));
  const agenda = useRef<HTMLElement>(null);
  const agendaScroll = useRef<HTMLDivElement>(null);
  const day = dayWindow(date, timezone, now);
  const selectedTasks = useMemo(
    () => calendarTasks(tasks, date, timezone, now),
    [tasks, date, timezone, now],
  );
  const weeks = calendarMonthWeeks(localDateKey(month));
  const planned = selectedTasks.reduce(
    (total, task) => total + plannedMinutes(task, day),
    0,
  );
  function choose(next: string, scroll = true) {
    setDate(next);
    setMonth(asDate(next));
    agendaScroll.current?.scrollTo({ top: 0 });
    if (isMobile && scroll)
      requestAnimationFrame(() =>
        agenda.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
          block: "start",
        }),
      );
  }
  function move(direction: number) {
    if (period !== "day") {
      const next = new Date(
        month.getFullYear(),
        month.getMonth() + direction,
        1,
        12,
      );
      choose(localDateKey(next), false);
    } else choose(shiftDate(date, direction), false);
  }
  const DayCell = useMemo(
    () =>
      function CalendarTaskDay(
        props: ComponentProps<typeof CalendarDayButton>,
      ) {
        const key = localDateKey(props.day.date);
        const rows = calendarTasks(tasks, key, timezone, now);
        return (
          <CalendarDayButton
            {...props}
            className="aspect-auto! min-h-14 items-start! justify-start! overflow-hidden p-1.5 sm:min-h-[clamp(3rem,calc((100svh-14rem)/6),6rem)]"
            aria-label={`${label(key, { day: "numeric", month: "long", year: "numeric" })}, ${rows.length} ${rows.length === 1 ? "task" : "tasks"}`}
          >
            <span className="text-xs font-medium">
              {props.day.date.getDate()}
            </span>
            {!isMobile && (
              <span className="flex w-full flex-col gap-1 opacity-100!">
                {rows.slice(0, 2).map((task) => (
                  <span
                    key={task._id}
                    className="block w-full truncate rounded px-1 py-1 text-[10px] text-foreground"
                    style={{
                      background: `color-mix(in srgb, ${domainColors.find((color) => color.id === task.domain?.color)?.value ?? "var(--primary)"} 16%, var(--card))`,
                    }}
                  >
                    {task.title}
                  </span>
                ))}
              </span>
            )}
            {!!rows.length && (
              <span className="mt-auto flex max-w-full items-center gap-1 opacity-100!">
                {rows.slice(0, 3).map((task) => (
                  <span
                    key={task._id}
                    className="size-1.5 rounded-full"
                    style={{
                      background:
                        domainColors.find(
                          (color) => color.id === task.domain?.color,
                        )?.value ?? "var(--primary)",
                    }}
                  />
                ))}
                {rows.length > (isMobile ? 3 : 2) && (
                  <span className="text-[9px]">
                    +{rows.length - (isMobile ? 3 : 2)}
                  </span>
                )}
              </span>
            )}
          </CalendarDayButton>
        );
      },
    [tasks, timezone, now, isMobile],
  );
  return (
    <div className="relative grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.48fr)]">
      <section
        className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4 xl:sticky xl:top-4"
        aria-label="Task calendar"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Previous ${period === "day" ? "day" : "month"}`}
              onClick={() => move(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <h2 className="text-sm font-semibold">
              {period !== "day"
                ? label(localDateKey(month), { month: "long", year: "numeric" })
                : label(date, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
            </h2>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Next ${period === "day" ? "day" : "month"}`}
              onClick={() => move(1)}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="secondary"
              className="min-h-8 px-2 text-xs"
              onClick={() => choose(today, false)}
            >
              Today
            </Button>
          </div>
          <div
            className="grid w-full grid-cols-3 rounded-lg bg-muted p-1 sm:w-auto"
            aria-label="Calendar period"
          >
            {(["month", "week", "day"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
                className={`min-h-8 rounded-md px-3 text-xs capitalize ${period === value ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        {period === "month" && (
          <Calendar
            mode="single"
            selected={asDate(date)}
            month={month}
            onMonthChange={setMonth}
            onSelect={(next) => next && choose(localDateKey(next))}
            weekStartsOn={1}
            hideNavigation
            fixedWeeks
            className="w-full! p-0 [--cell-size:2rem]"
            classNames={{
              root: "w-full",
              month_caption: "hidden",
              week: "flex w-full",
              day: "relative min-w-0 flex-1 border border-border/60 p-0 align-top",
              month_grid: "w-full table-fixed border-collapse",
            }}
            components={{ DayButton: DayCell }}
          />
        )}
        {period === "week" && (
          <div className="space-y-2" aria-label="Weeks in displayed month">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
            {weeks.map((week, index) => (
              <section
                key={week[0]}
                aria-label={`Week ${index + 1}`}
                className="space-y-1 rounded-lg border border-border/60 bg-muted/20 p-1 sm:p-2"
              >
                <h3 className="text-[10px] font-medium text-muted-foreground">
                  Week {index + 1} ·{" "}
                  {label(week[0], { day: "numeric", month: "short" })} –{" "}
                  {label(week[6], { day: "numeric", month: "short" })}
                </h3>
                <div className="grid grid-cols-7 gap-1">
                  {week.map((key) => {
                    const rows = calendarTasks(tasks, key, timezone, now);
                    const outside =
                      key.slice(0, 7) !== localDateKey(month).slice(0, 7);
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={key === date}
                        aria-label={`${label(key, { weekday: "long", day: "numeric", month: "long" })}, ${rows.length} tasks`}
                        onClick={() => choose(key)}
                        className={`flex min-h-8 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-md px-1 text-xs leading-none sm:min-h-16 ${key === date ? "bg-primary text-primary-foreground" : outside ? "bg-muted/40 text-muted-foreground" : "bg-card text-foreground hover:bg-secondary"}`}
                      >
                        <strong>{label(key, { day: "numeric" })}</strong>
                        {!isMobile && rows[0] && (
                          <span className="w-full truncate text-[9px]">
                            {rows[0].title}
                          </span>
                        )}
                        <span className="text-[9px]">
                          {rows.length
                            ? isMobile
                              ? rows.length
                              : `${rows.length} task${rows.length === 1 ? "" : "s"}`
                            : "–"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
        {period === "day" && (
          <DayTimeline
            tasks={selectedTasks}
            day={day}
            now={now}
            onOpenTask={onOpen}
            onAdd={(startAt) => {
              if (startAt < now)
                toast.error("Choose a time that hasn't passed.");
              else onCreate(date, startAt);
            }}
          />
        )}
        <p className="text-[10px] text-muted-foreground">
          {timezone} · Select a date to view its tasks.
        </p>
      </section>
      <section
        ref={agenda}
        tabIndex={-1}
        className="min-w-0 overflow-hidden scroll-mb-24 scroll-mt-4 rounded-xl border border-border bg-card focus-visible:outline-2 focus-visible:outline-ring xl:sticky xl:top-4"
        aria-label="Selected day tasks"
      >
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border bg-card p-3 sm:p-4">
          <div>
            <h2 className="text-sm font-semibold">
              {label(date, { weekday: "long", day: "numeric", month: "short" })}
              {date === today && (
                <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-primary">
                  Today
                </span>
              )}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedTasks.length}{" "}
              {selectedTasks.length === 1 ? "task" : "tasks"} ·{" "}
              {formatMinutes(planned)} planned
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Create task on selected date"
            disabled={date < today}
            onClick={() => onCreate(date)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div
          ref={agendaScroll}
          tabIndex={0}
          aria-label="Scroll selected day tasks"
          className="max-h-[60svh] overflow-y-auto overscroll-y-auto p-3 focus-visible:outline-2 focus-visible:outline-ring sm:p-4 xl:max-h-[calc(100svh-9rem)]"
        >
          {selectedTasks.length ? (
            <div className="space-y-4">
              {(
                [
                  "In progress",
                  "Upcoming",
                  "Rolled forward",
                  "Completed",
                ] as const
              ).map((group) => {
                const rows = selectedTasks.filter((task) => {
                  const category =
                    task.status === "completed"
                      ? "Completed"
                      : isCarried(task, day)
                        ? "Rolled forward"
                        : task.progress === "in_progress"
                          ? "In progress"
                          : "Upcoming";
                  return category === group;
                });
                return rows.length ? (
                  <section
                    key={group}
                    aria-label={`${group} tasks`}
                    className="space-y-2"
                  >
                    <h3 className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {group}
                      <span className="rounded-full bg-secondary px-1.5 py-0.5 text-primary">
                        {rows.length}
                      </span>
                    </h3>
                    {rows.map((task) => (
                      <div key={task._id}>{renderTask(task)}</div>
                    ))}
                  </section>
                ) : null;
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-3 py-8 text-center">
              <CalendarDays className="mx-auto mb-2 size-5 text-primary" />
              <p className="text-xs font-medium">No tasks for this day</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose another date{date >= today ? " or add a task." : "."}
              </p>
              {date >= today && (
                <Button
                  variant="secondary"
                  className="mt-3 min-h-8 text-xs"
                  onClick={() => onCreate(date)}
                >
                  Create Task
                </Button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
