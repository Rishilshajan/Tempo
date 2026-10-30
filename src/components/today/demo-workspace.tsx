"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import type { DomainSummary } from "@/components/domains/domain-appearance";
import { TaskDetailContent } from "@/components/tasks/task-detail-sheet";
import type {
  TaskRecord,
  SetTaskCompleted,
  SetTaskProgress,
} from "@/components/tasks/task-list";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CreateTaskSheet } from "@/components/tasks/create-task-sheet";
import { localDateKey, type CreateTaskValues } from "@/lib/validation/task";
import { shiftDate, zonedTimestamp } from "@/lib/validation/recurrence";
import { dayWindow } from "@/lib/today-model";
import { TodaySurface } from "./today-surface";
import {
  DayCommandCenter,
  DayNavigation,
  type TaskPrefill,
} from "./today-dashboard";

const sampleDomains: DomainSummary[] = [
  {
    _id: "demo-core" as Id<"domains">,
    name: "Core Systems",
    color: "green",
    icon: "layers",
  },
  {
    _id: "demo-client" as Id<"domains">,
    name: "Client Ventures",
    color: "purple",
    icon: "briefcase",
  },
  {
    _id: "demo-personal" as Id<"domains">,
    name: "Personal",
    color: "blue",
    icon: "heart",
  },
];

function sampleTasks(date: string, timezone: string): TaskRecord[] {
  const at = (time: string) => zonedTimestamp(date, time, timezone);
  const make = (
    id: string,
    title: string,
    extra: Partial<TaskRecord> = {},
  ): TaskRecord => ({
    _id: `${id}-${date}` as Id<"tasks">,
    _creationTime: at("08:00"),
    title,
    timezone,
    priority: "medium",
    status: "open",
    schedule: { type: "flexible" },
    workDate: date,
    subtasks: [],
    domain: null,
    ...extra,
  });
  return [
    make("demo-api", "Design API authentication architecture", {
      domainId: sampleDomains[0]._id,
      priority: "high",
      description:
        "Review token refresh, session revocation, and the implementation plan.",
      schedule: { type: "fixed", startAt: at("19:00"), endAt: at("20:15") },
      estimatedMinutes: 75,
      subtasks: [
        {
          id: "demo-step-1",
          title: "Map token lifecycle",
          completedAt: at("10:00"),
        },
        { id: "demo-step-2", title: "Review refresh edge cases" },
      ],
    }),
    make("demo-review", "Review homepage wireframes", {
      domainId: sampleDomains[1]._id,
      schedule: { type: "fixed", startAt: at("19:30"), endAt: at("20:30") },
      estimatedMinutes: 60,
    }),
    make("demo-sync", "Weekly product planning", {
      domainId: sampleDomains[0]._id,
      status: "completed",
      completedAt: at("09:30"),
      schedule: { type: "fixed", startAt: at("09:00"), endAt: at("09:30") },
      estimatedMinutes: 30,
    }),
    make("demo-benchmark", "Submit concurrency benchmark results", {
      domainId: sampleDomains[0]._id,
      priority: "urgent",
      schedule: { type: "flexible", dueDate: date },
      estimatedMinutes: 45,
      description: "Summarize the load-test results and send the final report.",
    }),
    make("demo-proposal", "Finalize the Acme proposal", {
      domainId: sampleDomains[1]._id,
      priority: "high",
      workDate: shiftDate(date, -1),
      schedule: { type: "flexible", dueDate: shiftDate(date, -1) },
      estimatedMinutes: 30,
    }),
    make("demo-personal-task", "Plan the weekend", {
      domainId: sampleDomains[2]._id,
      priority: "low",
      workDate: "",
      estimatedMinutes: 15,
    }),
    make("demo-reading", "Read the research notes", {
      priority: "low",
      workDate: "",
      description: "A flexible task with no domain or time estimate.",
    }),
    make("demo-completed", "Review the release checklist", {
      domainId: sampleDomains[0]._id,
      status: "completed",
      completedAt: at("11:00"),
      estimatedMinutes: 20,
    }),
  ];
}

