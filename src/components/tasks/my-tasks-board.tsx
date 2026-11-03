"use client";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useMutation } from "convex/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  Clock3,
  ListFilter,
  Plus,
  ListChecks,
  Zap,
  History,
  CircleCheck,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { MyTasksCalendar } from "./my-tasks-calendar";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DomainLabel,
  domainColors,
  type DomainSummary,
} from "@/components/domains/domain-appearance";
import { TaskSelect, priorities, PriorityLabel } from "./task-select";
import {
  type TaskRecord,
  type SetTaskCompleted,
  type SetTaskProgress,
} from "./task-list";
import { TaskPill, TaskStatusSelect } from "./task-status";
import { TaskDomainPill, TaskMetadataPills } from "./task-metadata-pills";
import { TaskRescheduleCalendar } from "./task-reschedule-calendar";
import { taskTimestamp } from "@/lib/task-datetime";
import { formatMinutes, dayWindow } from "@/lib/today-model";
import {
  filterTasks,
  taskLane,
  type BoardFilters,
  type Lane,
} from "@/lib/kanban-model";
import { localDateKey } from "@/lib/validation/task";
import { detailError } from "./detail-shared";

const columns: {
  id: Lane;
  title: string;
  empty: string;
  icon: typeof ListChecks;
  tone: string;
}[] = [
  {
    id: "planned",
    title: "Planned Queue",
    empty: "No planned tasks.",
    icon: ListChecks,
    tone: "bg-secondary",
  },
  {
    id: "progress",
    title: "In Progress",
    empty: "Nothing in progress.",
    icon: Zap,
    tone: "bg-emerald-100 text-emerald-900",
  },
  {
    id: "carried",
    title: "Rolled Forward",
    empty: "Nothing carried forward.",
    icon: History,
    tone: "bg-violet-100 text-violet-900",
  },
  {
    id: "completed",
    title: "Completed",
    empty: "No tasks completed today.",
    icon: CircleCheck,
    tone: "bg-primary/10 text-primary",
  },
];
type Props = {
  selectedDomainId?: string;
  onDomainChange?: (domainId: string) => void;
  tasks: TaskRecord[];
  domains: DomainSummary[];
  incomplete?: boolean;
  onCreate: () => void;
  onCreateForDate?: (date: string, startAt?: number) => void;
  onOpen: (task: TaskRecord) => void;
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
};
export function MyTasksBoard({
  selectedDomainId,
  onDomainChange,
  onCreateForDate,
  tasks,
  domains,
  incomplete,
  onCreate,
  onOpen,
  onSetCompleted,
  onSetProgress,
}: Props) {
  const [view, setView] = useState("kanban");
  const isMobile = useSyncExternalStore(
    subscribeMobileBoard,
    mobileBoardSnapshot,
    () => false,
  );
  const effectiveView = isMobile && view === "kanban" ? "list" : view;
  const [mobileCollapsed, setMobileCollapsed] = useState<
    Partial<Record<Lane, boolean>>
  >({ progress: true, carried: true, completed: true });
  const [collapsed, setCollapsed] = useState<Partial<Record<Lane, boolean>>>(
    {},
  );
  const [localFilters, setFilters] = useState<BoardFilters>({
    domain: "",
    priority: "all",
    date: "all",
    from: "",
    to: "",
    sort: "manual",
  });
  const filters = {
    ...localFilters,
    domain: selectedDomainId ?? localFilters.domain,
  };
  const currentDomain = domains.find((domain) => domain._id === filters.domain);
  const [older, setOlder] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const locked = useRef(false);
  const move = useMutation(api.kanban.move);
  const reschedule = useMutation(api.tasks.reschedule);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const initial = setTimeout(update, 0);
    const timer = setInterval(update, 60000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, []);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const update = (key: keyof BoardFilters, value: string) => {
    if (key === "domain") onDomainChange?.(value);
    setFilters((previous) => ({ ...previous, [key]: value }));
    setHideCompleted(false);
  };
  const clock = now ?? 0;
  const rows = now === null ? [] : filterTasks(tasks, filters, clock);
  const completedDay =
    filters.date === "custom" && filters.from ? filters.from : undefined;
  const visible = rows.filter((task) => {
    if (task.status !== "completed") return true;
    if (hideCompleted) return false;
    if (older) return true;
    const day = completedDay ?? localDateKey(new Date(clock), task.timezone);
    const window = dayWindow(day, task.timezone, clock);
    return (
      task.completedAt !== undefined &&
      task.completedAt >= window.start &&
      task.completedAt < window.end
    );
  });
  const laneRows = (lane: Lane) =>
    visible.filter((task) => taskLane(task, clock) === lane);
  async function saveMove(
    task: TaskRecord,
    to: Lane,
    beforeId?: Id<"tasks">,
    afterId?: Id<"tasks">,
  ) {
    if (locked.current) return;
    locked.current = true;
    setSaving(true);
    try {
      await move({
        id: task._id,
        from: taskLane(task, clock),
        to,
        beforeId,
        afterId,
      });
    } catch (error) {
      detailError(error);
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  function drop(event: DragEndEvent) {
    setDragging(null);
    if (!event.over || event.active.id === event.over.id || saving) return;
    const task = tasks.find((task) => task._id === event.active.id);
    if (!task) return;
    const target = tasks.find((task) => task._id === event.over!.id);
    const lane = target
      ? taskLane(target, clock)
      : (String(event.over.id).replace("lane:", "") as Lane);
    if (lane === "carried") {
      toast.error("Rolled Forward is managed automatically.");
      return;
    }
    const list = laneRows(lane).filter((row) => row._id !== task._id);
    let index = target
      ? list.findIndex((row) => row._id === target._id)
      : list.length;
    if (index < 0) index = list.length;
    if (target && taskLane(task, clock) === lane) {
      const original = laneRows(lane);
      if (
        original.findIndex((row) => row._id === task._id) <
        original.findIndex((row) => row._id === target._id)
      )
        index++;
    }
    setCollapsed((previous) => ({ ...previous, [lane]: false }));
    setMobileCollapsed((previous) => ({ ...previous, [lane]: false }));
    setFilters((previous) => ({ ...previous, sort: "manual" }));
    // Neighbors use persisted order even if a different visual sort was selected.
    if (filters.sort !== "manual") {
      void saveMove(task, lane);
      return;
    }
    void saveMove(task, lane, list[index - 1]?._id, list[index]?._id);
  }
  const selectedDrag = tasks.find((task) => task._id === dragging);
  const activeFilters: {
    key: keyof BoardFilters;
    label: string;
    reset: string;
  }[] = [];
  if (filters.date !== "all")
    activeFilters.push({
      key: "date",
      reset: "all",
      label:
        filters.date === "custom"
          ? `Scheduled: ${filters.from ? shortBoardDate(filters.from) : "Choose date"}`
          : filters.date === "range"
            ? `${filters.from ? shortBoardDate(filters.from) : "Start"} – ${filters.to ? shortBoardDate(filters.to) : "End"}`
            : filters.date.replaceAll("_", " "),
    });
  if (filters.priority !== "all")
    activeFilters.push({
      key: "priority",
      reset: "all",
      label: `Priority: ${filters.priority}`,
    });
  if (filters.dueDate)
    activeFilters.push({
      key: "dueDate",
      reset: "",
      label: `Due: ${shortBoardDate(filters.dueDate)}`,
    });
  if (filters.sort !== "manual")
    activeFilters.push({
      key: "sort",
      reset: "manual",
      label: `Sort: ${filters.sort}`,
    });
  return (
    <section
      className="min-w-0 space-y-4"
      aria-labelledby="my-tasks-heading"
      aria-busy={saving}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1
          id="my-tasks-heading"
          className="text-[22px] font-semibold tracking-tight sm:text-2xl"
        >
          My Tasks
          {currentDomain && (
            <span className="ml-2 inline-flex align-middle rounded-full bg-secondary px-2 py-1 text-xs font-normal">
              <DomainLabel {...currentDomain} />
            </span>
          )}
        </h1>
        <div
          aria-label="Task view"
          className={`grid w-full rounded-lg bg-muted p-1 sm:flex sm:w-auto ${isMobile ? "grid-cols-2" : "grid-cols-3"}`}
        >
          {(isMobile
            ? ["list", "calendar"]
            : ["kanban", "list", "calendar"]
          ).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={effectiveView === item}
              onClick={() => setView(item)}
              className={`min-h-8 rounded-md px-2 text-xs capitalize ${effectiveView === item ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Filter by domain"
      >
        {[
          { id: "", name: "All Domains", color: undefined },
          ...domains.map((domain) => ({
            id: domain._id,
            name: domain.name,
            color: domain.color,
          })),
        ].map((domain) => (
          <button
            key={domain.id}
            type="button"
            aria-pressed={filters.domain === domain.id}
            onClick={() => update("domain", domain.id)}
            className={`flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs ${filters.domain === domain.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {domain.id && (
              <span
                className="size-2 rounded-full"
                style={{
                  background: domain.color
                    ? domainColors.find((item) => item.id === domain.color)
                        ?.value
                    : undefined,
                }}
              />
            )}
            {domain.name}
            <span className="opacity-70">
              {
                tasks.filter(
                  (task) =>
                    task.status === "open" &&
                    (!domain.id || task.domainId === domain.id),
                ).length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="outline"
          className="min-h-8 gap-2 text-xs"
          aria-expanded={filtersOpen}
          aria-controls="board-filters"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <ListFilter className="size-3.5" />
          Filters
          {activeFilters.length ? ` · ${activeFilters.length}` : ""}
        </Button>
        <div
          className="flex min-w-0 flex-1 flex-wrap gap-1.5"
          aria-label="Active filters"
        >
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => update(filter.key, filter.reset)}
              aria-label={`Remove ${filter.label} filter`}
              className="inline-flex min-h-8 items-center gap-2 rounded-full bg-secondary px-3 text-xs capitalize text-secondary-foreground"
            >
              {filter.label}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
        {incomplete && (
          <span role="status" className="text-xs text-muted-foreground">
            Loading tasks…
          </span>
        )}
      </div>
      <div
        id="board-filters"
        hidden={!filtersOpen}
        className="space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Schedule
            </p>
            <TaskSelect
              label="Filter tasks by date"
              value={filters.date}
              onChange={(value) => update("date", value)}
              options={[
                { value: "all", label: "Date: All" },
                { value: "today", label: "Today" },
                { value: "tomorrow", label: "Tomorrow" },
                { value: "week", label: "This week" },
                { value: "next_week", label: "Next week" },
                { value: "overdue", label: "Overdue" },
                { value: "custom", label: "Custom date" },
                { value: "range", label: "Date range" },
              ]}
            />
          </div>
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Priority
            </p>
            <TaskSelect
              label="Filter tasks by priority"
              value={filters.priority}
              onChange={(value) => update("priority", value)}
              options={[
                { value: "all", label: "Priority: All" },
                ...priorities,
              ]}
            />
          </div>
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Due date
            </p>
            <DatePicker
              ariaLabel="Filter by due date"
              value={filters.dueDate ?? ""}
              onChange={(value) => update("dueDate", value)}
              placeholder="Any due date"
              className="min-h-10 text-xs"
            />
          </div>
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Sort order
            </p>
            <TaskSelect
              label="Sort tasks"
              value={filters.sort}
              onChange={(value) => update("sort", value)}
              options={[
                { value: "manual", label: "Manual order" },
                { value: "priority", label: "Priority" },
                { value: "due", label: "Due date" },
                { value: "scheduled", label: "Scheduled time" },
                { value: "created", label: "Recently created" },
                { value: "updated", label: "Recently updated" },
              ]}
            />
          </div>
        </div>
        {(filters.date === "custom" || filters.date === "range") && (
          <div className="grid gap-2 sm:grid-cols-2">
            <DatePicker
              ariaLabel={
                filters.date === "range"
                  ? "Filter start date"
                  : "Choose custom date"
              }
              value={filters.from}
              onChange={(value) => update("from", value)}
              placeholder={
                filters.date === "range" ? "Start date" : "Choose custom date"
              }
            />
            {filters.date === "range" && (
              <DatePicker
                ariaLabel="Filter end date"
                minDate={filters.from}
                value={filters.to}
                onChange={(value) => update("to", value)}
                placeholder="End date"
              />
            )}
            {filters.date === "range" &&
              filters.to &&
              filters.from > filters.to && (
                <p role="alert" className="text-xs text-destructive">
                  End date must be on or after the start date.
                </p>
              )}
          </div>
        )}
        <Button
          variant="ghost"
          className="mt-2 min-h-8 text-xs"
          onClick={() =>
            setFilters({
              domain: filters.domain,
              priority: "all",
              date: "all",
              from: "",
              to: "",
              sort: "manual",
              dueDate: "",
            })
          }
        >
          Reset filters
        </Button>
      </div>
      {effectiveView === "calendar" ? (
        <MyTasksCalendar
          tasks={rows}
          now={clock}
          isMobile={isMobile}
          onOpen={onOpen}
          onCreate={onCreateForDate ?? (() => onCreate())}
          renderTask={(task) => (
            <CompactBoardRow
              task={task}
              lane={taskLane(task, clock)}
              saving={saving}
              onOpen={onOpen}
              onSetCompleted={onSetCompleted}
              onSetProgress={onSetProgress}
              onContinue={() => void saveMove(task, "progress")}
              onReschedule={(schedule) =>
                reschedule({ id: task._id, schedule })
              }
            />
          )}
        />
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={(event) => setDragging(String(event.active.id))}
            onDragCancel={() => setDragging(null)}
            onDragEnd={drop}
          >
            <div className="overflow-x-auto pb-2">
              <div
                className={`grid grid-cols-1 items-start gap-3 ${effectiveView === "kanban" ? "sm:grid-cols-[var(--board-columns)]" : ""}`}
                style={
                  {
                    "--board-columns": columns
                      .map((column) =>
                        collapsed[column.id] ? "64px" : "minmax(240px,1fr)",
                      )
                      .join(" "),
                  } as CSSProperties
                }
              >
                {columns.map((column) => (
                  <LaneColumn
                    key={column.id}
                    column={column}
                    stacked={effectiveView !== "kanban"}
                    count={laneRows(column.id).length}
                    onCreate={onCreate}
                    onToggleOlder={
                      column.id === "completed"
                        ? () => setOlder(!older)
                        : undefined
                    }
                    older={older}
                    collapsed={
                      !!(isMobile ? mobileCollapsed : collapsed)[column.id]
                    }
                    disabled={saving || dragging !== null}
                    onToggle={() =>
                      (isMobile ? setMobileCollapsed : setCollapsed)(
                        (previous) => ({
                          ...previous,
                          [column.id]: !previous[column.id],
                        }),
                      )
                    }
                  >
                    <SortableContext
                      items={laneRows(column.id).map((task) => task._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {laneRows(column.id).map((task) => (
                        <BoardCard
                          key={task._id}
                          compact={effectiveView !== "kanban"}
                          task={task}
                          lane={column.id}
                          saving={saving}
                          onOpen={onOpen}
                          onSetCompleted={onSetCompleted}
                          onSetProgress={onSetProgress}
                          onContinue={() => void saveMove(task, "progress")}
                          onReschedule={(schedule) =>
                            reschedule({ id: task._id, schedule })
                          }
                        />
                      ))}
                    </SortableContext>
                    {!laneRows(column.id).length && (
                      <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
                        {column.empty}
                      </p>
                    )}
                  </LaneColumn>
                ))}
              </div>
            </div>
            <DragOverlay>
              {selectedDrag && (
                <div className="max-w-72 rounded-lg border border-primary bg-card p-3 text-xs shadow-lg">
                  {selectedDrag.title}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </>
      )}
      {effectiveView !== "calendar" && !visible.length && (
        <p className="py-3 text-center text-xs text-muted-foreground">
          No tasks match these filters.
        </p>
      )}
    </section>
  );
}
function LaneColumn({
  column,
  count,
  collapsed,
  disabled,
  onToggle,
  onCreate,
  onToggleOlder,
  older,
  stacked,
  children,
}: {
  column: (typeof columns)[number];
  count: number;
  collapsed: boolean;
  disabled: boolean;
  onToggle: () => void;
  onCreate: () => void;
  onToggleOlder?: () => void;
  older?: boolean;
  stacked?: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `lane:${column.id}`,
    data: { lane: column.id },
  });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${column.title} column`}
      className={`min-w-0 space-y-2 rounded-lg bg-muted/40 p-2 ${isOver ? (column.id === "carried" ? "ring-2 ring-destructive" : "ring-2 ring-primary") : ""}`}
    >
      <div
        className={`flex min-h-9 items-center gap-1 ${collapsed && !stacked ? "sm:flex-col" : ""}`}
      >
        <button
          type="button"
          disabled={disabled}
          aria-expanded={!collapsed}
          aria-controls={`board-lane-${column.id}`}
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${column.title}`}
          className={`flex min-h-9 min-w-0 flex-1 items-center gap-1.5 rounded-lg p-1 text-left focus-visible:outline-2 focus-visible:outline-ring ${collapsed && !stacked ? "sm:flex-col" : ""}`}
          onClick={onToggle}
        >
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-full ${column.tone}`}
          >
            <column.icon className="size-3.5" />
          </span>
          <h2
            className={`text-xs font-medium ${collapsed && !stacked ? "sm:py-2 sm:[writing-mode:vertical-rl]" : ""}`}
          >
            {column.title}
          </h2>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] ${column.tone}`}
          >
            {count}
          </span>
          {collapsed ? (
            <ChevronRight className="ml-auto size-3.5 shrink-0" />
          ) : (
            <ChevronDown className="ml-auto size-3.5 shrink-0" />
          )}
        </button>
        {onToggleOlder && !collapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7"
            aria-label="Include older completed tasks"
            aria-pressed={older}
            onClick={onToggleOlder}
          >
            <History className="size-3.5" />
          </Button>
        )}
        {column.id === "planned" && !collapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7"
            aria-label="Create planned task"
            onClick={onCreate}
          >
            <Plus className="size-3.5" />
          </Button>
        )}
      </div>
      {!collapsed && (
        <div id={`board-lane-${column.id}`} className="space-y-2">
          {children}
        </div>
      )}
    </section>
  );
}
type BoardCardProps = {
  task: TaskRecord;
  lane: Lane;
  saving: boolean;
  onOpen: (task: TaskRecord) => void;
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
  onContinue: () => void;
  onReschedule: (schedule: TaskRecord["schedule"]) => Promise<unknown>;
  compact?: boolean;
};
function BoardCard({
  task,
  lane,
  saving,
  onOpen,
  onSetCompleted,
  onSetProgress,
  onContinue,
  onReschedule,
  compact,
}: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id, disabled: saving });
  const complete = task.subtasks.filter(
    (step) => step.completedAt !== undefined,
  ).length;
  if (compact)
    return (
      <CompactBoardRow
        task={task}
        lane={lane}
        saving={saving}
        onOpen={onOpen}
        onSetCompleted={onSetCompleted}
        onSetProgress={onSetProgress}
        onContinue={onContinue}
        onReschedule={onReschedule}
      />
    );
  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
      }}
      onClick={(event) => {
        if (
          !isDragging &&
          event.currentTarget.contains(event.target as Node) &&
          !(event.target as HTMLElement).closest(
            "button, a, input, select, [role='combobox'], [role='menuitem'], [role='menuitemradio'], [role='option']",
          )
        )
          onOpen(task);
      }}
      className={`min-w-0 cursor-pointer space-y-2 rounded-lg border border-border bg-card p-2.5 shadow-sm hover:border-primary/40 motion-reduce:transition-none ${isDragging ? "opacity-35" : ""}`}
    >
      <div className="flex items-center gap-1 text-[10px]">
        <TaskDomainPill task={task} />
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
        <button
          {...attributes}
          {...listeners}
          type="button"
          aria-label={`Move ${task.title}`}
          className="ml-auto flex size-7 shrink-0 touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted"
        >
          <GripVertical className="size-4" />
        </button>
      </div>
      <button
        type="button"
        className={`w-full break-words text-left text-xs font-medium leading-5 hover:text-primary ${task.status === "completed" ? "text-muted-foreground line-through" : ""}`}
        onClick={() => onOpen(task)}
      >
        {task.title}
      </button>
      <TaskPill tone={task.schedule.type === "fixed" ? "fixed" : "flexible"}>
        {task.schedule.type === "fixed"
          ? new Intl.DateTimeFormat("en-GB", {
              timeZone: task.timezone,
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hourCycle: "h23",
            }).formatRange(task.schedule.startAt, task.schedule.endAt)
          : task.schedule.dueDate
            ? `Due ${shortBoardDate(task.schedule.dueDate)}`
            : "Anytime"}
      </TaskPill>
      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        {lane === "carried" && (
          <TaskPill tone="carried">
            Carried{task.rollForwardCount ? ` ×${task.rollForwardCount}` : ""} ·{" "}
            {shortBoardDate(task.originalWorkDate ?? task.workDate)}
          </TaskPill>
        )}
        {task.estimatedMinutes !== undefined && (
          <TaskPill>
            <Clock3 className="size-3" />
            {formatMinutes(task.estimatedMinutes)}
          </TaskPill>
        )}
        {task.subtasks.length > 0 && (
          <TaskPill tone="completed">
            <ListChecks className="size-3" />
            {complete}/{task.subtasks.length} steps
          </TaskPill>
        )}
        {!!task.threadCount && (
          <button
            type="button"
            className="inline-flex min-h-6 items-center gap-1 rounded-full bg-violet-100 px-2 text-[10px] text-violet-900"
            onClick={() => onOpen(task)}
          >
            <GitBranch className="size-3" />
            Thread
          </button>
        )}
      </div>
      {task.status === "completed" && task.completedAt && (
        <time
          className="block text-[10px] text-primary"
          dateTime={new Date(task.completedAt).toISOString()}
        >
          Done {taskTimestamp(task.completedAt, task.timezone)}
        </time>
      )}
      <div className="flex flex-wrap items-center justify-end gap-1 pt-1">
        {lane === "carried" && (
          <div className="mr-auto flex flex-wrap gap-1">
            <Button
              variant="secondary"
              className="h-8 min-h-8 rounded-full px-2 text-[10px]"
              disabled={saving}
              onClick={onContinue}
            >
              Continue Today
            </Button>
            <TaskRescheduleCalendar
              compact
              task={task}
              disabled={saving}
              onReschedule={onReschedule}
            />
          </div>
        )}
        <TaskStatusSelect
          task={task}
          onSetCompleted={onSetCompleted}
          onSetProgress={onSetProgress}
        />
      </div>
    </article>
  );
}
function CompactBoardRow({
  task,
  lane,
  saving,
  onOpen,
  onSetCompleted,
  onSetProgress,
  onContinue,
  onReschedule,
}: Omit<BoardCardProps, "compact">) {
  const [pending, setPending] = useState(false);
  const completed = task.status === "completed";
  async function toggle() {
    if (pending || saving) return;
    setPending(true);
    try {
      await onSetCompleted(task._id, !completed);
    } catch {
      toast.error("Couldn't update this task. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <article
      className="flex min-w-0 cursor-pointer flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-primary/40"
      onClick={(event) => {
        if (
          event.currentTarget.contains(event.target as Node) &&
          !(event.target as HTMLElement).closest(
            "button, input, a, [role='menuitem'], [role='menuitemradio'], [role='option']",
          )
        )
          onOpen(task);
      }}
    >
      <input
        type="checkbox"
        className="size-4 shrink-0 accent-primary"
        checked={completed}
        disabled={pending || saving}
        aria-label={`${completed ? "Reopen" : "Complete"} ${task.title}`}
        onChange={() => void toggle()}
      />
      <div className="min-w-0 flex-1 basis-40">
        <button
          type="button"
          className={`w-full break-words text-left text-xs font-medium leading-5 hover:text-primary ${completed ? "line-through text-muted-foreground" : ""}`}
          onClick={() => onOpen(task)}
        >
          {task.title}
        </button>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
          <TaskMetadataPills
            task={task}
            carried={lane === "carried"}
            onOpen={() => onOpen(task)}
          />
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
        {lane === "carried" && (
          <>
            <Button
              variant="secondary"
              className="h-8 min-h-8 rounded-full px-2 text-[10px]"
              disabled={saving}
              onClick={onContinue}
            >
              Continue Today
            </Button>
            <TaskRescheduleCalendar
              compact
              task={task}
              disabled={saving}
              onReschedule={onReschedule}
            />
          </>
        )}
        <TaskStatusSelect
          task={task}
          onSetCompleted={onSetCompleted}
          onSetProgress={onSetProgress}
        />
      </div>
    </article>
  );
}
function shortBoardDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
}
function mobileBoardSnapshot() {
  return window.matchMedia("(max-width: 639px)").matches;
}
function subscribeMobileBoard(listener: () => void) {
  const media = window.matchMedia("(max-width: 639px)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
