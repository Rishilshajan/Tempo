/**
 * TEMPO-003 - MyTasksBoard: composes reused presentation and a single state hook.
 * Code map: src/components/code-map.md.
 */
"use client";
import {
  DomainLabel,
  domainColors,
} from "@/components/domains/domain-appearance";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { taskLane } from "@/lib/kanban-model";
import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ListFilter } from "lucide-react";
import { type CSSProperties } from "react";
import { BoardCard, CompactBoardRow, LaneColumn } from "./board-cards";
import { columns } from "./board-config";
import { MyTasksCalendar } from "./my-tasks-calendar";
import { TaskSelect, priorities } from "./task-select";
import { useMyTasksBoard } from "./use-my-tasks-board";
/**
 * TEMPO-003-F32 - MyTasksBoard
 * Purpose: Provides the existing MyTasksBoard behavior for its owning view.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function MyTasksBoard(input: Parameters<typeof useMyTasksBoard>[0]) {
  const model = useMyTasksBoard(input);
  const { onCreateForDate, tasks, domains, incomplete, onCreate, onOpen, onSetCompleted, onSetProgress, view, setView, isMobile, effectiveView, mobileCollapsed, setMobileCollapsed, collapsed, setCollapsed, setFilters, filters, currentDomain, older, setOlder, filtersOpen, setFiltersOpen, dragging, setDragging, saving, reschedule, now, sensors, update, clock, rows, visible, laneRows, saveMove, drop, selectedDrag, activeFilters } = model;
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
                    !task.recurrencePlanned &&
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
                        collapsed[column.id] ? "180px" : "minmax(240px,1fr)",
                      )
                      .join(" "),
                  } as CSSProperties
                }
              >
                {columns.map((column) => (
                  <LaneColumn
                    key={column.id}
                    column={column}
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
