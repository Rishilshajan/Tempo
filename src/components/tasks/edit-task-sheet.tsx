"use client";
import { useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CreateTaskSheet } from "./create-task-sheet";
import type { TaskRecord } from "./task-list";

export function EditTaskSheet({
  task,
  onClose,
}: {
  task: TaskRecord;
  onClose: () => void;
}) {
  const [original] = useState(task);
  const domains = usePaginatedQuery(
    api.domains.list,
    {},
    { initialNumItems: 30 },
  );
  const update = useMutation(api.taskDetails.updateTask);
  const available = [...domains.results];
  if (
    original.domainId &&
    original.domain &&
    !available.some((domain) => domain._id === original.domainId)
  )
    available.unshift({
      _id: original.domainId,
      _creationTime: 0,
      ...original.domain,
    });
  return (
    <CreateTaskSheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      editingTask={original}
      domains={available}
      canSubmit
      hasMoreDomains={domains.status === "CanLoadMore"}
      loadingMoreDomains={domains.status === "LoadingMore"}
      onLoadMoreDomains={() => domains.loadMore(30)}
      onCreate={async (values, stepKeys) => {
        await update({
          ...values,
          id: original._id,
          domainId: values.domainId as Id<"domains"> | undefined,
          stepKeys: stepKeys ?? [],
          expectedStepIds: original.subtasks.map((step) => step.id),
        });
        toast.success("Task updated.");
      }}
    />
  );
}