/** An explicitly selected, in-memory sample view. No sample data is sent to Convex. */
export function DemoWorkspace() {
  const router = useRouter();
  const { user } = useUser();
  const [clock, setClock] = useState<{ now: number; timezone: string } | null>(
    null,
  );
  const [domains, setDomains] = useState(sampleDomains);
  const [records, setRecords] = useState<TaskRecord[]>([]);
  const sampleDay = useRef<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [focus, setFocus] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<TaskPrefill | null>(null);
  useEffect(() => {
    const initial = setTimeout(() => {
      const now = Date.now();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const date = localDateKey(new Date(now), timezone);
      const tomorrow = shiftDate(date, 1);
      sampleDay.current = tomorrow;
      setClock({ now, timezone });
      const tomorrowTasks = sampleTasks(tomorrow, timezone)
        .filter((task) => task.status === "open" && task.workDate !== date)
        .map((task) =>
          task.schedule.type === "flexible" && !task.schedule.dueDate
            ? {
                ...task,
                workDate: tomorrow,
                schedule: { type: "flexible" as const, dueDate: tomorrow },
              }
            : task,
        );
      const overnight: TaskRecord = {
        ...sampleTasks(date, timezone)[0],
        _id: `demo-overnight-${date}` as Id<"tasks">,
        title: "Overnight release handover",
        description:
          "One task continuing from 11 PM to 1 AM across today and tomorrow.",
        domainId: sampleDomains[1]._id,
        progress: "in_progress",
        estimatedMinutes: 120,
        subtasks: [],
        schedule: {
          type: "fixed",
          startAt: zonedTimestamp(date, "23:00", timezone),
          endAt: zonedTimestamp(tomorrow, "01:00", timezone),
        },
      };
      setRecords([...sampleTasks(date, timezone), ...tomorrowTasks, overnight]);
      setFocus({
        [date]: `demo-api-${date}`,
        [tomorrow]: `demo-api-${tomorrow}`,
      });
    }, 0);
    const refresh = () => {
      const now = Date.now();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (
        sampleDay.current &&
        localDateKey(new Date(now), timezone) > sampleDay.current
      ) {
        setRecords([]);
        setDomains([]);
        setFocus({});
        router.replace("/dashboard");
        return;
      }
      setClock((previous) => (previous ? { now, timezone } : previous));
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);
  if (!clock)
    return (
      <p role="status" className="p-8 text-sm text-muted-foreground">
        Preparing sample dashboard…
      </p>
    );
  const today = localDateKey(new Date(clock.now), clock.timezone);
  const date = selectedDate && selectedDate > today ? selectedDate : today;
  const tasks = records.map((task) => ({
    ...task,
    domain: domains.find((domain) => domain._id === task.domainId) ?? null,
  }));
  const selectedTask = tasks.find((task) => task._id === detail);
  const complete: SetTaskCompleted = async (id, completed, subtaskId) => {
    setRecords((rows) =>
      rows.map((task) =>
        task._id !== id
          ? task
          : subtaskId
            ? {
                ...task,
                subtasks: task.subtasks.map((step) =>
                  step.id !== subtaskId
                    ? step
                    : {
                        ...step,
                        completedAt: completed ? Date.now() : undefined,
                      },
                ),
              }
            : {
                ...task,
                status: completed ? "completed" : "open",
                completedAt: completed ? Date.now() : undefined,
                ...(!completed ? { progress: "not_started" as const } : {}),
              },
      ),
    );
  };
  const setProgress: SetTaskProgress = async (id, progress) => {
    setRecords((rows) =>
      rows.map((task) =>
        task._id === id
          ? {
              ...task,
              progress,
              status: "open",
              completedAt: undefined,
            }
          : task,
      ),
    );
  };
  async function createTask(values: CreateTaskValues) {
    const id = `demo-${crypto.randomUUID()}` as Id<"tasks">;
    const { requestId, ...content } = values;
    void requestId;
    setRecords((rows) => [
      ...rows,
      {
        ...content,
        _id: id,
        _creationTime: Date.now(),
        status: "open",
        domainId: values.domainId as Id<"domains"> | undefined,
        domain: null,
        workDate:
          values.schedule.type === "fixed"
            ? localDateKey(new Date(values.schedule.startAt), values.timezone)
            : (values.schedule.dueDate ?? ""),
        subtasks: values.subtasks.map((step) => ({
          ...step,
          id: crypto.randomUUID(),
        })),
      },
    ]);
    toast.success("Sample task added to this preview.");
    return id;
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary px-4 py-2 text-xs text-secondary-foreground sm:px-8 lg:pl-56">
        <p>
          <strong>Today &amp; tomorrow preview</strong> · Temporary dummy data.
          Nothing is saved to Convex.
        </p>
        <Link
          href="/dashboard"
          replace
          onClick={() => {
            setRecords([]);
            setDomains([]);
            setFocus({});
            setDetail(null);
            setPrefill(null);
          }}
          className="rounded-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
        >
          Clear sample data &amp; exit
        </Link>
      </div>
      <TodaySurface
        todayLabel={new Intl.DateTimeFormat(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: clock.timezone,
        }).format(clock.now)}
        taskView="today"
        todayDate={date}
        onViewChange={(next) => {
          if (next === "all") router.push("/dashboard?view=all");
        }}
        onSelectDomain={() =>
          toast.info(
            "Use the domain filter in Today’s priorities to explore sample domains.",
          )
        }
        tasks={tasks}
        hasAnyTasks={records.length > 0}
        domains={domains}
        canCreateDomain
        onCreateTask={createTask}
        onSetTaskCompleted={complete}
        onSetTaskProgress={setProgress}
        onCreateDomain={async (values) => {
          const id = `demo-domain-${crypto.randomUUID()}` as Id<"domains">;
          setDomains((rows) => [...rows, { ...values, _id: id }]);
          return id;
        }}
        onUpdateDomain={async (domain, values) =>
          setDomains((rows) =>
            rows.map((row) =>
              row._id === domain._id ? { ...row, ...values } : row,
            ),
          )
        }
        onDeleteDomain={async (domain) => {
          setDomains((rows) => rows.filter((row) => row._id !== domain._id));
        }}
        todayContent={
          <DayCommandCenter
            key={date}
            tasks={tasks}
            domains={domains}
            day={dayWindow(date, clock.timezone, clock.now)}
            now={clock.now}
            name={user?.firstName ?? undefined}
            focus={tasks.find((task) => task._id === focus[date]) ?? null}
            focusSaving={false}
            onFocus={(id) =>
              setFocus((previous) => ({ ...previous, [date]: id }))
            }
            onCreateTask={setPrefill}
            onOpenTask={(task) => setDetail(task._id)}
            onSetCompleted={complete}
            onSetProgress={setProgress}
            navigation={
              <DayNavigation
                date={date}
                today={today}
                onDateChange={setSelectedDate}
                onCreateTask={setPrefill}
              />
            }
          />
        }
      />
      <CreateTaskSheet
        open={prefill !== null}
        onOpenChange={(open) => {
          if (!open) setPrefill(null);
        }}
        domains={domains}
        initialDate={prefill?.date}
        initialStartAt={prefill?.startAt}
        canSubmit
        onCreate={createTask}
      />
      <Sheet
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <SheetContent className="!w-full !max-w-[480px] gap-0">
          <SheetHeader>
            <SheetTitle>Sample task details</SheetTitle>
            <SheetDescription>
              Changes affect this preview only.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {selectedTask && (
              <TaskDetailContent
                key={selectedTask._id}
                task={selectedTask}
                onSetCompleted={complete}
                onSetProgress={setProgress}
                onReschedule={async (schedule) =>
                  setRecords((rows) =>
                    rows.map((task) =>
                      task._id === selectedTask._id
                        ? {
                            ...task,
                            schedule,
                            workDate:
                              schedule.type === "fixed"
                                ? localDateKey(
                                    new Date(schedule.startAt),
                                    task.timezone,
                                  )
                                : (schedule.dueDate ?? ""),
                          }
                        : task,
                    ),
                  )
                }
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
