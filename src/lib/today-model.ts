import type { Doc } from "../../convex/_generated/dataModel";
import { localDateKey } from "./validation/task";
import { shiftDate, zonedTimestamp } from "./validation/recurrence";

export type DayTask = Pick<
  Doc<"tasks">,
  | "continuedOn"
  | "lastRolledOn"
  | "_id"
  | "title"
  | "status"
  | "schedule"
  | "workDate"
  | "priority"
  | "estimatedMinutes"
  | "completedAt"
>;
export type DayWindow = {
  date: string;
  today: string;
  start: number;
  end: number;
  timezone: string;
};

export function dayWindow(
  date: string,
  timezone: string,
  now = Date.now(),
): DayWindow {
  return {
    date,
    timezone,
    today: localDateKey(new Date(now), timezone),
    start: zonedTimestamp(date, "00:00", timezone),
    end: zonedTimestamp(shiftDate(date, 1), "00:00", timezone),
  };
}

export function isCarried(task: DayTask, day: DayWindow) {
  if (
    task.status !== "open" ||
    day.date !== day.today ||
    task.continuedOn === day.date
  )
    return false;
  if (task.lastRolledOn === day.date && task.workDate === day.date) return true;
  return task.schedule.type === "fixed"
    ? task.schedule.endAt <= day.start
    : !!task.workDate && task.workDate < day.date;
}

export function belongsToDay(task: DayTask, day: DayWindow) {
  if (
    task.schedule.type === "fixed" &&
    task.schedule.startAt < day.start &&
    localDateKey(new Date(task.schedule.startAt), day.timezone) !==
      localDateKey(new Date(task.schedule.endAt), day.timezone)
  ) return false;
  if (task.status === "open" && task.lastRolledOn && task.workDate === day.date)
    return true;
  if (task.status === "open" && task.continuedOn === day.date) return true;
  if (task.schedule.type === "fixed") {
    if (task.schedule.startAt < day.end && task.schedule.endAt > day.start)
      return true;
    if (isCarried(task, day)) return true;
  } else {
    const date = task.schedule.dueDate ?? task.workDate;
    if (date === day.date) return true;
    if (
      task.status === "open" &&
      day.date === day.today &&
      (!date || date < day.date)
    )
      return true;
  }
  return (
    task.completedAt !== undefined &&
    task.completedAt >= day.start &&
    task.completedAt < day.end
  );
}

export function plannedMinutes(task: DayTask, day: DayWindow) {
  if (task.schedule.type === "flexible") return task.estimatedMinutes ?? 0;
  const duration = (task.schedule.endAt - task.schedule.startAt) / 60000;
  const overlap =
    Math.max(
      0,
      Math.min(task.schedule.endAt, day.end) -
        Math.max(task.schedule.startAt, day.start),
    ) / 60000;
  if (!overlap) return task.estimatedMinutes ?? duration;
  return overlap;
}

export function comparePriority(a: DayTask, b: DayTask) {
  const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
  const date = (task: DayTask) =>
    task.schedule.type === "fixed"
      ? task.schedule.startAt
      : task.workDate
        ? Date.parse(`${task.workDate}T00:00:00Z`)
        : Infinity;
  return (
    rank[a.priority] - rank[b.priority] ||
    date(a) - date(b) ||
    a.title.localeCompare(b.title) ||
    String(a._id).localeCompare(String(b._id))
  );
}

export function summarizeDay<T extends DayTask>(records: T[], day: DayWindow) {
  const tasks = [
    ...new Map(
      records
        .filter((task) => belongsToDay(task, day))
        .map((task) => [task._id, task]),
    ).values(),
  ];
  const active = tasks
    .filter((task) => task.status === "open")
    .sort(comparePriority);
  const completed = tasks.filter((task) => task.status === "completed");
  const carried = active.filter((task) => isCarried(task, day));
  const fixed = tasks.filter(
    (task) =>
      task.schedule.type === "fixed" &&
      task.schedule.startAt >= day.start &&
      task.schedule.startAt < day.end &&
      task.schedule.endAt > day.start,
  );
  const due = active.filter(
    (task) =>
      task.schedule.type === "flexible" && task.schedule.dueDate === day.date,
  );
  const allocation = { fixed: 0, flexible: 0, carried: 0, unestimated: 0 };
  tasks.forEach((task) => {
    const minutes = plannedMinutes(task, day);
    if (!minutes) allocation.unestimated++;
    if (isCarried(task, day)) allocation.carried += minutes;
    else if (task.schedule.type === "fixed") allocation.fixed += minutes;
    else allocation.flexible += minutes;
  });
  return {
    tasks,
    active,
    completed,
    carried,
    fixed,
    due,
    allocation,
    totalMinutes: allocation.fixed + allocation.flexible + allocation.carried,
  };
}

export function formatMinutes(value: number) {
  const minutes = Math.round(value);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
}

export function timelineLayout<T extends DayTask>(tasks: T[], day: DayWindow) {
  const blocks = [...new Map(tasks.map(task => [task._id, task])).values()]
    .flatMap((task) =>
      task.schedule.type === "fixed" &&
      task.schedule.startAt < day.end &&
      task.schedule.endAt > day.start
        ? [
            {
              task,
              start: Math.max(day.start, task.schedule.startAt),
              end: Math.min(day.end, task.schedule.endAt),
              lane: 0,
              lanes: 1,
            },
          ]
        : [],
    )
    .sort(
      (a, b) =>
        a.start - b.start ||
        b.end - a.end ||
        String(a.task._id).localeCompare(String(b.task._id)),
    );
  let cluster: typeof blocks = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;
  const finish = () => {
    cluster.forEach((block) => {
      block.lanes = laneEnds.length;
    });
  };
  blocks.forEach((block) => {
    if (block.start >= clusterEnd) {
      finish();
      cluster = [];
      laneEnds = [];
      clusterEnd = -Infinity;
    }
    let lane = laneEnds.findIndex((end) => end <= block.start);
    if (lane < 0) lane = laneEnds.length;
    block.lane = lane;
    laneEnds[lane] = block.end;
    cluster.push(block);
    clusterEnd = Math.max(clusterEnd, block.end);
  });
  finish();
  return blocks;
}
